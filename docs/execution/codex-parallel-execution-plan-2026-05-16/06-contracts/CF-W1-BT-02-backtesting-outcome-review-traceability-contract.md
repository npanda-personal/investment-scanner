# CF-W1-BT-02 Backtesting Outcome Review Traceability Contract

Date: 2026-05-18

Owner: Team 03 Architecture Factory

## Status

Ready-candidate contract prepared.

This contract covers one bounded no-schema `backtesting-strategy-lab` packet only.

## Contract Intent

Backtesting output must tell the user whether a run is suitable for review, only partially usable, diagnostic only, legacy repaired, or withheld. The contract is additive. It must preserve current simulation math, preserve current registered/custom behavior, and keep review evidence visible instead of implicit.

## Required Source Boundary

Implementation must stay inside `backtesting-strategy-lab` service/types/doc/test plus the module-owned frontend types/page/UI smoke test.

Allowed direction:

- add additive run-level review-outcome fields;
- add additive run-level review-traceability evidence fields;
- add additive trade-level traceability fields for entry, exit, invalidation/risk, rule version, and legacy repair;
- render the new fields on the current Backtesting Strategy Lab page;
- update focused module tests and UI smoke coverage.

Forbidden:

- Prisma/schema, migrations, generated files, or repository identity changes;
- controller/router/validation/route-registry changes;
- Strategy Framework source changes;
- Trade Plan Risk Engine changes;
- simulation math, signal proxy math, benchmark math, or Strategy Framework semantics changes;
- shared utility/UI, package, provider, startup, paid/cloud, telemetry, broker, or historical-doc edits.

## Required Run-Level Contract

Every completed run with metrics must expose additive review-outcome semantics equivalent to:

```ts
type BacktestReviewOutcome =
  | 'TRUSTED_REVIEW'
  | 'PARTIAL_REVIEW'
  | 'DIAGNOSTIC_ONLY'
  | 'LEGACY_REPAIRED'
  | 'WITHHELD';

interface BacktestReviewTraceability {
  reviewOutcome: BacktestReviewOutcome;
  reviewReasons: string[];
  benchmarkEvidence: 'AVAILABLE' | 'FALLBACK_EQUAL_WEIGHT' | 'UNAVAILABLE';
  availabilityEvidence: 'AVAILABLE' | 'PARTIAL' | 'INSUFFICIENT_HISTORY' | 'NOT_RUN' | 'ERROR';
  calculationAuditEvidence: 'OK' | 'REPAIRED' | 'LEGACY_INVALID';
  sampleEvidence: 'SUFFICIENT' | 'LOW_SAMPLE' | 'NO_TRADES';
  exitEvidence: 'RULE_TRACED' | 'WEAK_END_OF_TEST_DOMINANCE' | 'UNTRACED';
  dataQualityEvidence: 'READY' | 'LIMITED' | 'UNKNOWN';
}
```

Exact names may differ, but the behavior must remain stable.

## Required Trade-Level Contract

Every returned trade row must expose additive structured traceability equivalent to:

```ts
interface BacktestTradeTraceability {
  strategyCode?: string | null;
  strategyVersion?: string | null;
  ruleVersion?: string | null;
  entryRuleIds: string[];
  exitRuleIds: string[];
  invalidationRuleIds: string[];
  exitDecisionSource:
    | 'REGISTERED_EXIT_RULE'
    | 'CUSTOM_EXIT_RULE'
    | 'RISK_RULE'
    | 'END_OF_TEST'
    | 'LEGACY_NORMALIZED';
  reasonEvidence: string[];
  legacyRepairApplied: boolean;
}
```

Required mapping rules:

- registered strategy trades:
  - `strategyCode` and `strategyVersion` from current run config;
  - `entryRuleIds` from Strategy Framework evaluator `entryRulesPassed`;
  - `exitRuleIds` from Strategy Framework evaluator `exitRulesTriggered` when a registered exit fired;
  - `ruleVersion` from strategy version unless a later accepted contract introduces finer rule revisioning;
- custom rule trades:
  - `entryRuleIds` from `config.entryRule.type`;
  - `exitRuleIds` from `config.exitRule.type` when a configured exit fired;
- forced risk/invalidation exits:
  - `STOP_LOSS`, `TRAILING_STOP`, `TAKE_PROFIT`, and `MAX_HOLDING_PERIOD` must map to structured `invalidationRuleIds` instead of reason text only;
- end-of-test closures:
  - `exitDecisionSource = END_OF_TEST`;
  - no fabricated exit rule ID;
- legacy normalized rows:
  - `legacyRepairApplied = true` when display normalization changed the row;
  - `exitDecisionSource = LEGACY_NORMALIZED` only when no safer current trace source can be proven.

## Required Outcome Mapping

- `WITHHELD`:
  - failed runs; or
  - `aggregateStatus = LEGACY_INVALID`; or
  - unreconciled aggregate proof.
- `LEGACY_REPAIRED`:
  - repaired trade rows exist;
  - aggregate proof is still usable.
- `DIAGNOSTIC_ONLY`:
  - insufficient history;
  - no trades;
  - benchmark unavailable;
  - weak exit dominance from end-of-test exits;
  - low sample size;
  - low or unknown DQ confidence.
- `PARTIAL_REVIEW`:
  - availability or coverage is limited, but aggregate proof is still usable.
- `TRUSTED_REVIEW`:
  - no withheld proof;
  - no diagnostic-only blocker;
  - structured traceability is present.

The service may derive these outcomes from current metrics, calculation audit, benchmark status, exit diagnostics, and trade count. It must not change simulation behavior to manufacture a better outcome.

## Compatibility Rules

- Existing `availabilityStatus`, `benchmarkComparison`, `exitDiagnostics`, `realismWarnings`, `calculationAudit`, and trade reason fields remain present.
- New traceability fields are additive only.
- Existing run routes, query parameters, saved-run loading behavior, and scope behavior remain unchanged.
- Registered and custom-rule run execution behavior remains unchanged.

## Required UI Contract

The current Backtesting Strategy Lab page must show:

- a clear review-outcome label for the selected run;
- a concise reason summary explaining why the run is trusted, partial, diagnostic, legacy repaired, or withheld;
- trade-level structured traceability for current displayed rows;
- legacy repair and withheld-proof evidence without hiding current calculation audit warnings;
- current benchmark, availability, data coverage, and exit diagnostics as review evidence, not isolated implementation detail.

The UI must stay research-support oriented and must not introduce direct trade advice.

## Forbidden Behavior

- Do not change simulation math, benchmark math, or exit math in this packet.
- Do not widen into Trade Plan invalidation output.
- Do not edit Strategy Framework source to get richer rule metadata.
- Do not fabricate exit/invalidation IDs when current source evidence is genuinely absent.
- Do not collapse all outcomes into one ambiguous status chip.

## Test Contract

Focused coverage must prove:

- trusted review outcome;
- partial review outcome;
- diagnostic-only outcomes for benchmark unavailable, weak exits, insufficient history, and low sample size;
- legacy-repaired outcome;
- withheld outcome for `LEGACY_INVALID`;
- registered strategy trade traceability;
- custom-rule trade traceability;
- backward-compatible existing run payload fields and existing research-support page wording.
