# Business-Logic Audit — Signals / Calibration / Strategies / Backtest (2026-06-04)

Four parallel adversarial read-only audits of the *logic, math, and assumptions* (not structure) behind
the result-producing engines. Goal: data accuracy + trust in results. Severity-ordered. Each item has
file:line evidence in the agent transcripts; this doc is the actionable synthesis.

**Headline:** the engines have several **look-ahead, statistical, and consistency defects that corrupt the
persisted track-record and overstate backtest performance** — plus two regressions in the just-shipped short
pipeline (#34). These jump to the TOP of the backlog because accuracy/trust is the #1 priority. NOTE: the
persisted SignalOutcome corpus + the track-record backfill were computed under some of these defects, so a
**clean regenerate is required after the signals/calibration correctness fixes land**.

---

## CRITICAL (corrupts accuracy/trust or breaks a shipped feature)

1. **marketGate has 4 divergent implementations** — strategy-framework.service.ts:491, signal-generation-engine.service.ts:1300, backtesting-strategy-lab.service.ts:50 still use hardcoded breadth **0.6/0.3**, while strategy-decision-engine (after #37) uses Capital Posture **0.40/0.25**. Same breadth → different gate across paths → backtest regime ≠ live gate, signal regime gate ≠ decision gate. (My #37 only fixed 1 of 4.) → **#42**
2. **Short strategy is DEAD via the decision engine** — `toStrategyFrameworkContext` never maps `derivativesEligible` into `StrategyContext`, so BREAKDOWN_MOMENTUM always hits the `NOT_DERIVATIVES_ELIGIBLE` blocker (`evaluator.ts:342`). AND `adaptFrameworkResult` overrides any non-DEFENSIVE_EXIT strategy to AVOID when gate is CLOSED (`strategy-decision-engine.service.ts:557`) — killing shorts exactly when RISK_OFF validates them. The #34 short pipeline cannot produce a candidate through the main path. → **#43**
3. **Backtest assumes "market open" for all regime-free bars** — `strategyContextFromBars` returns `marketGate='OPEN'` (not 'UNKNOWN') when no snapshot exists (all pre-2019 bars), so the `MARKET_GATE_UNKNOWN` entry-block never fires → gated strategies' pre-2019 performance is overstated (2015-16, 2018, early-2020 RISK_OFF ignored). backtesting-strategy-lab.service.ts:558. → **#44**
4. **Backtest universe `ALL` = first 50 alphabetical + 100% survivorship** — `resolveUniverse` takes page1/50 sorted symbol ASC, today's active stocks only (no delisted). Long-term CAGR is inflated by avoiding every stock that went to zero + alphabetical skew. service.ts:474. → **#45**
5. **Sharpe omits the risk-free rate** — `(avgReturn*252)/vol` with no Rf (~6.5% IN); inflates Sharpe by ~0.4-0.6 and feeds the strategy rating. service.ts:434. → **#44**
6. **Forward-return horizon offset is a position index, not asserted trading-days** — `window[HORIZON_DAYS[h]]` indexes the date-sorted price array; correct ONLY if the series is strictly contiguous trading days. No guard. If any non-trading row sneaks in, every outcome's horizon is wrong → corrupts the persisted corpus. signal-quality-lab.service.ts:1083. → **#47**

## HIGH (accuracy / look-ahead / statistical)

7. **RSI is severely under-smoothed** — input capped at `period*2+1` (29 bars for RSI-14); Wilder needs ~100+ bars to converge → biased RSI feeds the overbought guard + RSI signals across the whole dataset. signal-generation-engine.service.ts:1697. → **#46**
8. **Fundamentals point-in-time uses `periodEndDate`, not filing/announcement date** — backfill signals include a quarter's fundamentals ~45-60 days before they were public → look-ahead inflating historical fundamental quality. service.ts:2053. → **#46**
9. **enrichSignals injects TODAY's price into historical signals** — `getLatestPricesBySymbols`/`listPricesByInstrumentId(2)` attach current price/dailyChange to months-old persisted signals on read. service.ts:757. → **#46**
10. **52-week range mixes adjusted vs raw** — `periodHigh/Low` use `adjusted_close` (retroactively re-based by CAs, non-reproducible point-in-time) while `closePosition` uses raw `high/low` → split stocks show closePosition ≈ -1. service.ts:1835. → **#46**
11. **`syntheticSummaryFromPersistedMetrics` mis-estimates sample depth** — uses MAX sub-group sample as `overallEvaluatedSamples` (under-counts the production persisted path → wrong confidence tier) and `|| MIN_PERSISTED_SAMPLES(200)` fabricates 200 samples when all groups empty (should be passthrough). signal-calibration-engine.service.ts:612. → **#47**
12. **win-rate denominator inconsistency** — `metric().sampleSize` counts NEUTRAL but `winRate()` excludes it; the calibration guard `sampleSize >= MIN_GROUP_SAMPLES` is then checked against a NEUTRAL-inflated count. signal-quality-lab.service.ts:1097/1128. → **#47**
13. **Stale-outcome invalidation window too short** — `markStaleByInstrumentsFromDate` uses 60 *calendar* days but a 60-row horizon spans ~85 calendar days → signals 61-84 cal-days before a CA keep stale forward-returns. repository.ts:159. → **#47**
14. **Score-bucket boundaries differ across paths** — on-demand {0-39,40-69,70-84,85-100} vs scorecard API {0-39,40-59,60-79,80-100} vs calibration buckets → inconsistent metrics + null lookups. service.ts:37 / repository.ts:456. → **#47**
15. **Same-bar fill** — backtest enters/exits at the *current* bar's close after seeing it satisfied the condition (esp. breakout) → look-ahead. Should fill next-bar open. service.ts:291. → **#44**
16. **Walk-forward OOS restarts with fresh initialCapital** — IS end-state (drawdown/positions) not carried into OOS → overfit comparison misleading. service.ts:1012. → **#44**
17. **Backtest sector/smart-money are pure price proxies** — `sectorLeadership`/`smartMoneyStatus` derived from price only; sector/smart-money-gated strategies score far higher in backtest than live. Needs a realism warning. service.ts:563. → **#48**
18. **ADX divide-by-zero** — `smoothedTR==0` (circuit-locked/suspended) → Infinity/NaN → `dx||0` → falsely range-bound → mutes all signals for that name. service.ts:1782. → **#46**

## MEDIUM (correctness / definition / threshold)

19. **Excursion fields not horizon-scoped** — same maxFavorable/Adverse/Drawdown stored for 1D and 60D rows (computed over the full 61-row window) → 1D excursion metrics meaningless. service.ts:461. → **#47**
20. **Calibration DQ double-counting** — `dataQualityAdjustment` (historical snapshot) + `persistedDataQualityAdjustment` (DQE) both fire, stacking up to -14 of the -25 cap on the same gaps. calibration.service.ts:425. → **#47**
21. **modelVersion mixing in metrics** — quality/calibration pool v1/v2/v3 outcomes unless explicitly filtered; should isolate by the calibrated signal's modelVersion. repository.ts:486. → **#47**
22. **DEFENSIVE_EXIT uses raw signal direction, not calibrated** — inconsistent with all other evaluators that prefer calibratedDirection. strategy-decision-engine.service.ts:975. → **#43**
23. **DEFENSIVE_EXIT P&L/allocation unit ambiguity** — thresholds assume fractions (-0.20, 0.15) with no clamp/guard; if a portfolio stores percent-integers every losing position maxes urgency. service.ts:1006. → **#43**
24. **BREAKDOWN_MOMENTUM SMA200 is a soft warning, not a block** — "long-term downtrend confirmation" doesn't actually gate; plus neutral-sector hard-blocks (stricter than any long strategy) and minScore=70 vs max 80 leaves almost no headroom. registry.ts:229/253, evaluator.ts:350/361. → **#43**
25. **SIX_MONTH_ACCELERATION uses arithmetic 3M/3 not geometric** — biased to fire in bull markets. service.ts:990. → **#46**
26. **OBV accumulates over full 520-bar window** — ancient high-volume day dominates current OBV level. service.ts:2373. → **#46**
27. **OUTPERFORMING_PEERS votes bullish at `>=0`** — 0.01% rel. outperformance = full bullish vote. service.ts:1004. → **#46**
28. **PARABOLIC_RUNUP not volatility-normalised** — penalises legit single-day earnings gaps as blow-off tops; no earnings-window exclusion. service.ts:981. → **#46**
29. **`getBacktestConfig` end=new Date() (wall-clock)** — saved/historical strategy re-evaluation rated against an ever-expanding future window. evaluator.ts:85. → **#44**
30. **Legacy evaluators fire silently as fallback** with different weights than the registry when the framework provider returns null. strategy-decision-engine.service.ts:388. → **#43**
31. **`groupStatus` SMALL_SAMPLE uses `< HORIZON_DAYS[h]`** — conflates window-length with sample-size (60 outcomes needed at 60D). service.ts:1264. → **#47**
32. **No CI / low-sample flag on surfaced win-rates** — 60% from 22 samples shown identically to 60% from 500. → **#48**
33. **CAGR years denominator mismatch** strategy(full window) vs benchmark(first-entry→end) → excessCagr not apples-to-apples. service.ts:423. → **#44**
34. **EQUAL_WEIGHT sizing drifts with iteration order** — same-bar multi-entry denominator doesn't decrement → alphabetical bias. service.ts:293. → **#44**
35. **holdingDays calendar vs maxHoldingDays trading-bar** mismatch. service.ts:408/735. → **#44**
36. **confidenceFor MEDIUM branch lacks `!isStale` guard** — false-MEDIUM on stale backfill bars. service.ts:2312. → **#46**
37. **DQ filter zero-outs entire asOf backfill run** when no historical DQ snapshot exists (catch → excludes all). service.ts:386. → **#46**
38. **evidenceFactor agreement floor 0.4** prevents genuinely-mixed setups from compressing to 50 → NEUTRAL under-represented. service.ts:1897. → **#46**

## LOW (hygiene / minor)

- profitFactor null (not Infinity) on zero-loss → rating penalises perfect strategies (service.ts:438) → #44.
- barAtOrBefore O(n²) equity computation (perf) → #44.
- liquidityStatus 'UNKNOWN' blocks entry when volume sparse in DB → #48.
- backtest RSI seed-only (no Wilder smoothing) (service.ts:668) → #44.
- LOW_CONFIDENCE_SIGNAL emits one noise item per signal not per instrument → #47.
- nextEvaluableDate calendar-ms not trading-day (service.ts:1197) → #47.
- isTrustedReadSignal duplicated in service + repo → #46.
- adjustedClose null silently substituted with raw close (service.ts:2341) → #46.
- closePosition null on circuit days silently skips 52w signals (service.ts:1831) → #46.
- lifecycle exitScoreThreshold comment stale (says 70, v3 is 60) (signal-lifecycle.ts:8) → #46.
- PULLBACK RSI zone includes 65 (overbought-ish) (registry.ts:108) → #43.
- RESISTANCE_CLOSE fallback 0.99 tolerance treats 1%-below-high as breakout (evaluator.ts:250) → #43.

---

## Re-prioritization → new tasks (trust-critical first)

- **#42** marketGate single-source across all 4 implementations (Critical consistency).
- **#43** Strategy correctness: revive short pipeline (derivativesEligible→ctx, drop AVOID-on-CLOSED for shorts), SMA200 block, neutral-sector soft-warn, headroom, calibrated-direction for DEFENSIVE_EXIT + unit guards, legacy-fallback labeling, minor thresholds.
- **#44** Backtest realism+math: regime UNKNOWN fallback, Sharpe Rf, next-bar fill, OOS capital chaining, CAGR denominator, sizing drift, holdingDays, profitFactor, getBacktestConfig endDate, backtest RSI smoothing, perf.
- **#45** Backtest universe survivorship + representative sampling + delisted inclusion + hard warning.
- **#46** Signals look-ahead+accuracy: RSI smoothing, fundamentals filing-date lag, enrichSignals historical-price leak, 52w adjusted/raw, ADX zero-TR, confidenceFor staleness, DQ-asOf zero-out, evidence floor, SIX_MONTH geometric, OBV window, peers threshold, parabolic, adjustedClose-null filter, dedup trust predicate.
- **#47** Calibration/outcomes correctness: forward-return trading-day guard, syntheticSummary sample-count + drop fabricated 200, win-rate/sampleSize NEUTRAL, markStale 90-day, score-bucket unify, excursion per-horizon, DQ double-count, modelVersion isolation, groupStatus, dedup low-conf, nextEvaluableDate.
- **#48** Trust labeling: backtest price-proxy/regime-unavailable/warm-up/liquidity warnings + low-sample CI flag on win-rates.
- **#49** REGENERATE backfill + outcomes after #46/#47 land (trustworthy track record) — replaces the interim corpus.
- **#50** P3 umbrella for residual Low items.

**New order: Wave A = #42→#47 (correctness/trust) → #48 (labeling) → #49 (regenerate) → then prior #37 P2 + #50 P3 → #41 (Nifty source).** Rationale: these defects directly corrupt accuracy and the persisted track-record (the thing that earns trust), and two break the just-shipped short pipeline — so they precede all cosmetic/feature P2 work.
