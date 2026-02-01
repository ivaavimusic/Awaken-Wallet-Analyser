// CSV Generation Utilities for Awaken Tax format

import { DisplayTransaction, AwakenTransaction } from '@/types';

/**
 * Awaken CSV column headers in exact order
 */
export const AWAKEN_CSV_HEADERS = [
    'Date',
    'Asset',
    'Amount',
    'Fee',
    'P&L',
    'Payment Token',
    'ID',
    'Notes',
    'Tag',
    'Transaction Hash',
] as const;

/**
 * Escape a value for CSV (handle commas, quotes, newlines)
 */
function escapeCSVValue(value: string): string {
    if (!value) return '';

    // If value contains comma, quote, or newline, wrap in quotes
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        // Escape any existing quotes by doubling them
        const escaped = value.replace(/"/g, '""');
        return `"${escaped}"`;
    }

    return value;
}

/**
 * Convert DisplayTransaction to AwakenTransaction (remove extra fields)
 */
function toAwakenFormat(tx: DisplayTransaction): AwakenTransaction {
    return {
        Date: tx.Date,
        Asset: tx.Asset,
        Amount: tx.Amount,
        Fee: tx.Fee,
        'P&L': tx['P&L'],
        'Payment Token': tx['Payment Token'],
        ID: tx.ID,
        Notes: tx.Notes,
        Tag: tx.Tag,
        'Transaction Hash': tx['Transaction Hash'],
    };
}

/**
 * Generate a CSV row from an Awaken transaction
 */
function generateRow(tx: AwakenTransaction): string {
    return AWAKEN_CSV_HEADERS.map(header => escapeCSVValue(tx[header])).join(',');
}

/**
 * Generate complete CSV string from transactions
 */
export function generateCSV(transactions: DisplayTransaction[]): string {
    const headerRow = AWAKEN_CSV_HEADERS.join(',');
    const dataRows = transactions.map(tx => generateRow(toAwakenFormat(tx)));

    return [headerRow, ...dataRows].join('\n');
}

/**
 * Trigger browser download of CSV file
 */
export function downloadCSV(
    transactions: DisplayTransaction[],
    filename?: string
): void {
    const csv = generateCSV(transactions);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
        'download',
        filename || `megaeth-transactions-${new Date().toISOString().split('T')[0]}.csv`
    );
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up the URL object
    URL.revokeObjectURL(url);
}

/**
 * Preview first few rows of CSV (for debugging)
 */
export function previewCSV(transactions: DisplayTransaction[], rows = 5): string {
    const csv = generateCSV(transactions.slice(0, rows));
    return csv;
}
