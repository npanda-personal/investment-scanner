# Architecture Sign-Off (ROUND 2) — Daily-Pipeline Stability Initiative (2026-06-06)

**Reviewer:** Principal Architect (Claude Opus 4.8), READ-ONLY review
**Scope:** round-1 verdict CHANGES_REQUESTED; re-review of fix commit `41423fb` (+ `f2502da`) on branch `dev`
**Method:** `git show 41423fb` code read of all touched services/repositories/tests; live DB inspection (`investment_scanner_postgres`); `tsc --noEmit` (clean, exit 0); ran the 3 directly-affected test groups (49 + 84 = 133 tests, all green).

---

## VERDICT: APPROVE

All three round-1 BLOCKERS are resolved in code + design + test, and the two operationally relevant SHOULDs (atomic market-scan replace, smart-money concurrency bound) plus the reaper SHOULD are addressed. The fixes are well-constructed: the portfolio-intelligence staleness guard is a genuine self-healing guarantee (not just a fire-and-forget hope), the market-scan stage is correctly wired terminal-in-chain with a matching test assertion, and the reaper PENDING-reap is conservatively guarded so it cannot kill freshly-queued runs. I scanned the three named regression risks (market-scan stage ordering, write-on-GET in portfolio-intelligence, over-aggressive PENDING reap) and found none materialize. The only outstanding item is operational — the full-universe WORKBENCH backfill is still climbing (3 → 205 of 3,949) — which per the review rubric is a noted follow-up, not a code/design defect, because the WORKBENCH_REFRESH stage is wired into the scheduled chain and self-maintains.

---

## Prior BLOCKERS — resolution status

### BLOCKER 1 — Market-scan not in scheduled chain → **RESOLVED**
- New ledger-tracked stage `runScheduledMarketScanRefreshStage` (stageKey `MARKET_SCAN_REFRESH`, `stageOrder: 18`, terminal) at `pipeline-orchestration.service.ts:4342`.
- **Chain reachability traced end-to-end:** DataQuality(2) → … → SignalCalibration → Earnings(5) → MarketContextSnapshot → SmartMoney → ContextSnapshots → SignalQuality → StrategyDecision → ResearchProjection → TodayReview → SignalPositionLedger → Sector → MarketPulse(15) → StockInterest(16) → **WorkbenchRefresh(17)** → **MarketScanRefresh(18, terminal)**. The link is the `response.downstream = await this.runScheduledMarketScanRefreshStage({...request,...})` at `:4333`, guarded on `COMPLETED|PARTIAL|SKIPPED`. The whole chain is incremental-gated at the head (`changedInstrumentIds.length===0 ⇒ SKIPPED`), so market-scan runs exactly when the day had price changes — correct.
- **Design note (verified, not a defect):** the stage adapter calls `refreshMarketScanSnapshots({region,assetType})` — a *full-universe ranked* recompute (movers/52w/spike must consider every instrument), intentionally NOT keyed on `changedInstrumentIds`. The incremental gate still governs *whether* it runs; this is the right semantics for a ranked snapshot. `stageOrder` 18 (after MARKET_DATA wrote fresh prices at the top) means it reads fresh persisted prices. No stageOrder collision (15→16→17→18 sequential).
- **Test:** `pipeline-orchestration.service.test.ts` chain assertion now ends `…,'WORKBENCH_REFRESH','MARKET_SCAN_REFRESH'`; the market-scan adapter mock is injected. Suite green (49/49 incl. reaper).

### BLOCKER 2 — Workbench covers 3/2,937 → **RESOLVED (design) + operational follow-up**
- **Design self-maintenance confirmed:** `WORKBENCH_REFRESH` is stage 17 in the scheduled chain (asserted in the chain test), consuming `changedInstrumentIds` and upserting by `instrumentId @unique` — so the daily pipeline materialises every instrument that moves, and the snapshot self-maintains without manual intervention going forward.
- **Live backfill is climbing:** `SELECT count(*) FROM workbench_snapshots` = **205** (was 3 at round 1), against **3,949** active stocks. `market_scan_snapshots` = **495** (7 scan types: MARKET_MAP, 52W_HIGH/LOW, VOLUME_SPIKE, DELIVERY_SPIKE, MOVERS_GAINERS/LOSERS). `research_overview_snapshots` = 1 (single global row, expected).
- Per the review rubric, the in-progress full-universe populate completing is **operational, not a code/design blocker**. The read-path 202 "not-yet-computed" handling (P-4 FE) remains the correct interim behavior while coverage fills in. **Operational follow-up (non-blocking):** confirm the manual full-universe WORKBENCH backfill runs to completion (and likewise instrument-context RS) before declaring the snapshot read-path fully "live" universe-wide.

