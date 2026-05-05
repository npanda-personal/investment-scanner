# Signal Generation Engine

The Signal Generation Engine owns daily/on-demand signal generation, composite scoring, and persistence. It is fully integrated with the **Global Market Scope**, allowing users to filter signals and generation runs by region.

## Global Market Scope Integration

All signal APIs and dashboard views respect the global `region` and `assetType` context:
- `region`: Filter signals by mapped exchanges and country metadata (IN, US, EU, GLOBAL).
- `assetType`: Filter signals by asset class (default: STOCK).

### Backend Support
The following filters are standardized in the `SignalQuery` and `SignalRunRequest` DTOs:
- `region`: Standard region code.
- `assetType`: Asset class code.

Repositories use the shared `resolveRelatedMarketRegionFilter` helper to join results with stock metadata for accurate regional filtering.

## API Reference

| Endpoint | Purpose | Region Support |
| --- | --- | --- |
| `GET /api/v1/signals/top` | Top signals with score thresholds | Supported |
| `GET /api/v1/signals/screener`| Filtered signal screener | Supported |
| `POST /api/v1/signals/run` | Manual generation for a region or list | Supported |

## Scoring and Signals
Composite score (0-100) is calculated from Technical, Momentum, and Fundamental signals.

... (rest of definition remains same) ...

## Strategy Framework Integration

Raw signal generation remains owned here. Strategy Framework is consumed only as an opt-in strategy-aware enrichment path so existing signal behavior is preserved.

Supported request/query flags:
- `strategyCode`
- `includeStrategyMatches`
- `onlyStrategyEligible`
- `excludeNoiseFiltered`

When enabled, signal results may include `strategyMatches[]` and `blockedStrategies[]` explaining which registered strategies matched or were blocked by noise filters/data gaps.

## Frontend Structure
- `SignalsDashboardPage`: Subscribes to `useMarketScope()`. Automatically refetches signals when the header region changes.
- `Manual Run`: Generation runs default to the active market scope.

## Tests
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.service.test.ts`: Verifies scoring and thresholds.
- `backend/src/shared/utils/market-scope.test.ts`: Verifies regional filtering logic.
