# CF-W2-BT-05 Architecture Review

Date: 2026-05-24

Owner: Team 03 Architecture Factory

## Status

ACCEPT / ARCHITECTURE-READY-CANDIDATE.

This packet is planning-only and not Ready for Implementation yet. Team 04 QA planning is still required, and Team 00 must preserve one-writer sequencing on the accepted backtesting branch stack.

## Evidence Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W2-BT-05-backtesting-rule-exit-invalidation-evidence-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/next-top-10-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/top-10-ready-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/00-control/active-work-board.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-BT-04-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-BT-04-backtesting-run-current-proof-freshness-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-BT-04-work-packet.md`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.types.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.repository.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.md`
- `backend/tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.test.ts`
- `backend/src/modules/strategy-framework/strategy-framework.evaluator.ts`
- `backend/src/modules/strategy-framework/strategy-framework.types.ts`
- `git branch --contains 8f984b1`
- `git branch --contains 2bd794f`

## Current Source Findings

- Current backtest runs already expose enough no-schema evidence to build a bounded read-path packet:
  - `config.strategyCode`
  - `config.strategyVersion`
  - `config.timeframe`
  - `config.region`
  - `config.assetType`
  - `startedAt`
  - `completedAt`
  - `metrics.numberOfTrades`
  - `metrics.exitDiagnostics`
  - `metrics.availabilityStatus`
  - `metrics.calculationAudit`
- The service already separates high-level exit buckets at simulation time:
  - `END_OF_TEST`
  - `STOP_LOSS`
  - `TRAILING_STOP`
  - `TAKE_PROFIT`
  - `MAX_HOLDING_PERIOD`
  - `STRATEGY_EXIT`
- Registered strategy exit evaluation already has rule-level source data in memory through `StrategyFrameworkEvaluator.evaluateExit(...)`, specifically `exitRulesTriggered`, but the current backtesting module does not preserve those rule codes on persisted trades or metrics.
- Dedicated invalidation evidence is not modeled honestly in the current backtesting module. Risk defaults such as stop loss, trailing stop, max hold, and take profit are simulation controls, not trustworthy documented invalidation proof.
- Saved run freshness can use existing `completedAt` or `startedAt`; a new persisted `generatedAt` field is not required for the first slice.
- The active Today Review implementation is in a separate Team 07 worktree, and this packet is source-disjoint as long as it stays inside `backtesting-strategy-lab`.

## Architecture Decision

Approve only a backend-only first child for `CF-W2-BT-05`.

The smallest honest slice is an additive `backtesting-strategy-lab` evidence projection that:

- marks whether a run is a registered documented-rule run or an unsupported custom-rule run,
- reports latest-comparable run freshness from existing run timestamps,
- breaks exits into documented rule exits, operational risk/forced exits, simulation-assumption exits, and missing evidence,
- treats invalidation evidence as missing or unsupported unless the module has explicit proof,
- does not add any backtesting UI, Today Review UI, route, schema, provider, startup, or backfill work.

Do not widen this first child into frontend rendering, Today Review adoption, take-profit ranking, profit-target framing, R:R framing, or strategy semantic rewrite.

## Proposed Contract Shape

The first child should add additive fields equivalent to:

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

Exact field names may differ, but the behavior must remain stable.

## Required Mapping Rules

- `DOCUMENTED_EXIT_EVIDENCE`
  - registered strategy run
  - comparable run freshness resolved from existing saved runs
  - documented exit rule codes are available for the run
  - invalidation remains truthfully marked unsupported if not modeled
- `PARTIAL_DOCUMENTED_EXIT_EVIDENCE`
  - registered strategy run
  - some documented exit evidence is available
  - invalidation evidence and/or persisted rule-code evidence is still missing
- `CUSTOM_RULES_UNSUPPORTED`
  - custom-rule run or missing `strategyCode`
  - do not treat as trusted signal candidate supporting evidence
