# CF-W1-L3-AUTH-02 Alert Event Ownership Contract

Date: 2026-05-17

## Status

Accepted for the first bounded backend slice.

Product Owner resolved `DECISION-20260517-alert-event-ownership-model` as Option B: alert event ownership is proven through the parent `AlertRule.userId`.

This contract does not approve Prisma/schema/migration, route registry, shared utility, frontend/UI, provider, paid/cloud, startup/backfill, package, generated-type, notification digest, or copilot consumer changes.

## Contract Intent

Alert events must not be globally readable or mutable through authenticated user event paths. Event inbox/list/read/dismiss/mark-all-read/summary access must prove ownership through the parent alert rule owner for this bounded slice.

## Accepted Ownership Rule

An alert event is accessible to the current authenticated user only when its parent alert rule is owned by that user:

- `AlertEvent.alertRule.userId` must equal the current user id.
- Cross-user events must not be listed, counted, marked read, or dismissed.
- Cross-user event ids must not reveal event title, message, metadata, rule existence, or owner identity.

## Legacy Null-Owner / Orphan Policy

Null-owner, orphaned, deleted-parent, or otherwise unresolvable alert events must fail closed or remain hidden from authenticated user inbox/list/read/dismiss/mark-all-read/summary paths unless a separate compatibility policy is explicitly approved.

## Required Behavior

- `GET /alerts/events` returns only events whose parent rule belongs to the current user.
- `PATCH /alerts/events/:id/read` marks only an owned event as read.
- `PATCH /alerts/events/:id/dismiss` dismisses only an owned event.
- `POST /alerts/events/mark-all-read` marks only active events owned through the current user's rules.
- Alert summary counts only current-user owned unread and critical events.
- Manual evaluation evaluates only current-user enabled rules for authenticated controller paths.
- Portfolio/watchlist rule evaluation must preserve the current user when reading referenced portfolio/watchlist resources.
- Existing route paths and public event response DTO fields remain unchanged.

## Forbidden Behavior

- Do not list global alert events for authenticated users.
- Do not mutate an event by id before proving parent-rule ownership.
- Do not expose another user's event existence through distinct response wording.
- Do not add `AlertEvent.userId` in this slice.
- Do not broaden route registries, shared auth middleware, shared utilities, shared UI, frontend, package, provider, scheduler, startup, broker, Angel One, paid, or cloud behavior.

## Out Of Scope

- Direct `AlertEvent.userId` ownership model and any schema/migration/backfill.
- Notification delivery and copilot digest consumers.
- Data Quality alert readiness suppression.
- Frontend/UI event inbox changes.

## Acceptance Criteria

- Two-user tests prove user A cannot list, read, dismiss, mark all read, or count user B's events.
- Owned-user event list/read/dismiss/summary flows still work.
- Null-owner/orphan/unresolvable events remain hidden or fail closed.
- Portfolio/watchlist alert evaluation keeps the user owner context.
- No forbidden file class is changed.
