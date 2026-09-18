// EVM balance reads.
//
// Native balances and every listed ERC-20 for every wallet go into a single
// Multicall3 batch, so one chain costs one request regardless of how many
// wallets or tokens are involved.

import { erc20Abi, type PublicClient } from 'viem';
import { ChainConfig } from './chains';
import { tokensFor } from './tokenlist';
import { Wallet } from './settings';

export interface RawBalance {
    chainId: string;
    walletId: string;
    symbol: string;
    decimals: number;
    amount: bigint;
    coingeckoId?: string;
    /**
     * Price already resolved for this balance, for assets CoinGecko cannot
     * name — Solana mints priced by Jupiter, for instance. Used only when
     * there is no coingeckoId.
     */
    usdPrice?: number;
    /** Token icon resolved alongside the price. */
    icon?: string;
}

const multicall3Abi = [
    {
        name: 'getEthBalance',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'addr', type: 'address' }],
        outputs: [{ name: 'balance', type: 'uint256' }],
    },
] as const;

/**
 * Read native + listed token balances for `wallets` on one EVM chain.
 * Throws if the chain is unreachable so the caller can mark it failed rather
 * than reporting a false zero.
 */
export async function fetchEvmBalances(
    client: PublicClient,
    chain: ChainConfig,
    wallets: Wallet[],
): Promise<RawBalance[]> {
    const evmWallets = wallets.filter((w) => w.kind === 'evm');
    if (evmWallets.length === 0) return [];

    const tokens = tokensFor(chain.id);
    const out: RawBalance[] = [];

    // Native balances.
    if (chain.multicall3) {
        const nativeCalls = evmWallets.map((w) => ({
            address: chain.multicall3 as `0x${string}`,
            abi: multicall3Abi,
            functionName: 'getEthBalance' as const,
            args: [w.address as `0x${string}`],
        }));
        const results = await client.multicall({
            contracts: nativeCalls,
            allowFailure: true,
        });
        results.forEach((r, i) => {
            if (r.status === 'success') {
                out.push({
                    chainId: chain.id,
                    walletId: evmWallets[i].id,
                    symbol: chain.nativeSymbol,
                    decimals: chain.nativeDecimals,
                    amount: r.result as bigint,
                    coingeckoId: chain.coingeckoId,
                });
            }
        });
    } else {
        const balances = await Promise.all(
            evmWallets.map((w) =>
                client.getBalance({ address: w.address as `0x${string}` }),
            ),
        );
        balances.forEach((amount, i) => {
            out.push({
                chainId: chain.id,
                walletId: evmWallets[i].id,
                symbol: chain.nativeSymbol,
                decimals: chain.nativeDecimals,
                amount,
                coingeckoId: chain.coingeckoId,
            });
        });
    }

    // Listed ERC-20 balances, wallet-major so indexes map back cleanly.
    if (tokens.length > 0) {
        const pairs = evmWallets.flatMap((w) => tokens.map((t) => ({ w, t })));
        const results = await client.multicall({
            contracts: pairs.map(({ w, t }) => ({
                address: t.address as `0x${string}`,
                abi: erc20Abi,
                functionName: 'balanceOf' as const,
                args: [w.address as `0x${string}`],
            })),
            allowFailure: true,
        });
        results.forEach((r, i) => {
            if (r.status !== 'success') return;
            const amount = r.result as bigint;
            if (amount === 0n) return;
            const { w, t } = pairs[i];
            out.push({
                chainId: chain.id,
                walletId: w.id,
                symbol: t.symbol,
                decimals: t.decimals,
                amount,
                coingeckoId: t.coingeckoId,
            });
        });
    }

    return out;
}

/** bigint base units -> decimal number. Safe for display-scale magnitudes. */
export function toDecimal(amount: bigint, decimals: number): number {
    if (amount === 0n) return 0;
    const negative = amount < 0n;
    const abs = negative ? -amount : amount;
    const base = 10n ** BigInt(decimals);
    const whole = abs / base;
    const frac = abs - whole * base;
    const value =
        Number(whole) + Number(frac) / Number(base === 0n ? 1n : base);
    return negative ? -value : value;
}
