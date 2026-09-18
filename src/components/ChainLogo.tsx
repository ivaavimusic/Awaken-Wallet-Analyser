'use client';

import { useState } from 'react';
import { ChainConfig } from '@/lib/chains';

interface ChainLogoProps {
    chain: ChainConfig;
    size?: number;
    className?: string;
    /** Dim the mark when its chain is filtered out. */
    muted?: boolean;
}

/**
 * Official chain emblem, falling back to a coloured initial if the asset is
 * missing or fails to load — so a broken file never leaves a blank hole.
 */
export function ChainLogo({
    chain,
    size = 24,
    className = '',
    muted = false,
}: ChainLogoProps) {
    const [failed, setFailed] = useState(false);
    const px = { width: size, height: size };

    if (chain.logo && !failed) {
        // A brand tile keeps the glyph on its own colour in both themes.
        if (chain.logoBg) {
            return (
                <span
                    style={{
                        ...px,
                        backgroundColor: chain.logoBg,
                        padding: size * 0.16,
                    }}
                    className={`rounded-full flex items-center justify-center shrink-0 transition-opacity ${
                        muted ? 'opacity-40 grayscale' : ''
                    } ${className}`}
                >
                    <img
                        src={chain.logo}
                        alt={`${chain.name} logo`}
                        onError={() => setFailed(true)}
                        className="w-full h-full object-contain"
                    />
                </span>
            );
        }

        // Single-colour marks would otherwise vanish against one of the themes.
        const tone =
            chain.logoTone === 'dark'
                ? 'dark:invert'
                : chain.logoTone === 'light'
                  ? 'invert dark:invert-0'
                  : '';
        return (
            <img
                src={chain.logo}
                alt={`${chain.name} logo`}
                style={px}
                onError={() => setFailed(true)}
                className={`rounded-full object-contain shrink-0 transition-opacity ${tone} ${
                    muted ? 'opacity-40 grayscale' : ''
                } ${className}`}
            />
        );
    }

    return (
        <span
            style={{
                ...px,
                backgroundColor: muted ? 'transparent' : chain.color,
                border: muted ? `1px solid ${chain.color}66` : 'none',
                color: muted ? chain.color : '#000',
                fontSize: size * 0.45,
            }}
            className={`rounded-full flex items-center justify-center font-bold shrink-0 ${className}`}
        >
            {chain.short}
        </span>
    );
}
