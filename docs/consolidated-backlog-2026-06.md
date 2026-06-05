# Consolidated Audit Backlog — 2026-06-05

Single re-prioritized backlog merging **all four 2026-06-05 audits** — architecture
(`architecture-audit-2026-06.md`), UX (`ux-audit-2026-06.md`), feature/PO (`feature-audit-2026-06.md`),
domain (`deep-domain-audit-2026-06-05.md`) — plus the prior module/business-logic/ui-runtime backlogs.
De-duplicated, reconciled against work already shipped this session, and severity-rated **by me**
against the validation-phase charter (**accuracy > consistency > intelligence**; NSE/BSE-only free;
single-owner daily tool).

**Severity key (this phase):**
- **P0 — Trust-critical:** a displayed number is wrong/misleading, or a security/constraint breach. Directly violates "accuracy first." Don't rely on the tool until fixed.
- **P1 — High-value:** correctness gaps that bias results (alpha-vs-beta, survivorship, fills, costs) **or** the daily-workflow spine (journal UI, scheduler, conflict detection, key free data).
- **P2 — Polish / consistency / perf / tech-debt:** hierarchy, dev-copy, enum remainder, async/tables, N+1, Redis, surface dedupe.
- **P3 — Defer (commercial-phase / net-new / nice-to-have).**

Source tags: **[ARCH] [UX] [PO] [DOM]**. Status: 🆕 open · 🟡 partial (some shipped this session) · ✅ done.

---

## ★ RE-PRIORITIZATION — market-first lens (owner directive 2026-06-05)

> Owner directive: **"market insights are top priority; portfolio / watchlist / alerts etc. are low. I only care about all screens showing market and stock related info."**
> So the ranking axis is no longer pure correctness-severity — it's **"does this make the market/stock-information screens more accurate, richer, or better?"** Personal-tracking surfaces (portfolio, watchlist, alerts, journal, notifications, billing, account) drop to LOW even when their underlying bug is a P0-correctness defect, because the owner does not prioritize those screens.
> Market/stock screens in scope: Market Pulse (home), Daily Review / today-review, Research Hub, Stock Research Workbench, Instrument Workspace, Stock Interest Radar, Earnings Intelligence, Smart Money, Signals/Quality/Calibration, Market Context/regime/breadth, Backtesting, Strategy Decision/Framework — **and the data foundation that feeds all of them.**

### TIER 1 — Market/Stock data TRUTH (do first; GIGO on the screens you care about)
- **CB-1** adjusted OHLCV (raw H/L/V corrupt ATR/ADX/OBV/stops on every split/bonus stock) — **#1.**
- **CB-7** spike rejection ON (one bad tick poisons stock price history).
- **CB-5** persisted-read GET leaks on the **signal** + **market-context** endpoints (these are market/stock-info reads; one even writes).
- **CB-4** apply calibration + fix direction mislabel (the trust score shown on every stock/signal) — ⚠️ owner ruling first.
- **CB-15 / CB-16 / CB-17 / CB-19** corporate-action & universe-hygiene truth for stock prices (rights/TERP, mergers/demergers, T2T-SME mixing, ISIN continuity).
- **CB-32** pipeline date-skew + dead MARKET_PULSE/BACKTEST_PROOF stages (stale = wrong on market screens).

### TIER 2 — Market/Stock intelligence DEPTH & HONESTY (the actual edge)
- **Free NSE/BSE market data (highest market-insight value): CB-20** delivery% · **CB-21** FII/DII flows · **CB-22** bulk/block deals · **CB-23** India VIX · **CB-24** F&O ban/ASM-GSM/lot-sizes · **CB-25** retire the smart-money stub onto real bulk-deal data.
- **Alpha-vs-beta honesty on signal/backtest surfaces: CB-8** benchmark-relative · **CB-9** survivorship · **CB-10** next-bar fill · **CB-11** ADX warm-up · **CB-12** India transaction costs · **CB-13** intrabar/gap stops · **CB-14** Wilder RSI.
- **Market intelligence correctness: CB-41** breadth universe (Nifty 500) · **CB-42** regime score over-weight/no-index-trend · **CB-43** earnings blackout into today-review · **CB-44** honest/official earnings dates · **CB-45** SELECTIVE>85 gate · **CB-46** short backtestability · **CB-47** copilot defects (dup risk factors, safe-language, false COMPLETE).
- **CB-30** surface track-record to the trader (trust on stock signals) · **CB-18** holiday calendar → staleness · **CB-28** reliable scheduler (fresh market data for the open) · **CB-27** cross-signal conflict detection (today-review LONG vs strategy EXIT for the same stock).
- **CB-29** consolidated market "Morning Briefing" home · **CB-31** Copilot in nav (the only market/stock synthesis view).

### TIER 3 — Market/Stock SCREEN UX & polish
- **CB-48** decision-first hierarchy (Market Pulse / Daily Review / Research Hub) · **CB-49** purge dev/architecture copy from stock screens · **CB-50** ₹/Cr formatting + 52-week range + delivery%/VWAP on price surfaces · **CB-51** enum remainder + warning-tone bug on stock tables · **CB-53** stub surfaces (Context Rail, radars) · **CB-55** standard RankingTable (sort/sticky/column-visibility/confidence-filter) · **charting component** (volume-aligned, MA, 52W, corp-action markers — credibility cornerstone of the Workbench) · **CB-52** per-row "open workspace" action (the ★watchlist/🔔alert parts are LOW).
- **Screen IA: CB-66** cut the 3 stub radars from nav · **CB-67** promote-or-delete the orphan dashboard · **CB-68** collapse Daily-Review-Shortlist vs Today-Review.
- **Perf that keeps stock screens fast/stable: CB-57** N+1 (backtest/signal) · **CB-58** per-endpoint concurrency bound · **CB-59** Redis read-model cache · **CB-60** Timescale aggregates · plus tech-debt CB-61/62/63/64.

