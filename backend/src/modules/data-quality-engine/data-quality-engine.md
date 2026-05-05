# Data Quality Engine

The Data Quality Engine ensures that instruments have sufficient coverage, readiness, and liquidity for downstream engines. It is fully integrated with the **Global Market Scope**.

## Global Market Scope Integration

All data quality evaluations and summaries are region-aware:
- `region`: (IN, US, EU, GLOBAL) filters the evaluation list and summary metrics.
- `assetType`: (STOCK) filters the target universe.

### Backend Support
Standardized `DataQualityQuery` and `DataQualityEvaluateRequest` DTOs include `region` and `assetType`. Repositories use `resolveRelatedMarketRegionFilter` to join evaluations with regional stock metadata.

## API Reference

| Endpoint | Purpose | Region Support |
| --- | --- | --- |
| `GET /api/v1/data-quality/summary` | Region-aware quality metrics | Supported |
| `GET /api/v1/data-quality/instruments`| Filtered evaluation list | Supported |
| `POST /api/v1/data-quality/evaluate` | Batch evaluation per region | Supported |

## Coverage and Readiness Methodology
... (rest of definitions) ...

## Frontend
- `DataQualityEnginePage`: Subscribes to `useMarketScope()`. Automatically refetches the summary and instrument list when the region changes.
- `Evaluation Runner`: Defaults the evaluation universe to the active market scope.

## Verification
- `backend/src/shared/utils/market-scope.test.ts`: Verifies regional filtering.
