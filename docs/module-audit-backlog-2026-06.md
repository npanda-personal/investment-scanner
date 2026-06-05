# Module Audit Backlog — 2026-06-04

Synthesized from a 5-agent read-only audit of all 27 backend modules + frontend features.
Scored against the product charter (5 trader jobs; ACCURACY > CONSISTENCY > INTELLIGENCE;
research-support, not advice; NSE/BSE-only free/local data in the ~12-month personal-validation phase).

**Context for prioritization:** the signal composite was proven to have **no positive forward-return edge**
(it's a research-WORTHINESS ranking, not a forecast). So the highest value now is in: surfacing
honest evidence/track-record, completing the human workflow (journal, what-changed, short pipeline),
and fixing correctness/consistency — NOT chasing signal alpha.

Legend: TYPE · TRADER-JOB (1 trade-now / 2 watch-today / 3 plan / 4 trust / 5 holdings) · VALUE · EFFORT.

---

## Cross-cutting themes (each surfaced independently by ≥2 audit groups)

1. **Calibration & track-record exist but never reach the surfaces.** Calibrated score is persisted but
   signals dashboard/screener serve the RAW score; today-review loads calibration then discards it in
   ranking/reason copy; workbench has no signal-evidence section. → make calibration/track-record actually flow.
2. **Persisted-read constraint violations (on-GET calc).** signal-position-ledger `listActiveRows()` can
   start live enrichment from a GET; quality-lab `summary()`/`dashboard()` recompute outcomes on demand
   from raw prices for up to 10k signals (despite the SignalOutcome table existing).
3. **Short pipeline is structurally incomplete end-to-end.** today-review emits SHORT_REVIEW without F&O
   gating; trade-plan engine is hardcoded long-only (no short geometry, no F&O gate); no short-entry
   strategy family; research-hub has no short bucket.
4. **No trading-calendar awareness.** DQ staleness + market-session model + earnings price-reaction window
   all use raw calendar-day math → false-stale / wrong-window during NSE holiday clusters.
5. **Historical regime snapshots are missing**, so the backtest hardcodes `marketGate:'OPEN'`/`NEUTRAL`
   (regime-blind + look-ahead), the regime gate can't be validated historically, and quality-lab's
   by-regime grouping is biased.
6. **"What changed since I last looked" is fabricated or missing** (research-hub `whatChanged` is simulated;
   portfolio has no changes endpoint) — trader-job #5 has no real backend.
7. **Real Nifty benchmark unused despite being in the DB** (backtest uses equal-weight fallback; workbench
   relative-strength returns null) — blocks benchmark-relative alpha, the honest performance metric.
8. **v3 score rescaling left downstream thresholds stale** (noisy FAILED_HIGH_SCORE_BULLISH @70, exit
   lifecycle thresholds, SCORE_BUCKETS) — recalibrate against the backfill distribution.

---

## Execution waves (CONFIRMED 2026-06-04 — owner chose TRUST/CORRECTNESS FIRST)

Re-prioritized post-pivot (signals have no proven alpha; this is a daily personal-validation tool).
Order: **trust → daily-loop → honest-evidence → completeness.**

- **Wave 1 — Trust & correctness (cheap; protects daily use):** #26 (P0 bug bundle), #27 (persisted-read
  enforcement), #35a (calendar-aware staleness — stop false-BLOCKING valid stocks on NSE holidays).
- **Wave 2 — Daily validation loop:** #33 (Trade Journal + post-mortem), #32 (what-changed digest),
  #28a (F&O-gate shorts in today-review), #30 (surface calibration/track-record evidence on the shortlist),
  #35b (Capital Posture/regime in portfolio + today-review).
- **Wave 3 — Honest evidence:** #29 (scheduled historical regime snapshots — unblocker), #28b (backtest
  regime realism, depends on #29), #31 (real Nifty benchmark → alpha vs beta), recalibrate v3-stale thresholds.
- **Wave 4 — Capability completeness:** #34 (full short pipeline), #36 (official earnings dates),
  portfolio health-weight reframe, copilot wiring.
- **Wave 5 — #37 P2 refinements / tech-debt** (ongoing).

