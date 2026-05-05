# Market Context Intelligence

Market Context Intelligence provides a high-level summary of the market environment, including regime, breadth, and sector rotation. It is fully integrated with the **Global Market Scope**.

## Global Market Scope Integration

All context summaries are region-specific:
- `region`: (IN, US, EU, GLOBAL) ensures breadth and regime calculations are relevant to the selected market.

### Persistence
Snapshots are stored per region in the `MarketContextSnapshot` database model. This allows for historical analysis of specific market conditions (e.g., "Breadth of India stocks in May 2026").

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
