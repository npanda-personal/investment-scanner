# CF-W1-L3-ALERT-03 Alert Follow-Through Traceability Contract

Date: 2026-05-18

Owner: Team 03 Architecture Factory

## Status

Child contract prepared. Not Ready for Implementation.

## Contract Intent

Alerts Monitoring must support a bounded, durable post-review follow-through record for an alert event without changing Prisma schema, route registries, shared utilities/UI, notifications-delivery, copilot, or portfolio/watchlist source.

This contract covers only the first backend-only slice.

## Required Persistence Model

Persist follow-through inside existing `AlertEvent.metadata` JSON under a stable key:

```ts
metadata.followThrough
```

Required behavior:

- merge follow-through into existing metadata;
- preserve existing metadata keys such as Data Quality evidence or rule-context evidence;
- never replace the full metadata object unless the merged payload is equivalent.

No `AlertEvent.userId`, no new table, and no new Prisma field is allowed in this slice.

## Follow-Through Taxonomy

Use a small explicit review-outcome taxonomy:

```ts
type AlertFollowThroughOutcome =
  | 'REVIEWED_NO_CHANGE'
  | 'FOLLOW_UP_DEFERRED'
  | 'PORTFOLIO_REVIEW_NOTED'
  | 'WATCHLIST_REVIEW_NOTED'
  | 'RISK_REVIEW_NOTED'
  | 'INVALIDATION_REVIEW_NOTED';
```

Semantics:

- `REVIEWED_NO_CHANGE`: alert was reviewed and no further bounded follow-up was recorded.
- `FOLLOW_UP_DEFERRED`: a later check is intended; this may include `followUpDueAt`.
- `PORTFOLIO_REVIEW_NOTED`: the user recorded that portfolio review is needed. It does not prove a portfolio mutation happened.
- `WATCHLIST_REVIEW_NOTED`: the user recorded that watchlist review is needed. It does not prove a watchlist mutation happened.
- `RISK_REVIEW_NOTED`: the user recorded a risk follow-up need.
- `INVALIDATION_REVIEW_NOTED`: the user recorded an invalidation/exit-condition follow-up need.

## Follow-Through DTO Contract

Additive event DTO projection is allowed:

```ts
interface AlertFollowThroughDto {
  outcome: AlertFollowThroughOutcome;
  reasonSummary: string | null;
  reviewedAt: string;
  followUpDueAt: string | null;
  updatedAt: string;
}
```

Add to `AlertEventDto`:

- `followThrough: AlertFollowThroughDto | null`

Existing fields must remain present, including raw `metadata`.

## Update Path Contract

The first slice should use a dedicated module-local follow-through update action.

Preferred path:

`PATCH /alerts/events/:id/follow-through`

Recommended request shape:

```ts
interface UpdateAlertFollowThroughRequest {
  outcome: AlertFollowThroughOutcome;
  reasonSummary?: string | null;
  followUpDueAt?: string | null;
}
```

Required rules:

- service sets `reviewedAt` when the first follow-through is recorded;
- service sets `updatedAt` on every follow-through write;
- `followUpDueAt` is optional and must be nullable;
- `reasonSummary` is optional but, when present, must be concise plain text;
- update must fail closed for missing/cross-user events.

## Inbox State Separation

`readAt` and `dismissedAt` remain inbox-state fields only.

Required behavior:

- `markRead()` must not auto-write follow-through.
- `dismiss()` must not auto-write follow-through.
- `markAllRead()` must not auto-write follow-through.
- follow-through should be recorded only through the dedicated follow-through action.

This separation is required to avoid claiming a review outcome when the user only handled inbox state.

## Ownership And Visibility Rules

- follow-through updates must reuse current parent-rule ownership enforcement for event access;
- cross-user or missing events must return non-leaking not-found behavior;
- existing event list/read/dismiss visibility rules remain unchanged.

## Research-Support Language Rules

Allowed outcome language:

- reviewed
- deferred
- follow-up noted
- risk review
- invalidation review

Forbidden language:

- bought
- sold
- executed
- target hit
- price target
- guaranteed
- automated action

If a note is stored, it must stay research-support oriented.

## Forbidden Behavior

- do not add `AlertEvent.userId`
- do not change Prisma schema or migrations
- do not change route registries
- do not modify notifications-delivery digest behavior
- do not modify copilot alert-digest behavior
- do not modify portfolio/watchlist source to verify or perform downstream changes
- do not infer follow-through from read/dismiss timestamps
- do not introduce shared DTO/helper extraction
- do not add frontend scope in the first slice
- do not use direct financial advice or trade-instruction wording

## Exact Future File Reservations

Allowed files after Team 00 promotion and after alert-module file conflicts clear:

- `backend/src/modules/alerts-monitoring/alerts-monitoring.service.ts`
- `backend/src/modules/alerts-monitoring/alerts-monitoring.repository.ts`
- `backend/src/modules/alerts-monitoring/alerts-monitoring.types.ts`
- `backend/src/modules/alerts-monitoring/alerts-monitoring.validation.ts`
- `backend/src/modules/alerts-monitoring/alerts-monitoring.controller.ts`
- `backend/src/modules/alerts-monitoring/alerts-monitoring.router.ts`
- `backend/src/modules/alerts-monitoring/alerts-monitoring.md`
- `backend/tests/modules/alerts-monitoring/alerts-monitoring.service.test.ts`
- optional new focused controller test: `backend/tests/modules/alerts-monitoring/alerts-monitoring.controller.test.ts`
- optional new focused repository test: `backend/tests/modules/alerts-monitoring/alerts-monitoring.repository.test.ts`

## Test Contract

Focused backend tests must prove:

- follow-through write persists on an owned event via metadata merge;
- `followThrough` is returned additively on event DTO reads;
- `readAt` and `dismissedAt` do not imply a follow-through outcome;
- cross-user follow-through updates fail closed;
- `FOLLOW_UP_DEFERRED` supports nullable or populated `followUpDueAt`;
- repeated updates overwrite only the follow-through section and preserve unrelated metadata;
- notification/copilot unread logic remains unchanged because `readAt`/`dismissedAt` semantics are preserved.
