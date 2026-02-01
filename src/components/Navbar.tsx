'use client';

import { ChevronDown, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getSupportedChains, ChainConfig } from '@/lib/chains';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

interface NavbarProps {
    selectedChain: ChainConfig;
    onChainSelect: (chainId: string) => void;
}

export function Navbar({ selectedChain, onChainSelect }: NavbarProps) {
    const chains = getSupportedChains();
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const isDark = theme === 'dark';

    return (
        <nav className="border-b border-border/10 bg-background/50 backdrop-blur-sm py-4">
            <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">

                {/* Left: Minimal Title */}
                <div className="flex items-center gap-4">
                    <img
                        src="/logo_bunnyAnalyzer.svg"
                        alt="Bunny Wallet Analyzer"
                        className={`h-8 w-auto ${isDark ? 'brightness-0 invert' : ''}`}
                    />
                    <h1 className="text-xl font-bold tracking-tight">
                        Bunny Wallet Analyzer
                    </h1>
                </div>

                {/* Right: Chain Selector + Theme Toggle */}
                <div className="flex items-center gap-3">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="gap-2 bg-card border-border/50 cursor-pointer">
                                <img
                                    src={selectedChain.id === 'megaeth' ? '/assets/megaeth.svg' : '/logo-cheeta-black.svg'}
                                    alt={selectedChain.name}
                                    className={`w-5 h-5 ${isDark ? 'brightness-0 invert' : ''}`}
                                />
                                {selectedChain.name}
                                <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 bg-card border-border/50">
                            {chains.map((chain) => (
                                <DropdownMenuItem
                                    key={chain.id}
                                    onClick={() => onChainSelect(chain.id)}
                                    className={`gap-3 py-3 ${selectedChain.id === chain.id ? 'bg-accent' : ''}`}
                                >
                                    <div className="w-8 h-8 relative flex items-center justify-center bg-muted rounded-md border border-border/50">
                                        {chain.id === 'megaeth' ? (
                                            <img src="/assets/megaeth.svg" alt="MegaETH" className={`w-6 h-6 ${isDark ? 'brightness-0 invert' : ''}`} />
                                        ) : (
                                            <img src="/logo-cheeta-black.svg" alt="Keeta" className={`w-6 h-6 ${isDark ? 'brightness-0 invert' : ''}`} />
                                        )}
                                    </div>
                                    <span className="font-medium">{chain.displayName}</span>
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Theme Toggle */}
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setTheme(isDark ? 'light' : 'dark')}
                        className="bg-card border-border/50 cursor-pointer"
                        aria-label="Toggle theme"
                    >
                        {mounted && theme === 'dark' ? (
                            <Sun className="w-4 h-4" />
                        ) : (
                            <Moon className="w-4 h-4" />
                        )}
                        {!mounted && <div className="w-4 h-4" />}
                    </Button>
                </div>
            </div>
        </nav>
    );
}
