# Product-Owner Sign-Off — Daily-Pipeline Stability Initiative

**Date:** 2026-06-06
**Reviewer:** Product Owner (NSE/BSE domain)
**Scope:** Acceptance review of the 10 owner requirements against AUDIT-1..4 + FIX-PLAN, the 7 fix commits (P-1..P-4), the current Postgres state, and code behavior. Servers are DOWN — validated against code/design + DB, not a live browser.
**Universe baseline:** 2,937 active CASH STOCK instruments (confirmed in DB).

---

## VERDICT: CHANGES_REQUESTED

The engineering work is **genuinely strong and the design now satisfies the owner's intent**. Every requirement is addressed *in code*, the durable one-time cleanups (smart-money dedup, stale-lease reap, unique-index migration) are already applied to the live DB, and `tsc` is clean. I am **not** blocking on architecture or correctness of the fixes.

I am withholding final APPROVE for two reasons, both about *closing the loop*, not broken code:

1. **The data is not yet repopulated.** Coverage on the latest date is still at the pre-fix numbers (signal_results 2,044 / 2,937 = 70%; the new per-stock snapshot tables hold only seed rows: workbench_snapshots = 3, portfolio_intelligence_snapshots = 1, research_overview_snapshots = 1). A trader opening the app today would still see thin/partial data. The fixes will only manifest after **one clean daily scheduled run on a live server** (plus a manual full-universe backfill for the historical gaps). Until that run is observed green, completeness is asserted by design, not proven.
2. **The test updates for these fixes are uncommitted.** 9 modified test files sit in the working tree (test-only; zero production source uncommitted). The green-test claims in the commit messages therefore aren't reproducible from a clean checkout. Commit them.

This is the normal, fair gate for a "code-complete, pending live repopulation" state. Approve-on-evidence once items #1/#2 in Findings are closed.

---

## Per-Requirement Acceptance Table

| # | Requirement | Verdict | Basis |
|---|---|---|---|
| 1 | Audit complete pipeline ops | **MET** | AUDIT-1..4 cover all 17 stages, both schedulers, ledger health, DB completeness. Thorough and accurate vs. DB. |
| 2 | Pipeline loads ALL data properly | **PARTIAL** | Code now persists full universe (DQ napi crash fixed; persist-always wired). But DB coverage on latest date is unchanged (70–79%); needs a live run to prove. |
| 3 | Check/fix pipelines that fail with error | **MET (code)** | Root causes fixed: DQ napi BigInt-volume crash (float8 cast + ≤50 chunk), connection-pool exhaustion (concurrency throttled to 4), stale-RUNNING leaks (reaper; 0 stale rows now). |
| 4 | Incremental load PERSISTS every load | **MET (code)** | SIGNAL_QUALITY now passes `persistOutcomes:true`; per-stock stages upsert every run; idempotency keys prevent dup terminal exec. Verified in code + P4 audit. |
| 5 | EVERY pipeline persists data | **MET (code)** | Ledger-coverage gaps closed: MARKET_PULSE_REFRESH, STOCK_INTEREST_REFRESH, WORKBENCH_REFRESH, MARKET_SCAN_REFRESH now ledger-tracked scheduled stages. Position-ledger PATH B added. |
| 6 | Screens load persisted data only, no calc at render | **PARTIAL** | The GET-triggers-generation violations are removed (market-context `summary()` no longer calls `run()`); workbench/scans/research-overview/instrument-RS now read snapshots. Residual: portfolio-intelligence is lazy-materialize (first GET after a change still computes once). |
| 7 | Slow screens fixed | **MET (code)** | All 10 AUDIT-3 offenders have a persisted snapshot path (workbench, peers, movers/market-map, 52w/delivery/volume scans, screener, signals strategy-match, research overview, instrument RS). |
| 8 | Daily = INCREMENTAL not full-universe | **MET** | MarketDataFoundationScheduler hands `changedInstrumentIds` delta downstream; per-stock stages consume delta only. Market-wide aggregates (regime/breadth/sector/pulse) are one snapshot from persisted prices — legitimate, not a violation (P4). |
| 9 | Full-universe = manual admin trigger only | **MET** | Historical backfill + `PIPELINE_RUN_ALL` full mode are manual-command/REST only; not on any scheduled path. CATALOG_SYNC / price backfill FORBIDDEN in policy. |
| 10 | Market-data is the ONLY external-comms module; others read persisted + own incremental-persist pipeline | **MET (with noted ingestion adapters)** | Every intelligence module reads persisted market data and persists its own outputs. FII/DII, bulk/block, F&O-ban are classified ingestion adapters on the market-data boundary (correct). Earnings reads DB-only. |

**Tally:** 8 MET (3 of those "MET in code, pending live run to fully populate") · 2 PARTIAL · 0 NOT-MET.

---

## What was verified directly (evidence)

**Durable fixes already applied to the live DB (not just code):**
- smart_money_context_snapshots: **0 duplicate (date,instrument,range) pairs** (was 34,166); total 105,360; the 3-col UNIQUE index now exists (migration 202606060001). Broken upsert is genuinely fixed and the corpus is deduped.
- Stale RUNNING rows: **0** in both `pipeline_runs` and `pipeline_stage_runs` (was 19 + 16). One-time reaper cleanup ran; periodic reaper (30 min) + startup reaper wired in `server.ts`.
- 5 migrations present: smart-money unique, workbench, market-scan, research-overview, portfolio-intelligence snapshots.

