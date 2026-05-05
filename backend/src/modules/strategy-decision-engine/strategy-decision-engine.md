# Strategy Decision Engine

The Strategy Decision Engine converts data from all research modules into actionable trade and exit decisions. It is fully integrated with the **Global Market Scope**.

## Global Market Scope Integration

Strategy decisions and market gate status are region-aware:
- `region`: (IN, US, EU, GLOBAL) filters candidates and evaluations.
- `assetType`: (STOCK) filters the target universe.

### Market Gate
The `marketGate` endpoint accepts a `region` parameter. This ensures the "OPEN/CLOSED" verdict is based on the breadth and regime of the specific market the user is currently researching.

### Candidates & Evaluation
- `GET /api/v1/strategy/candidates`: Supports `region` and `assetType` query parameters.
- `POST /api/v1/strategy/evaluate`: Respects the provided `region` for universe resolution and market gate checks.

## API Reference

| Endpoint | Purpose | Region Support |
| --- | --- | --- |
| `GET /api/v1/strategy/market-gate` | Region-aware market tradeability | Supported |
| `GET /api/v1/strategy/candidates` | Trade candidates per region | Supported |
| `POST /api/v1/strategy/evaluate` | Batch evaluation for a specific region | Supported |

## Scoring Methodology
... (rest of definitions) ...

## Frontend
- `StrategyDecisionDashboard`: Subscribes to `useMarketScope()`. Automatically refetches candidates when the region changes.
- Supports a local `Region Override` for specific comparisons.
