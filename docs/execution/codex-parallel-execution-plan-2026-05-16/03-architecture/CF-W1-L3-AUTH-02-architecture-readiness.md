# CF-W1-L3-AUTH-02 Architecture Readiness

Date: 2026-05-17

Prepared by Team 03 Architecture Factory in daemon scheduler mode.

## Status

Contract draft prepared. Implementation is blocked by Product Owner and Architect decision.

This is documentation-only architecture preparation. No app source, tests, package files, Prisma schema, route registries, shared files, root `AGENTS.md`, `docs/AGENTS.md`, or `docs/codex-agent-team-plan/**` were changed.

## Work Item

Define alert event ownership so alert inbox, read, dismiss, mark-all-read, summary, digest, and related consumer paths cannot expose or mutate another user's alert events.

## Current Evidence

- Root `AGENTS.md` requires user-owned modules to filter by current user.
- `requirements-backlog.md` lists `CF-W1-L3-AUTH-02` as P0 and blocked by direct event owner versus rule-owner join decision.
- `blocked-by-decision.md` assigns this ownership-model decision to Product Owner + Architect.
- `blocked-by-shared-file.md` identifies Prisma `AlertEvent` / alert ownership model as the high-risk boundary.
- Current Prisma schema has `AlertRule.userId`, but `AlertEvent` has no direct `userId`.
- Current alerts controller passes current user for rule operations but not event list/read/dismiss/mark-all-read/summary.
- Current alerts repository lists and mutates events globally.
- Notification and digest consumers may consume alert events through public Alerts Monitoring behavior.

## Architecture Finding

The fastest bounded implementation likely scopes events through their parent `AlertRule.userId` without adding `AlertEvent.userId`. However, that is still a product/architecture decision because it defines whether alert event ownership is direct, derived, or migrated.

Implementation must remain blocked until the ownership model and legacy `userId = null` compatibility policy are accepted.

## Design Options

### Option A - Direct event owner

Add `userId` to `AlertEvent` and write event owner at creation time.

Pros:

- Query and mutation ownership is straightforward.
- Events remain owner-scoped even if a rule is deleted or ownership semantics change.
- Good long-term audit clarity.

Cons:

- Requires Prisma schema, migration, generated types, and backfill policy.
- Needs handling for existing events and legacy null owner rows.
- Higher shared-file risk.

Architecture status: blocked until Product Owner and Architect approve schema work.

### Option B - Ownership through alert rule

Treat an event as owned by the user that owns its `AlertRule`.

Pros:

- No Prisma schema change is required.
- Matches current relation from event to rule.
- Can be implemented in the alerts module with relation-scoped queries if approved.

Cons:

- Events depend on parent rule ownership for authorization.
- Existing `AlertRule.userId = null` compatibility must be explicitly decided.
- Query/update methods must consistently join/filter through `AlertRule`.

Architecture status: recommended first bounded implementation if Product Owner accepts derived ownership and null-owner policy.

### Option C - Hybrid direct owner plus rule-owner fallback

Add direct owner for new events but allow legacy lookup through owned rules during migration.

Pros:

- Strong long-term event ownership.
- Allows staged migration.

Cons:

- Most complex.
- Requires schema work and compatibility branching.
- Too large for a first safe slice unless migration is explicitly approved.

Architecture status: not recommended for the immediate parallel slice.

## Recommended Direction

Prefer Option B as the first bounded implementation, but keep implementation blocked until Product Owner and Architect accept it.

The accepted contract should state:

- alert events are visible/mutable only when the current user owns the parent alert rule,
- event list, read, dismiss, mark-all-read, and summary all require current-user scope,
- event operations must return not-found or zero-update behavior without revealing another user's event exists,
- evaluation may create events for enabled rules, but portfolio/watchlist rule evaluation must preserve the rule owner in a later or same approved slice if needed,
- notification/digest consumers must not read global events.

## Required Decisions Before Implementation

- Ownership model: direct event owner versus rule-owner join.
- Legacy policy for `AlertRule.userId = null` and existing events tied to null-owner rules.
- Whether event DTOs must expose owner metadata. Default recommendation: do not expose owner metadata unless a consumer needs it.
- Whether notification/digest consumers are in scope for this slice or a separate follow-up.
- Whether portfolio/watchlist scoped rule evaluation must pass rule owner now or be split into `CF-W1-AUTH-03`.

## Implementation Readiness

Not ready for implementation.

Architecture can proceed to Product Owner and Architect review of the contract draft. Source work remains blocked if it needs Prisma, shared auth/API behavior, route changes, notification digest changes, or unresolved legacy null-owner policy.

