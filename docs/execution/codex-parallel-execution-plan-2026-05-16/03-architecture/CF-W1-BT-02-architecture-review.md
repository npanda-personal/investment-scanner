# CF-W1-BT-02 Architecture Review

Date: 2026-05-18

Owner: Team 03 Architecture Factory

## Status

Ready candidate. Smallest no-schema/no-shared first child is feasible.

The Product Owner correction narrows `CF-W1-BT-02` to direct investor review value: one canonical backtest review-disposition label plus a concise reason summary that stays consistent between the saved-run list and the selected-run detail. Earlier BT-02 drafts widened into trade-level structured rule-traceability work; that is not required for this first child and is explicitly deferred.

This remains a docs-only readiness result. Team 04 QA handoff and Team 00 Ready promotion are still required before any application-code pass.

## Evidence Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/16-team-inboxes/TEAM-03-current-assignment.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-BT-02-backtesting-outcome-review-traceability-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/next-top-10-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/top-10-ready-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/audit-backtesting-trade-risk.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-BT-02-qa-plan.md`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.md`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.types.ts`
- `frontend/src/features/backtesting-strategy-lab/types.ts`
- `frontend/src/features/backtesting-strategy-lab/components/BacktestingStrategyLabPage.tsx`

## Current Source Findings

- `backtesting-strategy-lab.service.ts` already computes the evidence needed to classify a run for review use:
  - `availabilityStatus`
  - `benchmarkComparison`
  - `exitDiagnostics`
  - `realismWarnings`
  - `dataCoverage`
  - `dataCoveragePercent`
  - `calculationAudit`
- Persisted-run normalization already repairs legacy trade rows on read and already withholds invalid aggregate proof through `calculationAudit.aggregateStatus = LEGACY_INVALID`.
- The saved-run list currently shows only `status` plus either `Legacy invalid` or `totalReturn`, while the detail view shows benchmark, warnings, availability, and calculation-audit evidence. The same run can therefore tell a weaker trust story in the list than it does in detail.
- The requirement does not need new simulation math, trade persistence, or cross-module rule metadata. The gap is a canonical run-level interpretation of evidence that already exists.
- The audit mention of structured `exit_rule_id`, `invalidation_rule_id`, and `rule_version` remains useful future work, but it is broader than the current bounded requirement and should not be folded into this child.

## Architecture Decision

Prepare `CF-W1-BT-02` as one bounded `backtesting-strategy-lab` packet that adds run-level review-disposition fields only.

The first child should add additive module-local DTO fields equivalent to:

```ts
type BacktestReviewDisposition =
  | 'TRUSTED_REVIEW'
  | 'PARTIAL_REVIEW'
  | 'DIAGNOSTIC_ONLY'
  | 'LEGACY_REPAIRED'
  | 'WITHHELD';

interface BacktestMetrics {
  reviewDisposition?: BacktestReviewDisposition;
  reviewDispositionReasonSummary?: string;
  reviewDispositionReasons?: string[];
}
```

Exact field names may differ, but the semantics must remain stable.

The disposition must be derived from evidence already computed inside `backtesting-strategy-lab.service.ts`. No repository, route, or shared-contract widening is needed.

## Required Mapping Rules

- `WITHHELD`
  - failed runs; or
  - `availabilityStatus = ERROR`; or
  - `calculationAudit.aggregateStatus = LEGACY_INVALID`; or
  - any run where aggregate proof is explicitly withheld.
- `LEGACY_REPAIRED`
  - `calculationAudit.repairedTradeReturnCount > 0`; and
  - aggregate proof is still usable.
- `DIAGNOSTIC_ONLY`
  - `availabilityStatus = INSUFFICIENT_HISTORY`; or
  - `numberOfTrades = 0`; or
  - `benchmarkComparison.benchmarkDataStatus = UNAVAILABLE`; or
  - `exitDiagnostics.endOfTestExitPercent >= 0.4`; or
  - `numberOfTrades < 10`.
