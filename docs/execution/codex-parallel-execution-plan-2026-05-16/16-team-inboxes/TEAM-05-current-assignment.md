# TEAM-05 Current Assignment

Date: 2026-05-25

Team: TEAM-05 - Market Data / Data Quality

Prompt file: `docs/execution/codex-parallel-execution-plan-2026-05-16/15-automation-prompts/AUTO-05-market-data-dq.md`

## Latest Assignment Override - 2026-05-25 DQ-02-RS1 Ready Implementation

Pull `CF-W1-DQ-02-RS1` as the active Team 05 implementation item.

This supersedes the stale `CF-W3-MDPIPE-01C` inbox entry. `CF-W3-MDPIPE-01C` is already accepted through QA, review, Architect Signoff, delegated PO acceptance, and local commit `da66fa4 feat: add scheduled data quality stage`; do not reopen it from this inbox.

`CF-W1-DQ-02-RS1` is a backend-only `data-quality-engine` read-side currentness reconstruction child. Do not implement frontend, schema, routes, Market Data source, provider/live, startup/backfill, generated/package, or shared utility scope.

## Branch / Worktree

- Branch: `codex/team05-market-data/CF-W1-DQ-02-RS1`
- Worktree: `C:\work\repo\investment-scanner-worktrees\team05-CF-W1-DQ-02-RS1`
- Shared `dev` workspace is not approved for implementation.

## Gate Evidence

- Requirement: `10-requirements/CF-W1-DQ-02-residual-read-side-currentness-requirement.md`
- Architecture: `03-architecture/CF-W1-DQ-02-read-side-currentness-architecture.md`
- Contract: `06-contracts/CF-W1-DQ-02-read-side-currentness-contract.md`
- Work packet: `08-work-packets/CF-W1-DQ-02-read-side-currentness-work-packet.md`
- QA plan: `04-qa/CF-W1-DQ-02-read-side-currentness-qa-plan.md`
- Ready promotion: `13-implementation-evidence/CF-W1-DQ-02-RS1-ready-promotion.md`
- Open decisions: none

## Allowed Writes

Backend source:

- `backend/src/modules/data-quality-engine/data-quality-engine.repository.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.service.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.types.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.md`

Backend tests:

- `backend/tests/modules/data-quality-engine/data-quality-engine.repository.test.ts`
- `backend/tests/modules/data-quality-engine/data-quality-engine.service.test.ts`
- `backend/tests/modules/data-quality-engine/data-quality-engine.invariants.test.ts`

