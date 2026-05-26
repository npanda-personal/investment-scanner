# CF-W1-UX-01B Work Packet

Date: 2026-05-26

## Work Item

`CF-W1-UX-01B - Stock Research Workbench Trust Evidence Contract`

Add one additive Workbench trust-evidence child on the existing page and endpoint.

## State

Architecture packet prepared.

Verdict: `READY-CANDIDATE AFTER QA`

Not promoted to Ready in this pass. Team 00 owns later promotion.

## Owner / Lane / Module

- Architecture owner: Team 03 Architecture Factory
- Future implementation owner: Team 08 or Team 00-assigned Lane 3 module owner
- Lane: Lane 3
- Backend module: `stock-research-workbench`
- Frontend feature: `stock-research-workbench`

## Exact Allowed Implementation Files After QA And Ready Promotion

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

## Allowed Reporting Docs After Ready Promotion

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-08-CF-W1-UX-01B-implementation-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-UX-01B-developer-handoff.md`

## Exact Forbidden Files After QA And Ready Promotion

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
- all active SPL route/nav files reserved for `CF-W2-SPL-02`

## Required Implementation Shape

### Backend

1. Extend the existing Workbench endpoint to accept optional `region` and `assetType`.
2. Keep the same endpoint path.
3. Use existing public Market Data Foundation scoped reads only.
4. Add top-level `trust_evidence` fields without altering existing Workbench section ownership.
5. Distinguish:
   - missing instrument
   - unverified scope
   - unsupported scope
   - scope mismatch
   - verified scope match
6. Add latest page-evidence timestamp and basis only when truthful.
7. Emit page-owned widget states as `LIMITED` or `BLOCKED` only.

### Frontend

1. Send `range`, `region`, and `assetType` from Workbench fetches.
2. Refetch when scope changes.
3. Show requested scope, verification status, evidence timestamp/basis, blockers, limitations, and widget status on the existing page.
4. Suppress widgets only when Workbench trust evidence says `BLOCKED`.
5. Keep research-support language only.

## Explicit Non-Goals

- no route-registry change
- no navigation change
- no shared UI refactor
- no Market Data Foundation source edits
- no Data Quality Engine edits
- no Signal Generation Engine edits
- no Strategy Decision Engine edits
- no schema or migration work
- no package or generated-file work
- no widget-internal eligibility rewrite
- no buy/sell, target, or reward/risk semantics

## Required Validation After Implementation

Backend:

```powershell
cd backend
npm.cmd test -- stock-research-workbench.service.test.ts stock-research-workbench.validation.test.ts stock-research-workbench.routes.test.ts --runInBand
npm.cmd run build
```

Frontend:

```powershell
cd frontend
npm.cmd run build
npm.cmd run test:ui -- stock-research-workbench.spec.ts --workers=1
```

Language guard:

```powershell
rg -n -i "buy|sell|target|price target|profit target|reward/risk|risk:reward|R:R|guaranteed|financial advice" backend/src/modules/stock-research-workbench frontend/src/features/stock-research-workbench frontend/tests/ui/stock-research-workbench.spec.ts
```

## Stop Conditions

Stop and return to Team 00 if implementation requires:

- route or nav file edits
- shared UI or shared helper edits
- Market Data Foundation source edits
- Data Quality source edits
- Signal or Strategy module edits
- Prisma/package/generated scope
- active `CF-W2-SPL-02` file overlap

## Team 04 QA Recommendation

Prepare focused QA now for these scenarios:

1. requested scope sent and echoed
2. verified scope match
3. unverified scope when query scope is absent
4. unsupported requested scope
5. scope mismatch against existing instrument
6. latest evidence timestamp available with truthful basis
7. latest evidence unavailable with explicit unknown basis
8. limitation reasons visible
9. widget limited state visible
10. widget blocked state suppresses the widget and shows the page-owned reason
11. no advice, target, or reward/risk language

## Next Gate

- Team 04: QA plan
- Team 00: Ready evaluation only if QA accepts the bounded reservation set unchanged
