// Solana balance reads.
//
// Unlike EVM, Solana enumerates holdings natively: getTokenAccountsByOwner
// returns every SPL token an address holds, so discovery works without an
// indexer or an API key. Unknown mints are still returned, labelled by a
// truncated mint address, rather than dropped.

import { jsonRpc } from './rpc';
import { fetchJupiterTokens, fetchJupiterPrices } from './jupiter';
import { RawBalance } from './evm';
import { Wallet } from './settings';
import { ChainConfig } from './chains';
import { DisplayTransaction } from '@/types';

const SPL_TOKEN_PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';

interface TokenAccountsResponse {
    value: {
        account: {
            data: {
                parsed: {
                    info: {
                        mint: string;
                        tokenAmount: {
                            amount: string;
                            decimals: number;
                            uiAmount: number | null;
                        };
                    };
                };
            };
        };
    }[];
}

export interface SolanaResult {
    balances: RawBalance[];
    /** Non-zero when the batched native balance read failed outright. */
    balanceFailures: number;
    /**
     * True when native SOL was read but SPL discovery was refused. Free public
     * endpoints block getTokenAccountsByOwner, so this is the normal keyless
     * outcome rather than an error worth failing the whole chain over.
     */
    tokensUnavailable: boolean;
}

export async function fetchSolanaBalances(
    chain: ChainConfig,
    urls: string[],
    wallets: Wallet[],
): Promise<SolanaResult> {
    const solWallets = wallets.filter((w) => w.kind === 'svm');
    if (solWallets.length === 0) {
        return { balances: [], tokensUnavailable: false, balanceFailures: 0 };
    }

    const out: RawBalance[] = [];
    const held: {
        walletId: string;
        mint: string;
        decimals: number;
        amount: bigint;
    }[] = [];
    let tokensUnavailable = false;
    let balanceFailures = 0;

    // Every wallet's native balance in a single request. Public Solana
    // endpoints rate-limit aggressively, and one call per wallet was the main
    // reason a few saved wallets could 403 the whole chain.
    try {
        const accounts = await jsonRpc<{ value: ({ lamports?: number } | null)[] }>(
            urls,
            'getMultipleAccounts',
            [solWallets.map((w) => w.address), { encoding: 'base64' }],
        );
        solWallets.forEach((w, i) => {
            const lamports = accounts?.value?.[i]?.lamports ?? 0;
            out.push({
                chainId: chain.id,
                walletId: w.id,
                symbol: chain.nativeSymbol,
                decimals: chain.nativeDecimals,
                amount: BigInt(lamports),
                coingeckoId: chain.coingeckoId,
            });
        });
    } catch {
        // One batched request covers every wallet, so this is a single
        // failure — not one per wallet.
        balanceFailures = 1;
    }

    for (const w of solWallets) {
        // Every SPL token held. Refusal here costs us tokens, not the chain.
        let accounts: TokenAccountsResponse | null = null;
        try {
            accounts = await jsonRpc<TokenAccountsResponse>(
                urls,
                'getTokenAccountsByOwner',
                [
                    w.address,
                    { programId: SPL_TOKEN_PROGRAM },
                    { encoding: 'jsonParsed' },
                ],
            );
        } catch {
            tokensUnavailable = true;
        }

        for (const acc of accounts?.value ?? []) {
            const info = acc.account?.data?.parsed?.info;
            if (!info) continue;
            const amount = BigInt(info.tokenAmount.amount ?? '0');
            if (amount === 0n) continue;
            held.push({
                walletId: w.id,
                mint: info.mint,
                decimals: info.tokenAmount.decimals,
                amount,
            });
        }
    }

    // Resolve every held mint at once rather than against a hardcoded list, so
    // small-cap and brand-new tokens get a name and a price like anything else.
    const mints = held.map((h) => h.mint);
    const [meta, prices] = await Promise.all([
        fetchJupiterTokens(mints),
        fetchJupiterPrices(mints),
    ]);

    for (const h of held) {
        const m = meta[h.mint];
        out.push({
            chainId: chain.id,
            walletId: h.walletId,
            symbol:
                m?.symbol ?? `${h.mint.slice(0, 4)}…${h.mint.slice(-4)}`,
            decimals: h.decimals,
            amount: h.amount,
            usdPrice: prices[h.mint],
            icon: m?.icon,
        });
    }

    return { balances: out, tokensUnavailable, balanceFailures };
}

