'use client';

import { useState } from 'react';
import WalletForm from '@/components/WalletForm';
import TransactionTable from '@/components/TransactionTable';
import DownloadButton from '@/components/DownloadButton';
import { getTransactions, getTokenTransfers, getExplorerAddressUrl } from '@/lib/megaeth';
import { transformAllTransactions } from '@/lib/transformer';
import { DisplayTransaction } from '@/types';

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<DisplayTransaction[]>([]);
  const [address, setAddress] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  const handleSubmit = async (walletAddress: string) => {
    setLoading(true);
    setError(null);
    setAddress(walletAddress);
    setHasSearched(true);

    try {
      // Fetch both normal transactions and token transfers in parallel
      const [normalTxs, tokenTxs] = await Promise.all([
        getTransactions(walletAddress),
        getTokenTransfers(walletAddress),
      ]);

      // Transform and merge all transactions
      const allTransactions = transformAllTransactions(
        normalTxs,
        tokenTxs,
        walletAddress
      );

      setTransactions(allTransactions);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to fetch transactions. Please try again.'
      );
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="main">
      <div className="container">
        {/* Header */}
        <header className="header">
          <div className="logo">
            <div className="logo-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <h1 className="title">MegaETH Wallet Analyzer</h1>
          </div>
          <p className="subtitle">
            Analyze your MegaETH wallet transactions and export to Awaken Tax CSV format
          </p>
          <div className="badge">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span>Chain ID: 4326 • MegaETH Mainnet</span>
          </div>
        </header>

        {/* Wallet Form */}
        <WalletForm onSubmit={handleSubmit} loading={loading} />

        {/* Error State */}
        {error && (
          <div className="error-message" style={{ maxWidth: '700px', margin: '0 auto 2rem' }}>
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="loading-state">
            <span className="loading-spinner" />
            <p>Fetching transactions from MegaETH...</p>
          </div>
        )}

        {/* Results */}
        {!loading && hasSearched && !error && (
          <>
            <div className="results-header">
              <div className="wallet-info">
                <span className="wallet-badge">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </span>
                <a
                  href={getExplorerAddressUrl(address)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hash-link"
                  style={{ fontSize: '0.875rem' }}
                >
                  View on Explorer ↗
                </a>
              </div>
              <DownloadButton
                transactions={transactions}
                address={address}
                disabled={transactions.length === 0}
              />
            </div>

            <TransactionTable transactions={transactions} address={address} />
          </>
        )}

        {/* Footer */}
        <footer className="footer">
          <p>
            Built for{' '}
            <a href="https://awaken.tax" target="_blank" rel="noopener noreferrer">
              Awaken Tax
            </a>{' '}
            •{' '}
            <a
              href="https://github.com/ivaavimusic/Awaken-MegaEth-Wallet-Analyser"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open Source
            </a>{' '}
            • Made with ❤️ by Event Horizon Labs
          </p>
        </footer>
      </div>
    </main>
  );
}
