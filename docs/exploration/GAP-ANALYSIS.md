# Investment Scanner — Data & Feature Gap Analysis

**Date:** 2026-06-15
**Method:** Read-only reconnaissance. Phase 1 ran 11 parallel sub-agents — 5 live browser sweeps of the running frontend (`http://localhost:5173`, logged in as `test@example.com`), 3 backend API inventories (static read of controllers/services/routes), and 3 database inventories (live read-only SQL against `investment_scanner` on :5432). Phase 2 consolidates them. Per-track evidence files live alongside this report:

- `track-a-frontend-trader-core.md`, `track-a-frontend-instrument-research.md`, `track-a-frontend-trader-personal.md`, `track-a-frontend-admin-1.md`, `track-a-frontend-admin-2.md`
- `track-b-backend-market-data.md`, `track-b-backend-signals.md`, `track-b-backend-user-account.md`
- `track-c-db-market-data.md`, `track-c-db-signals-snapshots.md`, `track-c-db-user-crypto.md`

Scale: **74 Prisma models + 9 raw-SQL tables**, **~297 backend endpoints across 29 modules**, **~30 frontend screens**. The DB holds a large amount of real data (39.8M price ticks, 426K corporate actions, 296K strategy decisions); the dominant theme below is **data we already have but do not surface or assemble**, not data we lack.

---

## Executive summary — the 5 highest-value findings

1. **The snapshot pipeline is silently broken at the last mile — this is the single biggest lever.** The `SNAPSHOT_ASSEMBLER` stage shows **FAILED** and `WORKBENCH_REFRESH` shows **ABANDONED** in today's pipeline run (`/admin/pipeline-ops`). The downstream symptom is everywhere: `market_pulse_snapshots` all `status=PARTIAL`, `research_overview_snapshots` stale 7 days, `portfolio_intelligence_snapshots` stale 8–9 days, Today Review "INSUFFICIENT DATA", Research Hub Priority Board "0 review candidates". Most "empty/stale trader page" findings collapse into this one root cause. *Evidence: track-a-frontend-admin-1 §pipeline-ops; track-c-db-signals-snapshots.*

2. **We compute deep signal/strategy data but the trader-facing join is broken, so it renders empty.** `signal_results` has **43K fully-populated rows** updated daily, yet the UnifiedStockPage "Signals & History" tab is empty for RELIANCE/TCS/INFY and `GET /api/v1/signals/:id` returns **404**. `strategy_decision_results` has **296K fully-populated rows**, yet the Signal Position Ledger shows `strategyId` **null on all 1,110 rows** ("Rule: Unavailable", "Grade N/A"). The intelligence exists in the DB; the read path that attaches it to instruments is missing/broken. *Evidence: track-a-frontend-instrument-research §UnifiedStockPage; track-a-frontend-admin-2 §signal-position-ledger; track-c-db-signals-snapshots.*

3. **Benchmark/alpha enrichment never ran — the core "is this signal any good vs Nifty?" story is unanswerable.** `signal_outcomes.benchmarkReturnPercent` and `.alphaPercent` are **100% null across all 106K rows**. The Nifty data needed to compute them is already local (`price_ticks`). This is a high-value quick win, not an external-data gap. *Evidence: track-c-db-signals-snapshots.*

4. **The trade-plan / derivatives assembly is half-wired — columns exist, data exists, but nothing populates them.** `daily_instrument_snapshot.stopLoss/target/rrRatio` are **100% null**, and `.oiBuildup/.participantPositioning` are **100% null even though `fo_oi_buildup` holds 1.5K rows**. `trade_plan_results.portfolioImpact` is **99.6% null**. The instrument page's derivatives and trade-plan sections are blank despite local source data. *Evidence: track-c-db-market-data; track-c-db-signals-snapshots; track-a-frontend-admin-2 §trade-plans.*

5. **A handful of genuinely-absent external datasets block whole feature classes.** `fx_rates` = **0 rows** (cross-currency valuation broken), `instrument_exchange_identities` = **0 rows**, US SEC tables (`us_insider_trades`, `us_institutional_holdings`) **don't exist** (ingest never ran), forward earnings calendar empty, `fundamentals.peRatio` **94% null**. These are the real "go fetch from outside" items. *Evidence: track-c-db-market-data; track-b-backend-market-data.*

---

## 1. Data gaps — external sources (we don't have this data at all)

These require fetching from an approved free external source (Yahoo prices, SEC filings, NSE/BSE — never paid, never Stooq).

