# CF-W3-MDPIPE-01B4 - Developer Handoff

Date: 2026-05-25
Work item: `CF-W3-MDPIPE-01B4-PIPELINE-COMMAND-API`
State/Mode: QA blocker rework complete, developer validation complete
Owner: TEAM-05 implementation worker
Lane/Module: Lane 1 with bounded pipeline-ops frontend touch / `pipeline-orchestration`
Next gate: Team 04 QA verification, Team 10 review, Architect signoff routing by Team 00

## QA Blocker Rework Summary (2026-05-25)

Blocker source: `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W3-MDPIPE-01B4-qa-verification.md`

- Fixed duplicate-running edge in `PipelineOrchestrationService.executeCommand(...)`:
  - if same idempotency key reacquires an already `RUNNING` stage under the same command owner family, service now returns lease-held conflict semantics and exits before adapter execution.
- Added focused backend test covering:
  - same idempotency key
  - `RUNNING` stage
  - same lease owner family
  - no second `DataQualityEngineService.evaluate(...)` call
- Terminal duplicate behavior (`DUPLICATE_TERMINAL`) left unchanged.

## Exact Files Changed

- `backend/src/modules/pipeline-orchestration/pipeline-orchestration.types.ts`
- `backend/src/modules/pipeline-orchestration/pipeline-orchestration.validation.ts`
- `backend/src/modules/pipeline-orchestration/pipeline-orchestration.service.ts`
- `backend/src/modules/pipeline-orchestration/pipeline-orchestration.controller.ts`
- `backend/src/modules/pipeline-orchestration/pipeline-orchestration.router.ts`
- `backend/src/modules/pipeline-orchestration/index.ts`
- `backend/src/modules/pipeline-orchestration/pipeline-orchestration.md`
- `backend/tests/modules/pipeline-orchestration/pipeline-orchestration.validation.test.ts`
- `backend/tests/modules/pipeline-orchestration/pipeline-orchestration.service.test.ts`
- `backend/tests/modules/pipeline-orchestration/pipeline-orchestration.controller.test.ts`
- `backend/tests/modules/pipeline-orchestration/pipeline-orchestration.routes.test.ts`
- `frontend/src/features/pipeline-ops/types.ts`
- `frontend/src/features/pipeline-ops/api/pipelineOpsService.ts`
- `frontend/src/features/pipeline-ops/components/PipelineOpsPage.tsx`
- `frontend/src/features/pipeline-ops/components/PipelineOpsTable.tsx`
- `frontend/tests/ui/pipeline-ops.spec.ts`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/13-implementation-evidence/CF-W3-MDPIPE-01B4-implementation-evidence.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-05-CF-W3-MDPIPE-01B4-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W3-MDPIPE-01B4-developer-handoff.md`

## Exact Files Inspected

- Required assignment, requirement, architecture, contract, work-packet, and QA-plan docs for B4
- `backend/src/modules/pipeline-orchestration/*` (including repository for read-only behavior constraints)
- `backend/src/modules/data-quality-engine/index.ts` and service signature (read-only)
- `frontend/src/features/pipeline-ops/*`
- `frontend/tests/ui/pipeline-ops.spec.ts`

## Behavior Changed

- Added command catalog and command execution APIs inside existing pipeline router.
- Added command safety matrix policy with only `DATA_QUALITY_EVALUATE_SCOPE` executable.
- Added command payload validation and normalization rules (run mode, batch bounds, offset bounds, force rejection).
- Added manual command execution path with ledger wrapping, lease acquisition, DQ adapter call, terminal persistence, and duplicate-terminal dedupe.
- Added lease-held conflict response behavior.
- Added frontend catalog fetch + row-level trigger enablement from backend policy.
- Added per-click UUID idempotency key generation for manual trigger.
- Added status refresh after command response while keeping status polling read-only.

## Docs Changed

- Pipeline orchestration module docs updated with bounded command API behavior and constraints.
- Implementation evidence/outbox/handoff docs added for B4.

## Contracts Changed

- No external/shared contract file edits.
- Module-local API and DTO additions in `pipeline-orchestration` and `pipeline-ops` aligned to B4 contract.

## Tests Run

- `cd backend && npm.cmd test -- pipeline-orchestration.validation.test.ts pipeline-orchestration.service.test.ts pipeline-orchestration.controller.test.ts pipeline-orchestration.routes.test.ts --runInBand` (pass)
- `cd backend && npm.cmd run build` (pass)
- `cd frontend && npm.cmd run build` (pass)
- `cd frontend && npm.cmd run test:ui -- pipeline-ops.spec.ts --workers=1` (pass after blocker resolution)

## Tests Skipped

- None from required validation set.

## Blockers Encountered

- Non-escalated Playwright run: `EPERM` unlink on `frontend/test-results/.last-run.json`.
- First escalated Playwright run: `ERR_CONNECTION_REFUSED` on `127.0.0.1:5173` without frontend dev server.
- Resolved by:
  - rerunning UI command with escalated permissions,
  - starting temporary local frontend dev server on `127.0.0.1:5173`,
  - rerunning UI smoke successfully,
  - stopping temporary server after validation.

## Assumptions

- Existing pipeline route mounting remains unchanged and valid.
- `DataQualityEngineService.evaluate` remains stable for current request/response fields used in mapping.
- Localhost-mode user identity may be absent; command metadata uses fallback `local-manual-operator`.

## Risks

- Command execution slice is intentionally narrow (single command); remaining command adapters require separate gates.
- Cross-process near-simultaneous identical idempotency behavior is lease-driven; additional hardening can be considered in future slices if concurrency pressure appears.

## Shared-File Requests

- None.

## Evidence Notes

- See implementation evidence:
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/13-implementation-evidence/CF-W3-MDPIPE-01B4-implementation-evidence.md`
