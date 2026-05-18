# CF-W1-NOTIF-02 Architecture Review

Date: 2026-05-17

Owner: Team 09 Platform / Auth / Subscription / Notifications

## Status

Architecture review prepared. Not Ready for Implementation.

## Evidence Inspected

- `AGENTS.md`
- `98-orchestrator/runtime-bootstrap.md`
- `98-orchestrator/standing-delegation-policy.md`
- `98-orchestrator/escalation-rules.md`
- `98-orchestrator/worktree-branch-policy.md`
- `98-orchestrator/team-heartbeat-protocol.md`
- `14-team-charters/TEAM-09-platform-auth-subscription-notifications.md`
- `15-automation-prompts/AUTO-09-platform-auth-subscription-notifications.md`
- `12-ready-queue/ready-for-implementation.md`
- `12-ready-queue/blocked-by-upstream-dependency.md`
- `99-decision-inbox/open-decisions.md`
- `10-requirements/CF-W1-NOTIF-02-notification-log-redaction-requirement.md`
- `04-qa/CF-W1-QA-AUTH-01-platform-auth-subscription-notification-qa-plan.md`
- `backend/src/modules/notifications-delivery/notifications-delivery.provider.ts`
- `backend/src/modules/notifications-delivery/notifications-delivery.service.ts`
- `backend/src/modules/notifications-delivery/notifications-delivery.types.ts`
- `backend/src/modules/notifications-delivery/notifications-delivery.md`
- `backend/tests/modules/notifications-delivery/notifications-delivery.service.test.ts`

## Source Findings

- `LogEmailProvider` is the only active provider returned by `createNotificationProvider()`.
- SMTP environment variables are status-only; `smtpAvailable` remains `false`.
- `sendEmail()` creates a local `log-*` message id and returns `EMAIL_LOG` / `SENT`.
- Current `console.info` payload includes raw recipient address, raw subject, and a body preview.
- Notification events are persisted separately through `NotificationsDeliveryService.deliver()`, so console body preview is not required as an audit trail.

## Architecture Decision

Prepare a backend-only provider redaction slice.

The source change should alter only the console log payload emitted by `LogEmailProvider.sendEmail()`. It should preserve provider status, delivery result shape, service behavior, route behavior, persistence behavior, and tests unrelated to local logging. The log payload should use lengths or redacted markers instead of raw recipient, subject, body, or payload content.

## Boundary Assessment

No Prisma/schema impact is required.

No route registry impact is required.

No shared utility impact is required.

No package impact is required.

No frontend/UX impact is required.

No live provider or SMTP implementation is allowed.

## Recommended File Reservation

Allowed source/test/doc files:

- `backend/src/modules/notifications-delivery/notifications-delivery.provider.ts`
- `backend/tests/modules/notifications-delivery/notifications-delivery.service.test.ts`
- `backend/src/modules/notifications-delivery/notifications-delivery.md`

The implementation should not touch controller, service, repository, router, validation, frontend, auth, or subscription files.

## Readiness Result

`CF-W1-NOTIF-02` is close to implementation-ready as a small backend-only privacy slice. The remaining blocker is Team 00 / Team 09 Ready promotion with the exact file reservation and implementation handoff. The focused QA plan already exists.

## Stop Conditions

- Redaction requires a hashing package.
- Redaction changes persisted event data.
- Redaction changes route/controller/service behavior.
- Redaction requires UI copy changes.
- Redaction requires shared helper extraction.
- Tests need network, SMTP, live provider, or startup behavior.
