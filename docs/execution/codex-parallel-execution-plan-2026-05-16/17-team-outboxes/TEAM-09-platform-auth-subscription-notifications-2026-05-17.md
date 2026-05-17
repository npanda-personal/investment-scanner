# TEAM-09 Platform / Auth / Subscription / Notifications Outbox - 2026-05-17

Mode: read-only audit/refinement.

Files changed: none by Team 09.

Tests, services, providers, staging, and commits: none.

## Auth Ownership Risks

- Auth is centralized and routers use `requireAuth`, but subscription and notification controllers still fall back to `default-user` after auth.
- Alerts remain highest risk: `AlertRule` has `userId`, but `AlertEvent` has no direct owner field, while event list/read/dismiss/mark-all paths are global.
- Notification and copilot alert digests consume global alert events.

## Subscription Risks

- Billing provider remains local/manual/disabled.
- Ordinary authenticated users can still self-select `FREE`, `PRO`, or `ADMIN` through subscription change-plan behavior.
- This matches active blocker `CF-W1-SUB-01`: Product Owner must decide whether local self-plan changes are allowed.

## Notification Provider / Cost Risks

- No active SMTP transport or paid notification provider was found. `LogEmailProvider` is always returned.
- SMTP env vars affect status messaging only, not delivery activation.
- Local log provider writes recipient, subject, and a body preview to console. That is a local privacy risk before broader testing.

## Candidate Requirements

- `CF-W1-AUTH-01`: remove controller-level `default-user` fallback from authenticated Team 09 routes.
- `CF-W1-L3-AUTH-02`: alert event ownership contract before alert inbox/digest fixes.
- `CF-W1-AUTH-03`: preserve alert rule owner in DTOs and pass owner into portfolio/watchlist alert evaluation.
- `CF-W1-SUB-01`: restrict self-service plan changes or make local/manual policy explicit.
- `CF-W1-NOTIF-01`: lock log provider as default; require PO/Architect approval before SMTP/external delivery.
- `CF-W1-NOTIF-02`: redact/minimize local email log previews.
- `CF-W1-QA-AUTH-01`: two-user ownership tests across alerts, notifications, and subscription counters.

## Future Reservations

- Auth fallback: `backend/src/modules/subscription-billing/subscription-billing.controller.ts`, `backend/src/modules/notifications-delivery/notifications-delivery.controller.ts`, related route tests and module docs.
- Subscription policy: `backend/src/modules/subscription-billing/**`, `backend/tests/modules/subscription-billing/**`, and frontend subscription-billing files only after UI scope approval.
- Notification policy/redaction: `backend/src/modules/notifications-delivery/**`, `backend/tests/modules/notifications-delivery/**`, and optional frontend notification files only after UI scope approval.
- Alert ownership: Team 7 + Architect reservation for `backend/src/modules/alerts-monitoring/**`, notification/copilot digest consumers, and possibly `backend/prisma/schema.prisma` only if direct `AlertEvent.userId` is chosen.

## Recommendation

Do not implement Team 09 code yet. Prepare `CF-W1-L3-AUTH-02` alert ownership contract and `CF-W1-SUB-01` decision packet, then a focused QA plan for two-user isolation and notification log redaction.
