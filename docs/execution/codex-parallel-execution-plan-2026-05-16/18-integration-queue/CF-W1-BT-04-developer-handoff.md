# CF-W1-BT-04 Developer Handoff

Date: 2026-05-24

## Work Item

`CF-W1-BT-04` - Backtesting saved-run freshness and current-proof labels.

## State / Mode

Developer handoff from Team 06 implementation to Team 04 QA Verification.

## Branch / Worktree

- Branch: `codex/team06-strategy-signal/CF-W1-BT-04`
- Worktree: `C:\work\repo\investment-scanner-worktrees\team06-CF-W1-BT-04`
- Base: `8f984b198f155fb6b10bc330818fbdeaad8360d0`

## Exact Files Changed

- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.types.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.md`
- `backend/tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.test.ts`
- `frontend/src/features/backtesting-strategy-lab/types.ts`
- `frontend/src/features/backtesting-strategy-lab/components/BacktestingStrategyLabPage.tsx`
- `frontend/tests/ui/backtesting-strategy-lab.spec.ts`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-06-CF-W1-BT-04-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-BT-04-developer-handoff.md`

## Exact Files Inspected

- `C:\work\repo\investment-scanner\AGENTS.md`
- Main-dev BT-04 requirement, architecture review, contract, work packet, QA plan, Ready queue, and Team 06 assignment docs
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.types.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.md`
- `backend/tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.test.ts`
- `frontend/src/features/backtesting-strategy-lab/types.ts`
- `frontend/src/features/backtesting-strategy-lab/components/BacktestingStrategyLabPage.tsx`
- `frontend/tests/ui/backtesting-strategy-lab.spec.ts`
- Read-only: `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.repository.ts`
- Read-only: `frontend/src/features/backtesting-strategy-lab/hooks/useBacktestingStrategyLab.ts`
- Read-only: `frontend/src/features/backtesting-strategy-lab/api/backtestingStrategyLabService.ts`
- Read-only: `frontend/tests/ui/support/moduleAssertions.ts`

## Behavior Changed

- Backend saved-run reads now add `currentProof` to the run and metrics.
- List and detail reads use the same derivation path so a run keeps the same proof freshness label and summary across surfaces.
- Current-proof classification covers:
  - latest comparable current proof
  - older stale proof
  - repaired historical evidence
  - limited historical proof
  - unavailable proof basis
- Frontend saved-run rows and selected detail render a `Proof Freshness` chip and summary while retaining existing review disposition and proof-basis sections.
- Frontend keeps a backward-compatible fallback for older or mocked payloads without changing API/hook/route files.

## Docs Changed

- `backtesting-strategy-lab.md` now documents the additive current-proof freshness fields, derivation inputs, statuses, and UI consistency expectation.
- This outbox and developer handoff were created for Team 04 routing.

## Contracts Changed

- Additive TypeScript-only fields:
  - `BacktestCurrentProofStatus`
  - `BacktestCurrentProofReasonCode`
  - `BacktestCurrentProof`
  - optional `currentProof` on backend/frontend run and metric DTOs
- No schema, route, query, repository, storage, simulation, benchmark, proof-basis, ranking, package, or generated-file contract changed.

## Tests Run

- `cd backend && npm.cmd test -- backtesting-strategy-lab.service.test.ts --runInBand`
  - Passed: 1 suite, 22 tests.
- `cd backend && npm.cmd run build`
  - Passed.
- `cd frontend && npm.cmd run build`
  - Passed with existing large-chunk warning.

## Tests Skipped / Blocked

- Command attempted: `cd frontend && npm.cmd run test:ui -- backtesting-strategy-lab.spec.ts --workers=1`
- Sandbox attempt failed with `spawn EPERM` while Playwright tried to spawn worker processes.
- Escalated attempt was run with `PLAYWRIGHT_BASE_URL=http://127.0.0.1:5174` and timed out after 184 seconds.
- Failure context showed module chrome was not reached: timed out waiting for authenticated `Log out` button.
- Team 00 runtime support later reran the feature smoke with a fresh Vite runtime on `http://127.0.0.1:5224` using `--force`.
- Runtime support command:

```powershell
$frontend='C:\work\repo\investment-scanner-worktrees\team06-CF-W1-BT-04\frontend'
$env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:5224'
$vite = Start-Process -FilePath npm.cmd -ArgumentList 'run','dev','--','--host','127.0.0.1','--port','5224','--strictPort','--force' -WorkingDirectory $frontend -WindowStyle Hidden -PassThru
Start-Sleep -Seconds 8
try { npm.cmd run test:ui -- backtesting-strategy-lab.spec.ts --workers=1 } finally { Stop-Process -Id $vite.Id -Force -ErrorAction SilentlyContinue }
```

- Runtime support result: Passed, `4` tests, `36.4s`.
- Next owner: Team 04 QA Verification should rerun or accept against this resolved runtime evidence before Team 10 review.

## Assumptions

- Comparable proof grouping can be derived from saved config evidence already present on the run, including strategy identity, scope, universe key, timeframe, rules, sizing, cost, risk, and data-quality filter settings.
- Historical date-window values are not included in the comparable key so a newer comparable proof window can mark an older saved run stale.
- Failed, availability-error, and legacy-repaired runs do not become the latest positive current-proof basis for other runs.

## Risks / Blockers

- Repository `listRuns` remains capped by the existing repository implementation; no repository edit was allowed.
- Playwright must be rerun in a working local auth/runtime environment.

## Shared-File Requests

None.

## Forbidden Scope Confirmation

No forbidden files were edited. No Prisma, migration, generated, route registry, repository/controller/router/validation/module/index, frontend API/hook/route, shared UI/utility, package, provider/live-data/startup/backfill, paid/cloud, broker, telemetry, or credential scope was touched.

## Next Gate

Team 04 QA Verification.
