# CF-W2-BT-05 Backtesting Rule Exit / Invalidation Evidence Contract

Date: 2026-05-24

## Purpose

Create a bounded additive evidence contract for backtesting runs so downstream trusted-candidate workflows can distinguish:

- documented registered-strategy exit rule evidence,
- operational risk or forced exits,
- optional simulation-assumption exits,
- missing invalidation evidence,
- and unsupported custom-rule runs.

This contract is research-support only. It must not imply buy/sell advice, target prices, profit targets, R:R, guaranteed outcomes, or automated trade instructions.

## Scope

Bounded first child only:

- `backtesting-strategy-lab` backend service/type projection
- module-local service test coverage
- module documentation update

Out of scope:

- frontend rendering
- Today Review adoption
- signal-quality or strategy-decision consumer work
- repository/controller/router changes
- shared UI or shared utility changes
- package or generated-file changes
- Prisma or migration changes
- new provider/live-data behavior
- startup/backfill flows

## Additive Fields

The first child should add fields equivalent to:

```ts
type BacktestEvidenceSupportStatus =
  | 'DOCUMENTED_EXIT_EVIDENCE'
  | 'PARTIAL_DOCUMENTED_EXIT_EVIDENCE'
  | 'CUSTOM_RULES_UNSUPPORTED'
  | 'LEGACY_RULE_CODE_EVIDENCE_MISSING';

type BacktestEvidenceFreshnessStatus =
  | 'LATEST_COMPARABLE_RUN'
  | 'STALE_COMPARABLE_RUN'
  | 'NO_COMPARABLE_REGISTERED_RUN';

type BacktestEvidenceMissingCode =
  | 'CUSTOM_RULES_NOT_DOCUMENTED'
  | 'DOCUMENTED_EXIT_RULE_CODES_NOT_PERSISTED'
  | 'DOCUMENTED_INVALIDATION_NOT_MODELED'
  | 'NO_REGISTERED_STRATEGY_CODE'
  | 'NO_TRADES';

interface BacktestRuleEvidence {
  supportStatus: BacktestEvidenceSupportStatus;
  freshnessStatus: BacktestEvidenceFreshnessStatus;
  safeForTrustedCandidateSupportingEvidence: boolean;
  strategyCode: string | null;
  strategyVersion: string | null;
  timeframe: string | null;
  region: string | null;
  assetType: string | null;
  runCompletedAt: string | null;
  latestComparableRunCompletedAt: string | null;
  tradeCount: number;
  documentedExitRuleCodes: string[];
  documentedExitRuleTriggerCounts: Array<{ ruleCode: string; tradeCount: number }>;
  documentedInvalidationRuleCodes: string[];
  documentedInvalidationTriggerCounts: Array<{ ruleCode: string; tradeCount: number }>;
  operationalExitCounts: {
    strategyExitCount: number;
    stopLossCount: number;
    trailingStopCount: number;
    maxHoldCount: number;
    endOfTestCount: number;
  };
  simulationAssumptionExitCounts: {
    takeProfitCount: number;
  };
  missingEvidence: BacktestEvidenceMissingCode[];
  warnings: string[];
}
```

These fields are additive. Existing run DTO fields remain backward-compatible.

## Source Inputs

Derive the first child only from evidence the module already owns:

- run config scope and strategy identifiers
- `startedAt`
- `completedAt`
- current normalized metrics and trades
- existing `exitDiagnostics`
- existing `calculationAudit`
- existing Strategy Framework registry/evaluator metadata already imported by the module

Do not create a new persistence model or a new read-side table in this slice.

## Comparability Rules

Freshness should compare only registered runs with the same:

- `strategyCode`
- `strategyVersion` if present
- `timeframe`
- `region`
- `assetType`
- `universe` shape as already represented in config

Use existing saved runs returned by `listRuns(...)`. Do not widen into repository query redesign for the first child.

## Evidence Classification Rules

Documented exit rule evidence:

- may use only explicit registered strategy rule codes
- should come from stable rule identifiers, not human-readable reason text

Operational exit counts:

- `STRATEGY_EXIT`
- `STOP_LOSS`
- `TRAILING_STOP`
- `MAX_HOLDING_PERIOD`
- `END_OF_TEST`

Simulation-assumption exit counts:

- `TAKE_PROFIT`

Invalidation evidence:

- do not infer from stop loss, trailing stop, max hold, or take profit
- do not infer from `reasons`
- if dedicated invalidation proof is absent, emit missing evidence truthfully

## Support Status Rules

- `DOCUMENTED_EXIT_EVIDENCE`
  - registered strategy run
  - documented exit rule codes available
  - take-profit isolated from documented-rule evidence
- `PARTIAL_DOCUMENTED_EXIT_EVIDENCE`
  - registered strategy run
  - some documented exit evidence available
  - invalidation and/or persisted historical rule-code evidence still missing
- `CUSTOM_RULES_UNSUPPORTED`
  - custom-rule run or missing strategy code
- `LEGACY_RULE_CODE_EVIDENCE_MISSING`
  - registered saved run exists, but stable rule-code evidence is absent from historical trades

## Trusted Candidate Guardrails

- `safeForTrustedCandidateSupportingEvidence` must remain `false` for custom-rule runs
- `safeForTrustedCandidateSupportingEvidence` must remain `false` when documented exit proof is missing
- take-profit simulation output must never be labeled or consumed as target evidence
- the contract must not introduce target, target-return, or R:R fields

## Historical Compatibility

- Existing backtest runs remain readable
- Historical runs that lack stable documented rule-code evidence remain visible but must be marked honestly
- No backfill is required for this first child

## Stop Conditions

Stop and split the child if truthful behavior requires:

- repository changes
- controller or route changes
- frontend changes
- shared utility changes
- schema or migration changes
- new provider/live-data work
- startup/backfill work
- cross-module consumer changes

## One-Writer Rule

This contract reserves one writer across the future `backtesting-strategy-lab` service/types/doc/test file set. No parallel `backtesting-strategy-lab` implementation writer is allowed.

## Readiness Note

As of 2026-05-24, Team 03 considers this contract architecture-ready but not Ready for Implementation until Team 04 prepares the matching QA plan and Team 00 records the stacked `2bd794f` base plus exact file reservations in the Ready queue.
