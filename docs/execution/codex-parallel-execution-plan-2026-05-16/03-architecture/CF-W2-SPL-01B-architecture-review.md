# CF-W2-SPL-01B Architecture Review

Date: 2026-05-26

Owner: Team 03 Architecture Factory

## Status

Ready candidate after QA for one bounded backend-only child.

This packet is docs-only architecture readiness for `CF-W2-SPL-01B`. It does not move the item to Ready for Implementation.

This packet does not authorize backend route-registry wiring, frontend route-registry wiring, shared UI work, or a standalone surfaced page in the same implementation pass.

## Verdict

`Ready candidate after QA` as a backend-only active-position read-model packet using current persisted/public evidence only.

Reason:

- current `dev` source can already produce source-proven entry-trigger rows by reusing the persisted Signal Generation read path plus the existing trigger-contract enrichment;
- current `dev` source can already attach current latest price basis, current Data Quality basis, and current strategy/version provenance from persisted/public evidence;
- current `dev` source cannot truthfully prove durable open/closed lifecycle state, so the first child must expose lifecycle/health as explicit limited evidence rather than fabricate `ACTIVE` or `CLOSED`;
- current `dev` source does not expose the accepted Today Review health semantics as a reusable public DTO on `dev`, so the first child must not promise `ACTIVE`, `HEALTHY`, `WEAKENING`, `INVALIDATED`, or `EXPIRED`;
- a bounded backend module can be prepared without schema/migration, route-registry, shared UI, package/generated, provider/live, startup/backfill, broker, portfolio, or Trade Plan target/R:R scope.

## Evidence Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/shared-file-control.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W2-SPL-01B-signal-position-ledger-active-positions-read-model-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W2-SPL-01A-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W2-SPL-01B-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-02-requirement-factory.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-TSC-02-active-signal-health-rule-evidence-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-TSC-03-supporting-trust-evidence-contract.md`
- `backend/prisma/schema.prisma`
- `backend/src/api/routes.ts`
- `frontend/src/app/routes.tsx`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.types.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.service.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.repository.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.md`
- `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.md`
- `backend/src/modules/data-quality-engine/data-quality-engine.types.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.service.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.repository.ts`
- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.types.ts`
- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.service.ts`
- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.repository.ts`
- `backend/src/modules/strategy-framework/strategy-framework.types.ts`
- `backend/src/modules/strategy-framework/strategy-framework.service.ts`
- `backend/src/modules/today-trade-review/today-trade-review.types.ts`
- `backend/src/modules/today-trade-review/today-trade-review.service.ts`
- `backend/src/modules/today-trade-review/today-trade-review.repository.ts`

## Current Source Findings

### 1. Entry-trigger basis is already available

Current best source:

- `SignalGenerationEngineService.topSignals(...)`
- `SignalGenerationEngineService.enrichSignals(...)`
- `SignalGenerationEngineService.triggerContractFor(...)`
- persisted `SignalResult`

What current `dev` already proves:

- `triggerContract.trigger_price`
- `triggerContract.trigger_timestamp`
- `triggerContract.reason_summary`
- `triggerContract.strategy_id`
- `triggerContract.strategy_version`
- `triggerContract.entry_rule_id`
- `triggerContract.trigger_type`
- `triggerContract.trigger_price_evidence.status`

Important current guardrail:

- current `dev` already marks unsupported fields such as `exit_rule_id`, `invalidation_rule_id`, and `lifecycle_status` as unavailable in the trigger contract rather than fabricating them.

### 2. Current latest-price basis is already available

Current best source:

- `MarketDataFoundationService.latestPriceByInstrumentId(...)`
- persisted `PriceTick`

What current `dev` already proves:

- latest price date
- latest close / adjusted close
- source
- `data_status`

Result:

- the first child can compute a bounded `current return percent` from source-proven entry trigger price to latest trusted price;
- stale or unavailable price basis can already be shown explicitly.

### 3. Current Data Quality basis is already available

Current best source:

- `DataQualityEngineService.getLatestEvaluationForInstrument(...)`
- `DataQualityEngineService.getEvaluationsForInstruments(...)`
- persisted `DataQualityEvaluation`

What current `dev` already proves:

