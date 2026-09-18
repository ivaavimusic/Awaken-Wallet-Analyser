// Hyperliquid HyperCore — the native L1, not the EVM layer.
//
// HyperEVM (chain 999) and HyperCore are separate systems that share an
// address. A balance held on HyperCore is invisible to eth_call, so it needs
// Hyperliquid's own info API. That API is public, keyless and CORS-enabled.
//
// Two things are read: spot token balances, and the perps account value.

import { RawBalance } from './evm';
import { ChainConfig } from './chains';
import { Wallet } from './settings';

const INFO_URL = 'https://api.hyperliquid.xyz/info';

/** Amounts arrive as decimal strings; RawBalance wants base units. */
const DECIMALS = 8;

interface SpotBalance {
    coin: string;
    total: string;
}

interface SpotState {
    balances?: SpotBalance[];
}

interface PerpState {
    marginSummary?: { accountValue?: string };
}

/** Known HyperCore tickers we can price. Unknown coins show quantity only. */
const COINGECKO_BY_COIN: Record<string, string> = {
    USDC: 'usd-coin',
    USDT: 'tether',
    HYPE: 'hyperliquid',
    UBTC: 'bitcoin',
    UETH: 'ethereum',
    USOL: 'solana',
};

/** "12.3456" -> 1234560000n at 8 decimals, without floating point drift. */
function toBaseUnits(value: string, decimals = DECIMALS): bigint {
    const [wholeRaw = '0', fracRaw = ''] = value.trim().split('.');
    const negative = wholeRaw.startsWith('-');
    const whole = wholeRaw.replace('-', '') || '0';
    const frac = (fracRaw + '0'.repeat(decimals)).slice(0, decimals);
    const n = BigInt(whole) * 10n ** BigInt(decimals) + BigInt(frac || '0');
    return negative ? -n : n;
}

async function info<T>(body: Record<string, unknown>): Promise<T> {
    const res = await fetch(INFO_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
}

export interface HyperCoreResult {
    balances: RawBalance[];
    /** True when spot loaded but the perps account could not be read. */
    perpsUnavailable: boolean;
}

export async function fetchHyperCoreBalances(
    chain: ChainConfig,
    wallets: Wallet[],
): Promise<HyperCoreResult> {
    // HyperCore is addressed by the same 0x address as the EVM side.
    const evmWallets = wallets.filter((w) => w.kind === 'evm');
    if (evmWallets.length === 0) {
        return { balances: [], perpsUnavailable: false };
    }

    const out: RawBalance[] = [];
    let perpsUnavailable = false;

    for (const w of evmWallets) {
        // Spot balances.
        const spot = await info<SpotState>({
            type: 'spotClearinghouseState',
            user: w.address,
        });

        for (const b of spot?.balances ?? []) {
            const amount = toBaseUnits(b.total ?? '0');
            if (amount === 0n) continue;
            out.push({
                chainId: chain.id,
                walletId: w.id,
                symbol: b.coin,
                decimals: DECIMALS,
                amount,
                coingeckoId: COINGECKO_BY_COIN[b.coin],
            });
        }

        // Perps account value, already denominated in USD. Priced as USDC so
        // it lands in the total at ~1:1 rather than being dropped.
        try {
            const perp = await info<PerpState>({
                type: 'clearinghouseState',
                user: w.address,
            });
            const value = perp?.marginSummary?.accountValue;
            if (value) {
                const amount = toBaseUnits(value);
                if (amount > 0n) {
                    out.push({
                        chainId: chain.id,
                        walletId: w.id,
                        symbol: 'HL Perps (USD)',
                        decimals: DECIMALS,
                        amount,
                        coingeckoId: 'usd-coin',
                    });
                }
            }
        } catch {
            perpsUnavailable = true;
        }
    }

    return { balances: out, perpsUnavailable };
}
