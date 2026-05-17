# Audit: Platform / Auth / Subscription / Notifications

Date: 2026-05-17

Mode: Read-only Audit Team F.

## Scope Inspected

- `backend/src/modules/auth-identity/**`
- `backend/src/modules/subscription-billing/**`
- `backend/src/modules/notifications-delivery/**`
- Matching frontend features where present
- Active execution docs

No files were modified, staged, created, deleted, or reverted. No tests or servers were run.

## Key Findings

- Auth ownership is centralized in `auth-identity`, and protected platform routes use `requireAuth`.
- Several controllers and services still fall back to `default-user` if `req.user` is absent. This is acceptable only as legacy/local compatibility, not as a durable auth boundary.
- Highest auth ownership risk is cross-module alert ownership. `AlertEvent` has no direct `userId`, alert event listing/read/dismiss APIs operate globally, and notification/copilot alert digests can consume global alert events.
- Alert evaluation calls portfolio/watchlist services without passing the alert rule owner, causing default-user fallback risk.
- Subscription limits are mostly centralized in `subscription-billing`; duplicated plan-limit constants were not found in audited consumers.
- Risk remains because an authenticated user can call normal plan change with `FREE`, `PRO`, or `ADMIN`; self-plan changes currently bypass a real billing/admin policy.
- No active paid billing or notification provider was found. Billing provider status is manual/disabled. Notification delivery uses `LogEmailProvider`.
- Notification delivery remains local/free, but log delivery writes recipient, subject, and body preview to console. Treat this as local PII leakage risk before broader testing.

## Candidate Stories

- `CF-W1-AUTH-01`: Remove controller-level `default-user` fallback from authenticated routes; fail closed when `req.user` is missing.
- `CF-W1-AUTH-02`: Filter alert events, mark-read, dismiss, summaries, and notification alert digests by current user.
- `CF-W1-AUTH-03`: Preserve alert rule `userId` in DTOs and pass it into portfolio/watchlist lookups.
- `CF-W1-SUB-01`: Restrict self-service plan changes or make local/manual mode explicit; prevent ordinary users from self-selecting `ADMIN`.
- `CF-W1-NOTIF-01`: Keep log provider default and require PO/Architect approval before SMTP/external delivery.
- `CF-W1-NOTIF-02`: Redact/minimize email body preview in local logs.
- `CF-W1-QA-AUTH-01`: Add two-user tests proving auth isolation for alerts, notifications, and subscription counters.

