// Solana token metadata and prices, resolved by mint address.
//
// CoinGecko only knows tokens it has listed, and only by its own id, so any
// SPL token outside a hardcoded list showed up as a truncated mint with no
// price — including brand new or small-cap tokens. Jupiter resolves by mint
// and prices anything with real liquidity, which is the right authority for
// Solana. Both endpoints are public, keyless and CORS-enabled, and both accept
// a comma-separated list, so this costs two requests no matter how many tokens
// a wallet holds.

const PRICE_URL = 'https://lite-api.jup.ag/price/v3';
const TOKEN_URL = 'https://lite-api.jup.ag/tokens/v2/search';

const META_TTL_MS = 7 * 24 * 60 * 60 * 1000; // symbols rarely change
const PRICE_TTL_MS = 5 * 60 * 1000;

export interface JupToken {
    symbol: string;
    name: string;
    icon?: string;
    decimals: number;
}

interface Cached<T> {
    at: number;
    data: T;
}

function readCache<T>(key: string, ttl: number): T | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = window.localStorage.getItem(key);
        if (!raw) return null;
        const c = JSON.parse(raw) as Cached<T>;
        if (Date.now() - c.at > ttl) return null;
        return c.data;
    } catch {
        return null;
    }
}

function writeCache<T>(key: string, data: T): void {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(key, JSON.stringify({ at: Date.now(), data }));
    } catch {
        /* quota is not fatal */
    }
}

/** Symbol, name and icon for each mint. Unknown mints are simply absent. */
export async function fetchJupiterTokens(
    mints: string[],
): Promise<Record<string, JupToken>> {
    const unique = Array.from(new Set(mints.filter(Boolean))).sort();
    if (unique.length === 0) return {};

    const key = `openport-jup-meta:${unique.join(',')}`;
    const cached = readCache<Record<string, JupToken>>(key, META_TTL_MS);
    if (cached) return cached;

    try {
        const res = await fetch(`${TOKEN_URL}?query=${unique.join(',')}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const rows = (await res.json()) as {
            id?: string;
            symbol?: string;
            name?: string;
            icon?: string;
            decimals?: number;
        }[];

        const out: Record<string, JupToken> = {};
        for (const r of Array.isArray(rows) ? rows : []) {
            if (!r.id || !r.symbol) continue;
            out[r.id] = {
                symbol: r.symbol,
                name: r.name ?? r.symbol,
                icon: r.icon,
                decimals: typeof r.decimals === 'number' ? r.decimals : 0,
            };
        }
        writeCache(key, out);
        return out;
    } catch {
        // A lookup failure costs labels, not balances.
        return {};
    }
}

/** USD price per mint. Mints without liquidity are absent rather than zero. */
export async function fetchJupiterPrices(
    mints: string[],
): Promise<Record<string, number>> {
    const unique = Array.from(new Set(mints.filter(Boolean))).sort();
    if (unique.length === 0) return {};

    const key = `openport-jup-price:${unique.join(',')}`;
    const cached = readCache<Record<string, number>>(key, PRICE_TTL_MS);
    if (cached) return cached;

    try {
        const res = await fetch(`${PRICE_URL}?ids=${unique.join(',')}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as Record<
            string,
            { usdPrice?: number } | null
        >;

        const out: Record<string, number> = {};
        for (const [mint, v] of Object.entries(json ?? {})) {
            const p = v?.usdPrice;
            // A real zero is indistinguishable from "no market"; treat both as
            // unpriced so the UI shows a quantity instead of a false $0.00.
            if (typeof p === 'number' && p > 0) out[mint] = p;
        }
        writeCache(key, out);
        return out;
    } catch {
        return {};
    }
}
