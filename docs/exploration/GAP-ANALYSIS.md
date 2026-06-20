# Investment Scanner — Data & Feature Gap Analysis (Re-audit)

**Date:** 2026-06-16 · **Supersedes:** 2026-06-15 audit (overwritten in place)
**Method:** Read-only reconnaissance, 11 parallel sub-agents — 5 live browser sweeps of the running frontend (`http://localhost:5173`, logged in as `test@example.com`), 3 backend API inventories (static read of controllers/services/routes), 3 database inventories (live read-only SQL against `investment_scanner` on :5432). **Strict read-only honored — no state mutated this run** (see Appendix B). Per-track evidence files alongside this report:

- `track-a-frontend-{trader-core,instrument-research,trader-personal,admin-1,admin-2}.md`
- `track-b-backend-{market-data,signals,user-account}.md`
- `track-c-db-{market-data,signals-snapshots,user-crypto}.md`

Scale: **74 Prisma models + 9 raw-SQL tables**, **~248 active endpoints (+15 disabled HTTP-410) across 29 modules**, **~50 route paths**. As before, the dominant theme is **data we already hold but don't assemble/surface** — now compounded by **one failing pipeline stage that starves the entire trader experience**.

---

## Executive summary — the 5 highest-value findings

1. **`SNAPSHOT_ASSEMBLER` is still FAILING — and it is now root-caused. This is THE blocker.** The IN/STOCK assembly aborts on a Prisma **interactive-transaction timeout (7099 ms elapsed > 5000 ms limit)** at `snapshot-assembler.repository.ts:630` (a `createMany` inside the transaction); US/EU complete fine (25/24 instruments). The downstream blast radius is enormous and visible everywhere: Signal Generation shows **0/0/0**, Today Review is **empty for the trader** (`today_review_runs`: 28/32 PARTIAL, 3 stuck RUNNING, only 1 ever COMPLETED), and Market Pulse / Sectors / Scans / Movers / Stock Interest all render empty. **Fix = split the IN batch / move the write outside the interactive transaction or raise the timeout.** *Evidence: track-c-db-signals-snapshots; track-a-frontend-admin-1 §pipeline-ops; track-a-frontend-trader-core.*

2. **Benchmark/alpha shipped as code but never backfilled — the "alpha vs Nifty" story is still unanswerable.** The CB-8 persistence path exists and is correct (`POST /signals/quality/recalculate` → raw-SQL `UPDATE signal_outcomes`), but only **12 of 105,610 rows** are enriched (all 1D horizon, all dated 2026-06-11); 5D/10D/20D/60D are 0%. `forwardReturnPercent` is populated for 8,577 rows, so the inputs exist — the sweep simply hasn't run at scale. **Quick win: run the recalculate sweep across horizons.** *Evidence: track-b-backend-signals; track-c-db-signals-snapshots; track-a-frontend-admin-1 §signal-quality.*

3. **Deep per-instrument intelligence exists in the DB but the trader join is still broken/empty.** `signal_results` (**43,459 rows, fresh**) and `strategy_decision_results` (**296,590 rows, fresh**) are rich, yet: the UnifiedStockPage Signals tab is **empty** (the `/signals/:id` **404 is fixed → now 200 but returns no items** because generation produced 0), and the Signal Position Ledger still shows `strategyId`/`strategyRatingGrade` **null on all 67 rows** ("Rule: Unavailable / Grade N/A"). The data is one working join away from the screen. *Evidence: track-a-frontend-instrument-research; track-a-frontend-admin-2; track-c.*

4. **Trade-plan & derivatives assembly remains 100% un-wired.** `daily_instrument_snapshot.stopLoss/target/rrRatio` = **0/20,143 non-null**; `.oiBuildup/.participantPositioning` = **0/20,143** despite `fo_oi_buildup` holding 1,512 rows. `trade_plan_results.portfolioImpact` = **99.6% null**; **0/10 trade plans are paper-ready**. Unchanged from last audit. *Evidence: track-c-db-market-data; track-a-frontend-admin-2 §trade-plans.*

