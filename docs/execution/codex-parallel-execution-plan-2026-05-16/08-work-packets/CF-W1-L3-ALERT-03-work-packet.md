# CF-W1-L3-ALERT-03 Work Packet

Date: 2026-05-18

## Work Item

Alert follow-through traceability for bounded post-review outcome recording.

## State

Architecture packet prepared. Not Ready for Implementation.

This is a backend-only first slice inside `alerts-monitoring`. It uses existing `AlertEvent.metadata` JSON to store bounded follow-through evidence and keeps inbox read/dismiss separate from post-review outcome.

## Owner / Lane / Module

- Architecture owner: Team 03 Architecture Factory
- Future implementation owner: Team 07 Portfolio / Watchlists / Alerts
- Lane: Lane 3
- Module: `alerts-monitoring`

## Allowed Files After Ready Promotion

- `backend/src/modules/alerts-monitoring/alerts-monitoring.service.ts`
- `backend/src/modules/alerts-monitoring/alerts-monitoring.repository.ts`
- `backend/src/modules/alerts-monitoring/alerts-monitoring.types.ts`
- `backend/src/modules/alerts-monitoring/alerts-monitoring.validation.ts`
- `backend/src/modules/alerts-monitoring/alerts-monitoring.controller.ts`
- `backend/src/modules/alerts-monitoring/alerts-monitoring.router.ts`
- `backend/src/modules/alerts-monitoring/alerts-monitoring.md`
- `backend/tests/modules/alerts-monitoring/alerts-monitoring.service.test.ts`
- optional new focused controller coverage only if a dedicated follow-through endpoint is added: `backend/tests/modules/alerts-monitoring/alerts-monitoring.controller.test.ts`
- optional new focused repository coverage only if metadata merge/update logic becomes non-trivial: `backend/tests/modules/alerts-monitoring/alerts-monitoring.repository.test.ts`

## Current Forbidden Files

- application source or tests before Team 00 promotion
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- `backend/src/api/routes.ts`
- `frontend/src/app/routes.tsx`
- shared backend utilities or shared DTOs
- shared frontend components
- package manifests
- generated files
- `backend/src/modules/portfolio-management/**`
- `backend/src/modules/watchlist-management/**`
- `backend/src/modules/portfolio-intelligence/**`
- `backend/src/modules/notifications-delivery/**`
- `backend/src/modules/ai-investment-copilot/**`
- `frontend/src/features/alerts-monitoring/**`
- provider/startup/backfill/live-provider scope
- paid/cloud, telemetry, broker, or automation flows

## Required Behavior

Future implementation must:

- add a stable `metadata.followThrough` persistence shape without replacing unrelated metadata;
- add additive `followThrough` projection to the alert event DTO;
- keep `readAt`, `dismissedAt`, and `markAllRead()` semantics unchanged;
- record follow-through only through a dedicated module-local follow-through update action;
- support a concise research-support `reasonSummary`;
- support optional `followUpDueAt` for deferred follow-through;
- fail closed for missing/cross-user event updates;
- avoid claiming actual portfolio/watchlist mutation or automated execution.

## Sequencing Rule

Do not promote or implement this packet in parallel with:

- `CF-W1-L3-ALERT-01`
- `CF-W1-L3-AUTH-03`

Reason:

- both alert packets need the same `alerts-monitoring` core files and focused tests.

No Today Review conflict exists. `CF-W1-L3-TREV-01` uses different files and can proceed independently in its own worktree.

## QA Handoff Needed

Team 04 can start QA planning now against this packet.

Minimum scenarios:

- owned event follow-through update persists `outcome`, `reasonSummary`, `reviewedAt`, `followUpDueAt`, and `updatedAt`;
- repeated follow-through update preserves unrelated metadata keys;
- read/dismiss/mark-all-read do not create or overwrite follow-through;
- cross-user or missing event follow-through update returns non-leaking not-found behavior;
- deferred follow-through supports due date and null due date paths;
- alert digest and copilot unread behavior remain unchanged because inbox-state fields are unchanged.

Suggested focused command after implementation exists:

```powershell
cd backend
npm.cmd test -- alerts-monitoring.service.test.ts alerts-monitoring.controller.test.ts --runInBand
```

Repository-focused command only if a repository metadata-merge test is added:

```powershell
cd backend
npm.cmd test -- alerts-monitoring.service.test.ts alerts-monitoring.repository.test.ts --runInBand
```

## Stop Conditions

Stop and return to Team 00 / Architect if implementation requires:

- Prisma/schema/migration changes;
- route-registry changes;
- auto-mapping read/dismiss to follow-through;
- notifications-delivery or copilot digest changes;
- portfolio/watchlist mutation verification or cross-module write behavior;
- shared DTO/helper extraction;
- frontend/UI scope in the same writer pass;
- direct financial-advice, target-price, or automation-authorization wording.

## Next Gate

Team 04 QA planning can start now.

App-code readiness remains blocked until:

- the active `alerts-monitoring` writer set clears;
- Team 00 sequences this packet against `CF-W1-L3-AUTH-03`;
- Team 00 issues an exact implementation handoff.
