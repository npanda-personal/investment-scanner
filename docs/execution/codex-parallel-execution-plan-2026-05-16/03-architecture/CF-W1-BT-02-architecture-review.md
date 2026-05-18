# CF-W1-BT-02 Architecture Review

Date: 2026-05-18

Owner: Team 03 Architecture Factory

## Status

Ready candidate. No-schema first slice is feasible.

`CF-W1-BT-02` can be prepared as a bounded `backtesting-strategy-lab` slice without Prisma, migrations, generated files, route changes, shared UI, or package work. The current module already persists additive `metrics` and `trades` JSON, already normalizes legacy runs on read, and already exposes most of the evidence needed for review framing. The missing piece is an explicit review-outcome contract plus structured trade traceability.

This remains a docs-only readiness result. Team 04 QA planning and Team 00 Ready promotion are still required before any application-code pass.

## Evidence Inspected

- `AGENTS.md`
- `16-team-inboxes/TEAM-03-current-assignment.md`
- `10-requirements/CF-W1-BT-02-backtesting-outcome-review-traceability-requirement.md`
- `11-module-audits/audit-backtesting-trade-risk.md`
- `99-decision-inbox/open-decisions.md`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.md`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.types.ts`
- `backend/src/modules/strategy-framework/strategy-framework.types.ts`
- `backend/src/modules/strategy-framework/strategy-framework.registry.ts`
- `backend/src/modules/strategy-framework/strategy-framework.evaluator.ts`
- `backend/tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.test.ts`
- `frontend/src/features/backtesting-strategy-lab/api/backtestingStrategyLabService.ts`
- `frontend/src/features/backtesting-strategy-lab/hooks/useBacktestingStrategyLab.ts`
- `frontend/src/features/backtesting-strategy-lab/types.ts`
- `frontend/src/features/backtesting-strategy-lab/components/BacktestingStrategyLabPage.tsx`
- `frontend/tests/ui/backtesting-strategy-lab.spec.ts`

## Current Source Findings

- `backtesting-strategy-lab.service.ts` already emits most of the review evidence this requirement needs:
  - `availabilityStatus`
  - `benchmarkComparison`
  - `exitDiagnostics`
  - `realismWarnings`
  - `dataCoverage`
  - `dataQualityMetadata`
  - `calculationAudit`
- The service already keeps trade-level reason text through `entryReason`, `entryReasons`, `exitReason`, and `exitReasons`.
- Registered strategy evaluation already returns structured rule-code arrays through `entryRulesPassed`, `exitRulesTriggered`, and strategy version through `strategyVersion`. That means the backtesting module can derive structured rule IDs for registered runs without editing Strategy Framework source.
- Custom-rule runs already expose `entryRule.type`, `exitRule.type`, and forced risk controls (`stopLossPercent`, `trailingStopPercent`, `takeProfitPercent`, `maxHoldingDays`) inside module-owned config, which is enough to derive additive traceability IDs for custom runs.
- Legacy saved-run normalization already repairs trade rows and withholds invalid aggregate proof through `calculationAudit.aggregateStatus = LEGACY_INVALID`, so the module already has the right place to classify legacy-repaired versus withheld review outcomes.
- The frontend page already shows availability, benchmark, realism warnings, calculation audit, exit diagnostics, and trade log rows. The UI gap is contract clarity, not route or navigation surface area.
- The existing focused service tests already cover legacy invalid, benchmark unavailable, stop loss, trailing stop, take profit, max hold, and insufficient-history scenarios. Existing UI smoke already covers insufficient history and legacy invalid surfaces.

## Module Boundary Review

`backtesting-strategy-lab` should own:

- review-outcome classification for backtest runs;
- additive review-traceability metadata derived from current run metrics and current module-owned config;
- trade-level traceability fields for entry, exit, invalidation, legacy repair, and rule version evidence;
- backend-to-frontend rendering for the current Backtesting Strategy Lab page.

This packet should not widen into:

- Prisma schema or migration work;
- route registries or controller/router changes;
- `strategy-framework` source changes;
- `trade-plan-risk-engine` output changes;
- shared UI components or shared frontend state.

The audit mentioned trade-plan invalidation output as a broader follow-up, but this assignment is backtesting-only. Any trade-plan traceability alignment remains a separate future packet.

## Architecture Decision

Prepare `CF-W1-BT-02` as one bounded no-schema packet inside `backtesting-strategy-lab`.

Required additive contract shape:

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

Exact names may differ, but the semantics must stay stable.

## Required Mapping Rules

