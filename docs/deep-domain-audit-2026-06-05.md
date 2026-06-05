# Deep Domain Audit — Investment Scanner (NSE/BSE)

> **Date:** 2026-06-05. **Method:** 6 parallel domain-expert agents read the actual code across all 27 modules + schema + ingestion scripts; the most load-bearing P0/P1 claims were then spot-verified against source by the lead. **Stance:** brutally honest, domain-expert (Indian-market), focused on business-logic gaps, correctness defects, and high-value missing features — NOT generic code quality.

This audit is **deeper than** `module-audit-backlog-2026-06.md` and `business-logic-audit-2026-06.md`. Where those found per-module bugs, this one finds **systemic patterns** and **product-level gaps**. Known/already-fixed items are not re-litigated except where the fix was partial.

---

## VERDICT (read this first)

The platform has genuinely impressive breadth and the recent correctness work (look-ahead fixes, regime gating, persisted outcomes, single-sourced market gate) was real. **But the deep audit exposes a hard truth that cuts against the "data accuracy first / GIGO" directive: the foundation has a silent scale-mismatch bug that quietly corrupts indicators on every stock that ever split or issued a bonus, and the "trust loop" the charter prioritizes is leakier than the roadmap notes claim.** Three things stand out:

1. **The data foundation is not as accurate as believed.** Only `adjustedClose` is stored — open/high/low/volume remain *raw*. Every indicator touching H/L/V (ATR, ADX, OBV, volume breakouts, stop sizing) mixes price scales on post-bonus/split stocks (RELIANCE, etc.). This is literal GIGO and it's invisible because the *close* looks right.