- `LEGACY_RULE_CODE_EVIDENCE_MISSING`
  - run is registered, but historical persisted trades do not contain stable documented rule-code evidence

Exit classification rules for the first child:

- documented rule exits:
  - only counts backed by explicit registered strategy rule codes
- operational exits:
  - `STRATEGY_EXIT`
  - `STOP_LOSS`
  - `TRAILING_STOP`
  - `MAX_HOLDING_PERIOD`
  - `END_OF_TEST`
- simulation-assumption exits:
  - `TAKE_PROFIT` only

Invalidation rules:

- do not infer invalidation from stop loss, trailing stop, max hold, or take profit
- do not infer invalidation from human-readable `reasons`
- surface unsupported invalidation evidence through `missingEvidence`

Trusted-candidate safety rule:

- `safeForTrustedCandidateSupportingEvidence` may be `true` only when documented exit evidence is present and take-profit output is clearly isolated from documented-rule evidence
- the presence of take-profit simulation counts must never become target evidence

## Module Boundary

- Backend owner: `backtesting-strategy-lab`
- No frontend feature work in this first child
- No Today Review consumer work in this first child
- No route-registry, shared UI, shared utility, package, generated, schema, provider, live-data, startup, or backfill scope opens

## Exact Future File Reservations

Allowed future writer set:

- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.types.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.md`
- `backend/tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.test.ts`

## Exact Forbidden Files

- application source or tests before Team 00 promotion
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.repository.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.controller.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.router.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.validation.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.module.ts`
- `backend/src/modules/backtesting-strategy-lab/index.ts`
- `backend/tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.routes.test.ts`
- `backend/tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.validation.test.ts`
- `backend/src/modules/strategy-framework/**`
- `backend/src/modules/signal-quality-lab/**`
- `backend/src/modules/strategy-decision-engine/**`
- `backend/src/modules/trade-plan-risk-engine/**`
- `backend/src/modules/market-data-foundation/**`
- `frontend/src/features/backtesting-strategy-lab/**`
- `frontend/src/features/today-review/**`
- `frontend/tests/ui/backtesting-strategy-lab.spec.ts`
- `frontend/tests/ui/today-review*.spec.ts`
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- backend and frontend route registries
- shared backend utilities
- shared frontend components
- package manifests
- generated files

## Dependencies And Sequencing

- Required base: accepted `CF-W1-BT-04` commit `2bd794f`
- Do not branch this child from current `dev`
- `git branch --contains 2bd794f` shows the accepted backtesting branch and current `dev` does not contain that packet
- Team 00 must keep the packet isolated to one Team 06 backtesting writer worktree
- Do not run this child in parallel with any other `backtesting-strategy-lab` implementation pass
- Team 04 QA planning is still required before Ready evaluation

## Shared-File Risk Assessment

- Shared route registries: forbidden
- Shared UI: forbidden
- Shared backend utilities: forbidden
- Shared package/generated files: forbidden
- Current risk is one-writer sequencing on the accepted backtesting branch stack, not cross-module architecture coupling

## QA Implications

Team 04 should plan backend evidence validation for:

- registered run with documented exit rule codes available
- registered legacy run with missing rule-code evidence
- custom-rule run marked unsupported
- take-profit counted only under simulation assumptions
- stop loss, trailing stop, max hold, and end-of-test kept outside documented invalidation proof
- freshness using latest comparable registered run
- no target-price, profit-target, or R:R semantics in evidence text

No UI smoke is required for this first child. Any later consumer/UI slice needs its own requirement, architecture packet, QA plan, and file reservations.

## Architecture Verdict

- Item: `CF-W2-BT-05`
- Result: `ARCHITECTURE-READY-CANDIDATE`
- Blocked: no
- Recommended implementation owner after Ready promotion: Team 06 - Strategy / Signal / Risk
- Ready for Team 00 promotion now: no, because Team 04 QA planning is still missing
- Next gate: Team 04 QA planning, then Team 00 Ready evaluation on stacked base `2bd794f`