/* ------------------------------------------------------------------ *
 * Transaction history for the tax export.
 * ------------------------------------------------------------------ */

interface SignatureEntry {
    signature: string;
    blockTime?: number | null;
    err?: unknown;
}

interface ParsedTx {
    slot?: number;
    blockTime?: number | null;
    meta?: {
        fee?: number;
        err?: unknown;
        preBalances?: number[];
        postBalances?: number[];
        preTokenBalances?: TokenBalanceEntry[];
        postTokenBalances?: TokenBalanceEntry[];
    };
    transaction?: {
        message?: {
            accountKeys?: { pubkey: string; signer?: boolean }[];
        };
    };
}

interface TokenBalanceEntry {
    accountIndex: number;
    mint: string;
    owner?: string;
    uiTokenAmount: { amount: string; decimals: number };
}

const LAMPORTS = 1e9;

/** Run `jobs` with bounded concurrency — public nodes rate-limit hard. */
async function pooled<T>(
    jobs: (() => Promise<T>)[],
    concurrency: number,
): Promise<T[]> {
    const results: T[] = new Array(jobs.length);
    let next = 0;
    const workers = Array.from({ length: Math.min(concurrency, jobs.length) }, async () => {
        while (true) {
            const i = next++;
            if (i >= jobs.length) return;
            results[i] = await jobs[i]();
        }
    });
    await Promise.all(workers);
    return results;
}

export interface SolanaHistory {
    transactions: DisplayTransaction[];
    /** True when more signatures existed than we fetched. */
    truncated: boolean;
    /** Signatures we could not fetch details for. */
    failed: number;
}

/**
 * Solana history for one address.
 *
 * There is no bulk endpoint: signatures come in one call, then each
 * transaction must be fetched individually (public nodes reject JSON-RPC
 * batching for getTransaction). Amounts are derived from pre/post balance
 * deltas rather than instruction parsing, which handles native SOL and every
 * SPL token uniformly, including swaps and multi-instruction transactions.
 */
