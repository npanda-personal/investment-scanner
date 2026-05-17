# CF-W1-NOTIF-02 QA Plan

Date: 2026-05-17

Owner: Team 04 QA Factory

Status: Focused QA plan prepared. Not executable until Team 00 or Team 09 promotes the notification log redaction slice with exact file reservations and implementation handoff.

## Scope

Backend-only QA plan for local notification log redaction.

This plan validates that `LogEmailProvider` keeps localhost-first, zero-incremental-cost email-log delivery while removing raw recipient, subject, body, body preview, and payload contents from process logs.

This plan does not approve application source changes, test edits, Prisma/schema changes, route registry changes, shared utility changes, frontend work, package changes, generated files, live SMTP, network calls, startup/backfill, Angel One, broker flows, paid/cloud services, broad suites, UI smoke, staging, commits, or pushes.

## Contract Inputs

- `10-requirements/CF-W1-NOTIF-02-notification-log-redaction-requirement.md`
- `03-architecture/CF-W1-NOTIF-02-architecture-review.md`
- `06-contracts/CF-W1-NOTIF-02-notification-log-redaction-contract.md`
- `08-work-packets/CF-W1-NOTIF-02-work-packet.md`
- `04-qa/CF-W1-QA-AUTH-01-platform-auth-subscription-notification-qa-plan.md`

## Required QA Assertions

- `LogEmailProvider.status()` still reports `activeChannel = EMAIL_LOG`.
- `LogEmailProvider.status()` still reports `smtpAvailable = false`.
- `createNotificationProvider()` still returns the local log provider and does not activate SMTP or any external provider.
- `LogEmailProvider.sendEmail()` still returns `channel = EMAIL_LOG`, `status = SENT`, and `providerName = log-email-provider`.
- `console.info` is called with minimized metadata only.
- `console.info` does not receive the raw recipient email.
- `console.info` does not receive the raw subject.
- `console.info` does not receive the raw body.
- `console.info` does not receive the old body preview.
- `console.info` does not receive raw payload contents.
- Existing service behavior for test email, alert digest, daily digest, weekly digest, preference skip, and missing email remains unchanged.
- Delivery event persistence remains unchanged unless a separate accepted packet approves payload minimization.

## Scenario Matrix

| Scenario | Expected QA result |
| --- | --- |
| Provider status | Status remains local log mode with `EMAIL_LOG`, provider name, and `smtpAvailable: false`. |
| Provider factory | Factory returns local log provider without SMTP, network, package, or env-driven provider activation. |
| Send email result | `sendEmail()` returns `EMAIL_LOG` / `SENT` / `log-email-provider` and a local `log-*` message id. |
| Recipient privacy | Console log arguments do not contain `user@example.com` or any full recipient address. |
| Subject privacy | Console log arguments do not contain the raw subject. |
| Body privacy | Console log arguments do not contain the raw body, body preview, or first 240 characters of content. |
| Payload privacy | Console log arguments do not contain notification payload fields or digest body content. |
| Allowed metadata | Console log may contain provider/channel/message id, body length, subject length, and redacted recipient marker. |
| Persistence compatibility | Service-created notification events still persist the same title/message/payload/status behavior as before. |
| Preference skip | Preference-disallowed email remains `SKIPPED` and does not call provider delivery. |

## Focused Command Guidance

Run only after implementation exists and file reservations match the work packet:

```powershell
cd backend
npm.cmd test -- notifications-delivery.service.test.ts --runInBand
```

Route and validation tests are not required for the provider-only redaction slice unless controller or validation files are touched. If touched under a separate approved packet:

```powershell
cd backend
npm.cmd test -- notifications-delivery.routes.test.ts notifications-delivery.validation.test.ts --runInBand
```

No live SMTP, network, provider, startup, Prisma, UI, or broad backend command is approved by this plan.

## QA Rejection Criteria

- Console logs include raw email address, raw subject, raw body, body preview, or payload contents.
- Redaction requires a new package, hashing dependency, external provider, or network call.
- Implementation changes notification routes, controller, service behavior, repository persistence, Prisma schema, subscription gating, or frontend behavior without a new accepted packet.
- Tests only assert provider success and do not inspect `console.info` arguments.
- Validation requires live email, SMTP, startup/backfill, provider-heavy tests, broad suites, UI smoke, or Prisma mutation.

## Evidence Required Later

- Exact implementation handoff with changed files.
- Focused command output.
- Console log argument inspection result proving no raw recipient, subject, body, preview, or payload content.
- Confirmation provider status and return shape remain unchanged.
- Confirmation no forbidden files or commands were used.
- Skipped checks and next owner.
