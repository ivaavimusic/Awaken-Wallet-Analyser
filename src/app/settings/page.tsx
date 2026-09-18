'use client';

import { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Navbar } from '@/components/Navbar';
import { ChainLogo } from '@/components/ChainLogo';
import { getSupportedChains, alchemyRpcUrl } from '@/lib/chains';
import { resolveRpcs } from '@/lib/rpc';
import {
    loadSettings,
    saveSettings,
    addWallet,
    removeWallet,
    renameWallet,
    addRpc,
    removeRpc,
    moveRpc,
    exportSettings,
    importSettings,
    emptySettings,
    Settings,
} from '@/lib/settings';
import {
    ArrowDown,
    ArrowUp,
    Download,
    Eye,
    EyeOff,
    Plus,
    Trash2,
    Upload,
    Info,
} from 'lucide-react';

export default function SettingsPage() {
    const [settings, setSettings] = useState<Settings>(emptySettings());
    const [ready, setReady] = useState(false);
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [walletError, setWalletError] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [rpcDrafts, setRpcDrafts] = useState<Record<string, string>>({});
    const [saved, setSaved] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setSettings(loadSettings());
        setReady(true);
    }, []);

    /** Persist immediately — settings are small and edits are deliberate. */
    const commit = (next: Settings) => {
        setSettings(next);
        saveSettings(next);
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
    };

    const handleAddWallet = (e: React.FormEvent) => {
        e.preventDefault();
        const { settings: next, error } = addWallet(settings, name, address);
        if (error) {
            setWalletError(error);
            return;
        }
        setWalletError('');
        setName('');
        setAddress('');
        commit(next);
    };

    const chains = getSupportedChains();

    if (!ready) {
        return (
            <div className="min-h-screen flex flex-col font-sans">
                <Navbar />
                <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-8">
                    <p className="text-muted-foreground text-sm">Loading…</p>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col font-sans">
            <Navbar>
                {saved && (
                    <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                        Saved
                    </span>
                )}
            </Navbar>

            <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-8 flex flex-col gap-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Stored in this browser only. Nothing is sent anywhere except the
                        endpoints below.
                    </p>
                </div>

                {/* Wallets */}
                <Card className="p-6 border-0 bg-card text-card-foreground">
                    <h2 className="font-bold mb-1">Wallets</h2>
                    <p className="text-xs text-muted-foreground mb-4">
                        Addresses only — never a private key or seed phrase. The network
                        is detected automatically.
                    </p>

                    <form
                        onSubmit={handleAddWallet}
                        className="flex flex-col sm:flex-row gap-2 mb-4"
                    >
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Name (e.g. Main)"
                            className="sm:w-48"
                        />
                        <Input
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder="0x… , base58 Solana address, or keeta_…"
                            className="flex-1 font-mono text-sm"
                        />
                        <Button type="submit" className="gap-2 cursor-pointer">
                            <Plus className="w-4 h-4" />
                            Add
                        </Button>
                    </form>

                    {walletError && (
                        <p className="text-sm text-red-600 dark:text-red-400 mb-3">
                            {walletError}
                        </p>
                    )}

                    {settings.wallets.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border/30 rounded-lg">
                            No wallets saved yet.
                        </p>
                    ) : (
                        <div className="divide-y divide-border/10">
                            {settings.wallets.map((w) => (
                                <div
                                    key={w.id}
                                    className="flex items-center gap-3 py-3"
                                >
                                    <input
                                        value={w.name}
                                        onChange={(e) =>
                                            commit(
                                                renameWallet(
                                                    settings,
                                                    w.id,
                                                    e.target.value,
                                                ),
                                            )
                                        }
                                        className="w-36 bg-transparent font-medium text-sm focus:outline-none focus:ring-1 focus:ring-primary rounded px-1 py-0.5"
                                    />
                                    <span className="flex-1 font-mono text-xs text-muted-foreground truncate">
                                        {w.address}
                                    </span>
                                    <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded bg-muted text-muted-foreground">
                                        {w.kind === 'evm'
                                            ? 'EVM'
                                            : w.kind === 'svm'
                                              ? 'Solana'
                                              : 'Keeta'}
                                    </span>
                                    <button
                                        onClick={() =>
                                            commit(removeWallet(settings, w.id))
                                        }
                                        className="text-muted-foreground hover:text-red-500 transition-colors cursor-pointer"
                                        aria-label={`Remove ${w.name}`}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>

                {/* Alchemy key */}
                <Card className="p-6 border-0 bg-card text-card-foreground">
                    <h2 className="font-bold mb-1">Alchemy API key</h2>
                    <p className="text-xs text-muted-foreground mb-4">
                        Optional. With a key the app discovers every token you hold and
                        uses one multi-chain request. Without one it falls back to public
                        endpoints and a list of major tokens.
                    </p>
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Input
                                type={showKey ? 'text' : 'password'}
                                value={settings.alchemyKey}
                                onChange={(e) =>
                                    commit({
                                        ...settings,
                                        alchemyKey: e.target.value.trim(),
                                    })
                                }
                                placeholder="Paste your Alchemy key"
                                className="font-mono text-sm pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowKey((v) => !v)}
                                className="absolute inset-y-0 right-3 flex items-center text-muted-foreground cursor-pointer"
                                aria-label={showKey ? 'Hide key' : 'Show key'}
                            >
                                {showKey ? (
                                    <EyeOff className="w-4 h-4" />
                                ) : (
                                    <Eye className="w-4 h-4" />
                                )}
                            </button>
                        </div>
                    </div>
                    <div className="flex items-start gap-2 mt-3 text-[11px] text-muted-foreground">
                        <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <p>
                            The key is kept in this browser&apos;s localStorage, which any
                            script running on this page can read. That is normally fine
                            for a personal tool on your own machine — just don&apos;t
                            paste a key with billing scope you care about.
                        </p>
                    </div>
                </Card>

                {/* RPC endpoints */}
                <Card className="p-6 border-0 bg-card text-card-foreground">
                    <h2 className="font-bold mb-1">RPC endpoints</h2>
                    <p className="text-xs text-muted-foreground mb-4">
                        Tried top to bottom until one answers. Your own endpoints come
                        first, then Alchemy, then public fallbacks.
                    </p>

                    <div className="space-y-5">
                        {chains.map((chain) => {
                            const custom = settings.rpcs[chain.id] ?? [];
                            const alchemy = alchemyRpcUrl(chain, settings.alchemyKey);
                            const effective = resolveRpcs(chain, settings);
                            const draft = rpcDrafts[chain.id] ?? '';

                            return (
                                <div key={chain.id}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <ChainLogo chain={chain} size={20} />
                                        <span className="font-medium text-sm">
                                            {chain.name}
                                        </span>
                                        {effective.length === 0 && (
                                            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 font-medium">
                                                no endpoint
                                            </span>
                                        )}
                                    </div>

                                    <div className="space-y-1 mb-2">
                                        {custom.map((url, i) => (
                                            <div
                                                key={url}
                                                className="flex items-center gap-2 text-xs font-mono bg-muted/30 rounded px-2 py-1.5"
                                            >
                                                <span className="flex-1 truncate">
                                                    {url}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground shrink-0">
                                                    yours
                                                </span>
                                                <button
                                                    onClick={() =>
                                                        commit(
                                                            moveRpc(
                                                                settings,
                                                                chain.id,
                                                                i,
                                                                i - 1,
                                                            ),
                                                        )
                                                    }
                                                    disabled={i === 0}
                                                    className="disabled:opacity-20 cursor-pointer"
                                                    aria-label="Move up"
                                                >
                                                    <ArrowUp className="w-3 h-3" />
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        commit(
                                                            moveRpc(
                                                                settings,
                                                                chain.id,
                                                                i,
                                                                i + 1,
                                                            ),
                                                        )
                                                    }
                                                    disabled={i === custom.length - 1}
                                                    className="disabled:opacity-20 cursor-pointer"
                                                    aria-label="Move down"
                                                >
                                                    <ArrowDown className="w-3 h-3" />
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        commit(
                                                            removeRpc(
                                                                settings,
                                                                chain.id,
                                                                url,
                                                            ),
                                                        )
                                                    }
                                                    className="text-muted-foreground hover:text-red-500 cursor-pointer"
                                                    aria-label="Remove endpoint"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}

                                        {alchemy && (
                                            <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground px-2 py-1.5">
                                                <span className="flex-1 truncate">
                                                    {`https://${chain.alchemySlug}.g.alchemy.com/v2/••••`}
                                                </span>
                                                <span className="text-[10px] shrink-0">
                                                    Alchemy
                                                </span>
                                            </div>
                                        )}

                                        {chain.publicRpcs.map((url) => (
                                            <div
                                                key={url}
                                                className="flex items-center gap-2 text-xs font-mono text-muted-foreground px-2 py-1.5"
                                            >
                                                <span className="flex-1 truncate">
                                                    {url}
                                                </span>
                                                <span className="text-[10px] shrink-0">
                                                    public
                                                </span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex gap-2">
                                        <Input
                                            value={draft}
                                            onChange={(e) =>
                                                setRpcDrafts((d) => ({
                                                    ...d,
                                                    [chain.id]: e.target.value,
                                                }))
                                            }
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && draft.trim()) {
                                                    commit(
                                                        addRpc(
                                                            settings,
                                                            chain.id,
                                                            draft,
                                                        ),
                                                    );
                                                    setRpcDrafts((d) => ({
                                                        ...d,
                                                        [chain.id]: '',
                                                    }));
                                                }
                                            }}
                                            placeholder={`Add a fallback RPC for ${chain.name}`}
                                            className="h-8 text-xs font-mono"
                                        />
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-8 cursor-pointer"
                                            onClick={() => {
                                                if (!draft.trim()) return;
                                                commit(
                                                    addRpc(settings, chain.id, draft),
                                                );
                                                setRpcDrafts((d) => ({
                                                    ...d,
                                                    [chain.id]: '',
                                                }));
                                            }}
                                        >
                                            <Plus className="w-3 h-3" />
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Card>

                {/* Backup */}
                <Card className="p-6 border-0 bg-card text-card-foreground">
                    <h2 className="font-bold mb-1">Backup</h2>
                    <p className="text-xs text-muted-foreground mb-4">
                        Settings live in this browser. Export to move them to another
                        machine.
                    </p>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            className="gap-2 cursor-pointer"
                            onClick={() => exportSettings(settings)}
                        >
                            <Download className="w-4 h-4" />
                            Export JSON
                        </Button>
                        <Button
                            variant="outline"
                            className="gap-2 cursor-pointer"
                            onClick={() => fileRef.current?.click()}
                        >
                            <Upload className="w-4 h-4" />
                            Import JSON
                        </Button>
                        <input
                            ref={fileRef}
                            type="file"
                            accept="application/json"
                            className="hidden"
                            onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                try {
                                    commit(await importSettings(file));
                                } catch {
                                    setWalletError('That file could not be read.');
                                }
                                e.target.value = '';
                            }}
                        />
                    </div>
                </Card>
            </main>
        </div>
    );
}
