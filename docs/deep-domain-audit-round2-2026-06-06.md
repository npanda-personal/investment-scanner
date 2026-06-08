# Deep Domain Audit — Round 2 (Investment Scanner, NSE/BSE)

> **Date:** 2026-06-06. **Method:** 6 parallel domain-expert agents, this time sliced by **cross-cutting theme** (not module) to go deeper than Round 1 (`deep-domain-audit-2026-06-05.md`). Each agent read the Round-1 report and was told to find NEW findings only. Read-only; no code changed. The most consequential/surprising new claims were spot-verified against source by the lead.
>
> **Round 1 found the systemic data + trust + workflow defects. Round 2 goes under them:** the *statistical* foundation of the trust layer, the *tradability* of the output, the *absence of F&O*, the *missing discovery engine*, the *shallowness of fundamentals*, and the *frontend's inability to support a decision.*

---

## VERDICT (read this first)

Round 1's headline was "the foundation isn't as accurate as believed, the trust loop is cosmetic, the product doesn't tie into a trader's day." Round 2 sharpens all three and adds three more that are, frankly, more structural:

1. **The trust layer isn't just unapplied — it's statistically invalid.** Even if calibration were wired in (Round-1 P0-2), the numbers feeding it are noise: hundreds of hypotheses tested with **zero multiple-testing correction**, **overlapping forward-return windows** that overstate significance by ~4–8×, **calibration fit and evaluated on the same corpus** (no held-out set), and **bull-market base rates** (~60% of 20-day windows were up in 2019–25) never subtracted. "62% win-rate, HIGH confidence" can be pure curve-fit. *This is the deepest problem in the codebase.*

2. **F&O is structurally absent — the "long+short symmetry" goal is hollow.** The approved F&O UDiFF source is **discarded at the parser** (`DISALLOWED_INSTRUMENT_PREFIXES = ['FUT','OPT','IDX',...]`), so OI, futures price, basis, PCR, max-pain — the *entire* Indian F&O analytical framework — are impossible. The F&O **ban list is ingested but never consulted** by any pipeline (verified: empty grep outside its own module). Shorts can't actually be held overnight (no stock-futures/lot-size/expiry modeling). The product recommends shorts it cannot make executable.

3. **The output may not be tradable.** Liquidity is gated on raw **share-count** (1M shares), not rupee turnover — a ₹2 stock at 1M shares (₹20L/day) scores identically to a ₹2,000 stock (₹200Cr/day). Position size is **never capped against ADV** (plans can suggest buying days of volume). No cost-to-trade, no lot-size, no overnight-gap/staleness warning. Picks can be physically un-actionable.

4. **"investment-scanner" has no scanner.** There is **no trader-facing screener** of the 2,937-stock universe. The three discovery pages (Trader Setup / Compounder / Risk Radar) are **dead stubs** ("backend not available yet"). Relative-strength rank — the #1 Indian momentum sort — is a hardcoded `null`. Discovery = a fixed 40-name pre-computed board. The core trader job (find ideas) is underbuilt.

5. **Fundamentals are ~10% built.** XBRL extracts **3 facts** (`revenue|netIncome|eps`) of 50+ available in the same files. No PB, ROE, ROCE, EV/EBITDA, debt/equity, interest-coverage, CAGR, or valuation-context. BFSI (~35% of the index) is "analyzed" with PE, which is meaningless for banks. No quality/red-flag layer (promoter pledge, Piotroski, Altman, accruals) — the platform can't tell a compounder from a fraud with positive EPS.

6. **The frontend can't support a decision.** There is **no candlestick chart anywhere** — only close-line charts; a trader cannot see ranges, wicks, or where entry/stop/target sit. R:R and position size are hidden behind an **admin-only route**. No single screen unifies chart + signal + levels. Currency is formatted `INR 1420.50` (no ₹, no Indian grouping) on the exact pages where the trader reads stop prices.

---

## CROSS-CUTTING META-FINDINGS (Round 2)

