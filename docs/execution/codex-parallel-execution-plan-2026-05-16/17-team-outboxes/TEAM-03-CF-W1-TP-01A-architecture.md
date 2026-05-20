# TEAM-03 CF-W1-TP-01A Architecture Outbox

Date: 2026-05-19

Team: Team 03 - Architecture Factory

Work item: `CF-W1-TP-01A` trade-plan no-target compatibility and DQ hard-block trust behavior

Status: ACCEPT / READY-CANDIDATE

## Files Changed

- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-TP-01A-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-TP-01A-trade-plan-no-target-dq-hard-block-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-TP-01A-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-CF-W1-TP-01A-architecture.md`

2026-05-19 refresh: updated the same active execution docs to record TP-02 acceptance sequencing and the required stack base `1222daf`.

## Files Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-TP-01A-trade-plan-no-target-compatibility-dq-hard-block-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/next-top-10-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/12-ready-queue/ready-for-implementation.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/07-decisions/DECISION-20260517-trade-plan-no-target-dq-hard-block-resolution.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-TP-01A-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-TP-01B-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-TP-01B-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-TP-02-architecture-review.md`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.service.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.types.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.geometry.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.validation.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.repository.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.md`
- `backend/src/modules/data-quality-engine/data-quality-engine.types.ts`
- `backend/tests/modules/trade-plan-risk-engine/trade-plan-risk-engine.service.test.ts`
- `backend/tests/trade-plan-risk-engine.paper-readiness.test.ts`
- `git show --stat --name-only 1222daf`
- `git branch --contains 1222daf`
- `git show 1222daf:docs/execution/codex-parallel-execution-plan-2026-05-16/09-summaries/CF-W1-TP-02-po-acceptance-packet.md`
- `git show 1222daf:docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-00-CF-W1-TP-02-delegated-po-acceptance.md`
- `git show 1222daf:docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-CF-W1-TP-02-architect-signoff.md`
- `git show 1222daf:docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-TP-02-qa-verification.md`

## Exact Evidence

- Current `dev` still blocks trusted readiness when `target` is missing.
- Current paper-readiness proof types do not carry `signalReadinessStatus`, `eligibleForSignals`, or `useCaseTiers`, so the approved DQ hard-block policy is not fully enforceable yet.
- Current generation logic only warns on `NOT_READY` and still leaves `LIMITED` and signal-ineligible DQ states underenforced.
- Module-local trusted output still includes target-shaped wording in both service and geometry strings.
- The current repository already persists `dataQualitySnapshot` as a JSON object, so the first child can extend DQ snapshot content without Prisma or repository edits.
- Accepted TP-02 commit `1222daf` is present only on branch `codex/team06-strategy-signal/CF-W1-TP-02`; it is not in current `dev`.
- TP-02 acceptance evidence records delegated PO acceptance, Team 03 architect signoff, Team 04 QA accept, focused backend tests passing, backend build passing, and no repository/schema/routes/frontend/shared/package/generated/provider/live/startup scope.
- TP-02 changed overlapping Trade Plan files and already preserves accepted TP-01B DQ hard-block behavior, so TP-01A cannot safely branch from `dev`.

## Sequencing Refresh Result

Result: `READY-CANDIDATE`

Required future stack base:

- Branch: `codex/team06-strategy-signal/CF-W1-TP-02`
- Commit: `1222daf`
- New branch recommendation: `codex/team06-strategy-signal/CF-W1-TP-01A`

Reason: TP-01A can remain backend-only and module-local if it is a residual no-target/DQ-hard-block hardening or characterization pass on the accepted TP-02 baseline. It must not reimplement TP-02 or widen into persistence, route, shared, frontend, provider/live, startup, package, generated, or schema work.

## Exact Future File Reservation

- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.service.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.types.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.geometry.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.md`
- `backend/tests/modules/trade-plan-risk-engine/trade-plan-risk-engine.service.test.ts`
- `backend/tests/trade-plan-risk-engine.paper-readiness.test.ts`

## Forbidden

- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.repository.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.validation.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.controller.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.router.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.module.ts`
- `backend/src/modules/trade-plan-risk-engine/index.ts`
- `backend/tests/modules/trade-plan-risk-engine/trade-plan-risk-engine.repository.test.ts`
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- backend and frontend route registries
- `backend/src/modules/today-trade-review/**`
- `frontend/src/features/trade-plan-risk-engine/**`
- `frontend/src/features/today-trade-review/**`
- `backend/src/modules/data-quality-engine/**`
- shared backend utilities
- shared frontend components
- package manifests
- generated files
- provider, startup/backfill, live-provider, paid/cloud, broker, and telemetry files

## QA Handoff

Team 04 should focus on:

1. missing DQ hard-block;
2. `NOT_READY` hard-block;
3. `LIMITED` stays non-ready;
4. `eligibleForSignals = false` hard-block;
5. blocked signal-tier evidence hard-block when present;
6. `target = null` not being the sole blocker;
7. positive readiness reasons excluding target-shaped proof;
8. forbidden target/advice wording scan.

## Next Gate

Team 00 Ready evaluation and one-writer sequencing for the exact Trade Plan file set above, stacked on accepted TP-02 commit `1222daf`.