### TIER 4 — LOW (personal-tracking surfaces — deprioritized per directive, even where P0-correctness)
- Portfolio: **CB-2** realized P&L · **CB-3** CA-adjust holdings · **CB-33** missing-price phantom loss · **CB-36** XIRR/benchmark · **CB-37** STCG/LTCG · **CB-38** health-weight · **CB-39** sector exposure · **CB-40** posture dead-zone.
- Alerts: **CB-34** userId batch bug · **CB-35** dedupe flood · **CB-65** quiet-hours · **CB-71** missing alert types.
- **CB-26** Trade Journal UI · **CB-69** billing · Watchlist row-detail · Notifications/Account (UX-audit §2 subset).
- *(These keep their P0/P1 correctness tags in the tables below — they're real bugs — but sit here because the owner does not prioritize these screens this phase.)*

### TIER 5 — Defer (P3): commercial-phase infra (job queue, observability, read replicas), net-new personal screens, advanced backtest stats.

### Standing item (not a screen, not deprioritizable): **CB-6** — rotate the live broker creds / TOTP seed + purge the env block. **Owner action** (I will not touch `.env`).

**Net effect of the re-tier:** the portfolio correctness items I had at P0 (CB-2/CB-3) move to LOW; the free-NSE-data + alpha-vs-beta + regime/breadth items rise to the top working set; CB-1 stays #1 because it's the GIGO root for *every* stock indicator on *every* market screen.

---

## 0. Already shipped this session (so they're not re-counted as open)
NULLS-LAST backtest universe; TEST_-fixture data guarded out of reads (RELIANCE ₹193→₹1420); signals 7→1021;
Market-Pulse headline-index curation + inverse-index excluded from health score; enum humanization on Market Pulse + today-review;
INR default on portfolio create; instrument deep-link + search filter + real empty state; signal-quality v3 thresholds + model-version
stratification; auth rate-limit; EXIT_TRIGGERED→CLOSED resolver; pool-exhaustion + worker PrismaClient fix; today-review pool/scan bounding.

---

## P0 — TRUST-CRITICAL (accuracy-first; fix before relying on the tool)

| ID | Item | Src | Status | My severity rationale |
|----|------|-----|--------|----------------------|
| **CB-1** | **Only `close` is corporate-action adjusted — OHLC + volume stay raw.** ATR/ADX/OBV/volume-breakout/stop-sizing mix price scales on every post-split/bonus stock (RELIANCE etc). Add `adjustedOpen/High/Low` (×factor), `adjustedVolume` (÷factor); reprocess; switch all indicator consumers. | DOM P0-1 | 🆕 | **THE top P0.** Spot-verified. Silent GIGO that corrupts indicators on the exact large-caps a trader watches; invisible because the close looks right. Undermines the entire "accuracy-first" claim. Everything downstream (signals, stops, backtests) inherits the error. |
| **CB-2** | **Portfolio is a dead ledger — no realized P&L, no cost-basis engine (WAC/FIFO).** After any partial sell, `totalInvested`/unrealized P&L are wrong; realized gains never tracked. | DOM P0-3 | 🆕 | Job 5 returns provably wrong numbers. Pure correctness; the trader can't trust their own holdings view. |
| **CB-3** | **Corporate actions never adjust holdings (qty & cost basis).** Bonus/split halves adjustedClose but leaves `averageCost` raw → permanent phantom ~50% loss; P&L sides on different scales. | DOM P0-4 | 🆕 | Same class as CB-1/CB-2 — holdings show false losses. Depends on a clear adjusted/raw convention (do with CB-1). |
| **CB-4** | **Calibration is computed but never applied to the served score, and mislabels direction** (calibration BULLISH≥70 vs engine 60). UI can show "calibrated: NEUTRAL" beside an ENTRY candidate. | DOM P0-2, PO ②/⑤ | 🟡 (#30 surfaced it; not applied) | **P0 but needs an OWNER RULING first** (is the authoritative served score raw or calibrated?). Until decided, the trust layer is internally contradictory. Cheap once decided: unify cut-points to shared 60/40 constants. |
| **CB-5** | **Two (more) persisted-read GET leaks: a GET that generates, and one that *writes*.** `signal latestForInstrument` GET → `run()`; market-context `summary` GET → `run()`→`saveSnapshot()`. `*Persisted*` methods exist right beside them. | ARCH R1/R2/R4 | 🟡 (#27 fixed ledger+quality-lab; these are new) | Contract breach + look-ahead/wall-clock contamination on a read path + a read mutating data. Add a test asserting GET handlers never call `.run()`/`.save*()`. |
| **CB-6** | **SECURITY: live Angel One API key + client code + PIN + TOTP 2FA seed in `backend/.env`**, with `ANGEL_ONE_ENABLE_MARKET_DATA=true`. Gitignored, but a plaintext TOTP seed is a real exposure + a latent contradiction of "brokers forbidden." | ARCH R3/§5-6 | 🆕 **OWNER ACTION** | **Rotate the credentials (treat as compromised) and purge the broker/Yahoo/AlphaVantage env block.** I can't and won't touch `.env` (your instruction + credential-safety) — this is an owner action. Flagging at P0 because it's a live secret. |
| **CB-7** | **Spike rejection is OFF by default** (threshold 0 unless an env flag). One bad bhavcopy tick (decimal error) poisons the adjustedClose recompute for all prior bars. | DOM P0-6 | 🆕 | Cheap, high-leverage: default-on with a ~50% single-day EQ guard. A single corrupt tick currently silently corrupts history. |

---

## P1 — HIGH-VALUE (correctness bias + the daily-workflow spine)

### A. Methodology / "is every edge real?" (the alpha-vs-beta cluster)
| ID | Item | Src | Status |
|----|------|-----|--------|
| CB-8 | **All metrics are absolute, not benchmark-relative** — win-rates/returns/backtests/track-record over a 2019-25 bull market are beta, not skill. Nifty IS now ingested (^NSEI through 6/4); wire benchmark-relative onto the served surfaces (quality-lab, track-record, workbench RS). | DOM M3/P1, PO ② | 🟡 (#31/#41 ingested + backtest; served surfaces still absolute) |
| CB-9 | **Survivorship bias** — backfill universe = today's survivors; backtest ALL = today's top-50. Both exclude losers, inflating every historical stat. Point-in-time (delisting-aware) universe. | DOM M4 | 🆕 |
| CB-10 | **Next-bar fill not applied in outcome measurement** — entry uses signal-day close → inflates 1D/5D by the overnight gap (quality-lab + backtest OOS path). | DOM P1 | 🆕 |
| CB-11 | **ADX warm-up only 29 bars** (needs ~3×period Wilder ≈ 42+); range-bound gate (ADX<20) mutes valid trends. (RSI was fixed in #46; ADX was missed.) | DOM P1 | 🆕 |
| CB-12 | **India transaction costs understated** — flat 0.1% misses STT/exchange/SEBI/stamp/GST/DP; realistic delivery round-trip ≈0.35-0.55%. Turns marginal strategies negative. | DOM P1 | 🆕 |
| CB-13 | **Stops checked vs EOD close, not intrabar/gap** — gap-through & lower-circuit risk invisible; stop frequency understated, P&L inflated. | DOM P1 | 🆕 |
| CB-14 | **RSI uses simple-average RS (not Wilder) in backtest/decision** — disagrees with every charting platform in the 40-60 entry zone. | DOM P1 | 🆕 |

### B. Data foundation (corporate actions & universe hygiene)
| ID | Item | Src | Status |
|----|------|-----|--------|
| CB-15 | **Rights issues skipped entirely** (no TERP, not even stored) → phantom 10-30% gaps pre-ex-date. TERP computable from NSE subject + close. | DOM P1 | 🆕 |
| CB-16 | **Mergers/demergers/spin-offs unhandled** (Reliance→Jio Financial, HDFC merger) — silently dropped. | DOM P1 | 🆕 |
| CB-17 | **T2T (BE)/BZ/SME series mixed into the equity universe** — different microstructure/circuits pollute signals & breadth. | DOM P1 | 🆕 |
| CB-18 | **Holiday calendar exists but isn't fed to DQ staleness** — `isPriceStale` runs weekend-only (M2). | DOM P1 | 🟡 (#35 calendar exists) |
| CB-19 | **No symbol-rename history / ISIN not used as price-continuity anchor** — renamed symbols truncate backtest history; BSE-NSE fill not ISIN-validated (wrong-stock mixing risk). | DOM P1 | 🆕 |

### C. Highest-value free NSE/BSE data (the Indian-market edge; honors the constraint)
| ID | Item | Src | Status |
|----|------|-----|--------|
| CB-20 | **Delivery %** per stock (already in the bhavcopy we fetch) — best EOD volume-quality filter. | DOM M6 | 🆕 |
| CB-21 | **FII/DII daily provisional flows** — the dominant Indian regime signal (FII outflow in a "bullish" tape = false RISK_ON). | DOM M6 | 🆕 |
| CB-22 | **Bulk & block deals** — real institutional footprints; retires the smart-money stub (CB-25). | DOM M6/P0-5 | 🆕 |
| CB-23 | **India VIX** (same index bhavcopy file) — cap posture at NEUTRAL when VIX>22. | DOM M6 | 🆕 |
| CB-24 | **F&O ban list + ASM/GSM surveillance + lot sizes** — don't surface long/short on banned/GSM names; needed for F&O sizing. | DOM M6 | 🆕 |
| CB-25 | **Smart-money is a stub presented as institutional evidence** (insider/inst ownership hardcoded MISSING; 100% price-volume). Rename "Accumulation/Distribution" now; back with CB-22 data. | DOM P0-5, PO ② | 🆕 |

### D. The daily-workflow spine (modules exist; the flow doesn't)
| ID | Item | Src | Status |
|----|------|-----|--------|
| CB-26 | **Trade Journal has NO frontend** — backend 100% done; the one module that closes idea→outcome (the literal point of the validation phase) is invisible. **Cheapest high-value build.** | DOM/PO/UX | 🟡 (#33 backend) |
| CB-27 | **No cross-module conflict detection** — today-review LONG vs strategy EXIT vs portfolio bearish for the same stock never reconciled. Highest real-harm scenario. | DOM P1 | 🆕 |
| CB-28 | **No reliable daily scheduler** — `setInterval` resets on restart; no cron/DB next-run; no force-cancel for a hung run. A 15:45 restart leaves the 9:15 open stale. | DOM P1 | 🆕 |
| CB-29 | **Consolidated "Morning Briefing" home** (posture + pipeline freshness + long/short/exit counts + portfolio red flags + unread alerts). Resolves the dashboard/shortlist/today-review three-way overlap; likely home for the orphaned `daily-overview-dashboard`. | DOM/PO/UX N1 | 🆕 |
| CB-30 | **Surface the track-record scorecard to the trader** — trust backbone lives only in admin Signal Quality Lab; user never sees if signals worked. | PO ②/③, DOM | 🟡 (#12 API; admin-only) |
| CB-31 | **AI Copilot + Notifications routed but not in nav** — undiscoverable; only 5-jobs synthesis view is hidden. Add to nav or cut. | PO/DOM/UX | 🆕 |
| CB-32 | **Pipeline downstream skew** — calibration/today-review compute as-of Jun-3 while signals are Jun-4; `MARKET_PULSE`/`BACKTEST_PROOF` stages "never run". | ui-runtime H | 🆕 |

### E. Portfolio / alerts / posture correctness
| ID | Item | Src | Status |
|----|------|-----|--------|
| CB-33 | **Missing-price holding contributes marketValue=0** → phantom −100% loss drags totals & health score. | DOM P1 | 🆕 |
| CB-34 | **Scheduled `evaluate()` skips all real-user rules** (passes ambient `userId`, not `rule.userId`) — batch alerts never fire for real users. | DOM P1 | 🟡 (#26 touched digest) |
| CB-35 | **Alert dedupe JSON-fragile + no cooldown** — portfolio alerts include a changing float → dedupe never matches → inbox floods. | DOM P1 | 🆕 |
| CB-36 | **No XIRR/CAGR/benchmark on portfolio; no `purchaseDate`** — can't answer "did I beat a Nifty index fund?" | DOM P1 | 🆕 |
| CB-37 | **No STCG/LTCG tax awareness** (holding-period, days-to-LTCG alert, grandfathering) — central to Indian investing. | DOM P1 | 🆕 |
| CB-38 | **Reframe portfolio-health 25% signal-weight** — weighting health on an edge-less research-worthiness score is internally inconsistent. | DOM/PO/#37 | 🆕 (owner-ish) |
| CB-39 | **`sectorExposureAfterTrade` always null** — the 30% sector-concentration rule never fires (M2). | DOM P1 | 🆕 |
| CB-40 | **Capital-posture band has a 25-40% dead zone** — no category for a trader at 35% invested. | DOM P1 | 🟡 (#22/#35) |

### F. Market-intelligence correctness
| ID | Item | Src | Status |
|----|------|-----|--------|
| CB-41 | **Breadth universe = unfiltered page-1 of 500** (junk/SME pollute breadth) — should be Nifty 500 constituents. | DOM P1 | 🆕 |
| CB-42 | **Regime score over-weights a single 63-bar mean return (35%); no index-trend input; null→neutral-50** → false RISK_ON in narrow rallies (max deployment at the top). | DOM P1 | 🆕 |
| CB-43 | **Earnings blackout not wired into Today-Review** — a stock with results in 2 days can be grade-A LONG. `EarningsIntelligenceService` exists but isn't consulted. | DOM P1 | 🟡 (#35/#36) |
| CB-44 | **Earnings dates are estimated, not official; refresh not exposed over HTTP.** Run/finish #36 to make honest, or label every date "estimated". | PO ②, DOM | 🟡 (#36) |
| CB-45 | **SELECTIVE gate requires score>85 hardcoded** — SELECTIVE is the common Indian regime; strategies score 70-80 → almost no candidates most of the time. | DOM P1 | 🆕 |
| CB-46 | **BREAKDOWN_MOMENTUM short un-backtestable** — `derivativesEligible` never threaded into `strategyContextFromBars`. | DOM P1 | 🟡 (#34/#43) |
| CB-47 | **Copilot defects:** `riskFactors` duplicates `bearishFactors` verbatim; `safeLanguage` covers only 4 phrases (doesn't sanitize pipeline/strategy "enter"/"exit"); `dataStatus:'COMPLETE'` false positive when stages never ran. | DOM P1 | 🆕 |

---

## P2 — POLISH / CONSISTENCY / PERF / TECH-DEBT

### UX systemic (apply once → pay off everywhere) — from the UX audit
| ID | Item | Src | Status |
|----|------|-----|--------|
| CB-48 | **Hierarchy inverted: diagnostics before decisions** (S1) — lead each page with the answer; collapse run/coverage/exclusion plumbing into an "Audit context" accordion. (Daily Review, Research Hub, Market Pulse.) | UX S1 | 🆕 |
| CB-49 | **Developer/architecture copy leaking to the trader UI** (S2) — "persisted read models only", "InstrumentContextSnapshot read API missing", "adjusted close for MVP", "Compatibility route retained"… purge all of it. | UX S2 | 🟡 (some purged) |
| CB-50 | **Not India-first** (S3) — `shared/format/money.ts` (₹ + Cr/Lakh + compact); lock INR for IN scope everywhere; swap "Country" col → market-cap tier; add 52-week range / delivery% / VWAP to price surfaces. | UX S3 | 🟡 (INR default done; ₹/Cr formatter + lock open) |
| CB-51 | **Enum-leak remainder** (S4) — `humanizeCode` not applied to `direction`, `setupType`, `riskCategory`, transaction types (`CASH_IN`), posture action (`REDUCE_EXPOSURE`), corp `action_type`, plan codes; **`TagList` drops `tone==='warning'` → risk tags look identical to positive tags.** | UX S4 | 🟡 (Market Pulse/today-review done) |
| CB-52 | **Surfaces ideas, won't let you act** (S5) — per-row ★watchlist / 🔔alert / open on every ranking table; prev/next + mark-reviewed on the candidate flow; refresh/export on the shortlist. | UX S5 | 🆕 |
| CB-53 | **Stub surfaces dressed as broken states** (S6) — Instrument Context Rail 8×"Unavailable", radars rendering tabs over an "unavailable" banner. Suppress working chrome; one calm placeholder. | UX S6 | 🟡 (workspace landing done) |
| CB-54 | **Weak async states** (S7) — skeletons matching final layout; Retry on every error; section-level (not whole-page) failure; global Snackbar provider; relative-time helper. | UX S7 | 🟡 (shortlist skeleton done) |
| CB-55 | **Tables wide/dense/unsortable** (S8) — standard `RankingTable`: sticky symbol col, header sort, column-visibility, per-tab count badges, confidence-score filter on the primary ranking key. | UX S8 | 🆕 |
| CB-56 | **Per-page gaps** — the dozens of line-cited items in `ux-audit-2026-06.md` §2/Appendix (Candidate prev/next, Research "Market Gate" relabel, Alerts unit-aware thresholds + dismissed archive, Notifications time-picker, Billing comparison cards, Account dirty-detection, etc.). | UX | 🆕 |

### Architecture / performance / tech-debt
| ID | Item | Src | Status |
|----|------|-----|--------|
| CB-57 | **N+1 on hot paths** — backtest fetches prices serially per instrument; portfolio 4 queries × holding ×2; signal enrichment re-queries already-batched prices; strategy-rating serial loop nested in per-signal map. | ARCH §3.1 | 🟡 (prev-close batched in #124) |
| CB-58 | **No per-endpoint concurrency bound** under the 10-of-20 connection ceiling — N+1 + concurrent backtests + scheduler share 10 conns. **Most likely real-outage cause.** Add a tiny semaphore; drop pool to ~7. | ARCH §3.2 | 🟡 (chunked reads; no endpoint limiter) |
| CB-59 | **Redis declared but never used** (`profiles:[cache]`, no client) — wire it for read-model surfaces (latest-price/strategy-rating/signal-summary). Biggest available latency + connection-pressure win. | ARCH §3.3 | 🆕 |
| CB-60 | **`price_ticks` (5.5M rows) is a plain table** — no Timescale hypertable/time_bucket/continuous aggregates for backtest range scans. | ARCH §3.4 | 🆕 |
| CB-61 | **Cross-module repository import** — `backtesting-strategy-lab` imports `historical-context-snapshots.repository` directly (R5). Use the service. | ARCH R5 | 🆕 |
| CB-62 | **18+ lazy `require()` circular-dep workarounds** across 7 services — invert the worst cycle (signal-generation ↔ strategy-decision/calibration). | ARCH §2 | 🆕 |
| CB-63 | **Duplicated regime/marketGate thresholds** still echo across ~6 modules — import canonical `regimeFromScore`, don't re-encode bands. | ARCH §2 | 🟡 (#42 partial) |
| CB-64 | **`/health` returns `ok` blindly + no `statement_timeout`** — make health probe Postgres; add a Postgres `statement_timeout` so one slow query can't pin a connection. | ARCH §4 | 🆕 |
| CB-65 | **Quiet-hours stored but never enforced** (M2). | DOM P1 | 🆕 |

### Surface dedupe / cut (feature audit)
| ID | Item | Src | Status |
|----|------|-----|--------|
| CB-66 | **Remove the 3 stub radars (Compounder/Trader-Setup/Risk) from nav** — live links rendering "backend not available" erode trust. | PO ① | 🆕 |
| CB-67 | **Decide the orphaned `daily-overview-dashboard`** — fully built, wired, unrouted. Promote (→ CB-29 home) or delete. | PO ① | 🆕 |
| CB-68 | **Collapse Daily Review Shortlist vs Today Review** — two pages, same job; pick one, demote the other to a widget. | PO ① | 🆕 |
| CB-69 | **Park/hide Subscription-Billing** (keep schema) — off-thesis surface carrying real bug risk in a free single-owner phase. **Owner ruling.** | PO ①/⑤ | 🆕 |
| CB-70 | **Signal-quality outcomes: persist by default** (on-demand → O(signals) price fetches/load). | PO ②, DOM | 🟡 (#27/#16) |
| CB-71 | **Missing alert types** — earnings-on-holding, stop-hit, target-hit, LTCG-window, portfolio-total-drawdown (the most actionable). | DOM P1 | 🆕 |
| CB-72 | **A/D is point-in-time, not cumulative** — no A/D line / McClellan / new-high-low; raw counts not persisted. | DOM P1 | 🆕 |

---

## P3 — DEFER (commercial-phase infra / net-new screens / nice-to-have)
- **Commercial-phase infra** [ARCH §4 explicitly deferred]: durable job queue (pg-boss/Temporal), structured logging / error tracking, read replicas, graceful-shutdown drain, observability. Track for the commercial gate; keeping them out now *is* the "keep it simple" choice.
- **Net-new screens** [UX §3 / PO ③]: real **charting component** (volume-aligned, MA overlays, 52W band, corp-action markers — biggest single credibility upgrade, arguably pull to P1 for the workbench), peer/sector comparison panel (N2), earnings-calendar view (N3), realized-P&L/closed-positions screen (N4, pairs with CB-2), alert rule dry-run (N5), command palette + recently-viewed, IA sub-grouping of the 13-item nav.
- **First-class short surface** [PO ③] — honest regime-aware short surface (not a mirror of longs).
- **Advanced backtest stats** [DOM P1] — Calmar/Sortino/portfolio-heat/turnover/regime-segmented/Monte-Carlo.

---

## Owner rulings required (cannot be decided from code/charter)
1. **CB-4 / CB-6 — calibration: is the authoritative served score RAW or CALIBRATED?** (gates wire-vs-retire + the cut-point unification).
2. **CB-6 — rotate + purge broker creds** (owner action; I won't touch `.env`).
3. **CB-69 — billing's fate this phase** (park/hide vs keep maintaining).
4. **CB-38 — portfolio-health signal weight** (reduce vs replace with fundamentals-based quality).

---

## My re-prioritization analysis (the "is this list proper?" answer)
- **The audits agree on the spine, and it's correct:** the foundation-truth issues (CB-1 adjusted OHLCV, CB-7 spike rejection, CB-2/3/4 portfolio+calibration correctness) are genuinely P0 — they make *displayed numbers wrong*, which is the one thing the "accuracy-first" charter cannot tolerate. I kept all of these P0.
- **Biggest single lever is CB-1 (adjusted OHLCV).** It's the root of a whole class of silent errors and was spot-verified. If you fix one thing, fix that.
- **I deliberately did NOT inflate the commercial-phase infra.** The architecture agents rated observability/job-queue/read-replicas as P0/P1 against a *production* bar; against the 12-month single-user validation bar they're P3. Over-building them now would violate "keep it simple." (The architecture audit's own lead already down-graded these — I agree.)
- **Calibration (CB-4) is the one P0 that's blocked on you,** not on engineering — it needs the raw-vs-calibrated ruling before it can be fixed correctly.
- **The free-data items (CB-20..24)** are high *intelligence* value but sit at P1, below the correctness P0s, per the charter's `accuracy > intelligence` ordering. Delivery% (CB-20) is nearly free (already in the bhavcopy) so it's the cheapest P1.
- **Trade Journal UI (CB-26)** is the best effort-to-value ratio in the whole list (backend done, serves the literal purpose of the validation phase) — I'd slot it first among the P1 workflow items.
- **One genuine disagreement with the audits:** the UX audit's charting component is listed as net-new (P3-ish), but for the Research Workbench specifically it's a credibility cornerstone — I'd pull *that one* up to P1 when the workbench gets attention.

**Suggested execution order:** CB-1 → CB-7 → CB-5 → (owner ruling) CB-4 → CB-2/CB-3 → CB-26 → CB-20/CB-21 → CB-8/CB-9/CB-10 → CB-32/CB-28 → then the P2 UX/perf sweeps.

---

## NR — Always-on PO proposals (2026-06-05, domain-expert pass)

Net-new requirements from the standing PO agent (Indian-market domain expert), de-duped vs CB-1..72,
ranked under the market-first lens. My triage tier in [brackets]. These feed the backlog as it drains
(working-agreement #6). Full rationale per item is in the PO pass; condensed here:

| ID | Title | Surface | Tier | Effort |
|----|-------|---------|------|--------|
| NR-2 | SMA-50/200 overlays on workbench chart | Stock/workbench | **[P1]** | S |
| NR-3 | Nifty-50 benchmark overlay (rebased 100) on workbench chart | Stock/workbench | **[P1]** | S |
| NR-4 | Corporate-action ex-date markers on workbench chart | Stock/workbench | **[P1]** | S |
| NR-1 | Per-stock delivery% as a signal input + workbench display (consume CB-20 data) | Stock | **[P1]** | S |
| NR-9 | 52-week range position (high/low/%-from-low) on workbench + today-review col | Stock | **[P1]** | S |
| NR-7 | Sector drill-down → constituent signals (click sector → filtered screener) | Market→stock | **[P1]** | S |
| NR-10 | Earnings-season "heat" badge on Market Pulse / today-review header | Market | **[P1]** | S |
| NR-6 | RS rank / universe percentile on each signal + today-review | Stock | **[P1]** | M |
| NR-15 | Cumulative A/D line (persist daily net + chart) | Market/context | **[P1]** | M |
| NR-5 | Nifty Midcap/Smallcap cap-band breadth stratification | Market/context | **[P1]** | M |
| NR-12 | FII/DII flows as regime input + Market Pulse widget (specific wiring of CB-21) | Market | **[P1]** | M |
| NR-8 | NSE PCR / F&O OI ingest → regime sentiment input | Market | **[P1]** | M |
| NR-11 | "Why did this move?" deterministic explainer on today-review candidate detail | Stock | **[P1]** | M |
| NR-14 | Signal concentration-risk warning (sector clustering) on today-review | Market view | **[P2]** | S |
| NR-13 | Sector signal-count trend (rolling 5D sparkline) on Market Context | Market | **[P2]** | M |
| NR-18 | Liquidity / circuit-limit (cap-tier) badge on workbench header | Stock | **[P2]** | S |
| NR-16 | Multi-timeframe confluence (weekly trend) in signal evidence | Stock | **[P2]** | M-L |
| NR-17 | Results-season impact table (post-result reaction + QoQ momentum) | Stock/market | **[P2]** | L |

**My triage notes:** NR-2/3/4 (chart overlays) + NR-1/NR-9 (delivery%, 52W) + NR-7/NR-10 are the
highest effort-to-value wins — all S-effort, pure market/stock-screen improvements, mostly no new data.
NR-8/NR-12 need new free NSE ingests (overlap CB-21/CB-24 source files — sequence them together).
NR-16/NR-17 are L → defer. The chart overlays (NR-2/3/4) collectively realize the "charting component"
the UX audit deferred to P3 — incrementally, on the existing Recharts chart, without a library swap.

**Recurring PO cadence (working-agreement #6):** re-run this PO pass at the start of each wave and as the
backlog drains, so the queue never runs dry.

---

## NR-19..35 — Browser-grounded PO pass (2026-06-05, drove the running app)

The PO drove the live app (per upgraded working-agreement #6) and catalogued ACTUAL rendered data
points per screen. Concrete, screen-grounded — found runtime issues a code read missed. Triage:

| ID | Screen | Title | Tier | Effort |
|----|--------|-------|------|--------|
| NR-19 | market-context, signals | **Blank-screen crash** — duplicate route registration (routes.tsx ~100-101) | **P0** | S |
| NR-20 | Workbench | `TEST_CONNECTED_CHAIN` source label leaks on RELIANCE (metadata provider field) | **P0** | S |
| NR-27 | Daily Review | RELIANCE stop ₹179.87 (pre-bonus unadjusted) shown with no warning; add >40%-gap guard | **P0** | S |
| NR-25 | Daily Review | Regime + Sector + DQ columns always "—" (display-wiring gap; data exists) | P1 | S |
| NR-22 | Market Pulse | India VIX widget (ingest from index bhavcopy; cap posture >22) — UI half of CB-23 | P1 | S |
| NR-23 | Market Pulse, Daily Overview | A/D ratio as a headline number (basic daily count; simpler than CB-72 line) | P1 | S |
| NR-21 | Market Pulse | Health score prior-day delta + 5-day sparkline (read persisted snapshots) | P1 | S |
| NR-31 | Workbench | Derived PE / Market Cap / Dividend Yield (computable from close+EPS+divs) | P1 | S |
| NR-29 | Daily Overview | Entire screen empty — wire movers/regime/candidates from persisted data | P1 | M |
| NR-28 | Research Hub | Drilldown tabs render chrome with no content behind them | P1 | M |
| NR-33 | Backtesting | Low-sample CI warning (<30 trades) + zero-exit anomaly flag | P1 | S |
| NR-34 | AI Copilot | Market Brief never loads — auto-load + stale fallback + spinner | P1 | S |
| NR-32 | Backtesting | Monthly-return grid + regime-segmented summary | P1 | M |
| NR-26 | Daily Review | Confidence note repeated 20× — hoist to table header | P2 | S |
| NR-24 | Market Pulse | Sector warning enums unhumanized (LATEST_PRICE_STALE_…) — CB-51 remainder | P2 | S |
| NR-30 | Smart Money | Sector classification always NEUTRAL — band too wide | P2 | S |
| NR-35 | Backtesting | Saved Runs list opaque — show strategy/universe/metrics | P2 | S |

Note: NR-19/20/27 are P0 (visible trust breakage on market screens). NR-22/23 are the UI halves of
CB-23/CB-72. Several deepen CB-1/CB-48/CB-50/CB-51 with concrete observed instances.

---

## PO Browser Pass — Wave 6 (2026-06-05) — NR-36+

Source: live API audit (backend :3000) + full frontend source read of all 10 target screens.
Browser rendering was blocked by Vite HMR crash (NR-36 below); audit performed via direct API calls
and React component source analysis. Every finding is confirmed against real API responses.

### Critical (P0)

| ID | Screen | Title | What is missing / wrong | Why it matters to an Indian trader | P | Effort |
|----|--------|-------|------------------------|------------------------------------|---|--------|
| **NR-36** | All market/stock screens | **Vite HMR crash — entire app blank in dev server after module edits.** `routes.tsx` lines 100-101 register `operatorRoutes` twice (once under `admin/` prefix AND once bare). The bare copy makes `signals`, `smart-money`, `backtests` etc. route-collide with their prefixed admin copies. The first navigation after an HMR reload triggers a `ReferenceError: Cannot access 'SignalsDashboardPage' before initialization` TDZ, which crashes the React tree and leaves a blank page. Fix: remove line 101 (`...operatorRoutes`) — those routes belong only under the admin prefix. | A crashed app is un-auditable and un-tradeable. Every other market screen fix is blocked until this is solved. | **P0** | XS |
| **NR-37** | Market Pulse, Daily Overview | **stale INDEX/SECTOR_INDEX/DELIVERY data never surfaced as a staleness badge to the user.** API returns `sourceSummary.segments.INDEX.status:"STALE"` (last imported 2026-06-01, expected 2026-06-05). The frontend shows a `PARTIAL` chip globally but does not show which segment is stale or how many days behind it is. Index returns (^NSEI, ^CNXMETAL etc.) shown on Market Pulse are therefore 4 days old with no per-widget warning. | A trader reading index trend scores or sector strength chips is silently looking at old data and may form a wrong market opinion. NSE sector indices should be fresh daily. | **P0** | S |

### High value (P1)

| ID | Screen | Title | What is missing / wrong | Why it matters to an Indian trader | P | Effort |
|----|--------|-------|------------------------|------------------------------------|---|--------|
| **NR-38** | Market Pulse | **VIX stale date shown in tooltip but not on the widget face.** API returns `vixSummary.asOf:"2026-06-01"` — 4 days stale — and `posture:"ELEVATED"` (16.54). The widget chips the current level and 5D range, but the `asOf` date is buried in a Tooltip hover. A trader who does not hover never knows the VIX reading is from last Friday. | India VIX is the primary fear gauge used by Indian options traders; a stale ELEVATED reading could cause unnecessary caution or false confidence. Surface "as of DD-Mon" inline on the chip. | P1 | XS |
| **NR-39** | Market Context (admin/market-context) | **Cap-band breadth table renders empty on first load.** `CapBandBreadthTable` shows "Cap-band breadth not yet computed. Run market-context refresh to generate." because `summary.breadthByCapBand` is `[]` in the persisted summary endpoint. The `calculateBreadthByCapBand` logic exists in the service but requires a manual `POST /market-context/run` to populate the stored JSON column. There is no automatic trigger after daily data import. | Mid/small-cap breadth divergence from large-cap is one of the most important early-warning signals in Indian markets (Nifty 50 vs Nifty Midcap 150 divergence). The table exists but always shows a placeholder. | P1 | S |
| **NR-40** | Sector View (market-intelligence/sectors) | **`relativeStrength` is `null` for every constituent in the sector drill-down.** All 30 sampled rows from `/market-intelligence/sector-constituents?sector=Technology` return `"relativeStrength":null`. The constituent table renders an "N/A" or blank RS column for every stock. The workbench `/research/stocks/:id/relative-strength` endpoint does return a real value per instrument, but sector-constituents never calls it or joins it. | RS vs Nifty 50 and vs sector average is the primary filter a momentum trader uses to pick which stock within a sector to buy. Blank RS in the sector drill-down forces a manual detour to the workbench for every candidate. | P1 | S |
| **NR-41** | Research Hub (/research) | **Actionability blockers are always "INSUFFICIENT_DATA" — three of the five dimensions never wire upstream modules.** `calibrationReadiness`, `todayReviewReadiness`, and `tradePlanReadiness` all return `"status":"INSUFFICIENT_DATA"` with hard-coded messages ("not yet a stable Research Hub input"). Backend code confirms these are stub placeholders. The Research Hub priority board therefore always shows a "NOT CONFIRMED" headline regardless of the actual pipeline state. | The Research Hub is designed to be the daily go/no-go gate. When it permanently shows "insufficient data" it trains the trader to ignore it, defeating the entire workflow. | P1 | M |
| **NR-42** | Research Hub (/research) — Drilldown tabs | **Drilldown tab "Market Pulse" renders correctly but "Breadth", "Sector Map", and "Flow" tabs show empty tables.** Confirmed by source: `ResearchDrilldownTabs` fetches `fetchPersistedMarketBreadth()` (which returns `materialized:false` and no official advance/decline counts — `officialAdvanceCount:null`), `fetchSectorIntelligenceSnapshot()` (stale; data available), and `fetchSmartMoneySectors()` (works but renders in a separate stub path). The Breadth tab shows N/A for official A/D because NSE's official advance/decline count is not persisted. | A trader coming to the Research Hub for a market breadth check finds the tabs either empty or showing null counts, undermining the "one-stop morning briefing" intent. | P1 | S |
| **NR-43** | Today Review (/today-review) | **Earnings blackout flag exists in the API candidate response but is not rendered in the candidate table or detail page.** The `TodayReviewCandidate` type has `earningsBlackoutWarning` and `riskTags` fields. The detail page's `buildPriceBehaviourText()` assembles a sentence from `signals.priceBehaviour` but the earnings risk tags (`EARNINGS_DATE_NEAR`, `RESULT_DATE_USES_PERIOD_END_DATE_FALLBACK`) do not appear as visible warnings in the candidate row or the detail card's risk section. | Entering a position 1–2 days before a result announcement is one of the biggest avoidable blunders an Indian trader can make. The data exists; it needs to be visible on every candidate row. | P1 | S |
| **NR-44** | Signals Dashboard (/admin/signals) | **`calibrationStatus === 'CALIBRATED'` column visible but `calibratedScore` and `reliabilityTier` are `null` for the majority of signals in the table.** API confirms: the bulk top-signals endpoint returns `calibratedScore:92, reliabilityTier:"FULL"` only for the few recently re-calibrated instruments. The signal table shows "—" for uncalibrated rows with no explanation of why. A trader cannot distinguish "no calibration run yet" from "calibrated but uncalibrated is the same as raw". | Calibration is the trust backbone of the signal system; if most rows show blank calibration the trader cannot compare calibrated vs raw conviction. Add "Pending" / "Not run" label so absence is explained. | P1 | S |
| **NR-45** | Smart Money (/admin/smart-money) | **Smart Money data is 8 days stale (`updatedAt:"2026-05-28"`) with no staleness warning on the page.** Sectors table and stock detail all carry this date. The frontend renders the data without any staleness indicator or "last updated" label visible without hovering. The delivery data is also stale (2026-06-01) so the underlying signals are based on week-old accumulation evidence. | An Indian trader using smart-money accumulation to time entries is looking at a week-old picture, potentially entering after the institutional move has already completed. Surface last-updated prominently. | P1 | S |
| **NR-46** | Earnings Intelligence (/earnings-intelligence) | **All five active earnings categories (`UPCOMING_RESULTS`, `PRE_RESULT_INTEREST`, `RESULT_WINNERS`, `RESULT_DISAPPOINTMENTS`, `RESULT_REACTION_HISTORY`) are empty arrays.** Only `EARNINGS_WATCHLIST` has entries (watchlist items with `resultDateSource:"PERIOD_END_DATE_FALLBACK"` and warnings). The earnings page therefore shows blank tabs for the 5 most trader-relevant categories. | Indian earnings season drives the largest single-day moves in individual stocks. A trader relying on this screen for upcoming result dates or post-result reaction winners gets empty lists every day. | P1 | M |
| **NR-47** | Backtesting (/admin/backtests) | **Exit diagnostics are computed but not surfaced in the run results UI.** API returns `exitDiagnostics:{maxHoldExitCount:14, medianHoldingDays:44, stopLossExitCount:0}`. The UI shows a metrics panel (CAGR, Sharpe, win-rate) but no breakdown of HOW exits occurred (max-hold vs stop-loss vs strategy-exit). `maxHoldExitCount:14 / 15 trades = 93%` means almost every trade exited on the holding-period timeout — the strategy never generated a signal-based exit. This is invisible. | A backtest where 93% of exits are "ran out of time" (not a strategy exit) is telling the trader the strategy has no exit logic — a critical validity signal. An Indian trader sizing real capital on this backtest needs to see this. | P1 | S |

### Polish / Consistency (P2)

| ID | Screen | Title | What is missing / wrong | Why it matters to an Indian trader | P | Effort |
|----|--------|-------|------------------------|------------------------------------|---|--------|
| **NR-48** | Market Pulse | **`strongSectors` and `weakSectors` chips display raw index ticker codes** (`^CNXMETAL`, `^CNXAUTO`, `NSE_INDEX_NIFTY_INFRASTRUCTURE`) rather than human names. The `SectorDrillChip` component calls `indexLabel()` on the raw symbol but `indexLabel()` only resolves `^NSEI`→"Nifty 50" and falls back to the raw symbol for sector indices.** | A trader reading "^CNXREALTY is weak" instead of "Realty is weak" has to decode NSE ticker conventions manually. The `indexLabel()` lookup table needs these 12+ sector index mappings. | P2 | XS |
| **NR-49** | Sector View (market-intelligence/sectors) | **Sector page data is stale by 1 day (`dataThroughDate:"2026-06-02"` while CM data is fresh to 2026-06-05) but shows no per-sector staleness indicator.** Each sector row has its own `dataThroughDate` and a `SECTOR_INDEX_PRICE_STALE_FOR_DATA_THROUGH_DATE` warning, but the warnings are never shown in the table or as a chip. The table just renders returns that are 3 days old alongside today's signal arrows. | Mixing 3-day-old sector return% with today's signal direction creates a visual inconsistency that can mislead a sector-rotation trader. | P2 | XS |
| **NR-50** | Stock Research Workbench (/stocks/:id) | **`peer_average_pe` and `peer_average_dividend_yield` are always `null` in the valuation section.** API: `{"pe_ratio":13.36,"peer_average_pe":null,"dividend_yield":0.0073,"peer_average_dividend_yield":null}`. The workbench renders "N/A" for both peer averages. The peers list IS returned (10 peers for BANDHANBNK), so a peer PE average is computable from the returned data. | A trader using the workbench to check if a bank stock is cheap vs peers sees only the stock's own PE — without the sector average there is no anchor for "cheap" or "expensive". | P2 | S |
| **NR-51** | Stock Research Workbench (/stocks/:id) | **`signalEvidence.outcomeDepth` is `null` and `winRate` is `null` for the signal evidence section.** API: `{"status":"NO_TRACK_RECORD","outcomeDepth":null,"winRate":null}`. The `SignalEvidencePanel` therefore always shows "No outcome track record yet" even though the Quality Lab dashboard shows 583 evaluated signals with a 56.4% bullish win-rate on 20D. The per-instrument track record is not being populated from the signal outcomes.** | A trader deciding whether to act on a BULLISH signal for a specific stock has no per-stock historical win-rate. The system-level 56% is in the admin-only Quality Lab. | P2 | M |
| **NR-52** | Research Hub (/research) — whatChanged | **`whatChanged.warnings` always shows "No prior snapshot to compare yet; run the pipeline again."** `generatedAt:"2026-06-01T09:00:00.000Z"` is hardcoded-looking (9am static timestamp). The "what changed" section — which should show new candidates, upgraded/downgraded names, market gate changes — is permanently empty. | This is the primary daily briefing hook — "what is different from yesterday." Without it the Research Hub is just a status page, not an intelligence page. | P2 | M |
| **NR-53** | Today Review candidate detail | **`priceBehaviourText` produces null for the "Price behaviour" card on most candidates.** `buildPriceBehaviourText()` reads `signals.priceBehaviour` which requires `rsiZone`, `nearHigh`, `nearLow`, `trendAligned`. The API candidate detail does not include a `signals.priceBehaviour` sub-object — the field comes back missing/null. The "Price behaviour" section renders nothing. | A trader needs to know the price context at the point of entry decision: overbought RSI? Near ATH? Price behaviour is the single sentence that replaces a chart read for a quick daily review. | P2 | S |
| **NR-54** | Signal Quality Lab (/admin/signals/quality) | **`by-regime` endpoint returns empty.** Direct API call confirmed: the `by-regime` endpoint returns nothing (empty response or auth-gated at the time of the rate-limit). The `horizonAvailability` shows only `20D` as USABLE and `1D`/`5D`/`10D`/`60D` all "UNAVAILABLE". This means the quality lab is showing the trader only 20D outcomes with no by-regime breakdown. | A trader who wants to know "does this signal work in a NEUTRAL regime?" finds no regime-segmented data. This directly blocks the trustworthiness of the signal system in the real Indian market context (which is NEUTRAL today). | P2 | S |

**Summary of NR-36..54 triage:**
- NR-36 is P0 (app is blank / un-navigable after dev-server starts). Fix is a one-line delete in routes.tsx.
- NR-37 is P0 (stale market data displayed with no visible warning — trader sees wrong numbers).
- NR-38..47 are P1 (missing context that directly affects a trade decision).
- NR-48..54 are P2 (misleading labels, missing peer anchors, empty sections that frustrate but don't cause wrong trades).

**Already-filed items that this wave confirms (no new id needed):**
- NR-5 (cap-band breadth empty → confirmed NR-39 is the actionable fix).
- NR-6 (RS column → confirmed blank in sector constituents, NR-40 is the concrete action).
- NR-11 (priceBehaviour card → confirmed null in API, NR-53 is the gap).
- NR-28 (research-hub drilldown tabs empty → confirmed, NR-42 is the concrete subitem for Breadth tab specifically).

---

## PO Browser Verification — Wave 9 (2026-06-05) — NR-55+

**Session:** Preview MCP on port 5181, logged in as test@example.com. All 11 shipped fixes evaluated against live app with real data. Browser driven via `preview_eval` / `preview_snapshot`; backend APIs probed directly via `fetch` with auth token where UI routes were inaccessible due to HMR crash.

### Verification Summary

**Environment caveat:** The Vite dev server has a persistent HMR loop on `MarketDataFoundationPage.tsx` (file was recently edited; git status shows it modified). This creates a TDZ (`ReferenceError: Cannot access 'MarketDataFoundationPage' before initialization`) that propagates through the non-lazy `routes.tsx` module graph and blanks out all routes that share the same eagerly-imported chunk (operator routes: `signal-quality-lab`, `smart-money`, `backtests`, `signals`, `today-review`, `research`, `market-context`, `daily-overview`, `daily-review-shortlist`, `instrument-workspace`). **Workaround used:** navigate to each route with a fresh full-page load (`window.location.href = ...`) rather than SPA push. Pages loaded cleanly on first hard navigation; crash only occurs on SPA `history.pushState` after the HMR loop corrupts the module graph in memory. Quality Lab FE was not loadable via this workaround; verified via direct API call with auth token instead.

| Fix # | Screen / Widget | Result | Rendered value observed |
|---|---|---|---|
| 1 | Signals dashboard — RS column | ✅ | Values present: BANDHANBNK=88, APCOTEXIND=42, etc. Tooltip: "RS percentile 88 — stronger than 88% of signals in this universe". All 25 visible rows show numeric RS — no "Pending" visible (all signals currently have calibration data). |
| 2 | Market Context — Breadth by Cap Band | ✅ | Large: 56.5%/>SMA50, 51.9%/>SMA200, 177/170 A/D, N=347. Mid: 64.5%/46.4%, 199/224, N=424. Small: 65.2%/45.0%, 304/397, N=704. All three bands populated with real values. |
| 3 | Market Pulse — sector chips & staleness badge | ✅ | Strong chips: "Nifty Metal", "Nifty Pharma", "Nifty Capital Markets". Weak chips: "Nifty Media", "Nifty Auto", "Nifty Infrastructure", "Nifty Realty", "Nifty Private Bank". No raw `^CNXMETAL` visible. VIX staleness badge: "as of 1 Jun 2026 · 4 days old" confirmed inline. |
| 4 | Daily Overview — movers/regime/candidates/sector/staleness | ✅ | Movers: AGRITECH +19.99%, PRIMO +18.84% visible. Regime: NEUTRAL. Staleness: "as of 4 Jun 2026 · 1 day old". Signal Candidates: APCOTEXIND rank #1, Grade A/95. Sector Strength: Information Technology Leading 75.8% 1M, Real Estate Weak -7.7%. All sections populated. |
| 5 | Research Hub — drilldown tabs / actionability / breadth | ⚠️ | Tabs (Market Pulse / Breadth / Sector Map / Flow) all render with data. Breadth tab: computed A/D 1082/1253, note "Official NSE A/D not ingested" present. Actionability: still "INSUFFICIENT_DATA" — three readiness dimensions (calibration, today-review, trade-plan) are hard-coded stubs (confirmed via NR-41). Not fixed in this wave. |
| 6 | Today Review — "Price behaviour" card / "Earnings in Nd" chip | ⚠️ | "Price behaviour" card: confirmed present on APCOTEXIND detail ("with recent volume activity confirmed"). "Earnings in Nd" chip: NOT found on any of the 20 Long Review candidates. No `earningsBlackoutWarning` chips rendered in candidate rows or detail. |
| 7 | Sector view — expand shows constituents | ✅ | Market Pulse → Sector Intelligence table → "Metal" row expanded. Shows "30 constituent stocks — top by market cap, persisted-read only" with ULTRATECH, JSWSTEEL, TATASTEEL, HINDZINC + price, 1W%, 1M%, Signal, Score, Workspace link. |
| 8 | Stock Research Workbench (RELIANCE) — calibrated score / RS / ISIN | ⚠️ | ISIN: INE002A01018 ✅. RS section renders ("Relative Strength") but shows MISSING status — Stock Return N/A, Benchmark (^NSEI) 0.15%, vs Benchmark N/A, Basis "1Y nse_nifty_50". Signal score: BULLISH 86, "calibration pending" shown (not "NO_TRACK_RECORD"). Calibrated score not surfaced on Research tab. |
| 9 | Smart Money — directional classifications / staleness badge | ⚠️ | Classifications: ACCUMULATION (ADANIPOWER, AFIL, ALKALI), DISTRIBUTION in sector table (Communication Services: Distribution). Not all-NEUTRAL ✅. Sector-level labels: Utilities "Strong Accumulation", Technology/Basic Materials/Consumer "Neutral", Communication Services "Distribution". Staleness badge: NOT visible on the page — data shown with no date label. |
| 10 | Backtest — Exit breakdown / Quality Lab by-regime | ✅ | Exit Breakdown: Strategy/signal 215 (89.6%), Max-hold 0 (0.0%), Stop loss 3 (1.3%), Trailing stop 12 (5.0%), End of test 10 (4.2%). Regime table: NEUTRAL 14.6% CAGR / 35.4% win-rate / 144 trades; RISK_ON -0.5% / 29.2% / 96 trades. By-regime API confirmed: NEUTRAL 58.9% win-rate, RISK_OFF 34.7%, RISK_ON 57.0% all present. Quality Lab FE route blank (HMR crash) — verified via API. |
| 11 | Earnings screen — Upcoming Results / Pre-result categories | ✅ | Upcoming Results tab: ARFIN result 8/14/2026 (Estimated), TATACAP 8/14/2026 (Estimated), etc. with Days-to-Result, Revenue/Profit/EPS Growth. Pre-Result Interest: TATACAP present with PRE_RESULT_DELIVERY_INTEREST tag. Categories no longer empty. Date source clearly labelled "Estimated From Period Cadence". |

### Remaining gaps / new findings

| ID | Screen | Issue | Severity | Tier |
|---|---|---|---|---|
| **NR-55** | Signals Dashboard (/admin/signals) — RS column | **RS "Pending" label never appears** because the current dataset has all 25 displayed signals calibrated. The fix is confirmed code-complete (column renders, tooltip correct) but cannot be visually verified as "Pending" until a new signal is generated for an instrument with no calibration history. Add a test fixture or force an uncalibrated signal to appear in the Screener tab to confirm the "Pending" path renders. | P2 | Market |
| **NR-56** | Smart Money (/smart-money) | **No staleness badge anywhere on the page.** Smart money sector data carries `updatedAt` dates but the frontend renders no "as of" or "N days old" indicator. Sector rows show no date, stock rows show no date. Previously filed as NR-45 but the specific badge (matching the Market Pulse / VIX staleness badge pattern) is absent — confirmed by browser scan. | P1 | Market |
| **NR-57** | Research Hub (/research) — Actionability | **Actionability is permanently "INSUFFICIENT_DATA" for 3 of 5 dimensions.** `calibrationReadiness`, `todayReviewReadiness`, and `tradePlanReadiness` return hard-coded stubs ("not yet a stable Research Hub input"). Confirmed by both FE text and source code. The Research Hub headline will always show "NOT CONFIRMED" until these three wires are implemented. Filed as NR-41 but upgrading priority here: this is the daily go/no-go gate. | P1 | Market |
| **NR-58** | Stock Research Workbench — Relative Strength | **RS section shows MISSING / N/A despite benchmark data existing.** RELIANCE: `Stock Return N/A`, `vs Benchmark N/A`, `Basis: 1Y nse_nifty_50`. The benchmark has data (shows 0.15% for ^NSEI) but the stock's own 1Y return is null in the RS object. The backend `relative-strength` endpoint returns the benchmark but fails to compute the stock's own return for the relative comparison. Blocks the RS % comparison entirely. | P1 | Market |
| **NR-59** | Stock Research Workbench — Calibrated Score | **"calibration pending" shown on Research tab signal score instead of calibrated value.** RELIANCE shows raw score 86 BULLISH but the calibrated score is not surfaced. The Calibration tab just links to the admin dashboard with no inline calibrated score. For a trader using the workbench as a research tool, the calibrated conviction score is the most important output. | P1 | Market |
| **NR-60** | Today Review — Earnings chip on candidate rows | **"Earnings in Nd" chip absent from all 20 Long Review candidate rows.** The `earningsBlackoutWarning` field exists in the API type but is not rendered as a visible chip or warning in either the candidate table row or the detail panel. Confirmed by full text scan of all candidate rows. This is the same gap as NR-43 but re-confirmed here with empirical evidence. | P1 | Market |
| **NR-61** | Quality Lab FE (/signal-quality-lab and /admin/signal-quality-lab) | **Both routes blank (white screen) in current dev server state** due to HMR module graph corruption. The by-regime data is healthy (API confirmed: NEUTRAL 58.9%, RISK_OFF 34.7%, RISK_ON 57.0%) but the FE is completely inaccessible. Root cause: eager (non-lazy) import in routes.tsx + HMR TDZ on MarketDataFoundationPage poisons all co-bundled routes. Fix: convert operator-route imports to `React.lazy()` so each route chunk is isolated from HMR failures in sibling modules. | P0 | Dev |
| **NR-62** | All operator routes (backtests, smart-money, signals, market-context, daily-overview, etc.) | **SPA navigation crashes the app after any HMR reload** (see NR-61 root cause). Only hard full-page reloads (`window.location.href = ...`) recover the app. This means the hamburger/sidebar navigation is broken in the dev environment: any `<Link>` click after the HMR loop fails = blank app. In production this would not occur (no HMR), but it makes local verification and development extremely painful. Convert all operator-route imports to `React.lazy()`. | P0 | Dev |
| **NR-63** | Market Pulse / Sector Intelligence table | **`SECTOR_INDEX_PRICE_STALE_FOR_DATA_THROUGH_DATE` warning is shown inline in each sector row** but lacks a user-friendly explanation. The raw enum string is visible in the Warnings column of the sector table. A trader sees "SECTOR_INDEX_PRICE_STALE_FOR_DATA_THROUGH_DATE" but does not know what action to take or how stale the data is. Humanize the warning text to "Sector index price is X days stale" with the actual date. | P2 | Market |
| **NR-64** | Market Pulse / Sector Intelligence table | **Sector rows show numerical score (74 for Metal) but no color/directional hint** for whether the score is high, medium, or low. The score is a raw number with no legend or visual encoding. Compare to Market Context where Leading/Lagging labels are shown. The Sector Intelligence table only shows the enum "Strong" / "Weak" classification in a separate cell — the score is unanchored. Add a mini color band or "score vs universe median" note. | P2 | Market |

### Summary of NR-55..64 triage

- **NR-61, NR-62**: P0 dev-environment blockers — operator routes non-navigable via SPA; fix is `React.lazy()` conversion.
- **NR-56, NR-57, NR-58, NR-59, NR-60**: P1 market-screen gaps — staleness badge on Smart Money, Research Hub hard-coded stubs, RS computation broken, calibrated score not surfaced in workbench, earnings chip absent.
- **NR-55**: P2 — RS "Pending" path not exercise-able with current data; needs test fixture.
- **NR-63, NR-64**: P2 — UX polish on Sector Intelligence table warnings and score encoding.

---

## PO Browser Pass — Wave 13 (2026-06-05) — NR-65+

**Session:** Preview MCP port 5181 + direct backend API calls (token auth). Login test@example.com. Backend :3000 confirmed running. All 6 Part-1 target widgets verified; 13 market screens swept. HMR loop on `DailyOverviewDashboardPage.tsx` still active (confirmed via console: `Failed to reload …DailyOverviewDashboardPage.tsx`), but hard full-page navigations (`window.location.href=`) allow most pages to render. Signal Quality Lab is now a missing route (console warns `No routes matched location "/admin/signal-quality-lab"`) rather than just an HMR blank — the route was not re-registered after the last wave's changes.

### Part 1 — Widget Verification Table

| # | Widget | Result | Value seen |
|---|--------|--------|------------|
| 1a | Market Context — FII / DII Activity | ✅ | DII +₹9,133.57 Cr / FII −₹8,776.25 Cr · "As of 05 Jun" · source NSE |
| 1b | Market Context — Bulk & Block Deals | ✅ | 6 Block deals (ADANIENT/GQG sell, SBI buy; ADANIENSOL/GQG/SBI; LENSKAR/VIRIDIAN/COPTHALL) + 109+ Bulk deals visible; "As of 05 Jun". Note: FE table shows individual rows not a "134 bulk" summary count — count confirmed by row scan. |
| 2 | Smart Money — F&O Ban List | ✅ | AMBER + KAYNES displayed. "As of 2026-06-08 — 2 securities in ban period." (First page-visit showed "no data persisted" placeholder; second visit after auto-ingest showed correct data.) |
| 3 | Market Context — Breadth by Cap Band | ✅ | LARGE 56.5% >SMA50 / 51.9% >SMA200 / A-D 177/170 / N=347. MID 64.5%/46.4%/199:224/N=424. SMALL 65.2%/45.0%/304:397/N=704. All three bands populated. |
| 4a | Smart Money — staleness badge on header | ✅ | "as of 28 May 2026 · 8 days old" present in page header. |
| 4b | Smart Money — sector classifications directional | ✅ | ACCUMULATION: ADANIPOWER, AFIL, ALKALI, APOLLO, ASTRAMICRO, BLISSGVS … DISTRIBUTION: Communication Services sector row. Not all NEUTRAL. |
| 5 | Research Hub — Actionability NOT "INSUFFICIENT_DATA" | ✅ | Top-level `overallStatus: UNPROVEN`. Headline: "Actionable setup review is not proven yet; review strategy evidence first." Confirmed via both FE render and API. Note: `todayReviewReadiness` and `tradePlanReadiness` sub-dimensions are still INSUFFICIENT_DATA (hard-coded stubs — NR-57 remains open). |
| 6a | Workbench (BANDHANBNK) — inline calibrated score | ✅ | Signal Score BULLISH 92 · "Calibrated score: 92 · persisted calibration" shown inline on Research tab. |
| 6b | Workbench (BANDHANBNK) — relative-strength vs Nifty | ✅ | Stock Return 24.51% · Benchmark (^NSEI) −5.26% · vs Benchmark 29.77% · Basis: 1Y nse_nifty_50. Real values, not N/A. |
| 6c | Workbench (BANDHANBNK) — ISIN visible | ✅ | INE545U01014 on Overview tab. |

**Part 1 summary: 9/9 sub-checks pass. NR-57 (Research Hub todayReview/tradePlan stubs) is the one remaining open item that was explicitly flagged.**

### Part 2 — Remaining gaps (broad re-catalog)

| Screen | Widget / Section | Issue |
|--------|-----------------|-------|
| Smart Money | F&O Ban List | First page-load shows "No F&O ban data persisted yet. Run POST /api/v1/smart-money/fno-ban/ingest." — ingest not triggered automatically on page open; requires a manual Refresh click. Inconsistent with other widgets that auto-ingest on render. |
| Smart Money | Page staleness context | "8 days old" badge in header but stock-level rows and sector rows show no `updatedAt` date. A trader scanning the ADANIPOWER row has no idea the score is from 28 May. (NR-56 persists.) |
| Research Hub | todayReviewReadiness / tradePlanReadiness | INSUFFICIENT_DATA hard-coded in backend source for both dimensions. Always "Not yet measured." (NR-57 persists.) |
| Research Hub | whatChanged section | `generatedAt: "2026-06-01T09:00:00.000Z"` — looks like a static timestamp. "No prior snapshot to compare yet" warning shown every session. The diff engine is not accumulating snapshots between runs. |
| Research Hub | Snapshot date | "As of 6/1/2026, 11:00:00 AM" — 4 days stale vs current data (2026-06-05). The research hub snapshot is not being refreshed by the pipeline. |
| Daily Overview | All sections | All five data sections empty on every load: "No rows available" for movers/gainers/losers, "Unavailable" for A/D/Regime, no signal candidates, no sector rows. Backend API (`/api/v1/market-data/movers`) returns real data (AGRITECH +19.99%, PRIMO +18.84%) but the FE page does not display it. The Today Review and Market Context sub-fetches also fail silently. (NR-29 persists.) |
| Signal Quality Lab | Route `/admin/signal-quality-lab` | Console: `No routes matched location "/admin/signal-quality-lab"`. Route is not registered in the active router — always blank white page. Backend API `/api/v1/signals/quality/summary` works (583 evaluated signals, 56.4% bullish win-rate, by-regime data present). (NR-61 now confirmed as a missing route registration, not just HMR blank.) |
| Sector View `/market-intelligence/sectors` | Entire page | Blank white page (root div empty). Route not matching after HMR loop. Backend API `/api/v1/market-intelligence/sectors` returns valid data (Metal STRONG, 74 score). |
| Today Review | Regime / Sector columns in candidate rows | Columns show "—" for every candidate (APCOTEXIND row confirmed: `— — 6/4/2026 — — — —`). Regime and Sector columns are empty despite the data existing in the run context. (NR-25 persists.) |
| Today Review | Earnings chip on candidate rows | No `earningsBlackoutWarning` chip rendered on any of 25 Long Review rows. `riskTags` field not surfaced in the row or detail panel. (NR-60 persists.) |
| Today Review | Duplicate React key error | Console error: `Encountered two children with the same key "cmowuxfmo008aw52gk45b4bug:OUTSIDE_TRUSTED_UNIVERSE"` — repeated 12+ times. Candidate rows with OUTSIDE_TRUSTED_UNIVERSE exclusion reason use the instrument ID + reason as key, causing duplicates when the same instrument appears in multiple exclusion categories. |
| Workbench | Instrument Context Rail | All 7 context fields (Market Pulse State, Sector State, RS, Earnings Status, Compounder, Setup, Risk) show "Unavailable". "The InstrumentContextSnapshot read API is missing." This text is developer-copy leaking to the trader. (CB-53 / NR-53 context rail persists.) |
| Workbench | adjusted_close note | "adjusted_close is not persisted; close is returned as adjusted_close for MVP display" visible in the price section. Developer-copy leaking to trader. (CB-49 persists.) |
| Market Context | Trend score raw float | Regime description reads "…Nifty 50 index 63-bar trend score is **33.68406706005322**." Raw unformatted float shown in the user-facing regime narrative. Should be rounded to 2 decimal places (33.68). |
| Market Context | Macro Snapshot | "UNKNOWN — Macro providers are not configured yet. MISSING" visible in the page body. A trader sees a prominent MISSING/UNKNOWN block with no explanation of what they would need to configure. Low-priority but developer-facing copy leaks. |
| Backtesting | Monthly return grid | Some months show 0.0% for periods where the strategy had no open positions — correct behaviour but indistinguishable from missing data with no note. |
| AI Copilot | Market Brief | Loads successfully via API. FE route not swept in this pass (no nav entry in main nav visible). |

### New Requirements NR-65+

| ID | Screen | Title | What is missing / wrong | Why it matters to an Indian trader | P | Tier |
|----|--------|-------|------------------------|------------------------------------|---|------|
| **NR-65** | Signal Quality Lab (`/admin/signal-quality-lab`) | **Route is not registered — page is permanently blank** | Console confirms `No routes matched location "/admin/signal-quality-lab"`. The route was likely dropped during the Wave 10 routes.tsx refactor. Backend API is fully healthy (583 evaluated signals, NEUTRAL 58.9% win-rate, by-regime breakdown available). Only the FE route registration is missing. Fix: add the route back to the operator routes block. | The Quality Lab is the only place where a trader can see signal win-rates by regime and horizon — the core trust surface for the entire signal pipeline. A missing route makes it completely inaccessible. | **P0** | Market-first |
| **NR-66** | Sector View (`/market-intelligence/sectors`) | **Route blank after recent refactor — page renders empty root** | The `/market-intelligence/sectors` route returns a blank `<div id="root"></div>` with no React content. Same pattern as NR-65. Backend returns Metal STRONG 74, Technology LEADING etc. Route likely dropped or mis-referenced during the same Wave 10 changes. | Sector rotation is the most used daily workflow for an Indian institutional-style trader: which sector is leading this week? Without a working sector page the trader has to infer from Market Pulse chips alone. | **P0** | Market-first |
| **NR-67** | Daily Overview (`/daily-overview`) | **All five data sections empty despite healthy backend APIs** | Page renders the shell but shows "No rows available" for movers, "Unavailable" for A/D/Regime, no signal candidates, no sector rows. Direct API calls confirm data exists: movers (`AGRITECH +19.99%`), regime (NEUTRAL), sector strength (IT Leading 75.8%). The `fetchDailyOverviewMarketMovers` / `fetchDailyOverviewTodayReview` / `fetchDailyOverviewMarketContext` calls are wired but the state never updates the UI — likely a React state initialisation or scope-params mismatch. | Daily Overview is the intended "one-stop morning briefing" page for a trader opening their session. An all-empty page trains the trader to skip it entirely and defeats the whole purpose of the page. | **P1** | Market-first |
| **NR-68** | Smart Money — F&O Ban List | **F&O ban data not auto-ingested on page open; requires manual Refresh** | First visit shows "No F&O ban data persisted yet. Run POST …/fno-ban/ingest." A trader who opens Smart Money to check if a stock is banned before placing a derivatives trade sees a placeholder instead of the ban list. The ingest endpoint works correctly (returns AMBER, KAYNES); it just needs to be called automatically on page load if no persisted data exists, or triggered by the daily pipeline. | F&O ban list is a pre-trade compliance check for every derivatives trader. An Indian trader placing a short on AMBER or KAYNES on a ban day incurs regulatory penalties. The data must be visible without requiring a manual trigger. | **P1** | Market-first |
| **NR-69** | Research Hub | **Snapshot is 4 days stale — pipeline does not refresh the Research Hub snapshot** | `generatedAt: "2026-06-01T09:00:00.000Z"` on 2026-06-05. The pipeline runs daily and refreshes market context / today-review / signals, but does not call the research-hub snapshot regeneration. The "As of 6/1/2026" date is shown on the page header. `whatChanged` always shows "No prior snapshot to compare yet" because successive snapshots are not being persisted. | A trader using the Research Hub as their morning go/no-go gate is looking at 4-day-old actionability scores. Today-review candidates may have changed, calibration may have updated, but the Research Hub still reflects last week's picture. | **P1** | Market-first |
| **NR-70** | Today Review — candidate table | **Duplicate React key `instrumentId:OUTSIDE_TRUSTED_UNIVERSE` causes silent row deduplication** | Console logs 12+ `Encountered two children with the same key` errors for `cmowuxfmo008aw52gk45b4bug:OUTSIDE_TRUSTED_UNIVERSE` and `cmowuyakc0207w52geckqq7th:OUTSIDE_TRUSTED_UNIVERSE`. When an instrument appears in multiple exclusion-reason buckets the key collision causes React to drop or duplicate rows silently. The trader may be missing exclusion-reason entries in their review without realising it. | An Indian trader reviewing the Today Review exclusion list relies on it being complete and accurate — a key collision can silently drop an excluded candidate from view. | **P1** | Market-first |
| **NR-71** | Market Context — Regime description | **Raw unformatted float in user-facing regime narrative** | The Market Regime card reads "…Nifty 50 index 63-bar trend score is **33.68406706005322**." A 16-decimal float in a prose sentence aimed at a trader is a trust-eroding developer artifact. Round to 2 decimal places at render time (`33.68`). | Cosmetic but visible on every Market Context page load — gives the impression of an unpolished tool to a trader. Easy one-line fix. | **P2** | Market-first |
| **NR-72** | Workbench — Instrument Context Rail | **"The InstrumentContextSnapshot read API is missing" developer-copy visible to trader** | All 7 context fields show "Unavailable" with the message "The InstrumentContextSnapshot read API is missing. This rail does not infer context from local page data." This is an engineering status note, not a trader-facing message. Should read "Context snapshot not yet available for this stock" or the rail should be hidden until the backend is implemented. | A trader opening the workbench reads an engineering error message as the primary context for the stock they are researching. Erodes trust. (Same class as CB-49 / CB-53 — dev copy leaking to production UI.) | **P2** | Market-first |
| **NR-73** | Workbench — Price section | **"adjusted_close is not persisted; close is returned as adjusted_close for MVP display" visible to trader** | The note is shown inline below the price chart title. Developer-facing honesty note about the MVP limitation (CB-1 open item) is being displayed verbatim in the trader UI. Should either be hidden or replaced with a gentler "Price history uses unadjusted close for some rows" note. | An Indian trader reading "for MVP display" on their research tool loses confidence in the tool's production readiness. | **P2** | Market-first |

### Triage summary for NR-65..73

- **NR-65, NR-66**: P0 — two routes completely missing; Quality Lab and Sector View are market-intelligence screens with no workaround. One-line route registration fix each.
- **NR-67**: P1 — Daily Overview renders but all data empty; the intended daily morning-briefing page is non-functional.
- **NR-68**: P1 — F&O ban auto-ingest on page open; pre-trade compliance check missing for derivatives traders.
- **NR-69**: P1 — Research Hub snapshot 4 days stale; daily pipeline does not trigger research-hub regeneration.
- **NR-70**: P1 — React key collision in Today Review exclusion rows; silent row drops.
- **NR-71, NR-72, NR-73**: P2 — UX polish (raw float in prose, dev-copy leaks in workbench).

**Still open from prior waves (confirmed not fixed):** NR-25 (Today Review Regime/Sector columns always "—"), NR-29 (Daily Overview empty — same as NR-67 above, promoted to P1), NR-57 (Research Hub todayReview/tradePlan INSUFFICIENT_DATA stubs), NR-60 (earnings chip absent from Today Review rows).

## Decision-maker corrections (2026-06-05, autonomous session)

Reviewed PO-flagged "P0 route" items against the actual code — three are **false alarms**, do NOT spend effort on them:
- **NR-36 (remove routes.tsx line 101)** — WONTFIX. Lines 100/101 are intentional dual registration (operator routes under `/admin/*` AND root). Removing line 101 breaks every unprefixed route.
- **NR-65 (Signal Quality Lab blank)** — FALSE ALARM. Route is registered at `signals/quality` (and `/admin/signals/quality`). The PO navigated to a non-existent `/admin/signal-quality-lab`. Verified rendering in the Wave-11 browser pass.
- **NR-66 (Sector View blank)** — FALSE ALARM. Sector view is not a standalone route; it lives inside the Market Pulse page (Sector Intelligence panel). `/market-intelligence/sectors` does not exist. The drilldown works (Wave 6/9).
- **NR-61/62 (route HMR/TDZ crash)** — FIXED (commit d51e65d). The self-barrel circular import in market-data-foundation was the cause; a frontend-wide grep now shows ZERO self-barrel imports and `vite build` has no circular warnings. Later PO "TDZ persists" reports came from a stale long-running Vite dev-server instance, not code — a fresh preview start (Wave-11 verify) shows zero TDZ across all navigations.
- **NR-72** — the InstrumentContextSnapshot read API is genuinely unwired (FE `fetchInstrumentContextSnapshot` always returns unavailable). Now honestly labeled; wiring the backend API is a real future feature, not a polish fix.