### BLOCKER 3 — Portfolio-intelligence no refresh-on-change → **RESOLVED**
Three layers, verified in code:
1. **Mutation hook:** `addHolding/updateHolding/removeHolding` in `portfolio-management.service.ts` now call `triggerIntelligenceRefresh(portfolioId,userId)` — a fire-and-forget, cycle-safe lazy-`require` of `PortfolioIntelligenceService` (constructor is all-default-args, so `new PortfolioIntelligenceService()` is valid; errors swallowed so a mutation never breaks).
2. **`updatedAt` touch:** `portfolio-management.repository.ts` touches `portfolio.updatedAt = new Date()` on all three mutations (remove resolves portfolioId from the holding row first).
3. **Staleness guard (the durable guarantee):** `intelligence()` now fetches `findComputedAt` + `getPortfolioDetail` in parallel; if `portfolio.updatedAt > computedAt` it recomputes-and-persists once, else serves cached. This self-heals even if the fire-and-forget hook fails or races. **Convergence verified:** `upsertSnapshot` sets `computedAt = generatedAt = new Date()` at write time, captured *after* the mutation's `updatedAt`, so post-refresh `computedAt > updatedAt` and the next GET hits cache — no oscillation (a sub-second mutation-during-recompute self-corrects on the next GET).
- **Test:** portfolio-intelligence + portfolio-management suites green (part of 84/84).
- Minor: the `upsertSnapshot` docstring still says "never from a GET path" — now technically called from the GET staleness path. Cosmetic stale comment, not a defect.

---

## Prior SHOULDs re-checked

| SHOULD | Status | Evidence |
|---|---|---|
| Market-scan refresh atomic (`$transaction`) | **RESOLVED** | `market-data-foundation.service.ts:~1082` delete+chunked-insert now wrapped in `db.$transaction(async tx => {…})` — no torn/empty read window, rollback on partial-chunk failure. |
| Smart-money inner fan-out bounded to 4 | **RESOLVED** | `smart-money-intelligence.service.ts:119` replaced `Promise.all(map)` with `eachWithConcurrency(instruments, 4, …)`; new worker-pool helper is correct (shared cursor, `workerCount=min(4,len)`). Inner per-item `Promise.all` of 2 ⇒ peak ~8 concurrent queries, within `connection_limit=10`. |
| Reaper comment aligned to 20 min | **RESOLVED** | `reaperThresholdMs()` comment corrected from "2h/7200s" to "1200 s / 20 min". |
| Reaper reaps stale PENDING (not just RUNNING) | **RESOLVED** | `pipeline-orchestration.repository.ts` adds a second `pipelineStageRun.updateMany({status:'PENDING', updatedAt<cutoff, createdAt<cutoff})`, and the parent-run reap now covers `status in (RUNNING,PENDING)` with the active-child check also `in (RUNNING,PENDING)`. Tests updated for the two-updateMany shape + freshness exclusion. |

---

## Fresh regression scan (P-5 fixes)

- **Market-scan stage ordering** — terminal at 18, reads fresh prices written at the top; no downstream depends on it; no order collision. **No regression.**
- **Write-on-GET in portfolio-intelligence** — the staleness guard does issue a recompute+upsert on a GET, but ONLY when a holdings mutation actually landed after the last snapshot (`updatedAt > computedAt`). Steady-state GETs (no mutation) take the cached fast path with zero write. The write is bounded to at most once per mutation and converges. This is the correct, intended trade-off to satisfy the persisted-read-but-not-stale requirement. **No regression.**
- **Reaper PENDING-reap too aggressive** — guard requires BOTH `createdAt < cutoff` AND `updatedAt < cutoff` (cutoff = now − 20 min). A freshly-queued PENDING row (createdAt within 20 min) is never reaped. Live DB shows healthy run distribution (565 COMPLETED / 275 PARTIAL / 63 FAILED), consistent with reaping only genuinely-stuck rows. **No regression.**
- No new `tsc` errors (exit 0). No new external-comms boundary violations introduced. No new unbounded fan-out introduced.

---

## Requirement scorecard (round 2)
| # | Requirement | Status |
|---|---|---|
| 1 | Pipeline ops audited | PASS |
| 2 | Pipeline loads ALL data | PASS |
| 3 | Failing pipelines fixed | PASS |
| 4 | Incremental persists EVERY load | PASS — market-scan now chained; portfolio-intel refreshes on change + staleness guard |
| 5 | EVERY pipeline persists | PASS — market-scan now on scheduled chain (stage 18) |
| 6 | Screens read ONLY persisted data | PASS — portfolio-intel serves persisted with bounded recompute-on-mutation only; research `?live` hatch and enrichSignals heavy path remain pre-existing NICE/SHOULD (carried, not regressed) |
| 7 | Slow screens fixed | PASS for this initiative's scope |
| 8 | Daily = incremental only | PASS |
| 9 | Full-universe = manual admin | PASS |
| 10 | Market-data sole external module | PARTIAL (3 pre-existing NSE EOD ingests, unchanged — carried NICE) |

---

## Carried-forward (non-blocking, pre-existing — were NICE/SHOULD in round 1)
- `enrichSignals` N×500-bar live path when strategy flags set (unreachable from default GET controllers).
- `research-hub ?live=true` ungated recompute hatch (FE never sends it).
- 3 NSE EOD ingests living outside the market-data module (boundary purity).
- `MarketScanSnapshot @@unique` includes nullable `scanRange` (harmless under delete+insert replace semantics).

## Operational follow-up (not a code defect)
- Run the manual full-universe WORKBENCH_REFRESH backfill (and instrument-context RS) to completion so the snapshot read-path is fully populated universe-wide. Currently 205/3,949 and climbing; the scheduled stage will also fill it incrementally day-by-day.

**Gate:** CLEARED. Round-1 BLOCKERS 1–3 RESOLVED; SHOULDs 4–6 RESOLVED. No new architectural regression. **APPROVE** with the noted operational backfill follow-up.
