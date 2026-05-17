# CF-W1-L3-AUTH-02 Work Packet Draft

Date: 2026-05-17

## Work Item

Alert event ownership contract and future implementation boundary.

## State

Blocked after docs-only architecture and contract drafting.

Implementation has not started.

## Owner / Lane / Modules

- Owner: Team 07 Portfolio / Watchlist / Alerts implementation agent after assignment.
- Coordinating owner: Team 09 Platform / Auth / Subscription / Notifications for auth and notification consumer impact.
- Lane: Lane 3.
- Primary module: `alerts-monitoring`.
- Possible later consumers: `notifications-delivery`, copilot/research consumers that read alert events.

## Dependencies

- Product Owner and Architect decision: direct event owner versus rule-owner join.
- Product Owner and Architect decision: legacy null-owner alert rule/event policy.
- QA plan for two-user event isolation.
- Orchestrator file reservation.
- Architect confirmation if notification/digest consumers are included in this slice.

## Current Allowed Files

Docs-only prep has already produced this work packet and the related contract/readiness draft.

No implementation files are allowed yet.

## Forbidden Files Until Accepted

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- generated Prisma/client types
- `backend/src/api/routes.ts`
- `frontend/src/app/routes.tsx`
- `backend/src/modules/auth-identity/**`
- shared backend/frontend utilities or UI
- package manifests
- provider, scheduler, startup, broker, Angel One, or live-market-provider files

## Future Implementation Path If Rule-Owner Model Is Accepted

Likely allowed source files after Orchestrator reservation:

- `backend/src/modules/alerts-monitoring/alerts-monitoring.controller.ts`
- `backend/src/modules/alerts-monitoring/alerts-monitoring.service.ts`
- `backend/src/modules/alerts-monitoring/alerts-monitoring.repository.ts`
- `backend/src/modules/alerts-monitoring/alerts-monitoring.types.ts` only if needed
- `backend/src/modules/alerts-monitoring/alerts-monitoring.md`

Likely allowed test files after QA plan acceptance:

- `backend/tests/modules/alerts-monitoring/alerts-monitoring.service.test.ts`
- `backend/tests/modules/alerts-monitoring/alerts-monitoring.routes.test.ts`
- `backend/tests/modules/alerts-monitoring/alerts-monitoring.ownership.test.ts`

Implementation tasks:

- Pass current user id from controller to event list/read/dismiss/mark-all-read/summary service methods.
- Scope event reads and mutations through parent alert rule owner.
- Preserve existing route paths and event response DTOs.
- Return not-found or zero-update behavior for cross-user event operations.
- Preserve rule ownership behavior.
- Document null-owner compatibility exactly as accepted.

## Future Implementation Path If Direct Event Owner Is Accepted

This path requires a separate schema/migration decision packet before source work.

Additional likely files:

- `backend/prisma/schema.prisma`
- migration files
- generated Prisma artifacts
- alerts repository/service/controller/docs/tests
- possible backfill or migration evidence docs

Do not start this path without Product Owner, Architect, Orchestrator, and QA approval.

## Stop Conditions

Stop and return to Orchestrator/Architect if implementation requires:

- changing Prisma schema without accepted direct-owner decision,
- changing route registry paths,
- changing auth middleware or platform default-user policy,
- exposing owner metadata in DTOs without product/API acceptance,
- changing notification digest behavior outside the accepted slice,
- touching shared files without reservation,
- resolving null-owner compatibility by assumption,
- adding paid/cloud/provider behavior.

## Future Validation Commands

Do not run during docs-only prep. Later implementation owner should run focused commands after code changes and after QA confirms exact test names.

Minimum future validation expectation:

```powershell
cd backend
npm.cmd test -- alerts-monitoring.ownership.test.ts alerts-monitoring.service.test.ts alerts-monitoring.routes.test.ts --runInBand
```

## Handoff Requirements

Future implementation handoff must include:

- accepted ownership model,
- accepted null-owner policy,
- exact files changed and inspected,
- event list/read/dismiss/mark-all-read/summary behavior changed,
- notification/digest consumers included or explicitly excluded,
- two-user test evidence,
- tests skipped and reasons,
- unresolved risks,
- QA, code review, Architect, and Product Owner next gates.

