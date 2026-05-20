# TEAM-05 Assignment - CF-W1-HCTX-02 Implementation

Date: 2026-05-19

Team: Team 05 - Market Data / Data Quality

Work item: `CF-W1-HCTX-02` Historical Context data-quality coverage scope

Mode: bounded backend-only implementation

## Worktree / Branch

- Worktree: `C:\work\repo\investment-scanner-worktrees\team05-CF-W1-HCTX-02`
- Branch: `codex/team05-market-data/CF-W1-HCTX-02`

## Gate Evidence

- Requirement: `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-HCTX-02-historical-context-data-quality-coverage-scope-requirement.md`
- Architecture: `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-HCTX-02-architecture-review.md`
- Contract: `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-HCTX-02-historical-context-data-quality-coverage-scope-contract.md`
- Work packet: `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-HCTX-02-work-packet.md`
- QA plan: `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-HCTX-02-qa-plan.md`
- Team 03 outbox: `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-CF-W1-HCTX-02-architecture.md`
- Team 04 outbox: `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-CF-W1-HCTX-02-qa-plan.md`

If the worktree does not contain those latest active docs, read them from `C:\work\repo\investment-scanner`.

## Allowed Files

- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.types.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.repository.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.service.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.md`
- `backend/tests/modules/historical-context-snapshots/historical-context-snapshots.repository.test.ts`
- `backend/tests/modules/historical-context-snapshots/historical-context-snapshots.service.test.ts`

Allowed branch-local evidence docs:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-05-CF-W1-HCTX-02-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-HCTX-02-developer-handoff.md`

## Required Behavior

- Preserve existing `dataQualitySnapshots` compatibility.
- Add additive provenance semantics for Historical Context DQ coverage scope.
- Use `GLOBAL_ONLY` and `UNAVAILABLE` honestly from current source.
- Support evidence outcomes `PRESENT`, `MISSING`, `STALE`, and `UNKNOWN` where current source supports them.
- Do not emit or imply `SCOPE_PROVEN` until the module owns real scope proof.
- Do not duplicate Data Quality Engine scoring logic.

## Forbidden Scope

- Prisma schema or migrations
- generated files or generated types
- backend/frontend route registries
- `historical-context-snapshots.controller.ts`
- `historical-context-snapshots.router.ts`
- `historical-context-snapshots.validation.ts`
- `historical-context-snapshots.module.ts`
- `backend/src/modules/historical-context-snapshots/index.ts`
- Data Quality Engine source
- Signal Calibration source
- frontend source/tests or shared UI
- shared backend utilities
- package manifests
- providers, startup/backfill, scheduler, live-provider, broker, paid/cloud, telemetry

## Required Validation

Run memory check before heavy commands.

Then run:

```powershell
cd backend
npm.cmd test -- historical-context-snapshots.repository.test.ts historical-context-snapshots.service.test.ts --runInBand
npm.cmd run build
```

## Handoff

Return a developer handoff with:

- exact files changed;
- behavior changed;
- tests/build run;
- skipped checks and reasons;
- assumptions and risks;
- confirmation no forbidden files were touched.

Next gate after Team 05 handoff: Team 04 QA verification.
