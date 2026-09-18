'use client';

import { useEffect, useState } from 'react';
import { Github } from 'lucide-react';

const REPO = 'ivaavimusic/openport';
const CACHE_KEY = 'openport-stars';
// Unauthenticated GitHub allows 60 requests an hour per IP, so the count is
// cached rather than fetched on every page view.
const TTL_MS = 6 * 60 * 60 * 1000;

const compact = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(n);

export function GitHubStars() {
    const [stars, setStars] = useState<number | null>(null);

    useEffect(() => {
        let cancelled = false;

        try {
            const raw = window.localStorage.getItem(CACHE_KEY);
            if (raw) {
                const c = JSON.parse(raw) as { at: number; n: number };
                if (Date.now() - c.at < TTL_MS) {
                    // Cached value is known synchronously; one extra pass is
                    // cheaper than a network round trip on every mount.
                    // eslint-disable-next-line react-hooks/set-state-in-effect
                    setStars(c.n);
                    return;
                }
            }
        } catch {
            /* fall through to a fetch */
        }

        fetch(`https://api.github.com/repos/${REPO}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((j) => {
                const n = j?.stargazers_count;
                if (cancelled || typeof n !== 'number') return;
                setStars(n);
                try {
                    window.localStorage.setItem(
                        CACHE_KEY,
                        JSON.stringify({ at: Date.now(), n }),
                    );
                } catch {
                    /* non-fatal */
                }
            })
            // Rate limited or offline: the button still works as a plain link.
            .catch(() => {});

        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <a
            href={`https://github.com/${REPO}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={
                stars === null
                    ? 'Star OpenPort on GitHub'
                    : `Star OpenPort on GitHub, ${stars} stars`
            }
            className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-border/50 bg-card text-sm font-medium hover:bg-accent transition-colors"
        >
            <Github className="w-4 h-4" />
            {stars !== null && (
                <span className="tabular-nums">{compact(stars)}</span>
            )}
        </a>
    );
}
