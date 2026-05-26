# CF-W1-UX-01B Architecture Review

Date: 2026-05-26

Owner: Team 03 Architecture Factory

## Status

`READY-CANDIDATE AFTER QA`

This child can stay bounded to the existing Stock Research Workbench backend module and frontend feature if it remains an additive trust-evidence layer on the existing Workbench route and endpoint.

Team 03 does not promote this item to Ready. Team 00 owns any later Ready promotion after Team 04 QA planning.

## Files Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-UX-01B-stock-research-workbench-trust-evidence-contract-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-UX-01-stock-research-workbench-trust-surfaces-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/09-summaries/CF-W1-UX-01-ux-source-mapping.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/00-control/active-work-board.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/12-ready-queue/ready-for-implementation.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/12-ready-queue/blocked-by-upstream-dependency.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/12-ready-queue/blocked-by-shared-file.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/12-ready-queue/blocked-by-decision.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/99-decision-inbox/open-decisions.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/audit-stock-research-workbench-scope-behavior-2026-05-20.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-UX-01-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-UX-01-stock-research-workbench-trust-surfaces-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-UX-01-work-packet.md`
- `backend/src/modules/stock-research-workbench/stock-research-workbench.router.ts`
- `backend/src/modules/stock-research-workbench/stock-research-workbench.controller.ts`
- `backend/src/modules/stock-research-workbench/stock-research-workbench.service.ts`
- `backend/src/modules/stock-research-workbench/stock-research-workbench.types.ts`
- `backend/src/modules/stock-research-workbench/stock-research-workbench.validation.ts`
- `backend/src/modules/stock-research-workbench/stock-research-workbench.md`
- `backend/tests/modules/stock-research-workbench/stock-research-workbench.routes.test.ts`
- `backend/tests/modules/stock-research-workbench/stock-research-workbench.service.test.ts`
- `frontend/src/features/stock-research-workbench/api/stockResearchWorkbenchService.ts`
- `frontend/src/features/stock-research-workbench/types.ts`
- `frontend/src/features/stock-research-workbench/components/StockResearchWorkbenchPage.tsx`
- `frontend/src/features/stock-research-workbench/routes.tsx`
- `frontend/src/contexts/MarketScopeContext.tsx`
- `frontend/src/features/signal-generation-engine/components/SignalWidget.tsx`
- `frontend/src/features/strategy-decision-engine/components/StrategyDecisionWidget.tsx`
- `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.repository.ts`

## Current Source Findings

- The existing Workbench route and module already exist. No backend or frontend route-registry change is needed for this child.
- The current Workbench controller accepts only `instrumentId` and `range`.
- The current Workbench frontend service sends only `range`.
- The current Workbench service already depends on public `MarketDataFoundationService` reads for:
  - `getInstrument()`
  - `latestPriceByInstrumentId()`
  - `listPricesByInstrumentId()`
  - `fundamentalsByInstrumentId()`
  - `corporateActionsByInstrumentId()`
  - `listInstruments()`
- Public Market Data Foundation reads already accept `{ region, assetType }`.
- `MarketDataFoundationRepository.findStockByIdInScope()` already enforces scoped instrument lookup through existing repository filters.
- `StockResearchWorkbenchPage.tsx` renders `SignalWidget` and `StrategyDecisionWidget` directly, but both widgets remain separate feature owners and currently accept only `instrumentId`.
- Current `MarketScopeContext` exposes `scope.region` and `scope.assetType`, but the Workbench page does not use them.
- Current `MarketScopeContext` also exposes asset types beyond the current product target set (`COMMODITY`, `FOREX`, `FUND`), so this child must handle unsupported requested scope explicitly rather than pretending support exists.

## Architecture Decision

Implement one additive Workbench trust-evidence child on the existing Workbench endpoint and page.

Boundaries:

- backend owner: `backend/src/modules/stock-research-workbench/**`
- frontend owner: `frontend/src/features/stock-research-workbench/**`
- focused UI smoke: `frontend/tests/ui/stock-research-workbench.spec.ts`

This child remains module-local if it does only the following:

1. accepts optional `region` and `assetType` query params on the existing Workbench endpoint;
2. passes those values into already-public Market Data Foundation reads;
3. additively returns a page-owned `trust_evidence` object;
4. renders the new fields on the existing Workbench page;
5. treats downstream Signal and Strategy widgets as page-owned `LIMITED` or `BLOCKED` context only.

## Decision On `region` And `assetType`

Adding `region` and `assetType` to the existing Workbench API path is `MODULE-LOCAL`.

Why:

- no endpoint path change is required;
- no route registry edit is required;
- no shared helper edit is required;
- Market Data Foundation public service methods already accept scoped read options;
- Workbench can parse and validate these query params locally inside its own controller/validation/service files.