| Gap | Evidence | Source needed | Notes |
|---|---|---|---|
| **FX rates** | `fx_rates` = **0 rows** (track-c-db-market-data). The provider FX-sync endpoint is one of 24 stubs returning HTTP 410 `EXTERNAL_PROVIDER_DISABLED`. | RBI reference rates / a free FX feed | Any cross-currency portfolio valuation (US/EU holdings shown in INR, or vice-versa) is currently impossible. Blocks multi-currency. |
| **Forward earnings calendar** | Earnings screen "Upcoming Results" tab is **always empty** (track-a-frontend-trader-core). `fundamentals.officialResultDate` is **72% null** (track-c). | NSE board-meetings API (IN), SEC company-facts (US) — services partially exist (`ingest-board-meetings`). | The board-meeting ingest exists but isn't producing forward dates for most names. |
| **US insider trades (Form 4)** | `us_insider_trades` table **does not exist** — lazy-created on first ingest, never triggered (track-c-db-market-data; track-b-backend-market-data). | SEC EDGAR Form 4 (free) — `sec-form4.service.ts` already written. | Service is built; it has simply never run. |
| **US institutional holdings (13F)** | `us_institutional_holdings` table **does not exist** (track-c; track-b). | SEC EDGAR 13F (free) — `sec-13f.service.ts` already written. | Same: code exists, never executed. |
| **Fundamental ratios / company facts** | `fundamentals.peRatio` **94% null**, `stocks.marketCap` **~75% null**, `stocks.sector/industry` **~78% null** (US backfill incomplete) (track-c-db-market-data). | NSE XBRL (IN, partially wired — `nse-xbrl-bulk-ingest`), SEC company-facts (US). | Blocks any fundamental screener / valuation feature. |
| **Macro indicators** | Market Context page renders "Macro providers are not configured yet" as a visible MISSING block (track-a-frontend-admin-2 §market-context). | A free macro source (rates/inflation/indices). | Macro regime view is stubbed. |
| **Crypto event calendar & asset metadata** | `crypto_events` = **0 rows** (needs `CRYPTO_COINMARKETCAL_API_KEY`); `CryptoAsset.description/logoUrl/circulatingSupply` = **0/436 populated** (CoinPaprika enrichment never ran) (track-c-db-user-crypto). | CoinMarketCal / CoinPaprika (free tiers). | **Low priority** — crypto scope is UI-dormant by design (the `/crypto` route redirects home), though crypto *data* is live (328K `crypto_price_ticks`). |

---

## 2. Data gaps — fetched/computed but never persisted

The architecture is snapshot-first, so most computed results *are* persisted. The exceptions:

| Gap | Evidence | Note |
|---|---|---|
| **Screener results are computed live, not materialized** | `GET /api/v1/market-data/screener` is a **live cross-join across 6 tables**, not a snapshot (track-b-backend-market-data). The UI shows a transient "No stocks match" flash before the join completes (track-a-frontend-trader-core). | Persisting a nightly screener snapshot would remove the load-time flash and the cost of the join on every page hit. |
| **Review-readiness recompute is a side-effecting read** | `GET /api/v1/market-data/review-readiness-summary?recompute=true` turns a read into a heavy live recompute (track-b-backend-market-data). | Result of the recompute path isn't consistently persisted; the Readiness Snapshot panel shows all-zeros while the scheduler reports data-through 2026-06-15 (track-a-frontend-admin-1). |
| **Relative Strength computed on the fly, not stored** | UnifiedStockPage reports "Insufficient price history" for Relative Strength despite 39.8M `price_ticks` (track-a-frontend-instrument-research). | RS appears computed at request time from a short window rather than persisted; see also §3 price-chart gap. |
| **Benchmark/alpha never computed *or* persisted** | `signal_outcomes.benchmarkReturnPercent`/`.alphaPercent` **100% null / 106K rows** (track-c-db-signals-snapshots). | The CB-8 Nifty-benchmark enrichment job has never executed. Inputs are local. Listed again under §4 quick wins. |

---

## 3. Data persisted but NOT surfaced (we have it; the UI hides it)

These are the richest opportunities — the data is already in the DB.

