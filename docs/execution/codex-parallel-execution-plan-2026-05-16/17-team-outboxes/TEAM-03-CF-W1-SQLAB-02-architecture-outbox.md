# TEAM-03 CF-W1-SQLAB-02 Architecture Outbox

Date: 2026-05-18

Team: Team 03 - Architecture Factory

Work item: `CF-W1-SQLAB-02` signal outcome journal and post-event learning

Status:

- `CF-W1-SQLAB-02A` derived journal preview: Ready candidate only after `CF-W1-SQLAB-01` branch-local acceptance and Team 00 sequencing on shared backend files.
- `CF-W1-SQLAB-02B` durable storage: proposal-blocked pending explicit Prisma/schema, repository, and generated-artifact consent.

## Files Changed

- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-SQLAB-02-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-SQLAB-02-signal-outcome-journal-post-event-learning-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-SQLAB-02-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-CF-W1-SQLAB-02-architecture-outbox.md`

## Files Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-SQLAB-02-signal-outcome-journal-post-event-learning-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-SQLAB-02A-signal-outcome-journal-derived-preview-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-SQLAB-01-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-SQLAB-01-signal-quality-outcome-confidence-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-SQLAB-02A-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/00-control/active-work-board.md`
- `backend/prisma/schema.prisma`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.md`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.service.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.types.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.repository.ts`
- `backend/tests/modules/signal-quality-lab/signal-quality-lab.service.test.ts`
- `frontend/src/features/signal-quality-lab/api/signalQualityLabService.ts`
- `frontend/src/features/signal-quality-lab/components/SignalQualityLabPage.tsx`
- `frontend/src/features/signal-quality-lab/types.ts`

## Exact Evidence

- Team 00 already promoted `CF-W1-SQLAB-01` to Ready and assigned a dedicated Team 06 worktree, but only as a backend-only packet. `CF-W1-SQLAB-02A` therefore must sequence after that branch-local acceptance because both packets reserve `signal-quality-lab.service.ts`, `signal-quality-lab.types.ts`, `signal-quality-lab.md`, and `signal-quality-lab.service.test.ts`.
- `signal-quality-lab` already exposes instrument history and outcome reads through existing endpoints and the frontend page already joins those rows by `signalResultId` and selected horizon. That makes a derived preview source-supported without route or frontend API-client changes.
- `signal-quality-lab` still calculates outcomes on demand and documents `outcomesPersisted = false` with no `SignalOutcome` table in the module.
- Prisma has no `signal-quality-lab` owned journal storage model. Reusing `SignalResult`, `SignalCalibrationResult`, or `TodayReviewRun` would cross module ownership.

## Ready-Candidate File Set For `CF-W1-SQLAB-02A`

- `backend/src/modules/signal-quality-lab/signal-quality-lab.service.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.types.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.md`
- `backend/tests/modules/signal-quality-lab/signal-quality-lab.service.test.ts`
- `frontend/src/features/signal-quality-lab/types.ts`
- `frontend/src/features/signal-quality-lab/components/SignalQualityLabPage.tsx`
- `frontend/tests/ui/signal-quality-lab.spec.ts`

## Forbidden For `CF-W1-SQLAB-02A`

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.repository.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.controller.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.router.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.validation.ts`
- `backend/tests/modules/signal-quality-lab/signal-quality-lab.routes.test.ts`
- `backend/tests/modules/signal-quality-lab/signal-quality-lab.validation.test.ts`
- `frontend/src/features/signal-quality-lab/api/signalQualityLabService.ts`
- `backend/src/modules/signal-generation-engine/**`
- `backend/src/modules/signal-calibration-engine/**`
- `backend/src/modules/today-trade-review/**`
- backend and frontend route registries
- shared backend utilities
- shared frontend components
- package manifests
- generated files
- providers, live-market validation, paid/cloud, broker, or telemetry flows

## Dependencies

- `CF-W1-SQLAB-01` branch-local acceptance is required first.
- Team 04 QA plan already exists for `CF-W1-SQLAB-02A`.
- `CF-W1-CAL-01` is downstream only and does not block this child.

## Next Gate

Team 00 review only:

1. promote `CF-W1-SQLAB-02A` as the next sequenced child on top of accepted `CF-W1-SQLAB-01`; or
2. leave `CF-W1-SQLAB-02B` proposal-blocked and open a separate storage approval packet later.
