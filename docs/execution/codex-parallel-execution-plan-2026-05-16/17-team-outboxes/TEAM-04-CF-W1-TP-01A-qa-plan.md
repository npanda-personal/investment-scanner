# Team 04 CF-W1-TP-01A QA Outbox

Date: 2026-05-19

## Work Item

`CF-W1-TP-01A` Trade Plan no-target compatibility and DQ hard-block trust behavior.

## State / Mode

Completed - docs-only QA planning.

## Verdict

ACCEPT / READY-FOR-TEAM00-EVALUATION

QA readiness is accepted for Team 00 Ready evaluation as one bounded backend-only `trade-plan-risk-engine` child. This is acceptance of the QA plan only, not executable QA evidence.

## Owner / Lane / Module

- Owner: Team 04 QA Factory
- Lane: Lane 2
- Module: `trade-plan-risk-engine`

## Files Changed

- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-TP-01A-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-CF-W1-TP-01A-qa-plan.md`

## Files Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-TP-01A-trade-plan-no-target-compatibility-dq-hard-block-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-TP-01A-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-TP-01A-trade-plan-no-target-dq-hard-block-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-TP-01A-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-CF-W1-TP-01A-architecture.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-TP-01A-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-TP-01B-qa-plan.md`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.service.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.types.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.geometry.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.md`
- `backend/src/modules/data-quality-engine/data-quality-engine.types.ts`
- `backend/tests/modules/trade-plan-risk-engine/trade-plan-risk-engine.service.test.ts`
- `backend/tests/trade-plan-risk-engine.paper-readiness.test.ts`

## Scenario Coverage Recorded

- Missing DQ snapshot is a hard-block.
- `signalReadinessStatus = NOT_READY` is a hard-block.
- `signalReadinessStatus = LIMITED` remains non-ready or limited-review-only and never `READY_FOR_PAPER_REVIEW`.
- `eligibleForSignals = false` is a hard-block.
- `useCaseTiers.signal.status = BLOCKED` is a hard-block when tier evidence is present.
- `target = null` is not allowed to remain the sole blocker when non-target proof passes.
- Positive readiness reasons must exclude target-shaped compatibility proof.
- Trusted output and focused tests must avoid target/advice wording.
- Reject-on-scope-drift applies to repository, controller, router, validation, module, index, DQE, frontend, Today Review, Prisma, package, generated, and shared-file changes.

## Focused Commands

Run only after Team 00 promotes the bounded child and an implementation handoff exists:

```powershell
cd backend
npm.cmd test -- trade-plan-risk-engine.service.test.ts trade-plan-risk-engine.paper-readiness.test.ts --runInBand
```

```powershell
rg -n "price target|profit target|must buy|must sell|guaranteed|buy now|sell now" backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.service.ts backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.geometry.ts backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.md backend/tests/modules/trade-plan-risk-engine/trade-plan-risk-engine.service.test.ts backend/tests/trade-plan-risk-engine.paper-readiness.test.ts
```

Optional after approval and resource check:

```powershell
cd backend
npm.cmd run build
```

## Tests Run

None.

## Tests Skipped

- All executable checks were skipped because this assignment was docs-only QA planning and did not authorize tests, builds, services, Prisma commands, provider/live-data validation, or UI checks.

## Blockers

- Executable QA remains blocked until Team 00 promotes the exact Trade Plan service/types/geometry/doc/test writer set and an implementation handoff exists.
- Any widening into repository, controller, router, validation, module, index, DQE source, frontend, Today Review, Prisma, shared utils/UI, package manifests, generated files, provider/live-data, or startup/backfill scope is an immediate reject condition for this first child.
- Any attempt to keep `target = null` as the sole readiness blocker, keep `NOT_READY` or `LIMITED` as warning-only, or use target-shaped compatibility fields as trusted proof is an immediate reject condition.

## Next Gate

Team 00 Ready evaluation and sequencing for the bounded backend-only `trade-plan-risk-engine` first child.

## Evidence Notes

Primary QA planning evidence is recorded in `04-qa/CF-W1-TP-01A-qa-plan.md`.
