# OpenPort — Design

**Date:** 2026-09-18
**Status:** Approved
**Supersedes:** the MegaETH/Keeta-only wallet-analyser product framing

## 1. Summary

Convert this repo from a single-purpose tax CSV exporter into **OpenPort**, an
open-source personal multi-chain portfolio manager. The existing tax-export analyser survives
unchanged as a secondary tab.

The product answers one question on open: *what do I own, across every wallet and chain, in USD?*

Hard constraints set by the owner:

- Open source, no backend, free to self-host.
- Must run inside **Alchemy's free quota**.
- Lightweight — low RPC usage is a feature, not an optimisation.
- Works with **public RPCs and no API key at all**; Alchemy is an optional upgrade.
- The 12-month chart is the designated compromise. Accuracy there is tradeable; cost is not.

## 2. Goals

1. Save named wallets (EVM + Solana) and persist them.
2. Save per-network RPC endpoints, with user-addable fallbacks via a `+` button.
3. Overview: total USD value, then per-asset aggregate (USDC, USDT, ETH, SOL, …) across all wallets.
4. Filter the whole view by clicking chain logos.
5. A 12-month value chart.
6. Keep the tax-export flow, and extend it to the new chains.

## 3. Non-goals

- Trading, swapping, or any write/signing path. Read-only, addresses only, never a private key.
- Tax-lot accounting or cost basis beyond what the existing tax CSV already does.
- Real-time streaming, websockets, or background polling.
- Accounts, login, or cross-device sync.
- NFT valuation.

## 4. Networks

All four new networks were verified against Alchemy's chain directory on 2026-09-18.

| Network | Chain ID | Kind | Alchemy slug | Native |
|---|---|---|---|---|
| Ethereum | 1 | EVM | `eth-mainnet` | ETH |
| Base | 8453 | EVM | `base-mainnet` | ETH |
| Robinhood Chain | 4663 | EVM | `robinhood-mainnet` | ETH |
| Solana | — | SVM | `solana-mainnet` | SOL |
| MegaETH | 4326 | EVM | `megaeth-mainnet` | ETH |
| Keeta | — | custom | none | KEETA |

**Robinhood Chain is an EVM chain** — a permissionless Ethereum-compatible L2 from Robinhood built
on Arbitrum, for tokenised real-world assets. It is *not* the Robinhood brokerage. No CSV import,
no credentials, no aggregator. It uses the same adapter as Ethereum and Base.

Keeta has no Alchemy support and no token standard we index. It contributes **native KEETA balance
only** to the portfolio, via its existing REST adapter, and remains fully supported in tax export.

## 5. Architecture

```
src/lib/
  chains.ts      network registry (extended)
  rpc.ts         NEW  sequential-failover fetch with timeout
  settings.ts    NEW  localStorage schema, migration, export/import
  evm.ts         NEW  shared EVM adapter (replaces inlined fetch in page.tsx)
  solana.ts      NEW  Solana balances (native + SPL)
  portfolio.ts   NEW  balance aggregation, both fetch modes
  prices.ts      NEW  spot + 12-month historical series
  tokenlist.ts   NEW  curated per-chain token list for keyless mode
  keeta.ts       unchanged
  csv.ts         unchanged

src/app/
  page.tsx           Portfolio (new default)
  tax/page.tsx       existing analyser, moved
  settings/page.tsx  NEW
```

Each module has one job and no knowledge of the UI. `portfolio.ts` is the only module that knows
about more than one chain; every adapter below it speaks about exactly one.

`chains.ts` gains per-network fields: `rpcUrls: string[]`, `alchemySlug?: string`,
`kind: 'evm' | 'svm' | 'keeta'`, `logo: string`, `multicall3?: string`.

## 6. Data flow

The app runs in one of two modes depending on whether an Alchemy key is present. Both stay cheap.

### Mode A — Alchemy key present (the good path)

Alchemy's Portfolio API is multi-chain *and* multi-address in a single request, and returns
balances, token metadata and prices in the same response.

