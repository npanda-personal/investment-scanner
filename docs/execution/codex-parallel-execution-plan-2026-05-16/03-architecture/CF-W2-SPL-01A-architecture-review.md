# CF-W2-SPL-01A Architecture Review And Source Map

Date: 2026-05-26

Owner: Team 03 Architecture Factory

## Status

Not Ready for Implementation.

This is a docs-only architecture/source-map pass for `CF-W2-SPL-01A`. It does not move the item to Ready.

## Verdict

`CF-W2-SPL-01A` cannot be promoted as a Ready candidate on the current source base.

Reason:

- current persisted evidence can support a bounded source map for entry-trigger basis, current price basis, current data-quality basis, and strategy/backtest provenance;
- current persisted evidence does not truthfully persist a reusable active/closed lifecycle row with source-backed close date, close price, and close reason;
- the existing accepted active-health semantics are Today Review-local historical semantics, but the current `dev` source does not expose a reusable dedicated lifecycle DTO or persisted lifecycle record for a new module to consume without re-creating logic or widening contracts;
- because `CF-W2-SPL-01A` requires both `Active` and `Closed`, the requirement needs a Team 02 split before Team 03 should issue a Ready contract/work-packet.

## Missing Ready Gate

The missing gate is architectural truth-source fit, not user consent.

`CF-W2-SPL-01A` needs one of these before it can become a Ready candidate:

1. Team 02 splits the child into a narrower active-only read-model slice plus a later durable closed-history slice; or
2. Team 00 explicitly opens a consent-gated durable lifecycle storage packet first.

After that split, Team 04 must turn the existing pre-architecture scaffold into an executable QA plan for the chosen child.