- **M7 — The evidence is statistically unsound, not just unapplied.** Multiple-testing, overlapping samples, in-sample calibration, base-rate/regime confounding, survivorship. The track record measures *market participation*, not *skill*. (Round 1 said calibration is ignored; Round 2 says the inputs were noise anyway.)
- **M8 — "Ingested but never consulted" is a recurring shape.** F&O ban list (whole service, never called), holiday calendar (Round 1), sector-exposure rule (Round 1), trading-calendar staleness. The team builds the capability then never wires it into a decision.
- **M9 — "Façade ahead of compute."** Full type definitions, UI shells, and nav routes exist for screeners/radars/fundamental ratios that have **no backend**. Looks near-complete to a code reader; delivers "unavailable" to a trader.
- **M10 — Tradability is assumed, never checked.** Every layer (signal → plan → board) assumes a candidate is liquid, shortable, lot-sizeable, and still-valid-tomorrow. None is verified. The gap between "research candidate" and "executable trade" is unmodeled.
- **M11 — The Indian-specific domain is generic-ized.** BFSI valued on PE; momentum thresholds not volatility-scaled (Round 1); costs flat-rated; circuits/ASM/GSM/ban ignored. The app treats NSE like a generic equity feed, discarding exactly the structure that defines the Indian edge.

---

## THEME A — Statistical validity of the trust layer *(the deepest problem)*

All verified-plausible from cited code; the agent traced the full signals→outcomes→calibration→backtest chain.

- **A1 [P0] No multiple-testing correction anywhere.** ~(20 signal types × 4 buckets × 5 horizons × sectors) hypotheses tested on one price history; zero Bonferroni/FDR. "Edge" is the most-flattering subset of tests. `signal-calibration-engine.service.ts:428`, `validate-v2-backfill.ts:61`.
- **A2 [P0] Overlapping forward-return windows.** Consecutive-day 20D outcomes share 19 days → autocorrelated → standard errors ~√20 too small → every CI / "HIGH confidence" label is wrong. Effective N ≈ rawN / horizonDays. `signal-quality-lab.service.ts:1151`, `repository.ts:296`.
- **A3 [P0] Calibration fit AND evaluated on the same corpus.** Thresholds (0.58 / 0.45) were chosen by reading the same data calibration then "validates" on. No held-out period. In-sample fit presented as evidence. `signal-calibration-engine.service.ts:428`.
- **A4 [P0] Base-rate / regime confounding.** 2019–25 was a bull market; ~60% of 20D windows were up unconditionally. Win-rates aren't compared to that base rate, so calibration boosts reward beta. `byRegime` is computed but never fed to calibration. `backfill-track-record.ts:26`.
- **A5 [P0] Dividend-adjusted close silently falls back to raw close** when `adjustedClose` is null → price-return not total-return, no warning → high-dividend (BFSI/PSU) names chronically understated. `signal-quality-lab.service.ts:1323`.
- **A6 [P1] Walk-forward OOS (`runSegment`) still has same-bar fill + the denominator-drift sizing bug** — the main-loop fixes were never ported, so the "honest OOS" used to compute `overfitFlag` is itself look-ahead-biased. `backtesting-strategy-lab.service.ts:1478,1472`.
- **A7 [P1] Confidence label "HIGH at N=100"** ignores A2; for 20D that's ~5 independent obs. `signal-quality-lab.types.ts:20`.
- **A8 [P2] Historical universe uses current market-cap/survival** (look-ahead in universe construction); `Date.now()`-based noise/staleness checks disable themselves for historical signals; per-horizon adjustment cap derived from global N lets N=20 groups get ±10 nudges. `backfill-track-record.ts:34`, `signal-quality-lab.service.ts:1222`, `signal-calibration-engine.service.ts:643`.

**Implication:** The honest headline for Job 4 today is *"directional tilt at 10–60D, beta-confounded, not yet shown to exceed chance after correction."* Anything stronger is overclaiming.

