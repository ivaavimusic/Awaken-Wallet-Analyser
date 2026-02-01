'use client';

import { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Download, Search, CheckCircle2, XCircle, Layers } from 'lucide-react';
import { downloadCSV } from '@/lib/csv';
import { getSupportedChains, ChainConfig } from '@/lib/chains';
import { getKeetaTransactions } from '@/lib/keeta';
import { Navbar } from '@/components/Navbar';
import { StatsGrid } from '@/components/StatsGrid';
import { PromoCards } from '@/components/PromoCards';
import ShinyText from '@/components/ShinyText';
import { DisplayTransaction } from '@/types';

const ITEMS_PER_PAGE = 25;

export default function Home() {
  const [address, setAddress] = useState('');
  const [transactions, setTransactions] = useState<DisplayTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedChainId, setSelectedChainId] = useState('megaeth');
  const [hasSearched, setHasSearched] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const chains = getSupportedChains();
  const selectedChain = chains.find(c => c.id === selectedChainId) || chains[0];

  const handleChainSelect = (chainId: string) => {
    setSelectedChainId(chainId);
    setTransactions([]);
    setError('');
    setHasSearched(false);
    setAddress('');
    setCurrentPage(1);
  };

  const handleAnalyze = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!address) return;

    setLoading(true);
    setError('');
    setHasSearched(true);
    setTransactions([]);
    setCurrentPage(1);

    try {
      let txs: DisplayTransaction[] = [];

      // Chain-specific validation and fetching
      if (selectedChainId === 'keeta') {
        if (!address.startsWith('keeta_')) {
          throw new Error("Woah, that's not a Keeta wallet address, bro! 🦊 A Keeta address looks like: keeta_abc123... (starts with 'keeta_' followed by lowercase letters and numbers)");
        }
        txs = await getKeetaTransactions(address);
      } else {
        if (!address.startsWith('0x')) {
          throw new Error("Woah, that's not a MegaETH wallet address, bro! 🚀 A MegaETH address looks like: 0x1234... (starts with '0x' followed by 40 hexadecimal characters)");
        }
        const response = await fetch(`https://megaeth.blockscout.com/api/v2/addresses/${address}/transactions`);
        if (!response.ok) throw new Error('Oops! Having trouble connecting to the blockchain right now. The network might be taking a nap 😴 Try again in a bit!');
        const data = await response.json();
        txs = (data.items || []).map((tx: any) => {
          const valueInEth = (parseInt(tx.value || '0') / 1e18).toFixed(4);
          const feeInEth = (parseInt(tx.fee?.value || '0') / 1e18).toFixed(6);
          const isIncoming = tx.to?.hash?.toLowerCase() === address.toLowerCase();
          const txDate = new Date(tx.timestamp).toISOString().split('T')[0];

          return {
            // Awaken CSV format
            Date: txDate,
            Asset: 'ETH',
            Amount: isIncoming ? valueInEth : `-${valueInEth}`,
            Fee: feeInEth,
            'P&L': '',
            'Payment Token': 'ETH',
            ID: tx.hash.slice(0, 10),
            Notes: isIncoming
              ? `Received from ${tx.from.hash?.slice(0, 12)}...${tx.from.hash?.slice(-6)}`
              : `Sent to ${tx.to?.hash?.slice(0, 12)}...${tx.to?.hash?.slice(-6)}`,
            Tag: isIncoming ? 'deposit' : 'withdrawal',
            'Transaction Hash': tx.hash,
            // Additional display fields
            timestamp: tx.timestamp,
            isIncoming,
            type: isIncoming ? 'transfer_in' : 'transfer_out',
            block: tx.block_number?.toString() || tx.block || '',
            method: tx.method || 'Transfer',
            from: tx.from.hash,
            to: tx.to?.hash || '',
            status: tx.status === 'ok' ? 'Success' : 'Failed',
            value: valueInEth,
            fee: feeInEth,
          };
        });
      }

      setTransactions(txs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: number | string | Date) => {
    return new Date(date).toLocaleString();
  };

  const getPlaceholder = () => {
    return selectedChainId === 'keeta'
      ? 'Search by Keeta address (keeta_...)'
      : 'Search by MegaETH address / txn hash / block...';
  };

  // Calculate stats
  const totalVolume = transactions.reduce((acc, tx) => {
    const amount = Math.abs(parseFloat(tx.Amount || '0'));
    return acc + amount;
  }, 0);
  const uniqueDays = new Set(transactions.map(tx => new Date(tx.timestamp).toDateString())).size;
  const totalGas = transactions.reduce((acc, tx) => acc + parseFloat(tx.Fee || '0'), 0);
  // Auto-scroll to results when transactions are loaded
  const resultsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (transactions.length > 0 && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [transactions, loading]);

  return (
    <div className="min-h-screen flex flex-col font-sans transition-colors duration-300" data-chain={selectedChainId}>
      {/* Navbar */}
      <Navbar selectedChain={selectedChain} onChainSelect={handleChainSelect} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 flex flex-col">

        {/* Search Bar - styled like the explorer */}
        <div className="mb-4">
          <form onSubmit={handleAnalyze} className="relative w-full">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-muted-foreground" />
            </div>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={getPlaceholder()}
              className="w-full h-14 bg-card text-card-foreground pl-12 pr-32 rounded-lg border border-border/10 focus:outline-none focus:ring-1 focus:ring-primary shadow-sm text-base placeholder:text-muted-foreground/50 transition-all font-mono"
              autoFocus
            />
            <div className="absolute inset-y-0 right-2 flex items-center">
              <Button
                type="submit"
                disabled={loading}
                className="h-10 px-6 font-medium"
              >
                {loading ? 'Searching...' : 'Search'}
              </Button>
            </div>
          </form>
          {error && (
            <div className="mt-3 p-4 rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
              <div className="flex items-start gap-3">
                <span className="text-2xl">🙈</span>
                <p className="text-sm text-amber-200 dark:text-amber-100 font-medium">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <StatsGrid
          transactionCount={transactions.length}
          uniqueDays={uniqueDays}
          totalVolume={`${totalVolume.toFixed(4)} ${selectedChain?.nativeSymbol || 'ETH'}`}
          gasSpent={`${totalGas.toFixed(6)} ${selectedChain?.nativeSymbol || 'ETH'}`}
          dailyActivity={transactions}
          className="mb-2"
        />

        {/* Promo Cards */}
        <PromoCards />

        {/* Transaction Table (Only show if searched) */}
        {hasSearched && transactions.length > 0 && (
          <div ref={resultsRef} className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500 scroll-mt-24">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Transactions</h3>
              <Button onClick={() => downloadCSV(transactions)} size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Download className="w-4 h-4 mr-2" />
                Download CSV
              </Button>
            </div>

            <Card className="overflow-hidden border-0 bg-card text-card-foreground">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/10 hover:bg-transparent">
                      <TableHead className="text-muted-foreground">Txn Hash</TableHead>
                      <TableHead className="text-muted-foreground">Type</TableHead>
                      <TableHead className="text-muted-foreground">Block</TableHead>
                      <TableHead className="text-muted-foreground">Age</TableHead>
                      <TableHead className="text-muted-foreground">From</TableHead>
                      <TableHead className="text-muted-foreground">To</TableHead>
                      <TableHead className="text-muted-foreground text-right">Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions
                      .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                      .map((tx, index) => (
                      <TableRow key={tx['Transaction Hash'] || `${currentPage}-${index}`} className="border-border/10 hover:bg-muted/10">
                        <TableCell className="font-mono text-primary truncate max-w-[120px]">
                          {tx['Transaction Hash'] || ''}
                        </TableCell>
                        <TableCell>
                          <span className="px-2 py-1 rounded bg-accent/20 text-xs font-mono border border-border/20">
                            {tx.method || tx.Tag || 'Transfer'}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{tx.block || '-'}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDate(tx.timestamp)}
                        </TableCell>
                        <TableCell className="font-mono text-muted-foreground truncate max-w-[120px]">{tx.from || '-'}</TableCell>
                        <TableCell className="font-mono text-muted-foreground truncate max-w-[120px]">{tx.to || '-'}</TableCell>
                        <TableCell className="font-medium text-right">
                          {tx.value || tx.Amount} {selectedChain?.nativeSymbol || 'ETH'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>

            {/* Pagination */}
            {transactions.length > ITEMS_PER_PAGE && (
              <div className="flex items-center justify-center gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  ««
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  ‹
                </Button>
                <span className="text-sm text-muted-foreground px-2">
                  Page {currentPage} of {Math.ceil(transactions.length / ITEMS_PER_PAGE)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(Math.ceil(transactions.length / ITEMS_PER_PAGE), p + 1))}
                  disabled={currentPage === Math.ceil(transactions.length / ITEMS_PER_PAGE)}
                >
                  ›
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.ceil(transactions.length / ITEMS_PER_PAGE))}
                  disabled={currentPage === Math.ceil(transactions.length / ITEMS_PER_PAGE)}
                >
                  »»
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {hasSearched && !loading && transactions.length === 0 && !error && (
          <Card className="mt-8 p-12 text-center border-dashed bg-card border-border/20">
            <div className="flex flex-col items-center gap-4 text-muted-foreground">
              <Layers className="w-12 h-12 opacity-20" />
              <h3 className="text-lg font-medium">No transactions found</h3>
              <p className="text-sm">This wallet hasn't made any transactions on {selectedChain.name} yet.</p>
            </div>
          </Card>
        )}

        <div className="flex-1" /> {/* Spacer to push footer down if content is short */}

        {/* Footer */}
        <footer className="mt-12 py-6 border-t border-border/10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-3">
            <img src="/EHLLOGO.png" alt="EventHorizon Labs" className="h-8 w-auto" />
            <a href="https://ehlabs.xyz" target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">
              Built by EventHorizon Labs
            </a>
          </div>
          <div className="flex items-center gap-4">
            <a href="https://github.com/ivaavimusic/Awaken-Wallet-Analyser" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
              Open Source
            </a>
            <a href="https://github.com/ivaavimusic/Awaken-Wallet-Analyser" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
              GitHub
            </a>
          </div>
        </footer>

      </main>
    </div>
  );
}
