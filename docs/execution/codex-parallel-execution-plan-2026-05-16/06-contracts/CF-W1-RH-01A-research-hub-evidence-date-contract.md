# CF-W1-RH-01A Research Hub Evidence-Date Contract

Date: 2026-05-26

Owner: Team 03 Architecture Factory

## Status

Contract prepared from live source. Ready recommendation: `Ready candidate` for Team 04 QA planning and Team 00 sequencing.

## Contract Intent

Research Hub already publishes an `ActionabilityDimension.evidenceDate` field, but the current service never populates it and the current page never renders it.

This child makes `evidenceDate` truthful and visible without broadening the actionability model. It does not change actionability keys, route shape, or status vocabulary.

## Response Shape

Keep the existing `ResearchActionability` shape unchanged.

No new dimension keys.

No new top-level fields.

No schema, route, or API contract expansion.

## Ownership

`research-hub` owns this child.

Upstream modules remain the owners of their timestamps:

- `strategy-decision-engine` owns market-gate recency
- `signal-quality-lab` owns signal-evidence summary recency
- `today-trade-review` owns latest run recency
- `trade-plan-risk-engine` owns funnel diagnostics recency
- `signal-calibration-engine` still owns calibration evidence-through semantics outside this child

Research Hub may read those public outputs. It must not recreate or reinterpret them through private internals.

## Exact Public Read Boundary

Allowed public reads:

- `StrategyDecisionEngineService.marketGate(region)`
- `SignalQualityLabService.summary({ horizon: '20D', limit: 1, minSampleSize: 0, region, assetType })`
- `TodayTradeReviewService.latest({ region, assetType })`
- `TradePlanRiskEngineService.funnelDiagnostics({ region, assetType })`

Allowed public fields:

- market gate `updatedAt`
- Signal Quality summary `generatedAt`
- Today Review latest `run.finishedAt`
- Today Review latest `run.sourceSnapshot.generatedAt`
- Trade Plan funnel diagnostics `generatedAt`

Forbidden:

- upstream repositories
- upstream private helper methods
- upstream controller/router internals
- fabricated timestamps copied from Research Hub `generatedAt`
- calibration `generatedAt` used as a substitute for calibration evidence-through truth

## Dimension Rules

| Dimension | Allowed date source | Required behavior |
| --- | --- | --- |
| `marketEnvironment` | `marketGate.updatedAt` | Populate when present. If market gate is unavailable, return `null`. |
| `dataReadiness` | none | Must remain `null` in this child. |
| `signalEvidence` | `qualitySummary.generatedAt` | Populate only when the Signal Quality summary read succeeds. If Research Hub still uses only raw signal counts, keep `null`. |
| `calibrationReadiness` | none for this child | Must remain `null` until `CF-W2-CAL-02A` or a later calibration-basis packet lands on the chosen base. |
| `strategyProof` | none for this child | Must remain `null` because the current dimension mixes candidate and backtest evidence without a single dimension-owned timestamp. |
| `todayReviewReadiness` | `run.finishedAt ?? run.sourceSnapshot.generatedAt` | Populate only when a latest Today Review run exists. If no run exists, return `null`. |
| `tradePlanReadiness` | `tradePlanFunnel.generatedAt` | Populate only when funnel diagnostics succeed. Else `null`. |

## Message Rules

- A dimension with `evidenceDate: null` must keep an explicit message that the evidence basis is unavailable, not yet wired, or not source-owned.
- A dimension with a present `evidenceDate` must not imply that the status became `READY` just because a timestamp exists.
- If a date is present while the dimension is still conservative or partially unwired, the copy must say so clearly.
- Research-support wording only: review, evidence, readiness, limited, blocked, unproven, insufficient data.

## Frontend Rendering Rules

- Research Hub actionability tiles must render evidence date when present.
- Evidence date rendering must stay feature-local to `ResearchOverviewPage.tsx`.
- When `evidenceDate` is `null`, the tile must suppress the date line rather than inventing a fallback timestamp.
- The tile must remain readable without changing shared component APIs, page routing, or layout ownership.

## Compatibility Rules

- Preserve `/api/v1/research/overview`.
- Preserve existing actionability dimension order.
- Preserve `overallStatus`, `canReviewActionableSetups`, `headline`, `nextBestAction`, and `blockers` semantics unless a message needs wording hygiene to stay truthful after date wiring.
- Do not reopen `whatChanged`, next-action provenance, calibration trust-state semantics, or broad actionability status rewiring in this child.

## Forbidden Behavior

- Do not use Research Hub `generatedAt` as a dimension-level substitute.
- Do not copy one upstream timestamp across multiple dimensions.
- Do not edit upstream modules to add or expose timestamps.
- Do not interpret calibration row `generatedAt` as calibration evidence-through truth on the current base.
- Do not add advice-like, target-like, or broker wording.

## Test Contract

Focused backend tests must prove:

- market environment date comes from market-gate `updatedAt`
- signal-evidence date comes from Signal Quality summary `generatedAt` when that read is used
- today-review date comes from `finishedAt` and falls back to `sourceSnapshot.generatedAt` only when needed
- trade-plan date comes from funnel diagnostics `generatedAt`
- `dataReadiness`, `strategyProof`, and `calibrationReadiness` stay `null`
- missing public reads fail closed to `null`

Focused UI smoke must prove:

- a present evidence date is visible on the tile
- a null evidence date does not render a fake fallback line
- the page remains research-support only

## Stop Conditions

Stop and return to Team 00 if implementation needs:

- a new backend DTO or frontend type field
- shared component extraction
- route changes
- upstream source edits
- calibration basis work beyond the existing public current base
