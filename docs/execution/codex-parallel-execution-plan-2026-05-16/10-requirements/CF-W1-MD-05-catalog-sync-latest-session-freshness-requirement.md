# CF-W1-MD-05 - Catalog Sync Latest Session Freshness Requirement

Date: 2026-05-24
Owner: Team 02 Product Owner / Requirement Factory
Status: New requirement draft
Lane: Lane 1 - Market Data / Data Quality
Priority intent: Upstream direct-value freshness truth before new Today Review trust slices

## User Problem

The Product Owner reported that many stocks still show stale latest-session dates while catalog sync reported:

- latest completed candle: `2026-05-18`
- latest stored candle: `2026-05-18`
- processed: `2672`
- skipped: `2672`

Current date is `2026-05-24`.

That outcome is not trustworthy enough for investor/trader review because the product can read as "no new data" or "all skipped" even when many instrument rows still present stale per-instrument data-through dates. The product must not imply catalog freshness is complete when the accepted latest completed market session is newer than stored candles or when instrument-level skips hide the reason no update happened.

## Requirement Statement

Bound one additive market-data freshness requirement for catalog sync and catalog review surfaces:

1. the product must not say "no new data" when the accepted latest completed market session for the selected scope is newer than the latest stored candles used by the sync decision, and
2. the product must expose why catalog-sync rows or instruments were skipped in language that distinguishes:
   - region/session-level skip,
   - instrument-level stale catch-up still pending,
   - provider fetch skipped before fetch,
   - no-op because latest candle already present,
   - unsupported or failed instrument work.

This requirement is about truthful freshness evidence and skip explainability. It is not a provider expansion, schema change, or backfill approval.

## Why Now

This is upstream direct investor/trader value. If market-data freshness is ambiguous, downstream Today Review, trusted-candidate health, DQ interpretation, and backtesting trust all inherit a false sense of currentness.

## In Scope

- Existing catalog sync run start/status surfaces under Market Data Foundation
- Existing catalog instrument list freshness display
- Additive response/DTO truthfulness fields on existing module-owned endpoints only if they can be served through current routes
- UX wording that distinguishes session freshness from instrument freshness
- Skip-reason summaries and counts that make "skipped" auditable

## Out Of Scope / Non-Goals

- No live provider approval
- No startup/backfill approval
- No schema or Prisma migration work
- No route registry edits
- No shared utility changes
- No package or generated-file changes
- No broad Data Quality policy rewrite
- No durable evidence storage ADR work from `CF-W1-MD-02A`
- No new Today Review, alert, or notification workflow
- No promise that weekends/holidays create new candles

## Source Inspection Evidence Required

Implementation planning must preserve and explicitly account for these current source facts:

1. `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
   - `evaluateSyncFreshnessGate(...)` already compares region-level latest stored trading date to latest completed trading date and can reopen catch-up when latest completed candle is missing.
   - `enableCatalogStaleCatchUpIfNeeded(...)` already detects a state where region freshness looks current but stale instruments still need the target trading date.
   - `buildSkippedRegionSummary(...)` and `buildSkippedSyncSummary(...)` collapse skipped outcomes into broad reason counts and `noNewData=true`.
   - `toCatalogSyncRunResponse(...)` returns coarse run counters and messages but no explicit latest-completed/latest-stored freshness basis fields.
2. `backend/src/modules/market-data-foundation/market-data-foundation.repository.ts`
   - `latestStoredTradingDateForRegion(...)` resolves one region-level max stored trading date.
   - `listStaleActiveStockSyncTasks(...)` and `countStaleActiveStockSyncTasks(...)` define stale instruments as rows whose `latestStoredTimestamp` is null or older than the target trading date.
3. `frontend/src/features/market-data-foundation/components/MarketDataFoundationPage.tsx`
   - current catalog-sync UI shows processed/succeeded/failed/skipped/no-op counters and message text, but not an explicit freshness basis or skip taxonomy.
   - current stock-list "Data Through" display derives from per-instrument stored data-through / latest-price dates and can therefore contradict a coarse region-level "no new data" outcome.
4. `frontend/src/features/market-data-foundation/components/InstrumentDetailPage.tsx`
   - current overview shows metadata updated time and latest price date, which are not sufficient by themselves to explain catalog-sync skip outcomes.

## Acceptance Criteria

1. Catalog sync status must expose the freshness basis for the selected scope using explicit additive fields or equivalent UI-bound data:
   - accepted latest completed trading date/session
   - latest stored trading date/session used for the gate
   - whether the run decision is region-fresh, instrument-stale-catch-up, or fully final-confirmed
2. If the latest completed session is newer than the latest stored session, the product must not present a terminal "no new data" message for that scope.
3. If region freshness is current but stale instruments still exist, the run status must clearly say that catalog freshness is current at region level while `N` instruments still need the latest completed candle.
4. "Skipped" must be split into at least one auditable reason view so a user can tell whether skips came from:
   - pre-fetch freshness gate
   - instrument already current / no-op
   - unsupported provider case
   - failure path
   - stale catch-up exclusion or cooldown
5. Catalog sync UI must show skip reasons/counts without requiring console inspection.
6. Stock-list freshness UI must not visually imply that all rows are current solely because a region-level run reported skipped/no new data.
7. Any wording must stay research-support oriented and must not imply market advice.
8. The solution must remain local-first, free, bounded, and provider-safe.

## Data Quality Implications

- This requirement does not replace `CF-W1-DQ-02` residual work.
- It does provide a cleaner upstream freshness truth source that DQ, Today Review, and other downstream modules can rely on.
- Until DQ residual work is completed, the product should still treat stale instrument data-through dates as readiness-relevant evidence, not as a cosmetic UI issue.
- Any implementation must avoid duplicating DQ scoring logic. It should expose freshness evidence, not invent a second readiness system.

## Likely Architecture Path

Preferred path: refactor in place, additive only, no schema.

1. Market Data Foundation backend:
   - extend existing catalog sync run/status DTOs and summary mapping with explicit freshness-basis fields and skip-reason breakdowns derived from current service/repository logic
   - preserve existing routes and batch behavior
2. Market Data Foundation frontend:
   - update the catalog sync status panel to show freshness basis and skip taxonomy
   - update catalog stock-list freshness copy/tooltip treatment so per-row stale data-through dates do not contradict a coarse "no new data" state
3. QA:
   - prove one stale-catch-up scenario, one fully current final-confirmed scenario, and one pre-fetch skipped scenario

## Suggested UX Truth Model

- Session status: what is the accepted latest completed session for this scope?
- Stored status: what is the latest stored session currently present?
- Catch-up status: are stale instruments still pending even if region freshness looks current?
- Skip reasons: why were instruments or rows skipped?

Do not collapse those four questions into a single "no new data" line.

## Dependencies

- Existing Market Data Foundation sync-state and stale-task logic
- Team 03 architecture prep for additive contract shaping
- Team 04/implementation reservation on Market Data Foundation module-owned files only
- QA plan with stale-versus-current proof cases

## Blockers / Decisions Needed

- Product Owner decision: this requirement should be placed ahead of new Today Review trust slices because it is upstream freshness truth.
- Architect decision: confirm additive DTO fields can be exposed through existing module endpoints without route-registry edits.
- UX decision: confirm exact user-facing labels for session freshness versus instrument freshness.

## Recommended Priority Placement

Recommend inserting `CF-W1-MD-05` ahead of:

1. `CF-W1-TSC-02`
2. `CF-W1-TSC-03`
3. `CF-W1-DQ-02` residual parent

Recommend placing it alongside, and ahead of execution over, `CF-W1-MD-02A` because:

- `MD-05` is a no-schema direct trust fix available now
- `MD-02A` remains consent-gated durable evidence storage

Recommended stack:

1. `CF-W1-MD-05`
2. `CF-W1-TSC-02`
3. `CF-W1-TSC-03`
4. `CF-W1-DQ-02` residual parent
5. `CF-W1-MD-02A` consent-gated proposal

## Handoff Target

Next gate: Team 03 architecture contract / additive DTO and UX truth-surface refinement, then QA plan.