5. **A new structural data gap throttles the new features: Relative-Strength percentile is 0 for every instrument.** The brand-new **F&O Readiness** composite and the **Conviction** scoring both depend on RS percentile, but the RS pipeline has not run — `relative_strength` is null on every instrument and `rsPercentile`/`fnoReadinessScore` rows show RS=0 universally. The new discovery features are shipped but running on partial inputs. Genuinely-absent external datasets persist too: `fx_rates` = 0, `us_insider_trades`/`us_institutional_holdings` **don't exist**, `instrument_exchange_identities` = 0, `fundamentals.officialResultDate` 27.7% populated. *Evidence: track-a-frontend-trader-core; track-c-db-market-data.*

---

## 0. Diff vs the 2026-06-15 audit

### Prior 7 critical findings — current status
| # | Finding | Status | Evidence |
|---|---|---|---|
| 1 | `SNAPSHOT_ASSEMBLER` stage FAILED | **Unchanged — now root-caused** (Prisma interactive-tx 7099ms>5000ms, `snapshot-assembler.repository.ts:630`, IN/STOCK only) | track-c-db-signals-snapshots; admin-1 |
| 2 | Signals not surfaced / `/signals/:id` 404 | **Partial** — 404 → **200**, but tab still empty (generation produced 0 signals; RAW_SIGNALS ran only 12 instruments) | instrument-research; admin-1 |
| 3 | `signal_outcomes.benchmark/alphaPercent` 100% null | **Partial** — persistence **code shipped (CB-8)**, but only **12/105,610 rows** backfilled (1D, one date) | track-b-signals; track-c |
| 4 | `daily_instrument_snapshot.stopLoss/target/oiBuildup` null | **Unchanged** — 0/20,143 non-null | track-c-db-market-data |
| 5 | `fx_rates` empty / FX ingestion | **Unchanged** — 0 rows; provider FX-sync is an HTTP-410 stub | track-c; track-b |
| 6 | US SEC Form 4 / 13F tables absent | **Unchanged** — `us_insider_trades` & `us_institutional_holdings` still do not exist | track-c; track-b |
| 7 | 3 radar stubs (trader-setup/compounder/risk) | **Unchanged** — all three still short-circuit to "…backend not available yet" | trader-personal |

### Resolved / improved since last audit
- **`research_overview_snapshots`**: now 3 fresh rows (1 day old) — no longer stale. *(track-c)*
- **`WORKBENCH_REFRESH`** pipeline stage: now **COMPLETED** (was ABANDONED). *(admin-1)*
- **MDF Readiness Snapshot**: now populated (reviewReady 1,854 / priceReady 1,994) — was all zeros. *(admin-1)*
- **Notifications**: quiet-hours inputs now labelled; auto-save by design — both prior a11y/UX gaps fixed. *(trader-personal)*
- **Copilot**: returns real Market Brief / Alert Digest with the research-support disclaimer — was unverified. *(trader-personal)*
- **Billing**: current plan now displays correctly. **`/derivatives-intelligence`** stale-route console warning gone. *(trader-personal; admin-1)*