## Evidence Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/00-control/active-work-board.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/shared-file-control.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/contract-inventory.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W2-SPL-01-signal-position-ledger-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W2-SPL-01A-signal-position-ledger-first-slice-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W2-SPL-01-pre-architecture-qa-scaffold.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-SIG-TRIGGER-ENTRY-01-rule-trigger-entry-price-evidence-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-TSC-02-active-signal-health-rule-evidence-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-TSC-03-supporting-trust-evidence-contract.md`
- `docs/architecture.md`
- `backend/prisma/schema.prisma`
- `backend/src/api/routes.ts`
- `frontend/src/app/routes.tsx`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.types.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.service.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.repository.ts`
- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.types.ts`
- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.service.ts`
- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.repository.ts`
- `backend/src/modules/today-trade-review/today-trade-review.types.ts`
- `backend/src/modules/today-trade-review/today-trade-review.service.ts`
- `backend/src/modules/today-trade-review/today-trade-review.repository.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.types.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.service.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.repository.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.router.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
- `backend/src/modules/strategy-framework/strategy-framework.types.ts`
- `backend/src/modules/strategy-framework/strategy-framework.service.ts`
- `backend/src/modules/strategy-framework/strategy-framework.router.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.types.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.router.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.types.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.repository.ts`

## Current Source Map

### 1. Entry-trigger basis

Best current evidence owner:

- `signal-generation-engine`

Exact candidate read paths:

- service: `SignalGenerationEngineService.signalHistory(...)`
- service: `SignalGenerationEngineService.latestForInstrument(...)`
- service: `SignalGenerationEngineService.latestPersistedForInstruments(...)`
- repository: `SignalGenerationEngineRepository.signalHistory(...)`
- repository: `SignalGenerationEngineRepository.latestForInstrument(...)`
- persistence: Prisma `SignalResult`

Usable fields now:

- `triggerContract.trigger_price`
- `triggerContract.trigger_timestamp`
- `triggerContract.reason_summary`
- `triggerContract.strategy_id`
- `triggerContract.strategy_version`
- `triggerContract.entry_rule_id`
- `triggerContract.timeframe`
- raw DTO `symbol`, `company_name`, `direction`, `generated_at`

Important gap already explicit in current source:

- `SignalGenerationEngineService.triggerContractFor(...)` marks `exit_rule_id`, `invalidation_rule_id`, and `lifecycle_status` unavailable in the current signal record.

Result:

- source-proven entry basis exists additively for entry-trigger evidence;
- durable lifecycle state does not.

### 2. Active-health / lifecycle compatibility basis

Closest current evidence owner:

- `today-trade-review`

Exact candidate read paths:

- service: `TodayTradeReviewService.latest(...)`
- service: `TodayTradeReviewService.runById(...)`
- repository: `TodayTradeReviewRepository.latest(...)`
- repository: `TodayTradeReviewRepository.getRun(...)`
- repository: `TodayTradeReviewRepository.getCandidate(...)`
- persistence: Prisma `TodayReviewRun`
- persistence: Prisma `TodayReviewCandidate`

Usable fields now:

- review candidate `state`
- `reasonSummary`
- `strategyCode`
- `strategyVersion`
- `dataQualitySnapshot`
- `strategyProofSnapshot`
- `tradePlanSnapshot`
- `sourceSignalSnapshot`

Critical gap:

- `TodayReviewCandidate` persists review-ranking state, not a reusable signal-position lifecycle row;
- there are no persisted `closeType`, `closeDate`, `closePrice`, `closeReason`, `entryTriggerPrice`, or dedicated lifecycle fields on `TodayReviewCandidate`;
- the historical `CF-W1-TSC-02A` contract documents accepted health semantics, but the current `dev` source does not expose a dedicated public lifecycle DTO or persisted lifecycle snapshot for another module to consume directly.

Result:

- Today Review is useful compatibility evidence;
- it is not a durable active/closed ledger truth source.

### 3. Current price basis for active return

Best current evidence owner:

- `market-data-foundation`

Exact candidate read paths:

- service: `MarketDataFoundationService.latestPriceByInstrumentId(...)`
- route: `GET /api/v1/prices/:instrumentId/latest`
- service: `MarketDataFoundationService.listPricesByInstrumentId(...)`
- route: `GET /api/v1/prices/:instrumentId`
- persistence: Prisma `PriceTick`

Usable fields now:

- latest price
- latest price date
- source
- `data_status`

Result:

- current open return can be computed honestly when the module has a proven entry trigger price;
- stale or missing latest price can also be shown honestly.

### 4. Data-quality / trust basis

Best current evidence owner:

- `data-quality-engine`

Exact candidate read paths:

- service: `DataQualityEngineService.getLatestEvaluationForInstrument(...)`
- service: `DataQualityEngineService.getEvaluationsForInstruments(...)`
- repository: `DataQualityEngineRepository.latestForInstrument(...)`
- repository: `DataQualityEngineRepository.latestForInstruments(...)`
- route: `GET /api/v1/data-quality/instruments/:instrumentId`
- persistence: Prisma `DataQualityEvaluation`

Usable fields now:

- `signalReadinessStatus`
- `coverageStatus`
- `liquidityStatus`
- `warnings`
- `readinessBlockers`
- `useCaseTiers`
- `tierEvidence`
- `lastEvaluatedAt`

Result:

- current trust and DQ visibility for active rows is already available from public outputs;
- the new module should consume, not recreate, these statuses.

### 5. Strategy / rule / version provenance

Best current evidence owners:

- `strategy-decision-engine`
- `strategy-framework`

Exact candidate read paths:

- service: `StrategyDecisionEngineService.latestForInstrument(...)`
- service: `StrategyDecisionEngineService.history(...)`
- service: `StrategyDecisionEngineService.exits(...)`
- repository: `StrategyDecisionEngineRepository.latestForInstrument(...)`
- repository: `StrategyDecisionEngineRepository.history(...)`
- repository: `StrategyDecisionEngineRepository.exits(...)`
- route: `GET /api/v1/strategy/:instrumentId`
- route: `GET /api/v1/strategy/history/:instrumentId`
- route: `GET /api/v1/strategy/exits`
- service: `StrategyFrameworkService.proofDetail(...)`
- service: `StrategyFrameworkService.performance(...)`
- route: `GET /api/v1/strategies/:code/proof`
- route: `GET /api/v1/strategies/:code/performance`
- persistence: Prisma `StrategyDecisionResult`
- persistence: Prisma `StrategyPerformanceSummary`

Usable fields now:

- `strategy`
- `strategyVersion`
- `frameworkBacked`
- `entryRulesPassed`
- `exitRulesTriggered`
- `strategyRating`
- `readinessLabel`
- proof/rating/backtest summary metadata

Critical gap:

- `StrategyDecisionResult` stores exit/invalidation rule evidence additively, but not a dedicated documented close event with close price/date;
- `exits(...)` gives current exit-risk decisions, not durable position closures.

Result:

- provenance is reusable;
- close-event truth is not.

### 6. Backtest proof compatibility basis

Best current evidence owners:

- `strategy-framework`
- `backtesting-strategy-lab`

Exact candidate read paths:

- service: `StrategyFrameworkService.proofDetail(...)`
- service: `StrategyFrameworkService.performance(...)`
- route: `GET /api/v1/strategies/:code/proof`
- route: `GET /api/v1/strategies/:code/performance`
- service: `BacktestingStrategyLabService.listRuns(...)`
- service: `BacktestingStrategyLabService.getRun(...)`
- route: `GET /api/v1/backtests/runs`
- route: `GET /api/v1/backtests/runs/:id`
- persistence: Prisma `StrategyPerformanceSummary`
- persistence: Prisma `BacktestRun`

Usable fields now:

- proof status
- rating grade
- readiness label
- historical trade counts and metrics

Forbidden as signal-position truth source:

- `BacktestTrade.exitDate`, `exitPrice`, and `exitReason` are simulation outputs, not live system-triggered close evidence for persisted signal positions.

Result:

- backtesting is supporting trust evidence only.

### 7. Trade Plan compatibility basis

Current evidence owner:

- `trade-plan-risk-engine`

Exact candidate read paths:

- service: `TradePlanRiskEngineService.latestForInstrument(...)`
- repository: `TradePlanRiskEngineRepository.latestForInstrument(...)`
- route: `GET {tradePlanRiskModule.routePrefix}/:instrumentId`
- persistence: Prisma `TradePlanResult`

Compatibility-only fields:

- `strategyProofSnapshot`
- `strategyDecisionSnapshot`
- `dataQualitySnapshot`
- `invalidationRules`

Forbidden as ledger truth source:

- `entryZone`
- `target`
- `rewardRiskRatio`
- target/reward/risk semantics generally

Result:

- usable only as compatibility evidence after the core lifecycle proof exists;
- not valid as first-slice lifecycle truth.

## Architecture Conclusion

### What current source can already support

Current persisted/public evidence can support:

- entry-trigger provenance from `signal-generation-engine`;
- current price basis from `market-data-foundation`;
- current DQ/trust basis from `data-quality-engine`;
- strategy/rule/version provenance from `signal-generation-engine`, `strategy-decision-engine`, and `strategy-framework`;
- supporting proof labels from `strategy-framework` and `backtesting-strategy-lab`.

### What current source cannot yet support honestly

Current persisted/public evidence does not yet support:

- a durable position-open event separate from repeated daily signal rows;
- a documented close event with close type, close date, close price, and close reason;
- a reusable persisted lifecycle state that another module can treat as `Active` or `Closed` without replay ambiguity;
- truthful closed-return computation across sessions from live system evidence.

## First-Slice Recommendation

Do not promote `CF-W2-SPL-01A` as-written.

Recommend a Team 02 split:

1. new narrower child for an active-only read model using current source-proven entry evidence plus current price/DQ/provenance evidence; then
2. separate durable closed-history child for lifecycle storage or explicit close-event persistence.

Why the split is necessary:

- `CF-W2-SPL-01A` requires both `Active` and `Closed`;
- the current base can support some active compatibility evidence, but it cannot prove closed history honestly;
- forcing both tabs into one first child would either invent closes or widen into consent-gated storage unexpectedly.

## Likely Future File Reservations After Split Approval

These are not active reservations. They are only the likely writer set for a future bounded child if Team 02 and Team 00 approve a split.

### Likely module-local backend writer set

- `backend/src/modules/signal-position-ledger/signal-position-ledger.module.ts`
- `backend/src/modules/signal-position-ledger/signal-position-ledger.router.ts`
- `backend/src/modules/signal-position-ledger/signal-position-ledger.controller.ts`
- `backend/src/modules/signal-position-ledger/signal-position-ledger.service.ts`
- `backend/src/modules/signal-position-ledger/signal-position-ledger.repository.ts`
- `backend/src/modules/signal-position-ledger/signal-position-ledger.validation.ts`
- `backend/src/modules/signal-position-ledger/signal-position-ledger.types.ts`
- `backend/src/modules/signal-position-ledger/signal-position-ledger.md`
- `backend/src/modules/signal-position-ledger/index.ts`
- `backend/tests/modules/signal-position-ledger/signal-position-ledger.service.test.ts`
- `backend/tests/modules/signal-position-ledger/signal-position-ledger.repository.test.ts`
- optional only if controller/validation are added in the approved child:
  - `backend/tests/modules/signal-position-ledger/signal-position-ledger.routes.test.ts`
  - `backend/tests/modules/signal-position-ledger/signal-position-ledger.validation.test.ts`

### Likely module-local frontend writer set

- `frontend/src/features/signal-position-ledger/types.ts`
- `frontend/src/features/signal-position-ledger/api/signalPositionLedgerService.ts`
- `frontend/src/features/signal-position-ledger/hooks/useSignalPositionLedger.ts`
- `frontend/src/features/signal-position-ledger/components/SignalPositionLedgerPage.tsx`
- `frontend/src/features/signal-position-ledger/routes.tsx`
- `frontend/src/features/signal-position-ledger/index.ts`
- `frontend/tests/ui/signal-position-ledger.spec.ts`

### Deferred shared-file requests only after Team 00 promotion

- `backend/src/api/routes.ts`
- `frontend/src/app/routes.tsx`

### Current forbidden scope

Still forbidden until a new bounded child is approved:

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- shared backend utilities
- shared frontend components
- package manifests
- generated files
- broker, portfolio, or execution integration
- Trade Plan target/reward/risk truth sourcing
- broad Today Review, Strategy Decision, Backtesting, or Portfolio rewrites

## Why No Contract Or Work Packet Is Issued Yet

Team 03 does not issue a Ready contract/work-packet for `CF-W2-SPL-01A` now because the requirement still bundles two different truth-source shapes:

- read-model compatibility for active evidence; and
- durable close-event history for closed evidence.

Until Team 02 or Team 00 chooses one honest first child, any contract/work-packet would either over-reserve files or hide the unresolved lifecycle-storage decision.

## Next Gate

1. Team 02: split `CF-W2-SPL-01A` into an active-only read-model child and a later durable closed-history child, or explicitly request a storage-first packet.
2. Team 03: after that split, draft the exact contract and work-packet for the chosen child.
3. Team 04: convert `CF-W2-SPL-01-pre-architecture-qa-scaffold.md` into an executable QA plan for the chosen child.

## Consent Blockers

No true user-consent or sandbox blocker was encountered in this docs-only pass.

The blockers are architectural:

- unresolved truthful closed-history source;
- unresolved child split;
- no executable QA plan tied to an approved child boundary.
