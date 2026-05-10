# Market Context Intelligence

Market Context Intelligence provides a high-level summary of the market environment, including regime, breadth, and sector rotation. It is fully integrated with the **Global Market Scope**.

## Global Market Scope Integration

All context summaries are region-specific:
- `region`: (IN, US, EU, GLOBAL) ensures breadth and regime calculations are relevant to the selected market.

### Persistence
Snapshots are stored per region in the `MarketContextSnapshot` database model. This allows for historical analysis of specific market conditions (e.g., "Breadth of India stocks in May 2026").

Downstream batch modules that need bounded reads can use the public `latestPersistedSummary(region)` service method. Unlike `summary()`, it returns only the latest persisted snapshot and does not run market-context generation when a snapshot is missing.

All controller endpoints must pass the requested `region` into the service. Generated snapshots must be persisted with that same region, not `GLOBAL`, otherwise downstream modules such as Strategy Decision will correctly treat the scoped market gate as missing/unknown and block long candidates.

## API Reference

| Endpoint | Purpose | Region Support |
| --- | --- | --- |
| `GET /api/v1/market-context/summary` | Consolidated context | Supported |
| `GET /api/v1/market-context/regime` | Region-aware regime | Supported |
| `GET /api/v1/market-context/sectors` | Sector strength per region | Supported |

## Methodology
... (rest of definitions) ...

## Frontend
- `MarketContextPage`: Subscribes to `useMarketScope()`. Automatically refetches all widgets when the header region changes.
- `MarketRegimeWidget`: Displays the verdict (OPEN/CLOSED) specific to the current market scope.

## Verification
- `backend/src/shared/utils/market-scope.test.ts`: Verifies regional mapping.
