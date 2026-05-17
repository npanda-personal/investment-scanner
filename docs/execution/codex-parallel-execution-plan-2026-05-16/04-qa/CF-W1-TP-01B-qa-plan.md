# CF-W1-TP-01B QA Plan

Date: 2026-05-17

Owner: Team 04 QA Factory

Status: Backend-only child QA plan prepared. Not executable until Team 00 promotes exact Trade Plan file reservations and implementation handoff exists.

## Scope

Backend-only validation for Trade Plan no-target compatibility and Data Quality hard-block behavior under accepted `CF-W1-TP-01A` Option B.

This plan covers:

- paper-readiness classification,
- compatibility-only target-shaped fields,
- product-language checks for target/advice wording,
- Data Quality hard blockers.

This plan excludes frontend, Today Review, Prisma/schema/migration, repository behavior, route registries, shared utilities/UI, package/generated files, providers, startup/backfill, live-provider checks, Angel One, broker flows, paid/cloud services, UI smoke, broad suites, staging, commits, and pushes.

## Contract Inputs

- `03-architecture/CF-W1-TP-01B-architecture-review.md`
- `06-contracts/CF-W1-TP-01B-backend-compatibility-dq-hard-block-contract.md`
- `08-work-packets/CF-W1-TP-01B-work-packet.md`
- `04-qa/CF-W1-TP-01A-qa-plan.md`
- `04-qa/post-decision-child-scenario-matrix-2026-05-17.md`

## Required QA Assertions

- Missing Data Quality snapshot blocks trusted paper-readiness.
- `coverageStatus = UNUSABLE` remains blocked.
- `signalReadinessStatus = NOT_READY` blocks trusted paper-readiness.
- `signalReadinessStatus = LIMITED` is not `READY_FOR_PAPER_REVIEW`; it is blocked or limited-review-only.
- `liquidityStatus = ILLIQUID` remains blocked.
- Stale hard blocker text in DQ evidence blocks trusted paper-readiness.
- Required use-case tier `BLOCKED` blocks trusted paper-readiness.
- `eligibleForSignals = false` blocks trusted paper-readiness when the plan depends on signal/strategy evidence.
- Existing target-shaped fields can remain present for compatibility, but missing `target` must not be the sole paper-readiness blocker.
- Positive paper-readiness reasons must not cite target-shaped fields as readiness proof.
- Trusted outputs and tests avoid forbidden wording: `price target`, `profit target`, `must buy`, `must sell`, `guaranteed`, `buy now`, `sell now`.

## Scenario Matrix

| Scenario | Input condition | Expected QA result |
| --- | --- | --- |
| Valid trusted DQ | READY DQ, liquid, eligible, no stale blocker, required tier ready | Paper-readiness may be `READY_FOR_PAPER_REVIEW` only if non-target readiness proof passes. |
| Missing DQ | `dataQualitySnapshot` absent or incomplete | Paper-readiness is blocked or insufficient; blocker reason is present. |
| `NOT_READY` DQ | `signalReadinessStatus = NOT_READY` | Paper-readiness is not ready; blocker reason is present. |
| `LIMITED` DQ | `signalReadinessStatus = LIMITED` or limited use-case tier | Paper-readiness is not `READY_FOR_PAPER_REVIEW`; limited review, if any, is explicitly non-ready. |
| Signal ineligible | `eligibleForSignals = false` | Paper-readiness is not ready when signal/strategy proof is required. |
| Existing hard blockers | `coverageStatus = UNUSABLE`, `liquidityStatus = ILLIQUID`, stale hard blocker, blocked tier, unsupported/scope/provider blockers | Paper-readiness is blocked and reason evidence is preserved. |
| Missing target compatibility | `target = null` while other non-target readiness proof passes | Missing target is not the sole blocker under compatibility direction. |
| Target-shaped fields retained | `target.price`, `expectedReturnPercent`, `method`, `quality`, `rationale` present | Fields are treated as modeled review geometry only, not recommendation or readiness proof. |
| Product-language scan | Trusted output/test fixture copy contains forbidden target/advice language | QA rejects. |
| Scope expansion | Implementation touches repository, Prisma, frontend, Today Review, routes, shared files, provider/startup, or live flows | QA rejects or returns to Team 00/Architect for a new packet. |

## Focused Command Guidance

Run only after backend-only child implementation exists:

```powershell
cd backend
npm.cmd test -- trade-plan-risk-engine.service.test.ts trade-plan-risk-engine.paper-readiness.test.ts --runInBand
```

Repository behavior remains out of scope. Run only if Team 00 separately approves repository file reservations:

```powershell
cd backend
npm.cmd test -- trade-plan-risk-engine.repository.test.ts --runInBand
```

Product-language scan guidance after implementation:

```powershell
rg -n "price target|profit target|must buy|must sell|guaranteed|buy now|sell now" backend/src/modules/trade-plan-risk-engine backend/tests/modules/trade-plan-risk-engine backend/tests/trade-plan-risk-engine.paper-readiness.test.ts
```

## QA Rejection Criteria

- `LIMITED` or `NOT_READY` becomes `READY_FOR_PAPER_REVIEW`.
- Missing target remains the sole blocker for paper-readiness.
- Target-shaped fields are used as trusted readiness proof.
- New trusted output presents a target price, profit target, predicted return, direct recommendation, guarantee, or trade instruction.
- Implementation removes/renames API fields, changes repository behavior, or touches frontend/Today Review without a new accepted packet.
- Validation requires live providers, broad suites, Prisma mutation, startup/backfill, or UI checks.

## Evidence Required Later

- Exact implementation handoff with changed files.
- Scenario results for missing, `NOT_READY`, `LIMITED`, signal-ineligible, blocked tier, stale, `UNUSABLE`, and `ILLIQUID` cases.
- Focused command output.
- Product-language scan result or equivalent test assertion.
- Confirmation no forbidden files or commands were used.
- Skipped checks and next owner.
