// Transform blockchain data to Awaken Tax CSV format

import {
    BlockscoutTransaction,
    BlockscoutTokenTransfer,
    DisplayTransaction,
    TransactionType,
} from '@/types';
import { MEGAETH_CONFIG } from './megaeth';

/**
 * Format Unix timestamp to YYYY-MM-DD
 */
function formatDate(timestamp: string): string {
    const date = new Date(parseInt(timestamp) * 1000);
    return date.toISOString().split('T')[0];
}

/**
 * Format Wei to ETH
 */
function weiToEth(wei: string): string {
    const value = BigInt(wei);
    const eth = Number(value) / 1e18;
    return eth.toFixed(8);
}

/**
 * Format token amount with decimals
 */
function formatTokenAmount(value: string, decimals: string): string {
    const decimalNum = parseInt(decimals) || 18;
    const amount = BigInt(value);
    const divisor = BigInt(10 ** decimalNum);
    const whole = amount / divisor;
    const remainder = amount % divisor;

    // Format with proper decimal places
    const remainderStr = remainder.toString().padStart(decimalNum, '0');
    const significantDecimals = remainderStr.slice(0, 8);

    return `${whole}.${significantDecimals}`;
}

/**
 * Calculate gas fee in ETH
 */
function calculateFee(gasUsed: string, gasPrice: string): string {
    const fee = BigInt(gasUsed) * BigInt(gasPrice);
    return weiToEth(fee.toString());
}

/**
 * Determine transaction type
 */
function getTransactionType(
    tx: BlockscoutTransaction,
    userAddress: string
): TransactionType {
    const from = tx.from.toLowerCase();
    const to = tx.to?.toLowerCase() || '';
    const user = userAddress.toLowerCase();

    // Contract interaction (has input data beyond method ID)
    if (tx.input && tx.input !== '0x' && tx.input.length > 10) {
        if (from === user) {
            return 'contract_interaction';
        }
    }

    // Simple transfer
    if (from === user) {
        return 'transfer_out';
    } else if (to === user) {
        return 'transfer_in';
    }

    return 'unknown';
}

/**
 * Determine token transaction type
 */
function getTokenTransactionType(
    tx: BlockscoutTokenTransfer,
    userAddress: string
): TransactionType {
    const from = tx.from.toLowerCase();
    const to = tx.to?.toLowerCase() || '';
    const user = userAddress.toLowerCase();

    if (from === user) {
        return 'token_out';
    } else if (to === user) {
        return 'token_in';
    }

    return 'unknown';
}

/**
 * Get transaction tag for Awaken format
 */
function getTag(type: TransactionType): string {
    switch (type) {
        case 'transfer_in':
            return 'deposit';
        case 'transfer_out':
            return 'withdrawal';
        case 'token_in':
            return 'deposit';
        case 'token_out':
            return 'withdrawal';
        case 'contract_interaction':
            return 'contract';
        case 'swap':
            return 'swap';
        default:
            return 'other';
    }
}

/**
 * Generate notes for transaction
 */
function generateNotes(
    type: TransactionType,
    from: string,
    to: string,
    userAddress: string
): string {

    switch (type) {
        case 'transfer_in':
            return `Received from ${from.slice(0, 10)}...`;
        case 'transfer_out':
            return `Sent to ${to.slice(0, 10)}...`;
        case 'token_in':
            return `Token received from ${from.slice(0, 10)}...`;
        case 'token_out':
            return `Token sent to ${to.slice(0, 10)}...`;
        case 'contract_interaction':
            return `Contract interaction with ${to.slice(0, 10)}...`;
        default:
            return '';
    }
}

/**
 * Transform a Blockscout transaction to Awaken display format
 */
export function transformTransaction(
    tx: BlockscoutTransaction,
    userAddress: string
): DisplayTransaction {
    const type = getTransactionType(tx, userAddress);
    const isIncoming = type === 'transfer_in';
    const timestamp = parseInt(tx.timeStamp);

    // Amount is negative for outgoing, positive for incoming
    const rawAmount = weiToEth(tx.value);
    const amount = isIncoming ? rawAmount : `-${rawAmount}`;

    // Fee is only paid by sender
    const fee = tx.from.toLowerCase() === userAddress.toLowerCase()
        ? calculateFee(tx.gasUsed, tx.gasPrice)
        : '0';

    return {
        Date: formatDate(tx.timeStamp),
        Asset: MEGAETH_CONFIG.nativeSymbol,
        Amount: amount,
        Fee: fee,
        'P&L': '', // Not calculated for basic transactions
        'Payment Token': MEGAETH_CONFIG.nativeSymbol,
        ID: tx.hash.slice(0, 10),
        Notes: generateNotes(type, tx.from, tx.to, userAddress),
        Tag: getTag(type),
        'Transaction Hash': tx.hash,
        timestamp,
        isIncoming,
        type,
    };
}

/**
 * Transform a Blockscout token transfer to Awaken display format
 */
export function transformTokenTransfer(
    tx: BlockscoutTokenTransfer,
    userAddress: string
): DisplayTransaction {
    const type = getTokenTransactionType(tx, userAddress);
    const isIncoming = type === 'token_in';
    const timestamp = parseInt(tx.timeStamp);

    // Format amount with token decimals
    const rawAmount = formatTokenAmount(tx.value, tx.tokenDecimal);
    const amount = isIncoming ? rawAmount : `-${rawAmount}`;

    // Fee is only paid by sender (use 0 for token transfers since gas is tracked elsewhere)
    const fee = tx.from.toLowerCase() === userAddress.toLowerCase()
        ? calculateFee(tx.gasUsed, tx.gasPrice)
        : '0';

    return {
        Date: formatDate(tx.timeStamp),
        Asset: tx.tokenSymbol || 'UNKNOWN',
        Amount: amount,
        Fee: fee,
        'P&L': '',
        'Payment Token': MEGAETH_CONFIG.nativeSymbol,
        ID: tx.hash.slice(0, 10),
        Notes: generateNotes(type, tx.from, tx.to, userAddress),
        Tag: getTag(type),
        'Transaction Hash': tx.hash,
        timestamp,
        isIncoming,
        type,
    };
}

/**
 * Transform and merge all transactions
 */
export function transformAllTransactions(
    transactions: BlockscoutTransaction[],
    tokenTransfers: BlockscoutTokenTransfer[],
    userAddress: string
): DisplayTransaction[] {
    const normalTxs = transactions
        .filter(tx => tx.value !== '0' || tx.input !== '0x') // Filter out zero-value non-contract txs
        .map(tx => transformTransaction(tx, userAddress));

    const tokenTxs = tokenTransfers.map(tx =>
        transformTokenTransfer(tx, userAddress)
    );

    // Merge and sort by timestamp (newest first)
    const allTxs = [...normalTxs, ...tokenTxs];
    allTxs.sort((a, b) => b.timestamp - a.timestamp);

    // Remove duplicates (token transfers may overlap with normal txs)
    const seen = new Set<string>();
    return allTxs.filter(tx => {
        const key = `${tx['Transaction Hash']}-${tx.Asset}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}
