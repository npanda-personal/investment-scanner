# MDF Revamp — Phase 0 Baseline (parity oracle)

Captured 2026-06-12 on branch `dev`, BEFORE any revamp edit. Every later phase diffs against this.

## Typecheck (`npx tsc --noEmit`)
- backend: **EXIT 0 (clean)**
- frontend: **EXIT 0 (clean)**

## Backend jest — `npx jest tests/modules/market-data-foundation`
- **Test Suites: 3 failed, 19 passed, 22 total**
- **Tests: 4 failed, 630 passed, 634 total**
- The 4 failures are **PRE-EXISTING** (not caused by refactor). They depend on live shared-DB universe/scheduler state vs fixtures. Parity bar = **no NEW failures; same 4 (or fewer) fail, ≥630 pass.**

### Pre-existing failing tests (the allowed baseline set)
1. `market-data.universe.test.ts` › *builds a canonical review readiness summary with one bounded repair*
2. `market-data.universe.test.ts` › *marks the review readiness summary ready when trusted and strict signoff are both healthy*
3. `market-data.scheduler.test.ts` › *defaults to daily startup catch-up while ignoring legacy Angel provider scheduler*
4. `market-data.service.test.ts` › *reuses one universe snapshot across review readiness summary computations*

## Endpoint captures (region IN), `/api/v1/...`
| file | endpoint |
|---|---|
| health.json | `/market-data/health?region=IN&assetType=STOCK` |
| movers.json | `/market-data/movers?region=IN&range=1D` |
| market-map.json | `/market-data/market-map?region=IN` |
| screener.json | `/market-data/screener?region=IN` |
| scan-52w-high.json | `/market-data/scans/52w-high?region=IN` |
| price-latest.json | `/prices/cmowuxiqk00hhw52gridxe629/latest` (20MICRONS) |
| price-series.json | `/prices/cmowuxiqk00hhw52gridxe629?limit=20` |

NOTE for diffing: normalize volatile fields (response `timestamp`/`asOf`/`generatedAt`) before comparing — DB content is otherwise deterministic on a static DB.

`universe/health` deliberately NOT used as an oracle: expensive live recompute, >30s, non-deterministic.

## Playwright (qa config) — `tests/ui/market-data-foundation.spec.ts`
- **6 failed, 2 passed** (8 total). Runtime ~4.9m. These are **PRE-EXISTING** UI failures on `dev` (not refactor-caused). Parity bar = no NEW failures vs this set.

### Pre-existing failing UI tests (allowed baseline set)
1. :81 *data health tab renders exchange source evidence and readiness counts*
2. :159 *data health tab remains usable when review readiness summary is unavailable*
3. :201 *import and backfill panel exposes usable catalog actions*
4. :209 *Market Data Ops owns historical backfill workers and source-file evidence*
5. :629 *configured catalog import sends safe source mode without running a real import*
6. :675 *catalog metadata backfill sends selected catalog source scope*

> ⚠️ Owner note: the market-data test baseline is already materially non-green (jest 4 fail, playwright 6 fail). Refactor parity = "introduce no NEW failures." tsc(both)=clean + endpoint-response diffs are the reliable oracles for Phases 1–3.

## Per-region row counts (DB snapshot — reference for ingestion parity)
- **stocks**: IN 3,435 · US 12,169 · EU 301 · (strays: CA 1, HK 2, UK 1)
- **price_ticks**: IN 5,515,356 · US 32,499,239 · EU 1,747,519
- **crypto** (isolated tables): crypto_assets 435 · crypto_price_ticks 326,722

Live single-symbol ingestion-run-per-region proof deferred to Phase 3/4 (where ingestion code actually changes); Phases 1–2 don't alter ingestion execution.

## FLAKY test set (shared-DB contention — NOT a parity signal)
The `market-data.service.test.ts` › `syncV1` **historical-backfill** tests (creates/marks-failed/releases-claimed-job/BSE-fill-only/official-NSE-all-index/official-NSE-EOD-fallback) fail nondeterministically under concurrent DB load but **pass in isolation** (`npx jest <that file>` → 170/171, only the pre-existing `reuses one universe snapshot` baseline failure). Treat these as flaky; verify parity by running the suite **in isolation**, not in a contended full run.

## Phase 1 result (types.ts split) — VERIFIED PARITY
- types.ts → 136-line barrel + 8 sibling files (all <500; largest universe.ts 431). tsc(backend)=0. Scope = types files only.
- Runtime provably unchanged (type-only relocation erases at compile). Isolated jest = baseline. ✅

