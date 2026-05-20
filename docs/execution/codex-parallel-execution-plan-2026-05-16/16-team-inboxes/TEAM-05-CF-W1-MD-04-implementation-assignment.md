# TEAM-05 Assignment - CF-W1-MD-04 Implementation

Date: 2026-05-19

Team: Team 05 - Market Data / Data Quality

Work item: `CF-W1-MD-04` Market Data per-instrument freshness and sync provenance

Mode: bounded backend-only implementation

## Worktree / Branch

- Worktree: `C:\work\repo\investment-scanner-worktrees\team05-CF-W1-MD-04`
- Branch: `codex/team05-market-data/CF-W1-MD-04`

## Gate Evidence

- Requirement: `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-MD-04-market-data-per-instrument-freshness-sync-provenance-requirement.md`
- Architecture: `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-MD-04-architecture-review.md`
- Contract: `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-MD-04-market-data-per-instrument-freshness-sync-provenance-contract.md`
- Work packet: `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-MD-04-work-packet.md`
- QA plan: `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-MD-04-qa-plan.md`
- Team 03 outbox: `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-CF-W1-MD-04-architecture.md`
- Team 04 outbox: `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-CF-W1-MD-04-qa-plan.md`

If the worktree does not contain those latest active docs, read them from `C:\work\repo\investment-scanner`.

## Allowed Files

- `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.types.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.md`
- `backend/tests/modules/market-data-foundation/market-data.service.test.ts`

Allowed branch-local evidence docs:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-05-CF-W1-MD-04-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-MD-04-developer-handoff.md`

## Required Behavior

- Add additive, response-local per-instrument freshness evidence that distinguishes `CURRENT`, `STALE`, `MISSING`, and `UNKNOWN`.
- Add sync provenance evidence for `NO_NEW_DATA_SKIP`, `NO_OP_STORAGE`, `ROWS_STORED`, `CATCH_UP_ELIGIBLE`, and `CATCH_UP_STORED` where current service evidence supports it.
- Ensure a region-level current run cannot mask instrument-level stale/missing evidence.
- Keep catalog-row updated timestamps secondary evidence only, never data-through/currentness proof.
- Preserve existing region/asset scope behavior, batch semantics, and current sync algorithm.
- Do not duplicate Data Quality Engine readiness scoring.

## Forbidden Scope

- Prisma schema or migrations
- generated files or generated types
- route registries
- `market-data-foundation.repository.ts`
- `market-data-foundation.controller.ts`
- `market-data-foundation.router.ts`
- `market-data-foundation.validation.ts`
- workers, queues, scheduler, startup/backfill, provider/live-provider behavior
- Data Quality Engine source
- Research Hub, Today Review, frontend, shared UI, or shared backend utilities
- package manifests
- broker, paid/cloud, telemetry, Angel One, or external services

## Required Validation

Run memory check before heavy commands.

Then run:

```powershell
cd backend
npm.cmd test -- tests/modules/market-data-foundation/market-data.service.test.ts --runInBand
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
