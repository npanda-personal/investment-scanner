# Architecture Sign-Off — Daily-Pipeline Stability Initiative (2026-06-06)

**Reviewer:** Principal Architect (Claude Opus 4.8), READ-ONLY review
**Scope:** commits `3a9cbf8, 8b4dea9, 1bff47c, 6d1045e, bbe53ad, c19cf69, 352acd6` on branch `dev`
**Method:** code read of all touched services + repositories + schema + migrations; live DB inspection (`investment_scanner_postgres`); `tsc --noEmit` (clean, exit 0).

---

## VERDICT: CHANGES_REQUESTED

The foundational work (P-1/P-2) is architecturally sound and well-executed: persisted-read enforcement on the three known GET-triggers-generation paths is correct, the stale-lease reaper is safe against active runs, the smart-money 34k-dup root cause is fixed at the schema level and verified clean in the live DB, and the incremental/manual separation holds. **However, the snapshot-pipeline layer (P-3) ships three silent-staleness defects that defeat the very persisted-read guarantee it was built to provide.** Two screens read snapshots that the daily scheduled pipeline never refreshes, and one trader page can serve a stale snapshot indefinitely after the underlying data changes. These must be fixed before sign-off.

What's verified GOOD:
- Persisted-read on `market-context.summary()`, `signal-gen.latestForInstrument()`, `calibration.latestForInstrument()/compare()` — all now pure DB reads; no `run()`/`calibrateAndPersist()` fallback (`market-context-intelligence.service.ts:143`, `signal-generation-engine.service.ts:299`, `signal-calibration-engine.service.ts:112,131`).
- `research-hub.overview()` default GET is persisted-read; live recompute only behind explicit `?live=true`, which the FE never sends (`research-hub.service.ts:78`).
- Reaper is race-safe: `updateMany` with `status='RUNNING' AND updatedAt<cutoff AND (leaseExpired OR null+old)` guards; batched stages renew lease via `recordStageProgress(leaseMs)` so active work is never reaped (`pipeline-orchestration.repository.ts:271`).
- Smart-money 3-col `@@unique([snapshotDate,instrumentId,range])` migrated (`202606060001`) and matches model; live DB: index present, **0 duplicate rows**.
- Incremental gate is universal: `runScheduledPipelineStage` skips when `changedInstrumentIds.length===0` (`:2358`); per-stock stages consume the delta and upsert.
- Module boundary mostly holds: only market-data + the NSE EOD ingests (fii-dii, bulk-block, fno-ban) fetch externally — all NSE-official, market-data-domain, **pre-existing**, untouched by these commits.
- Pool safety applied to DQ (bounded worker pool of 4, `data-quality-engine.service.ts:792`) and Workbench (semaphore of 4); historical-context is sequential.

---

## FINDINGS

### 1. [BLOCKER] Market-scan snapshot is NOT in the daily scheduled chain — movers/52w/spike screens go silently stale
`pipeline-orchestration.service.ts` — `refreshMarketScanSnapshots()` is invoked only from the **manual** `MARKET_SCAN_REFRESH` command handler (`:1517`) and the **manual** `PIPELINE_RUN_ALL` (`:1693`). The scheduled downstream chain (`:3477–4422`) wires 14 stages (Earnings → MarketContextSnapshot → SmartMoney → ContextSnapshots → SignalQuality → StrategyDecision → ResearchProjection → TodayReview → SignalPositionLedger → Sector → MarketPulse → StockInterest → Workbench → MarketContext) but **never MARKET_SCAN_REFRESH**. The commit message for `6d1045e` claims "MARKET_SCAN_REFRESH stage (scheduled chain after MARKET_DATA + manual trigger)" — the scheduled half does not exist. Live DB: `market_scan_snapshots` holds only `tradingDate=2026-06-05` (the seed). The 6 GET endpoints (`/movers`, `/market-map`, `/scans/*`) will serve that snapshot indefinitely; the next scheduled day will ingest 06-06 prices but never recompute the scans. Violates requirements 5 (every pipeline persists every run) and 8 (daily=incremental). **Recommendation:** wire `runScheduledMarketScanRefreshStage` into the scheduled chain (stageOrder right after MARKET_DATA, gated on `changedInstrumentIds` like the others), or have the MARKET_DATA stage chain to it. Add a test asserting MARKET_SCAN_REFRESH appears in the scheduled stage set.