export async function fetchSolanaTransactions(
    chain: ChainConfig,
    urls: string[],
    address: string,
    limit = 200,
): Promise<SolanaHistory> {
    const sigs = await jsonRpc<SignatureEntry[]>(
        urls,
        'getSignaturesForAddress',
        [address, { limit: Math.min(limit, 1000) }],
    );
    if (!Array.isArray(sigs) || sigs.length === 0) {
        return { transactions: [], truncated: false, failed: 0 };
    }

    const wanted = sigs.slice(0, limit);
    let failed = 0;

    const txs = await pooled(
        wanted.map((s) => async () => {
            try {
                return await jsonRpc<ParsedTx | null>(urls, 'getTransaction', [
                    s.signature,
                    { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0 },
                ]);
            } catch {
                failed++;
                return null;
            }
        }),
        5,
    );

    const rows: DisplayTransaction[] = [];
    /** Row index -> mint, so every symbol can be resolved in one request. */
    const seenMints = new Map<number, string>();

    wanted.forEach((sig, i) => {
        const tx = txs[i];
        if (!tx?.meta) return;

        const keys = tx.transaction?.message?.accountKeys ?? [];
        const idx = keys.findIndex((k) => k.pubkey === address);
        const ts = (tx.blockTime ?? sig.blockTime ?? 0) * 1000;
        const date = ts ? new Date(ts).toISOString().split('T')[0] : '';
        const feeLamports = tx.meta.fee ?? 0;
        const isPayer = keys[0]?.pubkey === address;
        const fee = isPayer ? feeLamports / LAMPORTS : 0;
        const failedTx = !!tx.meta.err;

        // Native SOL movement. For the fee payer the raw delta already has the
        // fee deducted, so add it back to isolate the transferred amount.
        if (idx >= 0 && tx.meta.preBalances && tx.meta.postBalances) {
            const delta =
                (tx.meta.postBalances[idx] ?? 0) - (tx.meta.preBalances[idx] ?? 0);
            const transferred = (delta + (isPayer ? feeLamports : 0)) / LAMPORTS;
            if (Math.abs(transferred) > 1e-9) {
                const incoming = transferred > 0;
                rows.push({
                    Date: date,
                    Asset: chain.nativeSymbol,
                    Amount: transferred.toFixed(9).replace(/0+$/, '').replace(/\.$/, ''),
                    Fee: fee ? fee.toFixed(9) : '0',
                    'P&L': '',
                    'Payment Token': chain.nativeSymbol,
                    ID: sig.signature.slice(0, 10),
                    Notes: failedTx
                        ? 'Failed transaction'
                        : incoming
                          ? 'Received SOL'
                          : 'Sent SOL',
                    Tag: incoming ? 'deposit' : 'withdrawal',
                    'Transaction Hash': sig.signature,
                    timestamp: ts,
                    isIncoming: incoming,
                    type: incoming ? 'transfer_in' : 'transfer_out',
                    block: tx.slot?.toString() ?? '',
                    method: failedTx ? 'Failed' : incoming ? 'Receive' : 'Send',
                    from: incoming ? '' : address,
                    to: incoming ? address : '',
                    status: failedTx ? 'Failed' : 'Success',
                    value: Math.abs(transferred).toString(),
                    fee: fee.toString(),
                });
            }
        }

        // SPL token movement, by mint, for accounts this address owns.
        const pre = new Map<string, bigint>();
        const post = new Map<string, bigint>();
        const decimals = new Map<string, number>();
        for (const b of tx.meta.preTokenBalances ?? []) {
            if (b.owner !== address) continue;
            pre.set(b.mint, (pre.get(b.mint) ?? 0n) + BigInt(b.uiTokenAmount.amount));
            decimals.set(b.mint, b.uiTokenAmount.decimals);
        }
        for (const b of tx.meta.postTokenBalances ?? []) {
            if (b.owner !== address) continue;
            post.set(b.mint, (post.get(b.mint) ?? 0n) + BigInt(b.uiTokenAmount.amount));
            decimals.set(b.mint, b.uiTokenAmount.decimals);
        }

        for (const mint of new Set([...pre.keys(), ...post.keys()])) {
            const d = (post.get(mint) ?? 0n) - (pre.get(mint) ?? 0n);
            if (d === 0n) continue;
            const dec = decimals.get(mint) ?? 0;
            const amount = Number(d) / 10 ** dec;
            const incoming = amount > 0;
            const symbol = `${mint.slice(0, 4)}…${mint.slice(-4)}`;
            seenMints.set(rows.length, mint);

            rows.push({
                Date: date,
                Asset: symbol,
                Amount: amount.toString(),
                // The SOL fee belongs to the native row; repeating it here
                // would double-count it in the CSV.
                Fee: '0',
                'P&L': '',
                'Payment Token': chain.nativeSymbol,
                ID: sig.signature.slice(0, 10),
                Notes: `${incoming ? 'Received' : 'Sent'} ${symbol}`,
                Tag: incoming ? 'deposit' : 'withdrawal',
                'Transaction Hash': sig.signature,
                timestamp: ts,
                isIncoming: incoming,
                type: incoming ? 'token_in' : 'token_out',
                block: tx.slot?.toString() ?? '',
                method: 'Token Transfer',
                from: incoming ? '' : address,
                to: incoming ? address : '',
                status: failedTx ? 'Failed' : 'Success',
                value: Math.abs(amount).toString(),
                fee: '0',
            });
        }
    });

    // Give SPL rows real tickers instead of a truncated mint. One request for
    // the whole export, so a large history costs no more than a small one.
    if (seenMints.size > 0) {
        const meta = await fetchJupiterTokens([...new Set(seenMints.values())]);
        for (const [idx, mint] of seenMints) {
            const symbol = meta[mint]?.symbol;
            const row = rows[idx];
            if (!symbol || !row) continue;
            const direction = row.isIncoming ? 'Received' : 'Sent';
            row.Asset = symbol;
            row.Notes = `${direction} ${symbol}`;
        }
    }

    rows.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    return {
        transactions: rows,
        truncated: sigs.length >= Math.min(limit, 1000),
        failed,
    };
}
