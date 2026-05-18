# CF-W1-BT-02 Work Packet

Date: 2026-05-18

## Work Item

Backtesting outcome review traceability.

## State

Ready candidate.

This packet is bounded to one no-schema `backtesting-strategy-lab` implementation pass. It is not approved for application code until Team 04 QA planning and Team 00 Ready promotion are complete.

## Owner / Lane / Modules

- Architecture owner: Team 03 Architecture Factory
- Future implementation owner: Team 06 Strategy / Signals / Risk
- Lane: Lane 2
- Backend module: `backtesting-strategy-lab`
- Frontend feature: `backtesting-strategy-lab`

## Smallest First Child

Add one canonical run-level review-disposition label plus a concise reason summary that stays consistent between:

- the saved-run list; and
- the selected-run detail view.

This child is intentionally narrower than earlier BT-02 drafts. It does not include trade-level structured rule-ID expansion.

## Allowed Files After Ready Promotion

- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.types.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.md`
- `backend/tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.test.ts`
- `frontend/src/features/backtesting-strategy-lab/types.ts`
- `frontend/src/features/backtesting-strategy-lab/components/BacktestingStrategyLabPage.tsx`
- `frontend/tests/ui/backtesting-strategy-lab.spec.ts`

## Current Forbidden Files

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

## Required Behavior

Future implementation must:

- add additive run-level `reviewDisposition`, `reviewDispositionReasonSummary`, and `reviewDispositionReasons` fields, or stable equivalents
- derive the new fields from current module evidence only:
  - `availabilityStatus`
  - `benchmarkComparison`
  - `exitDiagnostics`
  - `dataCoverage` or `dataCoveragePercent`
  - `calculationAudit`
  - existing trade count
- classify runs into `TRUSTED_REVIEW`, `PARTIAL_REVIEW`, `DIAGNOSTIC_ONLY`, `LEGACY_REPAIRED`, or `WITHHELD`
- render the same disposition label and same summary in both saved-run list and selected-run detail
- preserve current supporting evidence panels and current research-support wording

## Explicitly Deferred

- trade-level structured rule IDs or invalidation trace IDs
- Prisma/schema or generated-file changes
- repository/controller/router/validation work
- frontend API client, hook, or feature-route work
- Strategy Framework source changes
- Trade Plan Risk Engine changes
- simulation-math, benchmark-math, or ranking-model changes
- shared UI/navigation work

## Dependency Notes

- No schema, route, shared UI, or generated-file blocker exists for this first child.
- Existing run `metrics` JSON is sufficient for additive run-level fields.
- Existing saved-run list and detail surfaces already render most supporting evidence, so the UI work stays page-local.
- Team 00 must keep this packet as the only active writer set for `backtesting-strategy-lab` service/types/doc/test and page/types/UI-spec files during the implementation pass.

## QA Handoff Needed

Team 04 should prepare the QA plan for this narrowed packet now.

Required QA focus:

- backend service coverage for trusted, partial, diagnostic-only, legacy-repaired, and withheld review outcomes
- explicit proof that benchmark unavailable, weak end-of-test exits, insufficient history, and low trade count become visible disposition reasons
- list/detail normalization coverage for the same run
- feature-local UI smoke coverage for disposition label plus reason summary in both list and detail
- regression coverage that current calculation-audit and benchmark evidence remain visible and that no direct-advice language appears

Suggested focused commands after implementation exists:

```powershell
cd backend
npm.cmd test -- backtesting-strategy-lab.service.test.ts --runInBand
```

```powershell
cd frontend
npm.cmd run test:ui -- backtesting-strategy-lab.spec.ts --workers=1
npm.cmd run build
```

## Stop Conditions

Stop and return to Team 00 / Architect if implementation requires:

- Prisma/schema, migrations, or generated files
- repository/controller/router/validation or route-registry changes
- shared UI or shared backend utility changes
- frontend API client, hook, or feature-route changes
- `strategy-framework` or `trade-plan-risk-engine` source edits
- simulation or benchmark math changes
- any trade-level structured rule-traceability expansion beyond this child

## Next Gate

Team 04 QA planning can start now.

Team 00 can evaluate `CF-W1-BT-02` for Ready promotion as one bounded no-schema backtesting packet after the QA handoff is accepted.