## THEME B — F&O / derivatives & short-side *(structurally absent)*

- **B1 [P0] F&O UDiFF discarded at the parser** (`exchange-eod-adapter.ts:91,374`) — OI, futures price, basis, settlement, options chain never stored. The four canonical OI states (long/short buildup, short covering, long unwinding) — the core Indian F&O framework — are impossible. Smart-money "ACCUMULATION" is price-volume inference mislabeled as institutional.
- **B2 [P0] F&O ban list ingested but never consulted** (verified empty grep outside `smart-money/fno-ban`). A banned stock can surface as a SHORT_REVIEW grade-A VALID plan — unexecutable.
- **B3 [P0] Short position sizing ignores lot size** — suggests fractional F&O quantities (e.g., 12 shares where the lot is 250); `lotSize` is stored but never fetched into the plan. `trade-plan-risk-engine.service.ts:627`.
- **B4 [P0] No expiry awareness** — last-Thursday expiry, rollover cost, expiry-week anomalies unmodeled; a 45-day short "plan" can't be held in one contract. Absent everywhere (deterministic, needs no data).
- **B5 [P1] No stock-futures vs cash-intraday distinction** — cash shorts are intraday-only in India; multi-day SHORT_REVIEW plans imply an overnight cash short that's illegal for retail. No warning. `assetType` always `STOCK`.
- **B6 [P1] Today-Review gives shorts 0 dedicated board slots** — `SHORT_REVIEW` shares the 5-slot EXIT_RISK bucket vs 20 guaranteed long slots → directionally asymmetric exactly when shorts matter most (RISK_OFF). `today-trade-review.service.ts:57`.
- **B7 [P1] BREAKDOWN_MOMENTUM backtest marks the *entire* universe derivativesEligible=true** → rating includes non-shortable cash/SME names. `backtesting-strategy-lab.service.ts:1036`.
- **B8 [P1] `percentBelowEntry` is semantically inverted for shorts** (stores % *above* entry) — any consumer not branching on direction computes negative risk. `trade-plan-risk-engine.types.ts:98`.
- **B9 [P1/P2] Missing F&O analytics:** MWPL 85–95% pre-ban band; PCR/max-pain/OI-at-strike; basis/cost-of-carry in short expected return; roll cost in backtest; Nifty-futures/put portfolio beta-hedge (the missing bridge from capital posture → action).

## THEME C — Tradability & execution realism

