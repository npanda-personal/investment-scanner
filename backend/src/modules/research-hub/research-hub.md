# Research Hub Module

The Research Hub acts as the **Research Command Center** and triage layer for the investment scanner. It provides a prioritized, decision-oriented overview that guides the user through the daily research workflow.

## Core Mandate

1.  **Is today a good environment to look for trades?** (Market Readiness)
2.  **What should I look at first?** (Research Priorities)
3.  **Are my ideas confirmed by other data?** (Confirmation Layers)
4.  **What changed since my last review?** (What Changed)
5.  **Where do I go next?** (Next Actions)

The Research Hub does not duplicate the full detail of child modules; it triages candidates for further investigation in those modules.

## Global Market Scope Integration

The Research Hub is fully integrated with the application's global market scope.
- **Region Filtering**: The `/api/v1/research/overview` endpoint accepts a `region` parameter. When provided, it ensures the Market Readiness (Gate/Regime), Research Priorities (Candidates/Exits), and Confirmations (Smart Money/Sectors) are all calculated for that specific market.
- **Cross-Pillar Consistency**: The triage logic automatically passes the selected region down to all underlying pillars (Strategy, Signals, Smart Money, Context).

## Architecture

The module aggregates data from four primary research pillars:

-   **Signal Generation Engine**: Raw scoring and technical/fundamental signals.
-   **Strategy Decision Engine**: Validated trade setups, entry zones, and exit candidates.
-   **Smart Money Intelligence**: Price-volume accumulation/distribution analysis.
-   **Market Context Intelligence**: Market regime, breadth, and sector rotation.

## API Reference

### `GET /api/v1/research/overview`

Returns a consolidated decision-oriented response.

**Response Structure**:

```json
{
  "marketReadiness": {
    "marketGate": "OPEN | SELECTIVE | CLOSED | UNKNOWN",
    "marketCondition": "HEALTHY | MIXED | BAD | UNKNOWN",
    "headline": "...",
    "allowedActions": [],
    "reasons": [],
    "blockers": [],
    "dataStatus": "OK | PARTIAL | MISSING"
  },
  "researchPriorities": {
    "tradeCandidates": [],
    "watchCandidates": [],
    "avoidCandidates": [],
    "exitCandidates": []
  },
  "confirmationSummary": {
    "signalSummary": {
      "topBullishCount": 24,
      "topBearishCount": 12,
      "reliabilityAvailable": true,
      "notes": ["Significant bullish signal dominance."]
    },
    "smartMoneySummary": {
      "accumulationCount": 15,
      "distributionCount": 5,
      "topConfirmations": ["AAPL: Strategy and Smart Money both see accumulation."],
      "topContradictions": []
    },
    "marketContextSummary": {
      "leadingSectors": ["Technology", "Healthcare"],
      "weakSectors": ["Utilities"],
      "breadthStatus": "72% above SMA50",
      "notes": ["Market is risk-on because breadth is constructive."]
    }
  },
  "whatChanged": {
    "newTradeCandidates": ["AAPL", "MSFT"],
    "downgradedCandidates": [],
    "marketGateChange": null,
    "warnings": []
  },
  "nextActions": [
    {
      "label": "Review 5 Trade Candidates",
      "priority": "HIGH",
      "targetRoute": "/research/strategy"
    }
  ],
  "generatedAt": "2026-05-04T12:00:00Z",
  "dataGaps": []
}
```

## Performance & Resilience

-   **Bounded Responses**: Lists are capped at 5-10 items to ensure fast response times and clear focus.
-   **Partial Success**: The endpoint uses individual `catch` blocks for child module integrations. If one module fails (e.g., timeout or database error), the Research Hub returns a partial response with a entry in `dataGaps` rather than failing the entire request.
-   **No Heavy Calculations**: The overview relies on persisted snapshots or indexed data. It does not trigger full-universe evaluations on load.

## User Workflow

1.  **Review the Hero Banner**: Confirm if new trades are allowed today.
2.  **Triage Priorities**: Look at the Trade Candidates. Use the "Primary Next Action" button to drill into the Strategy Engine for trade plans.
3.  **Check Confirmations**: See if Smart Money or Sector Winds align with your trade ideas.
4.  **Manage Risk**: Review Exit Candidates and Avoid lists.
5.  **Drill Down**: Use the Drilldown Analysis buttons for deep dives into specific research modules.
