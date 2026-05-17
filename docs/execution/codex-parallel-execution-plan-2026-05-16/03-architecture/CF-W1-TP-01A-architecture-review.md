# CF-W1-TP-01A Architecture Review

Date: 2026-05-17

Owner: Team 03 Architecture Factory

## Status

Product policy accepted. Not Ready for Implementation.

Product Owner approved Option B on 2026-05-17. This item now needs a backend-only child contract, QA scenario refresh, exact source/test file reservations, and proof that broader API/UI/stored-row migration is not required.

## Evidence Inspected

- `AGENTS.md`
- `00-control/active-work-board.md`
- `00-control/risk-register.md`
- `10-requirements/CF-W1-TP-01A-trade-plan-no-target-compatibility-dq-hard-block-requirement.md`
- `04-qa/CF-W1-TP-01A-qa-plan.md`
- `12-ready-queue/ready-for-implementation.md`
- `12-ready-queue/blocked-by-decision.md`
- `12-ready-queue/blocked-by-shared-file.md`
- `06-contracts/CF-W1-TP-01A-trade-plan-no-target-dq-hard-block-contract.md`
- `08-work-packets/CF-W1-TP-01A-work-packet.md`
- current backend module structure for `trade-plan-risk-engine` and `today-trade-review`

## Architecture Finding

Trade Plan source work is not safe until the product semantics are accepted. The current codebase still has a `Target` shape with `price` and `expectedReturnPercent`, paper-readiness logic, and Today Review adjacency. Changing those fields can alter API contracts, persisted JSON interpretation, frontend labels, and user trust language.

The completed Strategy Decision no-target slice does not authorize Trade Plan migration. This item should remain split from any frontend or Today Review implementation unless explicitly approved.

## Recommended Contract Direction

Recommend Product Owner/Architect review of a bounded backend-first option:

- keep any existing `target` field as compatibility-only until migration is approved,
- prevent compatibility target data from contributing to trusted paper-readiness,
- emphasize rule-based exit, invalidation, stop, risk review, data quality proof, and reason summary,
- hard-block paper-readiness on missing DQ, `UNUSABLE`, `NOT_READY`, stale hard blocker, `ILLIQUID`, required use-case tier `BLOCKED`, and `eligibleForSignals=false`,
- treat `LIMITED` as blocked or limited-review-only, never silently action-ready.

## File Reservations

No app-code files are reserved by this review.

Possible future backend-only child reservation after Product Owner/Architect acceptance:

- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.service.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.types.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.geometry.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.repository.ts` only if persisted/read compatibility changes are accepted
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.md`
- `backend/tests/modules/trade-plan-risk-engine/trade-plan-risk-engine.service.test.ts`
- `backend/tests/modules/trade-plan-risk-engine/trade-plan-risk-engine.repository.test.ts` only if repository behavior changes
- `backend/tests/trade-plan-risk-engine.paper-readiness.test.ts`

Frontend and Today Review files must be separate child slices unless the decision explicitly includes them.

## Forbidden Files

- application source or tests during this docs-only pass
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- route registries
- shared backend utilities
- shared frontend components
- package manifests
- generated types
- provider, scheduler, startup, Angel One, broker, and live-provider flows
- unrelated Strategy Decision, Signal Generation, Backtesting, Portfolio, Watchlist, Alerts, or Copilot files
- `04-qa/**`, `10-requirements/**`, `00-control/**`, `12-ready-queue/**`, and decision inbox files for this Team 03 assignment

## Blockers

- Exact backend-only source/test file reservations are not accepted.
- Child QA scenarios have not been refreshed against approved Option B.
- API/UI/stored-row migration must remain excluded or trigger a new Decision Packet.

## Readiness Result

Architecture-ready for post-decision backend-only child contract prep. Blocked for app-code implementation.
