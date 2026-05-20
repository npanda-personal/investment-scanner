# CF-W1-BT-03 Work Packet

Date: 2026-05-18

## Work Item

Backtesting proof-basis / overfit guardrail.

## State

Ready candidate.

This packet is bounded to one no-schema `backtesting-strategy-lab` implementation pass. It is not approved for application code until Team 04 QA planning and Team 00 Ready promotion are complete.

This packet is additive and separate from:

- `CF-W1-BT-02` backtesting outcome review traceability
- `CF-W1-BT-01A` backtesting DQ fail-closed characterization

2026-05-19 Team 03 refresh: Team 04 QA planning now exists for this packet, so the remaining readiness gate is Team 00 Ready promotion plus explicit one-writer sequencing. Verdict remains `ACCEPT/READY-CANDIDATE`.

## Owner / Lane / Modules

- Architecture owner: Team 03 Architecture Factory
- Future implementation owner: Team 06 Strategy / Signals / Risk
- Lane: Lane 2
- Backend module: `backtesting-strategy-lab`
- Frontend feature: `backtesting-strategy-lab`

## Smallest First Child

Add one explicit proof-basis projection that tells the user:

- the run is historical single-window evidence only;
- holdout, walk-forward, and parameter-sensitivity validation are absent;
- the sample is adequate, weak, or empty; and
- the result is review-only, weak evidence, or not usable for reliability judgment yet.

This child is intentionally bounded to current module evidence only. It does not build any new validation engine.

## Allowed Files After Ready Promotion

- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.types.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.md`
- `backend/tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.test.ts`
- `frontend/src/features/backtesting-strategy-lab/types.ts`
- `frontend/src/features/backtesting-strategy-lab/components/BacktestingStrategyLabPage.tsx`
- `frontend/tests/ui/backtesting-strategy-lab.spec.ts`

## Branch / Worktree Requirement

Worktree required: yes.

Recommended future isolation after Team 00 promotion:

- Branch: `codex/team06-strategy-signal/CF-W1-BT-03`
- Worktree: `../investment-scanner-worktrees/team06-CF-W1-BT-03`
- Base rule: stack on accepted `CF-W1-BT-02` branch/commit if that accepted work remains parked outside `dev`; otherwise use current `dev` after `BT-02` is integrated

Reason: the implementation reservation is the same writer set as `CF-W1-BT-02` and overlaps the `CF-W1-BT-01A` backend doc/test subset. It must be one explicit backtesting writer, not a parallel shared-workspace edit.

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
- `backend/src/modules/data-quality-engine/**`
- `backend/src/modules/market-data-foundation/**`
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

- add additive `proofBasis` metrics fields, or stable equivalents
- derive the new fields from current module evidence only:
  - `availabilityStatus`
  - `numberOfTrades`
  - `dataCoverage` or `dataCoveragePercent`
  - `benchmarkComparison`
  - `exitDiagnostics`
  - `realismWarnings`
  - `calculationAudit`
- explicitly disclose:
  - single-window-only status
  - no holdout validation
  - no walk-forward validation
  - no parameter-sensitivity evidence
- classify runs into:
  - `REVIEW_ONLY`
  - `WEAK_EVIDENCE`
  - `DO_NOT_USE_FOR_RELIABILITY`
- render the same proof-basis label and same summary in both saved-run list and selected-run detail
- preserve current supporting evidence panels and current research-support wording

## Explicitly Deferred

- walk-forward engine implementation
- holdout engine implementation
- parameter sweep or optimizer implementation
- Monte Carlo or advanced quant validation expansion
- BT-02 review-disposition merge
- BT-01A DQ policy change
- Prisma/schema or generated-file changes
- repository/controller/router/validation work
- frontend API client, hook, or feature-route work
- Strategy Framework source changes
- Trade Plan Risk Engine changes
- simulation-math, benchmark-math, or ranking-model changes
- shared UI/navigation work

## Dependency Notes

- No schema, route, shared UI, or generated-file blocker exists for this first child.
- Existing run `metrics` JSON is sufficient for additive proof-basis fields.
- Existing saved-run list and detail surfaces already render most supporting evidence, so the UI work stays page-local.
- Team 04 QA plan exists at `04-qa/CF-W1-BT-03-qa-plan.md`.
- Team 00 must keep this packet out of parallel implementation with `CF-W1-BT-02`; the future writer set is the same.
- Team 00 must also sequence the BT-01A doc/test writer overlap explicitly if that characterization child remains active.

Recommended sequencing:

1. finish or stack the parked `CF-W1-BT-02` backtesting writer set first;
2. run `CF-W1-BT-03` as the next backtesting trust child; and
3. keep BT-01A as a separate characterization-only pass unless Team 00 deliberately combines the writer sets.

## QA Handoff

Team 04 has prepared the QA plan for this bounded packet. Future executable QA remains blocked until Team 00 promotes the packet and Team 06 submits a bounded implementation handoff.

Required QA focus:

- backend service coverage for:
  - explicit single-window-only disclosure
  - missing holdout, walk-forward, and parameter-sensitivity evidence
  - `REVIEW_ONLY`
  - `WEAK_EVIDENCE` low-trade-count run
  - `WEAK_EVIDENCE` benchmark-gap run
  - `WEAK_EVIDENCE` weak-exit run
  - `WEAK_EVIDENCE` low-coverage run
  - `DO_NOT_USE_FOR_RELIABILITY` no-trade run
  - `DO_NOT_USE_FOR_RELIABILITY` insufficient-history run
  - `DO_NOT_USE_FOR_RELIABILITY` legacy-invalid aggregate run
- feature-local UI smoke coverage for proof-basis label plus summary in both list and detail
- regression coverage that current benchmark, coverage, warning, and calculation-audit evidence remain visible
- explicit proof that no fabricated walk-forward, holdout, or parameter-sensitivity claims appear

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

- walk-forward, holdout, or parameter-sensitivity engines
- Prisma/schema, migrations, or generated files
- repository/controller/router/validation or route-registry changes
- shared UI or shared backend utility changes
- frontend API client, hook, or feature-route changes
- `data-quality-engine`, `market-data-foundation`, `strategy-framework`, or `trade-plan-risk-engine` source edits
- simulation or benchmark math changes
- a combined BT-02 disposition merge to make the child coherent

## Next Gate

Team 04 QA planning can start now.

Team 00 can evaluate `CF-W1-BT-03` for Ready promotion as one bounded no-schema backtesting packet after the QA handoff is accepted and the backtesting writer sequence is declared.