| Persisted data | Volume / quality | Where it's missing in the UI | Priority |
|---|---|---|---|
| **`signal_results`** | **43K rows, all core columns populated, daily** | UnifiedStockPage "Signals & History" tab is empty; `GET /api/v1/signals/:id` 404 (track-a-frontend-instrument-research). | **Critical** |
| **`strategy_decision_results`** | **296K rows, fully populated** (largest table in scope) | Signal Position Ledger shows `strategyId`/`strategyRatingGrade` null on all 1,110 rows → "Rule: Unavailable / Grade N/A" (track-a-frontend-admin-2). The decisions exist but aren't joined to the ledger view. | **Critical** |
| **`price_ticks`** | **39.8M rows** (US 32.5M / IN 5.5M / EU 1.7M), history to 1970 | UnifiedStockPage price chart renders **only 1-day** for RELIANCE across all range selectors; full history not surfaced (track-a-frontend-instrument-research). | **High** |
| **`market_delivery_snapshots`** | **211K rows, 100% field coverage**, Jan–Jun 2026 NSE delivery | No prominent trader-facing delivery-% trend/spike view observed in the sweeps. | **High** (delivery-based accumulation signal) |
| **`fo_oi_buildup` / `fo_participant_oi` / `fo_option_metrics`** | `fo_oi_buildup` 1.5K rows; `fo_participant_oi` 28 rows; bhavcopy 371K | `daily_instrument_snapshot.oiBuildup/participantPositioning` **100% null** — derivatives section never assembled onto the instrument page (track-c-db-market-data). | **High** |
| **`signal_outcomes`** | **106K rows**, outcome tracking active (8% resolved) | The resolved outcomes track record isn't shown on the instrument page (Signals tab empty). | **Medium** |
| **`smart_money_context_snapshots`** | **140K rows, fresh** | Surfaced in `/admin/smart-money` but not on trader-facing instrument views. | **Medium** |
| **`corporate_actions`** | **426K rows** (dividends 97.7% populated; splitRatio only 2.2%) | Wired to UnifiedStockPage via `/corporate-actions/:id`; verify it actually renders (split data is thin). | **Low/verify** |
| **`fii_dii_snapshots` / `bulk_block_deals`** | Thin (14 rows / ~1 week) but populated | No dedicated trader flows widget observed. | **Medium** (thin data) |

---

## 4. Quick wins — buildable now from existing DB data (ranked value ÷ effort)

1. **Wire signals onto the instrument page.** `signal_results` (43K rows) + `signal_outcomes` (106K) exist; the UnifiedStockPage Signals tab and `GET /api/v1/signals/:id` (currently 404) just need the per-instrument read path. **Value: high · Effort: low.** *(track-a-frontend-instrument-research, track-c)*
2. **Fix `SNAPSHOT_ASSEMBLER`.** One failing pipeline stage is starving market-pulse, research-overview, workbench, today-review, and portfolio-intelligence snapshots. Fixing it un-blanks multiple trader screens at once. **Value: very high · Effort: unknown until root-caused (likely medium).** *(track-a-frontend-admin-1, track-c)*
3. **Compute benchmark/alpha for `signal_outcomes`.** 100%-null `benchmarkReturnPercent`/`alphaPercent` over 106K rows; Nifty inputs are local in `price_ticks`. Enables "alpha vs benchmark" in signal quality. **Value: high · Effort: medium.** *(track-c)*
4. **Repair the price chart to use full `price_ticks` history.** 39.8M rows available; chart shows only 1 day. **Value: high · Effort: low–medium.** *(track-a-frontend-instrument-research)*
5. **Fix the strategy/rating join in the Signal Position Ledger.** 296K `strategy_decision_results` + 41 `strategy_performance_summaries` exist; the ledger shows "Unavailable" because `strategyId` isn't attached. **Value: medium · Effort: medium.** *(track-a-frontend-admin-2)*
6. **Assemble derivatives into the daily instrument snapshot.** `fo_oi_buildup` data exists; `daily_instrument_snapshot.oiBuildup/participantPositioning` are null. Adds an OI-buildup section to the instrument page. **Value: medium · Effort: medium.** *(track-c)*
7. **Delivery-volume insight view** from `market_delivery_snapshots` (211K rows, 100% coverage) — delivery-% trend / accumulation screen. **Value: medium-high · Effort: low–medium.** *(track-c)*
8. **Smart-money flows widget** from `fii_dii_snapshots` + `bulk_block_deals` (thin but present). **Value: medium · Effort: low** (data is thin, so caveat coverage). *(track-c)*

---

## 5. Larger features — blocked on new external data

