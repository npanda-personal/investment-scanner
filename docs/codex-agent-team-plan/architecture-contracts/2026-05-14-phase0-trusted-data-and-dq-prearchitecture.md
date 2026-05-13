# Phase 0 Trusted Data Baseline And Data Quality Tiering Pre-Architecture

Date: 2026-05-14
Mode: Architecture Planning Mode
Role: Solution Architect
Work item: Phase 0 pre-architecture for trusted data baseline and Data Quality use-case tiers
Owned artifact: `docs/codex-agent-team-plan/architecture-contracts/2026-05-14-phase0-trusted-data-and-dq-prearchitecture.md`
Status: Pre-architecture only. Not final architecture authorization. Reconciliation with the Lead PO brief is still required.

## 1. Planning Verdict

Phase 0 should keep `market-data-foundation` as the single source of truth for trusted-data baseline and make `data-quality-engine` a tiered consumer of that baseline.

The repo already has the right ownership split for this:

- Market Data Foundation owns provider validation, history/freshness repair, listing-date/catalog identity, trusted-universe counts, review-readiness summary, and bounded repair workflows.
- Data Quality Engine owns downstream usability scoring and filters, but its current logic still relies on local heuristics such as a fixed stale-day threshold, a 300-row price fetch, and one latest evaluation row per instrument.

The Phase 0 gap is not missing module structure. The gap is that trusted-data truth and DQ use-case truth are not yet expressed as the same contract.

## 2. Current State Relevant To Phase 0

### Trusted baseline that already exists

`market-data-foundation` already publishes the strongest current trust contract:

- strict universe health and `universeSignoff`
- `review-readiness-summary`
- trusted review universe mode: `FULL_REVIEW`, `LIMITED_REVIEW`, `NO_REVIEW`
- required/stored latest completed EOD dates
- bounded repair lanes and persisted repair-run evidence
- MD-A5 history-window diagnostics and free-source fallback direction

Important current rule: Trusted Review Universe can allow price-action review while missing sector, industry, market cap, ISIN, or listing date remain context gaps. Full signoff stays stricter.

### DQE behavior that is now too coarse

Current DQE implementation:

- computes stale by `Date.now() - latestDate > STALE_PRICE_DAYS`
- fetches only up to `300` stored price rows per instrument during evaluation
- persists one `DataQualityEvaluation` row per instrument via `instrumentId @unique`
- exposes booleans for `eligibleForSignals`, `eligibleForBacktesting`, and `eligibleForCalibration`

That is enough for a first-pass dashboard, but not enough for Phase 0 tiering:

- backtest readiness cannot be proven from a 300-row fetch
- calibration readiness should not mean only `hasSignal && priceCount >= 60`
- no current versioned contract ties DQE readiness to Market Data history/freshness provenance
- the current single-row model cannot safely represent multiple use-case tiers, evaluation versions, or as-of trading dates

### Schema and identity risks already documented

- `Stock.symbol` is still globally unique instead of `symbol + exchange`
- `PriceTick` is keyed by `symbol + timestamp`
- `DataQualitySnapshot` is not a fully scoped/versioned trust ledger

These are manageable for Phase 0 if they remain explicit constraints, but they are real migration and correctness risks for any deep-history or cross-exchange trust contract.

## 3. Required Phase 0 Ownership Boundary

### Market Data Foundation owns

- latest-completed-EOD freshness truth
- history-window completeness truth
- listing-date and identity confidence
- provider support and fallback provenance
- repair state, repair attempts, and repair-run evidence
- trusted review universe membership
- scope-level signoff and downstream allow/block guidance

### Data Quality Engine owns

- use-case tier labels derived from Market Data truth plus DQE-local heuristics
- tier reason codes and recommended next actions
- user-facing diagnostics for daily review, signal, backtest, and calibration suitability
- batch-safe refresh of tier evaluations

### Historical Context Snapshots owns

- point-in-time persistence of already-computed DQ/tier outputs for historical analysis
- no live recomputation of trust from raw provider data

### Downstream modules must not own

