# Research Hub Module

The Research Hub acts as the **Research Command Center** and triage layer for the investment scanner. It provides a prioritized, strategy-proof-driven overview that guides the user through the daily research workflow.

## Core Mandate

1.  **Is today a good environment to look for trades?** (Market Readiness)
2.  **Which Strategy Framework-backed candidates deserve review first?** (Research Priorities)
3.  **Are strategy candidates confirmed or contradicted by other data?** (Confirmation Layers)
4.  **What changed since my last review?** (What Changed)
5.  **Where do I go next?** (Next Actions)

The Research Hub does not duplicate the full detail of child modules; it triages candidates for further investigation in those modules. It does not run backtests, generate signals, or run full-universe strategy evaluation on overview load.

## Global Market Scope Integration

The Research Hub is fully integrated with the application's global market scope.
- **Region Filtering**: The `/api/v1/research/overview` endpoint accepts a `region` parameter. When provided, it ensures the Market Readiness (Gate/Regime), Research Priorities (Candidates/Exits), and Confirmations (Smart Money/Sectors) are all calculated for that specific market.
- **Asset-Type Filtering**: The endpoint accepts an `assetType` parameter. Strategy candidates, exit candidates, signal confirmation, smart-money confirmation, and strategy performance evidence are scoped with the selected asset type. `STOCK` includes legacy `EQUITY` compatibility in downstream modules that support it.
- **Cross-Pillar Consistency**: The triage logic automatically passes the selected region and asset type down to underlying pillars that expose scope-aware APIs.

## Architecture

The module aggregates persisted or summary data from primary research pillars:

-   **Signal Generation Engine**: Raw scoring and technical/fundamental signals.
-   **Strategy Decision Engine**: Framework-backed candidates, blockers, warnings, data gaps, and exit candidates.
-   **Strategy Framework**: Strategy versions, performance summaries, ratings, and conservative readiness labels.
-   **Smart Money Intelligence**: Price-volume accumulation/distribution analysis.
-   **Market Context Intelligence**: Market regime, breadth, and sector rotation.

Raw bullish signals are confirmation context only. They are not promoted into `tradeCandidates` unless a valid Strategy Decision result exists. The API keeps the legacy field name `tradeCandidates` for compatibility, but the UI presents these as review candidates.

## API Reference

### `GET /api/v1/research/overview`

Returns the latest materialized Research Hub overview snapshot for the requested scope. The page-read path is snapshot-first and must not fan out to Strategy Decision, Signal Generation, Smart Money, or Strategy Framework calculations during render. If no snapshot exists yet, the endpoint returns a fast "pipeline not ready" response with `dataGaps` pointing the user to Pipeline Ops.

The scheduled `RESEARCH_PROJECTION` stage refreshes and persists this snapshot. `live=true` is reserved for explicit diagnostics and tests; normal UI reads should not use it.

**Response Structure**:

```json
{
  "actionability": {
    "overallStatus": "READY | LIMITED | BLOCKED | UNPROVEN | INSUFFICIENT_DATA",
    "canReviewActionableSetups": false,
    "headline": "Actionable setup review is not confirmed because required readiness evidence is unavailable.",
    "researchSupportOnly": true,
    "dimensions": {
      "marketEnvironment": {
        "status": "READY",
        "label": "Market Environment",
        "sourceModule": "strategy-decision-engine",
        "blocking": false,
        "message": "Market environment is open, but this does not prove actionable setup readiness."
      },
      "dataReadiness": {
        "status": "LIMITED",
        "label": "Data Readiness",
        "sourceModule": "research-hub",
        "blocking": false,
        "message": "Research Hub has no local data gaps, but trusted review-universe readiness is not yet wired."
      },
      "signalEvidence": {
        "status": "INSUFFICIENT_DATA",
        "label": "Signal Evidence",
        "sourceModule": "signal-quality-lab",
        "blocking": true,
        "message": "Signal Quality evidence maturity is not yet available for this overview."
      },
      "calibrationReadiness": {
        "status": "INSUFFICIENT_DATA",
        "label": "Calibration Readiness",
        "sourceModule": "signal-calibration-engine",
        "blocking": true,
        "message": "Calibration readiness is not yet wired into Research Hub actionability."
      },
      "strategyProof": {
        "status": "LIMITED",
        "label": "Strategy Proof",
        "sourceModule": "strategy-decision-engine",
        "blocking": false,
        "message": "Framework-backed review candidates exist, but downstream review and plan readiness are not yet proven here."
      },
      "todayReviewReadiness": {
        "status": "INSUFFICIENT_DATA",
        "label": "Today Review Readiness",
        "sourceModule": "today-trade-review",
        "blocking": true,
        "message": "Today Review readiness is not yet a stable Research Hub input."
      },
      "tradePlanReadiness": {
        "status": "INSUFFICIENT_DATA",
        "label": "Trade Plan Readiness",
        "sourceModule": "trade-plan-risk-engine",
        "blocking": true,
        "message": "Trade Plan paper-readiness is not yet a stable Research Hub input."
      }
    },
    "nextBestAction": null,
    "blockers": []
  },
  "marketReadiness": {
    "marketGate": "OPEN | SELECTIVE | CLOSED | UNKNOWN",
    "marketCondition": "HEALTHY | MIXED | BAD | UNKNOWN",
    "headline": "Market environment is open; confirm actionability evidence before reviewing setup readiness.",
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
  "strategyProofSummary": {
    "strategiesProducingCandidates": [],
    "provenCandidateCount": 0,
    "unprovenCandidateCount": 0,
    "blockedByMarketGateCount": 0,
    "missingBacktestCount": 0,
    "notes": []
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
      "label": "Review 5 framework-backed review candidates",
      "priority": "HIGH",
      "targetRoute": "/strategy"
    }
  ],
  "generatedAt": "2026-05-04T12:00:00Z",
  "dataGaps": []
}
```

