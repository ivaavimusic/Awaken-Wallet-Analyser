// Multi-chain configuration for Awaken Wallet Analyzer

export interface ChainConfig {
    id: string;
    name: string;
    displayName: string;
    chainId?: number;
    explorerApi: string;
    explorerUrl: string;
    rpcUrl?: string;
    nativeSymbol: string;
    nativeDecimals: number;
    logo?: string;
    addressFormat: 'evm' | 'keeta' | 'custom';
    addressValidator: (address: string) => boolean;
}

// EVM address validator (0x...)
const isValidEVMAddress = (address: string) => /^0x[a-fA-F0-9]{40}$/.test(address);

// Keeta address validator (keeta_...)
const isValidKeetaAddress = (address: string) => /^keeta_[a-z0-9]+$/i.test(address);

export const CHAINS: Record<string, ChainConfig> = {
    megaeth: {
        id: 'megaeth',
        name: 'MegaETH',
        displayName: 'MegaETH Mainnet',
        chainId: 4326,
        explorerApi: 'https://megaeth.blockscout.com/api',
        explorerUrl: 'https://megaeth.blockscout.com',
        rpcUrl: `https://megaeth-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`,
        nativeSymbol: 'ETH',
        nativeDecimals: 18,
        addressFormat: 'evm',
        addressValidator: isValidEVMAddress,
    },
    keeta: {
        id: 'keeta',
        name: 'Keeta',
        displayName: 'Keeta Network',
        explorerApi: 'https://api.explorer.keeta.com',
        explorerUrl: 'https://explorer.keeta.com',
        rpcUrl: 'https://rpc.keeta.com',
        nativeSymbol: 'KEETA',
        nativeDecimals: 8,
        addressFormat: 'keeta',
        addressValidator: isValidKeetaAddress,
    },
};

export const DEFAULT_CHAIN = 'megaeth';

export function getChain(chainId: string): ChainConfig {
    return CHAINS[chainId] || CHAINS[DEFAULT_CHAIN];
}

export function getSupportedChains(): ChainConfig[] {
    return Object.values(CHAINS);
}

export function validateAddress(address: string, chainId: string): boolean {
    const chain = getChain(chainId);
    return chain.addressValidator(address);
}

export function getExplorerTxUrl(hash: string, chainId: string): string {
    const chain = getChain(chainId);
    if (chain.addressFormat === 'keeta') {
        return `${chain.explorerUrl}/transaction/${hash}`;
    }
    return `${chain.explorerUrl}/tx/${hash}`;
}

export function getExplorerAddressUrl(address: string, chainId: string): string {
    const chain = getChain(chainId);
    if (chain.addressFormat === 'keeta') {
        return `${chain.explorerUrl}/account/${address}`;
    }
    return `${chain.explorerUrl}/address/${address}`;
}
