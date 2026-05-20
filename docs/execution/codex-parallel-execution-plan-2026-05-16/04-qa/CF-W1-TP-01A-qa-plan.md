# CF-W1-TP-01A QA Plan

Date: 2026-05-19

Owner: Team 04 QA Factory

Status: ACCEPT / READY-FOR-TEAM00-EVALUATION. Backend-only first-child QA plan prepared for `trade-plan-risk-engine`. Executable QA remains blocked until Team 00 promotes one exact implementation handoff for the reserved source/doc/test files below.

## Scope

Backend-only validation plan for Trade Plan no-target compatibility and Data Quality hard-block trust behavior under the accepted `CF-W1-TP-01A` requirement, architecture review, contract, and work packet.

In-scope future implementation surfaces:

- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.service.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.types.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.geometry.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.md`
- `backend/tests/modules/trade-plan-risk-engine/trade-plan-risk-engine.service.test.ts`
- `backend/tests/trade-plan-risk-engine.paper-readiness.test.ts`

Out of scope for this first child:

- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.repository.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.validation.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.controller.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.router.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.module.ts`
- `backend/src/modules/trade-plan-risk-engine/index.ts`
- `backend/tests/modules/trade-plan-risk-engine/trade-plan-risk-engine.repository.test.ts`
- `backend/src/modules/data-quality-engine/**`
- `backend/src/modules/today-trade-review/**`
- `frontend/src/features/trade-plan-risk-engine/**`
- `frontend/src/features/today-trade-review/**`
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- backend and frontend route registries
- shared backend utilities
- shared frontend components
- package manifests
- generated files
- provider, startup/backfill, scheduler, live-provider, paid/cloud, broker, and telemetry flows

This plan records QA planning only. It does not approve source edits, test execution, builds, Prisma commands, local servers, UI checks, or Ready promotion by itself.

## Contract Inputs And Current `dev` Alignment

Primary planning inputs:

- `10-requirements/CF-W1-TP-01A-trade-plan-no-target-compatibility-dq-hard-block-requirement.md`
- `03-architecture/CF-W1-TP-01A-architecture-review.md`
- `06-contracts/CF-W1-TP-01A-trade-plan-no-target-dq-hard-block-contract.md`
- `08-work-packets/CF-W1-TP-01A-work-packet.md`
- `17-team-outboxes/TEAM-03-CF-W1-TP-01A-architecture.md`

Current source evidence on `dev` still matches the Team 03 gap report:

- `trade-plan-risk-engine.service.ts` still blocks trusted readiness on `!plan.target` in `classifyPaperReadiness()`.
- `generatePlan()` still warns on `signalReadinessStatus = NOT_READY` instead of hard-blocking it.
- `DataQualitySnapshot` and `toDataQualitySnapshot()` currently carry `signalReadinessStatus` and `eligibleForSignals`, but not `useCaseTiers`, so blocked signal-tier evidence is not yet enforceable through the Trade Plan snapshot.
- Trusted module-local language still includes target-shaped copy such as `Target is modeled at 2R by default.` and `sizing and target assume waiting for the entry-zone floor.`
- Existing repository persistence already stores `dataQualitySnapshot` as module-owned JSON, so the first child should stay service/types/doc/test local without Prisma or repository edits.

## Required QA Assertions

- Missing `dataQualitySnapshot` hard-blocks trusted paper-readiness.
- `coverageStatus = UNUSABLE` hard-blocks trusted paper-readiness.
- `signalReadinessStatus = NOT_READY` hard-blocks trusted paper-readiness.
- `signalReadinessStatus = LIMITED` remains non-ready; it may be limited-review-only, but it must never become `READY_FOR_PAPER_REVIEW`.
- `liquidityStatus = ILLIQUID` hard-blocks trusted paper-readiness.
- Stale hard-blocker evidence inside DQ blockers hard-blocks trusted paper-readiness.
- `eligibleForSignals = false` hard-blocks trusted paper-readiness.
- `useCaseTiers.signal.status = BLOCKED` hard-blocks trusted paper-readiness when tier evidence is present.
- `target = null` is not the sole blocker when non-target proof passes.
- Positive readiness reasons do not cite `target.price`, `target.expectedReturnPercent`, `target.method`, `target.quality`, or `target.rationale` as trusted readiness proof.
- Trusted output and focused tests use research-support wording and avoid `price target`, `profit target`, `must buy`, `must sell`, `guaranteed`, `buy now`, and `sell now`.
- API field names, persisted row structure, route shapes, and frontend contracts remain unchanged in this first child.

## Scenario Matrix

