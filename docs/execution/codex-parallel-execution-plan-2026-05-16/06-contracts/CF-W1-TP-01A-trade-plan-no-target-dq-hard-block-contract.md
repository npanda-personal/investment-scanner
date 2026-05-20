# CF-W1-TP-01A Trade Plan No-Target Compatibility And DQ Hard-Block Contract

Date: 2026-05-19

## Status

ACCEPT / READY-CANDIDATE contract for Team 00 Ready evaluation.

Product Owner policy was already resolved on 2026-05-17 through Option B. 2026-05-19 sequencing refresh: this contract is READY-CANDIDATE only as a stacked one-writer Trade Plan slice on accepted `CF-W1-TP-02` commit `1222daf`; it must not be implemented from current `dev`.

This refresh defines the exact backend-only child boundary that can finish or characterize residual TP-01A trust behavior without reopening frontend, Today Review, Prisma, repository, route, shared, package, generated, provider/live, startup, or schema scope.

## Contract Intent

Trade Plan Risk Engine must support research review without arbitrary target-price trust semantics and without fail-open paper-readiness when Data Quality is missing, limited, blocked, or stale.

This contract stays separate from:

- `CF-W1-STRAT-01`, which handled Strategy Decision no-target compatibility only;
- `CF-W1-TP-02`, which is now accepted at local branch commit `1222daf` and must be the stacking base for any future TP-01A residual slice.

## Accepted Stacking Base

- Base branch: `codex/team06-strategy-signal/CF-W1-TP-02`
- Base commit: `1222daf`
- Commit title: `feat: add trade plan exit invalidation semantics`
- Reason: TP-02 and TP-01A reserve overlapping Trade Plan service/types/doc/test files, and TP-02 already preserves accepted TP-01B Data Quality hard-block behavior.
- Current `dev` is not a valid TP-01A implementation base because it does not include accepted parked TP-01B/TP-02 Trade Plan source changes.

If Team 00 promotes TP-01A, the future branch should be created from `1222daf` and should treat accepted TP-02 behavior as baseline, not as work to reimplement.

## Approved Compatibility Rule

The first child must preserve existing `target` fields for compatibility only:

- `target.price`
- `target.expectedReturnPercent`
- `target.method`
- `target.quality`
- `target.rationale`

The child must not treat those fields as:

- trusted paper-readiness proof;
- a price target or profit target;
- a recommendation or promise;
- a direct buy/sell instruction.

Allowed first-child behavior:

- `target` may remain in the DTO and persisted JSON snapshot;
- `target = null` must not be the sole trusted-readiness blocker;
- positive readiness reasons must not cite target-shaped fields;
- module-local copy may rephrase target-related warnings/rationale so trusted output reads as modeled review geometry, exit review, invalidation review, or risk review rather than objective target guidance.

## Approved DQ Hard-Block Rule

Trusted paper-readiness must fail closed on the first child when any of the following is true:

- Data Quality snapshot is missing;
- `coverageStatus = UNUSABLE`;
- `signalReadinessStatus = NOT_READY`;
- `signalReadinessStatus = LIMITED`;
- `liquidityStatus = ILLIQUID`;
- stale hard-blocker evidence is present in DQ blockers;
- `eligibleForSignals = false`;
- `useCaseTiers.signal.status = BLOCKED` when tier evidence is present.

`LIMITED` may surface as limited review only, but it must not become `READY_FOR_PAPER_REVIEW`.

## Allowed First-Child Type/Service Adjustment

The child may extend module-local Trade Plan snapshot/proof types so the classifier can consume DQ fields already available from Data Quality Engine output, including:

- `signalReadinessStatus`
- `eligibleForSignals`
- `useCaseTiers`

No Data Quality Engine source or public export change is approved. The Trade Plan module must consume the existing public DQ output and persist any additive JSON snapshot data through its current module-owned snapshot object only.

## Exact Future File Reservations

Allowed future implementation files after stacking on `1222daf`:

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

## Acceptance Criteria For Future Promotion

- missing `target` is no longer the sole blocker for trusted paper-readiness;
- `NOT_READY`, `LIMITED`, missing DQ, `UNUSABLE`, `ILLIQUID`, stale blockers, signal ineligibility, and blocked signal-tier evidence fail closed;
- positive readiness reasons do not cite target-shaped compatibility fields;
- trusted output and focused tests avoid `price target`, `profit target`, `must buy`, `must sell`, `guaranteed`, `buy now`, and `sell now`;
- API field names, persisted row structure, route shapes, and frontend contracts remain unchanged in this first child.
- accepted TP-02 `exitConditions[]` and `invalidationConditions[]` behavior is preserved and not duplicated or downgraded.

## New Decision Packet Threshold

A new Decision Packet is required if implementation needs any of the following:

- remove, rename, null-migrate, or reinterpret persisted/API target fields;
- widen `LIMITED` into a paper-ready state;
- change frontend or Today Review copy/behavior;
- change Prisma/schema, repository behavior, routes, shared utilities, packages, generated files, provider/startup behavior, or live-provider flows.
- implement TP-01A from current `dev` instead of stacking on accepted TP-02 commit `1222daf`.
