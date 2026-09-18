'use client';

import { ChainGroup } from '@/lib/chains';
import { ChainStatus } from '@/lib/portfolio';
import { ChainLogo } from '@/components/ChainLogo';
import { AlertTriangle } from 'lucide-react';

interface ChainFilterProps {
    groups: ChainGroup[];
    /** Selected chain ids. Empty means everything. */
    selected: string[];
    /** Toggles every chain id behind a badge at once. */
    onToggle: (chainIds: string[]) => void;
    onClear: () => void;
    status?: ChainStatus[];
}

/**
 * Chain badges as multi-select toggles. Nothing selected means "everything",
 * which keeps the default view whole rather than empty.
 */
export function ChainFilter({
    groups,
    selected,
    onToggle,
    onClear,
    status = [],
}: ChainFilterProps) {
    return (
        <div className="flex items-center gap-2 flex-wrap">
            {groups.map((group) => {
                const active =
                    selected.length === 0 ||
                    group.ids.some((id) => selected.includes(id));

                // A badge can stand for more than one source, so surface a
                // warning if any of them is unhappy.
                const problems = status.filter(
                    (s) =>
                        group.ids.includes(s.chainId) &&
                        (s.state === 'failed' || s.state === 'unreachable'),
                );

                return (
                    <button
                        key={group.key}
                        onClick={() => onToggle(group.ids)}
                        title={
                            problems.length > 0
                                ? problems.map((p) => p.message).join(' ')
                                : group.repr.displayName
                        }
                        className={`group flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full border text-sm font-medium transition-all cursor-pointer ${
                            active
                                ? 'bg-card border-border/50 text-foreground'
                                : 'bg-transparent border-border/20 text-muted-foreground/50 hover:text-muted-foreground'
                        }`}
                    >
                        <ChainLogo chain={group.repr} size={24} muted={!active} />
                        {group.name}
                        {problems.length > 0 && (
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
