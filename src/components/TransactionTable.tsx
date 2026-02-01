'use client';

import { useState } from 'react';
import { DisplayTransaction } from '@/types';
import { getExplorerTxUrl } from '@/lib/megaeth';

interface TransactionTableProps {
    transactions: DisplayTransaction[];
    address: string;
}

type SortField = 'Date' | 'Asset' | 'Amount' | 'Fee' | 'Tag';
type SortOrder = 'asc' | 'desc';

const ITEMS_PER_PAGE = 25;

export default function TransactionTable({
    transactions,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    address,
}: TransactionTableProps) {
    const [currentPage, setCurrentPage] = useState(1);
    const [sortField, setSortField] = useState<SortField>('Date');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
    const [filter, setFilter] = useState('');

    // Filter transactions
    const filteredTransactions = transactions.filter((tx) => {
        if (!filter) return true;
        const searchLower = filter.toLowerCase();
        return (
            tx.Asset.toLowerCase().includes(searchLower) ||
            tx.Tag.toLowerCase().includes(searchLower) ||
            tx['Transaction Hash'].toLowerCase().includes(searchLower) ||
            tx.Notes.toLowerCase().includes(searchLower)
        );
    });

    // Sort transactions
    const sortedTransactions = [...filteredTransactions].sort((a, b) => {
        let aVal: string | number = a[sortField];
        let bVal: string | number = b[sortField];

        // Handle numeric sorts
        if (sortField === 'Amount' || sortField === 'Fee') {
            aVal = parseFloat(a[sortField]) || 0;
            bVal = parseFloat(b[sortField]) || 0;
        } else if (sortField === 'Date') {
            aVal = a.timestamp;
            bVal = b.timestamp;
        }

        if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
        return 0;
    });

    // Pagination
    const totalPages = Math.ceil(sortedTransactions.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedTransactions = sortedTransactions.slice(
        startIndex,
        startIndex + ITEMS_PER_PAGE
    );

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('desc');
        }
    };

    const getSortIcon = (field: SortField) => {
        if (sortField !== field) return '↕';
        return sortOrder === 'asc' ? '↑' : '↓';
    };

    const getTagClass = (tag: string) => {
        switch (tag) {
            case 'deposit':
                return 'tag-deposit';
            case 'withdrawal':
                return 'tag-withdrawal';
            case 'contract':
                return 'tag-contract';
            case 'swap':
                return 'tag-swap';
            default:
                return 'tag-other';
        }
    };

    if (transactions.length === 0) {
        return (
            <div className="empty-state">
                <svg
                    width="64"
                    height="64"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                    <polyline points="13 2 13 9 20 9" />
                    <line x1="10" y1="12" x2="10" y2="18" />
                    <line x1="14" y1="12" x2="14" y2="18" />
                </svg>
                <h3>No transactions found</h3>
                <p>This wallet hasn&apos;t made any transactions on MegaETH yet.</p>
            </div>
        );
    }

    return (
        <div className="table-container">
            {/* Filter Input */}
            <div className="table-controls">
                <input
                    type="text"
                    placeholder="Filter by asset, tag, hash..."
                    value={filter}
                    onChange={(e) => {
                        setFilter(e.target.value);
                        setCurrentPage(1);
                    }}
                    className="filter-input"
                />
                <span className="transaction-count">
                    {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''}
                </span>
            </div>

            {/* Table */}
            <div className="table-wrapper">
                <table className="transaction-table">
                    <thead>
                        <tr>
                            <th onClick={() => handleSort('Date')} className="sortable">
                                Date {getSortIcon('Date')}
                            </th>
                            <th onClick={() => handleSort('Asset')} className="sortable">
                                Asset {getSortIcon('Asset')}
                            </th>
                            <th onClick={() => handleSort('Amount')} className="sortable">
                                Amount {getSortIcon('Amount')}
                            </th>
                            <th onClick={() => handleSort('Fee')} className="sortable">
                                Fee {getSortIcon('Fee')}
                            </th>
                            <th onClick={() => handleSort('Tag')} className="sortable">
                                Tag {getSortIcon('Tag')}
                            </th>
                            <th>Notes</th>
                            <th>Hash</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedTransactions.map((tx, index) => (
                            <tr key={`${tx['Transaction Hash']}-${tx.Asset}-${index}`}>
                                <td className="date-cell">{tx.Date}</td>
                                <td className="asset-cell">
                                    <span className="asset-badge">{tx.Asset}</span>
                                </td>
                                <td
                                    className={`amount-cell ${tx.isIncoming ? 'positive' : 'negative'
                                        }`}
                                >
                                    {tx.isIncoming ? '+' : ''}{parseFloat(tx.Amount).toFixed(6)}
                                </td>
                                <td className="fee-cell">{parseFloat(tx.Fee).toFixed(6)}</td>
                                <td>
                                    <span className={`tag ${getTagClass(tx.Tag)}`}>{tx.Tag}</span>
                                </td>
                                <td className="notes-cell" title={tx.Notes}>
                                    {tx.Notes}
                                </td>
                                <td className="hash-cell">
                                    <a
                                        href={getExplorerTxUrl(tx['Transaction Hash'])}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="hash-link"
                                    >
                                        {tx['Transaction Hash'].slice(0, 10)}...
                                    </a>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="pagination">
                    <button
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                        className="pagination-button"
                    >
                        «
                    </button>
                    <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="pagination-button"
                    >
                        ‹
                    </button>
                    <span className="pagination-info">
                        Page {currentPage} of {totalPages}
                    </span>
                    <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="pagination-button"
                    >
                        ›
                    </button>
                    <button
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages}
                        className="pagination-button"
                    >
                        »
                    </button>
                </div>
            )}
        </div>
    );
}
