# CF-W1-MD-04 Architecture Review

Date: 2026-05-19

Owner: Team 03 Architecture Factory

## Status

Ready candidate.

`CF-W1-MD-04` has an honest bounded first child on current `dev`. The child can stay inside `market-data-foundation` service/types/doc/test scope as additive source-evidence surfacing only. It must stay explicit about one boundary: this slice exposes Market Data freshness and sync provenance evidence, but it does not replace Data Quality Engine readiness ownership and it does not wire downstream consumers in the same pass.

## Evidence Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/16-team-inboxes/TEAM-03-CF-W1-MD-04-architecture-assignment.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-MD-04-market-data-per-instrument-freshness-sync-provenance-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/next-top-10-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/audit-market-data-data-quality.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/market-data-dq-readiness-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-MD-02A-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-00-orchestrator-integration-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-02-requirement-factory.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/00-control/team-agent-runtime-queue.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/12-ready-queue/ready-for-implementation.md`
- `backend/src/modules/market-data-foundation/market-data-foundation.md`
- `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.types.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.repository.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.router.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.controller.ts`
- `backend/src/modules/market-data-foundation/index.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.md`
- `backend/tests/modules/market-data-foundation/market-data.service.test.ts`
- `backend/tests/modules/market-data-foundation/market-data.repository.test.ts`
- `backend/tests/modules/market-data-foundation/market-data.universe.test.ts`

## Queue And Parallelism Check

- `CF-W1-MD-04` is not in Ready. Team 00 routed it to Team 03 for architecture prep and Team 04 for follow-on QA planning only.
- The live runtime queue shows active implementation on `CF-W1-SIG-02`, not on Market Data Foundation source.
- The recent stale-catalog defect was already fixed on `dev` under local commit `593ebc3`; this packet must not reopen that implementation or re-reserve the old defect scope silently.
- No current active writer is reserved on `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`, `market-data-foundation.types.ts`, `market-data-foundation.md`, or `backend/tests/modules/market-data-foundation/market-data.service.test.ts` in the shared `dev` workspace.

Conclusion: the proposed first-child reservation is parallel-safe against the currently active non-Market-Data writers, but it will conflict with any future Market Data packet that reuses the same service/types/doc/test files.

## Current Source Findings

- Team 00 already fixed the core stale-selection bug: catalog sync now counts and selects stale active instruments by each instrument's own latest stored daily candle, and region-level recent-sync gates no longer hide stale instruments.
- `V1Instrument` already exposes source-side dates and trust fields that are close to the new requirement:
  - `latest_price_date`
  - `expected_latest_trading_date`
  - `latest_completed_eod_date`
  - `stored_data_through_date`
  - `trusted_baseline_residual_state`
  - `trusted_baseline_blocker_codes`
- `SyncSummary` and `V1SyncResult` already expose source-side sync outcome primitives:
  - `noNewData`
  - `rowsNoOp`
  - `skippedReasonCounts`
  - `skippedReasons`
  - `lastCheckedAt`
  - `nextEligibleSyncAt`
- `CatalogSyncRunStatusResponse` currently exposes run totals, counts, warnings, and a free-form `message`, but it does not expose one stable freshness DTO that distinguishes:
  - region currentness;
  - remaining stale instrument count;
  - region-current/instrument-stale mismatch as a machine-safe reason code.
- `scheduler/status` already exposes region-level candle freshness fields, but it is region-scoped only and does not provide per-instrument provenance.
- `evaluateSyncFreshnessGate()` already distinguishes recent-sync skip, market-session skip, final-candle-confirmed skip, and completed-EOD catch-up eligibility.
- Data Quality Engine already owns downstream readiness, stale-price blocking, and eligibility filtering. This packet must not recreate `READY`, `LIMITED`, or `BLOCKED` scoring inside Market Data Foundation.

## No-Schema First Child Determination

Yes, with one narrow rule:

- the child must stay additive and response-local inside existing Market Data responses;
- it may derive stable freshness and sync-provenance metadata from existing Market Data evidence;
- it must not widen into repository/schema/provider/scheduler/frontend/downstream-adoption work;
- it must not claim DQE-style readiness outcomes.

This means the first child can stay entirely inside:

- `market-data-foundation.service.ts`
- `market-data-foundation.types.ts`
- `market-data-foundation.md`
- `market-data.service.test.ts`

No Prisma/schema, route-registry, provider, scheduler, generated, package, shared utility, or frontend changes are required for that bounded child.

## Architecture Decision

Keep the first child entirely inside `market-data-foundation` service/types/doc/service-test scope and add additive source-evidence metadata only.

Preferred additive shape:

```ts
type MarketDataInstrumentFreshnessStatus =
  | 'CURRENT'
  | 'STALE'
  | 'MISSING'
  | 'UNKNOWN';

type MarketDataInstrumentFreshnessReasonCode =
  | 'LATEST_COMPLETED_PRESENT'
  | 'LATEST_COMPLETED_MISSED'
  | 'NO_STORED_CANDLES'
  | 'MARKET_SESSION_UNKNOWN'
  | 'REGION_CURRENT_INSTRUMENT_STALE'
  | 'PROVIDER_STATE_BLOCKED';

interface MarketDataInstrumentFreshnessEvidence {
  status: MarketDataInstrumentFreshnessStatus;
  reasonCode: MarketDataInstrumentFreshnessReasonCode;
  latestCompletedTradingDate: string | null;
  latestStoredTradingDate: string | null;
  lagDays: number | null;
  regionLatestStoredTradingDate?: string | null;
  regionCurrentButInstrumentStale?: boolean;
  basis: 'PRICE_TICK_MAX_TIMESTAMP';
}

type MarketDataSyncOutcomeCode =
  | 'NO_NEW_DATA_SKIP'
  | 'NO_OP_STORAGE'
  | 'ROWS_STORED'
  | 'CATCH_UP_ELIGIBLE'
  | 'CATCH_UP_STORED';

interface MarketDataSyncProvenance {
  outcomeCode: MarketDataSyncOutcomeCode;
  skipReasonCode?: MarketDataSyncSkipReason | null;
  latestCompletedTradingDate: string | null;
  latestStoredTradingDate: string | null;
  lastCheckedAt?: string | null;
  nextEligibleSyncAt?: string | null;
}

interface CatalogSyncFreshnessSummary {
  regionStatus: 'CURRENT' | 'STALE' | 'UNKNOWN';
  reasonCode:
    | 'REGION_CURRENT_ALL_INSTRUMENTS_CURRENT'
    | 'REGION_CURRENT_INSTRUMENT_STALE'
    | 'REGION_STALE'
    | 'MARKET_SESSION_UNKNOWN';
  latestCompletedTradingDate: string | null;
  regionLatestStoredTradingDate: string | null;
  staleInstrumentCount: number;
}
```

Exact names may differ, but the separation of concerns must remain stable:

- instrument freshness evidence;
- last sync outcome provenance;
- catalog-level region-vs-instrument mismatch summary.

## Required Mapping Rules

### Instrument freshness

- `CURRENT`
  - `latestStoredTradingDate >= latestCompletedTradingDate`
  - reason code `LATEST_COMPLETED_PRESENT`
- `STALE`
  - stored date exists but lags the latest completed trading date
  - reason code `LATEST_COMPLETED_MISSED`
- `MISSING`
  - no stored trading date exists for the instrument
  - reason code `NO_STORED_CANDLES`
- `UNKNOWN`
  - latest completed trading date cannot be derived for the scope
  - reason code `MARKET_SESSION_UNKNOWN`
- `regionCurrentButInstrumentStale=true` only when:
  - the scoped region latest stored trading date is current for the latest completed trading date; and
  - the instrument remains stale or missing
  - reason code must resolve to `REGION_CURRENT_INSTRUMENT_STALE`

