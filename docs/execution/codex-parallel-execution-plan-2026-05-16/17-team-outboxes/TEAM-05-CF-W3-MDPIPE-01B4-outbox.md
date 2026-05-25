# TEAM-05 Outbox - CF-W3-MDPIPE-01B4

Date: 2026-05-25
Team: TEAM-05 (Market Data / Data Quality)
Work item: `CF-W3-MDPIPE-01B4-PIPELINE-COMMAND-API`
State: Reworked for QA blocker and revalidated

## QA Rework Pass (2026-05-25)

Trigger: Team 04 QA rejection on duplicate-running same-idempotency edge.

Rework files changed in this pass:

- `backend/src/modules/pipeline-orchestration/pipeline-orchestration.service.ts`
- `backend/tests/modules/pipeline-orchestration/pipeline-orchestration.service.test.ts`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/13-implementation-evidence/CF-W3-MDPIPE-01B4-implementation-evidence.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-05-CF-W3-MDPIPE-01B4-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W3-MDPIPE-01B4-developer-handoff.md`

Rework behavior:

- Same-idempotency duplicate `POST` while stage is already `RUNNING` and leased by same command owner family now short-circuits with `409` / `LEASE_HELD`.
- Service no longer executes `DataQualityEngineService.evaluate(...)` a second time in that edge.
- Existing terminal duplicate behavior remains unchanged.

Rework validation:

- `cd backend && npm.cmd test -- pipeline-orchestration.service.test.ts --runInBand` (pass)
- `cd backend && npm.cmd test -- pipeline-orchestration.validation.test.ts pipeline-orchestration.service.test.ts pipeline-orchestration.controller.test.ts pipeline-orchestration.routes.test.ts --runInBand` (pass)

## Files Changed

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

## Files Inspected (Key Inputs)

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/16-team-inboxes/TEAM-05-current-assignment.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W3-MDPIPE-01B4-command-api-manual-trigger-safety-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W3-MDPIPE-01B4-pipeline-command-api-architecture.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W3-MDPIPE-01B4-pipeline-command-api-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W3-MDPIPE-01B4-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W3-MDPIPE-01B4-command-api-qa-plan.md`
- pipeline-orchestration repository/module and pipeline-ops feature files for integration context

## Behavior Delivered

- Added command catalog endpoint in existing pipeline router.
- Added command execution endpoint in existing pipeline router.
- Catalog now enables only `DATA_QUALITY_EVALUATE_SCOPE`.
- All non-DQ commands returned as `DEFERRED` or `FORBIDDEN` with reasons.
- POST command path enforces manual single-batch constraints and idempotency.
- DQ command executes at most one batch through `DataQualityEngineService` public export.
- Run/stage ledger rows are created/reused with `triggerType=manual`.
- Lease acquisition happens before adapter call.
- Duplicate terminal idempotency requests do not execute adapter twice.
- Lease-held requests return conflict behavior.
- Terminal completion/failure updates run/stage and clears lease fields.
- Pipeline Ops frontend now:
  - loads catalog separately,
  - enables only Data Quality trigger,
  - keeps all other rows disabled with backend reason,
  - posts one command per click with `crypto.randomUUID()`,
  - refreshes status after command response,
  - keeps status polling read-only.

## Validation Run

- `cd backend && npm.cmd test -- pipeline-orchestration.validation.test.ts pipeline-orchestration.service.test.ts pipeline-orchestration.controller.test.ts pipeline-orchestration.routes.test.ts --runInBand` (passed)
- `cd backend && npm.cmd run build` (passed)
- `cd frontend && npm.cmd run build` (passed)
- `cd frontend && npm.cmd run test:ui -- pipeline-ops.spec.ts --workers=1` (passed, after blocker resolution)

## Blockers / Retries

- Initial UI smoke attempt failed with:
  - `EPERM` unlink `frontend/test-results/.last-run.json` under non-escalated run.
  - resolved by rerunning with escalated permissions.
- Next UI smoke attempt failed with:
  - `ERR_CONNECTION_REFUSED` for `http://127.0.0.1:5173/pipeline-ops`.
  - resolved by starting temporary local frontend dev server on `127.0.0.1:5173`, rerunning UI smoke, then stopping server.

## Risks / Known Limitations

- Single-command slice only; downstream command adapters remain deferred/forbidden by policy.
- Active same-idempotency concurrent duplicate protection relies on stage lease behavior plus terminal dedupe path; multi-process parallel submit edge handling remains for later hardening if needed.
- Existing feature-page bulk controls were intentionally left untouched by scope.

## Next Gate

- Team 04 QA verification / Team 10 review / Architect signoff routing via Team 00.
