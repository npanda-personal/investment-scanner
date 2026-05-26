# TEAM-03 Outbox - CF-W2-DOV-02 Dependency Base

Date: 2026-05-26

Team: Team 03 - Architecture Factory

Work item: `CF-W2-DOV-02` dependency-base correction

State: docs-only architecture/integration recommendation complete

## Files Changed

- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W2-DOV-02-dependency-base-correction-architecture.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-CF-W2-DOV-02-dependency-base-outbox.md`

## Files Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/16-team-inboxes/TEAM-03-current-assignment.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/09-summaries/CF-W2-DOV-02-dependency-base-verification.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W2-DOV-02-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W2-DOV-02-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W2-DOV-02-daily-overview-calibration-evidence-summary-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W2-DOV-02-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/13-implementation-evidence/CF-W2-DOV-01-ready-promotion.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/13-implementation-evidence/CF-W2-CAL-02A-ready-promotion.md`
- git history and tree-comparison evidence for:
  - `a371e2f`
  - `1be7d1a`
  - merge base `4519b14a1c10d93380cc39dbf89e70b46dc4ca25`
  - DOV-01 branch-history commit `a566799`

## Recommendation

- Result: `wait for integration sequencing`
- Classification: routine architecture/integration issue
- Not a consent blocker

Team 00 should use a dedicated release integration branch instead of stacking either accepted feature branch directly onto the other.

Recommended integration branch/worktree:

- branch: `codex/team00-integration/CF-W2-DOV-02-dependency-base`
- worktree: `C:\work\repo\investment-scanner-worktrees\team00-CF-W2-DOV-02-dependency-base`

Recommended sequencing:

1. preserve accepted `CF-W2-CAL-02A` as the Signal Calibration semantic baseline;
2. replay only accepted `a371e2f` for DOV-01 on top of that base;
3. do not merge the full DOV-01 branch history into the DOV-02 dependency base unless Team 00 separately accepts release-level review of the unrelated calibration and pipeline commits on that branch.

## Exact Signal Calibration Review Surface

Manual semantic review is required for:

- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.md`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.service.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.types.ts`
- `backend/tests/modules/signal-calibration-engine/signal-calibration-engine.service.test.ts`
- `frontend/src/features/signal-calibration-engine/components/SignalCalibrationEnginePage.tsx`
- `frontend/src/features/signal-calibration-engine/hooks/useSignalCalibrationEngine.ts`
- `frontend/src/features/signal-calibration-engine/types.ts`
- `frontend/tests/ui/signal-calibration-engine.spec.ts`

The required semantic baseline is accepted CAL-02A behavior:

- scoped `pageSummary`
- evidence-basis fields
- compare/top shared visible-scope query shape
- fail-closed missing-evidence behavior
- no frontend health fallback
- no row-proxy page summary

## Validation Gates Before DOV-02 Promotion

Team 00 must require:

1. integration-HEAD proof that CAL-02A truth is present;
2. integration-HEAD proof that DOV-01 dashboard files are present;
3. manual semantic review of the eight Signal Calibration files above;
4. CAL-02A focused validation rerun on the integration branch;
5. DOV-02 bounded writer-set check still holds with no `HomePage.tsx`, no backend, and no calibration-source reopen.

## Stop Conditions For Team 00

Stop and keep DOV-02 blocked if:

- accepted CAL-02A behavior would change in substance;
- route/schema/generated/package/shared/provider/startup/backfill scope is needed;
- replaying only `a371e2f` is not feasible and Team 00 cannot isolate the unrelated DOV-01 branch history for separate release review;
- DOV-02 would need broader DOV-01 shell work or any Signal Calibration source reimplementation.

## Tests Run

- none

## Tests Skipped

- all builds and tests

Reason: assignment was docs-only architecture/integration work.

## Next Gate

Team 00 release-integration sequencing and dependency-base verification.