- `signalReadinessStatus`
- `coverageStatus`
- `liquidityStatus`
- `warnings`
- `readinessBlockers`
- `useCaseTiers`
- `tierEvidence`
- `lastEvaluatedAt`

Result:

- the first child can show current DQ/trust limitations from module-owned public outputs rather than duplicating DQ logic locally.

### 4. Strategy and rule provenance is already available

Current best sources:

- signal trigger contract on enriched signal rows
- `StrategyDecisionEngineService.latestForInstrument(...)`
- persisted `StrategyDecisionResult`

What current `dev` already proves:

- strategy code / id
- strategy version
- entry-rule id from trigger-price evidence
- framework-backed decision availability
- `entryRulesPassed`
- `exitRulesTriggered`
- readiness label / strategy rating where present

Result:

- the first child can keep strategy/rule/version provenance visible;
- exit/invalidation provenance can remain explicit unavailable when the current source cannot prove them.

### 5. Reusable lifecycle truth is still missing on current `dev`

Current blockers on `dev`:

- `SignalResult` does not persist durable lifecycle state, close date, close price, or close reason;
- `TodayReviewCandidate.state` is a review-ranking state, not a reusable position-lifecycle row;
- current `TodayReviewCandidate.sourceSignalSnapshot` does not persist trigger price/timestamp provenance;
- current `dev` source does not expose the historical `CF-W1-TSC-02A-TREV-HEALTH` semantics as a reusable public DTO for a new module.

Result:

- the first child must not expose `ACTIVE`, `HEALTHY`, `WEAKENING`, `INVALIDATED`, `EXPIRED`, or `CLOSED` as if they were durably proven;
- the first child may expose only limited current health compatibility states that are provable from existing public outputs.

### 6. Limited current health compatibility is still possible

Current compatible source:

- latest exit-oriented `StrategyDecisionResult` / public `StrategyDecisionEngineService.latestForInstrument(instrumentId, 'DEFENSIVE_EXIT')`

What current `dev` can prove safely:

- `decision = EXIT_CANDIDATE` can support `EXIT_TRIGGERED` compatibility semantics;
- `decision = REDUCE_RISK` can support `RISK_WARNING` compatibility semantics.

What current `dev` cannot prove safely:

- durable active state
- durable healthy / weakening state
- durable invalidated / expired / closed state

## Architecture Decision

Prepare `CF-W2-SPL-01B` as a backend-only `signal-position-ledger` read-model child.

The first child should:

- create one module-local active-row read model under `backend/src/modules/signal-position-ledger`;
- consume current persisted/public evidence only;
- include rows only when source-proven entry trigger price and timestamp exist on the current enriched trigger contract;
- compute current return from source-proven entry trigger price to latest trusted price only when that basis is trustworthy;
- expose explicit `UNAVAILABLE` / `STALE` / `LIMITED_EVIDENCE` semantics instead of fabricating lifecycle truth;
- defer row detail, backend route-registry wiring, frontend feature work, frontend route wiring, and standalone page exposure.

## Smallest Honest Child

Child label:

`CF-W2-SPL-01B active rows backend read model`

Bounded behavior:

- one paginated active-row response;
- no closed-history surface;
- no row-detail surface in the first child;
- no new persistence;
- no schema/migration/generated/package changes;
- no shared-file work.

## Required Inclusion Policy

Active-row inclusion should be based on all of the following:

1. latest persisted trusted signal row for the instrument in the selected scope;
2. enriched `triggerContract.trigger_price_evidence.status = SOURCE_PROVEN`;
3. enriched `triggerContract.trigger_type` is compatible with an entry-ledger row (`bullish_entry_trigger` or `bearish_trigger`);
4. explicit exclusion of legacy/incomplete rows that cannot prove source-backed entry basis.

Important language rule:

- the module may call the surface `Signal Position Ledger`, but row-level lifecycle semantics must stay explicit about limited proof;
- do not label the row state itself as `ACTIVE` unless current source can prove that specific state.

## Required Current Return Policy

For the first child:

- `current return percent` is raw price return from entry trigger price to latest trusted price;
- it is not realized P/L, account performance, portfolio profit, or short-profit proof;
- row identity must keep `trigger_type` visible so bullish/bearish entry context is not hidden;
- if current price basis is stale, partial, unsupported, or blocked by current DQ/trust evidence, the row must show explicit stale/unavailable status instead of a fresh-looking return.

