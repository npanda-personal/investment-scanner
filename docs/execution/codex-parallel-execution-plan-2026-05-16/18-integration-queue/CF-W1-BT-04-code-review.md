# CF-W1-BT-04 - Team 10 Code Review / Release Gate

Date: 2026-05-24

Reviewer: Team 10 - Review / Release

Reviewed branch: `codex/team06-strategy-signal/CF-W1-BT-04`

Reviewed worktree: `C:\work\repo\investment-scanner-worktrees\team06-CF-W1-BT-04`

Reviewed base: `8f984b198f155fb6b10bc330818fbdeaad8360d0`

## Decision

`ACCEPT`

Architect Signoff may proceed.

## Findings

No blocking findings.

Review notes:

- Scope is clean. `git diff --name-only 8f984b198f155fb6b10bc330818fbdeaad8360d0 --` shows only the seven reserved BT-04 implementation files in the Team06 worktree, and `git status --short` shows only those seven files plus the two Team06 handoff docs as branch-local evidence. No Prisma/schema, route registry, shared UI/util, package, generated, provider/live-data, startup/backfill, paid/cloud, broker, or cross-module file drift was found.
- Backend list and detail now use the same current-proof derivation path. `listRuns()` normalizes the repository rows and passes the full list through `withCurrentProofMetadata()` at `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.ts:69-75`, and `getRun()` builds the comparable set, runs the same helper, and returns the normalized matching run at `:77-85`.
- Current-proof basis selection excludes the disallowed run types before freshness ranking. `isComparableProofCandidate()` at `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.ts:1050-1056` filters out failed runs, availability-error runs, `LEGACY_INVALID` aggregate runs, and repaired-trade-row runs, so those runs cannot become the latest positive proof basis for other runs.
- The backend status mapping covers the required set and keeps the payload additive. `deriveCurrentProof()` at `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.ts:1058-1137` maps `CURRENT_PROOF`, `STALE_PROOF`, `REPAIRED_HISTORICAL`, `LIMITED_HISTORICAL_PROOF`, and `UNAVAILABLE_PROOF_BASIS`, then attaches the same `currentProof` packet both at the run root and inside `metrics` at `:1039-1045`.
- Backend and frontend DTO changes are additive and backward-compatible. `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.types.ts:11-69,236-259` and `frontend/src/features/backtesting-strategy-lab/types.ts:11-69,196-247` add new unions/interfaces plus optional `currentProof` fields only; no existing field was removed or narrowed.
- Frontend preserves the existing review disposition, proof-basis, benchmark/coverage, and audit surfaces while adding proof freshness in the saved-run list and detail panels. `resolveRunEvidence()` continues returning review and proof-basis data and now adds `currentProof` at `frontend/src/features/backtesting-strategy-lab/components/BacktestingStrategyLabPage.tsx:168-202`. The saved-run cards keep all three surfaces together at `:528-557`, failed-run detail keeps proof freshness plus proof basis and review disposition at `:580-614`, and completed-run detail keeps proof freshness plus the pre-existing proof-basis/review sections at `:621-650`.
- The test additions are meaningful for the reserved slice. The focused backend test at `backend/tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.test.ts:643-767` asserts all five current-proof statuses and list/detail consistency for the same run. The UI spec additions at `frontend/tests/ui/backtesting-strategy-lab.spec.ts:223-312` verify repaired-historical detail rendering and matching current/stale proof freshness across the saved-run list and selected detail.
- Product language remains within research-support bounds. A reviewer `rg` scan over the changed source/test scope found no target-price, R:R, Trade Plan-first, guarantee, or direct-advice language.

## Scope Confirmation

Approved implementation files reviewed:

- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.types.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.md`
- `backend/tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.test.ts`
- `frontend/src/features/backtesting-strategy-lab/types.ts`
- `frontend/src/features/backtesting-strategy-lab/components/BacktestingStrategyLabPage.tsx`
- `frontend/tests/ui/backtesting-strategy-lab.spec.ts`

Evidence docs reviewed:

- `C:\work\repo\investment-scanner\AGENTS.md`
- `C:\work\repo\investment-scanner-worktrees\team06-CF-W1-BT-04\docs\execution\codex-parallel-execution-plan-2026-05-16\18-integration-queue\CF-W1-BT-04-developer-handoff.md`
- `C:\work\repo\investment-scanner-worktrees\team06-CF-W1-BT-04\docs\execution\codex-parallel-execution-plan-2026-05-16\17-team-outboxes\TEAM-06-CF-W1-BT-04-outbox.md`
- `C:\work\repo\investment-scanner\docs\execution\codex-parallel-execution-plan-2026-05-16\04-qa\CF-W1-BT-04-qa-verification.md`
- `C:\work\repo\investment-scanner\docs\execution\codex-parallel-execution-plan-2026-05-16\17-team-outboxes\TEAM-04-CF-W1-BT-04-qa-outbox.md`

Read-only supporting inspection:

- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.repository.ts`

## Validation

Reviewer commands run:

- `git status --short`
- `git branch --show-current`
- `git rev-parse HEAD`
- `git diff --name-only 8f984b198f155fb6b10bc330818fbdeaad8360d0 --`
- `git diff --stat 8f984b198f155fb6b10bc330818fbdeaad8360d0 --`
- `git diff 8f984b198f155fb6b10bc330818fbdeaad8360d0 -- <reserved file paths>`
- `git diff --check 8f984b198f155fb6b10bc330818fbdeaad8360d0 -- <reserved source/test file paths>`
- `rg -n "currentProof|CURRENT_PROOF|STALE_PROOF|REPAIRED_HISTORICAL|LIMITED_HISTORICAL_PROOF|UNAVAILABLE_PROOF_BASIS" ...`
- `rg -n "price target|profit target|target price|reward/risk|R:R|buy now|sell now|must buy|must sell|guaranteed|financial advice|automated trade instruction|Trade Plan" ...`

Results:

- Worktree branch matches the requested review target: `codex/team06-strategy-signal/CF-W1-BT-04`.
- `git rev-parse HEAD` resolves to the provided base commit; the candidate exists as an uncommitted scoped diff on top of that base.
- `git diff --check` passed for the reserved source/test scope.
- Language scan returned no matches in the changed source/test scope.

QA evidence relied on:

- Team 04 QA verdict: `ACCEPT`
- Passed backend focused test: `cd backend && npm.cmd test -- backtesting-strategy-lab.service.test.ts --runInBand`
- Passed backend build: `cd backend && npm.cmd run build`
- Passed frontend build: `cd frontend && npm.cmd run build`
- Passed feature-local Playwright smoke through Team00 runtime support on `http://127.0.0.1:5224`: `4` tests passed

## Skipped Checks

- Team 10 did not rerun backend build, frontend build, or Playwright in this pass because Team 04 QA already accepted the candidate and the review focus was limited to lightweight diff, scope, language, and correctness inspection.
- No live local data checks were run because this slice is a saved-run metadata/UI presentation change and the accepted QA packet already covers the focused regression surface.

## Release Risk

Residual release risk is low for the reserved BT-04 slice.

Known non-blocking residual risk:

- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.repository.ts:75-77` still caps `listRuns()` at the newest `100` rows. Because `getRun()` composes current-proof comparison from `getRun(id)` plus `listRuns(userId)` at `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.ts:77-85`, a very old saved run could still miss a newer comparable run that falls outside that repository window. This pre-existing repository limitation was not opened for edit in BT-04, so it is recorded as residual risk rather than a blocker.

## Next Gate

Route to Team 03 Architect Signoff.
