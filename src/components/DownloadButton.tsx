'use client';

import { DisplayTransaction } from '@/types';
import { downloadCSV } from '@/lib/csv';

interface DownloadButtonProps {
    transactions: DisplayTransaction[];
    address: string;
    disabled?: boolean;
}

export default function DownloadButton({
    transactions,
    address,
    disabled = false,
}: DownloadButtonProps) {
    const handleDownload = () => {
        const filename = `megaeth-${address.slice(0, 8)}-${new Date().toISOString().split('T')[0]}.csv`;
        downloadCSV(transactions, filename);
    };

    return (
        <button
            onClick={handleDownload}
            disabled={disabled || transactions.length === 0}
            className="download-button"
        >
            <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>Download Awaken CSV</span>
        </button>
    );
}