### New surfaces added since last audit
- **Conviction tab** (`GET /api/v1/market-data/screener/conviction`): **working** — raw-SQL join of `stocks` × `signal_results` × `smart_money_context_snapshots` (all 3 horizons), bar `signalScore≥70 AND every SM score>70`, top-20; returns 20 fresh BULLISH candidates. *Caveat: all 20 show `signalScore` exactly **100** — no score distribution.* *(track-b-market-data; trader-core)*
- **F&O Readiness / Top-F&O** (read-time 0–100 composite augmenting screener rows from 5 persisted inputs; `onlyDerivativesEligible=true` sorts by it): renders, but **RS percentile=0** and PCR/OI columns need F&O bhavcopy depth. Widget lives at `/derivatives-intelligence`, not in `/screener`. *(track-b; trader-core)*
- **Crypto board** (`GET /api/v1/market-data/crypto/board` reads `crypto_daily_metric_snapshots`): backend live and **crypto data is fresh through 2026-06-16**, but the trader UI for crypto remains dormant by design. *(track-b; track-c)*
- **v4 evidence-model signal scoring** (`SIGNAL_ENGINE_MODEL_VERSION_V4`: 11 decorrelated factor families, no-data weight redistribution, new net-margin & vol-normalized-momentum votes, `scoringInputSummary` JSON persisted): **backend shipped, no UI** surfacing the evidence breakdown yet. *(track-b-signals; admin-1)*

### New gaps/bugs surfaced this run
- **RS percentile = 0 universally** — relative-strength pipeline not run; throttles F&O Readiness, Conviction, and the instrument Relative-Strength panel. *(trader-core; instrument-research)*
- **Signal generation ran only 12 instruments** (`generatedCount=0`) → 0/0/0 everywhere. *(admin-1)*
- **Smart Money TCS shows -35.9% daily change** — confirmed **formatting bug**: API returns `dailyChangePercent: -0.3585` (a fraction) and the UI multiplies by 100 again. *(admin-2)*
- **`source_file_imports` 15.4% FAILED** (624/4,051). *(track-c-db-market-data)*
- **Index Constituents `INVALID_PARAMS`** for NIFTY50. *(trader-core)*
- **6 pipeline stages render as "Unmapped Module"** (up from 4) — missing `OPERATION_CATALOG` entries. *(admin-1)*
- **Capital Posture** does a live GET on every tab activation — violates the persisted-read trader convention. *(trader-personal)*
- **`NotificationsDeliveryPage.tsx` is dead code** — duplicated by `AccountPage.tsx`, route redirects away. *(trader-personal)*
- **Sector label duplication**: "Information Technology" (score 0) vs "Technology" (score 79) coexist. *(admin-2)*

---

## 1. Data gaps — external sources (we don't have this data at all)

Approved free sources only (Yahoo prices, SEC filings, NSE/BSE — never paid, never Stooq).

| Gap | Evidence | Source needed |
|---|---|---|
| **FX rates** | `fx_rates` = **0 rows**; provider FX-sync is an HTTP-410 stub | RBI reference / free FX feed |
| **US insider trades (Form 4)** | `us_insider_trades` table **does not exist**; SEC ingest is pipeline-only and never dispatched | SEC EDGAR (free) — `sec-form4.service.ts` exists |
| **US institutional holdings (13F)** | `us_institutional_holdings` table **does not exist** | SEC EDGAR 13F (free) — `sec-13f.service.ts` exists |
| **Forward earnings calendar** | Earnings "Upcoming" empty; `fundamentals.officialResultDate` **27.7% populated** | NSE board-meetings (IN) + SEC (US) — `ingest-board-meetings` partially wired |
| **Fundamental ratios** | `fundamentals.peRatio` sparse; `stocks.marketCap/sector/isin` sparse for the 12,169 US names | NSE XBRL (IN) + SEC company-facts (US) |
| **Macro indicators** | Market Context shows "Macro providers not configured yet" | Free macro source (rates/inflation/index levels) |
| **NSE exchange identities** | `instrument_exchange_identities` = **0 rows** (catalog joins an empty table) | NSE/BSE identity files |
| **Crypto event calendar & asset metadata** | `crypto_events` = 0; `CryptoAsset.description/logoUrl/circulatingSupply` = **0/436** | CoinMarketCal / CoinPaprika — **low priority** (crypto UI dormant; data pipeline already live) |

## 2. Data gaps — fetched/computed but not persisted

