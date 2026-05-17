# CF-W1-NOTIF-02 Notification Log Redaction Contract

Date: 2026-05-17

Owner: Team 09 Platform / Auth / Subscription / Notifications

## Status

Architecture contract prepared. Not Ready for Implementation.

## Contract Intent

Notifications Delivery must keep local/free log delivery while avoiding unnecessary disclosure of recipient email addresses, notification subjects, body content, or payload content in process logs.

This contract is backend-only and narrowly scoped to the local log provider. It does not approve SMTP transport, paid providers, route changes, schema changes, subscription gating, or frontend work.

## Current Behavior

`LogEmailProvider.sendEmail()` currently logs:

- `to`
- `subject`
- `messageId`
- first 240 characters of `body`

The provider remains local/free, and `createNotificationProvider()` always returns `LogEmailProvider`.

## Required Behavior

Future implementation must:

- preserve `EMAIL_LOG` as the active delivery channel;
- preserve `smtpAvailable: false`;
- preserve no-network, no-paid-provider behavior;
- return the existing `NotificationProviderResult` shape;
- avoid logging raw recipient email;
- avoid logging raw subject text;
- avoid logging raw message body or body preview;
- avoid logging notification payload contents;
- allow non-sensitive metadata such as `providerName`, `channel`, `messageId`, `subjectLength`, `bodyLength`, and a redacted recipient marker.

## Allowed Implementation Shape

The first source slice may update only the local provider log payload.

Preferred log payload:

```text
providerName
channel
messageId
recipientRedacted
subjectLength
bodyLength
```

`recipientRedacted` must not include the full address. A constant marker such as `configured` is sufficient.

## Forbidden Behavior

- No SMTP implementation.
- No external provider.
- No package installation.
- No network call.
- No provider-heavy startup behavior.
- No subscription policy change.
- No route or controller behavior change.
- No persisted notification event schema change.
- No frontend/UI change.

## Exact Future File Reservations

Allowed after Ready promotion:

- `backend/src/modules/notifications-delivery/notifications-delivery.provider.ts`
- `backend/tests/modules/notifications-delivery/notifications-delivery.service.test.ts`
- `backend/src/modules/notifications-delivery/notifications-delivery.md`

Forbidden:

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- backend route registry
- frontend route registry
- shared backend utilities
- shared frontend components
- package manifests
- generated types
- `backend/src/server.ts`
- `backend/.env.example`
- frontend notification files
- subscription billing source
- auth identity source

## Required QA Scenarios

- Provider status still reports local log mode.
- Sending a log email returns `SENT` and `EMAIL_LOG`.
- `console.info` is called with no raw recipient email.
- `console.info` is called with no raw subject text.
- `console.info` is called with no body preview or full body.
- `console.info` is called with no raw payload.
- Existing notification service tests for test email, digest generation, preference skip, and missing email still pass.

## Implementation Readiness

This contract alone does not make source work Ready. Team 09 or QA must refresh focused tests, and Team 00/active queue must record exact Ready promotion or equivalent team-level implementation handoff before code changes.
