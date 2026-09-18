'use client';

import { useState } from 'react';
import { CHAINS } from '@/lib/chains';
import { NftItem, NftResult } from '@/lib/nfts';
import { ChainLogo } from '@/components/ChainLogo';
import { ImageOff, KeyRound, Loader2 } from 'lucide-react';

/** Mirrors PAGE_SIZE in lib/nfts.ts. */
const PAGE_LIMIT = 100;

interface NftGridProps {
    result: NftResult | null;
    loading: boolean;
    /** Chain ids currently selected; empty means all. */
    selectedChains: string[];
    /** Wallet id filter; null means all. */
    walletId: string | null;
}

function NftTile({ item }: { item: NftItem }) {
    const [broken, setBroken] = useState(false);
    const chain = CHAINS[item.chainId];

    return (
        <div className="group rounded-lg overflow-hidden border border-border/10 bg-muted/20">
            <div className="aspect-square relative bg-muted/40 flex items-center justify-center">
                {item.image && !broken ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={item.image}
                        alt=""
                        loading="lazy"
                        onError={() => setBroken(true)}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <ImageOff className="w-6 h-6 text-muted-foreground/40" />
                )}

                {chain && (
                    <div className="absolute top-1.5 right-1.5 rounded-full bg-background/80 backdrop-blur-sm p-0.5">
                        <ChainLogo chain={chain} size={16} />
                    </div>
                )}

                {/* ERC-1155 can be held in quantity; ERC-721 never is. */}
                {item.balance !== '1' && (
                    <span className="absolute bottom-1.5 left-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded bg-background/85">
                        ×{item.balance}
                    </span>
                )}
            </div>

            <div className="p-2">
                <div className="text-xs font-medium truncate" title={item.name}>
                    {item.name}
                </div>
                <div
                    className="text-[10px] text-muted-foreground truncate"
                    title={item.collection}
                >
                    {item.collection}
                </div>
                <div className="text-[9px] text-muted-foreground/70 mt-0.5 uppercase tracking-wide">
                    {item.standard}
                </div>
            </div>
        </div>
    );
}

export function NftGrid({
    result,
    loading,
    selectedChains,
    walletId,
}: NftGridProps) {
    if (loading) {
        return (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading NFTs…
            </div>
        );
    }

    if (result?.needsKey) {
        return (
            <div className="flex flex-col items-center gap-3 py-14 px-6 text-center text-muted-foreground">
                <KeyRound className="w-8 h-8 opacity-30" />
                <p className="text-sm max-w-md">
                    NFTs need an Alchemy key. Listing what an address owns requires
                    an indexer — plain RPC can only answer questions about a token
                    you already know about, so there is no keyless way to do this.
                </p>
                <a href="/settings" className="text-xs text-primary hover:underline">
                    Add a key in Settings
                </a>
            </div>
        );
    }

    const items = (result?.items ?? []).filter(
        (n) =>
            (selectedChains.length === 0 || selectedChains.includes(n.chainId)) &&
            (walletId === null || n.walletId === walletId),
    );

    return (
        <div className="px-6 pb-6">
            {result && result.problems.length > 0 && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400 mb-3">
                    Could not read NFTs on{' '}
                    {result.problems
                        .map((p) => CHAINS[p.chainId]?.name ?? p.chainId)
                        .join(', ')}
                    .
                </p>
            )}

            {result?.truncated && (
                <p className="text-[11px] text-muted-foreground mb-3">
                    Showing the first {PAGE_LIMIT} per wallet per chain — some
                    wallets hold more.
                </p>
            )}

            {items.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-10">
                    No NFTs found
                    {selectedChains.length > 0 || walletId ? ' for this filter' : ''}.
                </p>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {items.map((n) => (
                        <NftTile
                            key={`${n.chainId}-${n.contract}-${n.tokenId}-${n.walletId}`}
                            item={n}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
