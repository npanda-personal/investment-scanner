# TEAM-06 Outbox - CF-W1-BT-04

Date: 2026-05-24

## Work Item

`CF-W1-BT-04` - Backtesting saved-run freshness and current-proof labels.

## State

Developer implementation complete. Ready for Team 04 QA Verification with one UI smoke blocker recorded.

## Owner / Lane / Module

- Owner: Team 06 - Strategy / Signal / Risk implementation
- Lane: Lane 2 - Strategy / Signals / Risk
- Backend module: `backtesting-strategy-lab`
- Frontend feature: `backtesting-strategy-lab`

## Branch / Worktree / Base

- Branch: `codex/team06-strategy-signal/CF-W1-BT-04`
- Worktree: `C:\work\repo\investment-scanner-worktrees\team06-CF-W1-BT-04`
- Starting base: `8f984b198f155fb6b10bc330818fbdeaad8360d0` (`feat: add backtesting proof basis guardrail`)

## Files Changed

- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.types.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.md`
- `backend/tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.test.ts`
- `frontend/src/features/backtesting-strategy-lab/types.ts`
- `frontend/src/features/backtesting-strategy-lab/components/BacktestingStrategyLabPage.tsx`
- `frontend/tests/ui/backtesting-strategy-lab.spec.ts`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-06-CF-W1-BT-04-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-BT-04-developer-handoff.md`

## Files Inspected

- `C:\work\repo\investment-scanner\AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-BT-04-backtesting-run-freshness-and-current-proof-labels-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-BT-04-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-BT-04-backtesting-run-current-proof-freshness-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-BT-04-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-BT-04-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/12-ready-queue/ready-for-implementation.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/16-team-inboxes/TEAM-06-current-assignment.md`
- Allowed backtesting source, test, UI, and doc files listed above
- Read-only: `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.repository.ts`
- Read-only: `frontend/src/features/backtesting-strategy-lab/hooks/useBacktestingStrategyLab.ts`
- Read-only: `frontend/src/features/backtesting-strategy-lab/api/backtestingStrategyLabService.ts`

## Behavior Changed

- Added additive `currentProof` metadata to saved backtesting run DTOs and metrics.
- `currentProof.status` distinguishes:
  - `CURRENT_PROOF`
  - `STALE_PROOF`
  - `REPAIRED_HISTORICAL`
  - `LIMITED_HISTORICAL_PROOF`
  - `UNAVAILABLE_PROOF_BASIS`
- Freshness is derived at read time from existing run timestamps, comparable config shape, availability status, calculation audit, data coverage, benchmark status, and trade count.
- Saved-run list and selected-run detail render the same proof freshness label and summary for the same run.
- Existing review disposition, proof-basis guardrail, benchmark, availability, data coverage, realism warning, exit diagnostic, and calculation-audit evidence are preserved.

## Contracts Changed

- Additive DTO fields only:
  - `BacktestCurrentProofStatus`
  - `BacktestCurrentProofReasonCode`
  - `BacktestCurrentProof`
  - optional `currentProof` on `BacktestMetrics`
  - optional `currentProof` on `BacktestRunDto` / frontend `BacktestRun`
- No route, query parameter, persistence, schema, simulation-math, benchmark-math, proof-basis, ranking, or saved-run storage contract changes.

## Validation

- Passed: `cd backend && npm.cmd test -- backtesting-strategy-lab.service.test.ts --runInBand`
  - Result: 1 suite passed, 22 tests passed.
- Passed: `cd backend && npm.cmd run build`
- Passed: `cd frontend && npm.cmd run build`
  - Note: existing Vite large-chunk warning remains.
- Attempted: `cd frontend && npm.cmd run test:ui -- backtesting-strategy-lab.spec.ts --workers=1`
  - First run blocked by sandbox worker process failure: `spawn EPERM`.
  - Escalated rerun timed out after 184 seconds. Failure context showed auth/bootstrap did not reach module chrome: timed out waiting for `Log out`.
- Team 00 runtime support reran the feature smoke with a fresh Vite runtime on `http://127.0.0.1:5224` using `--force`.
  - Runtime support command:

```powershell
$frontend='C:\work\repo\investment-scanner-worktrees\team06-CF-W1-BT-04\frontend'
$env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:5224'
$vite = Start-Process -FilePath npm.cmd -ArgumentList 'run','dev','--','--host','127.0.0.1','--port','5224','--strictPort','--force' -WorkingDirectory $frontend -WindowStyle Hidden -PassThru
Start-Sleep -Seconds 8
try { npm.cmd run test:ui -- backtesting-strategy-lab.spec.ts --workers=1 } finally { Stop-Process -Id $vite.Id -Force -ErrorAction SilentlyContinue }
```

  - Result: passed, `4` tests, `36.4s`.
  - Next owner: Team 04 QA Verification should rerun or accept against this resolved runtime evidence before Team 10 review.

## Forbidden Scope Confirmation

Confirmed untouched:

- Prisma schema/migrations/generated files
- Backtesting repository/controller/router/validation/module/index source
- Backend or frontend route registries
- Frontend backtesting API/hooks/routes source
- Strategy Framework, Trade Plan, Market Data, Data Quality, Signal Generation, Today Review, and other upstream/downstream module source/tests
- Shared backend utilities, shared frontend components, package manifests
- Provider/live-data/startup/backfill, paid/cloud, broker, telemetry, credentials
- Simulation math, benchmark math, proof-basis math, ranking, persistence, route contract, saved-run storage rewrites

## Assumptions / Risks / Blockers

- Assumption: comparable saved runs are grouped by strategy/scope/timeframe-like config evidence already present on the saved run, excluding generated timestamps and historical date-window values so newer comparable proof windows can stale older rows.
- Risk: repository `listRuns` still caps latest comparable discovery to the existing repository list behavior; no repository change was allowed.
- Team 04 QA must refresh its verdict after the Team 00 runtime-support Playwright pass.

## Next Gate

Team 04 QA Verification.
