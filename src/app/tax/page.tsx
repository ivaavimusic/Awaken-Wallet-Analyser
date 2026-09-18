'use client';

import { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, Download, Layers, Search } from 'lucide-react';
import { downloadCSV } from '@/lib/csv';
import { getSupportedChains, getChain, DEFAULT_CHAIN } from '@/lib/chains';
import { getKeetaTransactions } from '@/lib/keeta';
import { fetchSolanaTransactions } from '@/lib/solana';
import { resolveRpcs } from '@/lib/rpc';
import { fetchAlchemyTransfers, fetchBlockscoutTransfers } from '@/lib/transfers';
import { loadSettings } from '@/lib/settings';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ChainLogo } from '@/components/ChainLogo';
import { StatsGrid } from '@/components/StatsGrid';
import { DisplayTransaction } from '@/types';

const ITEMS_PER_PAGE = 25;

/** Keep small balances legible instead of rounding them to 0.0000. */
const formatAmount = (n: number): string => {
    if (n === 0) return '0';
    if (Math.abs(n) >= 0.0001) {
        return n.toLocaleString('en-US', { maximumFractionDigits: 4 });
    }
    return n.toLocaleString('en-US', { maximumFractionDigits: 9 });
};

export default function TaxExportPage() {
    const [address, setAddress] = useState('');
    const [transactions, setTransactions] = useState<DisplayTransaction[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [chainId, setChainId] = useState(DEFAULT_CHAIN);
    const [hasSearched, setHasSearched] = useState(false);
    const [page, setPage] = useState(1);
    const [alchemyKey, setAlchemyKey] = useState('');
    /** Non-fatal caveat about the result set, e.g. truncation. */
    const [notice, setNotice] = useState('');
    /**
     * Whether the source reports fees at all. Inferring this from "every fee
     * is 0" is wrong: a wallet that only ever received really did pay nothing.
     */
    const [feesKnown, setFeesKnown] = useState(true);

    const chains = getSupportedChains();
    const chain = getChain(chainId);
    const resultsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setAlchemyKey(loadSettings().alchemyKey);
    }, []);

    const selectChain = (id: string) => {
        setChainId(id);
        setTransactions([]);
        setError('');
        setNotice('');
        setHasSearched(false);
        setAddress('');
        setPage(1);
    };

    const analyze = async (e?: React.FormEvent) => {
        e?.preventDefault();
        const addr = address.trim();
        if (!addr) return;

        setLoading(true);
        setError('');
        setNotice('');
        setHasSearched(true);
        setTransactions([]);
        setPage(1);

        try {
            if (!chain.addressValidator(addr)) {
                throw new Error(
                    `That doesn't look like a ${chain.name} address. Expected ${
                        chain.kind === 'keeta'
                            ? 'keeta_…'
                            : chain.kind === 'svm'
                              ? 'a base58 Solana address'
                              : '0x followed by 40 hex characters'
                    }.`,
                );
            }

            let rows: DisplayTransaction[] = [];
            if (chain.kind === 'keeta') {
                setFeesKnown(true);
                rows = await getKeetaTransactions(addr);
            } else if (chain.kind === 'svm') {
                setFeesKnown(true);
                const history = await fetchSolanaTransactions(
                    chain,
                    resolveRpcs(chain, loadSettings()),
                    addr,
                );
                rows = history.transactions;
                if (history.truncated || history.failed > 0) {
                    setNotice(
                        [
                            history.truncated
                                ? 'Showing the most recent 200 transactions.'
                                : '',
                            history.failed > 0
                                ? `${history.failed} transaction${history.failed === 1 ? '' : 's'} could not be fetched and are missing.`
                                : '',
                        ]
                            .filter(Boolean)
                            .join(' '),
                    );
                }
            } else if (chain.id === 'megaeth') {
                setFeesKnown(true);
                rows = await fetchBlockscoutTransfers(chain, addr);
            } else {
                // alchemy_getAssetTransfers carries no fee data.
                setFeesKnown(false);
                rows = await fetchAlchemyTransfers(chain, addr, alchemyKey);
            }

            setTransactions(rows);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (transactions.length > 0) {
            resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [transactions]);

    // Only native-asset rows may be summed. Adding ETH to an arbitrary ERC-20
    // and labelling the result "ETH" produces a meaningless number.
    const nativeVolume = transactions
        .filter((tx) => tx.Asset === chain.nativeSymbol)
        .reduce((acc, tx) => acc + Math.abs(parseFloat(tx.Amount || '0')), 0);
    const otherAssetCount = new Set(
        transactions
            .filter((tx) => tx.Asset !== chain.nativeSymbol)
            .map((tx) => tx.Asset),
    ).size;

    const uniqueDays = new Set(
        transactions.map((tx) => new Date(tx.timestamp).toDateString()),
    ).size;

    const totalGas = transactions.reduce(
        (acc, tx) => acc + parseFloat(tx.Fee || '0'),
        0,
    );
    const pageCount = Math.ceil(transactions.length / ITEMS_PER_PAGE);

    const badgeClass = (tx: DisplayTransaction) => {
        const tag = tx.Tag?.toLowerCase();
        if (tag === 'swap')
            return 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30';
        if (tag === 'contract')
            return 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-500/20 dark:text-yellow-300 dark:border-yellow-500/30';
        if (tx.isIncoming)
            return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-500/20 dark:text-green-300 dark:border-green-500/30';
        return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/30';
    };

    return (
        <div className="min-h-screen flex flex-col font-sans" data-chain={chainId}>
            <Navbar>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="outline"
                            className="gap-2 bg-card border-border/50 cursor-pointer"
                        >
                            <ChainLogo chain={chain} size={20} />
                            {chain.name}
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        align="end"
                        className="w-56 bg-card border-border/50"
                    >
                        {chains.map((c) => (
                            <DropdownMenuItem
                                key={c.id}
                                onClick={() => selectChain(c.id)}
                                className={`gap-3 py-2.5 cursor-pointer ${
                                    chainId === c.id ? 'bg-accent' : ''
                                }`}
                            >
                                <ChainLogo chain={c} size={24} />
                                <span className="font-medium">{c.displayName}</span>
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </Navbar>

            <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 flex flex-col">
                <div className="mb-4">
                    <h1 className="text-2xl font-bold tracking-tight mb-1">
                        Tax Export
                    </h1>
                    <p className="text-sm text-muted-foreground mb-4">
                        Fetch a wallet&apos;s history and download it in tax CSV
                        format.
                    </p>

                    <form onSubmit={analyze} className="relative w-full">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <input
                            type="text"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder={`Search by ${chain.name} address…`}
                            className="w-full h-14 bg-card text-card-foreground pl-12 pr-32 rounded-lg border border-border/10 focus:outline-none focus:ring-1 focus:ring-primary shadow-sm text-base placeholder:text-muted-foreground/50 font-mono"
                        />
                        <div className="absolute inset-y-0 right-2 flex items-center">
                            <Button
                                type="submit"
                                disabled={loading}
                                className="h-10 px-6 font-medium cursor-pointer"
                            >
                                {loading ? 'Searching…' : 'Search'}
                            </Button>
                        </div>
                    </form>

                    {error && (
                        <div className="mt-3 p-4 rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
                            <div className="flex items-start gap-3">
                                <span className="text-2xl">🙈</span>
                                <p className="text-sm text-amber-800 dark:text-amber-100 font-medium">
                                    {error}
                                </p>
                            </div>
                        </div>
                    )}
                    {notice && (
                        <div className="mt-3 p-3 rounded-lg bg-muted/40 border border-border/20 text-xs text-muted-foreground">
                            {notice}
                        </div>
                    )}
                </div>

                <StatsGrid
                    transactionCount={transactions.length}
                    uniqueDays={uniqueDays}
                    totalVolume={`${formatAmount(nativeVolume)} ${chain.nativeSymbol}`}
                    volumeNote={
                        otherAssetCount > 0
                            ? `native only · ${otherAssetCount} other asset${otherAssetCount === 1 ? '' : 's'} not summed`
                            : undefined
                    }
                    gasSpent={
                        feesKnown
                            ? `${totalGas.toFixed(6)} ${chain.nativeSymbol}`
                            : 'Not reported'
                    }
                    gasNote={
                        feesKnown
                            ? totalGas === 0 && transactions.length > 0
                                ? 'no fees paid by this address'
                                : undefined
                            : 'this source returns no fee data'
                    }
                    dailyActivity={transactions}
                    className="mb-2"
                />

                {hasSearched && transactions.length > 0 && (
                    <div ref={resultsRef} className="mt-8 scroll-mt-24">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold">Transactions</h3>
                            <Button
                                onClick={() => downloadCSV(transactions)}
                                size="sm"
                                className="cursor-pointer"
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Download CSV
                            </Button>
                        </div>

                        <Card className="overflow-hidden border-0 bg-card text-card-foreground">
                            <div className="max-h-[500px] overflow-y-auto px-4">
                                <table className="w-full text-sm">
                                    <thead className="sticky top-0 z-10 bg-card">
                                        <tr className="border-b border-border/10 text-muted-foreground">
                                            <th className="h-10 px-2 text-left font-medium">
                                                Txn Hash
                                            </th>
                                            <th className="h-10 px-2 text-left font-medium">
                                                Type
                                            </th>
                                            <th className="h-10 px-2 text-left font-medium">
                                                Block
                                            </th>
                                            <th className="h-10 px-2 text-left font-medium">
                                                Date
                                            </th>
                                            <th className="h-10 px-2 text-left font-medium">
                                                From
                                            </th>
                                            <th className="h-10 px-2 text-left font-medium">
                                                To
                                            </th>
                                            <th className="h-10 px-2 text-right font-medium">
                                                Value
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {transactions
                                            .slice(
                                                (page - 1) * ITEMS_PER_PAGE,
                                                page * ITEMS_PER_PAGE,
                                            )
                                            .map((tx, i) => (
                                                <tr
                                                    key={`${tx['Transaction Hash']}-${i}`}
                                                    className="border-b border-border/10 hover:bg-muted/10 transition-colors"
                                                >
                                                    <td className="p-2 font-mono text-primary truncate max-w-[120px]">
                                                        {tx['Transaction Hash']}
                                                    </td>
                                                    <td className="p-2">
                                                        <span
                                                            className={`px-2 py-1 rounded text-xs font-mono border ${badgeClass(tx)}`}
                                                        >
                                                            {tx.method || tx.Tag}
                                                        </span>
                                                    </td>
                                                    <td className="p-2 text-muted-foreground">
                                                        {tx.block || '-'}
                                                    </td>
                                                    <td className="p-2 text-muted-foreground whitespace-nowrap">
                                                        {tx.timestamp
                                                            ? new Date(
                                                                  tx.timestamp,
                                                              ).toLocaleString()
                                                            : '-'}
                                                    </td>
                                                    <td className="p-2 font-mono text-muted-foreground truncate max-w-[120px]">
                                                        {tx.from || '-'}
                                                    </td>
                                                    <td className="p-2 font-mono text-muted-foreground truncate max-w-[120px]">
                                                        {tx.to || '-'}
                                                    </td>
                                                    <td className="p-2 text-right font-medium whitespace-nowrap">
                                                        {tx.value || tx.Amount}{' '}
                                                        {tx.Asset}
                                                    </td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>

                        {pageCount > 1 && (
                            <div className="flex items-center justify-center gap-2 mt-4">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(1)}
                                    disabled={page === 1}
                                >
                                    ««
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                >
                                    ‹
                                </Button>
                                <span className="text-sm text-muted-foreground px-2">
                                    Page {page} of {pageCount}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                        setPage((p) => Math.min(pageCount, p + 1))
                                    }
                                    disabled={page === pageCount}
                                >
                                    ›
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(pageCount)}
                                    disabled={page === pageCount}
                                >
                                    »»
                                </Button>
                            </div>
                        )}
                    </div>
                )}

                {hasSearched && !loading && transactions.length === 0 && !error && (
                    <Card className="mt-8 p-12 text-center border-dashed bg-card border-border/20">
                        <div className="flex flex-col items-center gap-4 text-muted-foreground">
                            <Layers className="w-12 h-12 opacity-20" />
                            <h3 className="text-lg font-medium">
                                No transactions found
                            </h3>
                            <p className="text-sm">
                                This wallet has no history on {chain.name}.
                            </p>
                        </div>
                    </Card>
                )}

                <Footer />
            </main>
        </div>
    );
}
