# Audit: Backtesting Proof Basis / Overfit Guardrail

Date: 2026-05-20

Mode: Read-only source inspection plus docs-only audit refresh.

## Scope Inspected

- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.md`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.types.ts`
- `backend/tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.test.ts`
- `frontend/src/features/backtesting-strategy-lab/components/BacktestingStrategyLabPage.tsx`
- `frontend/src/features/backtesting-strategy-lab/types.ts`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-BT-03-backtesting-proof-basis-overfit-guardrail-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/audit-backtesting-trade-risk.md`

No application files were modified. No tests, builds, or browser checks were run.

## Why This Surface

Backtesting is a high-value research surface for traders because it is the place where historical evidence gets interpreted as strategy quality. The current module already shows performance, drawdown, benchmark comparison, availability, and realism warnings. That is useful, but it still does not tell a user whether the run is single-window only, sample-limited, or missing broader validation proof such as holdout or walk-forward evidence.

## Concrete Evidence

- The module doc explicitly says the engine does not own walk-forward optimization, Monte Carlo, or advanced quant research, and it also says readiness labels are research/paper-test oriented only. `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.md:7` and `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.md:279`
- The service already produces warnings for low trade count, benchmark underperformance, large drawdown, and end-of-test exits, but it does not normalize those signals into an explicit proof-basis summary. `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.ts:684-693`
- The service also exposes a generic availability state, data coverage, benchmark comparison, and calculation audit, which are helpful inputs but still not a proof-basis contract. `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.ts:257-261` and `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.ts:726-751`
- The metrics type exposes those same separate fields, but there is no proof-basis field or equivalent summary object. `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.types.ts:129-169`
- The frontend renders these pieces as separate chips, alerts, and panels, including availability, benchmark, realism warnings, data coverage, and exit diagnostics, but it does not show a compact proof-basis label. `frontend/src/features/backtesting-strategy-lab/components/BacktestingStrategyLabPage.tsx:470-507` and `frontend/src/features/backtesting-strategy-lab/components/BacktestingStrategyLabPage.tsx:533-552`
- The active requirement draft for `CF-W1-BT-03` already describes the missing gap directly: a user can see historical evidence, but the workflow does not make the absence of stronger validation proof explicit. `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-BT-03-backtesting-proof-basis-overfit-guardrail-requirement.md:11-20`
- Existing tests cover simulation math, DQ filtering, benchmark gaps, and legacy invalid repair, but they do not assert a proof-basis summary or a single-window-only label. `backend/tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.test.ts:238-240`, `:393`, and `:502`

## Findings

1. The module already has enough evidence to warn, but not enough structure to explain proof quality.

This is the main gap. The current output can tell a user that a run had low trade count or weak exits, but it cannot answer the more important trust question: is this just one historical window, or is it validated enough to influence strategy judgment?

2. The current surface can overstate reliability by omission.

Because warnings are scattered across availability, benchmark, coverage, and realism diagnostics, a strong-looking run can still read like stronger proof than it is. Nothing in the current DTO or UI forces a user to see the absence of holdout, walk-forward, or parameter-sensitivity evidence.

3. The gap is contract and presentation, not a simulation rewrite.

The existing service already computes the raw ingredients needed for a proof-basis summary. The direct-value problem is that those ingredients are not folded into a concise, honest trust label for saved-run lists and selected-run detail.

## Candidate Requirement IDs

- `CF-W1-BT-03`

## Direct User-Value Gaps

- Traders cannot quickly tell whether a backtest is single-window only or missing broader validation.
- The saved-run list and selected-run detail force the user to infer trust quality from many separate warnings.
- Existing diagnostics are useful, but they do not prevent a strong-looking historical run from being overread as validated proof.
- The surface is close to useful enough already, so a small additive proof-basis contract would create real value without expanding the simulation engine.

## Blockers And Decision Needs

- No schema, route, or shared-component blocker was found in this audit scope.
- The first implementation child still needs a product/UX decision on the exact proof-basis vocabulary and state set.
- If this moves forward, Team 03 should define the additive contract and Team 04 should lock QA cases for low-trade-count, benchmark-gap, weak-exit, and single-window-only runs.

## Teams Ready For Follow-Up

- Team 00: route `CF-W1-BT-03` after current queue sequencing.
- Team 03: prepare the bounded architecture and contract refresh for proof-basis metadata.
- Team 04: prepare QA for the proof-basis states and negative cases.
- Team 06: implementation can follow only after Ready promotion and file reservation.

## Validation

- Tests run: none
- Builds run: none
- UI checks run: none
- Live local data checks run: none
- Skipped reason: docs-only audit refresh

## Files Changed By Team 01

- `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/audit-backtesting-proof-basis-2026-05-20.md`

## Files Inspected

- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.md`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.types.ts`
- `backend/tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.test.ts`
- `frontend/src/features/backtesting-strategy-lab/components/BacktestingStrategyLabPage.tsx`
- `frontend/src/features/backtesting-strategy-lab/types.ts`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-BT-03-backtesting-proof-basis-overfit-guardrail-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/audit-backtesting-trade-risk.md`