Reporting docs:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-05-CF-W1-DQ-02-RS1-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-DQ-02-RS1-developer-handoff.md`

## Forbidden Writes

- `backend/src/modules/data-quality-engine/data-quality-engine.controller.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.router.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.validation.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.module.ts`
- `backend/src/modules/data-quality-engine/index.ts`
- `backend/src/api/routes.ts`
- all `backend/src/modules/market-data-foundation/**`
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- generated files
- package manifests and lockfiles
- shared backend utilities
- provider / scheduler / worker / queue / startup / backfill files
- all frontend source/tests and shared UI
- `backend/src/server.ts`
- `backend/.env.example`
- `.gitignore`
- root `AGENTS.md`
- `docs/AGENTS.md`
- `docs/codex-agent-team-plan/**`

## Required Behavior

- Add one DQE-owned read-side currentness reconstruction path or equivalent shared basis.
- Apply the same reconstructed basis to `summary()`, `list()`, `diagnostics()` when a persisted row exists, `getLatestEvaluationForInstrument()`, and `getEvaluationsForInstruments()`.
- Add explicit additive currentness semantics for current completed session, current finalization pending, stale missed completed session, missing latest price, session evidence unavailable, provider-gap blocked, and contradictory evidence.
- Derive summary currentness counts from the same per-row reconstruction basis used by row/detail/latest-helper reads.
- Preserve fail-closed eligibility behavior for missing, blocked, unavailable, stale, or contradictory evidence.
- Keep existing DQ score/status/gap/blocker/warning/use-case-tier fields backward-compatible.

## Required Validation

```powershell
cd backend
npm.cmd test -- data-quality-engine.repository.test.ts data-quality-engine.service.test.ts data-quality-engine.invariants.test.ts --runInBand
npm.cmd run build
```

## Stop Conditions

Stop and return to Team 00 if implementation requires Market Data source edits, DQE controller/router/route widening, Prisma/schema/migration/generated/package/shared-utility/frontend/provider/startup/backfill scope, or durable stored currentness fields.

## Assignment

Pull `CF-W3-MDPIPE-01C` as the active Team 05 implementation item.

This is the first backend-only scheduled Data Quality stage after the committed Pipeline Ledger, Status API, Dashboard, and Command API slices.

Do not implement frontend, startup fanout, new routes, schema changes, provider/live calls, or downstream fanout in this slice.

## Branch / Worktree

- Branch recommendation: `codex/w3-mdpipe-01c-data-quality-scheduled-stage`
- Worktree recommendation: `C:\work\repo\investment-scanner-worktrees\team05-CF-W3-MDPIPE-01C`
- Shared `dev` workspace is acceptable only while Team 00 keeps all other backend writers off the reserved files.

## Gate Evidence

- Requirement: `10-requirements/CF-W3-MDPIPE-01-incremental-market-data-pipeline-requirement.md`
- Architecture: `03-architecture/CF-W3-MDPIPE-01C-data-quality-scheduled-stage-architecture.md`
- Contract: `06-contracts/CF-W3-MDPIPE-01C-data-quality-scheduled-stage-contract.md`
- Work packet: `08-work-packets/CF-W3-MDPIPE-01C-work-packet.md`
- QA plan: `04-qa/CF-W3-MDPIPE-01C-data-quality-scheduled-stage-qa-plan.md`
- Ready promotion: `13-implementation-evidence/CF-W3-MDPIPE-01C-ready-promotion.md`
- Open decisions: none

## Allowed Writes

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

## Forbidden Writes

- `backend/src/server.ts`
- `backend/src/api/routes.ts`
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- generated files
- package manifests and lockfiles
- all frontend files and frontend tests
- `backend/src/modules/pipeline-orchestration/pipeline-orchestration.controller.ts`
- `backend/src/modules/pipeline-orchestration/pipeline-orchestration.router.ts`
- `backend/src/modules/pipeline-orchestration/pipeline-orchestration.validation.ts`
- `backend/src/modules/pipeline-orchestration/pipeline-orchestration.module.ts`
- `backend/src/modules/pipeline-orchestration/pipeline-orchestration.repository.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.controller.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.router.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.validation.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.module.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.repository.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.controller.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.router.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.validation.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.module.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.repository.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.provider.ts`
- all downstream module source/tests outside the exact allowed set
- auth/subscription/notification source
- shared backend utilities
- shared frontend components
- Docker/cloud/telemetry/broker files
- Team 08 B6 source/test files
- root `AGENTS.md`
- `docs/AGENTS.md`
- `docs/codex-agent-team-plan/**`

## Required Behavior

- Add scheduler-to-DQ changed-set evidence without changing route/API response contracts.
- Trigger scheduled Data Quality only from the normal existing Market Data scheduler path and only when the changed set is non-empty.
- Keep startup fanout into Data Quality out of scope.
- Add a scheduled Pipeline Orchestration method for ledgered `DATA_QUALITY` stage execution with idempotency, lease protection, progress, and terminal counts.
- Add a Data Quality scheduled-stage adapter for explicit instrument ids only.
- Stay DB-only and incremental.
- Preserve B4 manual command behavior.

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

## Stop Conditions

Stop and return to Team 00 if implementation requires server startup changes, route/schema/generated/package/frontend/provider/live/shared/downstream scope, full-universe DQ rescans, or editing any forbidden file.

## Expected Output

Write:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-05-CF-W3-MDPIPE-01C-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W3-MDPIPE-01C-developer-handoff.md`

Do not commit. Team 00 handles QA, review, Architect Signoff, delegated PO acceptance, scoped local commit, and later integration.
