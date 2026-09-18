// Persisted user settings: wallets, RPC endpoints, API key, cached snapshots.
// Everything lives in localStorage — no backend, nothing leaves the browser
// except calls to the providers the endpoints belong to.

import { ChainKind, detectKind } from './chains';

const STORAGE_KEY = 'openport';
/** Previous name. Read once so an existing install keeps its wallets and key. */
const LEGACY_STORAGE_KEY = 'bunny-portfolio';
export const SETTINGS_VERSION = 1;

export interface Wallet {
    id: string;
    name: string;
    address: string;
    kind: ChainKind;
    /** Free-form grouping, e.g. "Hardware". Empty means uncategorised. */
    category?: string;
}

/** Offered in the picker; any other value typed by the user is kept as-is. */
export const WALLET_CATEGORIES = [
    'Hot wallet',
    'Hardware wallet',
    'Cold storage',
    'Exchange',
    'DeFi',
    'Testing',
] as const;

export interface Snapshot {
    /** Unix ms. */
    t: number;
    usd: number;
}

/**
 * Last fetched portfolio, so reopening the app costs no RPC calls.
 * `amount` is a decimal string because bigint has no JSON representation.
 */
export interface CachedPortfolio {
    fetchedAt: number;
    mode: 'alchemy' | 'public';
    balances: {
        chainId: string;
        walletId: string;
        symbol: string;
        decimals: number;
        amount: string;
        coingeckoId?: string;
    }[];
    spot: Record<string, number>;
    images: Record<string, string>;
    chainStatus: { chainId: string; state: string; message?: string }[];
}

export interface Settings {
    version: number;
    alchemyKey: string;
    wallets: Wallet[];
    /** chain id -> ordered custom endpoints, tried after the public ones. */
    rpcs: Record<string, string[]>;
    snapshots: Snapshot[];
    cache?: CachedPortfolio;
}

export const emptySettings = (): Settings => ({
    version: SETTINGS_VERSION,
    alchemyKey: '',
    wallets: [],
    rpcs: {},
    snapshots: [],
});

/** Coerce unknown parsed JSON into a valid Settings, dropping bad entries. */
function migrate(raw: unknown): Settings {
    const base = emptySettings();
    if (!raw || typeof raw !== 'object') return base;
    const o = raw as Partial<Settings>;

    const wallets = Array.isArray(o.wallets)
        ? o.wallets.filter(
              (w): w is Wallet =>
                  !!w &&
                  typeof w.id === 'string' &&
                  typeof w.name === 'string' &&
                  typeof w.address === 'string' &&
                  (w.kind === 'evm' || w.kind === 'svm' || w.kind === 'keeta'),
          )
        : [];

    const rpcs: Record<string, string[]> = {};
    if (o.rpcs && typeof o.rpcs === 'object') {
        for (const [k, v] of Object.entries(o.rpcs)) {
            if (Array.isArray(v)) {
                rpcs[k] = v.filter((u) => typeof u === 'string' && u.trim() !== '');
            }
        }
    }

    const snapshots = Array.isArray(o.snapshots)
        ? o.snapshots.filter(
              (s): s is Snapshot =>
                  !!s && typeof s.t === 'number' && typeof s.usd === 'number',
          )
        : [];

    const cache =
        o.cache &&
        typeof o.cache === 'object' &&
        Array.isArray((o.cache as CachedPortfolio).balances)
            ? (o.cache as CachedPortfolio)
            : undefined;

    return {
        version: SETTINGS_VERSION,
        alchemyKey: typeof o.alchemyKey === 'string' ? o.alchemyKey : '',
        wallets,
        rpcs,
        snapshots,
        cache,
    };
}

export function loadSettings(): Settings {
    if (typeof window === 'undefined') return emptySettings();
    try {
        const raw =
            window.localStorage.getItem(STORAGE_KEY) ??
            window.localStorage.getItem(LEGACY_STORAGE_KEY);
        if (!raw) return emptySettings();
        const parsed = migrate(JSON.parse(raw));
        if (!window.localStorage.getItem(STORAGE_KEY)) {
            // Carry the old install forward, then leave the legacy copy alone.
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        }
        return parsed;
    } catch {
        // Corrupt storage must never brick the app.
        return emptySettings();
    }
}

