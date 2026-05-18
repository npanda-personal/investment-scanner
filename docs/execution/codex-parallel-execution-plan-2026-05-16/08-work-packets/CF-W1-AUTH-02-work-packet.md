# CF-W1-AUTH-02 Work Packet

Date: 2026-05-18

## Work Item

Alert inbox user isolation follow-up for notification and Copilot digest consumers.

## State

Architecture packet prepared. Not Ready for Implementation.

This requirement follows accepted `CF-W1-L3-AUTH-02` alert event ownership. It does not reopen alert repository ownership or Prisma/schema design.

## Owner / Lane / Modules

- Architecture owner: Team 03 Architecture Factory.
- Future implementation owners:
  - Team 09 for `notifications-delivery`
  - Team 08 for `ai-investment-copilot`
- Lane: cross-lane backend consumer isolation touching Lane 3 alerts and Team 09/08 consumer modules.

## Default Implementation Split

Team 09 child:

- `backend/src/modules/notifications-delivery/notifications-delivery.service.ts`
- `backend/src/modules/notifications-delivery/notifications-delivery.md`
- `backend/tests/modules/notifications-delivery/notifications-delivery.service.test.ts`

Team 08 child:

- `backend/src/modules/ai-investment-copilot/ai-investment-copilot.service.ts`
- `backend/src/modules/ai-investment-copilot/ai-investment-copilot.md`
- `backend/tests/modules/ai-investment-copilot/ai-investment-copilot.service.test.ts`

Optional only with separate Team 00 approval and a combined auth packet:

- `backend/src/modules/ai-investment-copilot/ai-investment-copilot.controller.ts`

## Current Forbidden Files

- application source or tests before Team 00 promotion
- `backend/src/modules/alerts-monitoring/**`
- `backend/src/modules/notifications-delivery/notifications-delivery.provider.ts`
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- backend and frontend route registries
- auth middleware or `auth-identity` source/tests
- shared backend utilities
- shared frontend components
- package manifests
- generated files
- frontend Copilot or notification files
- providers, schedulers, startup/backfill, paid/cloud, broker, or telemetry flows

## Required Behavior

Future implementation must:

- pass current-user context into all digest alert-event reads;
- avoid no-argument alert-event reads in notification and Copilot services;
- fail closed to a non-leaking empty or unavailable digest result when user proof is missing;
- preserve existing route paths and digest response shape;
- leave accepted alert repository ownership behavior untouched.

## QA Handoff Needed

Team 04 should prepare focused backend QA for:

- user-scoped notification alert digest counts;
- user-scoped Copilot alert digest counts;
- non-leaking behavior when user context is unavailable;
- no regression to owned unread/critical counts;
- no no-argument `listEvents()` call in digest services.

Suggested focused commands after implementation exists:

```powershell
cd backend
npm.cmd test -- notifications-delivery.service.test.ts --runInBand
```

```powershell
cd backend
npm.cmd test -- ai-investment-copilot.service.test.ts --runInBand
```

Run only the command for the child slice actually implemented unless Team 00 explicitly approves a combined pass.

## Stop Conditions

Stop and return to Team 00 / Architect if implementation requires:

- reopening `alerts-monitoring` ownership files;
- auth middleware or route-registry changes;
- Prisma/schema/migration changes;
- notification provider changes;
- frontend Copilot/notification work;
- shared utility or package changes;
- combining with `CF-W1-NOTIF-02`, `CF-W1-UX-02`, or `CF-W1-UX-05` without explicit sequencing.

## Next Gate

Team 04 QA planning, then Team 00 sequencing and Ready evaluation for one child at a time.
