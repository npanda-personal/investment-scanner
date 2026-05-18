# CF-W1-AUTH-02 - Alert Inbox User Isolation Requirement

Date: 2026-05-18

## Status

Audit-derived requirement draft. Not Ready for Implementation.

## Product Value

Alert inbox actions and notification digests should only reflect the current user's own alert rules and alert events. Cross-user alert visibility or bulk actions would undermine trust, leak state, and make alert triage unreliable for investor and trader workflows.

## Evidence

- Audit `11-module-audits/audit-platform-auth-subscription-notifications.md` found `listEvents`, `markRead`, `dismiss`, and `markAllRead` operate globally.
- The same audit found notification/copilot alert digests can consume global alert events.
- `AlertEvent` has no direct `userId`; user scoping would need to flow through `AlertRule` ownership unless a later decision approves schema changes.
- `requireAuth` exists, but some controllers and services still fall back to `default-user`.
- `CF-W1-L3-AUTH-02` already protected parent-rule inbox paths but intentionally left broader alert ownership follow-up work split out.

## Acceptance Criteria

- Alert event list, read, dismiss, and mark-all-read paths are scoped to the current user or the current user's owned alert rules.
- Notification and Copilot digests do not summarize another user's alert events.
- Missing or unverified ownership fails closed or returns a non-leaking empty state, per accepted contract.
- Existing route paths remain backward-compatible unless a later accepted contract allows additive filtering metadata.
- Focused tests cover two-user isolation for alert inbox and digest paths.

## Non-Goals

- No direct `AlertEvent.userId` schema change.
- No Prisma migration, route registry rewrite, shared auth middleware change, or paid/provider work.
- No frontend redesign beyond needed trust or empty-state handling if later approved.
- No direct financial advice language.

## Next Gate

Product refinement and an architecture contract for a bounded alerts and notification user-isolation slice, then QA planning and Team 00 Ready evaluation.