### 2. [BLOCKER] Workbench snapshot covers 3 of 2,937 instruments; FE workbench/peers/instrument-RS effectively empty universe-wide
`workbench-refresh.service.ts` is correct in isolation (bounded 4, upsert by `instrumentId @unique`, incremental). But three GET surfaces were switched to *require* `workbench_snapshots`: `getWorkbench()`, `getPersistedPeers()` (P-3a), and `instrument-context.loadRelativeStrength()` (P-3d, reads `payloadJson.relative_strength`). Live DB: **`workbench_snapshots` = 3 rows** (seeded RELIANCE/TCS/BANDHANBNK) vs **2,937 active IN stocks**. Because the scheduled stage only processes `changedInstrumentIds` (daily delta), an instrument is materialized only on a day its price changes — full coverage takes many trading days, and any never-changing/illiquid name never materializes. Until then every other instrument's workbench returns 202 "not-yet-computed" and instrument-context RS is absent. The FE handles 202 gracefully (P-4), but the user-facing outcome is a near-empty workbench across the universe — a functional regression versus the prior compute-on-read behavior. **Recommendation:** run a one-time full-universe WORKBENCH_REFRESH backfill via the manual admin path (the service already supports explicit `instrumentIds`/paging) before this read-path switch is considered live; document it as a required migration step. Same backfill consideration applies to any instrument-context RS dependency.

### 3. [BLOCKER] Portfolio-intelligence snapshot has no refresh-on-change and no pipeline stage — GET serves stale data after holdings change
`portfolio-intelligence.service.ts:64` `intelligence()` returns the cached snapshot whenever one exists, and only lazy-materializes on the *first* view. The docstring claims refresh "(a) On holdings add/edit/remove — called by the controller" and "(b) daily refresh," but **neither is wired**: `grep` finds no caller of `refreshPortfolioIntelligence` in `portfolio-management/*`, no `PORTFOLIO_INTELLIGENCE` stage in the scheduled chain, and no FE call to `POST /portfolios/:id/intelligence/refresh`. Net effect: after a holdings mutation the persisted snapshot (healthScore, red-flags, classifications) silently diverges from the portfolio and the GET keeps serving the stale row forever. This is precisely the silent-stale-snapshot risk on a trader page (requirement 6 spirit). **Recommendation:** call `refreshPortfolioIntelligence()` from the holdings add/edit/remove handlers in portfolio-management (or emit an event the intelligence module subscribes to), and/or add a daily PORTFOLIO_INTELLIGENCE refresh stage. Until wired, either keep the GET computing (worse for pool) or block sign-off.

### 4. [SHOULD] Market-scan refresh is delete-then-insert with no transaction — read-tearing + partial-snapshot-on-failure window
`market-data-foundation.service.ts:1082–1095`: `deleteMany({tradingDate})` followed by chunked `createMany` (200/chunk), **not** wrapped in `prisma.$transaction`. A concurrent GET during refresh sees zero or partially-loaded rows for the latest tradingDate (the read selects `latest tradingDate` then its rows, `:1116`), and if a later chunk throws, the snapshot is left permanently partial with no rollback. Low probability (off-hours, brief) but it is a correctness hole on a persisted-read surface. **Recommendation:** wrap delete+inserts in a single `$transaction`, or insert under a new `computedAt`/version and atomically flip the read pointer.

### 5. [SHOULD] Smart-money per-stock stage uses unbounded `Promise.all` (≤100 wide) — only heavy stage not brought under the pool bound
`smart-money-intelligence.service.ts:119` `await Promise.all(instruments.map(...))` runs the whole page concurrently; each item does `loadBars + loadDataQuality + saveSnapshot`. The page is capped at `normalizeScheduledBatchSize` ≤ **100** (`pipeline-orchestration.service.ts:5953`), so up to 100 concurrent DB-touching tasks contend for `connection_limit=10` (`.env`). This is the same "too many clients" pressure class FIX-F targeted; DQ and Workbench were converted to a ≤4 bound but smart-money's inner map was not. Works today because Prisma queues, but it is the inconsistent outlier and the most likely to re-trigger pool timeout on a high-change day or a manual large batch. **Recommendation:** route the inner loop through a bounded runner (reuse DQ's `eachWithConcurrency(items, 4, …)`), consistent with the other per-stock stages.

### 6. [SHOULD] Reaper threshold is 20 min, not the "2h / 7200 s" stated in code comment and commit message
`pipeline-orchestration.service.ts:59` `DEFAULT_ACTIVE_STALE_MS = DEFAULT_LEASE_MS * 2` and `DEFAULT_LEASE_MS = 600_000` (`:58`) ⇒ **1,200,000 ms = 20 min**, but `reaperThresholdMs()` comment (`:4727`) says "2 × lease duration (7200 s)" and commit `3a9cbf8` says "2h threshold." The design is still safe (a progressing stage renews its lease and `updatedAt`, so it can't be reaped; only a single batch stalled >10 min lease AND >20 min updatedAt is reaped, which a ≤100-item batch won't hit). But the doc/threshold mismatch is a real operational hazard: an operator trusting "2h" may set `PIPELINE_REAPER_THRESHOLD_MS` wrong, and a legitimately long single-shot manual stage (e.g. full-universe recompute with no progress checkpoints) could be reaped at 20 min. **Recommendation:** fix the comment + commit-message claim to 20 min, and confirm long manual stages checkpoint progress (renew lease) within 20 min — or raise the default to the intended 2h.

