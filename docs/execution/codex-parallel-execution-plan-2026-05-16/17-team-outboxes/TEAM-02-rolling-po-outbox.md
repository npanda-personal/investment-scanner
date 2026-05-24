# TEAM-02 Rolling PO Outbox

Date: 2026-05-24

## Assignment

Keep the requirement pipeline warm while active implementation gates run. Prioritize direct investor/trader value: market data freshness/provenance, DQ readiness, explainable signals/triggers, active signal health, exit/invalidation evidence, and backtesting/calibration trust.

## Files Changed

- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/next-top-10-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/top-10-ready-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W2-TSC-04-today-review-no-target-candidate-language-cleanup-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W2-BT-05-backtesting-rule-exit-invalidation-evidence-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-02-rolling-po-outbox.md`

## Audit Read

- Read root `AGENTS.md`.
- Read current top candidate files.
- Inspected Market Data Foundation, Data Quality Engine, Signal Generation Engine, Today Review, Backtesting, Signal Quality, Calibration, and Strategy Decision docs/source references.
- Confirmed `CF-W1-MD-05` and `CF-W1-TSC-02A-TREV-HEALTH` are active and must not be reassigned as fresh pulls.
- Confirmed `CF-W1-STRAT-04`, `CF-W1-SQLAB-03`, accepted parked items, and active promoted items remain out of fresh-pull rankings.

## New / Updated Requirements

- Created `CF-W2-TSC-04` to capture Today Review no-target/no-R:R candidate language cleanup as a planning-only requirement.
- Created `CF-W2-BT-05` to separate documented rule exit/invalidation evidence from optional take-profit simulation assumptions in Backtesting.
- Re-ranked the top candidate files so signal DQ enforcement (`CF-W2-SIG-01A`, `CF-W1-SIG-LATEST-01`) and trusted-candidate language/evidence work outrank admin, subscription, notification, and Copilot convenience work.

## Revised Priority Read

1. `CF-W1-MD-05` remains active and unreassigned.
2. `CF-W1-TSC-02A-TREV-HEALTH` remains active and unreassigned.
3. `CF-W1-TSC-03` is the next Today Review supporting-trust architecture-prep candidate.
4. `CF-W2-SIG-01A` is the next signal-side DQ fail-closed candidate for Team 00 Ready evaluation.
5. `CF-W1-SIG-LATEST-01` follows as latest-instrument DQ read-path enforcement.
6. `CF-W2-TSC-04` is planning-only Today Review no-target cleanup.
7. `CF-W2-BT-05` is planning-only backtesting exit/invalidation evidence cleanup.

## Blockers

- No Product Owner blocker.
- No implementation-ready item was promoted by Team 02.
- `CF-W1-DQ-02`, `CF-W1-MD-02A`, and `CF-W1-SQLAB-02B` remain blocked or proposal-only where they need storage/public-contract consent.

## Next Suggested Team 00 Action

Finish the active `CF-W1-MD-05` and `CF-W1-TSC-02A-TREV-HEALTH` gates first. Then route `CF-W1-TSC-03` to Team 03/04 if not already in progress, and evaluate `CF-W2-SIG-01A` for Ready promotion with exact Signal Generation file reservations.