| Gap | Evidence |
|---|---|
| **Relative-Strength percentile not computed/persisted** | RS=0 / `relative_strength` null on every instrument; blocks F&O Readiness + Conviction + RS panel *(trader-core; instrument-research)* |
| **Benchmark/alpha not backfilled** | Path persists to `signal_outcomes` but only 12/105,610 rows written *(track-c)* |
| **Screener computed live, not materialized** | `GET /market-data/screener` is a live cross-join; transient "no stocks match" flash on load *(track-b; trader-core)* |
| **Review-readiness recompute is a side-effecting read** | `?recompute=true` turns a GET into a heavy recompute *(track-b)* |
| **Workbench/instrument chart returns 1 price bar** | `/research/stocks/:id/workbench` returns 1 bar regardless of range → blank chart despite 39.8M `price_ticks` *(instrument-research)* |

## 3. Data persisted but NOT surfaced (we have it; the UI hides it)

| Persisted data | Volume / freshness | Where it's missing | Priority |
|---|---|---|---|
| `signal_results` | **43,459 rows, fresh** | UnifiedStockPage Signals tab empty (generation produced 0) | **Critical** |
| `strategy_decision_results` | **296,590 rows, fresh** | Position Ledger `strategyId`/grade null on all rows | **Critical** |
| `price_ticks` | **39,774,332 rows** (IN 2014–26; 94.8% adjClose) | Instrument/workbench chart shows 1 bar; RS "insufficient history" | **High** |
| `market_delivery_snapshots` | **211,446 rows, 100% deliveryPercent** | No prominent trader-facing delivery-trend view | **High** |
| `fo_oi_buildup` / `fo_participant_oi` | 1,512 / 28 rows | Not assembled into `daily_instrument_snapshot` (oiBuildup null) | **High** |
| `signal_outcomes` | **105,610 rows** (8,577 with forward returns) | Track record not shown on instrument page | **Medium** |
| `smart_money_context_snapshots` | **140,367 rows, fresh** | Surfaced in `/admin/smart-money` only | **Medium** |
| `corporate_actions` | **426,118 rows** (97.8% dividends; splits sparse) | Wired to instrument page — verify render | **Low/verify** |

## 4. Quick wins — buildable now from existing DB data (ranked value ÷ effort)

