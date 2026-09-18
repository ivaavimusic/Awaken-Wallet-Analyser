'use client';

import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Info } from 'lucide-react';
import { ChartPoint } from '@/lib/portfolio';
import { Snapshot } from '@/lib/settings';

const W = 900;
const H = 130;

interface PortfolioChartProps {
    points: ChartPoint[];
    snapshots?: Snapshot[];
    loading?: boolean;
    /** Earliest known on-chain activity in the current scope. */
    firstSeen?: number | null;
    /** Whether first activity is knowable here at all (needs an Alchemy key on EVM). */
    canDetectFirstSeen?: boolean;
}

const money = (n: number) =>
    n.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: n >= 1000 ? 0 : 2,
    });

export function PortfolioChart({
    points,
    snapshots = [],
    loading,
    firstSeen,
    canDetectFirstSeen = false,
}: PortfolioChartProps) {
    const [hover, setHover] = useState<number | null>(null);

    const geo = useMemo(() => {
        if (points.length < 2) return null;
        const values = points.map((p) => p.usd);
        const min = Math.min(...values);
        const max = Math.max(...values);
        const span = max - min || max || 1;
        // Pad so the line never sits flush against the edges.
        const lo = min - span * 0.1;
        const hi = max + span * 0.1;

        const x = (i: number) => (i / (points.length - 1)) * W;
        const y = (v: number) => H - ((v - lo) / (hi - lo)) * H;

        const line = points
            .map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(2)} ${y(p.usd).toFixed(2)}`)
            .join(' ');
        const area = `${line} L ${W} ${H} L 0 ${H} Z`;

        const t0 = points[0].t;
        const t1 = points[points.length - 1].t;
        const dots = snapshots
            .filter((s) => s.t >= t0 && s.t <= t1)
            .map((s) => ({
                cx: ((s.t - t0) / (t1 - t0 || 1)) * W,
                cy: y(s.usd),
                usd: s.usd,
                t: s.t,
            }));

        return { line, area, x, y, dots, lo, hi };
    }, [points, snapshots]);

    const spanDays =
        points.length > 1
            ? Math.round(
                  (points[points.length - 1].t - points[0].t) / 86_400_000,
              )
            : 0;
    const plural = (n: number, unit: string) =>
        `${n} ${unit}${n === 1 ? '' : 's'}`;
    const rangeLabel =
        spanDays >= 360
            ? 'Last 12 months'
            : spanDays >= 60
              ? `Last ${plural(Math.round(spanDays / 30), 'month')}`
              : spanDays > 0
                ? `Last ${plural(spanDays, 'day')}`
                : 'Value';

    const first = points[0]?.usd ?? 0;
    const last = points[points.length - 1]?.usd ?? 0;
    const change = first > 0 ? ((last - first) / first) * 100 : 0;
    const active = hover !== null ? points[hover] : null;

    return (
        <Card className="p-5 border-0 bg-card text-card-foreground">
            <div className="flex items-start justify-between mb-2">
                <div>
                    <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium">
                        <span>{rangeLabel}</span>
                        <span
                            className="inline-flex"
                            title="Your current holdings valued at each day's historical price. This is not true historical portfolio value — it ignores past buys, sells and transfers. Dots are real snapshots recorded on each refresh."
                        >
                            <Info className="w-3.5 h-3.5" />
                        </span>
                    </div>
                    <div className="text-xl font-bold tracking-tight mt-0.5">
                        {active ? money(active.usd) : money(last)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 h-4">
                        {active
                            ? new Date(active.t).toLocaleDateString(undefined, {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                              })
                            : points.length > 1 && (
                                  <span
                                      className={
                                          change >= 0
                                              ? 'text-green-600 dark:text-green-400'
                                              : 'text-red-600 dark:text-red-400'
                                      }
                                  >
                                      {change >= 0 ? '▲' : '▼'}{' '}
                                      {Math.abs(change).toFixed(1)}% over{' '}
                                      {spanDays >= 360
                                          ? 'the year'
                                          : plural(spanDays, 'day')}
                                  </span>
                              )}
                    </div>
                </div>
            </div>

            <div className="relative w-full h-[130px]">
                {loading ? (
                    <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                        Loading price history…
                    </div>
                ) : !geo ? (
                    <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                        Add a wallet with priced assets to see a chart.
                    </div>
                ) : (
                    <svg
                        className="w-full h-full"
                        viewBox={`0 0 ${W} ${H}`}
                        preserveAspectRatio="none"
                        onMouseLeave={() => setHover(null)}
                        onMouseMove={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const ratio = (e.clientX - rect.left) / rect.width;
                            const i = Math.round(ratio * (points.length - 1));
                            setHover(Math.max(0, Math.min(points.length - 1, i)));
                        }}
                    >
                        <defs>
                            <linearGradient id="pfGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop
                                    offset="0%"
                                    stopColor="currentColor"
                                    stopOpacity="0.28"
                                    className="text-primary"
                                />
                                <stop
                                    offset="100%"
                                    stopColor="currentColor"
                                    stopOpacity="0"
                                    className="text-primary"
                                />
                            </linearGradient>
                        </defs>

                        <path d={geo.area} fill="url(#pfGrad)" />
                        <path
                            d={geo.line}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            vectorEffect="non-scaling-stroke"
                            className="text-primary"
                        />

                        {hover !== null && (
                            <line
                                x1={geo.x(hover)}
                                x2={geo.x(hover)}
                                y1={0}
                                y2={H}
                                stroke="currentColor"
                                strokeWidth="1"
                                strokeDasharray="3 3"
                                vectorEffect="non-scaling-stroke"
                                className="text-muted-foreground/40"
                            />
                        )}
                    </svg>
                )}

                {/*
                 * Dots live in an HTML overlay rather than inside the SVG: the
                 * chart stretches with preserveAspectRatio="none", which would
                 * squash any <circle> into an ellipse.
                 */}
                {geo && !loading && (
                    <div className="absolute inset-0 pointer-events-none">
                        {geo.dots.map((d, i) => (
                            <span
                                key={i}
                                title={`Recorded ${money(d.usd)} on ${new Date(
                                    d.t,
                                ).toLocaleDateString()}`}
                                className="absolute w-2 h-2 rounded-full bg-primary ring-2 ring-[var(--card)] -translate-x-1/2 -translate-y-1/2"
                                style={{
                                    left: `${(d.cx / W) * 100}%`,
                                    top: `${(d.cy / H) * 100}%`,
                                }}
                            />
                        ))}

                        {hover !== null && points[hover] && (
                            <span
                                className="absolute w-3 h-3 rounded-full bg-primary ring-2 ring-[var(--card)] shadow-sm -translate-x-1/2 -translate-y-1/2"
                                style={{
                                    left: `${(geo.x(hover) / W) * 100}%`,
                                    top: `${(geo.y(points[hover].usd) / H) * 100}%`,
                                }}
                            />
                        )}
                    </div>
                )}
            </div>

            <p className="text-[10px] leading-snug text-muted-foreground/80 mt-2">
                Current holdings valued at historical prices — not true historical
                portfolio value. Past buys, sells and transfers are not reflected.
                Dots mark real totals recorded on each refresh.
                {typeof firstSeen === 'number' ? (
                    <>
                        {' '}Clipped to first on-chain activity (
                        {new Date(firstSeen).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                        })}
                        ).
                    </>
                ) : !canDetectFirstSeen ? (
                    <>
                        {' '}The wallet&apos;s age is unknown without an Alchemy key, so
                        this may draw a line from before it existed.
                    </>
                ) : null}
            </p>
        </Card>
    );
}
