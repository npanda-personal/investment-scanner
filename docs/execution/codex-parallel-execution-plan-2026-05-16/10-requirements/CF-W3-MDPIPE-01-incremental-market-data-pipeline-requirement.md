# CF-W3-MDPIPE-01 - Incremental Market Data And Intelligence Pipeline

Date: 2026-05-25

Owner: Team 00 / Team 03 / Team 05

Status: Requirement accepted for phased execution. First implementation slice is Market Data Foundation only.

## Product Problem

The app still treats broad market-data freshness as a manual, per-symbol provider workflow. For `IN/STOCK`, Angel One historical calls are throttled and symbol-centered, so a latest-candle universe catch-up can take tens of minutes and still leave users seeing stale "Data Through" dates. Downstream screens then depend on manual refreshes and on-demand recomputation instead of a predictable backend freshness pipeline.

The Product Owner wants the backend to become the primary source of freshness. Manual buttons should remain ad hoc requests, but routine data load and dependent market-intelligence refresh should run incrementally without manual intervention.

## User Value

As an investor/trader using the app locally, I need daily market data, data-quality status, signals, context, calibration, backtests, and Today Review to refresh automatically and incrementally so I can open the app and see current trusted candidates without waiting on full-universe manual operations.

## Product Rules

- Localhost-only, zero incremental cost.
- No paid providers, cloud queues, broker execution, or external telemetry.
- For `IN/STOCK` latest EOD, official exchange daily bulk files should be the primary broad-universe source where supported.
- Angel One should not be the broad-universe primary loader. It may remain validation, token/deep-gap fallback, or manual repair support.
- Loads must be incremental by trading date and changed/stale instrument set.
- Do not run complete historical reloads as the routine 15-minute workflow.
- Data Quality must run after Market Data before trusted downstream outputs.
- Trusted signals, strategies, backtests, Today Review, and trusted candidate summaries must fail closed when DQ is missing or blocked.
- No arbitrary target prices, R:R, synthetic targets, direct buy/sell advice, or Trade Plan-first workflow language.

## Pipeline Target

Every 15 minutes, a backend scheduler should:

1. Determine latest completed trading date by region/scope.
2. Check whether the source file or instrument freshness changed.
3. Load only missing or changed latest EOD data.
4. Trigger dependent stages only when their inputs changed or are stale.
5. Record stage status and warnings.
6. Let UI screens read persisted/latest evidence instead of causing large recomputations.

## Target Stage Order

1. Market Data incremental EOD load.
2. Data Quality evaluation.
3. Raw signal generation.
4. Signal calibration.
5. Historical/context snapshots.
6. Sector rotation and market context.
7. Signal quality.
8. Smart money.
9. Strategy decisions.
10. Backtest proof refresh, bounded and incremental.
11. Trade Plan compatibility only if reframed into Trusted Signal Candidate health with no targets/R:R.
12. Research Command Center.
13. Today Review.

## First Slice

`CF-W3-MDPIPE-01A-MDF-OFFICIAL-EOD`

Market Data Foundation should use one official NSE EOD bulk file for latest completed `IN/STOCK` catch-up where supported, parse the universe once, match rows to active stale instruments, and store idempotent daily candles. The old per-symbol provider loop remains fallback when the official bulk source is unavailable or does not cover the instrument.

## Acceptance Criteria - First Slice

- Scheduled `IN/STOCK` latest-candle sync attempts the official NSE EOD bulk path before per-symbol provider calls.
- Catalog sync catch-up can process stale latest-candle instruments from one official EOD file instead of one provider call per symbol.
- The first slice is incremental to the latest completed trading date and does not start full historical reloads.
- Official source name, URL, fingerprint, row counts, matched count, and fallback reason are recorded in sync summary evidence.
- Stale instruments with matching official rows are stored under their canonical local symbols.
- Existing idempotent `PriceTick` behavior is preserved: inserted, updated, and no-op counts remain visible.
- Angel One remains fallback only for uncovered/deep-gap cases in this slice.
- No downstream stage is wired until separate architecture and QA gates are prepared.

## Non-Goals - First Slice

- No Prisma schema or migration.
- No route registry change.
- No shared backend utility.
- No new package dependency.
- No frontend implementation.
- No provider credential change.
- No full durable pipeline ledger.
- No broad downstream orchestration.
- No startup behavior expansion beyond existing scheduler path.

## Later Slices

- `CF-W3-MDPIPE-01B1`: durable `PipelineRun` and `PipelineStageRun` ledger with DB-backed leases, progress persistence, and cache/fingerprint metadata.
- `CF-W3-MDPIPE-01B2`: read-only pipeline status API.
- `CF-W3-MDPIPE-01B3`: per-screen last-run and active-progress UI display that survives navigation.
- `CF-W3-MDPIPE-01C`: Data Quality post-market-data stage.
- Raw signals, calibration, historical context, market context, smart money, and strategy stage wiring.
- Today Review and Research Command Center persisted freshness projections.
- Screen-by-screen performance passes.

## Open Decisions

No Product Owner decision is open for the first bounded Market Data Foundation slice because the Product Owner explicitly approved redesigning and implementing the incremental automated data-load direction. Future Prisma/schema, route registry, shared utility, broad UI, package, or provider-heavy startup expansion still requires a separate packet.