- `WITHHELD`:
  - failed runs; or
  - legacy aggregate proof withheld through `aggregateStatus = LEGACY_INVALID`; or
  - any outcome where aggregate review proof cannot be trusted.
- `LEGACY_REPAIRED`:
  - repaired trade rows exist;
  - aggregate proof remains usable; and
  - the run must show that legacy normalization changed review interpretation.
- `DIAGNOSTIC_ONLY`:
  - insufficient history;
  - no trades;
  - weak exits dominated by end-of-test closures;
  - benchmark unavailable;
  - low sample size;
  - low or unknown data-quality confidence.
- `PARTIAL_REVIEW`:
  - some evidence gaps exist, but the run still has enough bounded proof to review with caution.
- `TRUSTED_REVIEW`:
  - no withheld proof;
  - no diagnostic-only blockers;
  - structured exit/invalidation traceability is present.

Trade traceability must map current source evidence without changing simulation math:

- registered runs:
  - `entryRuleIds` from Strategy Framework evaluator `entryRulesPassed`;
  - `exitRuleIds` from Strategy Framework evaluator `exitRulesTriggered` when a strategy exit occurs;
  - `ruleVersion` from `strategyVersion`;
- custom runs:
  - `entryRuleIds` from `config.entryRule.type`;
  - `exitRuleIds` from `config.exitRule.type` when applicable;
- forced exits:
  - `STOP_LOSS`, `TRAILING_STOP`, `TAKE_PROFIT`, and `MAX_HOLDING_PERIOD` should surface as structured invalidation/risk trace IDs rather than plain text only;
- end-of-test closures:
  - remain visible as `END_OF_TEST`;
  - must not pretend a real exit rule fired.

## Exact Future File Reservations

Allowed files for the bounded packet only:

- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.types.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.md`
- `backend/tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.test.ts`
- `frontend/src/features/backtesting-strategy-lab/types.ts`
- `frontend/src/features/backtesting-strategy-lab/components/BacktestingStrategyLabPage.tsx`
- `frontend/tests/ui/backtesting-strategy-lab.spec.ts`

## Explicitly Forbidden Files

- application source or tests before Team 00 promotion
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- generated Prisma client or generated types
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.repository.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.controller.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.router.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.validation.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.module.ts`
- `backend/src/modules/backtesting-strategy-lab/index.ts`
- `backend/tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.routes.test.ts`
- `backend/tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.validation.test.ts`
- `backend/src/modules/strategy-framework/**`
- `backend/src/modules/trade-plan-risk-engine/**`
- `frontend/src/features/backtesting-strategy-lab/api/backtestingStrategyLabService.ts`
- `frontend/src/features/backtesting-strategy-lab/hooks/useBacktestingStrategyLab.ts`
- `frontend/src/features/backtesting-strategy-lab/routes.tsx`
- backend and frontend route registries
- shared backend utilities
- shared frontend components
- package manifests
- provider/startup, paid/cloud, telemetry, broker, or market-data ownership changes

## Dependency And Conflict Notes

- No Prisma/schema/generated/shared-route approval is required for this packet.
- Existing `BacktestRun.metrics` and `BacktestRun.trades` payloads are already flexible enough for additive JSON-backed fields.
- `strategy-framework` remains a read-only dependency. The packet must consume its existing evaluator outputs and strategy version metadata as-is.
- Team 00 should not promote another `backtesting-strategy-lab` source packet in parallel with this one. The service/types/doc/test and page/types/UI spec are one writer set.

## Required QA Planning Handoff For Team 04

Team 04 can plan this packet now.

Required scenarios:

- trusted review outcome with structured rule traceability and no withheld proof;
- partial review outcome where availability is `PARTIAL` but aggregate proof remains usable;
- diagnostic-only outcome for:
  - benchmark unavailable;
  - weak end-of-test exit dominance;
  - insufficient history;
  - low sample size;
- legacy-repaired outcome where trade rows are normalized but aggregate proof remains usable;
- withheld outcome where `LEGACY_INVALID` aggregate proof is quarantined;
- registered strategy run shows structured `entryRuleIds`, `exitRuleIds`, `ruleVersion`, and reason evidence;
- custom rule run shows structured `entryRuleIds`, `exitRuleIds`, risk/invalidation trace IDs, and reason evidence;
- end-of-test exits remain visible as weak traceability rather than pretending a strategy exit happened;
- existing page surfaces remain research-support and do not introduce recommendation language.

## Ready Recommendation

- No-schema first slice: feasible.
- Split required: no.
- Blocked: no.
- Ready recommendation: `Ready candidate`.

Team 04 QA planning can start now, and Team 00 can evaluate this as a bounded Ready candidate after QA handoff exists.
