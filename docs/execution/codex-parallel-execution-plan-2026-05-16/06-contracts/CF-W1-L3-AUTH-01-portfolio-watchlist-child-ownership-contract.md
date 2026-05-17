# CF-W1-L3-AUTH-01 Portfolio / Watchlist Child Ownership Contract

Date: 2026-05-17

## Status

Architecture-ready for a bounded module-local implementation after QA plan and Orchestrator acceptance.

Implementation has not started.

## Contract Intent

Portfolio holdings, portfolio transactions, and watchlist items must not be readable or mutable through a parent portfolio/watchlist that does not belong to the current user.

This slice closes child-resource ownership gaps without changing platform-wide auth policy, Prisma schema, route registries, shared middleware, subscription gates, package files, or frontend behavior.

## Ownership Rule

Every child-resource operation must first prove ownership of the parent resource through the current user context:

- portfolio holdings require the parent portfolio to resolve for `portfolioId` and `currentUserId`.
- portfolio transactions require the parent portfolio to resolve for `portfolioId` and `currentUserId`.
- watchlist items require the parent watchlist to resolve for `watchlistId` and `currentUserId`.

If parent ownership cannot be proven, the operation returns the same not-found behavior used for missing parent resources. It must not reveal that another user's child row exists.

## Allowed Compatibility

Legacy rows with `userId = null` may remain readable only through the repository's existing documented compatibility path. This slice must not broaden that compatibility and must not decide the platform-wide `default-user` fallback question.

If implementation discovers that route behavior or auth middleware must change to remove fallback behavior, stop and return to `CF-W1-AUTH-01` or a new Product Owner and Architect decision.

## Required Behavior

- `updateHolding`, `removeHolding`, `listTransactions`, and `createTransaction` must use current-user parent ownership checks.
- `updateItem` and `removeItem` must use current-user parent ownership checks.
- Existing owned-user happy paths must continue to work.
- Cross-user attempts must fail closed with not-found behavior before child mutation or listing.
- Subscription gate behavior must remain unchanged.
- Routes and route registry paths must remain unchanged.

## Forbidden Behavior

- Do not add direct `userId` columns to child tables in this slice.
- Do not change `requireAuth` or auth middleware behavior.
- Do not change route registration.
- Do not expose cross-user existence through distinct error wording.
- Do not include alert event ownership. That belongs to `CF-W1-L3-AUTH-02`.
- Do not add paid services, external telemetry, provider calls, broker behavior, or UI changes.

## Public Contract Impact

No API route path changes are allowed.

No response DTO expansion is required.

Only authorization behavior changes: current-user parent ownership becomes required for child operations that currently skip it.

## Acceptance Criteria

- Two-user tests prove portfolio child resources cannot be listed or mutated through another user's portfolio.
- Two-user tests prove watchlist items cannot be mutated through another user's watchlist.
- Existing owned-user child-resource flows continue to pass.
- No Prisma, route registry, auth middleware, package, generated, shared utility/UI, provider, scheduler, or frontend files are changed.
- QA, code review, Architect, and Product Owner acceptance are recorded before release.