**Code fixes confirmed by reading the source:**
- `market-context-intelligence.service.ts` `summary()` — pure persisted-read; no `this.run()` fallback anywhere in the service. (FIX-A)
- DQ napi crash — new `listPriceWindowsForSymbolChunk` raw query casts `volume AS float8` + OHLC `::float8`, chunked ≤50, fixing the IDEA/GTLINFRA BigInt overflow that capped DQ at ~50 stocks. (FIX-D)
- Pool throttle — `DATA_QUALITY` concurrency clamped to 4 (under connection_limit=10). (FIX-F)
- Scheduled chain `SCHEDULED_DOWNSTREAM_STAGE_KEYS` now ends with MARKET_PULSE_REFRESH → STOCK_INTEREST_REFRESH → WORKBENCH_REFRESH → MARKET_SCAN_REFRESH (chain ownership consolidated; eod-ingest scheduler no longer double-fires pulse/research-hub). (FIX-E/G/H/I)
- Screen reads: workbench `getWorkbench()` reads `workbench_snapshots.payloadJson`; market-data movers/scans read `market_scan_snapshots`; research-hub reads `research_overview_snapshots`. (FIX-H/I/J)

**Current DB coverage on latest date (unchanged from audit — proves NOT yet repopulated):**
- signal_results 2026-06-06: **2,044** / 2,937 (70%)
- data_quality_snapshots 2026-06-05: **2,330** (79%)
- smart_money 2026-06-05: **2,324** (79%)
- earnings 2026-06-05: **2,267** (77%)
- New snapshot tables: workbench **3**, portfolio-intelligence **1**, research-overview **1**, market-scan **495** (seeded 06-05 only).
- market_delivery_snapshots still stuck at **2026-06-01** (4-day gap persists → MARKET_PULSE stays PARTIAL until delivery+index ingestion catches up).

---

## Findings (numbered, tagged)

1. **[BLOCKER] Repopulate the universe via one live daily run + a manual historical backfill, then re-verify coverage.**
   The fixes are inert until executed. Required to close: run the scheduled chain on a live server for one trading day and confirm latest-date coverage ≈ universe for signal_results / data_quality / smart_money / earnings; run WORKBENCH_REFRESH + MARKET_SCAN_REFRESH so workbench_snapshots / market_scan_snapshots reach universe scale (currently 3 / 495). Backfill the historical gaps via the manual admin path: signal_results (8 of 12 trading days missing in last 14d), market_delivery (06-02..06-05), NSE_INDEX prices (stale at 06-01). Until observed, Req 2 stays PARTIAL.

2. **[BLOCKER] Commit the 9 uncommitted test files.** They are test-only (no production source uncommitted), but the "565/566 green" / "408/409 green" claims in the P-1/P-2 commit messages are not reproducible from a clean checkout while these sit in the working tree. Commit them and run the suite once green from clean.

3. **[SHOULD] Verify signal_position_ledger actually fills on the next run.** PATH B (persist ENTRY/ACTIVE BULLISH from persisted state, ~658 expected) is in code, but the table is still **39 rows**. This is a portfolio-facing surface; a trader will distrust a near-empty active-positions ledger. Confirm post-run count.

4. **[SHOULD] Resolve the persistent PARTIAL stages so they aren't a permanent yellow.** RAW_SIGNALS (~289 skipped/run), EARNINGS (130 PARTIAL — most stocks legitimately have no upcoming earnings), MARKET_PULSE (PARTIAL while delivery/index sources are stale), SECTOR_INTELLIGENCE (never COMPLETED). For the legitimately-partial ones (earnings no-event, signals DQ-excluded), use SKIPPED semantics so PARTIAL means a real problem; for MARKET_PULSE, the fix is upstream delivery/index freshness (Finding 1).

5. **[SHOULD] portfolio-intelligence is lazy-materialize, not pre-computed.** The first GET after a holdings change computes-then-persists at render (`getIntelligence` → `refreshPortfolioIntelligence`). It reads persisted data only (no external/price-history fan-out) so the latency is bounded, but it is a soft exception to "no calc at render" (Req 6). Acceptable for v1; prefer a refresh on portfolio mutation or in the daily chain. Flagged, not blocking.

6. **[NICE] `.env MARKET_DATA_SCHEDULER_INTERVAL_MINUTES=15` is dead config** (clamped to 1440). Harmless but misleading — set it to 1440 or document the clamp.

7. **[NICE] Historical-backfill REST endpoints are unauthenticated.** Pre-existing; still manual-only (explicit date params). Out of scope for this initiative but worth an auth guard given it's the full-universe trigger.

---

## Trader-trust assessment

Once Finding 1 lands, the day-over-day consistency story is sound: incremental delta + persist-every-run + idempotency keys + dedup + reaper remove the three things that previously made numbers wobble (duplicate smart-money rows, leaked RUNNING gates blocking re-runs, DQ silently capping at 50 stocks). The remaining trust risk a trader would actually feel **today** is purely the un-repopulated state — thin signal coverage, a 39-row position ledger, a 4-day-stale delivery/pulse — all of which are "needs a live run," not "broken logic."

**Bottom line:** The build is right. Run it once, prove the coverage, commit the tests — then this is an APPROVE.