export function saveSettings(s: Settings): void {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch (e) {
        console.error('Failed to persist settings', e);
    }
}

export function addWallet(
    s: Settings,
    name: string,
    address: string,
): { settings: Settings; error?: string } {
    const addr = address.trim();
    const kind = detectKind(addr);
    if (!kind) {
        return {
            settings: s,
            error: 'Unrecognised address. Expected 0x… (EVM), a base58 Solana address, or keeta_…',
        };
    }
    if (s.wallets.some((w) => w.address.toLowerCase() === addr.toLowerCase())) {
        return { settings: s, error: 'That address is already saved.' };
    }
    const wallet: Wallet = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: name.trim() || `Wallet ${s.wallets.length + 1}`,
        address: addr,
        kind,
    };
    return {
        settings: { ...s, wallets: [...s.wallets, wallet], cache: undefined },
    };
}

export const removeWallet = (s: Settings, id: string): Settings => ({
    ...s,
    wallets: s.wallets.filter((w) => w.id !== id),
    // Cached totals included this wallet; they are wrong the moment it goes.
    cache: undefined,
});

export const renameWallet = (s: Settings, id: string, name: string): Settings => ({
    ...s,
    wallets: s.wallets.map((w) => (w.id === id ? { ...w, name } : w)),
});

export const setWalletCategory = (
    s: Settings,
    id: string,
    category: string,
): Settings => ({
    ...s,
    wallets: s.wallets.map((w) =>
        w.id === id ? { ...w, category: category || undefined } : w,
    ),
});

/** Categories actually in use, in the order the picker offers them. */
export function usedCategories(wallets: Wallet[]): string[] {
    const used = new Set(
        wallets.map((w) => w.category).filter((c): c is string => !!c),
    );
    const known = WALLET_CATEGORIES.filter((c) => used.has(c));
    const custom = [...used].filter(
        (c) => !WALLET_CATEGORIES.includes(c as (typeof WALLET_CATEGORIES)[number]),
    );
    return [...known, ...custom.sort()];
}

export const addRpc = (s: Settings, chainId: string, url: string): Settings => {
    const u = url.trim();
    if (!u) return s;
    const existing = s.rpcs[chainId] ?? [];
    if (existing.includes(u)) return s;
    return { ...s, rpcs: { ...s.rpcs, [chainId]: [...existing, u] } };
};

export const removeRpc = (s: Settings, chainId: string, url: string): Settings => ({
    ...s,
    rpcs: { ...s.rpcs, [chainId]: (s.rpcs[chainId] ?? []).filter((u) => u !== url) },
});

export function moveRpc(
    s: Settings,
    chainId: string,
    from: number,
    to: number,
): Settings {
    const list = [...(s.rpcs[chainId] ?? [])];
    if (from < 0 || to < 0 || from >= list.length || to >= list.length) return s;
    const [item] = list.splice(from, 1);
    list.splice(to, 0, item);
    return { ...s, rpcs: { ...s.rpcs, [chainId]: list } };
}

/** Keep at most one snapshot per hour, and only the last ~2 years. */
export function appendSnapshot(s: Settings, usd: number): Settings {
    const now = Date.now();
    const hour = 60 * 60 * 1000;
    const recent = s.snapshots.filter((x) => now - x.t < 730 * 24 * hour);
    const last = recent[recent.length - 1];
    if (last && now - last.t < hour) {
        return { ...s, snapshots: [...recent.slice(0, -1), { t: now, usd }] };
    }
    return { ...s, snapshots: [...recent, { t: now, usd }] };
}

export function exportSettings(s: Settings): void {
    const blob = new Blob([JSON.stringify(s, null, 2)], {
        type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `openport-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

export async function importSettings(file: File): Promise<Settings> {
    const text = await file.text();
    return migrate(JSON.parse(text));
}
