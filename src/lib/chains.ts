// Network registry for OpenPort.
//
// `publicRpcs` only lists endpoints known to exist and to be openly usable.
// Where none is listed the network needs an Alchemy key or a user-supplied
// endpoint added in Settings — the UI says so rather than shipping a guess.

export type ChainKind = 'evm' | 'svm' | 'keeta' | 'hypercore';

export interface ChainConfig {
    id: string;
    name: string;
    displayName: string;
    kind: ChainKind;
    /** EVM chain id. Absent for non-EVM networks. */
    chainId?: number;
    /** Alchemy network slug, e.g. `eth-mainnet`. Absent if unsupported. */
    alchemySlug?: string;
    /** Openly usable endpoints, tried in order before any user entries. */
    publicRpcs: string[];
    explorerUrl: string;
    explorerApi?: string;
    nativeSymbol: string;
    nativeDecimals: number;
    /** CoinGecko id for the native asset, used for keyless pricing. */
    coingeckoId?: string;
    /** Multicall3, canonical deployment unless noted. */
    multicall3?: string;
    /** Chip colour + letter, so we never depend on a missing logo file. */
    color: string;
    short: string;
    logo?: string;
    /**
     * Single-colour marks need inverting against one of the two themes.
     * 'dark' = the mark is dark, so invert it in dark mode.
     * 'light' = the mark is white, so invert it in light mode.
     * Omit for full-colour logos, which work as-is on either background.
     */
    logoTone?: 'dark' | 'light';
    /**
     * Brand background for marks that are a solid glyph on a coloured tile.
     * Set this instead of logoTone — the tile keeps the glyph legible on both
     * themes without inverting it away from the brand colour.
     */
    logoBg?: string;
    /**
     * Chains that are one product to a user are filtered as one badge.
     * Hyperliquid is two systems (HyperEVM and HyperCore) sharing an address;
     * nobody thinks of their holdings as split between them.
     */
    groupId?: string;
    groupName?: string;
    addressValidator: (address: string) => boolean;
}

const MULTICALL3 = '0xcA11bde05977b3631167028862bE2a173976CA11';

const isEvmAddress = (a: string) => /^0x[a-fA-F0-9]{40}$/.test(a.trim());
const isKeetaAddress = (a: string) => /^keeta_[a-z0-9]+$/i.test(a.trim());
// Solana addresses are base58, 32-44 chars, no 0/O/I/l.
const isSolanaAddress = (a: string) =>
    /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a.trim());

