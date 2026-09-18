// NFT holdings via Alchemy's NFT API.
//
// Enumerating someone's NFTs is an indexer problem — plain RPC cannot answer
// "which tokens does this address own" for ERC-721 or ERC-1155 without
// replaying every Transfer log ever emitted. So this needs an Alchemy key, and
// says so rather than rendering an empty gallery that looks like "you own none".
//
// ERC-721A (and the other batch-mint variants) are ERC-721 implementations, not
// separate standards — they expose the same interface and come back as ERC721.

import { ChainConfig, getSupportedChains } from './chains';
import { Settings, Wallet } from './settings';

export interface NftItem {
    chainId: string;
    walletId: string;
    contract: string;
    tokenId: string;
    /** ERC721, ERC1155, or whatever the indexer reports. */
    standard: string;
    collection: string;
    name: string;
    image?: string;
    /** How many of this token id are held; >1 only happens for ERC-1155. */
    balance: string;
}

/**
 * Why a chain produced no NFTs.
 * 'disabled'    - the network is toggled off on the user's Alchemy app; fixable.
 * 'unsupported' - Alchemy's NFT API has no support for this chain at all.
 * 'error'       - anything else.
 */
export type NftFailure = 'disabled' | 'unsupported' | 'error';

export interface NftProblem {
    chainId: string;
    kind: NftFailure;
    message: string;
}

export interface NftResult {
    items: NftItem[];
    /** Chains that could not be read, with why. */
    problems: NftProblem[];
    /** True when no chain could be queried at all (no key). */
    needsKey: boolean;
    /** True when a wallet holds more than one page and we stopped early. */
    truncated: boolean;
}

interface AlchemyNft {
    contract?: {
        address?: string;
        name?: string;
        symbol?: string;
        tokenType?: string;
    };
    tokenId?: string;
    tokenType?: string;
    name?: string;
    balance?: string;
    image?: {
        thumbnailUrl?: string;
        cachedUrl?: string;
        originalUrl?: string;
    };
}

const PAGE_SIZE = 100;

async function fetchChainNfts(
    chain: ChainConfig,
    key: string,
    wallets: Wallet[],
): Promise<{ items: NftItem[]; truncated: boolean }> {
    const out: NftItem[] = [];
    let truncated = false;

    for (const w of wallets) {
        const url =
            `https://${chain.alchemySlug}.g.alchemy.com/nft/v3/${key}/getNFTsForOwner` +
            `?owner=${w.address}&withMetadata=true&pageSize=${PAGE_SIZE}`;

        let res: Response;
        try {
            res = await fetch(url);
        } catch {
            // Alchemy answers a disabled network with a 403 that carries no CORS
            // headers, so the browser blocks it and we never see the body. For a
            // chain Alchemy's NFT API does cover, that is what this means.
            const err = new Error(
                'Blocked before a response could be read',
            ) as Error & { kind?: NftFailure };
            err.kind = 'disabled';
            throw err;
        }

        if (!res.ok) {
            // Alchemy distinguishes "you haven't switched this network on" from
            // "this chain has no NFT API". Only the first one is actionable.
            const body = await res.text();
            const disabled = /not enabled for this app/i.test(body);
            const unsupported =
                /isn'?t enabled for that chain|not enabled for that chain/i.test(
                    body,
                );
            const err = new Error(`HTTP ${res.status}`) as Error & {
                kind?: NftFailure;
            };
            err.kind = disabled
                ? 'disabled'
                : unsupported
                  ? 'unsupported'
                  : 'error';
            throw err;
        }
        const json = (await res.json()) as {
            ownedNfts?: AlchemyNft[];
            pageKey?: string;
        };
        // A pageKey means the wallet holds more than we fetched. Say so rather
        // than quietly showing a slice as if it were everything.
        if (json.pageKey) truncated = true;

        for (const n of json.ownedNfts ?? []) {
            const contract = n.contract?.address;
            if (!contract) continue;
            out.push({
                chainId: chain.id,
                walletId: w.id,
                contract,
                tokenId: n.tokenId ?? '',
                standard: n.tokenType ?? n.contract?.tokenType ?? 'UNKNOWN',
                collection:
                    n.contract?.name ||
                    n.contract?.symbol ||
                    `${contract.slice(0, 6)}…${contract.slice(-4)}`,
                name: n.name || `#${n.tokenId ?? '?'}`,
                image:
                    n.image?.thumbnailUrl ||
                    n.image?.cachedUrl ||
                    n.image?.originalUrl,
                balance: n.balance ?? '1',
            });
        }
    }

    return { items: out, truncated };
}

export async function loadNfts(settings: Settings): Promise<NftResult> {
    const key = settings.alchemyKey;
    const evmWallets = settings.wallets.filter((w) => w.kind === 'evm');

    if (!key) {
        return { items: [], problems: [], needsKey: true, truncated: false };
    }
    if (evmWallets.length === 0) {
        return { items: [], problems: [], needsKey: false, truncated: false };
    }

    const chains = getSupportedChains().filter(
        (c) => c.kind === 'evm' && c.alchemySlug,
    );

    const items: NftItem[] = [];
    const problems: NftProblem[] = [];
    let truncated = false;

    await Promise.all(
        chains.map(async (chain) => {
            try {
                const r = await fetchChainNfts(chain, key, evmWallets);
                items.push(...r.items);
                if (r.truncated) truncated = true;
            } catch (e) {
                const kind =
                    (e as { kind?: NftFailure })?.kind ?? 'error';
                problems.push({
                    chainId: chain.id,
                    kind,
                    message:
                        e instanceof Error ? e.message : 'Request failed',
                });
            }
        }),
    );

    // Biggest collections first, then by name, so the grid is stable.
    items.sort(
        (a, b) =>
            a.collection.localeCompare(b.collection) ||
            a.tokenId.localeCompare(b.tokenId),
    );

    return { items, problems, needsKey: false, truncated };
}
