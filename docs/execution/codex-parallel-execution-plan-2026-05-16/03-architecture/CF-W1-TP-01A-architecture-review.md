# CF-W1-TP-01A Architecture Review

Date: 2026-05-19

Owner: Team 03 Architecture Factory

## Status

ACCEPT / READY-CANDIDATE for Team 00 sequencing review.

Refresh on 2026-05-19 after `CF-W1-TP-02` acceptance: `CF-W1-TP-01A` remains a READY-CANDIDATE only as a stacked one-writer Trade Plan slice on accepted TP-02 commit `1222daf` (`codex/team06-strategy-signal/CF-W1-TP-02`). It must not be implemented from current `dev`, because `dev` does not contain the accepted TP-01B/TP-02 Trade Plan baseline and would recreate already-accepted Trade Plan edits.

This is the next direct Trade Plan trust packet after accepted TP-02 only if Team 00 wants a residual no-target/DQ-hard-block cleanup or characterization pass. It is not auto-promoted. Team 00 still owns one-writer sequencing because the child uses the same `trade-plan-risk-engine` writer set as TP-02.

## Evidence Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-TP-01A-trade-plan-no-target-compatibility-dq-hard-block-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/next-top-10-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/12-ready-queue/ready-for-implementation.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/07-decisions/DECISION-20260517-trade-plan-no-target-dq-hard-block-resolution.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-TP-01A-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-TP-01B-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-TP-01B-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-TP-02-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-TP-01A-trade-plan-no-target-dq-hard-block-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-TP-01B-backend-compatibility-dq-hard-block-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-TP-01A-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-TP-01B-work-packet.md`
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
- `git show 1222daf:docs/execution/codex-parallel-execution-plan-2026-05-16/09-summaries/CF-W1-TP-02-po-acceptance-packet.md`
- `git show 1222daf:docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-00-CF-W1-TP-02-delegated-po-acceptance.md`
- `git show 1222daf:docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-CF-W1-TP-02-architect-signoff.md`
- `git show 1222daf:docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-TP-02-qa-verification.md`

## Current `dev` Source Findings

- `classifyPaperReadiness()` still blocks trusted readiness when `plan.target` is missing, so target-shaped compatibility data is still treated as required proof.
- `PaperReadinessDataQualityProof` does not currently carry `signalReadinessStatus`, `eligibleForSignals`, or DQ use-case tier evidence, so the current classifier cannot enforce the full approved hard-block policy.
- `generatePlan()` still treats `signalReadinessStatus = NOT_READY` as a warning path and does not hard-block `LIMITED` or `eligibleForSignals = false`.
- Trusted output copy still contains target-shaped language in module-local output strings, including the default target rationale and the current-below-entry warning in `trade-plan-risk-engine.geometry.ts`.
- `dataQualitySnapshot` is already persisted as module-owned JSON, and the repository stores that object without shape-specific Prisma mapping. The first child can therefore extend snapshot content through service/types only, with no Prisma or repository change.

## Accepted TP-02 Base Findings

- `CF-W1-TP-02` is accepted and locally committed on branch `codex/team06-strategy-signal/CF-W1-TP-02` as `1222daf` (`feat: add trade plan exit invalidation semantics`).
- TP-02 is stacked on accepted `CF-W1-TP-01B` commit `8ff22fd`; its acceptance evidence states TP-01B Data Quality hard-block behavior is preserved.
- TP-02 changed only Trade Plan module-local source/doc/tests plus execution evidence docs. Application-code changes were limited to `trade-plan-risk-engine.service.ts`, `trade-plan-risk-engine.types.ts`, `trade-plan-risk-engine.validation.ts`, `trade-plan-risk-engine.md`, `trade-plan-risk-engine.service.test.ts`, and `trade-plan-risk-engine.paper-readiness.test.ts`.
- On commit `1222daf`, paper-readiness classification no longer blocks solely on missing `target`; it requires exit and invalidation condition evidence instead.
- On commit `1222daf`, focused tests cover missing DQ, `NOT_READY`, `LIMITED`, `eligibleForSignals=false`, stale/provider/scope blockers, required `SIGNAL_BLOCKED` blocker evidence, and `target=null` not being the sole readiness blocker.
- TP-02 still explicitly leaves repository-backed durable readback of additive exit/invalidation arrays out of scope. TP-01A must not try to solve that persistence limitation.

## Architecture Decision

The first child remains backend-only and module-local, but its valid implementation base is now accepted TP-02 commit `1222daf`, not current `dev`.

A safe stacked implementation exists only if the future child is limited to residual TP-01A trust cleanup, characterization, or additional hard-block proof coverage inside `trade-plan-risk-engine` without Prisma, repository, route, shared utility, generated, package, frontend, provider/live/startup, or Today Review scope. The child should:

- keep `target` DTO fields present for compatibility only;
- remove `target` as a required trusted paper-readiness proof input;
- hard-block trusted paper-readiness on missing DQ, `UNUSABLE`, `NOT_READY`, `LIMITED`, `ILLIQUID`, stale hard blockers, `eligibleForSignals = false`, and `useCaseTiers.signal.status = BLOCKED` when tier evidence is present;
- keep `LIMITED` non-ready and never `READY_FOR_PAPER_REVIEW`;
- shift trusted wording toward exit-condition, invalidation-condition, risk-review, evidence, and reason-summary language, while leaving the compatibility field names intact.

Because accepted TP-02 already implements much of this behavior, Team 00 should sequence TP-01A as a narrow verification/residual-hardening slice rather than as a duplicate rewrite of accepted TP-02 semantics.

## Exact Future File Reservations

Allowed future implementation files:

- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.service.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.types.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.geometry.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.md`
- `backend/tests/modules/trade-plan-risk-engine/trade-plan-risk-engine.service.test.ts`
- `backend/tests/trade-plan-risk-engine.paper-readiness.test.ts`

## Exact Forbidden Future Implementation Files

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
- provider, startup/backfill, live-provider, paid/cloud, broker, and telemetry flows

## QA Focus For The Future Child

Required focused QA:

- missing DQ snapshot blocks trusted paper-readiness;
- `signalReadinessStatus = NOT_READY` blocks trusted paper-readiness;
- `signalReadinessStatus = LIMITED` remains non-ready;
- `eligibleForSignals = false` blocks trusted paper-readiness;
- `useCaseTiers.signal.status = BLOCKED` blocks trusted paper-readiness when tier evidence is present;
- `target = null` is not the sole blocker when the non-target proof chain passes;
- positive readiness reasons do not cite target-shaped fields;
- trusted output/tests avoid `price target`, `profit target`, `must buy`, `must sell`, `guaranteed`, `buy now`, and `sell now`.

## Sequencing Constraint

This packet is not parallel-safe with any other `trade-plan-risk-engine` source writer. Because accepted TP-02 already touched the same source/doc/test files, TP-01A must stack on `1222daf` and Team 00 must reserve the full file set above to one writer in one pass.

## Ready Recommendation

- Result: `READY-CANDIDATE`
- Stacking base: `codex/team06-strategy-signal/CF-W1-TP-02` at `1222daf`; do not branch from current `dev`.
- Why: the future residual child can stay module-local and backend-only if it builds on accepted TP-02 and avoids persistence, route, shared, frontend, provider/live, startup, package, generated, and schema scope.
- Blocker if not stacked: current `dev` lacks accepted TP-01B/TP-02 Trade Plan changes, so a `dev`-based TP-01A implementation would conflict with accepted parked work and violate one-writer sequencing.
- Next gate: Team 00 Ready evaluation and writer-lane sequencing using the exact file reservations above.
