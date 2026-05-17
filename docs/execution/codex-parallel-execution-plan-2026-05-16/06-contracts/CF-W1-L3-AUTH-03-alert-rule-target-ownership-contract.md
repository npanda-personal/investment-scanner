# CF-W1-L3-AUTH-03 Alert Rule Target Ownership Contract

Date: 2026-05-17

Owner: Team 07 Portfolio / Watchlist / Alerts

## Status

Contract draft prepared. Not Ready for Implementation.

## Intent

Alert rules that reference user-owned resources must prove the referenced resource belongs to the current user before the rule is persisted or evaluated.

## Required Ownership Rules

- Stock-scoped alert rules may reference globally readable instruments as they do today.
- Portfolio-scoped alert rules require a current-user readable portfolio before create/update succeeds.
- Watchlist-scoped alert rules require a current-user readable watchlist before create/update succeeds.
- Updating a rule's scope, type, `portfolioId`, or `watchlistId` must revalidate the effective target after merging existing rule values with the update payload.
- Cross-user or missing targets must fail closed without revealing another user's resource exists.
- Evaluation of portfolio/watchlist rules must pass the rule owner into portfolio/watchlist public services.

## Public API Compatibility

Existing route paths and public response fields should remain compatible.

If owner metadata is needed for internal all-rule evaluation, it must be internal to the Alerts Monitoring module or additive in a way that does not require frontend changes.

## Allowed Implementation Pattern

- Validate portfolio targets through `PortfolioManagementService.getPortfolioDetail(portfolioId, userId)` or equivalent public service behavior.
- Validate watchlist targets through `WatchlistManagementService.detail(watchlistId, sort, userId)` or equivalent public service behavior.
- Preserve existing repository parent-rule ownership checks for alert events.

## Forbidden Behavior

- Do not import portfolio/watchlist repositories directly.
- Do not add `AlertEvent.userId`.
- Do not change Prisma schema or migrations.
- Do not change route registries or auth middleware.
- Do not change notification or copilot digest consumers.
- Do not mix Data Quality alert readiness suppression into this slice.
- Do not broaden legacy `userId = null` compatibility.

## Focused Test Contract

- Create portfolio rule succeeds for owned portfolio and fails for cross-user/missing portfolio.
- Create watchlist rule succeeds for owned watchlist and fails for cross-user/missing watchlist.
- Update rule cannot move an owned rule to another user's portfolio/watchlist.
- Evaluation passes owner context to portfolio/watchlist services.
- Event list/read/dismiss/mark-all ownership behavior remains unchanged.
