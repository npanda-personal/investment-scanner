# CF-W1-L3-AUTH-02 Alert Event Ownership Contract Draft

Date: 2026-05-17

## Status

Draft contract prepared. Not accepted. Implementation blocked.

This document defines the intended ownership boundary but does not authorize source, Prisma, API, shared auth, route, notification, or frontend changes.

## Contract Intent

Alert events must not be globally readable or mutable. All alert inbox, read, dismiss, mark-all-read, summary, digest, and consumer paths must scope event access to the current authenticated user by the accepted ownership model.

## Ownership Rule

An alert event is accessible only to the current user if one of the accepted ownership models proves ownership:

- Direct owner model: `AlertEvent.userId` equals current user id.
- Rule-owner model: `AlertEvent.alertRule.userId` equals current user id.

The model is not yet accepted. Until it is accepted, implementation remains blocked.

## Preferred Bounded Model

Team 03 recommends rule-owner model for the first bounded slice if accepted:

- `AlertRule.userId` remains the source of event ownership.
- Event list queries join/filter through `alertRule.userId`.
- Event read/dismiss mutations first prove the event belongs to a rule owned by current user.
- Mark-all-read updates only unread and undismissed events whose parent rules are owned by current user.
- Summary counts only events whose parent rules are owned by current user.
- Existing route paths and response DTOs remain unchanged.

This recommendation avoids Prisma schema work but still requires Product Owner and Architect acceptance.

## Required Behavior

After an accepted implementation:

- `GET /alerts/events` returns only events owned by current user under the accepted model.
- `PATCH /alerts/events/:id/read` marks only an owned event as read.
- `PATCH /alerts/events/:id/dismiss` dismisses only an owned event.
- `POST /alerts/events/mark-all-read` marks only current-user owned active events read.
- Alert summary counts only current-user owned unread and critical events.
- Cross-user event ids must not reveal that the event exists.
- Existing owned-user alert event flows must continue to work.
- Existing alert rule ownership behavior must not be weakened.

## Forbidden Behavior

- Do not list global alert events.
- Do not mutate an event by id before proving ownership.
- Do not expose another user's event existence through distinct error wording.
- Do not broaden `default-user` fallback behavior.
- Do not add `AlertEvent.userId` unless the direct owner model is explicitly accepted.
- Do not change route registry paths.
- Do not change shared auth middleware in this slice.
- Do not add paid services, external telemetry, broker behavior, or provider-heavy workflows.

## Legacy Null-Owner Policy

Current alert rules may allow `userId = null` compatibility. This contract does not decide whether null-owner alert events are visible to authenticated users.

Product Owner and Architect must choose one policy before implementation:

- exclude null-owner alert events from authenticated inboxes,
- expose null-owner alert events only to a documented compatibility user,
- migrate/backfill null-owner rules/events under a separate approved migration,
- retain null-owner compatibility for local validation with explicit risk acceptance.

Implementation must not guess this policy.

## Public Contract Impact

No route path changes are authorized by this draft.

No response DTO expansion is required for the preferred rule-owner model.

If direct owner model is selected, API response changes are still not required by default, but Prisma schema, migration, and backfill decisions become mandatory.

## Consumer Impact

Alerts Monitoring owns event access.

Notification delivery, copilot summaries, research views, and future digest consumers must use current-user scoped alert event service methods. They must not read global events or bypass Alerts Monitoring ownership checks.

If consumer updates are too broad, split them into follow-up work packets after this ownership contract is accepted.

## Acceptance Criteria

- Product Owner and Architect accept direct owner or rule-owner model.
- Legacy null-owner behavior is explicitly decided.
- Two-user tests prove user A cannot list, read, dismiss, mark all read, or count user B's events.
- Owned-user event list/read/dismiss/summary flows still pass.
- No route registry, shared auth middleware, package, provider, scheduler, broker, or frontend files are changed unless separately reserved.
- Notification/digest global event access is either fixed in scope or recorded as a blocked follow-up.

