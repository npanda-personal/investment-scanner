# Smart Money Intelligence

Smart Money Intelligence identifies price-volume patterns indicative of accumulation or distribution. It is fully integrated with the **Global Market Scope**.

## Global Market Scope Integration

All accumulation and distribution analysis can be scoped by region:
- `region`: (IN, US, EU, GLOBAL) filters candidates and sector summaries.
- `assetType`: (STOCK) filters the target universe.

### Backend Support
Query parameters `region` and `assetType` are supported in all list and aggregation endpoints. Repositories use `resolveRelatedMarketRegionFilter` to join snapshots with regional stock metadata.

## API Reference

| Endpoint | Purpose | Region Support |
| --- | --- | --- |
| `GET /api/v1/smart-money/top` | Top accumulation candidates | Supported |
| `GET /api/v1/smart-money/distribution`| Top distribution warnings | Supported |
| `GET /api/v1/smart-money/sectors` | Sector-level aggregation | Supported |

## Scoring Methodology
... (rest remains same) ...

## Sector Aggregation
Sector summaries are calculated per region to provide accurate localized tailwinds and distribution warnings.

## Downstream Reads

`stock()` may calculate and persist an on-demand snapshot when today's snapshot is missing. Downstream batch triage modules that need fast, bounded reads should use the public `latestPersistedStock()` service method so missing smart-money context becomes a data gap instead of triggering price-volume calculation during their request.

## Frontend
- `SmartMoneyIntelligencePage`: Subscribes to `useMarketScope()`. Automatically refetches all candidates and sector data when the header region changes.
