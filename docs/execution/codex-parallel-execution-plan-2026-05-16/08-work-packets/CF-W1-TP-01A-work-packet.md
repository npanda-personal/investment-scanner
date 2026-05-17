# CF-W1-TP-01A Work Packet

Date: 2026-05-17

## Work Item

Trade Plan no-target compatibility and Data Quality hard-block contract.

## State

Docs-only contract draft prepared. Application implementation is blocked.

## Owner / Lane / Module

- Owner: Team 03 Architecture Factory until Product Owner and Architect decision.
- Lane: Lane 2.
- Module: trade-plan-risk-engine.

## Current Allowed Files

Only active execution documentation under:

- `03-architecture/**`
- `06-contracts/**`
- `08-work-packets/**`

## Current Forbidden Files

- `backend/src/modules/trade-plan-risk-engine/**`
- `backend/tests/modules/trade-plan-risk-engine/**`
- `backend/tests/trade-plan-risk-engine.paper-readiness.test.ts`
- `backend/src/modules/today-trade-review/**`
- `backend/tests/modules/today-trade-review/**`
- `frontend/src/features/trade-plan-risk-engine/**`
- `frontend/src/features/today-trade-review/**`
- Prisma schema or migrations
- route registries
- shared UI/utilities
- package manifests
- generated types
- provider, scheduler, startup, Angel One, broker, live-provider files

## Decisions Needed

Product Owner and Architect must decide:

- whether the existing `target` object remains as a compatibility field,
- whether trusted Trade Plan outputs should emit `target = null`,
- whether frontend labels change from target/reward to exit/invalidation/risk review,
- how `LIMITED` Data Quality affects paper-readiness status,
- how existing stored Trade Plan rows should be treated on read paths.

## Future Reservation Model After Decision

If a bounded backend-only compatibility slice is accepted, reserve exact files in one pass, likely:

- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.service.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.types.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.repository.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.geometry.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.md`
- `backend/tests/modules/trade-plan-risk-engine/trade-plan-risk-engine.service.test.ts`
- `backend/tests/modules/trade-plan-risk-engine/trade-plan-risk-engine.repository.test.ts`
- `backend/tests/trade-plan-risk-engine.paper-readiness.test.ts`

Frontend and Today Review changes must be separate UX/API slices unless the decision explicitly reserves them.

## Stop Conditions

Stop if implementation would:

- remove or reinterpret API fields without Product Owner acceptance,
- change frontend display copy without UX acceptance,
- require Prisma changes,
- require route registry changes,
- alter Strategy Decision semantics already completed by `CF-W1-STRAT-01`.

## Future Validation Commands

Do not run during docs-only prep. Later implementation owner should use focused tests after code changes:

```powershell
cd backend
npm.cmd test -- trade-plan-risk-engine.service.test.ts trade-plan-risk-engine.repository.test.ts trade-plan-risk-engine.paper-readiness.test.ts --runInBand
```

## Acceptance Criteria For This Packet

- Trade Plan target/no-target decision points are explicit.
- DQ hard-block policy gaps are explicit.
- No source implementation is opened.
- Future reservations are bounded and separated from frontend/Today Review unless approved.

## Team 03 Relaunch Update - 2026-05-17

Current state remains docs-only and blocked from app-code implementation.

Exact current write scope for this Team 03 pass:

- `03-architecture/next-contracts-to-prepare.md`
- `03-architecture/CF-W1-TP-01A-architecture-review.md`
- `06-contracts/CF-W1-TP-01A-trade-plan-no-target-dq-hard-block-contract.md`
- `08-work-packets/CF-W1-TP-01A-work-packet.md`
- `17-team-outboxes/TEAM-03-architecture-factory.md`

Future implementation is not reserved. If Product Owner and Architect accept a backend-only child slice, reserve exact Trade Plan files only and keep frontend/Today Review files excluded unless explicitly approved.

Current blocker: no accepted decision for target compatibility, `LIMITED` DQ behavior, API/UI migration boundary, or existing stored Trade Plan row interpretation.