```
POST https://api.g.alchemy.com/data/v1/{key}/assets/tokens/by-address
  { addresses: [{ address, networks: [...] }, ...],
    withMetadata: true, withPrices: true, includeNativeTokens: true }
```

- **1 call** covers every wallet × every supported EVM chain, with prices.
- **+1 call** for Solana (own endpoint).
- **+1 call** for Keeta, only if a Keeta wallet is saved (not an Alchemy network).
- **= 2–3 calls per full refresh.** Full token discovery.

### Mode B — no key, public RPCs only (the default)

Plain RPC cannot *discover* which ERC-20s an address holds — that needs an indexer. So keyless mode
trades discovery for a curated token list and gets every balance in one `eth_call` per chain using
**Multicall3** (deployed at `0xcA11bde05977b3631167028862bE2a173976CA11` on all target EVM chains).

- **1 multicall per EVM chain** — batches native + every listed token, for every wallet at once.
  Four EVM chains in scope (Ethereum, Base, Robinhood, MegaETH) = 4 calls.
- **+2 calls** for Solana (`getBalance`, `getTokenAccountsByOwner`).
- **+1 call** for Keeta, only if a Keeta wallet is saved.
- **+1 call** to CoinGecko for prices.
- **= ~8 calls per full refresh.** Curated tokens only (USDC, USDT, WETH, DAI, WBTC, native, per chain).

Calls are made only for chains that actually have a saved wallet, so a user with one Base address
pays for one chain, not six.

The UI states which mode is active and what keyless mode cannot see, so a missing token is never a
silent wrong number.

### Refresh policy

Refresh is a **button**, never a poll or an interval. Results are cached in localStorage with a
visible `updated 6m ago` stamp; reopening the app costs zero calls.

## 7. Cost budget

At a deliberately heavy 30 refreshes/day (900/month), with every network in use:

| | calls/refresh | requests/month |
|---|---|---|
| Mode A (Alchemy key) | 3 | ~2,700 |
| Mode B (public RPC) | 8 | ~7,200 |

Both are a negligible fraction of Alchemy's free tier, and Mode B's calls are spread across public
endpoints and CoinGecko rather than concentrated on Alchemy at all. The design has no mechanism that
can fan out per-token or per-wallet, so cost scales with *refreshes* and *chains in use*, never with
portfolio size.

The exact compute-unit cost of a Portfolio API call must be measured during implementation and
recorded here; call counts above are structural and reliable.

## 8. The chart — accepted compromise

**Method: current holdings valued at historical prices.**

One historical price series per *distinct asset held* (typically 5–10), from Alchemy's Prices API
historical endpoint, or CoinGecko `/coins/{id}/market_chart?days=365&interval=daily` keyless. Then
`value(day) = Σ(current_quantity × price(asset, day))`.

- Cost: ~5–10 price calls, cached 24h. No chain data at all.
- Benefit: a populated 12-month curve the first time the app opens.
- **Limitation, stated in the UI:** this is what today's holdings would have been worth, *not* true
  historical portfolio value. It ignores every past buy, sell and transfer. A wallet funded last
  week will show a full year of phantom curve.

To partially redeem this, every manual refresh appends a real `{ timestamp, totalUsd }` snapshot to
localStorage. Those true points render as dots over the curve and accumulate at zero cost, so the
chart becomes genuinely accurate over time without ever costing a historical query.

**Rejected:** transaction-history replay and archival balance queries. Both produce a true curve and
both breach the free-quota constraint.

## 9. Settings & storage

localStorage, plus Export/Import JSON for moving between browsers. Versioned for migration.

```ts
type Settings = {
  version: 1
  alchemyKey?: string
  wallets: { id: string; name: string; address: string; kind: 'evm' | 'svm' | 'keeta' }[]
  rpcs: Record<string /* chainId */, string[]>   // ordered, [0] tried first
  cache?: { fetchedAt: number; balances: unknown; prices: unknown }
  snapshots: { t: number; usd: number }[]
}
```

RPC editor per network: ordered list, drag to reorder, `+ Add fallback RPC`, inline latency/health
check, delete. One Alchemy key field upgrades every supported network at once.

