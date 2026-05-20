# CF-W1-MD-04 - Market Data Per-Instrument Freshness and Sync Provenance Requirement

Date: 2026-05-19

## Status

Audit-derived requirement draft. Not Ready for Implementation.

## Product Value

Market Data is the first trust gate for investor/trader workflows. A region-level sync or catalog-level timestamp is not enough if one instrument is still stale. Traders and research users need per-instrument freshness, sync basis, and data-through evidence so Market Data does not look current just because the broader scope recently refreshed.

This is a correctness requirement, not a convenience label. It protects every downstream review surface that depends on current market data being explicit instead of inferred.

## Evidence

- `backend/src/modules/market-data-foundation/market-data-foundation.md` already distinguishes `latestCompletedTradingDate`, `latestStoredTradingDate`, `latestStoredCandleIsCurrent`, and `no-new-data` skip reasons, which proves the module has the right freshness primitives but does not yet force them to read as per-instrument trust evidence everywhere they matter.
- The same module documents that scheduled and manual catalog sync select instruments whose own latest stored daily candle is missing or older than the latest completed trading date before using region-level no-new-data skips.
- The same module also says catalog-row update time remains secondary tooltip/detail evidence, which means a row can still look more current than the instrument actually is unless the per-instrument basis is surfaced clearly.
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-00-orchestrator-integration-outbox.md` records the recent user-reported defect where Sync Catalog could report the latest completed candle as current for the region while individual instruments were still stale.
- `backend/src/modules/data-quality-engine/data-quality-engine.md` already treats latest-price staleness as a downstream gate, so the source-side freshness contract should remain explicit enough for DQE and review workflows to trust without duplicating freshness logic.
- `06-contracts/market-data-dq-readiness-contract.md` and `CF-W1-MD-02` already require source provenance, freshness, and validation evidence, but neither states that per-instrument freshness must remain visible when the region itself is current.

## Bounded Requirement

Define a bounded Market Data freshness-provenance contract that makes instrument-level currentness visible without changing the existing sync algorithm or introducing provider-heavy work.

The first child slice should focus on:

- per-instrument latest completed trading date, latest stored trading date, and current/stale/missing basis;
- clear no-new-data, no-op storage, stale, missing, and catch-up reasons at the instrument level;
- explicit distinction between region-level sync state and instrument-level freshness state;
- keeping catalog-row update time as secondary evidence only;
- additive backend-first evidence that downstream DQE, Today Review, and Research Hub can consume without recomputing freshness;
- no scheduler rewrite, no provider expansion, no schema migration, and no route or shared UI changes in the first child.

## Acceptance Criteria

- Users can tell whether an instrument is current because its own latest completed daily candle is current, not just because the region-level sync ran recently.
- A region-level current result cannot mask a stale instrument in the same scope.
- The response or review surface exposes the latest stored trading date, latest completed trading date, lag or age basis, and a stable reason string for current, stale, missing, skipped, or catch-up states.
- Catalog-row update timestamps remain visible only as secondary evidence and never masquerade as data-through.
- Existing region/asset scope, batch behavior, and current sync semantics remain backward-compatible.
- Focused tests cover current, stale, missing, no-op, region-current/instrument-stale mismatch, and no-new-data skip cases.

## Non-Goals

- No Prisma schema or migration work.
- No provider/live-data, startup/backfill, or scheduler behavior expansion.
- No route registry, shared utility, or shared UI rewrite in the first child.
- No duplicate currentness scoring logic in downstream modules.
- No replacement of the existing Market Data validation or Data Quality ownership model.

## Likely Owner Team

- Team 03 for the first bounded contract split and exact file-reservation plan.
- Team 04 for QA scenarios around instrument-level freshness, region-vs-instrument mismatch, and no-new-data skips.
- Team 05 later for implementation only after exact reservations are approved.

## Next Gate

Architecture contract and QA plan for a bounded Market Data freshness/provenance slice, with later implementation reserved to Market Data Foundation only after Team 00 approves the exact child packet and file reservations.