1. **Fix `SNAPSHOT_ASSEMBLER`'s IN-batch transaction timeout** (split the `createMany`, or move it out of the 5s interactive transaction). One fix un-blanks Signals, Today Review, Market Pulse, Scans, Movers, Stock Interest simultaneously. **Value: very high · Effort: low–medium** (now that it's root-caused). *(track-c; admin-1)*
2. **Run the benchmark/alpha recalculate sweep across all horizons** — code is shipped; inputs (`forwardReturnPercent`) exist; only 12/105K rows done. **Value: high · Effort: low.** *(track-b; track-c)*
3. **Run/repair the Relative-Strength pipeline** — unblocks F&O Readiness, Conviction quality, and the instrument RS panel in one go. **Value: high · Effort: low–medium.** *(trader-core)*
4. **Wire signals onto the instrument page** — endpoint now 200; `signal_results`/`signal_outcomes` exist; needs generation to actually populate + the per-instrument read. **Value: high · Effort: medium** (depends on #1). *(instrument-research)*
5. **Fix the strategy/rating join in the Position Ledger** — 296K `strategy_decision_results` exist; attach `strategyId`/grade. **Value: medium · Effort: medium.** *(admin-2)*
6. **Assemble derivatives into `daily_instrument_snapshot`** (`fo_oi_buildup` → oiBuildup/participantPositioning). **Value: medium · Effort: medium.** *(track-c)*
7. **Delivery-volume insight view** from `market_delivery_snapshots` (211K, 100% coverage). **Value: medium-high · Effort: low–medium.** *(track-c)*
8. **Fix the Smart Money daily-change ×100 formatting bug** and add the 6 missing pipeline-stage `OPERATION_CATALOG` labels — small correctness/clarity wins. **Value: low-medium · Effort: trivial.** *(admin-2; admin-1)*

## 5. Larger features — blocked on new external data

| Feature | Needs | From where |
|---|---|---|
| Multi-currency portfolio valuation | FX rates (`fx_rates` empty) | RBI reference / free FX feed |
| Fundamental screener (P/E, P/B, ROE, growth) | Fundamental ratios (sparse) | NSE XBRL (IN) + SEC company-facts (US) |
| US smart-money intelligence (insider + 13F) | Form 4 + 13F (tables absent) | SEC EDGAR — services written, never dispatched |
| Forward earnings calendar & estimates | Earnings dates/estimates (officialResultDate 27.7%) | NSE board-meetings + SEC |
| Macro / regime dashboard | Macro indicators ("not configured") | Free macro source |
| Crypto trader experience (reactivation) | `crypto_events` + asset metadata + product decision | CoinMarketCal / CoinPaprika (price/signal data already live & fresh) |

---

## Appendix A — Operational / integrity findings

- **`SNAPSHOT_ASSEMBLER` FAILED** (tx timeout, IN/STOCK); **6 pipeline stages** render "Unmapped Module"; `today_review_runs` has **3 stuck RUNNING**. *(admin-1; track-c)*
- **Auth gaps persist** (static): `POST /api/v1/pipeline/commands` (triggers full pipeline runs) and the `research-hub` + `stock-research-workbench` routers have **no auth**; `today-review/run` and `context-snapshots/generate` are authed but **no admin gate**; the subscription plan PATCH relies on an in-controller `x-admin-key` check that **fails open if `ADMIN_API_KEY` is unset**. *(track-b-user-account)*
- **No-confirmation billing plan change** still present (`changePlan(code)` fires directly on click) — the exact mechanism behind last run's accidental mutation. Developer commentary still rendered as user copy on the Billing page. *(trader-personal)*
- **Raw backend error string leaks into trader UI**: TCS Market Context Rail shows `"SectorSnapshot (no rows for sector=Information Technology")"`. *(instrument-research)*
- **`activeTab` prop ignored** on `InstrumentDetailPage`; **`price_readiness: INADEQUATE_HISTORY`** shown on 2,811-bar large-caps (misleading freshness chip). *(instrument-research)*
- **Dead code**: `SignalPositionLedgerController.activeRows/closedRows` unwired; `NotificationsDeliveryPage.tsx` never rendered; 15 HTTP-410 provider stubs; `GET /subscription/provider` stub; cosmetic `POST /auth/logout`. *(track-b; trader-personal)*
- **Persisted-read violation**: Capital Posture does a live GET on tab activation. *(trader-personal)*
- **Orphaned associations** unchanged: backtest runs/strategies user-less; both watchlists user-less; `user_subscriptions.expiresAt` null for all 21. *(track-c-db-user-crypto)*

## Appendix B — State integrity & inference notes

- **No state was mutated this run.** Strict read-only guardrails held: the Track A "trader-personal" agent explicitly avoided the billing plan button, and no creates/ingests/recompute/pipeline runs were triggered (operator agents listed the destructive controls they deliberately skipped). DB agents used SELECT-only access.
- **Carry-over from last run, still open:** the test user `test@example.com` is **still on the ADMIN plan** (DB-confirmed) — it was never restored after the 2026-06-15 accidental change. **Recommend the owner restore it.**
- **Inference vs confirmed:** all table populations and pipeline-stage statuses are confirmed (live SQL + live browser + the assembler's own error text). The *causal link* from `SNAPSHOT_ASSEMBLER`/RS-pipeline gaps to each individual empty screen is inferred from correlation (failed/again-not-run stage + empty downstream tables), corroborated this run by the explicit transaction-timeout error and `generatedCount=0`. The v4-scoring "no UI" claim is from source + live snapshot (no evidence-breakdown component rendered in the signal list).