2. **The "trust loop" is partly cosmetic.** Calibration is computed but never applied to the served/operational score — and it even *mislabels direction* (BULLISH at 70 vs the engine's 60). The track record is measured in **absolute returns** over a 2019–25 bull market (beta, not skill), with **survivorship bias** in the backfill universe. The numbers shown for "can I trust it?" are systematically flattering.

3. **The product doesn't tie together into a trader's day.** The modules exist but the workflow doesn't: Trade Journal has **no UI at all**, the AI Copilot **isn't in the nav**, there's **no morning briefing**, **no cross-module conflict detection** (today-review can say LONG while portfolio says EXIT for the same stock), and **no automated daily scheduler** the trader can rely on for the 9:15 open.

And as a domain expert, the single biggest **value lever**: the app constrains itself to NSE/BSE-only but **doesn't ingest most of what NSE/BSE gives for free** — delivery %, FII/DII flows, bulk/block deals, ASM/GSM surveillance, F&O ban list, India VIX, PCR/OI, index constituents. That free data *is* the Indian-market edge.

---

## CROSS-CUTTING META-FINDINGS (the patterns that recur)

These are the root patterns; the specific findings below are instances.

- **M1 — Only the close is adjusted.** The whole stack assumes "adjustedClose is enough." It isn't: ATR/ADX/OBV/breakout/stop-sizing all consume raw H/L/V against an adjusted close. (Confirmed: schema:21, signal svc:1838.)
- **M2 — Computed-but-not-applied.** Calibration is the headline case (raw score is what flows to ledger/lifecycle/today-review; calibrated score is display-only), but the pattern repeats: holiday calendar exists but isn't fed to staleness; sector-exposure rule exists but `sectorExposureAfterTrade` is always null; quiet-hours stored but never enforced.
- **M3 — Absolute ≠ alpha.** Win-rates, forward returns, backtests, and the track record all measure *absolute* return in a structural bull market. No benchmark-relative metric exists anywhere on the served surfaces (the Nifty series is still blocked from ingest). Every "edge" number is beta-inflated.
- **M4 — Survivorship everywhere.** Backfill universe = today's active/non-delisted stocks; backtest ALL = today's top-50 by market cap. Both silently exclude the losers, inflating every historical stat.
- **M5 — Modules are siloed; the daily workflow isn't built.** No morning briefing, no journal UI, no copilot nav entry, no cross-module conflict surfacing, no reliable scheduler. The 5 "jobs" exist as pages but not as a *flow*.
- **M6 — Free NSE/BSE data left on the table.** Delivery %, FII/DII, bulk/block deals, ASM/GSM, F&O ban, India VIX, PCR/OI, index constituents — all free, all absent. This is the largest untapped value source.

---

## P0 — TRUST-CRITICAL (verified against source)

### P0-1. OHLC and volume are never corporate-action adjusted (only close is)
- **Evidence:** `schema.prisma:21` (`adjustedClose` is the only adjusted field); `signal-generation-engine.service.ts:1838-1841` (ATR True Range = `max(raw_high-raw_low, |raw_high - prev.adjusted_close|, |raw_low - prev.adjusted_close|)`); repository selects only `timestamp,close` for raw bars.
- **Impact:** On any post-bonus/split stock, ATR is inflated ~2× for days after the event → stops 2× too wide → position sizes halved; ADX/OBV/volume-breakout signals corrupted; 52-week logic was patched but consumers still mix scales. This is the GIGO the data-accuracy directive was meant to prevent.
- **Fix:** Add `adjustedOpen/High/Low` (× factor) and `adjustedVolume` (÷ factor) to `PriceTick`; recompute in the adjustment engine; switch all indicator consumers to adjusted OHLCV.

### P0-2. Calibration is computed but never applied — and mislabels direction
- **Evidence:** `signal-calibration-engine.service.ts:1324` (`score >= 70 → BULLISH`) vs `signal-generation-engine.service.ts:129` (`DIRECTION_BULLISH_THRESHOLD = 60`). Served `score` is the raw score (service stores `result.score`); ledger/lifecycle/today-review all key off raw `score`, not `calibratedScore`.
- **Impact:** A stock scoring 60–69 is BULLISH/ENTRY in the engine but NEUTRAL per calibration — the UI can show "calibrated: NEUTRAL" next to an ENTRY candidate. The entire calibration subsystem (separate service, persisted rows, UI surfacing) has **zero operational effect**. This directly undermines Job 4 ("can I trust it?").
- **Fix:** Unify the cut-points as shared constants (60/40). Decide one authoritative score; when calibration is USABLE/LIMITED, rank/gate on `calibratedScore`.

### P0-3. Portfolio is a "dead ledger" — no realized P&L, no cost-basis engine
- **Evidence:** `portfolio-management.service.ts:142-149` (`createTransaction` just writes the row), `:108-109` (summary computes only `totalValue - totalInvested` from `quantity × averageCost`). No FIFO/WAC, no `realizedPnL`, transactions never read back into holdings.
- **Impact:** After any partial sell, `totalInvested` and unrealized P&L are wrong (still valued as the full original position); realized gains are never tracked. Job 5 ("what do I hold?") returns provably incorrect numbers.
- **Fix:** WAC/FIFO recompute on every BUY/SELL; persist `realizedPnL`; split `totalInvested` into open-cost-basis vs total-cost-basis; add `totalRealizedPnL` to the DTO now (before API stabilizes).

### P0-4. Corporate actions never adjust holdings (quantity & cost basis)
- **Evidence:** No CA-read path in `portfolio-management`/`portfolio-intelligence`. Price ticks are adjusted but the holding's own `averageCost` is the raw purchase price.
- **Impact:** Bonus/split halves `adjustedClose` but leaves `averageCost` unadjusted → holding shows a phantom ~50% loss permanently. P&L sides are on different price scales (svc:280 uses adjustedClose vs unadjusted averageCost).
- **Fix:** On CA effective-date, adjust holding `quantity × ratio` and `averageCost ÷ ratio`, idempotently logged. (Depends on a clear adjusted/raw convention.)

### P0-5. Smart-money is a permanent stub presented as institutional evidence
- **Evidence:** `smart-money-intelligence.provider.ts:4-15` (`fetchInsiderOwnership` always returns MISSING); score is 100% price-volume inference.
- **Impact:** "Smart money accumulation" is shown with no actual institutional data while FII/DII bulk/block-deal files (free, daily) sit un-ingested. Misleading by label.
- **Fix:** Ingest NSE bulk-deals, block-deals, FII/DII provisional flows (all free CSV/JSON). See M6.

### P0-6. Spike rejection is OFF by default
- **Evidence:** `market-data-foundation.validation.ts:141-147` — threshold 0 unless `MARKET_DATA_REJECT_PRICE_SPIKES=1`.
- **Impact:** One bad bhavcopy tick (decimal error) propagates and poisons `adjustedClose` recompute for all prior bars.
- **Fix:** Default-on with a 50% single-day guard for EQ (tighter for large-caps, given 5/10/20% circuits).

---

## P1 — HIGH-VALUE CORRECTNESS & METHODOLOGY

### Data foundation
- **Rights issues skipped entirely** — no TERP adjustment, not even stored (`corporate-actions-source.ts:270-321`). Phantom 10–30% gaps pre-ex-date. TERP is computable from NSE subject + close.
- **Mergers/demergers/spin-offs unhandled** — e.g. Reliance→Jio Financial demerger (Jul-2023), HDFC/HDFC Bank merger; silently dropped (`corporate-adjustment.ts:30` action types exclude them).
- **T2T (BE)/BZ/SME series mixed into the equity universe** (`exchange-eod-adapter.ts:92`) — different microstructure & circuits pollute signals/breadth.
- **Holiday calendar not fed to DQ staleness** — `isPriceStale` always runs `calendarUncertain` (weekend-only); the working NSE holiday fetcher is never injected (M2).
- **No symbol-rename history / ISIN not used as price-continuity anchor** — renamed symbols (CAIRN→VEDL etc.) truncate backtest history; BSE-NSE fill not ISIN-validated → wrong-stock price-mixing risk.

### Signals & calibration
- **All metrics are absolute, not benchmark-relative** (`signal-quality-lab.service.ts:1235`, backfill:71) — beta-inflated win-rates (M3).
- **Next-bar fill not applied in outcome measurement** — entry uses signal-day close (`quality-lab:1025`), inflating 1D/5D returns by the overnight gap. (Backtest `runSegment` OOS path has the same same-bar look-ahead.)
- **Survivorship in backfill universe** (backfill:36) — only today's survivors generate historical signals (M4).
- **ADX warm-up = 29 bars** (`signal svc:1819`, `period*2+1`) — far short of the ~3×period Wilder needs; the range-bound gate (ADX<20) mutes valid trend signals. (Note: RSI undersmoothing *was* fixed to ~140 bars; ADX was missed.)
- **Calibration boost threshold (58% win-rate) is undocumented and may never fire** once returns are alpha-adjusted.

### Strategy / backtest / risk
- **India transaction costs grossly understated** — flat 0.1% misses STT, exchange fees, SEBI, stamp duty, GST, DP; realistic delivery round-trip ≈ 0.35–0.55% (`evaluator.ts:109`). Turns marginal strategies negative.
- **RSI uses simple-average RS, not Wilder smoothing** in backtest/decision (`backtesting svc:860`) — disagrees with every charting platform exactly in the 40–60 entry zone.
- **Stops checked against EOD close, not intrabar/gap** (`backtesting svc:570`) — gap-through and lower-circuit risk invisible; stop frequency understated, P&L inflated.
- **`sectorExposureAfterTrade` always null** (`trade-plan-risk-engine.service.ts:655`) — the 30% sector-concentration rule never fires (M2). Banking/IT/Energy each ~25–35% of the index.
- **SELECTIVE gate requires score > 85** (`strategy-decision-engine.service.ts:593`) hardcoded — since SELECTIVE is the *common* Indian regime and strategies score 70–80, the tool produces almost no candidates most of the time.
- **BREAKDOWN_MOMENTUM short un-backtestable** — `derivativesEligible` never threaded into `strategyContextFromBars` → every short entry blocked "eligibility not confirmed."
- **No portfolio heat / Calmar / Sortino / exposure / turnover / regime-segmented stats / Monte-Carlo** — the rating is incomplete for drawdown-sensitive Indian traders.

### Market intelligence / posture
- **Breadth universe is unfiltered page-1 of 500** (`market-context-intelligence.service.ts:385`) — junk/SME/illiquid names pollute breadth; should be Nifty 500 constituents.
- **Regime score over-weights a single 63-bar mean return (35%)** and hits RISK_ON at ~7.5% mean return regardless of breadth; **no index-trend input**; null return defaults to neutral-favoring 50 (M2/M3). False RISK_ON in narrow rallies → max-deployment at the top.
- **A/D is a point-in-time ratio, not a cumulative line** — no A/D line, McClellan, or new-high/low index; raw counts not even persisted (can't reconstruct).
- **Earnings blackout not wired into Today-Review** — a stock with results in 2 days can be a LONG_REVIEW grade-A candidate; `EarningsIntelligenceService` exists but isn't consulted.
- **Capital-posture band has a 25–40% dead zone** (`capital-posture.types.ts:31`) — no valid category for a trader at 35% invested.

### Portfolio / alerts / human-loop
- **Quiet-hours stored but never enforced** anywhere in delivery or evaluation.
- **Alert dedupe is JSON-stringify-fragile + no cooldown** — portfolio alerts include a changing float (`unrealizedPnLPercent`) so dedupe never matches → N events/holding/run; inbox floods.
- **Scheduled `evaluate()` silently skips all real-user rules** — passes ambient `userId` (undefined→'default-user'/null) instead of `rule.userId`; alerts for real users never fire via the batch path.
- **Missing-price holding contributes marketValue=0** → phantom −100% loss drags portfolio totals & health score.
- **No XIRR/CAGR/benchmark** — can't answer "did I beat a Nifty index fund?"; no `purchaseDate` to even compute it.
- **No STCG/LTCG tax awareness** — no holding-period, no "days-to-LTCG" alert, no Jan-31-2018 grandfathering; central to Indian investing.
- **Missing alert types** — earnings-on-holding, stop-hit, target-hit, LTCG-window, portfolio-total-drawdown (the most actionable ones).

### Product / cross-cutting
- **Trade Journal has no frontend at all** — the one module that closes the idea→outcome loop is invisible (no route, no nav, no UI). Post-mortem analytics are unreachable.
- **AI Copilot is not in the nav** (`navigationMetadata.tsx`) — the only 5-jobs synthesis view can't be discovered.
- **No cross-module conflict detection** — today-review LONG vs strategy EXIT_CANDIDATE vs portfolio bearish for the same stock are never reconciled; the copilot fetches all four but never flags the contradiction. Highest real-harm scenario.
- **`riskFactors` duplicates `bearishFactors` verbatim** (`ai-...service.ts:315`) — every risk shown twice; trains the user to distrust the copilot.
- **`safeLanguage` covers only 4 literal phrases** (svc:515) and doesn't sanitize `pipelineExplanation`/strategy reason strings ("enter"/"exit") — research-support-language compliance gap.
- **`dataStatus: 'COMPLETE'` false positive** — "no strategy decision" / "not in today-review" gaps are excluded from PARTIAL, so a green badge appears when key stages never ran.
- **No reliable daily scheduler** — `setInterval` resets on restart; no cron/DB-backed next-run; a 15:45 restart leaves signals/posture/today-review stale for the next open. No force-cancel for a hung run (20-min stale wall).

---

## THE BIGGEST VALUE LEVER: free NSE/BSE data not ingested

All free, all daily, all NSE/BSE-official (honors the hard constraint), all high-signal for Indian markets:

| Data | Why a trader needs it | Free source |
|---|---|---|
| **Delivery %** (per stock) | Accumulation vs intraday churn — the best EOD volume-quality filter | NSE bhavcopy (already fetched) |
| **FII/DII daily provisional flows** | The dominant Indian regime signal; FII outflow in a "bullish" tape = false RISK_ON | NSE FII/DII archival CSV |
| **Bulk & block deals** | Real institutional footprints (vs the stubbed smart-money) | NSE bulk/block-deal CSV/API |
| **ASM/GSM surveillance** | Don't surface long signals on GSM-4 names; restricts shorting/margin | NSE/BSE surveillance reports |
| **F&O ban list** | A short/long on a banned name isn't actionable | `fo_secban.csv` (daily) |
| **India VIX** | Best fear gauge; cap posture at NEUTRAL when VIX>22 | NSE index bhavcopy (same file as Nifty) |
| **Nifty PCR / F&O OI** | Positioning / contrarian extremes | NSE F&O bhavcopy |
| **Index constituents & weights** | Defines the breadth/benchmark universe; liquidity proxy | NSE index constituent CSVs |
| **F&O lot sizes** (`fo_mktlots.csv`) | Position sizing for F&O names (currently hardcoded/0) | NSE archives |
| **Historical Nifty series** | Unblocks benchmark-relative (alpha vs beta) everywhere | index bhavcopy archive / niftyindices (the live API is Akamai-blocked) |

Adding even the first three (delivery %, FII/DII, bulk/block) would do more for genuine signal quality than any amount of indicator tuning.

---

## RECOMMENDED SEQUENCING (value-first)

**Wave A — Foundation truth (unblocks everything; honors GIGO directive)**
1. P0-1 adjusted OHLCV + reprocess (the silent corrupter).
2. P0-6 spike rejection on; rights/merger/demerger CA coverage (P1).
3. Ingest **delivery %** + **historical Nifty** (the latter unblocks M3 alpha everywhere).

**Wave B — Make the trust loop real (Job 4)**
4. P0-2 apply calibration + unify cut-points.
5. Benchmark-relative outcomes/backtests; fix next-bar fill in outcome math; point-in-time (delisting-aware) backfill universe; ADX warm-up.
6. Honest sample-size/confidence badges on every win-rate surface.

**Wave C — Make it a daily tool (Jobs 1,2,5 + workflow)**
7. P0-3/P0-4 portfolio realized-P&L + CA-adjust holdings; missing-price exclusion; XIRR + Nifty benchmark; STCG/LTCG + days-to-LTCG alert.
8. Trade Journal UI; Copilot in nav; **Morning Briefing home** (posture + pipeline freshness + long/short/exit counts + portfolio red flags + unread alerts); cross-module conflict detection.
9. Reliable scheduler (cron/DB next-run) + force-cancel; quiet-hours + alert cooldown + `rule.userId` fix + the missing alert types.

**Wave D — Indian-market edge & depth**
10. FII/DII, bulk/block deals (retire the smart-money stub), ASM/GSM, F&O ban, India VIX (posture cap), PCR/OI, index constituents (breadth universe), market-cap-band breadth, cumulative A/D line.
11. India transaction-cost model + intrabar/gap stop realism in backtests; sector-exposure & portfolio-heat enforcement; SELECTIVE-gate threshold sanity; regime-segmented + Monte-Carlo backtest stats.

---

## NOTE ON CONFIDENCE
- **Spot-verified against source by the lead:** P0-1, P0-2, P0-3, and the copilot `riskFactors`/`safeLanguage` findings. These are real.
- The remaining findings are agent-reported with cited file:line and are high-confidence, but each should get a quick read before the fix lands (standard review discipline). A few items (e.g. exact behavior of `evaluate()` userId path, some today-review classifications) warrant a focused trace before implementing.
- Full per-agent findings (with every file:line) are preserved in this session's transcript; this doc is the consolidated, deduped synthesis.