## Phase 2 result (repository.ts split) — VERIFIED PARITY
- repository.ts 4,768 → **493-line composition facade** + 18 per-concern sub-repo/shared files (all <500; largest scans.ts 432). 94 public delegators = original public-method count. tsc(backend)=0.
- Sub-repos: source-imports, catalog, catalog-queries, price (+ static `historicalBulkWriteChain` write pipeline), price-reads, price-readiness, corporate-actions, fundamentals, fx, scans/scans-screener/scans-movers, repair-state, repair-queries, provider-cleanup + shared `repository.query-scope.ts` (pure where-builders) + `repository.helpers.ts` + `repository.constants.ts`.
- Parity evidence: (1) AST diff — all 145 relocated member bodies byte-identical; all 94 public signatures byte-identical. (2) tsc=0. (3) `market-data.repository.test.ts` **65/65** (executes real DB queries). (4) `market-data.service.test.ts` isolated **170/171** (only the baseline `reuses one universe snapshot` failure — no new). ✅
- Facade shrink to <500: dropped redundant explicit return-type annotations on delegators (TS infers identical type from the delegate target → public contract unchanged) + single-lined multi-line param objects. tsc re-verified 0.
- HTTP endpoint diff (run at Phase 3 checkpoint on default BE :3000 booting new code): see Phase 3 below.

## Phase 3 result (RegionIngestionAdapter + registry) — VERIFIED PARITY [CHECKPOINT]
- New files (all <80 lines): `region-ingestion-adapter.ts` (interface+DTOs), `region-ingestion-registry.ts` (`resolveRegionAdapter`), `us-eu-ingestion.adapter.ts` (`FreeProviderIngestionAdapter`, US+EU share it), `crypto-ingestion.adapter.ts`, `india-ingestion.adapter.ts` (placeholder pending Phase 4), `jp-ingestion.adapter.ts` (5th-region sketch — compiled, not registered).
- ONE surgical core change: `syncScheduledRegion` US/EU branch now dispatches via `resolveRegionAdapter(region, assetType)` (with defensive fallback to the prior direct `usEquityIngestionService` call → byte-identical).
- Parity: tsc(backend)=0. `scheduler.test.ts` 9/10 (only baseline "Angel provider scheduler" failure). `service.test.ts` isolated 170/171 (only baseline "reuses one universe snapshot"). No new failures. ✅
## Phase 4 result (India NSE/BSE ingestion extraction) — VERIFIED PARITY
- service.ts **15,945 → 11,873 lines** (−4,072 across Phases 3+4). India ingestion logic extracted into 12 cohesive India files (all <500): historical-backfill runner (4a: `india-historical-backfill{,.jobs,.orchestration}.ts` + `india-ingestion-host.ts`), daily importers (4b: `india-exchange-ingestion{,.cm-udiff,.cm-official,.index}.ts`), holiday cache/corp-actions/official-EOD (4c: `india-trading-calendar.ts`, `india-corporate-actions.ts`, `india-official-eod.ts`).
- Pattern: host-interface injection — India classes own India-only logic+state, reach shared collaborators (storeHistoricalBulk, CSV/download utils, importCatalog, invalidateSignalOutcomes) via `this.host.X`; service keeps byte-identical public delegators. Static backfill registries kept static on the runner. Constructor `registerNseHolidayProvider` hook preserved (calendar instance field init-before-constructor).
- Parity: tsc(backend)=0. Isolation jest all green vs baseline: service.test 170/1 (baseline only), exchange-eod 7/0, bhavcopy+index 66/0, corp-actions(×3) 155/0, market-session 25/0, signal-staleness 20/0. Full contended run = same 10 as baseline (4 baseline + 6 flaky-in-contention historical-backfill that PASS in isolation). Bodies moved byte-identical (only this.X→this.host.X). ✅
- DEFERRED to final gate (blocked by max_connections=20 saturation from parallel agents): live single-symbol India ingestion run + temp-BE endpoint diff. adapter.syncDaily wiring + syncScheduledRegion IN-branch uniformity deferred to Phase 5 (orchestrator).

## Phase 3 endpoint diff detail
- HTTP endpoint diff vs Phase-0 baseline (default BE :3000 rebooted on new code after owner restarted Docker): **price-latest + price-series BYTE-IDENTICAL**; movers/market-map/screener/scan-52w-high DIFFER **due to shared-DB data drift, NOT the refactor** — proof: (a) 4,366 `signal_results` recomputed in last 24h, latest `2026-06-12 22:07` (~1min pre-boot) and the screener/movers/scans read those; (b) byte-identical query bodies (AST proof) cannot change results for identical data; (c) fixed-instrument reads identical; (d) all aggregate endpoints are deterministic/STABLE on the new code (double-hit check). Baseline doc had already flagged "deterministic on a static DB" — DB was not static (parallel agents). Fresh post-Phase-3 reference snapshots saved under `.mdf-baseline/post-phase3/`.
