// MegaETH API Client
// Uses Blockscout API (primary) with Alchemy RPC (fallback)

import {
    BlockscoutTransaction,
    BlockscoutTokenTransfer,
    BlockscoutAPIResponse,
} from '@/types';

// MegaETH Chain Configuration
export const MEGAETH_CONFIG = {
    chainId: 4326,
    name: 'MegaETH Mainnet',
    blockscoutApi: 'https://megaeth.blockscout.com/api',
    alchemyRpc: `https://megaeth-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`,
    explorer: 'https://megaeth.blockscout.com',
    nativeSymbol: 'ETH',
    nativeDecimals: 18,
};

/**
 * Fetch normal transactions for an address from Blockscout
 */
export async function getTransactions(
    address: string
): Promise<BlockscoutTransaction[]> {
    const url = new URL(MEGAETH_CONFIG.blockscoutApi);
    url.searchParams.set('module', 'account');
    url.searchParams.set('action', 'txlist');
    url.searchParams.set('address', address);
    url.searchParams.set('startblock', '0');
    url.searchParams.set('endblock', '99999999');
    url.searchParams.set('sort', 'desc');

    try {
        const response = await fetch(url.toString());

        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }

        const data: BlockscoutAPIResponse<BlockscoutTransaction> = await response.json();

        // Handle 'no results' as valid empty response, not an error
        const noResultsMessages = ['No transactions found', 'No records found', 'No token transfers found'];
        if (data.status === '0' && !noResultsMessages.some(msg => data.message?.includes(msg))) {
            throw new Error(data.message || 'Failed to fetch transactions');
        }

        return Array.isArray(data.result) ? data.result : [];
    } catch (error) {
        console.error('Error fetching transactions:', error);
        throw error;
    }
}

/**
 * Fetch ERC-20 token transfers for an address from Blockscout
 */
export async function getTokenTransfers(
    address: string
): Promise<BlockscoutTokenTransfer[]> {
    const url = new URL(MEGAETH_CONFIG.blockscoutApi);
    url.searchParams.set('module', 'account');
    url.searchParams.set('action', 'tokentx');
    url.searchParams.set('address', address);
    url.searchParams.set('startblock', '0');
    url.searchParams.set('endblock', '99999999');
    url.searchParams.set('sort', 'desc');

    try {
        const response = await fetch(url.toString());

        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }

        const data: BlockscoutAPIResponse<BlockscoutTokenTransfer> = await response.json();

        // Handle 'no results' as valid empty response, not an error
        const noResultsMessages = ['No transactions found', 'No records found', 'No token transfers found'];
        if (data.status === '0' && !noResultsMessages.some(msg => data.message?.includes(msg))) {
            throw new Error(data.message || 'Failed to fetch token transfers');
        }

        return Array.isArray(data.result) ? data.result : [];
    } catch (error) {
        console.error('Error fetching token transfers:', error);
        throw error;
    }
}

/**
 * Fetch ETH balance using Alchemy RPC (fallback method)
 */
export async function getBalance(address: string): Promise<string> {
    try {
        const response = await fetch(MEGAETH_CONFIG.alchemyRpc, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'eth_getBalance',
                params: [address, 'latest'],
            }),
        });

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error.message);
        }

        // Convert hex to decimal and then to ETH
        const weiBalance = BigInt(data.result);
        const ethBalance = Number(weiBalance) / 1e18;

        return ethBalance.toFixed(6);
    } catch (error) {
        console.error('Error fetching balance:', error);
        throw error;
    }
}

/**
 * Validate if an address is a valid Ethereum address
 */
export function isValidAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Get explorer URL for a transaction
 */
export function getExplorerTxUrl(hash: string): string {
    return `${MEGAETH_CONFIG.explorer}/tx/${hash}`;
}

/**
 * Get explorer URL for an address
 */
export function getExplorerAddressUrl(address: string): string {
    return `${MEGAETH_CONFIG.explorer}/address/${address}`;
}