**Security note, to be surfaced in the README and the Settings UI:** an Alchemy key in localStorage
is readable by any script in that browser. Because public RPCs are the default, most users never
enter one. Keys are never sent anywhere except the provider they belong to.

## 10. Overview UI

```
$48,231.09        ▲ +2.4% 24h        ↻ updated 6m ago

[Ξ Ethereum] [◆ Base] [🅡 Robinhood] [◎ Solana] [⬢ MegaETH] [K Keeta]   ← multi-select filter

  12-month chart ────────────────────────────────────── 12M
  · real snapshots overlaid as dots

  ASSET     QUANTITY        VALUE        WEIGHT
  ETH           8.21   $28,140.22         58.3%
  USDC     12,400.00   $12,400.00         25.7%
  SOL         142.50   $ 6,690.87         13.9%
  USDT      1,000.00   $ 1,000.00          2.1%

  WALLET   ADDRESS       CHAINS        VALUE
  Main     0x71c…9f2     ETH · Base    $31,204.11
  Degen    0x9ab…44c     Base          $11,337.55
  Sol-1    7xKX…gAsU     Solana        $ 5,689.43
```

Chain logos are multi-select toggles; deselecting filters totals, asset rows, wallet rows and chart
together. All existing shadcn components and the current theme are reused — no new design language.

## 11. Tax Export tab

Today's analyser moves to `/tax` with behaviour unchanged: one chain, one address, fetch, table,
Download CSV. It gains Ethereum, Base, Robinhood Chain and Solana through the shared adapters. The
tax export 10-column schema and `csv.ts` are untouched.

## 12. Error handling

- **RPC failover** is sequential with a per-endpoint timeout; the UI names the endpoint that served
  the data, and surfaces which endpoints failed.
- **Partial multi-chain failure** is a first-class state. Alchemy's fan-out endpoints can succeed on
  some networks and fail on others in one request. A chain that fails renders as `—` with a retry
  affordance; it never renders as `$0`, and it is excluded from the total with a visible warning.
  A wrong total is worse than an incomplete one.
- **Missing prices** show quantity with `price unavailable` rather than assuming zero value.
- **Unknown address format** is rejected at entry with the expected shape shown.
- **Corrupt or old localStorage** falls back to defaults via version migration rather than crashing.

## 13. Testing

The repo currently has no test setup. Add **vitest** for pure logic, which is where the real risk
is — not E2E.

- `portfolio.ts` — aggregation across wallets/chains, decimal handling, partial-failure exclusion.
- `prices.ts` — series alignment, gaps, missing assets.
- Chart math — `Σ(qty × price(day))`, sparse days, empty portfolio.
- `settings.ts` — schema migration, export/import round-trip.
- `tokenlist.ts` / `evm.ts` — multicall encode/decode against recorded fixtures.
- `csv.ts` — existing tax export output must not regress.

Network layers are tested against recorded fixtures, not live endpoints.

## 14. Repo rename

The package and repo are renamed to **`openport`**, in `package.json`, README, and the GitHub
repo name. README is rewritten around the portfolio manager, with tax export documented as a
secondary feature.

## 15. Cleanup in scope

Touched because the new code replaces it, not as speculative refactoring:

- The MegaETH fetch inlined at `src/app/page.tsx:74-109` moves into `lib/evm.ts`.
- `src/components/WalletForm.tsx` and `src/lib/transformer.ts` appear unused — delete after
  confirming with a reference check.
- `src/lib/megaeth.ts` collapses into the shared `lib/evm.ts` adapter.

## 16. To verify during implementation

Concrete first tasks, not open questions:

1. Confirm the Portfolio API request/response contract and its exact field names against
   `alchemy.com/docs/reference/portfolio-apis`, and which of our networks it supports.
2. Confirm Multicall3 is deployed at the canonical address on Robinhood Chain and MegaETH; if not,
   keyless mode for that chain degrades to native-balance-only.
3. Measure and record the compute-unit cost per call for both modes.
