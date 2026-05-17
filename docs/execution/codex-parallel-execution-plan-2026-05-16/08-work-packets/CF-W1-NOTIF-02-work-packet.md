# CF-W1-NOTIF-02 Work Packet

Date: 2026-05-17

## Work Item

Notification local log redaction.

## State

Architecture and QA prep created. Not Ready for Implementation.

## Owner / Lane / Module

- Team: Team 09 Platform / Auth / Subscription / Notifications.
- Module: `notifications-delivery`.
- Lane: Platform / Lane 3 support.

## Allowed Files After Ready Promotion

- `backend/src/modules/notifications-delivery/notifications-delivery.provider.ts`
- `backend/tests/modules/notifications-delivery/notifications-delivery.service.test.ts`
- `backend/src/modules/notifications-delivery/notifications-delivery.md`

## Forbidden Files

- application source before Ready promotion
- `backend/src/modules/notifications-delivery/notifications-delivery.controller.ts`
- `backend/src/modules/notifications-delivery/notifications-delivery.service.ts`
- `backend/src/modules/notifications-delivery/notifications-delivery.repository.ts`
- `backend/src/modules/notifications-delivery/notifications-delivery.router.ts`
- `backend/src/modules/auth-identity/**`
- `backend/src/modules/subscription-billing/**`
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- backend route registry
- frontend route registry
- frontend feature files
- shared backend utilities
- shared frontend components
- package manifests
- generated types
- providers other than the existing local log provider
- `backend/src/server.ts`
- `backend/.env.example`

## Required Behavior

Future implementation must:

- remove raw recipient email from `console.info`;
- remove raw subject text from `console.info`;
- remove body preview from `console.info`;
- avoid logging payload contents;
- preserve provider status and return shape;
- preserve delivery event persistence;
- preserve local/free/no-network provider behavior;
- update module docs to say console logs are redacted/minimized.

## Required Tests

Update focused notification service tests to prove:

- `LogEmailProvider.sendEmail()` returns `EMAIL_LOG`, `SENT`, and `log-email-provider`;
- `console.info` is called with redacted/minimized metadata;
- the console log object does not contain the raw recipient address;
- the console log object does not contain the raw subject text;
- the console log object does not contain the raw email body or old body preview;
- existing digest, skip, missing-email, and SMTP-status tests still pass.

## Suggested Command

```text
npm.cmd test -- notifications-delivery --runInBand
```

Run from `backend/` if that is the existing test working directory.

## Current Blockers

- Team 09 has not yet pulled an implementation-ready item from `12-ready-queue/ready-for-implementation.md`.
- Active execution docs have unrelated dirty changes from other teams; exact staging/commit must avoid them.

## Ready Promotion Recommendation

Team 00 or Team 09 lead can promote this as a small backend-only Team 09 implementation slice once:

- the current dirty docs are classified;
- QA accepts this work packet;
- exact file reservation above is recorded;
- no open auth/subscription decisions are treated as blocking this unrelated notification privacy slice.
