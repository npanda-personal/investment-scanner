# CF-W1-TP-01A Work Packet

Date: 2026-05-19

## Work Item

Trade Plan no-target compatibility and DQ hard-block trust behavior.

This is the backend-only first child for the approved `CF-W1-TP-01A` policy and the next direct Trade Plan trust packet after the current safety-gate slices.

## State

ACCEPT / READY-CANDIDATE for Team 00 sequencing review.

2026-05-19 sequencing refresh after TP-02 acceptance: this packet is architecture-ready only as a stacked residual Trade Plan slice on accepted `CF-W1-TP-02` commit `1222daf`. It is not valid as a current-`dev` implementation because `dev` does not contain accepted TP-01B/TP-02 Trade Plan source changes.

This packet is not self-promoted. Team 00 must still copy the exact file reservation into the Ready queue, create the future branch from `1222daf`, and keep one writer on the `trade-plan-risk-engine` file set.

## Owner / Lane / Module

- Owner: Team 03 Architecture Factory for docs-only readiness prep.
- Future implementation owner: Team 06 Strategy / Signal / Risk unless Team 00 assigns another Lane 2 writer.
- Lane: Lane 2.
- Module: `trade-plan-risk-engine`.

## Stacking Base Recommendation

- Base branch: `codex/team06-strategy-signal/CF-W1-TP-02`
- Base commit: `1222daf`
- New branch recommendation: `codex/team06-strategy-signal/CF-W1-TP-01A`
- Rationale: accepted TP-02 overlaps TP-01A's Trade Plan source/doc/test writer set and already preserves accepted TP-01B DQ hard-block behavior. TP-01A must preserve TP-02 exit/invalidation semantics and should only address residual no-target/DQ-hard-block trust gaps or characterization.

## Exact Future File Reservation

Allowed implementation files after stacking on `1222daf`:

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
- `backend/src/modules/today-trade-review/**`
- `backend/tests/modules/today-trade-review/**`
- `frontend/src/features/trade-plan-risk-engine/**`
- `frontend/src/features/today-trade-review/**`
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- backend and frontend route registries
- shared backend utilities
- shared frontend components
- package manifests
- generated files
- `backend/src/modules/data-quality-engine/**`
- provider, scheduler, startup/backfill, live-provider, paid/cloud, broker, and telemetry files

## Required Behavior

The future child must:

- preserve existing `target` fields for compatibility only;
- stop treating missing `target` as trusted paper-readiness failure by itself;
- hard-block trusted paper-readiness on missing DQ, `UNUSABLE`, `NOT_READY`, `LIMITED`, `ILLIQUID`, stale blockers, `eligibleForSignals = false`, and blocked signal-tier evidence when present;
- keep `LIMITED` non-ready;
- rephrase module-local trusted wording away from target-promise semantics and toward exit review, invalidation review, risk review, and evidence wording;
- preserve accepted TP-02 `exitConditions[]`, `invalidationConditions[]`, and `targetRewardRisk` validation behavior;
- preserve current API field names, persisted row structure, routes, and module boundaries.

## Required QA Focus

Team 04 should reuse the focused `CF-W1-TP-01B` backend-only QA plan and confirm:

- missing DQ blocks trusted paper-readiness;
- `NOT_READY` and `LIMITED` never become `READY_FOR_PAPER_REVIEW`;
- `eligibleForSignals = false` blocks trusted paper-readiness;
- `useCaseTiers.signal.status = BLOCKED` blocks trusted paper-readiness when tier evidence is present;
- `target = null` is not the sole blocker;
- positive readiness reasons do not cite target-shaped fields;
- trusted outputs/tests avoid `price target`, `profit target`, `must buy`, `must sell`, `guaranteed`, `buy now`, and `sell now`.

## Sequencing Constraint

This child must not run in parallel with any other `trade-plan-risk-engine` source packet. Since `CF-W1-TP-02` is accepted and parked at `1222daf`, TP-01A must stack on that commit rather than branch from `dev`.

## Focused Validation Commands After Future Implementation

Do not run during this docs-only pass.

```powershell
cd backend
npm.cmd test -- trade-plan-risk-engine.service.test.ts trade-plan-risk-engine.paper-readiness.test.ts --runInBand
```

Product-language scan:

```powershell
rg -n "price target|profit target|must buy|must sell|guaranteed|buy now|sell now" backend/src/modules/trade-plan-risk-engine backend/tests/modules/trade-plan-risk-engine backend/tests/trade-plan-risk-engine.paper-readiness.test.ts
```

## Stop Conditions

Stop and return to Team 00 / Architect if implementation needs:

- a current-`dev` implementation base instead of accepted TP-02 commit `1222daf`;
- repository behavior changes;
- Prisma/schema or migration changes;
- route registry changes;
- Today Review or frontend changes;
- shared utility or shared UI changes;
- package or generated-file changes;
- DQE source changes;
- a Product Owner exception that lets `LIMITED` become paper-ready.

## Next Gate

Team 00 Ready evaluation and writer-lane sequencing.