Important nuance:

- if Workbench only performs scoped lookup, current behavior would collapse scope mismatch into the same `404` used for a genuinely missing instrument;
- to satisfy this requirement truthfully, Workbench should compare:
  - unscoped instrument existence, and
  - scoped instrument existence for the requested scope.

That comparison still stays module-local because it uses existing public Market Data Foundation service methods. It does not require Market Data Foundation source changes.

## Trust-Evidence Shape Decision

The child should add one additive top-level `trust_evidence` object. The exact implementation type name may vary, but the response contract should preserve these semantics:

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
    signal: { status: 'LIMITED' | 'BLOCKED'; reason: string };
    strategy: { status: 'LIMITED' | 'BLOCKED'; reason: string };
  };
}
```

## Required Mapping Rules

### Scope verification

- `UNSUPPORTED`:
  - requested `region` or `assetType` is outside the bounded child support set;
  - page must not fake fallback support.
- `UNVERIFIED`:
  - request omitted scope, or the page cannot prove scope at the API boundary.
- `MISMATCH`:
  - unscoped instrument exists, but the same instrument is not returned inside the requested scope.
- `VERIFIED_MATCH`:
  - unscoped instrument exists and the scoped lookup resolves the same instrument inside the requested scope.

### Latest evidence timestamp

- Derive only from timestamps already returned by page-owned Workbench reads.
- If exactly one truthful page-owned timestamp source exists, return that timestamp with its basis.
- If multiple page-owned timestamp sources exist, return the maximum observed timestamp only when basis is set to `MULTI_SOURCE_PAGE_READ_MAX_TIMESTAMP` and a limitation reason explains that the timestamp is page-read evidence, not a trusted review-through date.
- If no truthful timestamp basis exists, return:
  - `latest_evidence_status = UNAVAILABLE`
  - `latest_evidence_timestamp = null`
  - `latest_evidence_basis = UNKNOWN`

### Blocker and limitation reasons

- Workbench may project blocker or limitation reasons only from its own page-owned evidence and public upstream outputs already returned by the Workbench read path.
- Workbench must not duplicate Data Quality scoring logic.
- Workbench must not relabel `COMPLETE` as trusted or ready.

### Downstream widget eligibility

- This child may emit only `LIMITED` or `BLOCKED`.
- Do not emit `ALLOWED` in this child.

Reason:

- current widget internals are separate features;
- current widget APIs do not consume a Workbench-owned trust-evidence contract;
- truthful page-owned evidence can justify `LIMITED` or `BLOCKED`, but not full downstream allowance.

## Blocker Review

No true consent blocker was found for this child.

This item is not blocked by the current open decision inbox. Current open decisions affect only:

- `CF-W1-MD-02B`
- `CF-W1-DQ-02-RS1`

This item becomes blocked only if implementation needs any of the following:

- Data Quality Engine source or new DQ public contract changes
- Signal Generation Engine source or tests
- Strategy Decision Engine source or tests
- shared UI changes
- route registry changes
- Prisma or generated changes
- package changes
- shared helper edits

## Exact Allowed Files After QA And Ready Promotion

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

## Exact Forbidden Files After QA And Ready Promotion

- `backend/src/api/routes.ts`
- `frontend/src/app/routes.tsx`
- `frontend/src/app/navigationMetadata.tsx`
- `backend/prisma/**`
- package manifests and lockfiles
- generated files
- `backend/src/modules/market-data-foundation/**`
- `backend/src/modules/data-quality-engine/**`
- `backend/src/modules/signal-generation-engine/**`
- `backend/src/modules/strategy-decision-engine/**`
- `frontend/src/features/signal-generation-engine/**`
- `frontend/src/features/strategy-decision-engine/**`
- `frontend/src/shared/**`
- `frontend/src/contexts/MarketScopeContext.tsx`
- `shared/**`
- all Signal Position Ledger route/nav files reserved by active `CF-W2-SPL-02`

## Risks

- The global frontend scope model still exposes unsupported asset types; this child must block unsupported scope cleanly instead of claiming coverage.
- `latest_evidence_timestamp` is page-read evidence only. If Product Owner wants DQ-approved trusted review date semantics, that is a later cross-module child.
- Page-owned widget eligibility remains limited/blocking only. True widget allowance would widen into Signal and Strategy contracts.

## Next Gate

- Team 04: prepare focused QA coverage for verified match, unverified scope, unsupported scope, scope mismatch, evidence available, evidence unavailable, visible limitation reasons, and widget limited/blocked behavior.
- Team 00: evaluate Ready promotion only if Team 04 accepts the bounded reservation set without widening into shared files.
