# DECISION-20260517 Alert Event Ownership Model Resolution

Date: 2026-05-17

## Decision

Product Owner approved Option B for `CF-W1-L3-AUTH-02`.

Alert event ownership is through the parent `AlertRule` owner for the first bounded backend slice.

## Approved Semantics

- Alert event inbox/list/read/dismiss/mark-all-read/summary paths must scope events through the current authenticated user's parent `AlertRule`.
- Null-owner alert events must fail closed or remain hidden from authenticated user event paths.
- Orphaned, deleted-parent, or otherwise unresolvable alert events must fail closed or remain hidden.
- Cross-user event actions must not reveal that another user's event exists.
- Route paths and event DTO shapes must remain compatible.

## Explicitly Not Approved

- Prisma schema or migration changes.
- Route registry changes.
- Shared utility changes.
- Frontend/UI changes.
- Provider, paid/cloud, startup/backfill, package, or generated-type changes.
- Direct `AlertEvent.userId` ownership in this slice.
- Notification/copylot digest consumer changes unless a separate work packet reserves them.

## Implementation Boundary

Allowed first bounded backend implementation may touch only accepted `alerts-monitoring` module files and focused `alerts-monitoring` tests after readiness is proven.

## Remaining Limitations

- This decision does not resolve Lane 3 Data Quality readiness suppression.
- This decision does not resolve notification digest, copilot digest, or UX surfacing.
- This decision does not approve schema migration for long-term direct event ownership.

