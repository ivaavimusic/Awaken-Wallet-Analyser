'use client';

import { ChainConfig } from '@/lib/chains';
import { ChainStatus } from '@/lib/portfolio';
import { ChainLogo } from '@/components/ChainLogo';
import { AlertTriangle } from 'lucide-react';

interface ChainFilterProps {
    chains: ChainConfig[];
    selected: string[];
    onToggle: (chainId: string) => void;
    onClear: () => void;
    status?: ChainStatus[];
}

/**
 * Chain logos as multi-select toggles. Nothing selected means "everything",
 * which keeps the default view whole rather than empty.
 */
export function ChainFilter({
    chains,
    selected,
    onToggle,
    onClear,
    status = [],
}: ChainFilterProps) {
    const stateOf = (id: string) => status.find((s) => s.chainId === id)?.state;

    return (
        <div className="flex items-center gap-2 flex-wrap">
            {chains.map((chain) => {
                const active = selected.length === 0 || selected.includes(chain.id);
                const state = stateOf(chain.id);
                const broken = state === 'failed' || state === 'unreachable';
                return (
                    <button
                        key={chain.id}
                        onClick={() => onToggle(chain.id)}
                        title={
                            broken
                                ? status.find((s) => s.chainId === chain.id)?.message
                                : chain.displayName
                        }
                        className={`group flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full border text-sm font-medium transition-all cursor-pointer ${
                            active
                                ? 'bg-card border-border/50 text-foreground'
                                : 'bg-transparent border-border/20 text-muted-foreground/50 hover:text-muted-foreground'
                        }`}
                    >
                        <ChainLogo chain={chain} size={24} muted={!active} />
                        {chain.name}
                        {broken && (
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                        )}
                    </button>
                );
            })}

            {selected.length > 0 && (
                <button
                    onClick={onClear}
                    className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 ml-1 cursor-pointer"
                >
                    Show all
                </button>
            )}
        </div>
    );
}
