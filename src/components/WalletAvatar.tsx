'use client';

/**
 * Deterministic identicon derived from the address itself.
 *
 * Generated locally — no network call, no tracking pixel, and the same wallet
 * always renders the same mark so you can tell rows apart at a glance.
 */

function hash(str: string): number {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

interface WalletAvatarProps {
    address: string;
    size?: number;
    className?: string;
}

export function WalletAvatar({
    address,
    size = 28,
    className = '',
}: WalletAvatarProps) {
    const h = hash(address.toLowerCase());
    const hueA = h % 360;
    const hueB = (hueA + 40 + ((h >> 8) % 120)) % 360;
    const angle = (h >> 16) % 360;

    // Four quadrant blocks toggled by low bits give each address a distinct
    // silhouette on top of its gradient.
    const cells = [0, 1, 2, 3].map((i) => ((h >> (i * 3)) & 1) === 1);
    const id = `wa-${h.toString(36)}`;

    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 32 32"
            className={`rounded-full shrink-0 ${className}`}
            aria-hidden
        >
            <defs>
                <linearGradient id={id} gradientTransform={`rotate(${angle} .5 .5)`}>
                    <stop offset="0%" stopColor={`hsl(${hueA} 72% 58%)`} />
                    <stop offset="100%" stopColor={`hsl(${hueB} 72% 46%)`} />
                </linearGradient>
            </defs>
            <rect width="32" height="32" fill={`url(#${id})`} />
            <g fill="#fff" fillOpacity="0.28">
                {cells[0] && <rect x="4" y="4" width="10" height="10" rx="2" />}
                {cells[1] && <rect x="18" y="4" width="10" height="10" rx="2" />}
                {cells[2] && <rect x="4" y="18" width="10" height="10" rx="2" />}
                {cells[3] && <rect x="18" y="18" width="10" height="10" rx="2" />}
            </g>
        </svg>
    );
}