| Feature | Needs | From where |
|---|---|---|
| **Multi-currency portfolio valuation** | FX rates (`fx_rates` empty) | RBI reference / free FX feed |
| **Fundamental screener (P/E, P/B, ROE, growth)** | Fundamental ratios (`peRatio` 94% null, `marketCap` 75% null) | NSE XBRL (IN, partially wired) + SEC company-facts (US) |
| **US smart-money intelligence (insider + institutional)** | Form 4 + 13F data (tables don't exist) | SEC EDGAR — services already written, never run |
| **Forward earnings calendar & estimates** | Earnings dates + estimates (`officialResultDate` 72% null; Upcoming tab empty) | NSE board-meetings (IN) + SEC (US) |
| **Macro / regime dashboard** | Macro indicators (UI says "not configured") | Free macro source (rates/inflation/index levels) |
| **Crypto trader experience (reactivation)** | `crypto_events` + asset metadata (both empty); plus a product decision | CoinMarketCal / CoinPaprika — note crypto *price/signal* data is already live |

---

## Appendix A — Operational / data-integrity findings (outside the 5 data-gap buckets but high-value)

- **`SNAPSHOT_ASSEMBLER` FAILED, `WORKBENCH_REFRESH` ABANDONED** in today's run; 4 stages render as "Unmapped Module" (`MARKET_SCAN_REFRESH`, `MARKET_CONTEXT_SNAPSHOT_REFRESH`, `MARKET_PULSE_REFRESH`, `WORKBENCH_REFRESH`) due to missing display-name mapping. *(track-a-frontend-admin-1)*
- **Data Quality decision = `REPAIR_DATA`**: 565 instruments blocked (19%), 995 issue flags (34% of universe); `market_data_repair_states.resolvedAt` 100% null (819 open, none resolved). *(track-a-frontend-admin-1, track-c)*
- **Raw backend error string leaking into trader UI**: TCS Market Context Rail shows `"— SectorSnapshot (no rows for sector=\"Information Technology\")"`. *(track-a-frontend-instrument-research)*
- **Dev/implementation commentary shown as user copy** on the Billing page ("Upgrade prompts are returned by backend gating errors… Future UI flows can show those as modals"). *(track-a-frontend-trader-personal)*
- **~400+ `[MarketDataFoundation]` debug `console.log` entries** fire continuously in the browser; persistent `No routes matched "/derivatives-intelligence"` warning (a stale link — correct route is `/derivatives`). *(track-a-frontend-instrument-research, -admin-1)*
- **Auth gaps** (static): `POST /api/v1/pipeline/commands` has **no auth** (anyone can trigger pipeline runs); `research-hub`, `stock-research-workbench`, `pipeline-orchestration` routers have no `requireAuth`; most business routes silently fall back to a `'default-user'` ID rather than 401. *(track-b-backend-user-account)*
- **Plan change has no confirmation** — a single click on "Select" immediately `POST`s `/subscription/change-plan`. Over-limit usage observed (25 backtest runs against a cap of 5), suggesting usage limits aren't enforced at write-time. *(track-a-frontend-trader-personal)*
- **Dead / disabled endpoints**: 24 endpoints return HTTP 410 `EXTERNAL_PROVIDER_DISABLED_NSE_BSE_ONLY` (legacy Yahoo/provider flows); `SignalPositionLedgerController.activeRows`/`.closedRows` are defined but **not registered** in the router; `signalPositionLedgerEntry` is accessed via `(this.db as any)` with a runtime guard that silently returns empty if the Prisma delegate is absent. *(track-b-backend-market-data, -signals)*
- **Orphaned user associations**: all `backtest_runs` (281) and `backtest_strategies` (4) have null `userId`/`strategyId`; both `Watchlist` rows are user-less holding all 41 items; `user_subscriptions.expiresAt` null for all 21. *(track-c-db-user-crypto)*
- **`activeTab` prop ignored** on `InstrumentDetailPage` — Overview/Prices/Fundamentals tabs render the same layout. *(track-a-frontend-instrument-research)*

## Appendix B — ⚠️ State mutation during recon (needs owner action)

This task was meant to be read-only, but one browser agent, while exercising the Billing screen's controls, clicked "Select" on the **Admin** plan, which immediately `POST`ed `/subscription/change-plan`. **The `test@example.com` user's subscription plan was changed to Admin and not restored** (the downgrade was blocked by the agent's read-only boundary). This is itself evidence of the no-confirmation issue above. **Recommend the owner restore the test user's original plan** via the Billing UI or API. No other writes occurred; all other agents stayed read-only (SELECT-only DB access, no destructive UI actions).

## Appendix C — Inference vs confirmed

All table population figures and the pipeline-stage statuses are **confirmed** (live SQL + live browser). Items explicitly flagged as inference: the *root-cause linkage* from `SNAPSHOT_ASSEMBLER` failure to each individual stale screen is inferred from correlation (failed stage + stale snapshots of the tables that stage writes), not from reading the assembler's error. The Strategy Decision Engine's tabs 4–7 were documented from source, not live, because MUI `<Tabs onChange>` did not fire under browser automation (track-a-frontend-admin-2) — a recon-tool limitation, not a product bug.
