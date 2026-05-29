# User/Admin Market Intelligence Pre-Architecture Contract

Date: 2026-05-29
Mode: Architecture Planning
Owner: Solution Architect / Orchestrator
Work item: Trader-facing market intelligence UX and user/admin segregation
Status: Active execution copy; first no-schema frontend slice implemented and under QA / PO / Architect gate review

## 1. Objective

Define architecture requirements for separating trader-facing research pages from admin/data-production pages while adding high-value market context:

- indices,
- breadth,
- institutional flow,
- derivatives context,
- market map,
- user portfolio/watchlist overlays.

This contract originally defined implementation boundaries for later packets. The first no-schema frontend slice is now implemented; remaining backend read models, authorization, schema, and data-ingestion work still require separate work packets.

## 2. Route Classification

### User-facing routes

User routes may read shared research data and write only user-owned records:

- `/` or `/market-pulse`
- `/today-review`
- `/triggers`
- `/indices`
- `/breadth`
- `/institutional-flow`
- `/derivatives-context`
- `/market-map`
- `/research`
- `/research/stocks/:id`
- `/strategies`
- `/portfolios`
- `/portfolios/:id`
- `/watchlists`
- `/watchlists/:id`
- `/alerts`
- `/notifications`
- `/account`

Allowed user writes:

- portfolios,
- holdings,
- transactions,
- watchlists,
- watchlist notes/tags,
- alert rules and alert events,
- notification preferences,
- profile/account settings.

### Admin/data-ops routes

Admin routes own shared data production and operator controls:

- `/admin/market-data`
- `/admin/pipeline`
- `/admin/data-quality`
- `/admin/signals`
- `/admin/calibration`
- `/admin/smart-money`
- `/admin/historical-context`
- `/admin/strategy-ops`
- `/admin/backtests`
- `/admin/today-review`
- `/admin/trade-plans`
- `/admin/system`

Admin routes may expose:

- run,
- generate,
- sync,
- repair,
- backfill,
- ingest,
- evaluate,
- calibrate,
- refresh ledger.

## 3. Read-Only User API Policy

User pages must not call POST/PATCH/DELETE endpoints unless the endpoint mutates user-owned records.

Prohibited from user pages:

- market-data create/update/delete/toggle/sync/import/repair/backfill/ingest,
- pipeline command execution,
- data quality evaluate,
- signal generation run,
- signal quality recalculate,
- signal calibration run,
- smart-money snapshot run,
- historical snapshot generate,
- strategy evaluate,
- registered strategy backtest run,
- strategy decision evaluate,
- Today Review run,
- trade-plan generate or batch generate,
- signal-position-ledger refresh.

Allowed from user pages:

- create/update/delete portfolio,
- add/update/remove holding,
- create transaction,
- create/update/delete watchlist,
- add/update/remove watchlist item,
- create/update/delete alert rule,
- mark alert read/dismissed,
- update notification preferences,
- update profile.

## 4. Snapshot / Read-Model Contracts

Future implementation should introduce these read models or equivalent existing-response adapters. Naming can change during architecture, but capability cannot.

### 4.1 `MarketPulseSnapshot`

Required fields:

- `id`
- `region`
- `assetType`
- `asOfDate`
- `dataThroughDate`
- `marketState`
- `indexTape`
- `breadthSummary`
- `institutionalFlowSummary`
- `derivativesSummary`
- `sectorLeadership`
- `marketMapSummary`
- `todayReviewSummary`
- `activeTriggerSummary`
- `dataQualityStatus`
- `sources`
- `warnings`
- `limitations`
- `createdAt`
- `updatedAt`

### 4.2 `IndexContextSnapshot`

Required fields:

- `region`
- `assetType`
- `indexCode`
- `indexName`
- `asOfDate`
- `performanceByRange`
- `constituents`
- `weights`
- `topContributors`
- `topDetractors`
- `breadth`
- `sectorComposition`
- `userPortfolioExposure`
- `userWatchlistExposure`
- `sources`
- `warnings`

### 4.3 `BreadthSnapshot`

Required fields:

- `region`
- `assetType`
- `asOfDate`
- `advances`
- `declines`
- `unchanged`
- `advanceDeclineRatio`
- `percentAboveSma50`
- `sma50SampleCount`
- `percentAboveSma200`
- `sma200SampleCount`
- `newHighCount`
- `newLowCount`
- `volumeParticipation`
- `turnoverParticipation`
- `sectorBreadth`
- `trend`
- `sources`
- `warnings`

### 4.4 `InstitutionalFlowSnapshot`

Required fields:

- `region`
- `assetType`
- `asOfDate`
- `fiiBuyValue`
- `fiiSellValue`
- `fiiNetValue`
- `diiBuyValue`
- `diiSellValue`
- `diiNetValue`
- `rolling5Day`
- `rolling20Day`
- `indexDivergence`
- `flowRegime`
- `sources`
- `warnings`

### 4.5 `DerivativesContextSnapshot`

Implementation requires Product Owner approval.

Required fields when approved:

- `region`
- `assetType`
- `asOfDate`
- `underlyingType`
- `underlyingCode`
- `futuresTrend`
- `putCallRatio`
- `openInterestChange`
- `topOiStrikes`
- `topOiChangeStrikes`
- `expiryDate`
- `daysToExpiry`
- `crowdingWarnings`
- `sources`
- `limitations`

