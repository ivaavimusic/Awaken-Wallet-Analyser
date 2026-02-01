// Keeta Network API Client

import { DisplayTransaction, TransactionType } from '@/types';

// Keeta API Configuration
const KEETA_API_BASE = 'https://rep3.main.network.api.keeta.com/api/node/ledger';

interface KeetaOperation {
    type: number;
    amount?: string;
    to?: string;
    token?: string;
}

interface KeetaBlock {
    version: number;
    date: string;
    previous: string;
    account: string;
    purpose: number;
    signer: string;
    network: string;
    operations: KeetaOperation[];
    $hash: string;
}

interface BlockResponse {
    block: KeetaBlock;
}

interface VoteInfo {
    blocks: string[];
}

interface VoteStaple {
    votes: VoteInfo[];
}

interface HistoryEntry {
    $timestamp: number;
    voteStaple: VoteStaple;
}

interface HistoryResponse {
    history: HistoryEntry[];
}

/**
 * Validate Keeta address format (keeta_...)
 */
export function isValidKeetaAddress(address: string): boolean {
    return /^keeta_[a-z0-9]+$/i.test(address);
}

/**
 * Convert hex amount to decimal (Keeta uses 18 decimals for most tokens)
 */
function hexToDecimal(hex: string): string {
    if (!hex || hex === '0' || hex === '0x0') return '0';
    const cleanHex = hex.startsWith('0x') ? hex : `0x${hex}`;
    const value = BigInt(cleanHex);
    // Keeta appears to use 18 decimals for most tokens (similar to ETH)
    const decimal = Number(value) / 1e18;
    return decimal.toFixed(18);
}

/**
 * Format date to YYYY-MM-DD
 */
function formatDate(isoDate: string): string {
    return isoDate.split('T')[0];
}

/**
 * shorten address for display
 */
function shortenAddress(address: string): string {
    if (address.length <= 20) return address;
    return `${address.slice(0, 12)}...${address.slice(-6)}`;
}

/**
 * Determine transaction type for Keeta operations
 */
function getTransactionType(op: KeetaOperation, userAddress: string): TransactionType {
    const toAddress = op.to?.toLowerCase() || '';
    const isToUser = toAddress === userAddress.toLowerCase();

    if (isToUser) return 'transfer_in';
    return 'transfer_out';
}

/**
 * Fetch a single block by hash
 */
async function fetchBlock(blockHash: string): Promise<KeetaBlock | null> {
    try {
        const response = await fetch(`${KEETA_API_BASE}/block/${blockHash}`);
        if (!response.ok) return null;
        const data: BlockResponse = await response.json();
        return data.block;
    } catch (error) {
        console.error(`Error fetching block ${blockHash}:`, error);
        return null;
    }
}

/**
 * Fetch transaction history for a Keeta address
 */
export async function getKeetaTransactions(
    address: string,
    limit: number = 100
): Promise<DisplayTransaction[]> {
    const url = `${KEETA_API_BASE}/account/${address}/history?limit=${limit}`;

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }

        const data: HistoryResponse = await response.json();

        if (!data.history || data.history.length === 0) {
            return [];
        }

        const transactions: DisplayTransaction[] = [];
        const blockHashes = new Set<string>();
        const addressLower = address.toLowerCase();

        // Step 1: Collect all unique block hashes from votes
        for (const entry of data.history) {
            if (entry.voteStaple?.votes) {
                for (const vote of entry.voteStaple.votes) {
                    if (vote.blocks && Array.isArray(vote.blocks)) {
                        for (const blockHash of vote.blocks) {
                            blockHashes.add(blockHash);
                        }
                    }
                }
            }
        }

        // Step 2: Fetch each block (limit to avoid too many requests)
        const blocksToFetch = Array.from(blockHashes).slice(0, 50); // Limit to 50 blocks
        const blockPromises = blocksToFetch.map(hash => fetchBlock(hash));
        const blocks = await Promise.all(blockPromises);

        // Step 3: Process operations from fetched blocks
        for (const block of blocks) {
            if (!block) continue;

            const operations = block.operations || [];

            for (const op of operations) {
                // Only process transfer operations (type 0)
                if (op.type === 0 && op.amount) {
                    const type = getTransactionType(op, addressLower);
                    const isIncoming = type === 'transfer_in';
                    const amount = hexToDecimal(op.amount);

                    transactions.push({
                        Date: formatDate(block.date),
                        Asset: 'KEETA',
                        Amount: isIncoming ? amount : `-${amount}`,
                        Fee: '0', // Keeta has minimal/zero fees for users
                        'P&L': '',
                        'Payment Token': 'KEETA',
                        ID: block.$hash.slice(0, 10),
                        Notes: isIncoming
                            ? `Received from ${shortenAddress(block.account)}`
                            : `Sent to ${shortenAddress(op.to || '')}`,
                        Tag: isIncoming ? 'deposit' : 'withdrawal',
                        'Transaction Hash': block.$hash,
                        timestamp: new Date(block.date).getTime(),
                        isIncoming,
                        type,
                        // Display fields for table
                        block: block.$hash.slice(0, 10),
                        method: isIncoming ? 'Receive' : 'Send',
                        from: block.account,
                        to: op.to || '',
                        value: amount,
                    });
                }
            }
        }

        // Sort by timestamp descending
        transactions.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        return transactions;
    } catch (error) {
        console.error('Error fetching Keeta transactions:', error);
        throw error;
    }
}

/**
 * Get explorer URL for a Keeta transaction
 */
export function getKeetaExplorerTxUrl(hash: string): string {
    return `https://explorer.keeta.com/transaction/${hash}`;
}

/**
 * Get explorer URL for a Keeta address
 */
export function getKeetaExplorerAddressUrl(address: string): string {
    return `https://explorer.keeta.com/account/${address}`;
}