export const CHAINS: Record<string, ChainConfig> = {
    ethereum: {
        id: 'ethereum',
        name: 'Ethereum',
        displayName: 'Ethereum Mainnet',
        kind: 'evm',
        chainId: 1,
        alchemySlug: 'eth-mainnet',
        // Verified callable from a browser. Endpoints without CORS headers
        // (llamarpc, for one) are useless here no matter how healthy they are.
        publicRpcs: [
            'https://ethereum-rpc.publicnode.com',
            'https://cloudflare-eth.com',
        ],
        explorerUrl: 'https://etherscan.io',
        nativeSymbol: 'ETH',
        nativeDecimals: 18,
        coingeckoId: 'ethereum',
        multicall3: MULTICALL3,
        color: '#627EEA',
        short: 'Ξ',
        logo: '/assets/eth.svg',
        addressValidator: isEvmAddress,
    },
    base: {
        id: 'base',
        name: 'Base',
        displayName: 'Base Mainnet',
        kind: 'evm',
        chainId: 8453,
        alchemySlug: 'base-mainnet',
        publicRpcs: [
            'https://mainnet.base.org',
            'https://base-rpc.publicnode.com',
        ],
        explorerUrl: 'https://basescan.org',
        nativeSymbol: 'ETH',
        nativeDecimals: 18,
        coingeckoId: 'ethereum',
        multicall3: MULTICALL3,
        color: '#0052FF',
        short: 'B',
        logo: '/assets/base.svg',
        addressValidator: isEvmAddress,
    },
    arbitrum: {
        id: 'arbitrum',
        name: 'Arbitrum',
        displayName: 'Arbitrum One',
        kind: 'evm',
        chainId: 42161,
        alchemySlug: 'arb-mainnet',
        publicRpcs: [
            'https://arb1.arbitrum.io/rpc',
            'https://arbitrum-one-rpc.publicnode.com',
        ],
        explorerUrl: 'https://arbiscan.io',
        nativeSymbol: 'ETH',
        nativeDecimals: 18,
        coingeckoId: 'ethereum',
        multicall3: MULTICALL3,
        color: '#12AAFF',
        short: 'A',
        logo: '/assets/arb.svg',
        addressValidator: isEvmAddress,
    },
    abstract: {
        id: 'abstract',
        name: 'Abstract',
        displayName: 'Abstract Mainnet',
        kind: 'evm',
        chainId: 2741,
        alchemySlug: 'abstract-mainnet',
        // Only the official endpoint: the drpc mirror reports no Multicall3 at
        // the canonical address, which would silently break batching.
        publicRpcs: ['https://api.mainnet.abs.xyz'],
        explorerUrl: 'https://abscan.org',
        nativeSymbol: 'ETH',
        nativeDecimals: 18,
        coingeckoId: 'ethereum',
        multicall3: MULTICALL3,
        color: '#29E58A',
        short: 'A',
        logo: '/assets/abstract.svg',
        addressValidator: isEvmAddress,
    },
    hypercore: {
        id: 'hypercore',
        name: 'Hyperliquid',
        displayName: 'Hyperliquid (HyperCore)',
        // The native L1: spot balances and perps, addressed by the same 0x
        // address as HyperEVM but invisible to eth_call.
        kind: 'hypercore',
        publicRpcs: ['https://api.hyperliquid.xyz/info'],
        explorerUrl: 'https://app.hyperliquid.xyz',
        nativeSymbol: 'USDC',
        nativeDecimals: 8,
        coingeckoId: 'usd-coin',
        color: '#97FCE4',
        short: 'HL',
        logo: '/assets/hyperliquid.svg',
        groupId: 'hyperliquid',
        groupName: 'Hyperliquid',
        addressValidator: isEvmAddress,
    },
    hyperliquid: {
        id: 'hyperliquid',
        name: 'HyperEVM',
        displayName: 'Hyperliquid HyperEVM',
        kind: 'evm',
        chainId: 999,
        alchemySlug: 'hyperliquid-mainnet',
        publicRpcs: ['https://rpc.hyperliquid.xyz/evm'],
        explorerUrl: 'https://www.hyperscan.com',
        nativeSymbol: 'HYPE',
        nativeDecimals: 18,
        coingeckoId: 'hyperliquid',
        multicall3: MULTICALL3,
        color: '#97FCE4',
        short: 'H',
        logo: '/assets/hyperliquid.svg',
        groupId: 'hyperliquid',
        groupName: 'Hyperliquid',
        addressValidator: isEvmAddress,
    },
    robinhood: {
        id: 'robinhood',
        name: 'Robinhood',
        displayName: 'Robinhood Chain',
        kind: 'evm',
        chainId: 4663,
        alchemySlug: 'robinhood-mainnet',
        // Official public endpoint, per docs.robinhood.com/chain/connecting.
        publicRpcs: ['https://rpc.mainnet.chain.robinhood.com'],
        explorerUrl: 'https://explorer.robinhood.com',
        nativeSymbol: 'ETH',
        nativeDecimals: 18,
        coingeckoId: 'ethereum',
        multicall3: MULTICALL3,
        color: '#CCFF00',
        short: 'R',
        logo: '/assets/robinhood.svg',
        logoBg: '#CCFF00',
        addressValidator: isEvmAddress,
    },
    blast: {
        id: 'blast',
        name: 'Blast',
        displayName: 'Blast Mainnet',
        kind: 'evm',
        chainId: 81457,
        alchemySlug: 'blast-mainnet',
        publicRpcs: ['https://rpc.blast.io', 'https://blast-rpc.publicnode.com'],
        explorerUrl: 'https://blastscan.io',
        nativeSymbol: 'ETH',
        nativeDecimals: 18,
        coingeckoId: 'ethereum',
        multicall3: MULTICALL3,
        color: '#FCFC03',
        short: 'BL',
        logo: '/assets/blast.svg',
        addressValidator: isEvmAddress,
    },
    tempo: {
        id: 'tempo',
        name: 'Tempo',
        displayName: 'Tempo Mainnet',
        kind: 'evm',
        chainId: 4217,
        alchemySlug: 'tempo-mainnet',
        publicRpcs: ['https://rpc.tempo.xyz'],
        explorerUrl: 'https://explorer.tempo.xyz',
        nativeSymbol: 'TEMPO',
        nativeDecimals: 18,
        // Tempo is stablecoin-first (TIP-20) and its native gas asset is not
        // clearly documented. Left unpriced on purpose: the UI shows the
        // quantity with "price unavailable" rather than inventing a value.
        multicall3: MULTICALL3,
        color: '#6772E5',
        short: 'T',
        logo: '/assets/tempo.svg',
        logoTone: 'dark',
        addressValidator: isEvmAddress,
    },
    solana: {
        id: 'solana',
        name: 'Solana',
        displayName: 'Solana Mainnet',
        kind: 'svm',
        alchemySlug: 'solana-mainnet',
        // api.mainnet-beta.solana.com returns 403 to browser origins, so it
        // sits behind an endpoint that actually answers.
        publicRpcs: [
            'https://solana-rpc.publicnode.com',
            'https://api.mainnet-beta.solana.com',
        ],
        explorerUrl: 'https://explorer.solana.com',
        nativeSymbol: 'SOL',
        nativeDecimals: 9,
        coingeckoId: 'solana',
        color: '#14F195',
        short: '◎',
        logo: '/assets/solana.svg',
        addressValidator: isSolanaAddress,
    },
    megaeth: {
        id: 'megaeth',
        name: 'MegaETH',
        displayName: 'MegaETH Mainnet',
        kind: 'evm',
        chainId: 4326,
        alchemySlug: 'megaeth-mainnet',
        publicRpcs: [
            'https://mainnet.megaeth.com/rpc',
            'https://megaeth.blockscout.com/api/eth-rpc',
        ],
        explorerUrl: 'https://megaeth.blockscout.com',
        explorerApi: 'https://megaeth.blockscout.com/api',
        nativeSymbol: 'ETH',
        nativeDecimals: 18,
        coingeckoId: 'ethereum',
        multicall3: MULTICALL3,
        color: '#2B6CF6',
        short: 'M',
        logo: '/assets/megaeth.svg',
        logoTone: 'dark',
        addressValidator: isEvmAddress,
    },
    keeta: {
        id: 'keeta',
        name: 'Keeta',
        displayName: 'Keeta Network',
        kind: 'keeta',
        publicRpcs: ['https://rep3.main.network.api.keeta.com/api/node/ledger'],
        explorerUrl: 'https://explorer.keeta.com',
        explorerApi: 'https://rep3.main.network.api.keeta.com/api/node/ledger',
        nativeSymbol: 'KEETA',
        nativeDecimals: 18,
        color: '#F97316',
        short: 'K',
        logo: '/assets/keeta.svg',
        logoTone: 'light',
        addressValidator: isKeetaAddress,
    },
};