## Required Health / Lifecycle Policy

The first child may prove only these compatibility states on current `dev`:

- `EXIT_TRIGGERED`
- `RISK_WARNING`

using current Strategy Decision exit evidence only.

The first child must not emit:

- `ACTIVE`
- `HEALTHY`
- `WEAKENING`
- `INVALIDATED`
- `EXPIRED`
- `CLOSED`

unless a later child adds a truthful public lifecycle source.

All other rows must surface:

- `healthState = null`
- explicit lifecycle-evidence status such as `UNAVAILABLE` or equivalent.

## Exact Future File Reservations

Allowed backend module files after Team 00 promotion:

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
- `backend/tests/modules/signal-position-ledger/signal-position-ledger.validation.test.ts`

Optional only if the implementer adds explicit isolated router/controller assertions:

- `backend/tests/modules/signal-position-ledger/signal-position-ledger.routes.test.ts`

## Exact Future Forbidden Files

Especially forbidden for the first child:

- `backend/src/api/routes.ts`
- `frontend/src/app/routes.tsx`
- all `frontend/src/features/signal-position-ledger/**`
- all `frontend/tests/ui/**`
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- generated files
- package manifests and lockfiles
- shared backend utilities
- shared frontend components
- all `backend/src/modules/today-trade-review/**`
- all `backend/src/modules/trade-plan-risk-engine/**`
- all `backend/src/modules/portfolio-management/**`
- all `backend/src/modules/portfolio-intelligence/**`
- all `backend/src/modules/backtesting-strategy-lab/**`
- provider/live-data, worker, queue, scheduler, startup, or backfill files in any module

Result:

- schema/storage: forbidden, not required
- backend route registry: forbidden in this child, Team 00 gate later
- frontend route registry: forbidden in this child, Team 00 gate later
- shared UI: forbidden, not required
- package/generated: forbidden, not required
- provider/live/startup/backfill: forbidden, not required
- broker/portfolio/Trade Plan target/R:R: forbidden, not required

## Team 00 Shared-File Gate

If Team 00 later wants a surfaced API or page, those must be separate shared-file decisions after this child:

1. backend route-registry reservation:
   - `backend/src/api/routes.ts`
2. frontend feature + app-route reservation:
   - `frontend/src/features/signal-position-ledger/**`
   - `frontend/src/app/routes.tsx`

No safer user-visible first slice exists without opening at least the backend route registry.

The safer first slice now is backend-only read-model assembly plus focused tests.

## QA Handoff Notes

Team 04 can evaluate the bounded first child now, but Team 00 should treat the current QA plan as an umbrella and apply only the backend subset for this first packet.

Required backend scenarios:

- source-proven entry row appears only when trigger price and timestamp are both present;
- legacy or incomplete signal rows stay hidden or explicitly unsupported;
- current return is computed only when latest trusted price basis is current enough to trust;
- stale/missing price basis downgrades return to explicit unavailable/stale;
- current DQ/trust status comes from current public DQ outputs;
- strategy/rule/version provenance remains visible or explicitly unavailable;
- only `EXIT_TRIGGERED` / `RISK_WARNING` may appear as current health compatibility states on current `dev`;
- all other lifecycle semantics remain explicit unavailable.

Suggested focused commands after implementation exists:

```powershell
cd backend
npm.cmd test -- signal-position-ledger.service.test.ts signal-position-ledger.repository.test.ts signal-position-ledger.validation.test.ts --runInBand
npm.cmd run build
```

Optional only if router/controller tests are added:

```powershell
cd backend
npm.cmd test -- signal-position-ledger.routes.test.ts --runInBand
```

## Ready Result

`CF-W2-SPL-01B` can become Ready after QA as one bounded backend-only read-model child.

What remains outside this packet:

- Team 00 exact Ready promotion and one-writer reservation
- any backend route-registry integration
- any frontend feature/page integration

The current Team 04 QA plan is directionally useful, but its UI and route-integrated portions should be treated as deferred until Team 00 explicitly opens shared-file scope.