Track-record note (broader backfill, 800×27 quarterly 2019-2025, 21,600 signals / 73k mature outcomes):
BULLISH modestly beats NEUTRAL at 10-20D (10D 61.2%/+3.15% vs 58.7%/+2.56%; 20D 58%/+3.8% vs 53.9%/+2.72%)
but returns are ABSOLUTE (bull-market beta) — alpha-vs-beta needs the Nifty benchmark (#31). Fine-grained
score gradient still unvalidated; bearish/short still anti-predictive. So: "modest directional edge at
10-20D pending benchmark-relative confirmation" — score stays a research-worthiness ranking.

---

## P0 — correctness bugs & hard-constraint violations (small effort, do soon)

- **[notifications-delivery] Alert digest fetches `default-user`, not the caller** — Bug · platform · High · S.
  `sendAlertDigest(userId)` calls `alertsService.listEvents()` with no arg → always `default-user`; non-default users see zero alerts.
- **[alerts-monitoring] `SIGNAL_DIRECTION_CHANGED` fires every cycle** — Bug · 2 · High · S.
  Compares current direction to the rule's TARGET direction, not the PRIOR observed direction; no prior-state memory → spurious events.
- **[subscription-billing] null-owner rows counted against every user's limit** — Bug · platform · High · S.
  `OR:[{userId},{userId:null}]` in count* inflates usage; FREE-plan users blocked by legacy null-owner rows.
- **[ai-investment-copilot] FREE billing gate blocks the owner's own research** — Bug · platform · High · S.
  `assertAllowed('RUN_COPILOT_SUMMARY')` throws at 10/day; in personal-validation this must be disabled/unbounded locally.
- **[signal-position-ledger] `listActiveRows()` can run live enrichment from a GET** — Bug/constraint · 5 · High · S.
  Trader-facing active endpoint must always use `listPersistedActiveRows()`; move refresh behind the explicit POST + scheduled stage.
- **[signal-quality-lab] `summary()`/`dashboard()` recompute on demand from raw prices** — Tech-debt/constraint · 4 · High · M.
  Serve from persisted SignalOutcome rows (extend the calibration engine's persisted-metrics pattern); current path is a 20s+ load.
- **[today-trade-review] SHORT_REVIEW candidates not F&O-gated** — Accuracy/constraint · 2 · High · S.
  Lite path promotes SHORT_REVIEW for any instrument; shorts are only executable on F&O/derivativesEligible names.
- **[backtesting-strategy-lab] historical `marketGate:'OPEN'`/`marketRegime:'NEUTRAL'` hardcoded** — Accuracy/look-ahead · 4 · High · M.
  Regime-gated strategies are never tested in RISK_OFF; read persisted historical regime per bar date instead.

## P1 — high-value, pivot-aligned (build the research-support + workflow value)

- **[market-context / historical-context-snapshots] Scheduled daily regime snapshot + wire into backtest** — Feature · 4 · High · M.
  Unblocks historical regime validation, backtest regime-awareness, and unbiased by-regime quality grouping. (Foundational — unblocks several others.)
- **[signal-generation / calibration] Surface the calibrated score + reliability/track-record on the signal reads** — Accuracy · 1,4 · High · M.
  Serve calibratedScore (+ horizon label, fallback to raw when UNAVAILABLE) on /signals/top, screener, today-review ranking, and workbench.
- **[backtesting / stock-research-workbench] Wire the real Nifty 50 benchmark (already stored as NSE_INDEX_EOD)** — Accuracy · 4,5 · High · M.
  Replace equal-weight fallback; populate workbench relative-strength; enables benchmark-relative alpha.
- **[portfolio-management / research-hub] Real "what changed since last look" digest** — Feature · 5 · High · M.
  Persist prior snapshot + diff: signal-direction flips on holdings, new red flags, loss-threshold crossings, market-gate change. Replace research-hub simulated `whatChanged`.
- **[today-trade-review / portfolio] Trade Journal + post-mortem (owner-approved capability)** — Feature · 4 · High · L.
  `TradeLedgerEntry` (candidate ref, reviewed date, acted/skipped, fill, outcome after N days) + read-only audit. The only way Job #4 reflects the trader's OWN history (not edge-less backtests).
- **[trade-plan / today-review / strategy-framework] Complete the SHORT pipeline end-to-end** — Feature · 2,3 · High · L.
  F&O gate at today-review + trade-plan; short trade-plan geometry (entry/stop/target/size); a short-entry strategy family with the same evidence trail; research-hub short bucket.
- **[portfolio-intelligence / today-review] Surface Capital Posture / regime context** — Feature · 5,1 · High · S.
  Portfolio-level "bearish regime: consider reducing exposure" flag + regime line in today-review reason copy. Data already exists (#22).
- **[data-quality / market-data-foundation / earnings] Trading-calendar awareness** — Accuracy · 1,2 · High · S–M.
  Replace calendar-day staleness with sessions-since-latest using `expectedLatestTradingDate`; wire the NSE holiday cache into the market-session model; make earnings price-reaction window trading-day based.
- **[earnings-intelligence] Ingest official NSE board-meeting / result-announcement dates** — Feature · 2,3 · High · M.
  `officialResultDate` is always null → RESULT_WINNERS / RESULT_DISAPPOINTMENTS / RESULT_REACTION_HISTORY are permanently empty. NSE corporate-filings API is free.

## P2 — accuracy & tech-debt refinements

- **[signal-quality-lab / signal-generation / calibration] Recalibrate v3-stale thresholds after backfill** — Accuracy · 4 · Med · S.
  FAILED_HIGH_SCORE_BULLISH (≥70 → use ≥85), exit-lifecycle thresholds (45/Δ15), SCORE_BUCKETS — fit to the v3 backfill distribution.
- **[signal-quality-lab] Model-version stratification in quality/outcome metrics** — Accuracy · 4 · Med · S.
  Default to current model version; don't mix v1/v2/v3 win-rates; show the scope label.
- **[portfolio-intelligence] Reframe the 25%-signal-quality health weight** — Accuracy · 5 · High · M.
  Edge-less signals shouldn't drive AT_RISK; reduce weight or replace with fundamentals-based quality (now that XBRL exists).
- **[portfolio-management] `dailyPnLPercent` denominator + null guards** — Accuracy · 5 · Med · S.
- **[portfolio-intelligence] Stale-price-age detection on holdings** — Accuracy · 5 · Med · S. Expose `priceDate` through valuation DTO.
- **[data-quality-engine] Fundamentals coverage depth tiers (shallow/adequate/deep)** — Accuracy · 3,4 · Med · S. 1 manual row ≠ 8 quarters.
- **[signal-generation] Peer-relative signals absent in batch (LIGHTWEIGHT)** — Accuracy · 1,2 · High · M. Weekly peer-comparison cache so batch can emit OUTPERFORMING_PEERS etc.
- **[smart-money-intelligence] Add NSE bulk/block-deal evidence** — Accuracy · 2 · Med · M. Ownership status is permanently MISSING; NSE bulk/block deals are free.
- **[market-context-intelligence] Macro proxy (RBI rate calendar, FII/DII flows)** — Feature · 1 · Med · M. macroStatus permanently UNKNOWN; NSE/RBI free.
- **[strategy-decision / market-context] De-duplicate marketGate derivation vs Capital Posture** — Tech-debt · 1 · Med · S. Different breadth thresholds (60 vs 40) risk divergence.
- **[strategy-decision] DEFENSIVE_EXIT portfolio-risk score is a placeholder constant (5)** — Accuracy · 5 · Med · S. Derive from real P&L/exposure or zero the weight.
- **[market-context-intelligence] Validate regime-score weights & SAMPLE_SIZE=500** — Accuracy · 1 · High · M. Arbitrary weights feed the whole chain; document/validate vs NSE history.
- **[pipeline-orchestration] EARNINGS_INTELLIGENCE_REFRESH not in scheduled downstream chain** — Accuracy · 2 · Med · S. Stale earnings after scheduled runs.
- **[market-data-foundation] Scheduled incremental NSE-XBRL fundamentals refresh** — Feature · 3,4 · Med · M. Currently operator-manual only → freshness decays.
- **[signal-generation] Batch previous-close lookup (one query, not N)** — Tech-debt · 1,2 · Med · S.
- **[signal-position-ledger] EXIT_TRIGGERED → CLOSED never advances** — Completeness · 5 · Med · M. No close-price evidence resolver → closed-history always empty.
- **[ai-investment-copilot] Wire copilot to strategy-decision / trade-plan / today-review** — Feature · 3,4 · High · M. It should explain the pipeline output it's named for, deterministically.
- **[stock-research-workbench] Signal-evidence section (reliability tier, outcome depth, track record)** — Feature · 4 · Med · S.
- **[alerts-monitoring] Alert badge in nav + trigger evaluation from page load/schedule** — Feature · 2 · High · S. Alerts never fire without manual POST.
- **[watchlist-management] One-click "set price alert" from watchlist + idea-stage/priority** — Feature · 2 · Med · M.
- **[auth-identity] Refresh-token flow (8h TTL → silent session loss)** — Tech-debt · platform · Med · M.
- **[auth-identity] Rate-limit /auth/login + /auth/signup** — Security · platform · Med · S. (No committed secrets found in this review.)
- **[market-data-foundation] Stock.symbol+exchange uniqueness (NSE/BSE collisions silently dropped)** — Tech-debt · platform · High · L.
- **[market-data-foundation] Durable BSE historical candle source** — Feature · 4,5 · High · M. BSE-primary names have manual-only history.
- **[historical-context-snapshots] DataQualitySnapshot scope fields (coverage counts are global)** — Accuracy · platform · Med · S.

---

## Completed since 2026-06-04 (P2 burn-down)

Done & committed (newest first):
- ✅ **Recalibrate v3-stale thresholds** (#107) — FAILED_HIGH_SCORE_BULLISH 70→85 (p90→p97, aligns 85-100 bucket); exit 45/Δ15 + SCORE_BUCKETS verified already-v3-correct and left as-is with rationale. `d1c44c3`.
- ✅ **Model-version stratification** (#109) — calibration persisted-metrics pinned to current model version (signal-engine-v3); no more v1/v2/v3 blending. `d1c44c3`.
- ✅ **dailyPnLPercent denominator + null guards** (#113) — prior-day value of the measurable subset; null on zero basis. `d1c44c3`.
- ✅ **Stale-price-age priceDate** (#114) — `priceDate` now on HoldingValuationDto (intelligence red-flag wiring still a follow-up). `d1c44c3`.
- ✅ **Rate-limit /auth/login + /auth/signup** (#131) — zero-dep per-IP limiter, NODE_ENV=test bypass. `d1c44c3`.
- ✅ **De-duplicate marketGate vs Capital Posture** (#119) — already single-sourced via capital-posture.types thresholds. `dc134b1`/`1d8bab7`.
- ✅ **DEFENSIVE_EXIT real portfolio risk** (#120) — phantom constant 5 replaced with derived P&L/exposure score or honest-zero + dataGap. `dc134b1`.
- ✅ **stock-research-workbench signal-evidence section** (#127) — shipped in FE audit. `b1d7519`.
- ✅ **Alerts nav badge + Evaluate Now** (#128) — shipped in FE audit. `b1d7519`.
- ✅ **Watchlist one-click set-alert** (#129, partial) — set-alert + confidence shipped in FE audit; idea-stage/priority still open. `b1d7519`.

Related infra/perf fixed same window: backtest NULLS-LAST universe ranking + today-review pool/scan bounding (#51/#52, `62b3cc6`); dead worker PrismaClient removed (`5b9fd02`).

Still open in P2: reframe 25% signal-quality health weight (#111); fundamentals coverage tiers (#115); peer-relative batch signals (#116); smart-money bulk/block deals (#117, needs NSE source); macro proxy RBI/FII-DII (#118, needs source); regime-score weight validation (#121); EARNINGS_INTELLIGENCE_REFRESH in scheduled chain (#122); scheduled NSE-XBRL fundamentals refresh (#123); batch previous-close lookup (#124); EXIT_TRIGGERED→CLOSED resolver (#125); copilot wiring (#126 — largely done in #40); refresh-token flow (#130); symbol+exchange uniqueness (#132, L/migration); durable BSE historical source (#133); DataQualitySnapshot scope fields (#134); watchlist idea-stage/priority (#129 remainder).

---

_Generated by parallel module audit. P0/P1 items are mirrored as tracked tasks. P2 lives here until promoted._