- `PARTIAL_REVIEW`
  - `availabilityStatus = PARTIAL`; or
  - `dataCoveragePercent` is below the preferred threshold while aggregate proof remains usable.
- `TRUSTED_REVIEW`
  - completed run;
  - no withheld proof;
  - no repair-only or diagnostic-only blocker;
  - no partial-review gate.

`reviewDispositionReasonSummary` should collapse the highest-signal reasons into one concise sentence. `reviewDispositionReasons` should preserve the specific evidence categories behind that summary so list and detail render the same trust story.

## UI Projection Rules

- The saved-run list must show the same disposition label and reason summary that the selected-run detail shows for that run.
- Existing benchmark, availability, data-coverage, exit-diagnostic, realism-warning, and calculation-audit panels remain visible as supporting evidence.
- No new page, route, shared UI component, or navigation surface is required.

## Exact Future File Reservations

Allowed files for the bounded first child only:

- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.types.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.md`
- `backend/tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.test.ts`
- `frontend/src/features/backtesting-strategy-lab/types.ts`
- `frontend/src/features/backtesting-strategy-lab/components/BacktestingStrategyLabPage.tsx`
- `frontend/tests/ui/backtesting-strategy-lab.spec.ts`

## Explicitly Forbidden Files

- application source or tests before Team 00 promotion
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- generated Prisma client or generated types
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.repository.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.controller.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.router.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.validation.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.module.ts`
- `backend/src/modules/backtesting-strategy-lab/index.ts`
- `backend/src/modules/strategy-framework/**`
- `backend/src/modules/trade-plan-risk-engine/**`
- `frontend/src/features/backtesting-strategy-lab/api/backtestingStrategyLabService.ts`
- `frontend/src/features/backtesting-strategy-lab/hooks/useBacktestingStrategyLab.ts`
- `frontend/src/features/backtesting-strategy-lab/routes.tsx`
- backend and frontend route registries
- shared backend utilities
- shared frontend components
- package manifests
- any shared or generated source-contract file

## Explicitly Blocked Change Classes

- no Prisma/schema/migration/generated-file change
- no repository/controller/router/validation or route-registry change
- no shared UI or shared backend utility change
- no cross-module source-contract change
- no `strategy-framework` or `trade-plan-risk-engine` source change
- no simulation-math, benchmark-math, or ranking-model rewrite
- no trade-level structured rule-ID expansion in this child

The only allowed contract change is additive module-local DTO projection inside the existing backtest run payload.

## Dependency And Conflict Notes

- No open decision blocker exists.
- No Prisma/schema/generated/shared-route/shared-UI approval is required for this first child.
- Team 00 should not promote another `backtesting-strategy-lab` packet in parallel with this one. The reserved service/types/doc/test and page/types/UI-spec surfaces are one writer set.
- If implementation pressure appears to require trade-level rule IDs, route/controller changes, or `strategy-framework` source edits, stop and split that into a later approval-gated child.

## Required QA Planning Handoff For Team 04

Team 04 can plan this packet now.

Required scenarios:

- `TRUSTED_REVIEW` run with completed evidence and no partial/diagnostic blocker
- `PARTIAL_REVIEW` run where availability or coverage is limited but aggregate proof remains usable
- `DIAGNOSTIC_ONLY` run for:
  - insufficient history
  - no trades
  - benchmark unavailable
  - weak end-of-test exit dominance
  - low sample size
- `LEGACY_REPAIRED` run where repaired trade rows exist but aggregate proof remains usable
- `WITHHELD` run where `LEGACY_INVALID` aggregate proof remains quarantined
- saved-run list and detail page show the same disposition label and same summary for the same run
- existing evidence panels remain visible and additive
- no direct-advice or target-price wording appears

## Ready Recommendation

- Narrowed first child: feasible
- Split required: no
- Blocked: no
- Ready recommendation: `Ready candidate`

Team 04 QA planning can proceed now, and Team 00 can evaluate `CF-W1-BT-02` as a bounded Ready candidate after that QA handoff is accepted.
