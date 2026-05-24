# CF-W1-TP-03 Trade Plan Proof Snapshot Freshness Contract

Date: 2026-05-20

Update: 2026-05-24

Status: Paused / stale as framed.

Product Owner redirected the workflow away from Trade Plan, R:R, arbitrary targets, synthetic targets, and target-price framing. This contract must not be implemented as a Trade Plan-first proof-freshness packet. Revisit only if reframed into Trusted Signal Candidate health/evidence support with no targets/R:R.

## Purpose

Give generated Trade Plans an additive proof-freshness contract so users can tell whether a plan reflects current proof, mixed-age proof, stale proof, or only historical saved evidence.

This contract must stay research-support oriented. It must not create advice, targets, or execution instructions.

## Scope

Bounded first child only:

- `trade-plan-risk-engine` backend projection
- `trade-plan-risk-engine` feature-local list/detail rendering

Out of scope:

- repository or persistence redesign
- route registry changes
- shared UI changes
- package or generated-file changes
- Prisma or migration changes
- upstream module source changes

## Additive Fields

The contract should add fields equivalent to:

```ts
type TradePlanProofFreshnessStatus =
  | 'CURRENT'
  | 'PARTIALLY_REFRESHED'
  | 'STALE'
  | 'HISTORICAL_ONLY';

type TradePlanProofFreshnessReasonCode =
  | 'ALL_COMPONENTS_ALIGNED'
  | 'MARKET_DATA_LAGGING'
  | 'DATA_QUALITY_SNAPSHOT_LAGGING'
  | 'STRATEGY_DECISION_SNAPSHOT_LAGGING'
  | 'BACKTEST_PROOF_LAGGING'
  | 'MISSING_COMPONENT_TIMESTAMP'
  | 'PERSISTED_PROOF_ONLY';

interface TradePlanProofFreshness {
  status: TradePlanProofFreshnessStatus;
  summary: string;
  reasonCodes: TradePlanProofFreshnessReasonCode[];
  laggingComponents: string[];
  freshestComponentAt: string | null;
  stalestComponentAt: string | null;
}
```

These fields are additive. Existing plan DTO fields remain backward-compatible.

## Source Inputs

Derive the first child only from already-owned or already-returned proof data such as:

- `proofGeneratedAt`
- `snapshotVersion`
- `marketDataSnapshot.latestPriceTimestamp`
- `dataQualitySnapshot.generatedAt`
- `strategyDecisionSnapshot.generatedAt`
- backtest proof summary timestamps where already returned
- existing missing or blocked proof warnings already on the plan

Do not create a second persisted proof-status model in this slice.

## Status Rules

- `CURRENT`
  - all required current-proof timestamps exist
  - no required component materially lags the others
  - no existing DQ/price freshness signal contradicts the label
- `PARTIALLY_REFRESHED`
  - one or more required proof components lag the freshest component
  - the plan still has enough timestamp evidence to avoid historical-only fallback
  - the summary names the lagging component category
- `STALE`
  - current proof materially lags the freshest available component evidence, or
  - existing DQ/latest-price freshness evidence already shows stale support
- `HISTORICAL_ONLY`
  - persisted proof exists
  - but one or more required timestamps are absent or too incomplete to call the plan current

## UI Projection Rules

- The Trade Plan list and Trade Plan detail page must render the same status label and summary for the same plan.
- The new label must be additive to existing readiness/risk/proof surfaces; it must not replace DQ blockers, plan blockers, or proof-chain stages.
- The list/detail views must not imply target certainty or execution readiness.

## Backward Compatibility

- Existing `TradePlanResultDto` fields remain valid.
- Existing plan generation, DQ hard-blocking, exit/invalidation semantics, geometry, and paper-readiness behavior remain unchanged.
- Historical saved plans may return `HISTORICAL_ONLY` when timestamp evidence is incomplete instead of fabricating a current label.

## Stop Conditions

Stop and split the child if truthful behavior requires:

- repository edits
- persisted row backfill
- route or controller edits
- shared UI work
- new upstream data fetch contracts
- Prisma or migration changes

## One-Writer Rule

This contract reserves one writer across the Trade Plan backend/frontend file set in the future implementation pass. No parallel `trade-plan-risk-engine` writer is allowed.
