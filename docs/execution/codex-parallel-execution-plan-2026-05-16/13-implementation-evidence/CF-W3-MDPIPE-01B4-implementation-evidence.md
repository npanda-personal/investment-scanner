# CF-W3-MDPIPE-01B4 - Implementation Evidence

Date: 2026-05-25
Team: TEAM-05 (Market Data / Data Quality)
Owner: Implementation worker
State: Implemented, reworked for QA blocker, and developer-validated

## Rework Pass (QA Blocker: duplicate RUNNING submit)

Rework date: 2026-05-25  
Trigger: Team 04 QA reject (`CF-W3-MDPIPE-01B4-qa-verification.md`) for same-idempotency duplicate submit while stage is already `RUNNING`.

### Rework Scope

- `backend/src/modules/pipeline-orchestration/pipeline-orchestration.service.ts`
- `backend/tests/modules/pipeline-orchestration/pipeline-orchestration.service.test.ts`
- this evidence/outbox/handoff doc set

### Rework Behavior

- Added service guard to short-circuit duplicate in-flight execution when:
  - leased stage is already `RUNNING`
  - stage lease owner matches current `manual-command:{commandKey}:{PROCESS_LOCAL_ID}` owner
  - stage has no `completedAt`
  - lease reacquire attempt count indicates repeat acquisition (`attemptCount > 1`)
- In this edge, service now returns lease-held conflict semantics (`409` / `LEASE_HELD`) and does **not** call `DataQualityEngineService.evaluate(...)` again.
- Existing terminal duplicate behavior (`DUPLICATE_TERMINAL`) remains unchanged.

### Rework Test Coverage

- Added focused backend test:
  - same command request
  - same idempotency key
  - stage already `RUNNING`
  - same lease owner family
  - expectation: `409` with `LEASE_HELD`, no second adapter execution

## Implemented

- Added `GET /api/v1/pipeline/commands/catalog` in pipeline orchestration router/controller/service.
- Added `POST /api/v1/pipeline/commands` in pipeline orchestration router/controller/service.
- Implemented backend command matrix policy with only `DATA_QUALITY_EVALUATE_SCOPE` as `ENABLED`.
- Implemented `DEFERRED` / `FORBIDDEN` catalog rows with disabled reasons for all other command keys.
- Added command request parsing/validation:
  - `runMode=single_batch` required
  - `batchSize` bounded `1..100`
  - `offset >= 0`
  - `force=true` rejected
  - executable command requires `idempotencyKey`
- Implemented single-batch command execution lifecycle for Data Quality:
  - normalize scope (`region`, `assetType`, `timeframe`, `pipelineKey`)
  - generate server idempotency key
  - create/reuse run/stage ledger rows with `triggerType=manual`
  - acquire stage lease before adapter call
  - call `DataQualityEngineService.evaluate(...)` through public module export
  - persist stage/run terminal status and counts
  - clear lease on terminal completion/failure via stage completion path
  - return lease-held as conflict behavior
  - prevent duplicate adapter execution for terminal duplicate idempotency requests
- Updated pipeline orchestration module docs for command API scope/limits.
- Extended backend tests for command catalog, validation, command execution, duplicate handling, lease conflict, and failure handling.
- Updated pipeline-ops frontend:
  - added command catalog and command DTO/types
  - fetches command catalog separately from status
  - enables only Data Quality trigger from backend availability
  - keeps all other trigger buttons disabled with backend reason
  - posts one command per click with fresh `crypto.randomUUID()` idempotency key
  - refreshes status after command response
  - keeps status polling/read-only path free of command POST calls
- Updated UI smoke test for catalog-driven button state and single command POST behavior.

## Validation

Rework validation executed:

```powershell
cd backend
npm.cmd test -- pipeline-orchestration.service.test.ts --runInBand
npm.cmd test -- pipeline-orchestration.validation.test.ts pipeline-orchestration.service.test.ts pipeline-orchestration.controller.test.ts pipeline-orchestration.routes.test.ts --runInBand
```

Rework validation results:

- Service-focused backend test: passed (`1` suite, `11` tests).
- B4 backend focused set: passed (`4` suites, `23` tests).

Executed:

```powershell
cd backend
npm.cmd test -- pipeline-orchestration.validation.test.ts pipeline-orchestration.service.test.ts pipeline-orchestration.controller.test.ts pipeline-orchestration.routes.test.ts --runInBand
npm.cmd run build
```

```powershell
cd frontend
npm.cmd run build
npm.cmd run test:ui -- pipeline-ops.spec.ts --workers=1
```

Results:

- Backend focused tests: passed (`4` suites, `22` tests).
- Backend build: passed.
- Frontend build: passed.
- Frontend UI smoke: passed (`pipeline-ops.spec.ts`).

Operational notes:

- Memory check used `Get-Counter '\Memory\% Committed Bytes In Use'`: `45.2%`.
- First non-escalated UI run failed with local filesystem `EPERM` unlink on `frontend/test-results/.last-run.json`; rerun with escalated permissions resolved.
- First escalated UI run then failed with `ERR_CONNECTION_REFUSED` because no dev server was running; started temporary local frontend dev server on `127.0.0.1:5173`, reran UI smoke, then stopped the server.

## Explicitly Not Implemented

- No route registry edits.
- No Prisma schema/migration/generated file changes.
- No package manifest/lockfile changes.
- No Market Data Foundation source edits.
- No Data Quality Engine source edits.
- No downstream module execution commands.
- No scheduler/startup/backfill/provider/live execution fanout.
- No feature-page bulk-control removals.
