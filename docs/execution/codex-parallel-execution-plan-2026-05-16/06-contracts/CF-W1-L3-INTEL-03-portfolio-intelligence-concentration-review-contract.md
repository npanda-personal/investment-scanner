# CF-W1-L3-INTEL-03 Portfolio Intelligence Concentration Review Contract

Date: 2026-05-18

Owner: Team 03 Architecture Factory

## Status

Contract prepared. Ready candidate after Team 04 QA planning and Team 00 sequencing.

## Contract Intent

Portfolio Intelligence must expose a bounded concentration-review workflow that tells the user which holding, sector, or country exposures deserve review first and why, using existing allocation and review evidence only.

## Required Behavior

- Stay on the existing Portfolio Intelligence route and existing feature surface.
- Add explicit concentration-review taxonomy for holding, sector, and country exposure.
- Rank exposures deterministically from existing data only:
  - holding allocation percent
  - sector allocation
  - country allocation
  - current holding review labels
  - current red flags
  - current latest-signal direction
  - current unrealized loss context
- Provide research-support reason summaries.
- Preserve existing response fields and current detail-page navigation.
- Avoid optimizer, rebalance, target-price, tax, or advice semantics.

## Required Additive Response Shape

The first slice should add fields equivalent to:

```ts
type ConcentrationReviewDimension = 'HOLDING' | 'SECTOR' | 'COUNTRY';

type ConcentrationReviewPriority =
  | 'HIGH_REVIEW_PRIORITY'
  | 'ELEVATED_REVIEW_PRIORITY'
  | 'MONITOR'
  | 'DIVERSIFICATION_WATCH';

interface ConcentrationReviewItem {
  dimension: ConcentrationReviewDimension;
  key: string;
  allocationPercent: number;
  priority: ConcentrationReviewPriority;
  reasonSummary: string;
  reasonCodes: string[];
  affectedHoldingCount: number;
  highRiskHoldingCount: number;
  reviewHoldingCount: number;
  bearishHoldingCount: number;
  affectedSymbols: string[];
}

interface PortfolioConcentrationReviewSummary {
  highestPriority: ConcentrationReviewPriority | null;
  topExposureDimension: ConcentrationReviewDimension | null;
  topExposureKey: string | null;
  topExposureAllocationPercent: number | null;
  reasonSummary: string;
}
```

Expected top-level additions:

- `PortfolioIntelligenceResponse.concentrationReviewSummary`
- `PortfolioIntelligenceResponse.concentrationReview`

## Deterministic Ordering Contract

The first slice must keep ordering deterministic with a fixed backend sort:

1. review priority
2. allocation percent descending
3. high-risk holding count descending
4. review holding count descending
5. bearish holding count descending
6. stable key ascending

Implementation should reuse existing module thresholds from `portfolio-intelligence.validation.ts` and existing holding-review labels. It must not introduce optimizer-style target allocations.

## Frontend Contract

- Surface the additive concentration-review fields inside `PortfolioIntelligencePanel`.
- Keep the current panel route and layout ownership.
- Do not add shared UI components or route changes.
- Use research-support copy only.
- Preserve the current empty state and existing sections.

## Forbidden Behavior

- Do not edit `portfolio-management` source.
- Do not add optimizer, rebalance, or transaction-mutation behavior.
- Do not add schema, migrations, route-registry edits, shared UI, shared backend utilities, package changes, or generated-file changes.
- Do not change `portfolio-intelligence` API endpoints.
- Do not introduce direct financial-advice wording, arbitrary target prices, or automated trade language.

## Conflict Rule

This packet shares the same backend writer set as:

- `CF-W1-L3-INTEL-01`
- `CF-W1-L3-INTEL-02`

Team 00 must combine or sequence those packets. They cannot be concurrent writers.

## Focused Test Contract

Focused tests must prove:

- concentration review ranks holding, sector, and country exposure deterministically;
- reason summaries come from existing allocation/review evidence only;
- diversification watch appears for too-few-holdings states without advice language;
- existing health, red-flag, grouped-summary, and review-ranking fields remain backward-compatible;
- the frontend panel renders the concentration-review section without route or shared-component changes.
