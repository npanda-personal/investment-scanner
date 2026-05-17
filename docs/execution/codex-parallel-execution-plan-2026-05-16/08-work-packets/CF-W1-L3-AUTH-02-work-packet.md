# CF-W1-L3-AUTH-02 Work Packet

Date: 2026-05-17

## Work Item

Bounded backend alert event ownership through parent `AlertRule.userId`.

## State

Accepted for implementation under Product Owner Option B and standing delegation.

## Owner / Lane / Modules

- Owner: Team 07 Portfolio / Watchlist / Alerts implementation.
- Coordinating owner: Team 09 Platform / Auth / Subscription / Notifications for future consumer impact.
- Lane: Lane 3.
- Primary module: `alerts-monitoring`.

## Approved Files

- `backend/src/modules/alerts-monitoring/alerts-monitoring.controller.ts`
- `backend/src/modules/alerts-monitoring/alerts-monitoring.service.ts`
- `backend/src/modules/alerts-monitoring/alerts-monitoring.repository.ts`
- `backend/src/modules/alerts-monitoring/alerts-monitoring.types.ts` only if needed
- `backend/src/modules/alerts-monitoring/alerts-monitoring.md`
- `backend/tests/modules/alerts-monitoring/alerts-monitoring.service.test.ts`
- `backend/tests/modules/alerts-monitoring/alerts-monitoring.routes.test.ts`
- `backend/tests/modules/alerts-monitoring/alerts-monitoring.ownership.test.ts`

## Implementation Tasks

- Pass current user id from controller to event list/read/dismiss/mark-all-read/summary service methods.
- Scope event reads and mutations through parent alert rule owner.
- Preserve existing route paths and event response DTOs.
- Return non-leaking not-found behavior for cross-user event operations.
- Preserve rule ownership behavior.
- Preserve current user context when portfolio/watchlist alert rules read child resources.
- Document null-owner/orphan/unresolvable event behavior as hidden/fail-closed.

## Forbidden Files

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- generated Prisma/client types
- backend or frontend route registries
- shared backend/frontend utilities or UI
- frontend files
- package manifests
- provider, scheduler, startup, broker, Angel One, paid/cloud, or live-market-provider files
- notification/copilot digest consumers unless a separate work packet reserves them

## Stop Conditions

Stop if implementation requires:
- changing Prisma schema,
- changing route registry paths,
- changing auth middleware or platform default-user policy,
- exposing owner metadata in DTOs without product/API acceptance,
- changing notification or copilot digest behavior,
- touching shared files without reservation,
- adding paid/cloud/provider behavior.

## Validation Command

```powershell
cd backend
npm.cmd test -- alerts-monitoring.service.test.ts alerts-monitoring.ownership.test.ts alerts-monitoring.routes.test.ts --runInBand
```

## Handoff Requirements

- Exact files changed and inspected.
- Event list/read/dismiss/mark-all-read/summary behavior changed.
- Notification/digest consumers explicitly excluded.
- Two-user test evidence.
- Tests skipped and reasons.
- QA, code review, Architect, and Product Owner acceptance packets.