### 4.6 `MarketMapSnapshot`

Required fields:

- `region`
- `assetType`
- `asOfDate`
- `range`
- `groupBy`
- `metric`
- `buckets`
- `instrumentTiles`
- `portfolioOverlay`
- `watchlistOverlay`
- `dataQualityOverlay`
- `triggerOverlay`
- `smartMoneyOverlay`
- `fnoEligibilityOverlay`
- `sources`
- `warnings`

## 5. Ownership Boundaries

Recommended module ownership:

- Market Data Foundation owns raw market data and source ingestion for indices, breadth source rows, institutional flow source rows, derivatives source rows, and F&O eligibility.
- Market Context Intelligence owns composed breadth, sector, index-context, and market pulse summaries where data is market-wide.
- Smart Money Intelligence remains price-volume accumulation/distribution context only and must not be mislabeled as actual institutional ownership unless a validated source exists.
- Today Trade Review consumes Market Pulse as context and must not generate it inside user requests.
- Portfolio and Watchlist modules consume context read models for overlays but do not calculate shared market context.

## 6. Migration / Rollout Shape

### Slice A - Requirements and route policy

- Create route classification.
- Define prohibited user-page calls.
- Add QA static audit.

### Slice B - Navigation segregation

- Move admin-like routes under `/admin/*` or remove from primary nav.
- Keep legacy redirects only where needed.
- Do not delete modules.

### Slice C - Market Pulse shell

- User-facing shell consumes existing available read models:
  - market context summary,
  - Today Review latest,
  - market movers,
  - signal ledger active rows,
  - data-quality/readiness summaries.
- Render explicit missing-state placeholders for not-yet-built index/FII-DII/derivatives snapshots.

### Slice D - New market context read models

- Add or adapt read models for indices, breadth, institutional flow, derivatives, and market map after Product Owner and Architect approval.

### Slice E - Personal overlay integration

- Add portfolio/watchlist overlays to market map, indices, and instrument workspace using user-owned records only.

## 7. Compatibility Rules

- Existing module routes may remain direct during transition but must not be prominent in user navigation.
- Existing backend endpoints remain unchanged until specific implementation packets reserve route and module scopes.
- User-facing UI must degrade when new read models are absent.
- Missing data must not trigger generation from user pages.
- No schema change is allowed without a separate approved architecture contract.

## 8. Active Slice Route Policy

The first no-schema frontend slice uses frontend route/navigation segregation only.

- `/admin/*` routes are visible to authenticated localhost users as an operator/data-ops area.
- `/admin/*` does not represent backend authorization or role enforcement.
- Legacy direct operator routes remain mounted during transition for compatibility, but they are removed from primary trader navigation.
- Backend authorization, route deletion, or direct-route blocking requires a separate architecture packet.

## 9. Shared File Reservation Record

Team 00 / frontend implementation reserved these shared frontend control files for this slice:

- `frontend/src/app/routes.tsx`
- `frontend/src/app/navigationMetadata.tsx`
- `frontend/src/app/NavigationLayout.tsx`
- `frontend/src/app/HomePage.tsx`

Reservation scope:

- add Market Intelligence routes,
- classify admin/data-ops routes under `/admin/*`,
- remove operator routes from primary trader navigation,
- preserve legacy direct route compatibility for this slice.

Forbidden without separate approval:

- backend route registry changes,
- auth or role-enforcement changes,
- Prisma/schema changes,
- package changes,
- shared backend utility changes.

## 10. Architecture Acceptance Criteria

- Every route has a user/admin classification.
- Every user page has an allowed endpoint list.
- Prohibited POST/PATCH/DELETE calls are removed from user workflows or moved to admin workflows.
- New read models are scoped, timestamped, source-attributed, and data-quality annotated.
- Derivatives context is flagged as Product Owner approval required.
- No broker execution, paid provider, or external telemetry dependency is introduced.

## 11. Implementation Findings Addendum

The current implementation is a first no-schema frontend slice, not the full target-state implementation.

Critical backend findings:

- `GET /api/v1/market-context/summary` can materialize/persist a snapshot if missing. Trader-facing pages must not call this endpoint until a persisted-only market-context read endpoint exists.
- `GET /api/v1/signals/position-ledger/active` can trigger ledger materialization/refresh behavior. Trader-facing Trigger Monitor must remain admin-only or blocked until a persisted-only ledger read endpoint exists.
- `/admin/*` segregation is currently frontend information architecture only. It does not provide backend authorization. Backend write endpoints still require role/access enforcement before multi-user or hosted use.
- Legacy direct operator routes still exist for compatibility, even though they are removed from primary trader navigation.

Read-model gaps still required:

- `MarketPulseSnapshot`
- `IndexContextSnapshot`
- `BreadthSnapshot`
- `InstitutionalFlowSnapshot`
- `DerivativesContextSnapshot`
- `MarketMapSnapshot`

Next architecture requirements:

- Add persisted-only market context endpoint.
- Add persisted-only signal/trigger ledger endpoint.
- Decide whether legacy direct operator routes should remain accessible or be redirected to `/admin/*`.
- Decide whether backend authorization is required for `/admin/*` during localhost validation.
- Define actual persistence strategy for official breadth, FII/DII, indices, derivatives, and market-map snapshots.
- Keep Derivatives Context blocked until explicit Product Owner approval.