| Scenario | Expected QA result after implementation |
| --- | --- |
| Non-target proof passes and DQ is ready | `READY_FOR_PAPER_REVIEW` is allowed only when plan validity, risk grade, decision proof, and DQ proof pass without relying on `target` as trusted proof. |
| `dataQualitySnapshot` missing | Paper-readiness is blocked or insufficient; blocker reason explicitly states missing data-quality evidence. |
| `coverageStatus = UNUSABLE` | Paper-readiness is blocked with preserved DQ blocker evidence. |
| `signalReadinessStatus = NOT_READY` | Paper-readiness is not ready; this is a hard-block, not a warning-only path. |
| `signalReadinessStatus = LIMITED` | Paper-readiness is not `READY_FOR_PAPER_REVIEW`; any limited-review outcome remains explicitly non-ready. |
| `liquidityStatus = ILLIQUID` | Paper-readiness is blocked with preserved liquidity evidence. |
| Stale DQ blocker present | Paper-readiness is blocked even if other fields look otherwise valid. |
| `eligibleForSignals = false` | Paper-readiness is blocked when plan trust depends on signal/strategy evidence. |
| `useCaseTiers.signal.status = BLOCKED` present | Paper-readiness is blocked and the signal-tier evidence is preserved in reasons/blockers. |
| `target = null` while non-target proof chain passes | Missing target does not remain the sole blocker. |
| Compatibility target fields retained | Fields may remain in DTO/persisted JSON, but readiness reasons do not treat them as advice, promise, or proof. |
| Trusted wording still contains target/advice terms | QA rejects. |
| Implementation touches forbidden files or scope | QA rejects and returns the packet to Team 00 / Architect. |

## Focused Command Guidance

Commands below are guidance only. They were not run during this docs-only QA planning task.

Future focused validation after Team 00 Ready promotion and implementation handoff:

```powershell
cd backend
npm.cmd test -- trade-plan-risk-engine.service.test.ts trade-plan-risk-engine.paper-readiness.test.ts --runInBand
```

Reserved-file wording scan after implementation:

```powershell
rg -n "price target|profit target|must buy|must sell|guaranteed|buy now|sell now" backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.service.ts backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.geometry.ts backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.md backend/tests/modules/trade-plan-risk-engine/trade-plan-risk-engine.service.test.ts backend/tests/trade-plan-risk-engine.paper-readiness.test.ts
```

Approval-gated backend build after accepted implementation and resource check:

```powershell
cd backend
npm.cmd run build
```

## Skipped / Forbidden Checks

Skipped in this planning pass:

- all executable tests
- backend/frontend builds
- local servers, services, provider checks, and UI smoke
- live local data validation

Forbidden by default for this first child:

- repository/controller/router/validation/module/index widening inside `trade-plan-risk-engine`
- any `data-quality-engine` source edit used to backdoor `useCaseTiers` or readiness changes into the packet
- Prisma generate, migrate, db push, db execute, or any schema/data mutation
- frontend, Today Review, shared utility, shared UI, package, generated-file, or route-registry changes
- provider/live-market, startup/backfill, paid/cloud, telemetry, broker, or broad backend suites

## Exact Reject Conditions

Reject the packet immediately and return it to Team 00 / Architect if implementation edits:

- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.repository.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.validation.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.controller.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.router.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.module.ts`
- `backend/src/modules/trade-plan-risk-engine/index.ts`
- `backend/tests/modules/trade-plan-risk-engine/trade-plan-risk-engine.repository.test.ts`
- any `backend/src/modules/data-quality-engine/**` file
- any `backend/src/modules/today-trade-review/**` file
- any `frontend/src/features/trade-plan-risk-engine/**` file
- any `frontend/src/features/today-trade-review/**` file
- `backend/prisma/schema.prisma` or any migration file
- backend or frontend route registries
- shared backend utilities
- shared frontend components
- package manifests
- generated files
- provider, startup/backfill, scheduler, live-provider, telemetry, broker, or paid/cloud flow files

Also reject if implementation:

- keeps `target = null` as the sole readiness blocker
- leaves `NOT_READY` or `LIMITED` as warning-only for trusted readiness
- omits blocked signal-tier enforcement once `useCaseTiers` evidence is added to the reserved Trade Plan types/service path
- widens `LIMITED` into `READY_FOR_PAPER_REVIEW`
- uses target-shaped compatibility fields as trusted readiness proof
- introduces forbidden target/advice wording into trusted output, docs, or focused tests

These are hard reject conditions for the first child, not soft warnings.

## Stop Conditions

Stop QA and return to Team 00 / Architect if:

- implementation cannot enforce the contract using only the reserved Trade Plan service/types/geometry/doc/test files
- implementation needs repository behavior changes, controller/router/validation/module/index edits, or DQE source edits
- implementation needs frontend or Today Review copy/behavior changes to satisfy the requirement
- implementation needs Prisma/schema, route, shared utility, shared UI, package, or generated-file changes
- implementation needs a Product Owner exception to let `LIMITED` become paper-ready

## Evidence Required Later

- Exact implementation handoff limited to the reserved six-file Trade Plan writer set
- Scenario evidence for missing DQ, `UNUSABLE`, `NOT_READY`, `LIMITED`, `ILLIQUID`, stale blocker, `eligibleForSignals = false`, blocked signal-tier evidence, and non-target-ready cases
- Focused test output from `trade-plan-risk-engine.service.test.ts` and `trade-plan-risk-engine.paper-readiness.test.ts`
- Reserved-file wording scan result
- Backend build output only after approval
- Explicit confirmation that repository, controller, router, validation, module, index, DQE, frontend, Prisma, package, generated, and shared-file scopes remained untouched

## Next Gate

Team 00 Ready evaluation and one-writer sequencing for the bounded backend-only `trade-plan-risk-engine` first child.
