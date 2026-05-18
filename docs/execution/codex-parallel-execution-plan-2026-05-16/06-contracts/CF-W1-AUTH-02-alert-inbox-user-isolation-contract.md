# CF-W1-AUTH-02 Alert Inbox User Isolation Contract

Date: 2026-05-18

Owner: Team 03 Architecture Factory

## Status

Focused backend consumer-isolation contract prepared. Not Ready for Implementation.

Inherited prerequisite: accepted `CF-W1-L3-AUTH-02` alert event ownership contract.

## Contract Intent

Alert inbox actions and alert digest consumers must operate on current-user-scoped alert events only. This requirement extends the accepted rule-owner event ownership model into notification and Copilot digest consumers without reopening Prisma/schema or repository ownership design.

## Inherited Ownership Rule

This requirement assumes the current backend rule:

- alert events are owned through `AlertRule.userId`;
- cross-user events are not listable or mutable through `alerts-monitoring`;
- null-owner, orphaned, or unresolvable events fail closed.

`CF-W1-AUTH-02` must consume that ownership model. It must not replace it.

## Required Consumer Behavior

- `notifications-delivery` alert digests must call `alertsMonitoringService.listEvents(userId)` with the current user id.
- `ai-investment-copilot` alert digests must call `alertsMonitoringService.listEvents(userId)` with the current user id.
- No notification or Copilot digest path may call `listEvents()` without a user id.
- If the digest consumer cannot prove a current user id for the request-scoped operation, it must fail closed to a non-leaking empty or unavailable digest result instead of reading global events.
- Existing digest route paths and response DTO fields remain backward-compatible.

## Forbidden Behavior

- Do not reopen `alerts-monitoring.repository.ts` ownership logic in this slice.
- Do not add `AlertEvent.userId`.
- Do not query alert events globally for notification or Copilot digests.
- Do not leak another user's unread or critical counts through summary copy, payload counts, or fallback wording.
- Do not fold protected-route controller fail-closed work into this slice unless Team 00 explicitly combines it with a separate accepted packet.

## Default Implementation Split

Team 09 child:

- `notifications-delivery.service.ts`
- `notifications-delivery.md`
- `notifications-delivery.service.test.ts`

Team 08 child:

- `ai-investment-copilot.service.ts`
- `ai-investment-copilot.md`
- `ai-investment-copilot.service.test.ts`

These child packets may run independently because their write scopes do not overlap.

## Conflict Rules

- Team 09 child must not run in parallel with `CF-W1-NOTIF-02`.
- Team 08 child must not run in parallel with `CF-W1-UX-02` or `CF-W1-UX-05`.
- Any Copilot controller fail-closed work remains a separate conflict surface because it overlaps Copilot UX/trust packets.

## Test Contract

Focused backend tests must prove:

- notification alert digests pass `userId` into alert-event reads;
- Copilot alert digests pass `userId` into alert-event reads;
- service-level fallbacks do not read global alert events;
- current-user digest counts stay correct for unread and critical items;
- digest payload shape stays backward-compatible.
