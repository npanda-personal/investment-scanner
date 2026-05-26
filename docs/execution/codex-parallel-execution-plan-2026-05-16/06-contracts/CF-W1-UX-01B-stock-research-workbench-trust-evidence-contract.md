# CF-W1-UX-01B Stock Research Workbench Trust Evidence Contract

Date: 2026-05-26

Owner: Team 03 Architecture Factory

## Status

Bounded child contract prepared.

Verdict: `READY-CANDIDATE AFTER QA`

## Contract Intent

Add truthful page-owned trust evidence to the existing Stock Research Workbench route and endpoint without changing route registries, shared UI, widget internals, Prisma, packages, or generated files.

This remains research-support context only. It must not become buy/sell advice, target-price logic, or reward/risk framing.

## Ownership

Implementation ownership stays inside:

- `backend/src/modules/stock-research-workbench`
- `frontend/src/features/stock-research-workbench`

Out of scope:

- Data Quality Engine source or new DQ scoring logic
- Signal Generation Engine source
- Strategy Decision Engine source
- shared UI
- route registries or navigation
- Prisma/schema/migrations
- package or generated files

## Backend Request Contract

The existing Workbench endpoint remains the owner:

`GET /api/v1/research/stocks/:instrumentId/workbench`

Additive optional query params:

- `range`
- `region`
- `assetType`

Backward compatibility:

- callers that omit `region` and `assetType` must continue to receive a valid response;
- omission must map to explicit unverified scope in the new trust-evidence object instead of silent fake verification.

## Additive Response Contract

The current payload shape stays intact. Add one additive top-level object:

```ts
interface WorkbenchTrustEvidence {
  requested_scope: {
    region: string | null;
    assetType: string | null;
  };
  scope_verification_status: 'VERIFIED_MATCH' | 'UNVERIFIED' | 'MISMATCH' | 'UNSUPPORTED';
  scope_verification_reason: string;
  latest_evidence_status: 'AVAILABLE' | 'UNAVAILABLE';
  latest_evidence_timestamp: string | null;
  latest_evidence_basis:
    | 'LATEST_PRICE_TIMESTAMP'
    | 'PRICE_HISTORY_TIMESTAMP'
    | 'FUNDAMENTALS_TIMESTAMP'
    | 'CORPORATE_ACTION_TIMESTAMP'
    | 'MULTI_SOURCE_PAGE_READ_MAX_TIMESTAMP'
    | 'UNKNOWN';
  blocker_reasons: string[];
  limitation_reasons: string[];
  downstream_widgets: {
    signal: {
      status: 'LIMITED' | 'BLOCKED';
      reason: string;
    };
    strategy: {
      status: 'LIMITED' | 'BLOCKED';
      reason: string;
    };
  };
}
```

Add to response:

```ts
interface ResearchWorkbenchResponse {
  // existing fields unchanged
  trust_evidence: WorkbenchTrustEvidence;
}
```

## Required Backend Rules

### Scope input

- Parse `region` and `assetType` in Workbench-local validation code only.
- Do not edit shared scope helpers.
- Unsupported requested scope must return `UNSUPPORTED` evidence status, not silent fallback.

### Scope verification

To distinguish missing instrument from scope mismatch truthfully:

1. perform unscoped instrument lookup;
2. if requested scope is supported, perform scoped instrument lookup using the same `instrumentId`;
3. map result to:
   - `VERIFIED_MATCH`
   - `MISMATCH`
   - `UNVERIFIED`
   - `UNSUPPORTED`

Rules:

- keep `404 Instrument not found` for genuinely missing instruments;
- do not convert a real scope mismatch into generic instrument-not-found when the page can prove the instrument exists outside the requested scope.

### Upstream read boundary

Use public Market Data Foundation service reads only.

Allowed:

- `getInstrument()`
- `latestPriceByInstrumentId()`
- `listPricesByInstrumentId()`
- `fundamentalsByInstrumentId()`
- `corporateActionsByInstrumentId()`
- `listInstruments()`

Forbidden:

- direct Market Data repository imports
- Data Quality source edits
- new shared helper edits

### Peer scope

- Peer comparison must use the same requested scope on `listInstruments()`.
- Do not mix peer universe from one scope with instrument evidence from another scope.

### Latest evidence timestamp

`latest_evidence_timestamp` is a page-read evidence timestamp, not a trusted review-through date.

Required rules:

- choose basis only from timestamps actually read for the page;
- when several page-owned timestamp sources exist, return max timestamp only with basis `MULTI_SOURCE_PAGE_READ_MAX_TIMESTAMP`;
- add a limitation reason when mixed source timestamps are collapsed into the max page-read timestamp;
- when page evidence has no truthful timestamp basis, return `UNAVAILABLE` and `UNKNOWN`.