### 7. [SHOULD] `enrichSignals` still does N×500-bar live price reads when strategy-match flags are set (FIX-K not delivered)
`signal-generation-engine.service.ts:901`: when `includeStrategyContext` is true, the read path calls `listPricesByInstrumentId(id, 500)` **per signal** then re-runs strategy matching — exactly the N×500 recompute FIX-K planned to eliminate by persisting `strategyMatches`. FIX-K is absent from the 7 commits. Mitigated because the `top`/`screener` controllers do not parse the strategy-match query flags (`signal-generation-engine.controller.ts` has none), so the default GET avoids it — this is why it's SHOULD not BLOCKER. But the heavy path remains reachable (any client passing `includeStrategyMatches/onlyStrategyEligible/...`), and it is a latent requirement-7 violation. **Recommendation:** persist `strategyMatches`/`blockedStrategies` on `SignalResult` at generation and read them back, or explicitly gate the live-recompute path behind a non-GET/admin flag.

### 8. [NICE] NSE EOD ingests live outside the market-data module (boundary purity)
`market-context-intelligence/{fii-dii,bulk-block-deals}.service.ts` and `smart-money-intelligence/fno-ban.service.ts` each `https.get` NSE endpoints — a deviation from requirement 10 ("market-data is the ONLY module with external comms"). All are NSE-official, market-data-domain feeds, **pre-existing**, and untouched here; the P4 audit explicitly classifies them as market-data-domain EOD ingests. Acceptable for this sign-off. **Recommendation (future):** relocate these three NSE fetchers behind the market-data module's ingestion layer so the boundary is literal, not just conceptual.

### 9. [NICE] `research-hub ?live=true` recompute escape hatch is ungated
`research-hub.service.ts:88` / controller `:50`: any caller can force a full live `buildOverview()` fan-out by appending `?live=true`. FE never uses it, but it's an unauthenticated compute-on-demand door. **Recommendation:** gate behind the admin/manual path or remove once snapshot coverage is trusted.

### 10. [NICE] MarketScanSnapshot `@@unique` includes nullable `scanRange` (Postgres NULL-distinct)
`schema.prisma:1576` — for non-mover scans `scanRange=NULL`, so the unique constraint does not dedupe by rank. Currently harmless because the write path is delete-then-insert (not upsert), so no duplicate-key reliance exists. Flagged only so a future switch to upsert-by-key doesn't silently regress (it would hit the smart-money dup-class again). **Recommendation:** use a sentinel (e.g. `'_'`) instead of NULL for `scanRange` if this table ever moves to upsert semantics.

---

## Requirement scorecard
| # | Requirement | Status |
|---|---|---|
| 1 | Pipeline ops audited | PASS (AUDIT-1..4 thorough) |
| 2 | Pipeline loads ALL data | PASS (DQ napi fix restored full-universe; verified) |
| 3 | Failing pipelines fixed | PASS (reaper unblocks idempotency; DQ/smart-money fixed) |
| 4 | Incremental persists EVERY load | PARTIAL — per-stock stages upsert every run; **market-scan + portfolio-intel don't refresh on the daily/change path** (Findings 1, 3) |
| 5 | EVERY pipeline persists | PARTIAL — market-scan not on scheduled chain (Finding 1) |
| 6 | Screens read ONLY persisted data | PARTIAL — portfolio-intel lazy-computes on GET + serves stale (Finding 3); research `?live` hatch (9); enrichSignals heavy path (7) |
| 7 | Slow screens fixed | MOSTLY — workbench/movers/overview moved to snapshots; enrichSignals strategy path still heavy (7) |
| 8 | Daily = incremental only | PASS for wired stages; market-scan simply absent from daily (1) |
| 9 | Full-universe = manual admin | PASS (PIPELINE_RUN_ALL + historical backfill manual-gated) |
| 10 | Market-data sole external module | PARTIAL — 3 pre-existing NSE ingests outside it (8) |

**Gate:** clear Findings 1–3 (BLOCKER) — wire market-scan into the scheduled chain, backfill workbench full-universe (or stage it), and wire portfolio-intelligence refresh-on-change. Address 4–7 (SHOULD) before or immediately after. Re-review on those three.
