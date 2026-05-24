# CF-W1-BT-04 QA Plan

Date: 2026-05-24

Owner: Team 04 QA Factory

## Work Item

`CF-W1-BT-04` - backtesting saved-run freshness and current-proof labels.

## QA Status

`ACCEPT / READY-FOR-TEAM00-EVALUATION`

Docs-only QA planning is prepared from the requirement, architecture review, contract, work packet, Decision Inbox, and current `backtesting-strategy-lab` source/test surface. Executable QA remains blocked until Team 00 promotes one exact implementation handoff for the reserved backtesting files.

No Team 04 planning blocker remains. Team 00 can now evaluate this packet for Ready promotion as an independent Team 06 item, provided it records the required stacked base and one-writer sequencing.

## Verdict

The `CF-W1-BT-04` QA plan is ready for Team 00 Ready evaluation as one bounded `backtesting-strategy-lab` child.

Remaining Team 00 readiness work after this QA plan:

- copy the exact seven-file writer set from the architecture/work-packet packet into the Ready queue;
- enforce the required base `CF-W1-BT-03` commit `8f984b1`;
- reserve one dedicated backtesting writer worktree for Team 06;
- keep the packet independent from ongoing `CF-W1-TSC-01A-TREV` rework.

## Scope

First-slice QA for additive current-proof freshness labeling in `backtesting-strategy-lab`.

Planned in-scope implementation surfaces, once Team 00 promotes an exact handoff:

- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.types.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.md`
- `backend/tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.test.ts`
- `frontend/src/features/backtesting-strategy-lab/types.ts`
- `frontend/src/features/backtesting-strategy-lab/components/BacktestingStrategyLabPage.tsx`
- `frontend/tests/ui/backtesting-strategy-lab.spec.ts`

Out of scope for this first child:

- Prisma schema, migrations, generated files, or saved-run persistence redesign
- `backtesting-strategy-lab` repository, controller, router, validation, module, or public export changes
- backend or frontend route registry changes
- `frontend/src/features/backtesting-strategy-lab/api/**`
- `frontend/src/features/backtesting-strategy-lab/hooks/**`
- `frontend/src/features/backtesting-strategy-lab/routes.tsx`
- `strategy-framework`, `trade-plan-risk-engine`, `market-data-foundation`, or other module source/test changes
- shared UI, shared backend utilities, package manifests, provider/live-data, startup/backfill, paid/cloud, broker, or telemetry scope
- simulation-math, benchmark-math, proof-basis, or ranking rewrites done to manufacture fresher-looking proof

## Contract Inputs Reviewed

- `10-requirements/CF-W1-BT-04-backtesting-run-freshness-and-current-proof-labels-requirement.md`
- `03-architecture/CF-W1-BT-04-architecture-review.md`
- `06-contracts/CF-W1-BT-04-backtesting-run-current-proof-freshness-contract.md`
- `08-work-packets/CF-W1-BT-04-work-packet.md`
- `99-decision-inbox/open-decisions.md`
- current `backtesting-strategy-lab` source/tests for command selection and gap confirmation:
  - `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.ts`
  - `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.types.ts`
  - `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.md`
  - `backend/tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.test.ts`
  - `frontend/src/features/backtesting-strategy-lab/types.ts`
  - `frontend/src/features/backtesting-strategy-lab/components/BacktestingStrategyLabPage.tsx`
  - `frontend/tests/ui/backtesting-strategy-lab.spec.ts`

## Current Source Alignment

- Backend types already expose `generatedAt`, `availabilityStatus`, and `calculationAudit` inputs needed for derived freshness/current-proof labeling, but there is no stable current-proof object yet.
- Current service tests already cover `LEGACY_INVALID` repair behavior and `INSUFFICIENT_HISTORY`, so the same focused test file is the right place for current/stale/repaired/limited/unavailable mapping coverage.
- The current page already renders saved-run rows, selected-run detail, availability chips, benchmark evidence, data coverage, realism warnings, exit diagnostics, and calculation-audit warnings.
- The current page does not yet render an explicit current-versus-stale proof label, so UI smoke is relevant and should stay feature-local.
- An existing Playwright spec already exercises the feature and can be extended for the current-proof label without widening into shared UI or route work.
- `open-decisions.md` shows no open Product Owner decisions blocking the bounded first child.

## Required QA Assertions

- Current-proof metadata is additive only and does not remove or rename existing run fields.
- The implementation distinguishes at least:
  - `CURRENT_PROOF`
  - `STALE_PROOF`
  - `REPAIRED_HISTORICAL`
  - `LIMITED_HISTORICAL_PROOF`
- If a run is unavailable, quarantined, or otherwise cannot truthfully map into one of the four proof states, the surface shows a visible reason instead of implying freshness.
- The saved-run list row and the selected-run detail panel show the same label and the same summary for the same run.
- Mapping precedence is stable:
  - repaired-historical evidence must not be mislabeled as current proof;
  - structural limitation evidence must not be mislabeled as current proof;
  - stale proof must explain that a newer comparable run exists;
  - missing/unavailable proof basis must not silently collapse into a positive freshness label.
- Existing benchmark, availability, data-coverage, realism-warning, exit-diagnostic, and calculation-audit surfaces remain visible after the additive label is introduced.
- Historical saved runs remain backward-compatible when the freshness packet is derived at read time from existing fields.
- No fabricated walk-forward, holdout, forward-validation, optimizer, or parameter-sensitivity proof is introduced.
- No arbitrary target, reward/risk, `R:R`, Trade Plan, or advice-like wording is introduced.

## Scenario Matrix

| Scenario | Expected QA assertion after implementation |
| --- | --- |
| Current proof | The latest comparable saved run with no repair warning and no structural limitation maps to `CURRENT_PROOF`; the list row and selected detail both show the same current-proof label and concise summary. |
| Stale proof | An older comparable saved run maps to `STALE_PROOF`; the summary explicitly says the run is older than the latest comparable proof, and both list/detail surfaces agree. |
| Repaired historical proof | A run with `calculationAudit.aggregateStatus = LEGACY_INVALID` or equivalent repair-only history maps to `REPAIRED_HISTORICAL`; it stays reviewable but cannot read like untouched current proof. |
| Partial / limited historical proof | A run limited by insufficient history, missing price history, low data coverage, benchmark unavailability, or no trades maps to `LIMITED_HISTORICAL_PROOF`; the cautionary basis is visible and does not overstate proof quality. |
| Missing or unavailable proof basis | A run that is unavailable, quarantined, or otherwise not trustworthy enough to classify shows a visible reason instead of any positive freshness label. |
| List/detail normalization | The same saved run shows the same label and same summary in the saved-run list row and in the selected-run detail panel. |
| Supporting evidence regression | Benchmark, availability, data coverage, realism-warning, exit-diagnostic, and calculation-audit surfaces remain visible after the freshness packet is added. |
| Language safety | UI copy, DTO summaries, docs, and tests stay research-supportive and do not introduce arbitrary target, reward/risk, `R:R`, buy/sell, or advice wording. |
| Forbidden-scope attempt | Any repository, route, schema, shared UI, package, generated-file, provider/live-data, startup/backfill, or cross-module widening is a QA reject. |

## Focused Command Guidance

Commands below are guidance only. They were not run during this docs-only QA planning task.

Focused backend tests after Team 00 promotion, stacked backtesting base confirmation, and implementation handoff:

```powershell
cd backend
npm.cmd test -- backtesting-strategy-lab.service.test.ts --runInBand
```

Recommended backend build after accepted implementation and memory/resource check:

```powershell
cd backend
npm.cmd run build
```

Required frontend build after accepted implementation because the bounded child includes feature-local UI files:

```powershell
cd frontend
npm.cmd run build
```

Required feature-local UI smoke after accepted UI implementation, one Playwright worker, and a local startup/resource plan:

```powershell
cd frontend
npm.cmd run test:ui -- backtesting-strategy-lab.spec.ts --workers=1
```

Recommended language scan after implementation:

```powershell
rg -n "price target|profit target|target price|reward/risk|R:R|buy now|sell now|must buy|must sell|guaranteed|financial advice|automated trade instruction" backend/src/modules/backtesting-strategy-lab backend/tests/modules/backtesting-strategy-lab frontend/src/features/backtesting-strategy-lab frontend/tests/ui/backtesting-strategy-lab.spec.ts
```

## Exact UI Smoke Skipped-Check Policy

If the feature-local UI smoke is blocked during executable QA, record all four items exactly:

- `exact blocker`: for example missing local startup plan, Playwright environment failure, active overlapping Playwright run, memory at or above the AGENTS threshold, or missing/incorrect reserved UI handoff
- `skipped command`: `cd frontend` then `npm.cmd run test:ui -- backtesting-strategy-lab.spec.ts --workers=1`
- `risk`: user-visible freshness/current-proof labels in saved-run list and selected-run detail remain unverified; list/detail consistency and language-safety evidence are incomplete
- `next owner`: `Team 06` if implementation/spec gaps caused the block, `Team 00` if sequencing/startup/resource gating caused the block, then return to `Team 04` for rerun after the blocker is cleared

UI smoke is relevant for this child. Do not substitute a heading-only check, a backend-only pass, or a broad suite in place of the reserved feature-local smoke.

## Forbidden Scope Validation Checklist

Reject the packet if implementation touches any of the following:

- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.repository.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.controller.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.router.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.validation.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.module.ts`
- `backend/src/modules/backtesting-strategy-lab/index.ts`
- `backend/tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.routes.test.ts`
- `backend/tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.validation.test.ts`
- `frontend/src/features/backtesting-strategy-lab/api/**`
- `frontend/src/features/backtesting-strategy-lab/hooks/**`
- `frontend/src/features/backtesting-strategy-lab/routes.tsx`
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- backend or frontend route registries
- `backend/src/modules/strategy-framework/**`
- `backend/src/modules/trade-plan-risk-engine/**`
- `backend/src/modules/market-data-foundation/**`
- shared backend utilities
- shared frontend components
- package manifests
- generated files
- provider/live-data, startup/backfill, paid/cloud, broker, or telemetry scope

Also reject if Team 00 attempts to run this packet from plain `dev` instead of the accepted `CF-W1-BT-03` base `8f984b1`.

## Stop Conditions

Stop QA and return to Team 00 / Architect if:

- implementation requires repository, route, controller, validation, schema, or shared UI work to complete the first child;
- implementation changes simulation math, proof-basis math, benchmark math, or saved-run storage shape;
- implementation fabricates forward-proof claims instead of disclosing current historical evidence honestly;
- implementation adds target-price, reward/risk, `R:R`, Trade Plan, or advice-like framing;
- implementation breaks list/detail consistency for the same run;
- implementation is not sequenced under one dedicated backtesting writer on the required stacked base.

## Evidence Required Later

- Exact implementation handoff limited to the reserved backtesting backend and feature-local frontend files
- Scenario evidence for current, stale, repaired-historical, limited-historical, and missing/unavailable classification paths
- Proof that the same run shows the same label and summary in list and detail surfaces
- Proof that benchmark, availability, data-coverage, realism-warning, exit-diagnostic, and calculation-audit evidence remained visible
- Focused backend test output
- Backend build output
- Frontend build output
- Feature-local UI smoke output, or the exact skipped-check record if blocked
- Language-scan result or equivalent explicit assertion evidence
- Explicit note that no forbidden scope, no cross-module widening, and no plain-`dev` base drift occurred
