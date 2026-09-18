// When did this wallet first do anything on-chain?
//
// Without this the 12-month chart draws a full year for a wallet funded last
// week — the holdings-times-historical-price method has no idea the wallet
// didn't exist. Clamping the chart to first activity removes the fiction.
//
// A wallet's first activity never changes, so it is cached permanently.

import { ChainConfig, alchemyRpcUrl, getChain } from './chains';
import { Settings, Wallet } from './settings';
import { jsonRpc, resolveRpcs } from './rpc';

const CACHE_PREFIX = 'bunny-firstseen:';

function readCache(address: string): number | null | undefined {
    if (typeof window === 'undefined') return undefined;
    try {
        const raw = window.localStorage.getItem(CACHE_PREFIX + address.toLowerCase());
        if (raw === null) return undefined;
        const v = JSON.parse(raw);
        return typeof v === 'number' ? v : null;
    } catch {
        return undefined;
    }
}

function writeCache(address: string, t: number | null): void {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(
            CACHE_PREFIX + address.toLowerCase(),
            JSON.stringify(t),
        );
    } catch {
        /* non-fatal */
    }
}

/** Oldest signature timestamp. Exact when the wallet has under 1000 txs. */
async function solanaFirstSeen(
    chain: ChainConfig,
    settings: Settings,
    address: string,
): Promise<number | null> {
    const urls = resolveRpcs(chain, settings);
    if (urls.length === 0) return null;
    try {
        const sigs = await jsonRpc<{ blockTime?: number }[]>(
            urls,
            'getSignaturesForAddress',
            [address, { limit: 1000 }],
        );
        if (!Array.isArray(sigs) || sigs.length === 0) return null;
        // Newest first, so the oldest in the page is the last entry.
        for (let i = sigs.length - 1; i >= 0; i--) {
            const bt = sigs[i]?.blockTime;
            if (typeof bt === 'number') return bt * 1000;
        }
        return null;
    } catch {
        return null;
    }
}

/** Earliest asset transfer. Needs an Alchemy key — no keyless equivalent. */
async function evmFirstSeen(
    chain: ChainConfig,
    settings: Settings,
    address: string,
): Promise<number | null> {
    const url = alchemyRpcUrl(chain, settings.alchemyKey);
    if (!url) return null;

    const base = {
        fromBlock: '0x0',
        toBlock: 'latest',
        category: ['external', 'erc20'],
        withMetadata: true,
        order: 'asc',
        maxCount: '0x1',
    };

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify([
                {
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'alchemy_getAssetTransfers',
                    params: [{ ...base, toAddress: address }],
                },
                {
                    jsonrpc: '2.0',
                    id: 2,
                    method: 'alchemy_getAssetTransfers',
                    params: [{ ...base, fromAddress: address }],
                },
            ]),
        });
        if (!res.ok) return null;
        const json = await res.json();
        const rows = Array.isArray(json) ? json : [json];
        const times = rows
            .flatMap(
                (r: { result?: { transfers?: { metadata?: { blockTimestamp?: string } }[] } }) =>
                    r?.result?.transfers ?? [],
            )
            .map((t) => t?.metadata?.blockTimestamp)
            .filter((s): s is string => !!s)
            .map((s) => Date.parse(s))
            .filter((n) => Number.isFinite(n));
        return times.length ? Math.min(...times) : null;
    } catch {
        return null;
    }
}

/**
 * Earliest on-chain activity for a wallet across the given chains, or null if
 * we cannot determine it (keyless EVM, or no activity found).
 */
export async function getFirstSeen(
    wallet: Wallet,
    chainIds: string[],
    settings: Settings,
): Promise<number | null> {
    const cached = readCache(wallet.address);
    if (cached !== undefined) return cached;

    const chains = chainIds.map(getChain);
    const results = await Promise.all(
        chains.map((c) => {
            if (c.kind === 'svm' && wallet.kind === 'svm') {
                return solanaFirstSeen(c, settings, wallet.address);
            }
            if (c.kind === 'evm' && wallet.kind === 'evm') {
                return evmFirstSeen(c, settings, wallet.address);
            }
            return Promise.resolve(null);
        }),
    );

    const times = results.filter((t): t is number => typeof t === 'number');
    const earliest = times.length ? Math.min(...times) : null;
    writeCache(wallet.address, earliest);
    return earliest;
}

/** Earliest activity across several wallets; null if none is known. */
export async function getScopeFirstSeen(
    wallets: Wallet[],
    chainsByWallet: Record<string, string[]>,
    settings: Settings,
): Promise<number | null> {
    const results = await Promise.all(
        wallets.map((w) => getFirstSeen(w, chainsByWallet[w.id] ?? [], settings)),
    );
    const times = results.filter((t): t is number => typeof t === 'number');
    return times.length ? Math.min(...times) : null;
}
