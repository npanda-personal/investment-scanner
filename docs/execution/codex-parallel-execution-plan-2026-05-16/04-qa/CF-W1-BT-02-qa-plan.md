# CF-W1-BT-02 QA Plan

Date: 2026-05-18

Owner: Team 04 QA Factory

Status: Backtesting outcome review traceability QA plan prepared for the narrowed first child. QA-plan ready for Team 00 Ready evaluation as one bounded no-schema `backtesting-strategy-lab` slice. Executable validation remains blocked until Team 00 promotes one exact implementation handoff for the reserved backend and feature-local frontend files.

## Scope

Validation plan for one canonical run-level review disposition plus one shared reason summary in `CF-W1-BT-02`.

In-scope surfaces after Team 00 Ready promotion:

- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.types.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.md`
- `backend/tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.test.ts`
- `frontend/src/features/backtesting-strategy-lab/types.ts`
- `frontend/src/features/backtesting-strategy-lab/components/BacktestingStrategyLabPage.tsx`
- `frontend/tests/ui/backtesting-strategy-lab.spec.ts`

Out of scope for this first child:

- trade-level structured rule IDs, invalidation trace IDs, or any broader trade-traceability rewrite
- Prisma, migrations, generated files, persistence identity changes, or saved-run storage changes
- `backtesting-strategy-lab` repository, controller, router, validation, module, public export, API client, hooks, feature routes, or backend/frontend route registry changes
- `strategy-framework` source changes, `trade-plan-risk-engine` source changes, or any cross-module source-contract widening
- simulation math, benchmark math, ranking math, action semantics, evaluator semantics, or any source change made only to manufacture a better review outcome
- shared UI, shared utilities, package manifests, providers, startup/backfill, live-provider, paid/cloud, telemetry, broker, or historical-doc edits

This plan does not approve application source edits, tests, builds, services, or Ready movement. It records the QA packet only.

## Contract Inputs And Current Source Alignment

Primary planning inputs:

- `03-architecture/CF-W1-BT-02-architecture-review.md`
- `06-contracts/CF-W1-BT-02-backtesting-outcome-review-traceability-contract.md`
- `08-work-packets/CF-W1-BT-02-work-packet.md`
- `10-requirements/CF-W1-BT-02-backtesting-outcome-review-traceability-requirement.md`

Current backtesting source surfaces already expose the evidence this child needs:

- `backtesting-strategy-lab.service.ts` already computes `availabilityStatus`, `benchmarkComparison`, `exitDiagnostics`, `realismWarnings`, `dataCoverage`, `dataCoveragePercent`, and `calculationAudit`.
- `backtesting-strategy-lab.service.ts` already repairs legacy trade rows on read and already withholds invalid aggregate proof via `calculationAudit.aggregateStatus = LEGACY_INVALID`.
- `backtesting-strategy-lab.service.test.ts` already covers legacy invalid normalization, benchmark unavailable, registered strategy execution, scoped saved-run filtering, and insufficient-history behavior.
- `BacktestingStrategyLabPage.tsx` already renders benchmark, availability, data coverage, exit diagnostics, realism warnings, and calculation-audit evidence, so this child only needs additive review-disposition visibility and list/detail normalization.
- `frontend/tests/ui/backtesting-strategy-lab.spec.ts` already exists as a feature-local smoke surface, so UI coverage can stay local to the feature.

## Required QA Assertions

- Run-level review disposition is additive. Existing `availabilityStatus`, `benchmarkComparison`, `exitDiagnostics`, `realismWarnings`, `dataCoverage`, `dataCoveragePercent`, and `calculationAudit` remain present and unrenamed.
- Returned run metrics expose stable equivalents of:
  - `reviewDisposition`
  - `reviewDispositionReasonSummary`
  - `reviewDispositionReasons`
- Backend service coverage proves `TRUSTED_REVIEW`, `PARTIAL_REVIEW`, `DIAGNOSTIC_ONLY`, `LEGACY_REPAIRED`, and `WITHHELD`.
- Diagnostic-only coverage explicitly proves the following reasons can drive `DIAGNOSTIC_ONLY` and remain user-visible:
  - insufficient history
  - no trades
  - benchmark unavailable
  - weak end-of-test exit dominance
  - low sample size
- Withheld coverage explicitly proves `calculationAudit.aggregateStatus = LEGACY_INVALID` remains quarantined as `WITHHELD`.
- Partial review remains distinct from diagnostic-only:
  - limited availability or limited coverage can preserve bounded review value
  - diagnostic-only reasons do not get collapsed into `PARTIAL_REVIEW`
- Legacy repair remains distinct from trusted review:
  - repaired trade rows can still yield usable aggregate proof
  - repaired aggregate proof is labeled `LEGACY_REPAIRED`, not `TRUSTED_REVIEW`
- Saved-run list and selected-run detail must show the same disposition label and the same reason summary for the same run.
- Existing benchmark, availability, data-coverage, exit-diagnostic, realism-warning, and calculation-audit evidence remains visible as supporting proof after the new fields are added.
- Registered-strategy and custom-rule run execution behavior remains unchanged; this child only changes additive review framing.
- Research-support wording remains intact. No direct advice, `buy now`, `sell now`, `price target`, `profit target`, `guaranteed`, broker, or automation wording is introduced.
- QA must reject the packet if implementation touches forbidden files or changes simulation math, benchmark math, route contracts, shared UI, or cross-module source.

## Scenario Matrix

| Scenario | Expected QA assertion after implementation |
| --- | --- |
| Trusted review outcome | Completed run with usable aggregate proof, no repair-only gate, no diagnostic-only reason, and no partial gate maps to `TRUSTED_REVIEW`. |
| Partial review outcome from availability | `availabilityStatus = PARTIAL`, aggregate proof remains usable, and the run maps to `PARTIAL_REVIEW` with a visible summary. |
| Partial review outcome from coverage | Limited `dataCoverage` or `dataCoveragePercent` keeps aggregate proof usable but maps to `PARTIAL_REVIEW`, not trusted review. |
| Diagnostic-only insufficient history | `availabilityStatus = INSUFFICIENT_HISTORY` maps to `DIAGNOSTIC_ONLY` with a visible insufficient-history reason. |
| Diagnostic-only no trades | `numberOfTrades = 0` maps to `DIAGNOSTIC_ONLY` with a visible no-trades reason. |
| Diagnostic-only benchmark unavailable | `benchmarkComparison.benchmarkDataStatus = UNAVAILABLE` maps to `DIAGNOSTIC_ONLY` with a visible benchmark-unavailable reason. |
| Diagnostic-only weak exits | `exitDiagnostics.endOfTestExitPercent >= 0.4` maps to `DIAGNOSTIC_ONLY` with a visible weak-exit reason. |
| Diagnostic-only low sample | `numberOfTrades < 10` maps to `DIAGNOSTIC_ONLY` with a visible low-sample reason. |
| Legacy-repaired outcome | `calculationAudit.repairedTradeReturnCount > 0` plus usable aggregate proof maps to `LEGACY_REPAIRED` with visible repair context. |
| Withheld legacy invalid outcome | `calculationAudit.aggregateStatus = LEGACY_INVALID` maps to `WITHHELD`; aggregate proof stays withheld and warnings remain visible. |
| List/detail normalization | The same saved run shows the same disposition label and the same reason summary in the list row and in the selected detail view. |
| Supporting evidence regression | Benchmark, availability, data-coverage, exit-diagnostic, realism-warning, and calculation-audit evidence remains visible after the additive fields are rendered. |
| Backward-compatible payload fields | Current metrics consumers continue to receive existing fields unchanged; the new review fields are additive only. |
| Scope drift attempt | Any forbidden file touch or any simulation-math, benchmark-math, route-contract, shared-UI, or cross-module source change is a QA reject. |

## Feature-Local UI Smoke Expectations

- `backtesting-strategy-lab.spec.ts` should remain the only UI smoke surface for this slice.
- Smoke must prove one visible review-disposition state on the page, not just that the page loads:
  - a disposition label is visible for the selected run
  - a concise reason summary is visible for the selected run
  - the same label and same summary are visible in the saved-run list row for that run
- Smoke must prove existing supporting evidence remains visible with the new framing:
  - benchmark evidence
  - availability evidence
  - data-coverage evidence
  - exit-diagnostic evidence
  - realism-warning evidence
  - calculation-audit evidence
- Smoke must verify research-support wording remains intact:
  - keep existing research-support framing such as historical simulation caution text
  - do not introduce `buy now`, `sell now`, `price target`, `profit target`, `guaranteed`, or broker/automation phrasing

## Focused Command Guidance

Commands below are guidance only. They were not run during this docs-only QA planning task.

Future focused validation after Team 00 Ready promotion and implementation handoff:

```powershell
cd backend
npm.cmd test -- backtesting-strategy-lab.service.test.ts --runInBand
```

Approval-gated feature-local UI smoke after bounded UI work, one Playwright worker, and a local startup/resource plan:

```powershell
cd frontend
npm.cmd run test:ui -- backtesting-strategy-lab.spec.ts --workers=1
```

Approval-gated builds after accepted implementation and memory/resource checks:

```powershell
cd backend
npm.cmd run build
```

```powershell
cd frontend
npm.cmd run build
```

## Skipped / Forbidden Checks

Skipped in this planning pass:

- all executable tests
- backend/frontend builds
- local servers, services, provider checks, and UI smoke

Forbidden by default for this slice:

- repository/controller/router/validation/module/export widening
- frontend API client, hooks, route, or shared component changes
- `strategy-framework` or `trade-plan-risk-engine` source/test edits as a backdoor for review framing
- Prisma generate, migrate, db push, db execute, or any schema/data mutation
- provider/live-market, paid/cloud, telemetry, broker, startup/backfill, or broad backend suites

## Stop Conditions

Stop QA and return to Team 00 / Architect if:

- implementation expands beyond the reserved `backtesting-strategy-lab` service/types/doc/test and feature-local types/page/UI spec files
- implementation touches repository, controller, router, validation, module, public export, API client, hooks, feature routes, backend/frontend route registries, or shared UI/shared utilities
- implementation requires Prisma/schema/generated changes or saved-run persistence identity changes
- implementation changes simulation math, benchmark math, route contracts, shared UI, or any cross-module source
- implementation widens into trade-level structured rule-ID traceability despite the first-child deferral
- implementation hides or replaces current benchmark, availability, data-coverage, exit-diagnostic, realism-warning, or calculation-audit evidence instead of keeping it visible as supporting proof

## Evidence Required Later

- Exact implementation handoff limited to the reserved `backtesting-strategy-lab` backend and feature-local frontend files
- Scenario evidence for trusted, partial, diagnostic-only, legacy-repaired, and withheld outcomes
- Explicit diagnostic-only evidence for insufficient history, no trades, benchmark unavailable, weak end-of-test exit dominance, and low sample size
- Proof that `LEGACY_INVALID` aggregate evidence remains withheld
- List/detail normalization evidence for the same run
- Focused service-test output and feature-local UI smoke output only after approval
- Build output only after approval
- Explicit note that no schema, route, shared-file, simulation-math, benchmark-math, or cross-module source widening occurred