## Actionability Adapter

The `actionability` object is a conservative, additive Research Hub adapter. It separates market environment from actionable setup readiness and uses only the local Research Hub view of stable public outputs.

Vocabulary:

- `READY`
- `LIMITED`
- `BLOCKED`
- `UNPROVEN`
- `INSUFFICIENT_DATA`

Current conservative semantics:

- `canReviewActionableSetups` remains `false` unless Research Hub can prove both review readiness and trade-plan readiness from stable public outputs.
- Missing Today Review, Trade Plan paper-readiness, Signal Quality evidence maturity, or Calibration readiness is `LIMITED` or `INSUFFICIENT_DATA`, never `READY`.
- A healthy/open market environment can make only the `marketEnvironment` dimension `READY`; it does not make overall actionability ready.
- Market-readiness headlines and `allowedActions` are not setup permission. While `canReviewActionableSetups` is `false`, Research Hub suppresses market-gate allowance labels such as `NEW_LONG_TRADES_ALLOWED` and uses review, evaluate, repair, or diagnostic wording instead.
- Market-gate blockers can reduce overall actionability to `BLOCKED`.
- Strategy proof without stable downstream review and plan readiness is at most `LIMITED`.
- Copy remains research-support only and should direct users to review, repair, evaluate, diagnose, or paper-review workflows.

## Performance & Resilience

-   **Bounded Responses**: Lists are capped at 5-10 items to ensure fast response times and clear focus.
-   **Partial Success**: The endpoint uses individual `catch` blocks for child module integrations. If one module fails (e.g., timeout or database error), the Research Hub returns a partial response with a entry in `dataGaps` rather than failing the entire request.
-   **No Heavy Calculations**: The overview relies on persisted snapshots or indexed data. It uses persisted-only Market Context snapshots and does not trigger context generation, full-universe evaluations, backtests, signal generation, or provider fetches on load.
-   **No Backtest Execution**: Backtest evidence comes from existing `StrategyPerformanceSummary` rows through Strategy Framework.
-   **Lightweight Signal Confirmation**: The overview reads Signal Generation funnel diagnostics for bullish/bearish counts. It does not load/enrich top signal rows during normal page load, because enrichment performs extra market-data lookups that belong on the Signals page.

## Strategy-Proof Candidate Rules

`tradeCandidates` is the API-compatible field name. Product copy presents these rows as review candidates. Promotion into `tradeCandidates` requires:

- `frameworkBacked = true`
- valid `strategy` and `strategyVersion` where available
- market gate not `CLOSED`
- no hard blockers
- confidence not `LOW`
- low data-gap count
- existing backtest summary with acceptable rating/readiness

If no strategy-backed candidates exist, `tradeCandidates` is empty and next actions include “Run Strategy Evaluation.” Raw signals remain in `confirmationSummary`.

Candidates without backtest summaries are placed in `watchCandidates` with the warning “No backtest summary available for this strategy/timeframe/region.”

## No-Trade Behavior

Current UI/service wording should say "No new long review candidates are available. Review exits and watchlist only." API field names remain unchanged for compatibility.

When market gate is `CLOSED`:

- headline says “No new long candidates. Review exits and watchlist only.”
- `tradeCandidates` is empty
- next actions focus on defensive exits, watchlist review, and waiting for market improvement
- raw bullish signals are not shown as review priorities

## Conservative Readiness

Research Hub never displays live-trading readiness labels. Any stored live-trading placeholder is mapped to `RESEARCH_ONLY`.

## User Workflow

1.  **Review the Hero Banner**: Confirm whether the current market gate allows new long research candidates.
2.  **Triage Priorities**: Look at framework-backed review candidates first. Use links to Strategy Decision, Strategy Framework, Backtesting Lab, or the stock workspace.
3.  **Check Confirmations**: See if Smart Money or Sector Winds align with strategy-backed candidates.
4.  **Manage Risk**: Review Exit Candidates and Avoid lists.
5.  **Drill Down**: Use the Drilldown Analysis buttons for deep dives into specific research modules.

## Verification

- `npm run build` in `backend`
- `npm test -- research-hub --runInBand` in `backend`
- `npm test -- strategy-decision-engine --runInBand` in `backend`
- `npm test -- strategy-framework --runInBand` in `backend`
- `npm run build` in `frontend`
- `npm run test:ui -- research-hub.spec.ts` in `frontend`

## Trade Plan Risk Engine Integration

The Research Hub includes a plan-review action on candidate priority cards, allowing users to jump to the Trade Plan Risk Engine for review planning based on strategy-backed candidates. It must not present plan readiness as execution readiness. Acceptable labels include "Paper Review Candidate" and "Plan Ready for Review".
