# CF-W2-SPL-02 Active Surface Contract

Date: 2026-05-26

Owner: Team 03 - Solution Architecture Factory

## Status

Contract prepared for Team 04 QA planning and Team 00 implementation sequencing.

Verdict: `READY-CANDIDATE AFTER QA`

## Contract Intent

Expose the accepted `CF-W2-SPL-01B` active Signal Position Ledger read model as the first user-facing page without widening into closed-history truth, storage, broker execution, portfolio accounting, targets, reward/risk, or advice language.

## Dependency Contract

Implementation base must include accepted commit:

- `ca31d79 feat: add signal position ledger read model`

The frontend may consume only this active-list endpoint:

- `GET /api/v1/signals/position-ledger/active`

The page must not call any closed-history endpoint in this child.

## Backend Route Contract

Mounting:

- `backend/src/api/routes.ts` imports `signalPositionLedgerRouter`.
- `apiModules` mounts `{ path: '/api/v1', router: signalPositionLedgerRouter }`.

Effective routes:

- `GET /api/v1/signals/position-ledger/health`
- `GET /api/v1/signals/position-ledger/active`

The active route is the only route consumed by the frontend page.

## Query Contract

Supported active-list query parameters:

```ts
interface SignalPositionLedgerActiveQuery {
  region: string;
  assetType: string;
  limit?: number;
  offset?: number;
}
```

Required defaults and bounds:

- `region`: app market scope, default `IN` if omitted by backend validation.
- `assetType`: app market scope, default `STOCK` if omitted by backend validation.
- `limit`: default `25`, min `1`, max `100`.
- `offset`: default `0`, min `0`.

No additional query parameters are approved in this child.

## Response Contract

Preserve the accepted `CF-W2-SPL-01B` response shape:

```ts
interface SignalPositionLedgerActiveListResponse {
  items: SignalPositionLedgerActiveRow[];
  totalCount: number;
  limit: number;
  offset: number;
  nextOffset: number | null;
  hasMore: boolean;
  scope: {
    region: string;
    assetType: string;
  };
  warnings: string[];
}
```

Required row semantics:

```ts
type SignalPositionTriggerType = 'bullish_entry_trigger' | 'bearish_trigger';
type SignalPositionReturnStatus = 'CURRENT' | 'STALE' | 'UNAVAILABLE';
type SignalPositionHealthState = 'EXIT_TRIGGERED' | 'RISK_WARNING' | null;
type SignalPositionLifecycleEvidenceStatus = 'EXIT_COMPATIBILITY_ONLY' | 'UNAVAILABLE';

interface SignalPositionLedgerActiveRow {
  signalId: string | null;
  instrumentId: string;
  symbol: string;
  companyName: string | null;
  region: string | null;
  assetType: string | null;
  triggerType: SignalPositionTriggerType;
  entryTriggerTimestamp: string;
  entryTriggerPrice: number;
  entryReasonSummary: string;
  strategyId: string | null;
  strategyVersion: string | null;
  entryRuleId: string | null;
  latestTrustedPriceDate: string | null;
  latestTrustedPrice: number | null;
  currentReturnPercent: number | null;
  currentReturnStatus: SignalPositionReturnStatus;
  currentDataQualityStatus: string | null;
  healthState: SignalPositionHealthState;
  lifecycleEvidenceStatus: SignalPositionLifecycleEvidenceStatus;
  trustEvidenceStatus: string;
}
```

Exact type aliases may stay in the backend module. Frontend feature types must mirror these semantics without importing backend source.

## Ordering Contract

The active endpoint must return eligible rows in newest entry trigger order:

- primary: `entryTriggerTimestamp` descending;
- stable fallback only where needed: symbol ascending or instrument id ascending.

Ordering must be applied before pagination.

Client-side sorting over a paginated slice is forbidden in this child because it would misrepresent global order.

## Summary Contract

No new backend summary aggregate is approved.

Allowed summary semantics:

- `Active positions`: response `totalCount`.
- `Current page`: response `items.length`.
- `Exit-trigger compatibility`: page-local count from `items` where `healthState === 'EXIT_TRIGGERED'`, labeled `This page`.
- `Risk warning`: page-local count from `items` where `healthState === 'RISK_WARNING'`, labeled `This page`.
- `Return basis limited`: page-local count from `items` where `currentReturnStatus` is `STALE` or `UNAVAILABLE`, labeled `This page`.

