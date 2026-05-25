# CF-W3-MDPIPE-01B4 - Team 10 Code Review / Release Gate

Date: 2026-05-25

Reviewer: Team 10 - Review / Release

Reviewed branch: `dev`

Reviewed workspace HEAD: `49cdb36a2470ce108d471800a9584875175834b2`

## Decision

`ACCEPT`

Architect Signoff may proceed.

## Findings

No blocking findings.

Review notes:

- Reserved-scope compliance is intact for the B4 application slice. `git status --short` and `git diff --name-only -- ...` show the implementation stayed inside the approved `pipeline-orchestration` backend files, `pipeline-ops` frontend files, focused tests, and bounded execution docs. No forbidden application-file edits were found under `backend/src/api/routes.ts`, Prisma/schema/migrations/generated files, `backend/src/modules/data-quality-engine/**`, `backend/src/modules/market-data-foundation/**`, shared frontend components, `frontend/src/app/routes.tsx`, package manifests, or provider/scheduler paths.
- The backend command matrix enables only Data Quality and keeps every non-DQ command blocked or deferred with explicit reasons. See `backend/src/modules/pipeline-orchestration/pipeline-orchestration.service.ts:39-59` and `:137-160`.
- The command endpoint enforces the one-batch-only contract before execution. `backend/src/modules/pipeline-orchestration/pipeline-orchestration.validation.ts:54-67` and `:101-139` normalize scope, require `runMode=single_batch`, bound `batchSize` to `1..100`, force non-negative `offset`, and reject `force=true`.
- The execution path remains bounded to one Data Quality batch and does not fan out to providers, schedulers, or downstream stages. `backend/src/modules/pipeline-orchestration/pipeline-orchestration.service.ts:283-346` makes one call to `DataQualityEngineService.evaluate({ region, assetType, batchSize, offset })`, then completes the stage/run ledger rows. No loop, queue, scheduler, or downstream trigger exists in this path. The import boundary stays on the Data Quality public export at `pipeline-orchestration.service.ts:1`.
- Idempotency and lease safety are implemented on the ledger path and the QA-rejected duplicate-running edge is now closed. `pipeline-orchestration.service.ts:183-281` builds a server idempotency key, acquires the stage lease before adapter execution, returns `DUPLICATE_TERMINAL` for terminal repeats, returns `409 / LEASE_HELD` for active conflicts, and short-circuits same-owner in-flight duplicates through `isInFlightDuplicateStage()` at `:776-782`. The underlying lease update still sets `RUNNING`, increments attempts, and clears the lease on terminal completion in `backend/src/modules/pipeline-orchestration/pipeline-orchestration.repository.ts:157-217`.
- Frontend status polling stays read-only and the manual trigger posts once per explicit click. `frontend/src/features/pipeline-ops/api/pipelineOpsService.ts:14-44` keeps status and catalog on separate GETs and commands on POST only. `frontend/src/features/pipeline-ops/hooks/usePipelineStatus.ts:24-54` polls only `fetchPipelineStatus(...)`. `frontend/src/features/pipeline-ops/components/PipelineOpsPage.tsx:44-68` generates a fresh `crypto.randomUUID()` per click, posts `DATA_QUALITY_EVALUATE_SCOPE`, and refreshes status afterward. `frontend/src/features/pipeline-ops/components/PipelineOpsTable.tsx:149-205` enables only catalog `ENABLED` rows and keeps other triggers disabled with backend reasons in the tooltip.
- Focused tests are meaningful for the reserved slice and the Team 04 rerun is sufficient. Backend tests cover the command catalog, blocked-command rejection, validation bounds, successful DQ batch execution, duplicate-terminal dedupe, active-lease conflict, same-owner running duplicate rejection, and adapter failure handling in `backend/tests/modules/pipeline-orchestration/pipeline-orchestration.service.test.ts:248-726`, plus validation/controller/route coverage in the companion test files. The Playwright smoke at `frontend/tests/ui/pipeline-ops.spec.ts:29-263` verifies the catalog-driven safety matrix, disabled non-DQ controls, a single DQ POST per click, status refresh, and absence of `market-data` calls during the UI flow. Team 04 recorded `ACCEPT` after rerunning the duplicate-running regression and the required build/UI commands.
- Product-language and local/free constraints remain intact. Reviewer `rg` scans over the changed source/test/doc scope found no target-price, R:R, buy/sell-now, guarantee, or advice wording, and no paid/cloud/telemetry/broker drift. The only execution dependency added is the existing local `DataQualityEngineService` path.

## Scope Confirmation

Approved implementation files reviewed:

- `backend/src/modules/pipeline-orchestration/index.ts`
- `backend/src/modules/pipeline-orchestration/pipeline-orchestration.controller.ts`
- `backend/src/modules/pipeline-orchestration/pipeline-orchestration.router.ts`
- `backend/src/modules/pipeline-orchestration/pipeline-orchestration.service.ts`
- `backend/src/modules/pipeline-orchestration/pipeline-orchestration.types.ts`
- `backend/src/modules/pipeline-orchestration/pipeline-orchestration.validation.ts`
- `backend/src/modules/pipeline-orchestration/pipeline-orchestration.md`
- `backend/tests/modules/pipeline-orchestration/pipeline-orchestration.controller.test.ts`
- `backend/tests/modules/pipeline-orchestration/pipeline-orchestration.routes.test.ts`
- `backend/tests/modules/pipeline-orchestration/pipeline-orchestration.service.test.ts`
- `backend/tests/modules/pipeline-orchestration/pipeline-orchestration.validation.test.ts`
- `frontend/src/features/pipeline-ops/api/pipelineOpsService.ts`
- `frontend/src/features/pipeline-ops/components/PipelineOpsPage.tsx`
- `frontend/src/features/pipeline-ops/components/PipelineOpsTable.tsx`
- `frontend/src/features/pipeline-ops/types.ts`
- `frontend/tests/ui/pipeline-ops.spec.ts`

Authority and evidence docs reviewed:

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W3-MDPIPE-01B4-command-api-manual-trigger-safety-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W3-MDPIPE-01B4-pipeline-command-api-architecture.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W3-MDPIPE-01B4-pipeline-command-api-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W3-MDPIPE-01B4-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W3-MDPIPE-01B4-qa-verification.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/13-implementation-evidence/CF-W3-MDPIPE-01B4-implementation-evidence.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-05-CF-W3-MDPIPE-01B4-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W3-MDPIPE-01B4-developer-handoff.md`

Read-only supporting inspection:

- `backend/src/modules/pipeline-orchestration/pipeline-orchestration.repository.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.service.ts`
- `frontend/src/features/pipeline-ops/hooks/usePipelineStatus.ts`

## Validation

Reviewer commands run:

- `git status --short`
- `git branch --show-current`
- `git rev-parse HEAD`
- `git diff --name-only -- backend/src/modules/pipeline-orchestration backend/tests/modules/pipeline-orchestration frontend/src/features/pipeline-ops frontend/tests/ui/pipeline-ops.spec.ts docs/execution/codex-parallel-execution-plan-2026-05-16/13-implementation-evidence/CF-W3-MDPIPE-01B4-implementation-evidence.md docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-05-CF-W3-MDPIPE-01B4-outbox.md docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W3-MDPIPE-01B4-developer-handoff.md`
- `git diff --check -- <reserved B4 source/test paths>`
- `rg -n "pipeline/commands|DATA_QUALITY_EVALUATE_SCOPE|idempotencyKey|LEASE_HELD|DUPLICATE_TERMINAL|single_batch|crypto.randomUUID|POST|catalog" backend/src/modules/pipeline-orchestration frontend/src/features/pipeline-ops backend/tests/modules/pipeline-orchestration frontend/tests/ui/pipeline-ops.spec.ts`
- `rg -n "buy|sell|target|R:R|risk/reward|profit|advice" backend/src/modules/pipeline-orchestration frontend/src/features/pipeline-ops backend/tests/modules/pipeline-orchestration frontend/tests/ui/pipeline-ops.spec.ts docs/execution/codex-parallel-execution-plan-2026-05-16/13-implementation-evidence/CF-W3-MDPIPE-01B4-implementation-evidence.md docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-05-CF-W3-MDPIPE-01B4-outbox.md docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W3-MDPIPE-01B4-developer-handoff.md`
- read-only numbered inspection of the reviewed source/test files plus the supporting repository, Data Quality service, and status hook

Results:

- Workspace branch is `dev`; the candidate is present as an uncommitted scoped diff plus execution evidence docs.
- `git diff --check` reported only CRLF normalization warnings and no whitespace defects.
- Reviewer language scan found no forbidden trading/advice wording in the reviewed changed scope.

QA evidence relied on:

- Team 04 QA verdict: `ACCEPT`
- Passed backend focused tests: `cd backend && npm.cmd test -- pipeline-orchestration.validation.test.ts pipeline-orchestration.service.test.ts pipeline-orchestration.controller.test.ts pipeline-orchestration.routes.test.ts --runInBand`
- Passed backend build: `cd backend && npm.cmd run build`
- Passed frontend build: `cd frontend && npm.cmd run build`
- Passed Playwright smoke after local runtime setup: `cd frontend && npm.cmd run test:ui -- pipeline-ops.spec.ts --workers=1`

## Skipped Checks

- Team 10 did not rerun backend build, frontend build, or Playwright in this pass because Team 04 already accepted the candidate after the duplicate-running regression rerun and the review scope here was limited to code, contract, boundary, and evidence inspection.
- No live local market-data validation was rerun by Team 10 because this slice is a bounded command wrapper over an existing Data Quality batch path and the accepted QA packet already covers the required focused execution surface.

## Release Risk

Residual release risk is low for the reserved B4 slice.

Known non-blocking residual risk:

- Team 04 still had to use elevated local access for Playwright filesystem cleanup and a temporary frontend dev server on `127.0.0.1:5173`; that remains an environment/runtime convenience issue, not a B4 logic blocker.
- Cross-process duplicate-submit hardening beyond the bounded lease/idempotency model remains future work, but the reviewed slice now blocks the previously rejected same-owner running duplicate path and does not reopen duplicate adapter execution in the accepted scope.

## Next Gate

Route to Team 03 Architect Signoff.
