'use client';

import { useState } from 'react';

/** Stable colour per symbol, so the fallback is consistent between renders. */
function hueFor(symbol: string): number {
    let h = 0;
    for (let i = 0; i < symbol.length; i++) {
        h = (h * 31 + symbol.charCodeAt(i)) % 360;
    }
    return h;
}

interface TokenLogoProps {
    symbol: string;
    src?: string;
    size?: number;
}

/**
 * Token icon from CoinGecko, falling back to a tinted monogram for anything
 * unlisted — unknown SPL mints and chains we have no token list for.
 */
export function TokenLogo({ symbol, src, size = 24 }: TokenLogoProps) {
    const [failed, setFailed] = useState(false);
    const px = { width: size, height: size };

    if (src && !failed) {
        return (
            <img
                src={src}
                alt=""
                style={px}
                loading="lazy"
                onError={() => setFailed(true)}
                className="rounded-full object-contain shrink-0 bg-muted"
            />
        );
    }

    const hue = hueFor(symbol);
    return (
        <span
            style={{
                ...px,
                backgroundColor: `hsl(${hue} 65% 88%)`,
                color: `hsl(${hue} 70% 30%)`,
                fontSize: size * 0.4,
            }}
            className="rounded-full flex items-center justify-center font-bold shrink-0 dark:brightness-90"
            aria-hidden
        >
            {symbol.replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase() || '?'}
        </span>
    );
}
