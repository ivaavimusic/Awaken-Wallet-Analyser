// Bitcoin balances via Esplora-compatible explorers.
//
// Bitcoin has no accounts and no RPC an address can be queried against without
// an index, so this uses public Esplora instances (Blockstream, mempool.space).
// Both are keyless and CORS-enabled, and they expose the same shape, so one is
// a drop-in fallback for the other.
//
// Note this reads a single address, not an xpub: deriving every address in a
// wallet is a different problem, and a user pasting one address should get that
// address's balance rather than a confusing partial total.

import { RawBalance } from './evm';
import { ChainConfig } from './chains';
import { Wallet } from './settings';

const ESPLORA_HOSTS = [
    'https://blockstream.info/api',
    'https://mempool.space/api',
];

interface AddressStats {
    funded_txo_sum?: number;
    spent_txo_sum?: number;
}

interface AddressInfo {
    chain_stats?: AddressStats;
    mempool_stats?: AddressStats;
}

const netOf = (s?: AddressStats) =>
    BigInt(s?.funded_txo_sum ?? 0) - BigInt(s?.spent_txo_sum ?? 0);

async function fetchAddress(address: string): Promise<AddressInfo> {
    let lastError: unknown;
    for (const host of ESPLORA_HOSTS) {
        try {
            const res = await fetch(`${host}/address/${address}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return (await res.json()) as AddressInfo;
        } catch (e) {
            lastError = e;
        }
    }
    throw lastError instanceof Error
        ? lastError
        : new Error('All Bitcoin explorers failed');
}

export interface BitcoinResult {
    balances: RawBalance[];
    /** Addresses that could not be read at all. */
    failures: number;
}

export async function fetchBitcoinBalances(
    chain: ChainConfig,
    wallets: Wallet[],
): Promise<BitcoinResult> {
    const btcWallets = wallets.filter((w) => w.kind === 'btc');
    if (btcWallets.length === 0) return { balances: [], failures: 0 };

    const out: RawBalance[] = [];
    let failures = 0;

    // There is no batch endpoint, so one request per address. A single bad
    // address must not lose the others.
    await Promise.all(
        btcWallets.map(async (w) => {
            try {
                const info = await fetchAddress(w.address);
                // Confirmed plus unconfirmed, so a fresh deposit is visible.
                const sats =
                    netOf(info.chain_stats) + netOf(info.mempool_stats);
                if (sats <= 0n) return;
                out.push({
                    chainId: chain.id,
                    walletId: w.id,
                    symbol: chain.nativeSymbol,
                    decimals: chain.nativeDecimals,
                    amount: sats,
                    coingeckoId: chain.coingeckoId,
                });
            } catch {
                failures++;
            }
        }),
    );

    return { balances: out, failures };
}