- **C1 [P0] Liquidity gate uses share-count, not rupee turnover** — ₹2×1M (₹20L/day) == ₹2000×1M (₹200Cr/day). Verified `data-quality-engine.service.ts:553`. Fix: ADTV = avgVol20 × avgClose (NSE bhavcopy has TOTTRDVAL directly).
- **C2 [P0] Position size never capped at % of ADV** — `qty = floor(maxRisk/riskPerShare)` can exceed days of total volume; entry/stop/RR become fiction on small/mid-caps. `trade-plan-risk-engine.service.ts:627`.
- **C3 [P0] F&O short gate via `Boolean(decision.derivativesEligible)`** — null→false silently blocks valid F&O shorts in batch (or, if undefined reaches the geometry guard's `=== false`, bypasses the gate). Needs a tristate. `service.ts:228`, `geometry.ts:68`.
- **C4 [P1] Zero cost-to-trade surfaced** — targets/RR are gross; India delivery round-trip ~0.4–0.6% (STT, stamp, exchange, GST, DP) turns a 2R into ~1.8R. `service.ts:549`.
- **C5 [P1] No plan freshness / overnight-gap warning** — EOD entry zone served at 9:15 next day; a 1.5% gap blows through a 1% stop with no caveat. `service.ts:342`.
- **C6 [P1] High-priced-stock / min-capital conflict** — MRF/Page silently blocked (qty 0/1 vs 10% cap) with no "minimum capital required" guidance. `service.ts:50,634`.
- **C7 [P2] Entry zone not checked vs daily circuit band; no plan-validity/expiry window; ATR stop uses raw H/L SMA not true-range Wilder.** `service.ts:383,313`.

## THEME D — Stock discovery & screening *(the "investment-scanner" has no scanner)*

- **D1 [P0] No trader-facing universe screener.** The only screener endpoint is admin-routed and supports just direction/sector/minScore/search — none of price-band, market-cap tier, RSI range, % from 52w-high, volume surge, delivery%, PE/PB, above/below SMA (the Chartink/Screener.in staples). `signal-generation-engine.validation.ts:44`, `routes.tsx:50`.
- **D2 [P0] Trader Setup / Compounder / Risk Radar are dead stubs** — all three return `unavailable(...)` "backend not available yet" (verified `marketIntelligenceService.ts:303-312`); full UI tab structures exist with no compute behind them.
- **D3 [P0] Relative-strength rank is hardcoded `null`** — the #1 Indian momentum sort. Intra-sector RS needs *no* new data (1M returns already stored). `sector-constituents.repository.ts:202`.
- **D4 [P0] Daily Review is a fixed 40-name board** — no sector/market-cap slicing, no rerank, no universe expansion; trader is passive. `today-trade-review.service.ts:57`.
- **D5 [P1] No saved/rerunnable custom screens** (no `UserScreen` model at all) — the foundation of every Indian screening tool and of the owner's own 1-year self-test. SME/surveillance/ban not flagged in discovery rows. Stock-Interest Radar capped at 25 rows/category. Only 6 canned setups (no base-breakout/VCP/volume-dry-up/52w-high scanner). No one-click screen→watchlist from most surfaces.

## THEME E — Fundamentals & valuation depth *(~10% built)*

- **E1 [P0] Only 3 XBRL facts extracted** (`revenue|netIncome|eps`); schema has no PB/ROE/ROCE/EV-EBITDA/debt-equity/interest-coverage/margins/cash-flow columns. Verified `nse-xbrl-fundamentals-exporter.ts:6` + `schema.prisma:511`. The same XML files carry 50+ facts.
- **E2 [P0] Consolidated vs standalone mixed silently** — no `isConsolidated` column; TTM can sum mixed-basis quarters; cumulative-fallback (9-month) quarters counted as one quarter → PE distorted. `exporter.ts:528`, `workbench.service.ts:462`.
- **E3 [P1] BFSI (~35% of index) analyzed with PE** — meaningless for banks; `PE_BELOW_PEERS` can invert the quality signal (penalize Bajaj Finance, reward SBI). No PB/NIM/NPA/CASA/ROA routing. `signal-generation-engine.service.ts:1140`.
- **E4 [P1] Growth is single-period YoY only** — no 3Y/5Y CAGR, no QoQ, no margin-trajectory; consistency score is monotonicity not CAGR → mis-scores compounders vs cyclical bounces. `earnings-intelligence.service.ts:228`.
- **E5 [P1] Peers = same-sector top-by-market-cap** — mid-caps always compared to large-cap giants; peer-average PE size-biased → the valuation vote is structurally skewed. No size-band filter. `workbench.service.ts:298`.
- **E6 [P1] No valuation context** — PE shown raw, not vs own 5y range (z-score), sector *median* (not mean), or growth (PEG). Raw PE is not analysis.
- **E7 [P1] No earnings-quality / red-flag layer** — promoter pledge % (free from BSE; the single highest-value red flag), Piotroski F-score, Altman Z, accruals all absent. Can't distinguish quality from a positive-EPS house of cards.
- **E8 [P2] Fundamental vote is near-tautological** — in LIGHTWEIGHT (all backfill) only `POSITIVE_EPS` can fire → same +vote for a PE-8 and a PE-80 stock. `service.ts:1140`.

## THEME F — Frontend trader-experience

- **F1 [P0] No candlestick chart anywhere** — verified: only close-line/`recharts`; no `lightweight-charts`/OHLC. Trader can't see ranges/wicks or locate entry/stop/target on the chart. OHLC is already in the DB.
- **F2 [P0] R:R + position size are admin-only** — `TradePlanDetail` lives under `/admin/`; Today-Review/Daily-Overview show entry/stop as tooltip text, never the computed R:R or share count. The app's best risk math is hidden from the trader. `routes.tsx:60`.
- **F3 [P1] No single decision screen** — chart + signal + calibrated score + plan levels + regime require ~5 page hops; tabs silo data that belongs together. `UnifiedStockPage.tsx`.
- **F4 [P1] Currency `INR 1420.50` (no ₹, no Indian grouping) on the exact decision pages** — Today-Review and candidate detail use a local formatter while everything else uses `inr()`. `TodayReviewPage.tsx:1241`.
- **F5 [P1] Bare confidence score with no scale/context**; Copilot bear/risk lists concatenated without dedup (mirrors Round-1 backend dup); candidate detail has no deep-link to the chart; Daily-Overview glance chips aren't clickable; `TradePlanDetail` bypasses `safeReviewText` ("Paper Review Candidate" execution language).
- **F6 [P2] 18-column ~2,960px Today-Review table** (needs column toggle / mobile view); flat 13-item nav with no job-sequencing; color-only BULLISH/BEARISH (colorblind hazard); Alert dialog lacks STOP_HIT/TARGET_HIT; a possible ×100 `formatRatioPercent` index-change bug to confirm.

---

## PRIORITIZED RECOMMENDATIONS (Round 2, value-first)

These slot into the Round-1 waves; the standout escalations:

1. **Make the trust numbers honest before anything builds on them (Theme A).** Held-out OOS period for calibration; effective-N (overlap-corrected) confidence + Wilson CIs; subtract regime base rate; FDR-correct the bucket tests; port the OOS fill/sizing fixes; assert non-null adjustedClose in outcomes. Until then, **label the track record as uncorrected/beta-confounded in the UI.** *(Cheap honesty; protects every downstream claim.)*
2. **Decide whether F&O/short is real (Theme B).** If yes: add a parallel F&O bhavcopy ingest (OI/futures/basis → OI-quadrant + PCR), wire the ban list + MWPL into today-review/plan gating, add lot-size + expiry + stock-futures execution modeling, give shorts their own board quota. If not: stop presenting un-executable shorts as first-class.
3. **Gate on tradability (Theme C).** ADTV-based liquidity; ADV position cap; cost-to-trade net targets; plan freshness/gap banner; min-capital guidance. Cheap, high-trust.
4. **Build a real screener (Theme D).** A trader-facing `/screener` over the universe (price/cap-tier/RSI/52w-distance/volume-surge/delivery%/PE), default sector sort by momentum not market-cap, implement Trader-Setup Radar (52w-high/breakout/pullback), saved screens. Turns a curator into a scanner.
5. **Deepen fundamentals (Theme E).** Extend the XBRL extractor to balance-sheet/P&L facts (same files) → PB/ROE/debt/EV-EBITDA/Piotroski/Altman; add `isConsolidated`; BFSI PB-routing; promoter-pledge ingest; valuation context (own-range z-score, PEG).
6. **Make the UI decision-ready (Theme F).** Candlestick chart (free `lightweight-charts`) with entry/stop/target overlays; surface R:R + position size to the trader; one integrated decision panel; shared `inr()` everywhere.

---

## CONFIDENCE NOTE
- **Spot-verified against source by the lead:** F&O parser discard, F&O ban list never consulted, three dead radar stubs, share-count liquidity gate, 3-field XBRL extraction + sparse Fundamental schema, no candlestick chart. All real.
- Remaining findings are agent-reported with cited file:line — high-confidence, but each warrants a quick trace before a fix lands (standard discipline). The statistical findings (Theme A) are methodological judgments grounded in cited code; they're the highest-leverage and deserve a focused review with the owner on what "trustworthy" should mean.
- Full per-agent detail (every file:line, formulas, and recommendations) is in this session's transcript. This doc is the deduped synthesis.
