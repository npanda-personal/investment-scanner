# CF-W1-NOTIF-02 - Notification Log Redaction Requirement

Date: 2026-05-17

Owner: Team 09 Platform / Auth / Subscription / Notifications

Status: refinement only; not Ready for Implementation. Current Team 00 routing keeps this as the next Team 09 candidate behind `CF-W1-TP-01B` and ahead of the alert/auth follow-ups.

## User Problem

The local notification provider is free and disabled from external delivery, but it currently writes recipient address, subject, and a body preview to the console. That is useful for debugging but unnecessary for broader local QA and can leak user email or market-event details in logs.

## Product Goal

Keep notification delivery local/free while minimizing local log exposure.

## Current Evidence

- `LogEmailProvider` is always returned by `createNotificationProvider()`.
- SMTP environment variables affect provider status messaging only; no SMTP transport is active.
- `LogEmailProvider.sendEmail()` logs:
  - recipient email,
  - subject,
  - message id,
  - first 240 characters of body.
- Notification events persist delivery details in the database; console preview is not the audit source of truth.

## Acceptance Criteria

- Local log delivery remains the default active provider.
- No SMTP, paid provider, package, route, Prisma, or frontend work is introduced.
- Console output no longer includes raw recipient email, raw subject, raw body, or body preview.
- Console output may include non-sensitive delivery metadata such as provider name, channel, generated message id, notification type when available, body length, or a redacted/hash recipient marker.
- Delivery event persistence remains unchanged unless Architect separately approves payload minimization.
- Focused tests prove the provider returns `EMAIL_LOG` and does not pass raw recipient, subject, body, payload, or preview content to `console.info`.

## Non-Goals

- No real SMTP transport.
- No push, SMS, WhatsApp, WebSocket, or browser notification provider.
- No subscription gating for local/log delivery.
- No frontend notification UI changes.
- No broad notification event schema changes.

## Proposed Future File Reservation

Allowed only after Team 00 promotes a work packet:

- `backend/src/modules/notifications-delivery/notifications-delivery.provider.ts`
- `backend/tests/modules/notifications-delivery/notifications-delivery.service.test.ts`
- `backend/src/modules/notifications-delivery/notifications-delivery.md`

Forbidden:

- Prisma schema or migrations
- package manifests
- route registries
- external provider code
- frontend files
- shared utilities unless Architect explicitly reserves them

## Stop Conditions

- Implementation needs a new package or external provider.
- Implementation changes persisted notification event shape.
- Implementation changes subscription gating behavior.
- Tests require live email or network access.

## Current Disposition

The focused platform QA plan, architecture review, contract, and work packet are prepared.

Team 03's 2026-05-18 near-ready file-reservation matrix confirms this slice is narrowly provider-scoped and has no shared/high-risk request if implementation changes only the local log provider payload, focused tests, and module docs. Current Team 00 routing keeps this ahead of `CF-W1-L3-ALERT-01` and `CF-W1-L3-AUTH-03`.

This item still needs Ready promotion and exact file reservation before source work.
