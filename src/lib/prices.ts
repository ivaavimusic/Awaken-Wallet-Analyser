// Pricing via CoinGecko's public API — no key required, which keeps the
// default setup free. Spot is one request for every asset held; history is one
// request per distinct asset, cached for a day because a daily series does not
// change intraday.

const CG = 'https://api.coingecko.com/api/v3';
const SPOT_TTL_MS = 5 * 60 * 1000;
const HISTORY_TTL_MS = 24 * 60 * 60 * 1000;

export type SpotPrices = Record<string, number>;
/** [unixMs, usd] ascending. */
export type PriceSeries = [number, number][];

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
        window.localStorage.setItem(
            key,
            JSON.stringify({ at: Date.now(), data } satisfies Cached<T>),
        );
    } catch {
        /* quota exceeded is not fatal */
    }
}

export interface MarketData {
    prices: SpotPrices;
    /** CoinGecko id -> logo URL. Free: same response as the prices. */
    images: Record<string, string>;
}

/**
 * Spot price *and* logo for each CoinGecko id in a single request.
 *
 * /coins/markets costs exactly what /simple/price did but also carries the
 * icon, so token logos are free rather than a second round of lookups.
 */
export async function fetchMarketData(ids: string[]): Promise<MarketData> {
    const unique = Array.from(new Set(ids.filter(Boolean))).sort();
    if (unique.length === 0) return { prices: {}, images: {} };

    const key = `bunny-mkt:${unique.join(',')}`;
    const cached = readCache<MarketData>(key, SPOT_TTL_MS);
    if (cached) return cached;

    const url = `${CG}/coins/markets?vs_currency=usd&ids=${unique.join(
        ',',
    )}&per_page=250&sparkline=false`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Price lookup failed (HTTP ${res.status})`);
    const json = (await res.json()) as {
        id: string;
        current_price?: number;
        image?: string;
    }[];

    const out: MarketData = { prices: {}, images: {} };
    for (const row of Array.isArray(json) ? json : []) {
        if (typeof row.current_price === 'number') {
            out.prices[row.id] = row.current_price;
        }
        if (row.image) out.images[row.id] = row.image;
    }
    writeCache(key, out);
    return out;
}

/** Daily USD series for the last year. */
export async function fetchPriceHistory(id: string): Promise<PriceSeries> {
    if (!id) return [];
    const key = `bunny-hist:${id}`;
    const cached = readCache<PriceSeries>(key, HISTORY_TTL_MS);
    if (cached) return cached;

    const url = `${CG}/coins/${id}/market_chart?vs_currency=usd&days=365&interval=daily`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`History lookup failed (HTTP ${res.status})`);
    const json = (await res.json()) as { prices?: [number, number][] };
    const series = json.prices ?? [];
    writeCache(key, series);
    return series;
}

/** Fetch several histories, tolerating individual failures. */
export async function fetchHistories(
    ids: string[],
): Promise<Record<string, PriceSeries>> {
    const unique = Array.from(new Set(ids.filter(Boolean)));
    const entries = await Promise.all(
        unique.map(async (id) => {
            try {
                return [id, await fetchPriceHistory(id)] as const;
            } catch {
                return [id, [] as PriceSeries] as const;
            }
        }),
    );
    return Object.fromEntries(entries);
}

/** Bucket a series to one price per UTC day. */
export function toDailyMap(series: PriceSeries): Map<string, number> {
    const m = new Map<string, number>();
    for (const [t, p] of series) {
        m.set(new Date(t).toISOString().slice(0, 10), p);
    }
    return m;
}
