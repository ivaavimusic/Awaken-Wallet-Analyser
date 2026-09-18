// Endpoint resolution and client construction.
//
// Priority: endpoints the user added in Settings, then Alchemy if a key is
// present, then any known public endpoint. viem's `fallback` transport walks
// the list on error, which is the failover the Settings `+` button feeds.

import { createPublicClient, defineChain, fallback, http, type PublicClient } from 'viem';
import { ChainConfig, alchemyRpcUrl } from './chains';
import { Settings } from './settings';

export const RPC_TIMEOUT_MS = 12_000;

/** Full ordered endpoint list for a chain, most preferred first. */
export function resolveRpcs(chain: ChainConfig, settings: Settings): string[] {
    const custom = settings.rpcs[chain.id] ?? [];
    const alchemy = alchemyRpcUrl(chain, settings.alchemyKey);
    const urls = [...custom, ...(alchemy ? [alchemy] : []), ...chain.publicRpcs];
    return Array.from(new Set(urls.filter(Boolean)));
}

/** True when we have no way to reach this chain at all. */
export const isChainReachable = (chain: ChainConfig, settings: Settings): boolean =>
    resolveRpcs(chain, settings).length > 0;

export function buildEvmClient(
    chain: ChainConfig,
    settings: Settings,
): PublicClient | null {
    if (chain.kind !== 'evm' || chain.chainId === undefined) return null;
    const urls = resolveRpcs(chain, settings);
    if (urls.length === 0) return null;

    const viemChain = defineChain({
        id: chain.chainId,
        name: chain.name,
        nativeCurrency: {
            name: chain.nativeSymbol,
            symbol: chain.nativeSymbol,
            decimals: chain.nativeDecimals,
        },
        rpcUrls: { default: { http: urls } },
        ...(chain.multicall3
            ? {
                  contracts: {
                      multicall3: { address: chain.multicall3 as `0x${string}` },
                  },
              }
            : {}),
    });

    return createPublicClient({
        chain: viemChain,
        transport: fallback(
            urls.map((u) => http(u, { timeout: RPC_TIMEOUT_MS, retryCount: 1 })),
            { rank: false },
        ),
        batch: { multicall: true },
    }) as PublicClient;
}

/** Minimal JSON-RPC POST with failover, used for Solana. */
export async function jsonRpc<T>(
    urls: string[],
    method: string,
    params: unknown[],
): Promise<T> {
    let lastError: unknown;
    for (const url of urls) {
        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), RPC_TIMEOUT_MS);
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
                signal: controller.signal,
            });
            clearTimeout(timer);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            if (json.error) throw new Error(json.error.message ?? 'RPC error');
            return json.result as T;
        } catch (e) {
            lastError = e;
        }
    }
    throw lastError instanceof Error
        ? lastError
        : new Error('All endpoints failed');
}
