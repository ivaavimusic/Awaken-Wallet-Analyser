'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChainGroup } from '@/lib/chains';
import { ChainLogo } from '@/components/ChainLogo';

/**
 * A wallet can sit on a lot of chains. Wrapping makes row heights jump around,
 * so the badges stay on one line and scroll sideways instead. Fades are shown
 * only on the side that actually has more content, so a short list looks
 * untouched.
 */
export function ChainBadgeRow({ groups }: { groups: ChainGroup[] }) {
    const ref = useRef<HTMLDivElement>(null);
    const [fade, setFade] = useState({ left: false, right: false });

    const measure = useCallback(() => {
        const el = ref.current;
        if (!el) return;
        const max = el.scrollWidth - el.clientWidth;
        setFade({
            left: el.scrollLeft > 1,
            // A pixel of slack: sub-pixel widths make an exact compare flicker.
            right: max > 1 && el.scrollLeft < max - 1,
        });
    }, []);

    useEffect(() => {
        measure();
        const el = ref.current;
        if (!el) return;
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        return () => ro.disconnect();
    }, [measure, groups.length]);

    if (groups.length === 0) {
        return <span className="text-muted-foreground text-xs">—</span>;
    }

    const mask =
        fade.left && fade.right
            ? 'linear-gradient(to right, transparent 0, #000 24px, #000 calc(100% - 24px), transparent 100%)'
            : fade.left
              ? 'linear-gradient(to right, transparent 0, #000 24px)'
              : fade.right
                ? 'linear-gradient(to right, #000 calc(100% - 24px), transparent 100%)'
                : undefined;

    return (
        <div
            ref={ref}
            onScroll={measure}
            style={mask ? { maskImage: mask, WebkitMaskImage: mask } : undefined}
            className="flex items-center gap-1 overflow-x-auto max-w-[260px] md:max-w-[380px] lg:max-w-[520px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
            {groups.map((g) => (
                <span
                    key={g.key}
                    className="inline-flex items-center gap-1 pl-1 pr-2 py-0.5 rounded-full text-[10px] font-medium bg-muted/50 shrink-0"
                >
                    <ChainLogo chain={g.repr} size={14} />
                    {g.name}
                </span>
            ))}
        </div>
    );
}
