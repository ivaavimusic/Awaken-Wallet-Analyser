'use client';

import { useState } from 'react';
import { Search, Download, Layers, ExternalLink, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  getTransactions,
  getTokenTransfers,
  getExplorerAddressUrl,
  getExplorerTxUrl,
  isValidAddress,
  MEGAETH_CONFIG,
} from '@/lib/megaeth';
import { transformAllTransactions } from '@/lib/transformer';
import { generateCSV } from '@/lib/csv';
import { DisplayTransaction } from '@/types';

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<DisplayTransaction[]>([]);
  const [address, setAddress] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [filter, setFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inputValue.trim()) {
      setError('Please enter a wallet address');
      return;
    }

    if (!isValidAddress(inputValue)) {
      setError('Please enter a valid Ethereum address (0x...)');
      return;
    }

    setLoading(true);
    setError(null);
    setAddress(inputValue);
    setHasSearched(true);
    setCurrentPage(1);

    try {
      const [normalTxs, tokenTxs] = await Promise.all([
        getTransactions(inputValue),
        getTokenTransfers(inputValue),
      ]);

      const allTransactions = transformAllTransactions(
        normalTxs,
        tokenTxs,
        inputValue
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

  const handleDownload = () => {
    if (transactions.length === 0) return;
    const csv = generateCSV(transactions);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `awaken_${address.slice(0, 8)}_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Filter and paginate transactions
  const filteredTxs = transactions.filter((tx) =>
    filter
      ? tx.Asset.toLowerCase().includes(filter.toLowerCase()) ||
      tx.Tag.toLowerCase().includes(filter.toLowerCase()) ||
      tx.Notes.toLowerCase().includes(filter.toLowerCase())
      : true
  );

  const totalPages = Math.ceil(filteredTxs.length / itemsPerPage);
  const paginatedTxs = filteredTxs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getTagVariant = (tag: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (tag) {
      case 'deposit':
        return 'default';
      case 'withdrawal':
        return 'secondary';
      case 'contract':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 md:mb-12">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary text-primary-foreground mb-4">
            <Layers className="w-7 h-7" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
            Awaken <span className="text-primary">Wallet Analyzer</span>
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Analyze blockchain transactions and export to Awaken Tax CSV format
          </p>
          <Badge variant="outline" className="mt-4">
            <span className="w-2 h-2 rounded-full bg-primary mr-2" />
            {MEGAETH_CONFIG.name} • Chain ID: {MEGAETH_CONFIG.chainId}
          </Badge>
        </div>

        {/* Search Form */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
              <Input
                placeholder="Enter wallet address (0x...)"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="flex-1 font-mono text-sm"
              />
              <Button type="submit" disabled={loading} className="min-w-[120px]">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Analyze
                  </>
                )}
              </Button>
            </form>
            {error && (
              <p className="text-sm text-destructive mt-3">{error}</p>
            )}
          </CardContent>
        </Card>

        {/* Loading State */}
        {loading && (
          <Card>
            <CardContent className="py-12 text-center">
              <Loader2 className="w-10 h-10 animate-spin mx-auto text-primary mb-4" />
              <p className="text-muted-foreground">
                Fetching transactions from {MEGAETH_CONFIG.name}...
              </p>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {!loading && hasSearched && !error && (
          <Card>
            <CardHeader className="flex-row items-center justify-between flex-wrap gap-4">
              <div>
                <CardTitle className="text-lg font-medium flex items-center gap-2">
                  <span className="font-mono text-sm bg-muted px-2 py-1 rounded">
                    {address.slice(0, 6)}...{address.slice(-4)}
                  </span>
                  <a
                    href={getExplorerAddressUrl(address)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline text-sm font-normal"
                  >
                    <ExternalLink className="w-4 h-4 inline mr-1" />
                    Explorer
                  </a>
                </CardTitle>
                <CardDescription>
                  {transactions.length} transactions found
                </CardDescription>
              </div>
              <Button
                onClick={handleDownload}
                disabled={transactions.length === 0}
                variant="default"
              >
                <Download className="w-4 h-4 mr-2" />
                Download CSV
              </Button>
            </CardHeader>

            {transactions.length > 0 ? (
              <>
                <CardContent className="pt-0">
                  <div className="flex flex-col sm:flex-row gap-3 mb-4">
                    <Input
                      placeholder="Filter by asset, tag, or notes..."
                      value={filter}
                      onChange={(e) => {
                        setFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="max-w-sm"
                    />
                    <div className="text-sm text-muted-foreground flex items-center">
                      Showing {paginatedTxs.length} of {filteredTxs.length} results
                    </div>
                  </div>

                  <div className="border rounded-lg overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Asset</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="text-right">Fee</TableHead>
                          <TableHead>Tag</TableHead>
                          <TableHead>Notes</TableHead>
                          <TableHead>Hash</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedTxs.map((tx, i) => (
                          <TableRow key={`${tx['Transaction Hash']}-${i}`}>
                            <TableCell className="font-mono text-xs text-muted-foreground">
                              {tx.Date}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{tx.Asset}</Badge>
                            </TableCell>
                            <TableCell
                              className={`text-right font-mono text-sm ${tx.isIncoming ? 'text-green-600 dark:text-green-400' : 'text-primary'
                                }`}
                            >
                              {tx.isIncoming ? '+' : ''}{tx.Amount}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs text-muted-foreground">
                              {parseFloat(tx.Fee) > 0 ? tx.Fee : '-'}
                            </TableCell>
                            <TableCell>
                              <Badge variant={getTagVariant(tx.Tag)} className="text-xs">
                                {tx.Tag.toUpperCase()}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-[150px] truncate text-xs text-muted-foreground">
                              {tx.Notes}
                            </TableCell>
                            <TableCell>
                              <a
                                href={getExplorerTxUrl(tx['Transaction Hash'])}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono text-xs text-primary hover:underline"
                              >
                                {tx['Transaction Hash'].slice(0, 8)}...
                              </a>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-2 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <span className="text-sm text-muted-foreground px-4">
                        Page {currentPage} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </CardContent>
              </>
            ) : (
              <CardContent className="py-12 text-center">
                <Layers className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-semibold mb-1">No transactions found</h3>
                <p className="text-sm text-muted-foreground">
                  This wallet hasn&apos;t made any transactions on {MEGAETH_CONFIG.name} yet.
                </p>
              </CardContent>
            )}
          </Card>
        )}

        {/* Footer */}
        <footer className="text-center mt-12 pb-6 text-sm text-muted-foreground">
          <p>
            Built for{' '}
            <a href="https://awaken.tax" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              Awaken Tax
            </a>
            {' • '}
            <a href="https://github.com/ivaavimusic/Awaken-MegaEth-Wallet-Analyser" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              Open Source
            </a>
            {' • '}
            Made with ❤️ by Event Horizon Labs
          </p>
        </footer>
      </div>
    </main>
  );
}