export const DEFAULT_CHAIN = 'ethereum';

export const getChain = (id: string): ChainConfig =>
    CHAINS[id] ?? CHAINS[DEFAULT_CHAIN];

/**
 * Display order for chain rows and pickers: the networks most people hold
 * something on come first, niche ones trail. Anything missing here sorts last
 * in registry order, so adding a chain never silently hides it.
 */
export const CHAIN_ORDER = [
    'ethereum',
    'robinhood',
    'base',
    'solana',
    'arbitrum',
    'hyperliquid',
    'hypercore',
    'abstract',
    'tempo',
    'megaeth',
    'blast',
    'keeta',
] as const;

export const getSupportedChains = (): ChainConfig[] => {
    const rank = (id: string) => {
        const i = CHAIN_ORDER.indexOf(id as (typeof CHAIN_ORDER)[number]);
        return i === -1 ? CHAIN_ORDER.length : i;
    };
    return Object.values(CHAINS).sort((a, b) => rank(a.id) - rank(b.id));
};

export const getChainsByKind = (kind: ChainKind): ChainConfig[] =>
    getSupportedChains().filter((c) => c.kind === kind);

export interface ChainGroup {
    key: string;
    name: string;
    /** Chain used for the logo and colour. */
    repr: ChainConfig;
    /** Every chain id this badge stands for. */
    ids: string[];
}

/**
 * Chains collapsed into the badges the UI shows, preserving display order.
 * A chain with no groupId is its own badge.
 */
export function getChainGroups(): ChainGroup[] {
    const groups: ChainGroup[] = [];
    const byKey = new Map<string, ChainGroup>();

    for (const c of getSupportedChains()) {
        const key = c.groupId ?? c.id;
        const existing = byKey.get(key);
        if (existing) {
            existing.ids.push(c.id);
            continue;
        }
        const g: ChainGroup = {
            key,
            name: c.groupName ?? c.name,
            repr: c,
            ids: [c.id],
        };
        byKey.set(key, g);
        groups.push(g);
    }
    return groups;
}

/** Collapse chain ids into the badges that represent them, order preserved. */
export function groupChainIds(ids: string[]): ChainGroup[] {
    const wanted = new Set(ids);
    return getChainGroups().filter((g) => g.ids.some((id) => wanted.has(id)));
}

export function validateAddress(address: string, chainId: string): boolean {
    return getChain(chainId).addressValidator(address);
}

/**
 * Guess which wallet kind an address belongs to. EVM and Keeta are
 * unambiguous; anything else base58-shaped is treated as Solana.
 */
export function detectKind(address: string): ChainKind | null {
    const a = address.trim();
    if (isEvmAddress(a)) return 'evm';
    if (isKeetaAddress(a)) return 'keeta';
    if (isSolanaAddress(a)) return 'svm';
    return null;
}

export function getExplorerTxUrl(hash: string, chainId: string): string {
    const chain = getChain(chainId);
    if (chain.kind === 'keeta') return `${chain.explorerUrl}/transaction/${hash}`;
    if (chain.kind === 'svm') return `${chain.explorerUrl}/tx/${hash}`;
    return `${chain.explorerUrl}/tx/${hash}`;
}

export function getExplorerAddressUrl(address: string, chainId: string): string {
    const chain = getChain(chainId);
    if (chain.kind === 'keeta') return `${chain.explorerUrl}/account/${address}`;
    return `${chain.explorerUrl}/address/${address}`;
}

/** Alchemy endpoint for a network, or null if it has no Alchemy support. */
export function alchemyRpcUrl(chain: ChainConfig, key: string): string | null {
    if (!chain.alchemySlug || !key) return null;
    return `https://${chain.alchemySlug}.g.alchemy.com/v2/${key}`;
}
