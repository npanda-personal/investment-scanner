# CF-W1-BT-03 QA Plan

Date: 2026-05-18

Owner: Team 04 QA Factory

Status: Backtesting proof-basis / overfit guardrail QA plan prepared for the bounded first child. QA-plan ready for Team 00 Ready evaluation as one bounded no-schema `backtesting-strategy-lab` slice, with one sequencing constraint: Team 00 must stack or sequence the future implementation under one explicit backtesting writer because the BT-03 writer set overlaps `CF-W1-BT-02` and the backend doc/test subset overlaps `CF-W1-BT-01A`. Executable validation remains blocked until Team 00 promotes one exact implementation handoff for the reserved backend and feature-local frontend files.

## Verdict

ACCEPT/READY-FOR-TEAM00-EVALUATION

No QA-plan blocker remains. The only remaining gates are implementation-time gates owned by Team 00:

- explicit Ready promotion for `CF-W1-BT-03`
- one-writer sequencing against `CF-W1-BT-02`
- explicit handling of the `CF-W1-BT-01A` backend doc/test overlap if BT-01A remains active

## Scope

Validation plan for one additive run-level proof-basis projection in `CF-W1-BT-03`.

In-scope surfaces after Team 00 Ready promotion:

- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.types.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.md`
- `backend/tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.test.ts`
- `frontend/src/features/backtesting-strategy-lab/types.ts`
- `frontend/src/features/backtesting-strategy-lab/components/BacktestingStrategyLabPage.tsx`
- `frontend/tests/ui/backtesting-strategy-lab.spec.ts`

Out of scope for this first child:

- walk-forward engines, holdout engines, parameter sweeps, optimizers, Monte Carlo, or any advanced quant validation expansion
- Prisma, migrations, generated files, persistence identity changes, or saved-run storage changes
- `backtesting-strategy-lab` repository, controller, router, validation, module, public export, API client, hooks, feature routes, or backend/frontend route registry changes
- `data-quality-engine`, `market-data-foundation`, `strategy-framework`, or `trade-plan-risk-engine` source changes
- simulation math, benchmark math, ranking math, action semantics, evaluator semantics, or any source change made only to manufacture stronger proof
- shared UI, shared utilities, package manifests, providers, startup/backfill, live-provider, paid/cloud, telemetry, broker, or historical-doc edits
- silent coupling to `CF-W1-BT-02` review-disposition fields or `CF-W1-BT-01A` DQ characterization semantics

This plan does not approve application source edits, tests, builds, services, or Ready movement. It records the QA packet only.

## Contract Inputs And Current Source Alignment

Primary planning inputs:

- `03-architecture/CF-W1-BT-03-architecture-review.md`
- `06-contracts/CF-W1-BT-03-backtesting-proof-basis-overfit-guardrail-contract.md`
- `08-work-packets/CF-W1-BT-03-work-packet.md`
- `10-requirements/CF-W1-BT-03-backtesting-proof-basis-overfit-guardrail-requirement.md`

Current backtesting source surfaces already expose the evidence this child needs:

- `backtesting-strategy-lab.service.ts` already computes `availabilityStatus`, `numberOfTrades`, `dataCoverage`, `dataCoveragePercent`, `benchmarkComparison`, `exitDiagnostics`, `realismWarnings`, and `calculationAudit`.
- `backtesting-strategy-lab.service.ts` already treats `calculationAudit.aggregateStatus = LEGACY_INVALID` as withheld aggregate proof and already surfaces weak-evidence warning inputs such as low trade count, benchmark gaps, low coverage, and weak end-of-test exits.
- `backtesting-strategy-lab.service.test.ts` already covers no-trade, insufficient-history, benchmark-unavailable, and legacy-invalid paths that the proof-basis layer can normalize instead of recomputing from new engines.
- `BacktestingStrategyLabPage.tsx` already renders availability, benchmark, data-coverage, realism-warning, exit-diagnostic, and calculation-audit evidence, so this child only needs additive proof-basis framing plus list/detail normalization.
- `frontend/tests/ui/backtesting-strategy-lab.spec.ts` already exists as a feature-local smoke surface, so UI coverage can stay local to the feature.
- `backtesting-strategy-lab.md` already states that the module does not own walk-forward optimization, Monte Carlo, or advanced quant research; QA must preserve that boundary in both payloads and UI copy.

## Required QA Assertions

- Run-level proof-basis framing is additive. Existing `availabilityStatus`, `benchmarkComparison`, `exitDiagnostics`, `realismWarnings`, `dataCoverage`, `dataCoveragePercent`, and `calculationAudit` remain present and unrenamed.
- Returned run metrics expose stable equivalents of:
  - `proofBasis.reliabilityStatus`
  - `proofBasis.singleWindowStatus`
  - `proofBasis.holdoutValidationStatus`
  - `proofBasis.walkForwardValidationStatus`
  - `proofBasis.parameterSensitivityStatus`
  - `proofBasis.sampleEvidenceStatus`
  - `proofBasis.proofBasisSummary`
  - `proofBasis.proofBasisReasons`
- Every completed run explicitly discloses that current proof is:
  - single-window only
  - missing holdout validation
  - missing walk-forward validation
  - missing parameter-sensitivity evidence
- Backend service coverage proves `REVIEW_ONLY`, `WEAK_EVIDENCE`, and `DO_NOT_USE_FOR_RELIABILITY`.
- `REVIEW_ONLY` coverage proves the run still discloses historical-only proof with no broader validation evidence, even when no weak-evidence or blocked condition applies.
- `WEAK_EVIDENCE` coverage explicitly proves the following conditions can drive a weak-evidence result while preserving the same historical-only disclosure:
  - low trade count
  - benchmark unavailable
  - weak end-of-test exit distribution
  - low data coverage
- `DO_NOT_USE_FOR_RELIABILITY` coverage explicitly proves the following conditions block reliability judgment:
  - no trades
  - insufficient history
  - `LEGACY_INVALID` aggregate proof
- Weak-evidence and do-not-use categories remain additive to the explicit absence reasons. They must not replace the single-window / no-holdout / no-walk-forward / no-parameter-sensitivity disclosure.
- Saved-run list and selected-run detail must show the same proof-basis label and the same proof-basis summary for the same run.
- Existing benchmark, availability, data-coverage, warning, exit-diagnostic, and calculation-audit evidence remains visible as supporting proof after the new fields are added.
- Research-support wording remains intact. No direct advice, `buy now`, `sell now`, `price target`, `profit target`, `guaranteed`, `validated`, `proven`, broker, or automation wording is introduced.
- QA must reject the packet if implementation fabricates holdout, walk-forward, or parameter-sensitivity results or widens into forbidden files, engines, schema, routes, shared UI, simulation rewrites, or cross-module source.

## Scenario Matrix

| Scenario | Expected QA assertion after implementation |
| --- | --- |
| Review-only baseline | Completed run with usable aggregate proof, adequate sample, available benchmark, acceptable exit distribution, and acceptable coverage maps to `REVIEW_ONLY` while still disclosing `SINGLE_WINDOW_ONLY` and all three `NOT_RUN` broader-validation states. |
| Weak evidence from low trades | `numberOfTrades > 0` and `< 10` maps to `WEAK_EVIDENCE` with visible low-sample reasoning and unchanged historical-only disclosure. |
| Weak evidence from benchmark unavailable | `benchmarkComparison.benchmarkDataStatus = UNAVAILABLE` maps to `WEAK_EVIDENCE` with a visible benchmark-gap reason and unchanged benchmark evidence panel. |
| Weak evidence from weak exits | `exitDiagnostics.endOfTestExitPercent >= 0.4` maps to `WEAK_EVIDENCE` with a visible weak-exit reason and unchanged exit-diagnostic evidence. |
| Weak evidence from low coverage | `dataCoveragePercent` below the current preferred threshold maps to `WEAK_EVIDENCE` with a visible low-coverage reason and unchanged coverage evidence. |
| Do-not-use from no trades | `numberOfTrades = 0` maps to `DO_NOT_USE_FOR_RELIABILITY` with a visible no-trades reason and historical-only disclosure still present. |
| Do-not-use from insufficient history | `availabilityStatus = INSUFFICIENT_HISTORY` maps to `DO_NOT_USE_FOR_RELIABILITY` with a visible insufficient-history reason. |
| Do-not-use from legacy invalid aggregate | `calculationAudit.aggregateStatus = LEGACY_INVALID` maps to `DO_NOT_USE_FOR_RELIABILITY`; aggregate proof stays withheld and calculation-audit warnings remain visible. |
| List/detail normalization | The same saved run shows the same proof-basis label and the same proof-basis summary in the list row and in the selected detail view. |
| Supporting evidence regression | Benchmark, availability, data-coverage, realism-warning, exit-diagnostic, and calculation-audit evidence remains visible after the additive proof-basis fields are rendered. |
| No fabricated broader validation | No payload or UI copy claims holdout, walk-forward, or parameter-sensitivity validation was run when current module evidence cannot prove that. |
| Backward-compatible payload fields | Current metrics consumers continue to receive existing fields unchanged; the new proof-basis fields are additive only. |
| Scope drift attempt | Any forbidden file touch or any walk-forward/holdout/parameter-sweep engine work, schema change, route change, shared-UI change, simulation-math rewrite, or cross-module source change is a QA reject. |

## Feature-Local UI Smoke Expectations

- `backtesting-strategy-lab.spec.ts` should remain the only UI smoke surface for this slice.
- Smoke must prove one visible proof-basis state on the page, not just that the page loads:
  - a proof-basis label is visible for the selected run
  - a concise proof-basis summary is visible for the selected run
  - the same label and same summary are visible in the saved-run list row for that run
- Smoke must prove existing supporting evidence remains visible with the new framing:
  - benchmark evidence
  - availability evidence
  - data-coverage evidence
  - warning evidence
  - exit-diagnostic evidence
  - calculation-audit evidence
- Smoke must verify language stays evidence-first:
  - disclose historical-only proof
  - disclose missing broader validation honestly
  - do not introduce `buy now`, `sell now`, `price target`, `profit target`, `guaranteed`, `validated`, `proven`, broker, or automation phrasing
  - do not fabricate holdout, walk-forward, or parameter-sensitivity proof badges

## Sequencing Constraint

This packet is QA-plan ready, but not parallel-safe for implementation in shared `dev`.

- The future writer set exactly overlaps `CF-W1-BT-02`.
- The backend doc/test subset overlaps `CF-W1-BT-01A`.
- Team 00 must either:
  - land or park `CF-W1-BT-02` first and then stack `CF-W1-BT-03`;
  - merge BT-02 and BT-03 under one dedicated backtesting writer worktree; or
  - defer BT-01A until the backtesting service/doc/test writer set is clear.

QA should reject any future implementation handoff that ignores this one-writer requirement.

## Focused Command Guidance

Commands below are guidance only. They were not run during this docs-only QA planning task.

Future focused validation after Team 00 Ready promotion, explicit backtesting writer sequencing, and implementation handoff:

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
- `data-quality-engine`, `market-data-foundation`, `strategy-framework`, or `trade-plan-risk-engine` source/test edits as a backdoor for proof framing
- Prisma generate, migrate, db push, db execute, or any schema/data mutation
- provider/live-market, paid/cloud, telemetry, broker, startup/backfill, or broad backend suites
- fabricated holdout, walk-forward, parameter-sensitivity, optimizer, or Monte Carlo claims

## Stop Conditions

Stop QA and return to Team 00 / Architect if:

- implementation expands beyond the reserved `backtesting-strategy-lab` service/types/doc/test and feature-local types/page/UI spec files
- implementation touches repository, controller, router, validation, module, public export, API client, hooks, feature routes, backend/frontend route registries, or shared UI/shared utilities
- implementation requires Prisma/schema/generated changes or saved-run persistence identity changes
- implementation changes simulation math, benchmark math, ranking math, or any cross-module source
- implementation fabricates holdout, walk-forward, or parameter-sensitivity proof instead of disclosing those states as `NOT_RUN` or stable equivalents
- implementation hides or replaces current benchmark, availability, data-coverage, warning, exit-diagnostic, or calculation-audit evidence instead of keeping it visible as supporting proof
- Team 00 attempts to run BT-03 in parallel with `CF-W1-BT-02` or without resolving the `CF-W1-BT-01A` backend doc/test overlap under one explicit writer

## Evidence Required Later

- Exact implementation handoff limited to the reserved `backtesting-strategy-lab` backend and feature-local frontend files
- Scenario evidence for `REVIEW_ONLY`, `WEAK_EVIDENCE`, and `DO_NOT_USE_FOR_RELIABILITY`
- Explicit weak-evidence evidence for low trade count, benchmark unavailable, weak end-of-test exit dominance, and low data coverage
- Explicit do-not-use evidence for no trades, insufficient history, and `LEGACY_INVALID` aggregate proof
- Proof that every completed run still discloses single-window-only plus no holdout / no walk-forward / no parameter-sensitivity validation
- List/detail normalization evidence for the same run
- Proof that existing benchmark, availability, data-coverage, warning, exit-diagnostic, and calculation-audit evidence remains visible
- Focused service-test output and feature-local UI smoke output only after approval
- Build output only after approval
- Explicit note that no schema, route, shared-file, engine, simulation-math, benchmark-math, or cross-module source widening occurred