- their own stale/freshness rules
- their own deep-history completeness tests
- their own listing-date trust logic
- provider/fallback interpretation

### Concrete module/file boundary

Primary ownership files for this Phase 0 topic:

- Market Data read and repair truth:
  - `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
  - `backend/src/modules/market-data-foundation/market-data-foundation.repository.ts`
  - `backend/src/modules/market-data-foundation/market-data-foundation.types.ts`
  - `backend/src/modules/market-data-foundation/market-data-foundation.validation.ts`
  - `backend/src/modules/market-data-foundation/market-data-foundation.controller.ts`
  - `backend/src/modules/market-data-foundation/market-data-foundation.router.ts`
  - `backend/src/modules/market-data-foundation/market-data-foundation.exchange-eod-adapter.ts`

- DQE tier computation and API:
  - `backend/src/modules/data-quality-engine/data-quality-engine.service.ts`
  - `backend/src/modules/data-quality-engine/data-quality-engine.repository.ts`
  - `backend/src/modules/data-quality-engine/data-quality-engine.types.ts`
  - `backend/src/modules/data-quality-engine/data-quality-engine.validation.ts`
  - `backend/src/modules/data-quality-engine/data-quality-engine.controller.ts`
  - `backend/src/modules/data-quality-engine/data-quality-engine.router.ts`

- Historical point-in-time consumption:
  - `backend/src/modules/historical-context-snapshots/historical-context-snapshots.service.ts`
  - `backend/src/modules/historical-context-snapshots/historical-context-snapshots.repository.ts`
  - `backend/src/modules/historical-context-snapshots/historical-context-snapshots.types.ts`

- Frontend read-only consumers:
  - `frontend/src/features/market-data-foundation/*`
  - `frontend/src/features/data-quality-engine/*`
  - later only, `frontend/src/features/historical-context-snapshots/*`

## 4. Proposed Trusted Baseline Contract

Phase 0 should define one additive Market Data baseline contract that DQE consumes per instrument and per scope.

Minimum baseline dimensions:

- `reviewMode`
- `trustStatus`
- `universeSignoff.status`
- `targetTradingDate`
- `requiredDataThroughDate`
- `storedDataThroughDate`
- `historyCoverageStatus`
- `requiredHistoryStartDate`
- `requiredHistoryEndDate`
- `listingDate`
- `listingDateStatus`
- `latestCompletedEodPresent`
- `recentVolumeCoveragePercent`
- `adjustedCloseCoveragePercent`
- `usesAdjustedCloseFallback`
- `primarySourceAttempted`
- `fallbackSourcesAttempted`
- blocker/reason arrays with stable machine-readable codes

Rule: DQE may summarize or classify these fields, but it must not recompute them from raw price/provider state.

### Additive API shape direction

Phase 0 should prefer additive DTO expansion over endpoint proliferation.

Recommended contract direction:

- keep `GET /api/v1/market-data/review-readiness-summary` as the scope-level canonical summary
- expose per-instrument trusted-baseline fields through existing Market Data list/detail surfaces or a bounded additive diagnostic surface
- keep `GET /api/v1/data-quality/*` as the DQE-owned consumer surface
- avoid creating a second scope-level trust endpoint inside DQE

Recommended DQE additive response shape:

```ts
interface DataQualityTierSummary {
  contractVersion: string;
  asOfTradingDate: string | null;
  marketDataBaseline: {
    reviewMode: 'FULL_REVIEW' | 'LIMITED_REVIEW' | 'NO_REVIEW';
    trustStatus: 'OK' | 'PARTIAL' | 'NOT_TRUSTWORTHY';
    requiredDataThroughDate: string | null;
    storedDataThroughDate: string | null;
    historyCoverageStatus?: string | null;
    listingDateStatus?: string | null;
  };
  tiers: {
    dailyReview: TierState;
    signal: TierState;
    backtest: TierState;
    calibration: TierState;
    automation: TierState;
  };
  tierReasons: Record<string, string[]>;
  tierWarnings: string[];
}
```

This can be additive on top of the existing DQE diagnostics DTO before any persistence redesign.

## 5. Proposed Data Quality Use-Case Tiers

Recommended Phase 0 tier shape per instrument:

```ts
type TierState = 'READY' | 'LIMITED' | 'BLOCKED';
```

Recommended tier families:

1. `dailyReview`
2. `signal`
3. `backtest`
4. `calibration`
5. `automation`

### Daily review tier

Source of truth: Trusted Review Universe plus `review-readiness-summary`.

- `READY`: instrument is in trusted review universe and scope review mode is `FULL_REVIEW`
- `LIMITED`: instrument is in trusted review universe and scope review mode is `LIMITED_REVIEW`
- `BLOCKED`: instrument is not in trusted review universe or scope mode is `NO_REVIEW`

This tier must not require full metadata completeness when Market Data explicitly treats metadata as a context gap for Lite review.

### Signal tier

Source of truth: daily review baseline plus DQE technical/liquidity checks.

- Requires current latest completed EOD from Market Data
- Requires sufficient technical lookback for active signal rules
- Requires non-failed liquidity/volume checks
- May remain `LIMITED` when context metadata is incomplete but Market Data still allows trusted review

Important constraint: signal tier must consume Market Data freshness/history contracts instead of only the current stale-day heuristic.

### Backtest tier

Source of truth: MD-A5 history coverage plus DQE usability checks.

- Must require history-window completeness from Market Data, not just `priceCount >= 252`
- Must fail closed when listing date is conflicting, market calendar is uncertain, or official fallback is still pending/failed
- Should treat `listingDate missing + 15-year target used` as at most `LIMITED` until the Lead PO brief confirms whether that can ever promote to `READY`

### Calibration tier

Source of truth: backtest tier plus signal-history evidence.

- Must not rely on the current `hasSignal && priceCount >= 60` shortcut
- Requires enough stored signal history and stable upstream trust to make calibration comparisons meaningful
- Should remain `BLOCKED` when history completeness or snapshot coverage is insufficient

### Automation tier

Phase 0 recommendation: expose only as policy-blocked placeholder or defer completely.

- No broker or live-trading implementation is authorized
- If a field is required for UI/API consistency, return `BLOCKED` with reason code such as `PHASE0_AUTOMATION_NOT_AUTHORIZED`

## 6. Schema Implications

### No-schema-change path for first slice

A first slice can ship with no Prisma change if it only:

- extends read DTOs
- derives tier outputs in service code
- exposes tier results in DQE API/UI without historical persistence

This is the lowest-risk reconciliation path before the Lead PO brief lands.

### If persistence/versioning is required

Do not overload the existing `DataQualityEvaluation` row for Phase 0 tier history.

Reason:

- it is keyed as one latest row per instrument
- it mixes current coverage/readiness booleans with no contract version
- changing semantics in place would create downstream ambiguity

Preferred additive direction after PO confirmation:

- keep `DataQualityEvaluation` for current summary compatibility
- add a new persisted tier table or equivalent versioned snapshot model keyed by:
  - `instrumentId`
  - `region`
  - `assetType`
  - `asOfTradingDate`
  - `contractVersion`

Recommended payload:

- Market Data baseline digest
- per-tier states
- per-tier reason codes
- evaluation timestamp
- source evaluation version

### Explicit migration risks

- Any attempt to fix `Stock.symbol @unique` and `PriceTick(symbol, timestamp)` in the same slice is too much blast radius for Phase 0 tiering.
- If identity migration is later approved, tier persistence must key off `instrumentId`, not symbol-only joins.
- Historical snapshots should not be backfilled from ambiguous symbol/exchange mappings.

### Existing models that Phase 0 must treat carefully

- `Stock`
  - trusted identity still depends on `symbol`, `exchange`, `providerSymbol`, `sourceSymbol`, `isin`, `ipoDate`
  - no Phase 0 tier work should widen ambiguity by introducing symbol-only joins

- `PriceTick`
  - current `source` field is important to preserve provenance
  - Phase 0 DQE tiering should consume Market Data history diagnostics rather than infer source sufficiency from raw rows

- `DataQualityEvaluation`
  - current table remains useful for latest dashboard state
  - current fields should not be reinterpreted silently to mean versioned trust tiers

- `DataQualitySnapshot`
  - currently too simple for tier-history truth
  - later extension should follow DQE-owned tier outputs, not a separate scoring formula

## 7. Backend Service And Repository Change Map

### Market Data Foundation backend changes

Service-level planning changes:

- `market-data-foundation.service.ts`
  - expose reusable instrument-level trusted-baseline read model for DQE consumption
  - keep ownership of `requiredDataThroughDate`, latest-completed-EOD truth, history coverage status, listing-date status, and fallback provenance
  - do not move repair or provider logic into DQE

- `market-data-foundation.repository.ts`
  - only additive read support if current service methods cannot surface instrument-level baseline efficiently
  - no Phase 0 identity-key migration

- `market-data-foundation.types.ts`
  - add stable machine-readable reason codes and per-instrument baseline DTOs
  - keep current summary contracts backward-compatible

- `market-data-foundation.validation.ts`
  - add validation only for any new bounded query params or optional diagnostic filters
  - do not create mutating paths from DQE needs

- `market-data-foundation.controller.ts` and `market-data-foundation.router.ts`
  - only additive read endpoints if existing list/detail contracts cannot safely carry baseline fields
  - preserve current repair endpoint ownership and route locations

### Data Quality Engine backend changes

Service-level planning changes:

- `data-quality-engine.service.ts`
  - replace or subordinate fixed stale-day gating with Market Data freshness/history truth
  - keep local ownership of liquidity, technical sufficiency, and use-case tier classification
  - separate tier derivation from existing scalar score derivation so current dashboard compatibility can remain during transition

- `data-quality-engine.repository.ts`
  - no change for Slice 2 if tiers are computed on read and returned directly
  - additive persistence only in Slice 3 if PO confirms versioned tier history

- `data-quality-engine.types.ts`
  - add tier DTOs, contract version, reason codes, and baseline digest fields
  - preserve current list/summary shapes where existing UI depends on them

- `data-quality-engine.validation.ts`
  - add tier-based filters only if needed, such as `dailyReviewState`, `backtestState`, `calibrationState`
  - keep request bounding rules intact: no unbounded batch size or offset behavior

- `data-quality-engine.controller.ts` and `data-quality-engine.router.ts`
  - no new ownership over Market Data trust summaries
  - expose tier outputs through existing DQE diagnostics/list responses or a small additive DQE summary endpoint if strictly needed

### Historical Context Snapshots backend changes

Current risk:

- `historical-context-snapshots.service.ts` currently computes a simplified data-quality snapshot from local counts and its own readiness formula.

Phase 0 direction:

- if Slice 3 is authorized, snapshots should persist DQE-owned tier outputs or a DQE baseline digest
- do not let snapshot service become a second DQ scoring engine
- until that slice is authorized, leave snapshot persistence unchanged and document it as lower-trust historical context

## 8. Free/Local-Only Provider Constraints

Phase 0 must preserve the repo's local/free-source operating boundary.

Allowed:

- local database
- existing Yahoo-first free provider path already in Market Data Foundation
- official/public NSE/BSE files and locally supplied official exchange files
- local CSV/manual metadata imports already owned by Market Data Foundation

Not allowed:

- paid market-data providers
- paid hosted queues, observability, or ETL services
- commercial provider free tiers that create paid lock-in
- broker APIs or live-trading flows
- DQE-triggered provider fetches as part of normal evaluation

Architectural rule:

DQE evaluates stored trust context. Market Data performs explicit bounded repair or provider work.

## 9. Performance And Runtime Constraints

Phase 0 tiering should avoid any design that makes DQE rescan deep price history per instrument on every evaluation.

Required constraints:

- DQE should consume persisted/read-model history diagnostics from Market Data whenever backtest/calibration tiers need deep-history truth
- keep DQE batch evaluation bounded; do not add provider calls or deep-history raw scans to DQE loops
- preserve Market Data repair bounds already established for MD-A2 through MD-A5
- long-running repair remains pollable/resumable/cancellable in Market Data, not reimplemented inside DQE
- use local DB plus free official/public source paths only

Practical implication: a backtest tier based on `listPricesByInstrumentId(..., 300)` is not architecturally acceptable for Phase 0.

Recommended additional guardrails:

- keep direct DQE evaluate batches within existing bounded request sizes
- avoid adding any DQE path that walks 15 years of raw `PriceTick` rows for every instrument in-process
- prefer Market Data read-model aggregation over DQE-side aggregation for deep-history truth
- keep source sample arrays and warning payloads capped

## 10. Validation Strategy

### Backend unit and service validation

Primary backend suites to extend:

- `backend/tests/modules/market-data-foundation/market-data.service.test.ts`
- `backend/tests/modules/market-data-foundation/market-data.universe.test.ts`
- `backend/tests/modules/market-data-foundation/market-data.repository.test.ts`
- `backend/tests/modules/market-data-foundation/market-data.routes.test.ts`
- `backend/tests/modules/market-data-foundation/market-data.validation.test.ts`
- `backend/tests/modules/data-quality-engine/data-quality-engine.service.test.ts`
- `backend/tests/modules/data-quality-engine/data-quality-engine.repository.test.ts`
- `backend/tests/modules/data-quality-engine/data-quality-engine.routes.test.ts`
- `backend/tests/modules/data-quality-engine/data-quality-engine.validation.test.ts`

Minimum validation themes:

- DQE tier states consume Market Data baseline and do not regress to stale-day-only logic
- backtest tier fails closed when MD-A5 history coverage is incomplete, fallback pending, listing date is conflicting, or calendar is uncertain
- daily review tier can still be `READY` or `LIMITED` where Trusted Review Universe allows context gaps
- DQE evaluation does not trigger new provider fetch paths
- additive DTO changes remain backward-compatible for current consumers

### Historical snapshot validation

Only if Slice 3 is authorized:

- extend `historical-context-snapshots` tests so persisted DQ snapshots come from DQE-owned tier outputs or baseline digests
- verify snapshot lookup treats missing tier history as a gap, not as implicit readiness

### UI validation

Primary UI suites to extend:

- `frontend/tests/ui/data-quality-engine.spec.ts`
- `frontend/tests/ui/market-data-foundation.spec.ts`
- `frontend/tests/ui/historical-context-snapshots.spec.ts` only if Slice 3 is taken

Minimum UI assertions:

- DQE shows separate use-case tiers with non-optimistic blocked states
- Market Data and DQE use consistent trust language for the same scope
- the UI never suggests that DQE can repair provider/history issues directly
- automation tier, if shown, is explicitly blocked by policy

### Manual/architect validation checkpoints

- compare one instrument with trusted latest EOD but incomplete deep history
- compare one instrument with missing listing date and 15-year target in effect
- compare one instrument in Trusted Review Universe but not backtest-ready
- confirm no new endpoint or batch action can start unbounded provider work from DQE

## 11. Implementation Slices

### Slice 1: Trusted baseline contract alignment

Goal: make Market Data expose the exact baseline DQE needs without changing DQE persistence semantics.

Expected scope:

- additive Market Data DTO/type alignment
- expose MD-A5 history/freshness reason codes through public read surfaces
- no downstream behavior change beyond clearer read contracts

File ownership:

- backend owner:
  - `backend/src/modules/market-data-foundation/*`
  - `backend/tests/modules/market-data-foundation/*`
- frontend compatibility only if required:
  - `frontend/src/features/market-data-foundation/types.ts`

### Slice 2: DQE tier computation without persistence redesign

Goal: compute and expose use-case tiers from current DQE + Market Data contracts.

Expected scope:

- DQE service/type/controller/repository read-path changes
- DQE frontend types and page updates
- no schema migration required

File ownership:

- backend owner:
  - `backend/src/modules/data-quality-engine/*`
  - `backend/tests/modules/data-quality-engine/*`
- frontend owner:
  - `frontend/src/features/data-quality-engine/*`

### Slice 3: Optional persisted tier ledger

Goal: add versioned, scope-aware persistence only if the Lead PO brief requires auditability or downstream historical consumption in Phase 0.

Expected scope:

- Prisma schema + migration
- new repository/model wiring
- optional historical snapshot integration

File ownership:

- schema/backend owner:
  - `backend/prisma/schema.prisma`
  - `backend/prisma/migrations/*`
  - `backend/src/modules/data-quality-engine/*`
  - `backend/src/modules/historical-context-snapshots/*`
  - matching backend tests only

### Slice 4: Downstream adoption

Goal: make downstream modules consume tier outputs instead of duplicating gates.

Expected scope:

- signal generation
- signal calibration
- strategy/backtest consumers
- Today Review only as read-only consumer where aligned with Market Data ownership

This slice should wait until the Lead PO brief confirms downstream order of adoption.

## 12. Conflict-Safe File Scopes

### Slice 1 safe scope

- `backend/src/modules/market-data-foundation/*`
- `backend/tests/modules/market-data-foundation/*`
- `frontend/src/features/market-data-foundation/types.ts`

Avoid in this slice:

- Prisma schema
- downstream modules
- frontend DQE behavior changes beyond additive type compatibility

### Slice 2 safe scope

- `backend/src/modules/data-quality-engine/*`
- `backend/tests/modules/data-quality-engine/*`
- `frontend/src/features/data-quality-engine/*`

Avoid in this slice:

- Market Data repair logic ownership changes
- provider integrations
- downstream strategy/signal modules

### Slice 3 safe scope

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/*`
- `backend/src/modules/data-quality-engine/*`
- `backend/src/modules/historical-context-snapshots/*`
- focused tests for those modules only

Avoid in this slice:

- identity-key migration across all stock/price references
- broad frontend consumer rewrites

### Slice 4 safe scope

- read-only consumer modules one at a time
- no cross-module gate rewrites in a single batch

Recommended order:

1. `signal-generation-engine`
2. `signal-calibration-engine`
3. `backtesting-strategy-lab`
4. `today-trade-review` only where it consumes DQE tier outputs rather than Market Data trust baseline

## 13. Migration Risks And Deferral Notes

High-risk items that should stay out of the first implementation slices:

- changing `Stock.symbol` uniqueness or `PriceTick` identity keys
- making DQE the source of truth for market-data repairability
- rewriting Historical Context Snapshots and DQE persistence in the same change set
- changing downstream gate semantics in signal generation, calibration, strategy proof, and Today Review all at once
- silently redefining current `eligibleForBacktesting` or `eligibleForCalibration` booleans without additive tier fields

Recommended deferrals:

- identity-key migration as a separate architecture decision
- durable tier history only after the Lead PO brief confirms it is required in Phase 0
- historical snapshot tier persistence only after DQE tier semantics stabilize

## 14. Reconciliation Questions For The Lead PO Brief

The brief needs to settle these before final architecture authorization:

1. Is Phase 0 expected to persist tier history, or is current-state API/UI enough?
2. Can `listingDate missing + 15-year complete` ever be `READY` for backtests, or must it stay `LIMITED` until listing-date repair?
3. Should signal generation remain globally blocked until scope-level signoff passes, even if some instruments are individually signal-ready?
4. Is automation tier required now as a visible placeholder, or should it wait for a later roadmap phase?
5. Which downstream consumer adopts the new tier contract first after DQE itself?

## 15. Recommendation

Proceed conservatively:

- authorize Slice 1 and Slice 2 planning as the default Phase 0 path
- defer Slice 3 until the Lead PO brief confirms audit/versioning needs
- treat automation readiness as blocked by policy in Phase 0
- keep identity migration, paid providers, broker workflows, and live-trading implementation out of scope

This gives the repo one coherent trust story: Market Data Foundation proves whether the data is trustworthy, and Data Quality Engine explains what that trusted data is good enough to do.