### Blocker and limitation reasons

Allowed sources:

- requested scope support or mismatch truth
- presence/absence of page-owned timestamps
- current page-owned market-data statuses already returned on the Workbench path
- peer-universe emptiness when it affects valuation or relative-strength context

Forbidden:

- duplicating Data Quality Engine scoring
- inventing readiness score
- inferring trusted freshness from instrument metadata alone
- relabeling `COMPLETE` as ready/trusted

### Downstream widgets

Emit page-owned widget evidence only.

Rules:

- this child may emit only `LIMITED` or `BLOCKED`;
- `LIMITED` means the page may show the widget with explicit limitation framing;
- `BLOCKED` means the page must suppress the widget and show the reason locally;
- do not emit `ALLOWED` in this child;
- do not infer widget eligibility from the fact that the widget exists.

## Required Frontend Rules

- Workbench page must read `scope.region` and `scope.assetType` from `useMarketScope()`.
- Workbench API client must send `range`, `region`, and `assetType`.
- Page must refetch when `range`, `region`, or `assetType` changes.
- Existing Workbench sections remain intact.
- Add page-level trust-evidence presentation on the existing Workbench route only.

The page must show:

- requested scope
- scope verification status
- latest evidence timestamp or unavailable state
- latest evidence basis
- blocker reasons
- limitation reasons
- Signal widget evidence status and reason
- Strategy widget evidence status and reason

## UI Behavior Contract

- if widget status is `BLOCKED`, do not render that widget;
- if widget status is `LIMITED`, widget may render only with page-owned limitation copy visible nearby;
- do not edit widget internals;
- do not introduce shared banner or shared status-badge work.

## Research-Support Copy Guard

Allowed:

- `Requested scope`
- `Scope verified`
- `Scope not verified`
- `Scope mismatch`
- `Unsupported scope`
- `Latest evidence timestamp`
- `Latest evidence basis`
- `Limited context`
- `Blocked context`
- `Consider review`
- `Signal context limited on this page`
- `Strategy context limited on this page`

Forbidden:

- `Buy`
- `Sell`
- `Target`
- `Reward/Risk`
- `R:R`
- `Safe to trade`
- `Trusted signal`
- `Eligible strategy`
- `Guaranteed`
- `Financial advice`
- `Latest trusted data date`

## Exact Allowed Files After Ready Promotion

- `backend/src/modules/stock-research-workbench/stock-research-workbench.controller.ts`
- `backend/src/modules/stock-research-workbench/stock-research-workbench.service.ts`
- `backend/src/modules/stock-research-workbench/stock-research-workbench.types.ts`
- `backend/src/modules/stock-research-workbench/stock-research-workbench.validation.ts`
- `backend/src/modules/stock-research-workbench/stock-research-workbench.md`
- `backend/tests/modules/stock-research-workbench/stock-research-workbench.service.test.ts`
- `backend/tests/modules/stock-research-workbench/stock-research-workbench.validation.test.ts`
- `backend/tests/modules/stock-research-workbench/stock-research-workbench.routes.test.ts`
- `frontend/src/features/stock-research-workbench/api/stockResearchWorkbenchService.ts`
- `frontend/src/features/stock-research-workbench/types.ts`
- `frontend/src/features/stock-research-workbench/components/StockResearchWorkbenchPage.tsx`
- `frontend/tests/ui/stock-research-workbench.spec.ts`

## Exact Forbidden Files After Ready Promotion

- `backend/src/api/routes.ts`
- `frontend/src/app/routes.tsx`
- `frontend/src/app/navigationMetadata.tsx`
- `backend/src/modules/market-data-foundation/**`
- `backend/src/modules/data-quality-engine/**`
- `backend/src/modules/signal-generation-engine/**`
- `backend/src/modules/strategy-decision-engine/**`
- `frontend/src/features/signal-generation-engine/**`
- `frontend/src/features/strategy-decision-engine/**`
- `frontend/src/shared/**`
- `frontend/src/contexts/MarketScopeContext.tsx`
- `backend/prisma/**`
- package manifests and lockfiles
- generated files
- `shared/**`

## Stop Conditions

Stop and return to Team 00 / Architect if implementation needs:

- new Data Quality public outputs or DQ source edits
- new Signal or Strategy widget props
- Market Data Foundation source edits
- shared UI or shared helper edits
- route or navigation changes
- Prisma, package, or generated scope
- any widening into active `CF-W2-SPL-02` files

## Test Contract

Later focused coverage must prove:

- `VERIFIED_MATCH` path
- `UNVERIFIED` path
- `UNSUPPORTED` path
- `MISMATCH` path
- latest evidence available
- latest evidence unavailable
- visible blocker and limitation reasons
- widget limited state
- widget blocked state
- no advice or target language
