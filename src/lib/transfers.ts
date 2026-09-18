// Transaction history for the Awaken tax export.
//
// Blockscout covers MegaETH. Everything else EVM goes through Alchemy's
// alchemy_getAssetTransfers, which needs a key — there is no keyless way to
// enumerate an address's history without an indexer, and we say so rather than
// returning an empty list that looks like "no transactions".

import { ChainConfig, alchemyRpcUrl } from './chains';
import { DisplayTransaction } from '@/types';

const shorten = (a: string) =>
    !a ? '' : a.length <= 16 ? a : `${a.slice(0, 12)}…${a.slice(-6)}`;

interface AlchemyTransfer {
    blockNum: string;
    hash: string;
    from: string;
    to: string | null;
    value: number | null;
    asset: string | null;
    category: string;
    metadata?: { blockTimestamp?: string };
}

/** EVM history via Alchemy. Both directions, native + ERC-20. */
export async function fetchAlchemyTransfers(
    chain: ChainConfig,
    address: string,
    alchemyKey: string,
): Promise<DisplayTransaction[]> {
    const url = alchemyRpcUrl(chain, alchemyKey);
    if (!url) {
        throw new Error(
            `${chain.name} history needs an Alchemy key. Add one in Settings.`,
        );
    }

    const base = {
        fromBlock: '0x0',
        toBlock: 'latest',
        category: ['external', 'erc20'],
        withMetadata: true,
        excludeZeroValue: false,
        maxCount: '0x3e8', // 1000
    };

    const call = async (direction: 'from' | 'to') => {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'alchemy_getAssetTransfers',
                params: [
                    direction === 'from'
                        ? { ...base, fromAddress: address }
                        : { ...base, toAddress: address },
                ],
            }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (json.error) throw new Error(json.error.message ?? 'RPC error');
        return (json.result?.transfers ?? []) as AlchemyTransfer[];
    };

    const [out, incoming] = await Promise.all([call('from'), call('to')]);

    // Same hash can appear in both directions; keep one row per hash+asset.
    const seen = new Set<string>();
    const rows: DisplayTransaction[] = [];

    for (const t of [...incoming, ...out]) {
        const key = `${t.hash}-${t.asset ?? ''}-${t.value ?? 0}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const isIncoming = t.to?.toLowerCase() === address.toLowerCase();
        const ts = t.metadata?.blockTimestamp
            ? Date.parse(t.metadata.blockTimestamp)
            : 0;
        const amount = t.value ?? 0;
        const asset = t.asset ?? chain.nativeSymbol;
        const amountStr = amount.toString();

        rows.push({
            Date: ts ? new Date(ts).toISOString().split('T')[0] : '',
            Asset: asset,
            Amount: isIncoming ? amountStr : `-${amountStr}`,
            Fee: '0',
            'P&L': '',
            'Payment Token': chain.nativeSymbol,
            ID: t.hash.slice(0, 10),
            Notes: isIncoming
                ? `Received from ${shorten(t.from)}`
                : `Sent to ${shorten(t.to ?? '')}`,
            Tag: isIncoming ? 'deposit' : 'withdrawal',
            'Transaction Hash': t.hash,
            timestamp: ts,
            isIncoming,
            type: isIncoming ? 'transfer_in' : 'transfer_out',
            block: t.blockNum ? String(parseInt(t.blockNum, 16)) : '',
            method: t.category === 'erc20' ? 'Token Transfer' : 'Transfer',
            from: t.from,
            to: t.to ?? '',
            status: 'Success',
            value: amountStr,
            fee: '0',
        });
    }

    rows.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    return rows;
}

/** MegaETH history via its Blockscout instance — no key required. */
export async function fetchBlockscoutTransfers(
    chain: ChainConfig,
    address: string,
): Promise<DisplayTransaction[]> {
    const res = await fetch(
        `${chain.explorerUrl}/api/v2/addresses/${address}/transactions`,
    );
    if (!res.ok) {
        throw new Error(
            'Could not reach the explorer right now. Try again in a moment.',
        );
    }
    const data = await res.json();

    interface BlockscoutTx {
        value?: string;
        fee?: { value?: string };
        to?: { hash?: string };
        from?: { hash?: string };
        hash: string;
        timestamp: string;
        block_number?: number;
        method?: string;
        status?: string;
    }

    return (data.items ?? []).map((tx: BlockscoutTx) => {
        const valueInEth = (
            parseInt(tx.value || '0') / 10 ** chain.nativeDecimals
        ).toFixed(4);
        const feeInEth = (
            parseInt(tx.fee?.value || '0') / 10 ** chain.nativeDecimals
        ).toFixed(6);
        const isIncoming = tx.to?.hash?.toLowerCase() === address.toLowerCase();

        return {
            Date: new Date(tx.timestamp).toISOString().split('T')[0],
            Asset: chain.nativeSymbol,
            Amount: isIncoming ? valueInEth : `-${valueInEth}`,
            Fee: feeInEth,
            'P&L': '',
            'Payment Token': chain.nativeSymbol,
            ID: tx.hash.slice(0, 10),
            Notes: isIncoming
                ? `Received from ${shorten(tx.from?.hash ?? '')}`
                : `Sent to ${shorten(tx.to?.hash ?? '')}`,
            Tag: isIncoming ? 'deposit' : 'withdrawal',
            'Transaction Hash': tx.hash,
            timestamp: Date.parse(tx.timestamp),
            isIncoming,
            type: isIncoming ? 'transfer_in' : 'transfer_out',
            block: tx.block_number?.toString() ?? '',
            method: tx.method || 'Transfer',
            from: tx.from?.hash ?? '',
            to: tx.to?.hash ?? '',
            status: tx.status === 'ok' ? 'Success' : 'Failed',
            value: valueInEth,
            fee: feeInEth,
        } as DisplayTransaction;
    });
}