Forbidden summary semantics:

- scope-wide status counts inferred from one returned page;
- closed-history counts;
- realized profit/loss counts;
- win/loss labels.

## Frontend Route Contract

Feature route:

```ts
export const signalPositionLedgerRoutes: RouteObject[] = [
  { path: '/signal-position-ledger', element: <SignalPositionLedgerPage /> },
];
```

App route integration:

- `frontend/src/app/routes.tsx` imports `signalPositionLedgerRoutes` from `@/features/signal-position-ledger`;
- route spread appears inside the protected `NavigationLayout` children;
- no row-detail route is approved in slice 1.

## Navigation Contract

Navigation metadata:

- group: `Daily Work`;
- label: `Signal Position Ledger`;
- path: `/signal-position-ledger`;
- placement: after `Today Review`;
- active match prefixes: `['/signal-position-ledger/']`.

No Home Page launch card is approved in this child.

## Frontend Feature Contract

Required feature files:

- `frontend/src/features/signal-position-ledger/types.ts`
- `frontend/src/features/signal-position-ledger/api/signalPositionLedgerApi.ts`
- `frontend/src/features/signal-position-ledger/hooks/useSignalPositionLedgerActiveRows.ts`
- `frontend/src/features/signal-position-ledger/components/SignalPositionLedgerPage.tsx`
- `frontend/src/features/signal-position-ledger/routes.tsx`
- `frontend/src/features/signal-position-ledger/index.ts`

Optional feature-local decomposition:

- `components/ActivePositionsTable.tsx`
- `components/SignalPositionSummaryStrip.tsx`
- `components/ClosedHistoryPlaceholder.tsx`

Feature requirements:

- use `useMarketScope()` for `region` and `assetType`;
- refetch active rows when scope, limit, or offset changes;
- reset offset to `0` when scope changes;
- render `Active Positions` as default tab;
- render `Closed History` placeholder immediately with no API call;
- keep rows non-clickable;
- use feature-local formatting helpers where needed.

## UI Copy Contract

Required labels:

- Page/nav label: `Signal Position Ledger`
- Default tab: `Active Positions`
- Placeholder tab: `Closed History`

Recommended header subtitle:

- `System-picked signal-position evidence for the current market scope.`

Required closed-placeholder copy:

- `Closed history is not shown yet because durable close date, close price, and close reason proof are not available on the current source path.`

Allowed neutral label for `healthState = null`:

- `No compatibility state`

Allowed lifecycle evidence label for `UNAVAILABLE`:

- `Lifecycle proof deferred`

Forbidden user-facing language:

- `active trade`
- `open trade`
- `closed trade`
- `buy now`
- `sell now`
- `profit target`
- `price target`
- `target`
- `reward/risk`
- `R:R`
- `realized P/L`
- `realized profit`
- `broker position`
- `execution`
- `financial advice`

## State Contract

Active loading:

- show visible loading structure for active tab.

Active empty:

- message must name the current scope, for example `No active signal positions are available for IN / STOCK.`

Active error:

- message must name the current scope and never render fallback rows.

Closed History:

- no loading table;
- no rows;
- no counts;
- no mock data;
- no API call;
- explicit deferred-proof copy only.

## Test Contract

Backend tests must cover:

- route file integration or mounted router exposure;
- newest entry trigger ordering before pagination;
- preservation of existing scope and pagination semantics.

Frontend UI smoke must cover:

- navigation shows `Signal Position Ledger`;
- route `/signal-position-ledger` loads;
- active tab is default;
- active API receives `region`, `assetType`, `limit`, and `offset`;
- active rows render required fields;
- page-local status counts are labeled as page-local if shown;
- closed tab makes no API request and shows deferred-proof placeholder only;
- forbidden language is absent.

## Escalation Rule

Stop and return to Team 00 if implementation requires:

- a closed-history endpoint;
- backend aggregate summary fields;
- search/filter query params;
- row detail route;
- schema/migration/generated/package changes;
- shared UI edits;
- Home Page card exposure;
- provider/live/startup/backfill/scheduler work;
- broker, portfolio, target, reward/risk, or advice semantics.

