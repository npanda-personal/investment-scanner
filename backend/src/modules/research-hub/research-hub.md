# Research Hub Module

The Research Hub acts as the central aggregation layer for the investment scanner's research section. It provides unified endpoints that correlate data from the four primary research modules.

## Responsibilities

1.  **Pulse Monitoring**: Aggregates high-level summaries (Market Gate, Regime, Top Signals) into a single "Overview" response.
2.  **Cross-Module Orchestration**: Simplifies frontend data fetching by providing consolidated views that would otherwise require multiple API calls.
3.  **Unified API**: Exposes the `/api/v1/research/overview` endpoint for the Research Landing Page.

## API Reference

### `GET /api/v1/research/overview`
Returns a consolidated pulse of the market.

**Response Structure**:
```json
{
  "marketGate": { ... },
  "marketRegime": { ... },
  "topSignals": [ ... ],
  "topSmartMoney": [ ... ],
  "topStrategyCandidates": [ ... ],
  "updatedAt": "ISO-8601-TIMESTAMP"
}
```

## Internal Dependencies

- `SignalGenerationEngineService`: For top bullish/bearish signals.
- `StrategyDecisionEngineService`: For Market Gate status and top strategy candidates.
- `SmartMoneyIntelligenceService`: For accumulation/distribution highlights.
- `MarketContextIntelligenceService`: For market regime and breadth context.

## Usage in Frontend

Consumned by the `ResearchOverviewPage` to display a holistic view of the market before diving into specific research sub-modules.
