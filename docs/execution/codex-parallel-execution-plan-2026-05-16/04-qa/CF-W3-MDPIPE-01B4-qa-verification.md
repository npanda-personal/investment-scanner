# CF-W3-MDPIPE-01B4 QA Re-Verification

Date: 2026-05-25
Team: Team 04 - QA Re-verification
Work item: `CF-W3-MDPIPE-01B4-PIPELINE-COMMAND-API`
Verdict: `ACCEPT`
Release recommendation: QA blocker cleared; item may proceed to the next review gates.

This rerun supersedes the earlier 2026-05-25 `REJECT` after Team 05 reworked the duplicate-running same-idempotency path.

## Scope

QA rerun of the bounded pipeline command API slice for:

- `GET /api/v1/pipeline/commands/catalog`
- `POST /api/v1/pipeline/commands`
- `pipeline-orchestration`
- `pipeline-ops`

Authority used for this pass:

- root `AGENTS.md`
- active packet under `docs/execution/codex-parallel-execution-plan-2026-05-16/`
- prior QA reject, implementation evidence, Team 05 outbox, and developer handoff for `CF-W3-MDPIPE-01B4`

## Files Inspected

- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W3-MDPIPE-01B4-command-api-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W3-MDPIPE-01B4-pipeline-command-api-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W3-MDPIPE-01B4-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/13-implementation-evidence/CF-W3-MDPIPE-01B4-implementation-evidence.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-05-CF-W3-MDPIPE-01B4-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W3-MDPIPE-01B4-developer-handoff.md`
- `backend/src/modules/pipeline-orchestration/pipeline-orchestration.service.ts`
- `backend/tests/modules/pipeline-orchestration/pipeline-orchestration.service.test.ts`
- `backend/tests/modules/pipeline-orchestration/pipeline-orchestration.validation.test.ts`
- `backend/tests/modules/pipeline-orchestration/pipeline-orchestration.controller.test.ts`
- `backend/tests/modules/pipeline-orchestration/pipeline-orchestration.routes.test.ts`
- `frontend/tests/ui/pipeline-ops.spec.ts`

## Scope Boundary Check

Observed application-file changes remain inside the reserved B4 file set from the work packet:

- `backend/src/modules/pipeline-orchestration/*`
- `backend/tests/modules/pipeline-orchestration/*`
- `frontend/src/features/pipeline-ops/{api,components,types}.ts*`
- `frontend/tests/ui/pipeline-ops.spec.ts`

Confirmed not touched by the implementation slice:

- `backend/src/api/routes.ts`
- Prisma schema, migrations, generated files
- `backend/src/modules/data-quality-engine/**`
- `backend/src/modules/market-data-foundation/**`
- shared frontend components
- feature pages outside `frontend/src/features/pipeline-ops/**`
- package manifests / lockfiles

## Validation Run

Laptop memory check before heavy commands:

- `Get-Counter '\Memory\% Committed Bytes In Use'` -> `46.27%`

Commands executed:

```powershell
cd backend
npm.cmd test -- pipeline-orchestration.validation.test.ts pipeline-orchestration.service.test.ts pipeline-orchestration.controller.test.ts pipeline-orchestration.routes.test.ts --runInBand
```

- Result: pass
- Evidence: 4 suites, 23 tests passed

```powershell
cd backend
npm.cmd run build
```

- Result: pass

```powershell
cd frontend
npm.cmd run build
```

- Result: pass
- Note: existing Vite chunk-size warning only

```powershell
cd frontend
npm.cmd run test:ui -- pipeline-ops.spec.ts --workers=1
```

- Initial result: sandbox `EPERM` unlink on `frontend/test-results/.last-run.json`
- Escalated rerun: reached Playwright but failed with `ERR_CONNECTION_REFUSED` because no local app was serving `http://127.0.0.1:5173`
- Follow-up action: started a temporary local frontend dev server on `127.0.0.1:5173`
- Dev-server blocker on first sandbox start attempt: Vite config load failed with `spawn EPERM`; resolved by elevated local start
- Final rerun result: pass (`1` Playwright test)
- Cleanup: temporary frontend dev server stopped after the rerun

## Acceptance Results

### QA blocker resolution verified

- The service now short-circuits the prior release blocker before adapter execution when a duplicate request reacquires a same-owner `RUNNING` stage for the same idempotency key.
- The focused regression exists and passed:
  - service guard in `backend/src/modules/pipeline-orchestration/pipeline-orchestration.service.ts`
  - focused test in `backend/tests/modules/pipeline-orchestration/pipeline-orchestration.service.test.ts`
- Result confirmed: same idempotency key + same owner family + existing `RUNNING` stage does not call `DataQualityEngineService.evaluate(...)` again and returns `409` / `LEASE_HELD`.

### Prior B4 acceptance checks still valid

- Catalog still exposes only `DATA_QUALITY_EVALUATE_SCOPE` as `ENABLED`; all other command rows remain `DEFERRED` or `FORBIDDEN` with reasons.
- Validation coverage still enforces `runMode=single_batch`, `batchSize` `1..100`, non-negative `offset`, executable-command `idempotencyKey`, and `force=false`.
- Terminal duplicate behavior still returns `DUPLICATE_TERMINAL` without a second adapter call.
- Other-owner active lease still returns `409` / `LEASE_HELD`.
- Focused backend execution path still creates/uses the bounded command ledger path and completes the Data Quality batch through the public adapter boundary only.
- Frontend build and `pipeline-ops.spec.ts` still verify the catalog-driven safety matrix, disabled non-DQ controls, one Data Quality click -> one command POST, and status refresh behavior.
- No scope drift was observed outside the reserved B4 application file set.

## Prior Reject Status

Earlier same-day reject reason:

- duplicate-running same-idempotency submit could reacquire its own lease and execute the adapter a second time

Rerun status:

- resolved

## Risks / Notes

- Local Playwright execution still needs elevated filesystem access for `.last-run.json`.
- Local Playwright still depends on a temporary frontend dev server because the spec targets `http://127.0.0.1:5173`.
- Frontend production build still emits the pre-existing chunk-size warning.
- Cross-process concurrency beyond this bounded same-owner duplicate path remains a future hardening area, but it is not a blocker for B4 acceptance.

## Final QA Verdict

`ACCEPT`

The duplicate-running idempotency blocker is fixed, the focused regression exists and passes, the prior B4 acceptance set still passes, and the implementation remains within the reserved file boundary.
