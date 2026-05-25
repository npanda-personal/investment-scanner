# CF-W3-MDPIPE-01C Ready Promotion

Date: 2026-05-25

Owner: Team 00 - Master Orchestrator / Integration

Status: READY FOR IMPLEMENTATION

## Work Item

`CF-W3-MDPIPE-01C` - ledgered scheduled Data Quality stage after Market Data.

This slice is backend-only and bounded to:

- existing Market Data scheduler hook;
- additive changed-set evidence from the scheduled Market Data pass;
- pipeline-ledger scheduled `DATA_QUALITY` stage;
- incremental Data Quality evaluation over the changed instrument set only.

## Gate Evidence

- Requirement: `10-requirements/CF-W3-MDPIPE-01-incremental-market-data-pipeline-requirement.md`
- Architecture: `03-architecture/CF-W3-MDPIPE-01C-data-quality-scheduled-stage-architecture.md`
- Contract: `06-contracts/CF-W3-MDPIPE-01C-data-quality-scheduled-stage-contract.md`
- Work packet: `08-work-packets/CF-W3-MDPIPE-01C-work-packet.md`
- QA plan: `04-qa/CF-W3-MDPIPE-01C-data-quality-scheduled-stage-qa-plan.md`
- Prerequisite commits:
  - `e537f9e feat: add durable pipeline ledger foundation`
  - `10719fa feat: add read-only pipeline status api`
  - `cb45735 feat: add pipeline ops dashboard`
  - `8d45ddc feat: add pipeline command api`
- Open decisions: none

## Consent / Scope Check

No new Product Owner action is required.

Rationale:

- the Product Owner explicitly requested automated backend pipeline runs and downstream stage triggering;
- Team 03 determined the existing Market Data scheduler hook is required for this child and is not a new startup consent blocker;
- startup fanout remains forbidden in this first child;
- `backend/src/server.ts` remains forbidden;
- no Prisma/schema, route registry, frontend, provider/live, package, generated, paid/cloud, broker, telemetry, or broad downstream fanout scope is approved.

## Allowed Files

Backend source:

- `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.scheduler.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.types.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.md`
- `backend/src/modules/pipeline-orchestration/pipeline-orchestration.types.ts`
- `backend/src/modules/pipeline-orchestration/pipeline-orchestration.service.ts`
- `backend/src/modules/pipeline-orchestration/pipeline-orchestration.md`
- `backend/src/modules/pipeline-orchestration/index.ts` only if scheduled-stage exports are required
- `backend/src/modules/data-quality-engine/data-quality-engine.types.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.service.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.md`
- `backend/src/modules/data-quality-engine/index.ts` only if scheduled-stage exports are required

Backend tests:

- `backend/tests/modules/market-data-foundation/market-data.scheduler.test.ts`
- `backend/tests/modules/market-data-foundation/market-data.service.test.ts`
- `backend/tests/modules/pipeline-orchestration/pipeline-orchestration.service.test.ts`
- `backend/tests/modules/data-quality-engine/data-quality-engine.service.test.ts`

Reporting docs:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-05-CF-W3-MDPIPE-01C-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W3-MDPIPE-01C-developer-handoff.md`

## Forbidden Files

- `backend/src/server.ts`
- `backend/src/api/routes.ts`
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- generated files
- package manifests and lockfiles
- all frontend files and frontend tests
- Pipeline Orchestration controller/router/validation/module/repository files outside the allowed list
- Data Quality controller/router/validation/module/repository files
- Market Data controller/router/validation/module/repository/provider files
- downstream module source/tests
- auth/subscription/notification source
- shared backend utilities
- shared frontend components
- Docker/cloud/telemetry/broker files
- Team 08 B6 source/test files

## Required Behavior

- `MarketDataFoundationService.syncScheduledRegion(...)` returns additive changed-set evidence for scheduled Data Quality only.
- `MarketDataFoundationScheduler.runOnce()` calls scheduled Data Quality only for normal scheduled runs with a non-empty changed set.
- Startup Market Data paths do not fan out into Data Quality.
- Pipeline Orchestration creates/reuses scheduled run/stage rows, acquires a lease, records progress/counts, skips duplicate terminal work, and safely blocks held-lease duplicate execution.
- Data Quality adds a scheduled-stage adapter for explicit instrument ids only.
- No empty changed set can trigger full-scope Data Quality evaluation.
- No provider/live calls occur during scheduled Data Quality.
- Existing B4 manual command behavior remains unchanged.

## Required Validation

```powershell
cd backend
npm.cmd test -- market-data.scheduler.test.ts market-data.service.test.ts pipeline-orchestration.service.test.ts data-quality-engine.service.test.ts --runInBand
npm.cmd run build
```

Regression check:

```powershell
cd backend
npm.cmd test -- pipeline-orchestration.validation.test.ts pipeline-orchestration.controller.test.ts pipeline-orchestration.routes.test.ts pipeline-orchestration.service.test.ts --runInBand
npm.cmd run build
```

## Team Assignment

- Owner: Team 05 - Market Data / Data Quality
- Branch recommendation: `codex/w3-mdpipe-01c-data-quality-scheduled-stage`
- Worktree recommendation: one writer in the shared `dev` workspace is acceptable only while no other backend writer owns the reserved files; otherwise use `C:\work\repo\investment-scanner-worktrees\team05-CF-W3-MDPIPE-01C`.

## Product Owner Action

Not required for this bounded child. Stop and return to Team 00 if implementation needs any forbidden scope.
