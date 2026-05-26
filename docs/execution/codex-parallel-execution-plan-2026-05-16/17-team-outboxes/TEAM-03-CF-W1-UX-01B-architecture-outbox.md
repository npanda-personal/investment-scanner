# TEAM-03 CF-W1-UX-01B Architecture Outbox

Date: 2026-05-26

Team: Team 03 Architecture Factory

Mode: docs-only architecture audit in main workspace

## Assignment

Prepare architecture/contract/work-packet readiness for `CF-W1-UX-01B - Stock Research Workbench Trust Evidence Contract` without touching application code, tests, Prisma, route registries, package files, generated files, root `AGENTS.md`, `docs/AGENTS.md`, or historical `docs/codex-agent-team-plan/**`.

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

## Files Changed

- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-UX-01B-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-UX-01B-stock-research-workbench-trust-evidence-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-UX-01B-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-CF-W1-UX-01B-architecture-outbox.md`

No application source, tests, Prisma files, route registries, package files, generated files, or historical docs were changed.

## Architecture Verdict

`READY-CANDIDATE AFTER QA`

Reason:

- the Workbench route and endpoint already exist;
- `region` and `assetType` can be added as additive query params on the existing endpoint;
- Workbench already consumes public Market Data Foundation reads that accept scoped options;
- module-local Workbench files are enough to add truthful page-owned trust evidence;
- no current open Product Owner decision blocks this workstream.

## Key Decisions

### 1. Module-local boundary

Keep implementation inside:

- `backend/src/modules/stock-research-workbench/**`
- `frontend/src/features/stock-research-workbench/**`
- `frontend/tests/ui/stock-research-workbench.spec.ts`

### 2. `region` and `assetType` decision

Adding `region` and `assetType` to the existing Workbench API path is module-local, not a route/shared-consent item, as long as Workbench only parses them locally and passes them into already-public Market Data Foundation reads.

### 3. Widget eligibility decision

Widget evidence must stay page-owned and additive.

This child may emit only:

- `LIMITED`
- `BLOCKED`

It must not claim `ALLOWED` because true downstream allowance would widen into Signal and Strategy contracts.

### 4. Latest evidence decision

This child may provide only a page-read `latest_evidence_timestamp` plus explicit basis.

It must not claim a trusted review-through date or DQ-approved freshness state.

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

## Exact Forbidden Implementation Files After QA And Ready Promotion

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
- active SPL route/nav files reserved by `CF-W2-SPL-02`

## Blockers

No true consent blocker found.

This item is not blocked by:

- open decision inbox
- route registries
- shared UI
- Prisma/schema
- package/generated scope

It becomes blocked only if implementation widens into Data Quality, Signal, Strategy, shared helper, shared UI, or route/nav files.

## Risks

- `MarketScopeContext` currently exposes unsupported asset types beyond the product target set; unsupported requested scope must surface as `UNSUPPORTED`, not silent support.
- Scope mismatch must not collapse into generic `404` if the page can prove the instrument exists outside the requested scope.
- Page-owned widget evidence remains limited/blocking only; true downstream allowance is deferred.

## Validation

No tests, builds, servers, or app-code edits were run.

Validation in this pass was documentation and source inspection only.

## Next Gate

- Team 04: prepare the QA plan for verified scope, unverified scope, unsupported scope, scope mismatch, evidence availability, and widget limited/blocked behavior.
- Team 00: evaluate Ready promotion only if Team 04 accepts the bounded reservation set unchanged.