### Sync provenance

- `NO_NEW_DATA_SKIP`
  - `noNewData=true`
  - `skippedReasons[]` present
- `NO_OP_STORAGE`
  - provider fetch happened
  - `rowsInserted = 0`
  - `rowsUpdated = 0`
  - `rowsNoOp > 0`
- `ROWS_STORED`
  - provider fetch happened
  - inserted or updated rows exist
- `CATCH_UP_ELIGIBLE`
  - freshness gate allowed fetch because latest completed EOD was missing before provider call
  - may be response-local on current request
- `CATCH_UP_STORED`
  - inserted or updated rows exist after a catch-up-eligible path

### Region-vs-instrument mismatch

- Catalog sync run/status responses must stop using free-form warnings alone as the only mismatch signal.
- When region freshness is current but stale instruments remain, the run response must expose:
  - `reasonCode = REGION_CURRENT_INSTRUMENT_STALE`
  - current region data-through date
  - latest completed trading date
  - stale instrument count

## Exact Future File Reservations

One-writer implementation set:

- `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.types.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.md`
- `backend/tests/modules/market-data-foundation/market-data.service.test.ts`

## Explicitly Forbidden Files

- `backend/src/modules/market-data-foundation/market-data-foundation.repository.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.controller.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.router.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.validation.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.provider.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.scheduler.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.worker.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.queue.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.market-session.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.universe.ts`
- `backend/src/modules/market-data-foundation/index.ts`
- `backend/tests/modules/market-data-foundation/market-data.repository.test.ts`
- `backend/tests/modules/market-data-foundation/market-data.universe.test.ts`
- `backend/tests/modules/market-data-foundation/market-data.scheduler.test.ts`
- `backend/tests/modules/market-data-foundation/market-data.market-session.test.ts`
- Prisma schema and migrations
- generated files
- backend and frontend route registries
- all frontend `market-data-foundation` files
- shared backend utilities
- shared frontend components
- package manifests
- `backend/src/modules/data-quality-engine/**`
- `backend/src/modules/research-hub/**`
- `backend/src/modules/today-trade-review/**`
- provider/live-provider, startup/backfill redesign, paid/cloud, broker, telemetry, or credential scope

If implementation discovers it needs repository changes to batch-load persisted instrument sync-state rows for list responses, stop and return to Team 00. That is a different child from this bounded first pass.

## Later Consumer Boundary

This first child only prepares Market Data-owned evidence. Later consumers may use that evidence only after this slice is accepted:

- `data-quality-engine` currentness/readiness follow-on work
- Today Review consumer packets
- Research Hub actionability/evidence packets

Those later consumers must consume the new Market Data public evidence. They must not duplicate freshness logic and they must not be widened into this first child.

## QA Planning Handoff Notes

Team 04 should validate:

- instrument DTOs distinguish `CURRENT`, `STALE`, `MISSING`, and `UNKNOWN` using stable reason codes;
- `lagDays` and `latestCompletedTradingDate` / `latestStoredTradingDate` are exposed together;
- region-current/instrument-stale mismatch is explicit and machine-safe rather than only a warning string;
- sync responses distinguish no-new-data skip, no-op storage, normal stored rows, and catch-up paths;
- catalog sync run/status responses expose stable freshness summary fields when stale instruments remain;
- DQE ownership remains unchanged: no `READY`, `LIMITED`, `BLOCKED`, or downstream eligibility scoring is introduced by this packet;
- route behavior, query params, repository behavior, provider calls, scheduler behavior, and frontend scope remain unchanged.

## Ready Recommendation

`Ready candidate`

Reason:

- the defect-driving source gap is now narrower than the original stale-catalog bug and can be solved as additive evidence surfacing;
- exact module-local writer set exists;
- no schema, repository, route, provider, scheduler, shared, generated, package, or frontend writer is required for the first child;
- the child is honest if it stays source-evidence-only and keeps DQE ownership out of scope.
