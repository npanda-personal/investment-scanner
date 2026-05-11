# Market Context Intelligence

Market Context Intelligence provides a high-level summary of the market environment, including regime, breadth, and sector rotation. It is fully integrated with the **Global Market Scope**.

## Global Market Scope Integration

All context summaries are region-specific:
- `region`: (IN, US, EU, GLOBAL) ensures breadth and regime calculations are relevant to the selected market.

### Persistence
Snapshots are stored per region in the `MarketContextSnapshot` database model. This allows for historical analysis of specific market conditions (e.g., "Breadth of India stocks in May 2026").

Downstream batch modules that need bounded reads can use the public `latestPersistedSummary(region)` service method. Unlike `summary()`, it returns only the latest persisted snapshot and does not run market-context generation when a snapshot is missing.

All controller endpoints must pass the requested `region` into the service. Generated snapshots must be persisted with that same region, not `GLOBAL`, otherwise downstream modules such as Strategy Decision will correctly treat the scoped market gate as missing/unknown and block long candidates.

Persisted summary reads must keep sample-count and breadth metrics coherent. If a persisted snapshot has breadth percentages and sector rows but no stored live sample count, the repository derives the displayed price sample from the persisted sector snapshot counts instead of returning `0`.

## API Reference

| Endpoint | Purpose | Region Support |
| --- | --- | --- |
| `GET /api/v1/market-context/summary` | Consolidated context | Supported |
| `GET /api/v1/market-context/regime` | Region-aware regime | Supported |
| `GET /api/v1/market-context/sectors` | Sector strength per region | Supported |

## Methodology

- **Regime**: Combines broad index/price behavior and breadth signals into a market condition and gate.
- **Breadth**: `percentAboveSma50` is calculated over instruments that have an SMA50 sample; `percentAboveSma200` is calculated over instruments that have an SMA200 sample. The response exposes `sma50SampleCount` and `sma200SampleCount` so the UI can show the denominators used for each displayed percentage.
- **Sample count coherence**: The displayed sample count must match the data source used for the displayed breadth metrics, or the UI must label the distinction. The current UI shows `Price Sample` for the persisted/price universe count and `SMA Samples` for the SMA50/SMA200 denominators.
- **Sector leadership**: Missing metadata buckets such as `Unknown`, empty sector names, `N/A`, `NA`, and null-equivalent labels are excluded from leading/weak sector rankings through the shared known-sector predicate. They may be diagnosed as missing metadata elsewhere, but they are not treated as a real leading or weak sector.
- **Takeaways**: A single named sector is not described as both leading and lagging.

## Frontend
- `MarketContextPage`: Subscribes to `useMarketScope()`. Automatically refetches all widgets when the header region changes.
- `MarketRegimeWidget`: Displays the verdict (OPEN/CLOSED) specific to the current market scope.
- Breadth cards show separate labels for price sample and SMA denominator samples when persisted breadth data is rendered.
- Sector widgets hide missing-metadata buckets from leadership/weakness lists and show a named-sector empty state when no real sectors qualify.

## Verification
- `backend/src/shared/utils/market-scope.test.ts`: Verifies regional mapping.
- `backend/tests/modules/market-context-intelligence/market-context-intelligence.service.test.ts`: Verifies breadth denominator sample counts and Unknown-sector exclusion.
- `backend/tests/modules/market-context-intelligence/market-context-intelligence.routes.test.ts`: Verifies controller/route behavior.
- `frontend/tests/ui/market-context-intelligence.spec.ts`: Verifies visible sample-count coherence and Unknown-sector exclusion on `/market-context`.
