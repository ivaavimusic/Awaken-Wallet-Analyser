'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GitHubStars } from '@/components/GitHubStars';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

const TABS = [
    { href: '/', label: 'Portfolio' },
    { href: '/tax', label: 'Tax Export' },
    { href: '/settings', label: 'Settings' },
];

export function Navbar({ children }: { children?: React.ReactNode }) {
    // `theme` is the literal string "system" until the user picks one, so it
    // cannot answer "is the page dark right now". `resolvedTheme` can.
    const { resolvedTheme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const pathname = usePathname();

    // localStorage-backed theme is unknown during SSR, so the icon can only be
    // resolved after mount. The cascading render is one cheap pass, by design.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => setMounted(true), []);
    const isDark = resolvedTheme === 'dark';
    // Before mount the resolved theme is unknown; assume neither, so the logo
    // does not flash inverted on the first paint.
    const invertLogo = mounted && isDark;

    return (
        <nav className="border-b border-border/10 bg-background/50 backdrop-blur-sm py-4">
            <div className="max-w-7xl mx-auto px-6 flex items-center justify-between gap-6">
                <div className="flex items-center gap-8">
                    <Link href="/" className="flex items-center gap-3">
                        <img
                            src="/openport-mark.svg"
                            alt="OpenPort"
                            className={`h-8 w-auto ${invertLogo ? 'brightness-0 invert' : ''}`}
                        />
                        <h1 className="text-xl font-bold tracking-tight whitespace-nowrap">
                            OpenPort
                        </h1>
                    </Link>

                    <div className="hidden md:flex items-center gap-1">
                        {TABS.map((tab) => {
                            const active =
                                tab.href === '/'
                                    ? pathname === '/'
                                    : pathname.startsWith(tab.href);
                            return (
                                <Link
                                    key={tab.href}
                                    href={tab.href}
                                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                        active
                                            ? 'bg-accent text-foreground'
                                            : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                                    }`}
                                >
                                    {tab.label}
                                </Link>
                            );
                        })}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {children}
                    <GitHubStars />
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setTheme(isDark ? 'light' : 'dark')}
                        className="bg-card border-border/50 cursor-pointer"
                        aria-label="Toggle theme"
                    >
                        {mounted && isDark ? (
                            <Sun className="w-4 h-4" />
                        ) : (
                            <Moon className="w-4 h-4" />
                        )}
                    </Button>
                </div>
            </div>

            {/* Tabs collapse below the logo on narrow screens. */}
            <div className="md:hidden max-w-7xl mx-auto px-6 pt-3 flex items-center gap-1">
                {TABS.map((tab) => {
                    const active =
                        tab.href === '/'
                            ? pathname === '/'
                            : pathname.startsWith(tab.href);
                    return (
                        <Link
                            key={tab.href}
                            href={tab.href}
                            className={`px-3 py-2 rounded-md text-sm font-medium ${
                                active
                                    ? 'bg-accent text-foreground'
                                    : 'text-muted-foreground'
                            }`}
                        >
                            {tab.label}
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
