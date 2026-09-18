'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/Navbar';
import { ChainFilter } from '@/components/ChainFilter';
import { ChainLogo } from '@/components/ChainLogo';
import { PortfolioChart } from '@/components/PortfolioChart';
import { getSupportedChains, CHAINS } from '@/lib/chains';
import {
    loadSettings,
    saveSettings,
    appendSnapshot,
    Settings,
} from '@/lib/settings';
import {
    loadPortfolio,
    buildChart,
    aggregate,
    PortfolioResult,
    ChartPoint,
} from '@/lib/portfolio';
import { AlertTriangle, ChevronDown, RefreshCw, Wallet as WalletIcon } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TokenLogo } from '@/components/TokenLogo';
import { WalletAvatar } from '@/components/WalletAvatar';

const money = (n: number) =>
    n.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 2,
    });

const qty = (n: number) =>
    n.toLocaleString('en-US', {
        maximumFractionDigits: n >= 1 ? 4 : 8,
    });

const shorten = (a: string) =>
    a.length <= 16 ? a : `${a.slice(0, 6)}…${a.slice(-4)}`;

const ago = (t: number) => {
    const m = Math.floor((Date.now() - t) / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
};

export default function PortfolioPage() {
    const [settings, setSettings] = useState<Settings | null>(null);
    const [data, setData] = useState<PortfolioResult | null>(null);
    const [chart, setChart] = useState<ChartPoint[]>([]);
    const [loading, setLoading] = useState(false);
    const [chartLoading, setChartLoading] = useState(false);
    const [error, setError] = useState('');
    const [selected, setSelected] = useState<string[]>([]);
    /** null = every wallet combined. */
    const [walletId, setWalletId] = useState<string | null>(null);

    useEffect(() => {
        setSettings(loadSettings());
    }, []);

    const refresh = useCallback(
        async (s: Settings) => {
            if (s.wallets.length === 0) {
                setData(null);
                setChart([]);
                return;
            }
            setLoading(true);
            setError('');
            try {
                const result = await loadPortfolio(s);
                setData(result);

                // Record a real snapshot of the true total.
                if (result.totalUsd > 0 && !result.incomplete) {
                    const next = appendSnapshot(s, result.totalUsd);
                    saveSettings(next);
                    setSettings(next);
                }

                // The chart is rebuilt by the filter effect, which knows the
                // active wallet/chain scope.
            } catch (e) {
                setError(e instanceof Error ? e.message : 'Failed to load portfolio');
            } finally {
                setLoading(false);
            }
        },
        [],
    );

    // Load once settings are available.
    useEffect(() => {
        if (settings && !data && settings.wallets.length > 0) {
            void refresh(settings);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [settings?.wallets.length]);

    const toggleChain = (id: string) =>
        setSelected((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
        );

    // Re-aggregate locally when a chain or wallet filter is active — no refetch.
    const view = useMemo(() => {
        if (!data || !settings) return null;
        const noChainFilter = selected.length === 0;
        const noWalletFilter = walletId === null;
        if (noChainFilter && noWalletFilter) {
            return {
                assets: data.assets,
                wallets: data.wallets,
                totalUsd: data.totalUsd,
            };
        }
        const filtered = data.balances.filter(
            (b) =>
                (noChainFilter || selected.includes(b.chainId)) &&
                (noWalletFilter || b.walletId === walletId),
        );
        const scope = noWalletFilter
            ? settings.wallets
            : settings.wallets.filter((w) => w.id === walletId);
        return aggregate(filtered, data.spot, scope, data.images);
    }, [data, settings, selected, walletId]);

    const activeWallet =
        settings?.wallets.find((w) => w.id === walletId) ?? null;

    // A wallet chart needs that wallet's own holdings, not the whole portfolio.
    useEffect(() => {
        if (!view) return;
        let cancelled = false;
        setChartLoading(true);
        buildChart(view.assets)
            .then((pts) => !cancelled && setChart(pts))
            .catch(() => !cancelled && setChart([]))
            .finally(() => !cancelled && setChartLoading(false));
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [walletId, selected.join(','), data?.fetchedAt]);

    const chains = getSupportedChains();
    const problems = data?.chainStatus.filter((c) => c.state !== 'ok') ?? [];
    const hasWallets = (settings?.wallets.length ?? 0) > 0;

    return (
        <div className="min-h-screen flex flex-col font-sans">
            <Navbar />

            <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 flex flex-col gap-6">
                {!hasWallets ? (
                    <Card className="p-12 text-center border-dashed bg-card border-border/20 mt-8">
                        <div className="flex flex-col items-center gap-4 text-muted-foreground">
                            <WalletIcon className="w-12 h-12 opacity-20" />
                            <h2 className="text-lg font-medium text-foreground">
                                No wallets yet
                            </h2>
                            <p className="text-sm max-w-md">
                                Add an Ethereum, Base, Robinhood Chain or Solana address
                                and give it a name. Everything is stored in your browser.
                            </p>
                            <Link href="/settings">
                                <Button className="mt-2">Add a wallet</Button>
                            </Link>
                        </div>
                    </Card>
                ) : (
                    <>
                        {/* Header: total + refresh */}
                        <div className="flex items-end justify-between flex-wrap gap-4">
                            <div>
                                <div className="text-sm text-muted-foreground font-medium">
                                    {activeWallet ? activeWallet.name : 'Total value'}
                                    {selected.length > 0 && ' · filtered'}
                                </div>
                                <div className="text-4xl font-bold tracking-tight mt-1">
                                    {loading && !view
                                        ? '—'
                                        : money(view?.totalUsd ?? 0)}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                    {data ? (
                                        <>
                                            updated {ago(data.fetchedAt)} ·{' '}
                                            {data.mode === 'alchemy'
                                                ? 'Alchemy key — full token discovery'
                                                : 'public RPC — major tokens only'}
                                        </>
                                    ) : (
                                        'not loaded'
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className="gap-2 cursor-pointer max-w-[220px]"
                                        >
                                            {activeWallet ? (
                                                <>
                                                    <WalletAvatar
                                                        address={activeWallet.address}
                                                        size={18}
                                                    />
                                                    <span className="truncate">
                                                        {activeWallet.name}
                                                    </span>
                                                </>
                                            ) : (
                                                <>
                                                    <WalletIcon className="w-4 h-4" />
                                                    All wallets
                                                </>
                                            )}
                                            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                        align="end"
                                        className="w-64 bg-card border-border/50"
                                    >
                                        <DropdownMenuItem
                                            onClick={() => setWalletId(null)}
                                            className={`gap-3 py-2.5 cursor-pointer ${
                                                walletId === null ? 'bg-accent' : ''
                                            }`}
                                        >
                                            <WalletIcon className="w-4 h-4" />
                                            <span className="font-medium flex-1">
                                                All wallets
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                {money(data?.totalUsd ?? 0)}
                                            </span>
                                        </DropdownMenuItem>
                                        {(data?.wallets ?? []).map((w) => (
                                            <DropdownMenuItem
                                                key={w.wallet.id}
                                                onClick={() => setWalletId(w.wallet.id)}
                                                className={`gap-3 py-2.5 cursor-pointer ${
                                                    walletId === w.wallet.id
                                                        ? 'bg-accent'
                                                        : ''
                                                }`}
                                            >
                                                <WalletAvatar
                                                    address={w.wallet.address}
                                                    size={22}
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium truncate">
                                                        {w.wallet.name}
                                                    </div>
                                                    <div className="text-[10px] font-mono text-muted-foreground truncate">
                                                        {shorten(w.wallet.address)}
                                                    </div>
                                                </div>
                                                <span className="text-xs text-muted-foreground">
                                                    {money(w.usd)}
                                                </span>
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                <Button
                                    onClick={() => settings && refresh(settings)}
                                    disabled={loading}
                                    variant="outline"
                                    className="gap-2 cursor-pointer"
                                >
                                    <RefreshCw
                                        className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
                                    />
                                    {loading ? 'Refreshing…' : 'Refresh'}
                                </Button>
                            </div>
                        </div>

                        <ChainFilter
                            chains={chains}
                            selected={selected}
                            onToggle={toggleChain}
                            onClear={() => setSelected([])}
                            status={data?.chainStatus}
                        />

                        {error && (
                            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-700 dark:text-red-300">
                                {error}
                            </div>
                        )}

                        {problems.length > 0 && (
                            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                <div className="flex items-start gap-3">
                                    <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                                    <div className="text-sm text-amber-800 dark:text-amber-200 space-y-1">
                                        {data?.incomplete && (
                                            <p className="font-medium">
                                                This total is incomplete — some chains
                                                could not be read.
                                            </p>
                                        )}
                                        {problems.map((p) => (
                                            <p key={p.chainId}>
                                                <span className="font-medium">
                                                    {CHAINS[p.chainId]?.name ?? p.chainId}:
                                                </span>{' '}
                                                {p.message}
                                            </p>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        <PortfolioChart
                            points={chart}
                            snapshots={settings?.snapshots}
                            loading={chartLoading}
                        />

                        {/* Assets */}
                        <Card className="border-0 bg-card text-card-foreground overflow-hidden">
                            <div className="px-6 pt-5 pb-3">
                                <h2 className="font-bold">Assets</h2>
                            </div>
                            <div className="px-4 pb-2 overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-border/10 text-muted-foreground">
                                            <th className="h-10 px-2 text-left font-medium">
                                                Asset
                                            </th>
                                            <th className="h-10 px-2 text-right font-medium">
                                                Quantity
                                            </th>
                                            <th className="h-10 px-2 text-right font-medium">
                                                Value
                                            </th>
                                            <th className="h-10 px-2 text-right font-medium">
                                                Weight
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(view?.assets ?? []).map((a) => (
                                            <tr
                                                key={a.symbol}
                                                className="border-b border-border/10 hover:bg-muted/10 transition-colors"
                                            >
                                                <td className="p-2 font-medium">
                                                    <div className="flex items-center gap-2">
                                                        <TokenLogo
                                                            symbol={a.symbol}
                                                            src={a.icon}
                                                            size={22}
                                                        />
                                                        {a.symbol}
                                                    </div>
                                                </td>
                                                <td className="p-2 text-right font-mono">
                                                    {qty(a.quantity)}
                                                </td>
                                                <td className="p-2 text-right font-medium">
                                                    {a.priced ? (
                                                        money(a.usd)
                                                    ) : (
                                                        <span className="text-muted-foreground text-xs">
                                                            price unavailable
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-2 text-right text-muted-foreground">
                                                    {a.priced
                                                        ? `${a.weight.toFixed(1)}%`
                                                        : '—'}
                                                </td>
                                            </tr>
                                        ))}
                                        {(view?.assets.length ?? 0) === 0 && !loading && (
                                            <tr>
                                                <td
                                                    colSpan={4}
                                                    className="p-6 text-center text-muted-foreground"
                                                >
                                                    No balances found.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </Card>

                        {/* Wallets */}
                        <Card className="border-0 bg-card text-card-foreground overflow-hidden">
                            <div className="px-6 pt-5 pb-3 flex items-center justify-between">
                                <h2 className="font-bold">Wallets</h2>
                                <Link
                                    href="/settings"
                                    className="text-xs text-primary hover:underline"
                                >
                                    Manage
                                </Link>
                            </div>
                            <div className="px-4 pb-2 overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-border/10 text-muted-foreground">
                                            <th className="h-10 px-2 text-left font-medium">
                                                Name
                                            </th>
                                            <th className="h-10 px-2 text-left font-medium">
                                                Address
                                            </th>
                                            <th className="h-10 px-2 text-left font-medium">
                                                Chains
                                            </th>
                                            <th className="h-10 px-2 text-right font-medium">
                                                Value
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(view?.wallets ?? []).map((w) => (
                                            <tr
                                                key={w.wallet.id}
                                                className="border-b border-border/10 hover:bg-muted/10 transition-colors"
                                            >
                                                <td className="p-2 font-medium">
                                                    <div className="flex items-center gap-2">
                                                        <WalletAvatar
                                                            address={w.wallet.address}
                                                            size={24}
                                                        />
                                                        {w.wallet.name}
                                                    </div>
                                                </td>
                                                <td className="p-2 font-mono text-muted-foreground">
                                                    {shorten(w.wallet.address)}
                                                </td>
                                                <td className="p-2">
                                                    <div className="flex gap-1 flex-wrap">
                                                        {w.chains.map((c) =>
                                                            CHAINS[c] ? (
                                                                <span
                                                                    key={c}
                                                                    className="inline-flex items-center gap-1 pl-1 pr-2 py-0.5 rounded-full text-[10px] font-medium bg-muted/50"
                                                                >
                                                                    <ChainLogo
                                                                        chain={CHAINS[c]}
                                                                        size={14}
                                                                    />
                                                                    {CHAINS[c].name}
                                                                </span>
                                                            ) : (
                                                                <span
                                                                    key={c}
                                                                    className="px-1.5 py-0.5 rounded text-[10px]"
                                                                >
                                                                    {c}
                                                                </span>
                                                            ),
                                                        )}
                                                        {w.chains.length === 0 && (
                                                            <span className="text-muted-foreground text-xs">
                                                                —
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-2 text-right font-medium">
                                                    {money(w.usd)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </>
                )}

                <div className="flex-1" />

                <footer className="mt-8 py-6 border-t border-border/10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-3">
                        <img
                            src="/EHLLOGO.png"
                            alt="EventHorizon Labs"
                            className="h-8 w-auto"
                        />
                        <a
                            href="https://ehlabs.xyz"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-primary hover:underline"
                        >
                            Built by EventHorizon Labs
                        </a>
                    </div>
                    <a
                        href="https://github.com/ivaavimusic/Awaken-Wallet-Analyser"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-foreground transition-colors"
                    >
                        Open Source
                    </a>
                </footer>
            </main>
        </div>
    );
}
