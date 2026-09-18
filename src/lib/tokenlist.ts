// Curated token lists.
//
// Plain RPC cannot enumerate which ERC-20s an address holds — that needs an
// indexer. Without an Alchemy key we therefore check a fixed list of majors
// per chain. Only canonical, well-known contract addresses belong here; a
// wrong address silently produces a wrong balance.
//
// Solana needs none of this: getTokenAccountsByOwner enumerates holdings
// directly, and Jupiter resolves each mint's symbol and price — see jupiter.ts.

export interface TokenDef {
    symbol: string;
    /** Contract address (EVM) or mint address (Solana). */
    address: string;
    decimals: number;
    /** CoinGecko id, for keyless pricing. */
    coingeckoId: string;
}

export const TOKENS: Record<string, TokenDef[]> = {
    ethereum: [
        {
            symbol: 'USDC',
            address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
            decimals: 6,
            coingeckoId: 'usd-coin',
        },
        {
            symbol: 'USDT',
            address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
            decimals: 6,
            coingeckoId: 'tether',
        },
        {
            symbol: 'DAI',
            address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
            decimals: 18,
            coingeckoId: 'dai',
        },
        {
            symbol: 'WETH',
            address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
            decimals: 18,
            coingeckoId: 'weth',
        },
        {
            symbol: 'WBTC',
            address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
            decimals: 8,
            coingeckoId: 'wrapped-bitcoin',
        },
    ],
    base: [
        {
            symbol: 'USDC',
            address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
            decimals: 6,
            coingeckoId: 'usd-coin',
        },
        {
            symbol: 'WETH',
            address: '0x4200000000000000000000000000000000000006',
            decimals: 18,
            coingeckoId: 'weth',
        },
        {
            symbol: 'DAI',
            address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
            decimals: 18,
            coingeckoId: 'dai',
        },
    ],
    arbitrum: [
        {
            symbol: 'USDC',
            address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
            decimals: 6,
            coingeckoId: 'usd-coin',
        },
        {
            symbol: 'USDT',
            address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
            decimals: 6,
            coingeckoId: 'tether',
        },
        {
            symbol: 'WETH',
            address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
            decimals: 18,
            coingeckoId: 'weth',
        },
        {
            symbol: 'ARB',
            address: '0x912CE59144191C1204E64559FE8253a0e49E6548',
            decimals: 18,
            coingeckoId: 'arbitrum',
        },
        {
            symbol: 'DAI',
            address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
            decimals: 18,
            coingeckoId: 'dai',
        },
    ],
    // No canonical token addresses confirmed for these yet. Native balance
    // only in keyless mode; an Alchemy key gives full discovery.
    hyperliquid: [],
    abstract: [],
    robinhood: [],
    megaeth: [],
    tempo: [],
};

export const tokensFor = (chainId: string): TokenDef[] => TOKENS[chainId] ?? [];
