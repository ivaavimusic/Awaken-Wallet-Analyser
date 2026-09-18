// Solana balance reads.
//
// Unlike EVM, Solana enumerates holdings natively: getTokenAccountsByOwner
// returns every SPL token an address holds, so discovery works without an
// indexer or an API key. Unknown mints are still returned, labelled by a
// truncated mint address, rather than dropped.

import { jsonRpc } from './rpc';
import { solanaMint } from './tokenlist';
import { RawBalance } from './evm';
import { Wallet } from './settings';
import { ChainConfig } from './chains';

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
        return { balances: [], tokensUnavailable: false };
    }

    const out: RawBalance[] = [];
    let tokensUnavailable = false;

    for (const w of solWallets) {
        // Native SOL.
        const lamports = await jsonRpc<{ value: number }>(urls, 'getBalance', [
            w.address,
        ]);
        out.push({
            chainId: chain.id,
            walletId: w.id,
            symbol: chain.nativeSymbol,
            decimals: chain.nativeDecimals,
            amount: BigInt(lamports?.value ?? 0),
            coingeckoId: chain.coingeckoId,
        });

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
            const known = solanaMint(info.mint);
            out.push({
                chainId: chain.id,
                walletId: w.id,
                symbol:
                    known?.symbol ??
                    `${info.mint.slice(0, 4)}…${info.mint.slice(-4)}`,
                decimals: info.tokenAmount.decimals,
                amount,
                coingeckoId: known?.coingeckoId,
            });
        }
    }

    return { balances: out, tokensUnavailable };
}
