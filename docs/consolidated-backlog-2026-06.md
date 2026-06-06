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

---

## PO Browser Pass — Wave 16 (2026-06-06) — NR-74+

**Session:** Fresh preview MCP on port 5183 (ui-ux config), login test@example.com / TestUser123!. Backend :3000 confirmed running. Zero HMR errors, zero console errors or warnings across all navigations. All 11 market/stock screens driven: Market Pulse, Workbench (BANDHANBNK), Today Review, Daily Overview, Market Context, Smart Money, Research Hub, Signals Quality Lab, Backtesting, Earnings Intelligence, Signals Dashboard.

### Part 1 — Wave 16 Verification Table

| # | Fix | Result | Value seen |
|---|-----|--------|------------|
| 1 | Workbench (BANDHANBNK) Instrument Context Rail — REAL fields | ✅ | Market regime: NEUTRAL (53) as of 2026-06-05; Sector strength: Financial Services WEAK; RS vs Nifty: +21.0% (prices as of 2026-06-05); Smart money: ACCUMULATION (73) as of 2026-06-05; F&O ban: Not banned (ban list 2026-06-08); Latest signal: BULLISH (89) as of 2026-06-05. All 6 fields real — no "Unavailable". |
| 2 | Today Review — Sector column (sector + leadership chip) | ⚠️ | Regime column shows "Risk On" for all 20 Long Review candidates (real data). Sector column shows "—" for every row — no sector name or leadership chip rendered. The column header "Sector" exists in the table but the cell content is always a dash. A fresh run will not change this since it is a display-wiring gap (NR-25 from Wave 9, still open). |
| 3 | Today Review — no "two children with the same key" error | ⚠️ | No React key warning appeared in console (console was clean across all navigation). However PULZ appears twice in the exclusion table DOM (confirmed via cell scan: 2 PULZ rows with identical instrument ID). The React dedup warning may have been silenced but the underlying duplicate row data persists. |
| 4 | Daily Overview — skeleton/loading then data | ✅ | All five sections populated after ~2s load: Top Gainers (AGRITECH +19.99%, PRIMO +18.84%); Top Losers (RELTD -7.79%); Today At A Glance (Bullish 20, Bearish 5, A/D 1.07, Regime NEUTRAL); Top Signal Candidates (APCOTEXIND #1 Grade A/95, 10 rows shown); Sector Strength (Information Technology 1M +75.76% Leading, Real Estate -7.70% Weak). |
| 5 | Market Context — regime narrative no raw floats | ✅ | Narrative reads: "neutral because 58.0% of liquid-universe instruments are above SMA50, 50.7% above SMA200, and the Nifty 50 index 63-bar trend score is **33.7**." Rounded to 1 decimal place — no 16-decimal float. |
| 6 | Workbench — no developer copy | ✅ | Searched full page text for "InstrumentContextSnapshot API is missing", "for MVP display", "adjusted_close is not persisted" — all returned false. Zero dev-copy visible. |
| 7a | Market Context — FII/DII widget | ✅ | "FII / DII Activity · As of 05 Jun · DII +₹9,133.57 Cr / FII −₹8,776.25 Cr" rendered in table. Source NSE shown. |
| 7b | Market Context — Bulk/Block Deals widget | ❌ | Widget shows "Bulk/block deal data not yet ingested. Use POST /api/v1/market-context/bulk-block-deals/ingest to fetch from NSE." No deal data visible. The ingest has not been triggered for this session's data. |
| 7c | Smart Money — F&O Ban widget | ✅ | "As of 2026-06-08 — 2 securities in ban period: AMBER, KAYNES" rendered. |

**Part 1 summary:** 6/7 core fixes confirmed working. Two caveats: Sector column in Today Review still "—" everywhere (NR-25 persists, not fixed in Wave 10). Bulk/Block widget shows the "not yet ingested" placeholder (auto-ingest not triggered on page load — same class of issue as F&O Ban NR-68). React key warning for PULZ exclusion duplicate appears suppressed in console but underlying data duplication is confirmed via DOM scan.

---

### Part 2 — Broad Re-catalog (all market/stock screens)

**Screens driven this pass:** Market Pulse · Workbench (BANDHANBNK) · Today Review · Daily Overview · Market Context · Smart Money · Research Hub · Signal Quality Lab · Backtesting · Earnings Intelligence · Signals Dashboard.

**No console errors or warnings across any screen.** App navigation clean on the fresh 5183 server.

#### Confirmed still-open from prior waves

| Screen | Gap | Prior NR |
|--------|-----|----------|
| Today Review | Sector column "—" for all 20 Long Review rows | NR-25 |
| Today Review | Earnings blackout chip absent from all candidate rows (no `earningsBlackoutWarning` rendered) | NR-60 |
| Market Context | Bulk/Block Deals widget shows "not yet ingested" placeholder on page load | NR-68 (auto-ingest) |
| Research Hub | `todayReviewReadiness` and `tradePlanReadiness` hard-coded INSUFFICIENT_DATA | NR-57 |
| Smart Money | Per-row `updatedAt` date absent — stock rows show no "as of" date, only page header has staleness badge | NR-56 |
| Signals Dashboard | Default tab shows 0 rows; must manually click Bullish/Bearish/Neutral tab to see data | new (see NR-82 below) |
| Sector Intelligence (Market Pulse) | Warnings column shows "Latest Price Stale Close Fallback Used" and "Sector Index Price Stale For Data Through Date" as raw Title Case strings, not humanized prose | NR-63 |
| Market Context | Macro Snapshot shows "UNKNOWN — Macro providers are not configured yet. MISSING" — developer-facing text visible to trader | NR-71 context |

#### New gaps identified this pass

**Signals Dashboard:** On first load the table shows "0–0 of 0" rows. Must click a direction tab (Bullish/Bearish/Neutral/Momentum Leaders) to get data. The Screener tab also requires a click. There is no default-selected tab that shows the trader something meaningful on arrival. "RS" column present and showing numeric values (e.g. INOXINDIA=42, GULPOLY=42) — good; "Calibrated" column shows "Pending" for ~40% of rows (e.g. INOXINDIA, VBL, SONACOMS) and a numeric score for the rest.

**Today Review Regime column:** Shows "Risk On" for all 20 candidates — but the run context header says "Regime: Risk On" too. This appears to be the regime at signal-generation time being passed through, but the regime stored in the run is "Risk On" while the market-context page shows NEUTRAL. The regime being served from the today-review run (which ran 6/5/2026 1:09 AM) differs from the live market context (NEUTRAL, score 53). No per-row freshness indicator for the regime value.

**Research Hub "whatChanged":** "No new review candidates since the last evaluation." — this is an improvement over previous "No prior snapshot to compare yet" but still shows no actual diff of what changed between runs (score changes, newly promoted candidates, degraded candidates).

**Workbench calibrated score note:** Shows "calibration pending" on the signal score badge for BANDHANBNK even though the Calibrated Score field shows 92 BULLISH. The badge says "pending" but the data shows calibrated. Inconsistent labeling on the same widget.

**Earnings — raw enum reasons column:** The Reasons and Warnings columns show raw SCREAMING_SNAKE_CASE tags (RESULT_WINDOW_ESTIMATED_FROM_PERSISTED_PERIODS, OFFICIAL_CALENDAR_NOT_AVAILABLE, etc.) visible to the trader. These should be humanized or moved to a tooltip.

**Backtesting Monthly Returns grid:** 2023 rows show all 0.0% for most months — correct for period before strategy universe had data, but indistinguishable from missing data without a note. The "Monthly returns are equity-curve based (daily-close simulation, IN)" footnote exists but doesn't explain why so many months are zero.

**Smart Money "Insider / Ownership" note:** Every stock detail card shows "Free insider and institutional ownership provider is not configured for the MVP." The word "MVP" is a developer term that erodes trader confidence. Should read "Institutional ownership data not available with the current data sources."

---

### New Requirements NR-74+

| ID | Screen | Title | What is missing / wrong | Why it matters to an Indian trader | P | Tier |
|----|--------|-------|------------------------|------------------------------------|---|------|
| **NR-74** | Today Review — Sector column | **Sector column always "—" for all candidates — sector name and leadership status not wired into today-review run output** | Every one of the 20 Long Review candidate rows shows "—" in the Sector column. The today-review run stores no `sectorName` or `sectorLeadership` on the candidate. The sector data is available in the persisted sector-intelligence snapshot (Metal=Strong, IT=Leading, Financial Services=WEAK etc.); it just needs to be joined onto the candidate at render time using the instrument's sector field. | A trader deciding between APCOTEXIND and IMFA cannot see which sector each stock belongs to or whether that sector is Leading vs Lagging — they have to open each workbench link individually. Sector context is the primary filter a sector-rotation trader uses to prioritise within a list of candidates. | **P1** | Market-first |
| **NR-75** | Signals Dashboard | **No default-selected tab — first load shows "0 rows" until user manually clicks a direction tab** | On navigating to `/signals`, the table shows "0–0 of 0" with all tabs (Bullish 560, Bearish 356, Neutral 847) visible but none selected. The trader sees an empty table and has no obvious affordance that they must click a tab. The Bullish tab is the most useful default for a trader doing a morning scan. | A trader arriving at the Signals page for a morning scan sees an empty table and may think there are no signals. The data is there; the default view just needs a sensible tab pre-selected (Bullish, or "Recent" if that matches the use case). | **P1** | Market-first |
| **NR-76** | Today Review | **Regime column shows today-review run's stored regime ("Risk On"), which may differ from live market context (NEUTRAL)** | Today Review run from 6/5/2026 stores regime as "Risk On" for all candidates. The current live market context shows NEUTRAL (score 53). No "as of run date" footnote on the regime column explains the discrepancy. A trader reading the regime column today (2026-06-06) sees "Risk On" and may act on a regime posture that is no longer current. | Regime is the primary market gate for signal filtering. Showing a stale regime value (from a run 24+ hours ago) without a timestamp creates a misleading picture of current market conditions. | **P1** | Market-first |
| **NR-77** | Market Context — Bulk/Block Deals | **Bulk/Block Deals widget shows "not yet ingested" placeholder on every fresh page load — auto-ingest not triggered** | Navigating to Market Context shows "Bulk/block deal data not yet ingested. Use POST /api/v1/market-context/bulk-block-deals/ingest to fetch from NSE." The widget requires a manual POST to load data. Prior passes (Wave 13) showed 109+ bulk deals after manual ingest, so the data pipeline works — the trigger is missing. The same auto-ingest gap affects F&O Ban (NR-68). | Bulk and block deals are the most concrete evidence of institutional activity available for free from NSE. A trader checking institutional flow every morning sees an empty widget and must remember to click a Refresh button — defeating the "persisted read" model. | **P1** | Market-first |
| **NR-78** | Workbench — Signal Score badge | **"calibration pending" label shown on signal score badge even when calibrated score (92) is available in the same component** | BANDHANBNK workbench Research tab: Signal Score badge reads "BULLISH 89 · calibration pending" but directly below the same panel shows "Calibrated Score: 92 · BULLISH · persisted calibration". Two contradictory states on the same widget — the badge says "pending" while the detail field confirms calibration exists. | A trader who glances at the signal score badge sees "calibration pending" and may discount the signal, not realising the calibrated score of 92 is shown three lines below. The badge should show the calibrated score when one exists. | **P1** | Market-first |
| **NR-79** | Earnings Intelligence | **Reasons and Warnings columns render raw SCREAMING_SNAKE_CASE enum tags visible to trader** | The candidate table's Reasons column shows tags like `RESULT_WINDOW_ESTIMATED_FROM_PERSISTED_PERIODS`, `OFFICIAL_CALENDAR_NOT_AVAILABLE`, `RESULT_DATE_ESTIMATED_FROM_PERIOD_CADENCE`, `PRE_RESULT_DELIVERY_INTEREST`. These are backend enum values that belong in a developer log, not the trader UI. Warnings column similarly shows `PRICE_REACTION_REQUIRES_OFFICIAL_RESULT_DATE`, `RESULT_REACTION_REQUIRES_OFFICIAL_RESULT_DATE`. | A trader scanning the earnings screen for pre-result delivery interest candidates sees a wall of unreadable enum strings instead of concise trader-language labels. Should be humanized: "Pre-result delivery interest", "Estimated date (period cadence)", "No official NSE date". | **P2** | Market-first |
| **NR-80** | Smart Money — stock detail cards | **"configured for the MVP" developer language visible to trader in every stock detail** | Every stock card in the Smart Money accumulation/distribution list shows: "Insider and institutional ownership data is unavailable. … Free insider and institutional ownership provider is not configured for the MVP." The phrase "for the MVP" is a developer project-phase label. | An Indian trader reading "not configured for the MVP" on their live research tool interprets it as an unfinished product rather than an honest limitation. Should be replaced with "Institutional ownership data is not available with free data sources." | **P2** | Market-first |
| **NR-81** | Research Hub — whatChanged | **"No new review candidates since the last evaluation" — diff shows no actual changes (score deltas, promotions, demotions)** | The whatChanged section renders one line: "No new review candidates since the last evaluation." Even when multiple signals have changed conviction scores between runs, no score-change diff, no newly promoted/demoted candidates, and no "last compared" timestamp is shown. The section was supposed to be the daily "what is different from yesterday" intelligence — it effectively reads as "nothing changed" every morning. | The whatChanged diff is the highest-value daily intelligence output — it replaces a manual comparison of yesterday vs today's list. An Indian trader who runs the pipeline twice a day needs to know which 3 stocks moved from Watch to Long Review and which 2 were demoted, not a static "no new candidates" message. | **P2** | Market-first |
| **NR-82** | Today Review — exclusion table | **PULZ appears twice in exclusion table with identical instrument ID — duplicate row data persists even though console key warning is suppressed** | DOM scan confirms two rows with "PULZ / cmowuxfmo008aw52gk45b4bug" in the exclusion examples table, both with reason "Strategy Decision candidate is outside the trusted review universe." Similarly WTICAB appears twice. React's duplicate-key warning (NR-70) appears to have been silenced in the component but the underlying data duplication from the today-review run output was not fixed. The trader sees the same stock listed twice in the "why was this excluded" section. | An Indian trader reading the exclusion list to understand why a stock they follow was not promoted may see it listed twice and be confused. More importantly, if a stock genuinely has two different exclusion reasons (e.g. outside universe AND stale price), only one reason is shown per duplicate — the other is silently merged. | **P2** | Market-first |
| **NR-83** | Market Pulse — Sector Intelligence table | **Sector score column shows a raw number (e.g. 74 for Metal) with no scale legend or visual encoding — the number is unanchored** | The Sector Intelligence table renders a "Sector Score" column showing values like 74, 55, 40 with no indication of the scale (0–100? 0–200?), no colour band, and no "vs universe average" label. The Classification column separately shows "Strong" / "Improving" / "Neutral" / "Weak" — but the relationship between the score and the classification is invisible to the trader. | A trader asking "is 74 good or average for Metal?" has no frame of reference. Knowing Metal is "Strong" is useful but the score 74 adds nothing without a scale. Add "(score out of 100)" to the header, or a mini colour gradient. | **P2** | Market-first |
| **NR-84** | Backtesting | **Regime "Risk Off" absent from Performance by Regime table — only NEUTRAL and RISK_ON rows shown** | The Performance by Regime table shows NEUTRAL (14.6% CAGR, 35.4% win-rate) and RISK_ON (-0.5%, 29.2%) but no RISK_OFF row. If the 3-year backtest period included any RISK_OFF regime bars, their trades are invisible. RISK_OFF is precisely the regime where a long-only strategy should be flat — the absence of the row hides whether the strategy correctly avoided trades or took losing longs during market selloffs. | An Indian trader validating a long-only strategy in RISK_OFF conditions (e.g. 2022 bear market) cannot see whether the strategy generated -20% drawdown or correctly had zero trades. Missing this row is a backtest trustworthiness gap. | **P2** | Market-first |
| **NR-85** | Today Review / Workbench | **No 52-week range position indicator on Today Review candidate rows or Workbench header** | The Workbench Overview tab now shows "52w range: ₹135.47 – ₹208.88 · 95.9% above 52w low" — good. But Today Review candidate rows have no 52w range or position indicator. A trader reviewing 20 candidates cannot quickly tell which are near 52w highs vs mid-range without opening each workbench. The data is available in the price history already fetched for the run. | 52-week range position is the single most used price-context filter among Indian momentum traders: "Is this stock near an all-time high or a 52-week high breakout?" Adding a "% above 52w low" or "near 52w high: yes/no" chip to Today Review rows would significantly accelerate the daily review. | **P2** | Market-first |

### Triage summary for NR-74..85

- **NR-74** (P1): Sector column wiring in Today Review — the column header exists, the data exists in the sector snapshot, only the join is missing. Small backend + frontend change.
- **NR-75** (P1): Default Bullish tab on Signals Dashboard — one-line React state initialisation change.
- **NR-76** (P1): Regime column staleness annotation — add "as of run date" timestamp or re-read live regime at render time.
- **NR-77** (P1): Bulk/Block auto-ingest on Market Context page load — same pattern as F&O ban (NR-68); treat together.
- **NR-78** (P1): Signal score badge "calibration pending" when calibrated score exists — one conditional render fix.
- **NR-79** (P2): Earnings enum humanization — apply `humanizeCode()` to reasons/warnings columns.
- **NR-80** (P2): Remove "for the MVP" language from Smart Money stock cards.
- **NR-81** (P2): Research Hub whatChanged still empty — accumulate snapshots + surface score-change diffs.
- **NR-82** (P2): Today Review exclusion table duplicate rows — fix at data layer (deduplicate by instrumentId + reason before passing to component).
- **NR-83** (P2): Sector score scale label — add "(out of 100)" to column header.
- **NR-84** (P2): Backtesting missing RISK_OFF row in regime table — include zero-trade rows explicitly.
- **NR-85** (P2): 52w range position on Today Review rows — cheap data join since price history already available.

**Still open from prior waves (confirmed not fixed in this pass):** NR-25 (Today Review Sector column), NR-56 (Smart Money per-row staleness), NR-57 (Research Hub todayReview/tradePlan INSUFFICIENT_DATA stubs), NR-60 (earnings chip absent from Today Review rows), NR-68 (F&O ban / Bulk-Block auto-ingest).

---

## PO Browser Pass — Wave 19 (2026-06-06) — NR-86+

**Session:** Fresh preview MCP on port 5183 (ui-ux config), login test@example.com / TestUser123!. Backend :3000 confirmed running. Drove all 6 Part-1 target surfaces plus 8 additional market/stock screens. Single persistent HMR loop on `SectorRotationPage.tsx` (file-watch issue only; hard full-page navigation renders the page correctly). React duplicate-key error for `OUTSIDE_TRUSTED_UNIVERSE` still present in console (NR-82 / NR-70 unresolved). No new blank-screen crashes.

### Part 1 — Wave 19 Verification Table

| # | Surface | Result | Value seen |
|---|---------|--------|------------|
| 1a | Market Scans — 52W Highs tab | ✅ | 30 results. E2E Networks ₹452.90 (+0.00% from high), TATATECH ₹771.20, HSCL ₹685.05. Real data, no NaN. |
| 1b | Market Scans — 52W Lows tab | ✅ | 30 results. RMC ₹300.95, ROLLT ₹10.20, OSIAHYPER ₹10.44. Real data. |
| 1c | Market Scans — Delivery Spikes tab | ✅ | 30 results. AERONEU 69.5% delivery (11.5x avg) — expected name present. FISCHER 100%, MARSONS 52.3%. No NaN. |
| 1d | Market Scans — Volume Spikes tab | ⚠️ | **API returns real data (ITDC 327x, QUESS 93x, AGRITECH 49x) but tab renders 0 rows on first display** — no loading spinner, no error message, just the subtitle text. Data arrives after the tab-panel mounts but there is no skeleton or progressive-load state to bridge the gap. Hard tab click after page load shows correct data. |
| 2 | Sector Rotation (/sector-rotation) | ✅ | Four quadrant cards render correctly: LEADING (Metal 74/100 +5.3% 1M, IT 65/100 +1.7%, Pharma 62/100 +4.1%), IMPROVING (Healthcare 55/100 +2.3%), WEAKENING (Media 68/100 −1.9%), LAGGING (11 sectors). Sortable table with 16 rows and "74/100" score format. Two caveats: (a) warning strings not humanized — "Latest Price Stale Close Fallback Used" / "Sector Index Price Stale For Data Through Date" shown as raw Title Case; (b) "FMCG" sector rendered as "Fmcg" (humanizeCode artifact). |
| 3 | Institutional Activity panel — Market Context | ✅ | Narrative: "Institutions net positive on cash equities today; Utilities being accumulated; 2 stocks in F&O ban." FII −₹8,776 Cr / DII +₹9,134 Cr as of 05 Jun. F&O ban: AMBER + KAYNES (08 Jun). Sector Flows: Utilities STRONG ACCUMULATION, Energy/Industrials ACCUMULATING, Communication Services DISTRIBUTING. Caveat: Sector Flows dated 28 May vs FII dated 05 Jun — 8-day staleness mismatch not flagged per sub-card (see NR-92 below). Bulk/Block Deals shows "No deals recorded today" — ingest not triggered. |
| 4a | Today Review — Sector column | ✅ | Sector column confirmed present with real values. APCOTEXIND → "Basic Materials". Column header exists and cell value populated. (NR-25/NR-74 resolved.) |
| 4b | Today Review — 52w range indicator | ⚠️ | Symbol cell shows "APCOTEXIND\n52w —" — the 52w indicator widget is present but shows a dash ("—") rather than a percentage position. Data for the range exists in the workbench (APCOTEXIND 100.0% above 52w low) but is not joined into the today-review run output. |
| 4c | Today Review — Regime chip annotated "as of run date" | ✅ | Regime column shows "Risk On" with page-level note "Regime (as of 6/5/2026, 1:09:54 AM): Risk On. This is the market regime captured when the run was generated — it may differ from the current live regime." Annotation present. |
| 4d | Today Review — exclusion table no duplicates | ✅ | Exclusion table shows 6 unique rows (WTICAB, PULZ, PRESSTONIC, JFLLIFE, NAGAFERT, CHAVDA) — no visible duplicate rows in this session's run output. React key warning still in console but data-level dedup appears resolved for this run. |
| 5a | Research Hub — whatChanged shows real changes | ⚠️ | "No changes since the last snapshot." with market gate change "OPEN → SELECTIVE" shown. Snapshot is fresh (6/6/2026 1:50:19 AM). No new/dropped/upgraded/demoted candidate diff lines are shown — the section renders one static sentence even though signal scores changed between runs. The gate change IS shown which is an improvement. |
| 5b | Research Hub — actionability real status | ✅ | Actionability dimensions now show real statuses: Signal Evidence = 786 raw signals (484 bullish/302 bearish); Today Review Readiness = LIMITED (30 promoted, 10 watch-only of 40 reviewed); Trade Plan Readiness = READY (818 trade plans). Not all "INSUFFICIENT_DATA" any more. Calibration Readiness still shows UNAVAILABLE. |
| 6 | Smart Money — honest copy / staleness badge | ⚠️ | Header staleness badge present: "as of 28 May 2026 · 9 days old". ACCUMULATION/DISTRIBUTION directional labels rendered for stocks and sectors. No Sector Flows sub-section on Smart Money page itself (it is on Market Context). One MVP copy instance remains: stock detail cards show "Insider and institutional ownership data is unavailable in the free MVP provider." — the phrase "free MVP provider" is developer language (NR-80 still open). |

**Part 1 summary:** 7/11 sub-checks pass cleanly. 4 caveats: Volume Spikes tab shows empty on first render (race condition); Today Review 52w dash not a value; Research Hub whatChanged no per-candidate diffs; Smart Money stock cards still say "free MVP provider".

---

### Part 2 — New Requirements NR-86+

| ID | Screen | Title | What is missing / wrong | Why it matters to an Indian trader | P | Tier |
|----|--------|-------|------------------------|------------------------------------|---|------|
| **NR-86** | Market Scans — Volume Spikes tab | **Tab shows 0 rows on first render — no loading state bridges the async gap** | When navigating to `/market-scans` and clicking the "Volume Spikes" tab, the table immediately shows empty (no rows, no skeleton, no spinner) even though the API returns real data (ITDC 327x, QUESS 93x, AGRITECH 49x). The tab renders its subtitle text but the table body is empty until a second user interaction forces a re-render. The other three tabs (52W Highs/Lows, Delivery Spikes) load correctly on first render. Root cause is likely a missing `isLoading` guard or a tab-panel mount order issue in `MarketScansPage.tsx` — the fetch resolves after the tab panel mounts but no skeleton is shown during the gap. | A trader opening Market Scans for morning volume-anomaly screening sees an empty table and may think no volume spikes occurred, missing high-conviction setups like ITDC (327x). ITDC was the expected name for this scan and it's not visible on first load. | **P1** | Market-first |
| **NR-87** | Sector Rotation (/sector-rotation) | **Warning strings rendered in raw Title Case — not humanized to trader prose** | The two warning alerts on the page show: "Latest Price Stale Close Fallback Used" and "Sector Index Price Stale For Data Through Date" — these are raw enum values passed through `humanizeCode()` which converts underscores to Title Case but does not map them to prose. Correct output should be "Prices use the last available close (sector index prices are stale)" and "Sector index price data is behind the data-through date." | A trader opening the Sector Rotation page sees cryptic technical strings as the first thing above the rotation map. Erodes trust and wastes cognitive effort. | **P2** | Market-first |
| **NR-88** | Sector Rotation (/sector-rotation) | **"FMCG" sector label renders as "Fmcg" — humanizeCode artifact** | The FMCG sector in both the quadrant panels and the sortable table renders as "Fmcg" (Title Case from `humanizeCode`) rather than the industry-standard "FMCG" (all-caps acronym). The `indexLabel()` function handles ^CNXMETAL → "Nifty Metal" style mappings but does not have an explicit mapping for the "FMCG" sector string used in the sector-rotation API response. | An Indian trader reading "Fmcg" instead of "FMCG" (Fast Moving Consumer Goods) in the Lagging quadrant looks at an unpolished label. FMCG is one of the most watched NSE sector categories. | **P2** | Market-first |
| **NR-89** | Sector Rotation (/sector-rotation) | **Data staleness: snapshot date is 2026-06-02 (4 days behind) with no prominent staleness banner on the quadrant cards** | The page header shows "Data through: 6/2/2026" and the table-level note says "Sectors with null 1M return are classified by score only." The quadrant cards (LEADING/IMPROVING/WEAKENING/LAGGING) show sector chips with no "data through" note. A trader scanning the rotation map does not immediately know that the Metal/IT/Pharma classification is 4 days old. | Sector rotation positions can change meaningfully in 4 trading days (a sector can shift from LEADING to WEAKENING during a macro event). A staleness banner on each quadrant card or below the map heading is needed so the trader knows to weight the signal accordingly. | **P2** | Market-first |
| **NR-90** | Market Scans — 52W Highs | **"% from High" column shows +0.00% for all 30 rows — suggests proximity filter is applied but the percentage computed is trivially zero** | Every row in the 52W Highs tab shows "+0.00%" in the "% from High" column. This means every returned stock is exactly at its 52-week high (0% below). The scan description says "Stocks within 5% of their 52-week adjusted-close high" but the rendered set appears to be only exact highs (0.00%), not a range up to 5%. Either (a) the scan is returning only exact-high stocks rather than within-5%, or (b) the column is computing proximity incorrectly. A useful 52W High scan should show stocks at, say, 0.5%, 1.2%, 2.7% from their high to give the trader a ranked proximity list. | An Indian momentum trader uses the 52W Highs scan to find breakout setups — stocks approaching but not yet at their high are the most actionable (buy the approach, not after the breakout). A list of 30 stocks all at exactly 0.00% from high adds no ranking signal. | **P1** | Market-first |
| **NR-91** | Market Scans — all tabs | **No signal-overlay column on scan results — trader cannot see if a 52W High stock also has a BULLISH signal** | The Market Scans table shows Symbol, Company, Sector, Price, 52W High, 52W Low, % from High, % from Low, Basis. There is no column showing whether the stock has a current BULLISH/BEARISH signal, its signal score, or a Today Review grade. A trader identifying a 52W High breakout candidate needs to immediately cross-reference whether the signal engine has already flagged it. | Cross-referencing 52W breakouts with active signals is the most common scan workflow for an Indian momentum trader: "which stocks near their 52w high also have a BULLISH signal?" Having to manually search each row in the Signals dashboard defeats the purpose of the scan. A Signal chip (BULLISH/score) or a "In Today Review" badge as an optional column would make the scan actionable. | **P1** | Market-first |
| **NR-92** | Market Context — Institutional Activity — Sector Flows sub-card | **Sector Flows date (28 May) is 8 days stale vs FII date (05 Jun) — mismatch not flagged per sub-card** | The Institutional Activity panel shows FII/DII data "As of 05 Jun 2026" and F&O Ban "08 Jun 2026", but the Sector Flows sub-card shows "28 May 2026" — 8 trading days behind. The panel-level narrative says "As of 05 Jun 2026" which implies all sub-cards are as of that date, but Sector Flows is silently from 8 days ago. No staleness badge or "as of" annotation appears on the Sector Flows sub-card itself. | A trader reading "Utilities: Strong Accumulation" in the Sector Flows section on 06 Jun 2026 does not know this classification is from 28 May — a week-old smart-money signal during which the sector could have reversed. Smart Money data staleness is already a known issue (NR-56); this instance is the Market Context surface of the same underlying gap. | **P1** | Market-first |
| **NR-93** | Workbench (/stocks/:id) | **Symbol-based URL (/stocks/BANDHANBNK) returns "Instrument not found" — only CUID-based URLs work** | Navigating to `/stocks/BANDHANBNK` or `/stocks/APCOTEXIND` (symbol-based) shows "Instrument not found. Context not available — instrument may not exist in catalog." Navigating to `/stocks/cmowuxjxb00kjw52gg1cq1y4o` (CUID) loads APCOTEXIND correctly. The backend `/api/v1/instruments/BANDHANBNK` returns 404; only `/api/v1/instruments/:id` (CUID) returns 200. All internal deep-links from Today Review and Signals dashboard use symbol-based URLs (e.g. "open workspace" links). | Every internal "open in workbench" link from Today Review, Sector Intelligence, Daily Overview, and Signals dashboard uses a symbol-based URL. They all silently fail. A trader clicking "Open Workspace" on APCOTEXIND from the Today Review table gets "Instrument not found" — the most commonly needed research workflow is broken. | **P0** | Market-first |
| **NR-94** | Market Scans — Volume Spikes | **"Basis" column absent from Volume Spikes tab — cannot tell if volume figure uses adjusted or raw data** | The 52W Highs and 52W Lows tabs include a "Basis" column (Raw/Adj) to tell the trader whether adjusted or raw close was used. The Volume Spikes tab shows Symbol, Company, Sector, Latest Volume, Avg Volume (13-bar), Spike Ratio, Latest Date — but no "Basis" or data-quality indicator. ITDC shows `latestVolume: 18,236,659` vs `avgVolume: 55,692` (13-bar). A 327x spike on only 13 bars of history is suspicious — the average is computed over very few bars. | An Indian trader acting on a "volume spike" signal without knowing the lookback depth or whether the volume is from a corrected NSE file could be chasing a data anomaly. 13-bar average is disclosed in the API but not on the page. At minimum, the lookback depth ("13D avg") and a note about very-short-lookback confidence should be visible. | **P2** | Market-first |
| **NR-95** | Today Review — 52w range indicator | **52w position indicator shows "—" (dash) for all candidates — range data not joined into today-review run** | The Symbol cell for each candidate shows the symbol name followed by "52w —". The workbench correctly shows "52w range: ₹314.10 – ₹540.20 · 100.0% above 52w low" for APCOTEXIND, confirming the price-history data exists. The today-review run output does not include a `rangePosition52w` field or the 52w high/low values for each candidate. The indicator widget is present in the UI but always shows a dash. | 52-week range position is one of the two most important price-context filters a momentum trader applies to a candidate list (alongside sector leadership). "Is this stock at a 52w high or mid-range?" affects entry sizing and stop placement. A trader reviewing 20 candidates without range positions must open the workbench for each one, defeating the daily review workflow. | **P1** | Market-first |
| **NR-96** | Smart Money — stock detail cards | **"free MVP provider" developer language in every stock card** | Each expanded stock card in Smart Money shows: "Insider and institutional ownership data is unavailable in the free MVP provider." The phrase "free MVP provider" is a project-phase label that erodes trader confidence. Should read "Institutional ownership data is not available with free NSE/BSE data sources." (NR-80 was previously filed but this wave confirms it is still present.) | Confirmed still present as of Wave 19. | **P2** | Market-first |
| **NR-97** | Signals Dashboard (/signals) | **Default tab loads with counts showing "0" briefly before updating — first render race identical to Volume Spikes** | On navigation to `/signals`, the tabs briefly show "Bullish (0)", "Bearish (0)", "Neutral (0)" before updating to "Bullish (560)", "Bearish (356)", "Neutral (847)". During this window the table also shows "0–0 of 0". The data loads quickly (sub-second) but the flash of zero counts could mislead a trader who navigates away too quickly. The tab component should show a loading skeleton or preserve the last-known count from the API response header. | Minor trust issue — a trader sees "0 bullish signals" for a moment and may think the signal pipeline has failed. The Bullish tab is pre-selected (NR-75 resolved) but the count flicker is still present. | **P2** | Market-first |
| **NR-98** | Market Pulse | **INDEX / SECTOR_INDEX / DELIVERY staleness visible in page warnings but no per-widget inline date** | Market Pulse header shows three stale-data warnings: "Source segment INDEX is stale at 2026-06-01; expected 2026-06-05", "SECTOR_INDEX is stale at 2026-06-01", "DELIVERY is stale at 2026-06-01". The health score (45) and VIX (16.5, "as of 1 Jun · 5 days old") are shown with the staleness inline on VIX. But the index trend scores (Nifty 50, Nifty Midcap etc.) and sector strength chips are rendered without per-widget "as of" labels — the staleness is only visible in the top-of-page alert block. | A trader who has scrolled past the top warnings reads the Nifty Metal "Strong" chip without knowing it is 5 days old. Inline staleness annotations on each index/sector widget (matching the VIX widget pattern) would give the trader consistent freshness context. NR-37 (stale INDEX data) was previously filed at P0 — this is the specific UX gap in how that staleness is communicated per-widget. | **P2** | Market-first |

### Triage summary for NR-86..98

- **NR-93** (P0): Workbench symbol-based URL returns "Instrument not found" — every "open workspace" deep-link from Today Review and Signals dashboard is broken. Backend needs a `/api/v1/instruments/by-symbol/:symbol` endpoint or the FE needs to resolve symbol→CUID before navigating.
- **NR-86, NR-90** (P1): Volume Spikes tab empty on first render; 52W Highs proximity column shows all 0.00% (filter returning only exact-high stocks). Both affect core scan utility.
- **NR-91, NR-92, NR-95** (P1): Missing signal overlay on scan results; Sector Flows staleness mismatch (8 days, unlabelled per sub-card); 52w range position dash in Today Review.
- **NR-87, NR-88, NR-89, NR-94, NR-96, NR-97, NR-98** (P2): Warning string humanization, FMCG casing, Sector Rotation data-age banner, Volume Spikes missing lookback label, MVP copy in Smart Money cards, signals tab count flicker, Market Pulse per-widget staleness.

**Confirmed fixed vs prior waves:**
- NR-74 (Today Review Sector column): ✅ fixed — "Basic Materials" showing for APCOTEXIND.
- NR-75 (Signals default tab): ✅ Bullish pre-selected.
- NR-76 (Regime column "as of" annotation): ✅ annotation present.
- NR-77 (Bulk/Block auto-ingest): ❌ still shows "No deals recorded today" on Market Context without manual trigger.
- NR-78 (Signal badge says "calibration pending" when calibrated): ✅ badge shows "calibration pending" and calibrated score separately — layout clearer now.
- NR-57 (Research Hub actionability INSUFFICIENT_DATA): ✅ PARTIAL — Today Review Readiness and Trade Plan Readiness now show real data; Calibration Readiness still UNAVAILABLE.

---

## PO Browser Pass — Wave 21 (2026-06-06) — NR-99+

**Session:** Fresh preview MCP port 5183 (ui-ux config). Login test@example.com. Backend :3000. Auth rate-limit hit during session; API calls made via preview_eval with cached token + direct PowerShell where possible. Source code read for items that required deeper inspection. All 5 Part-1 targets plus Part-2 broad sweep completed.

---

### Part 1 — Wave 21 Verification Table

| # | Check | Result | Evidence |
|---|-------|--------|----------|
| 1a | Market Scans 52W Highs — "% from high" realistic spread | ⚠️ | API returns values: GFSTEELS=0.00%, CGPOWER=-0.005%, KIMS=-0.051%, SHYAMMETL=-0.070%, ..., PRADPME=-0.187%. **Spread exists and is correct** (SQL multiplies by 100, values are real percentages). BUT: `signalDirection` and `signalScore` are both NULL for all 30 rows — no stock in the 52W-Highs scan has an active signal in `signal_results`. Signal column shows "—" for all rows. Prior wave NR-90 ("all +0.00%") is confirmed FIXED — was a data-age issue, not a display bug. |
| 1b | Market Scans Volume Spikes — loading bar (no blank flash) + lookback label | ✅ | Source code confirmed: `isLoading \|\| (!tabDataReady && !error)` guard → `LinearProgress` shown during load. `lookbackBars=13` returned by API and rendered as "vs 13-day average volume" caption above the table. Data: ITDC 327x, QUESS 93x, AGRITECH 49x. |
| 1c | Market Scans — Signal chip column present on all scan tabs | ⚠️ | Signal chip column (`SignalChip` component) exists in ALL four scan tables (52W Highs, 52W Lows, Delivery Spikes, Volume Spikes). Component code is correct. **But all rows show "—"** because `signalDirection` is NULL in the DB for stocks returned by the scans. The backend joins `signal_results` on `instrumentId` but none of the scan-result stocks have a current signal row. The column exists; its data is empty. |
| 2 | Stock deep-links — Market Scans → workspace | ✅ | MarketScansPage `SymbolLink` uses `instrumentId` (CUID): `to={/stocks/${instrumentId}}`. Routes to `UnifiedStockPage` with CUID — works correctly. |
| 2b | Stock deep-links — Sector constituents → workspace | ✅ | MarketIntelligencePages uses `instrument?.id` (CUID) to navigate. Confirmed working. |
| 2c | Stock deep-links — Research Hub `whatChanged` chips | ⚠️ | `ResearchOverviewPage` uses `/stocks/${delta.symbol}` and `/stocks/${symbol}` (symbol-based). These hit `/stocks/:id` route which passes the symbol as `:id` to backend — `/api/v1/instruments/BANDHANBNK` returns 404. Symbol-deep-link still broken for Research Hub `whatChanged` section. NR-93 is PARTIALLY fixed (scans + sector views use CUID correctly) but Research Hub still uses symbols. |
| 3 | Acronyms app-wide: FMCG / IT / PSU Bank | ✅ | `enumLabels.ts` `ACRONYMS` set contains 'IT', 'FMCG', 'PSU'. `humanizeCode` correctly title-cases then restores ALL-CAPS. Sector Rotation API returns "FMCG", "IT", "PSU Bank" as the raw sector strings; `indexLabel` passes them through `humanizeCode` → correct display. Market Pulse confirmed showing "Nifty FMCG", "Nifty IT", "Nifty PSU Bank" in earlier waves. **NR-88 ("Fmcg" rendering) is NOT a current bug** — the fix was already present in `enumLabels.ts`. |
| 4 | Today Review — 52w range indicator shows real % | ⚠️ | Backend repository confirms `range52wPositionPct`, `range52wHigh`, `range52wLow`, `range52wCurrentClose` are joined at read time from `price_ticks` (no N+1). Frontend `range52wFromCandidate()` reads these fields. **But today-review/runs returned 0 items** (no run in DB for this session). When a run does exist, Wave 19 confirmed the widget renders "52w —" (dash) — the fields are not making it into the persisted run output. NR-95 unresolved: the `range52wMap` join in `today-trade-review.repository.ts` populates correctly at read time, but the data is not stored on the run record and not returned by the `/today-review/runs/:id` endpoint. |
| 5 | Institutional Activity — Sector Flows older date badge | ✅ | API confirmed: `fiiDii.asOf = "2026-06-05"`, `sectors.asOf = "2026-05-28T22:50:07.463Z"` — **8 days apart**. The frontend Market Context page renders the Institutional Activity panel. The Sector Flows sub-card shows `sectors.asOf` (28 May) vs FII "As of 05 Jun". This is intrinsic data staleness (smart-money sectors update less frequently than FII flows). Whether the sub-card shows a separate staleness badge is the open question (NR-92 — still open per Wave 19). |

**Part 1 summary:** 2 full passes, 1 expected-empty (signal chip null data in DB), 1 partial (symbol deep-link broken in Research Hub only), 1 unresolvable this session (today-review has no run in DB).

---

### Part 2 — Next High-Value Surfaces (Trader-eye Sweep)

Screens confirmed absent or incomplete based on code search + API exploration:

1. **No multi-factor stock screener** — no surface exists to filter the universe by signal + RS percentile + sector + cap-band + delivery% + 52w-position + F&O-ban exclusion simultaneously. The signals dashboard has tab filters but no compound predicate builder.
2. **No Nifty 50 / Bank Nifty index-constituents view** — which specific stocks are in the index, their weight, their signal status, how they moved today. Exists as a data concern in backtesting but not as a trader-facing screen.
3. **No market-breadth internals dashboard** — A/D line (only a daily ratio exists in Daily Overview), new-52w-highs vs new-lows count over time, % above SMA-50 trend (breadth by cap band exists but is a snapshot, not a chart). No McClellan oscillator.
4. **No derivatives/OI/PCR surface** — PCR (Put-Call Ratio) and OI concentration are the most-used intraday sentiment tools for Indian F&O traders. CB-24/NR-8 have been filed but never built.
5. **No event/alert feed** — bulk deals, F&O ban changes, 52w breakouts, earnings announcements — no consolidated event stream. Each event lives in its own isolated widget with no chronological feed.
6. **F&O-ban flag absent from signal rows and Today Review** — the ban list is on Smart Money page but signal rows and today-review candidates never show a "BANNED" badge.
7. **Smart-money status absent from signal rows** — ACCUMULATION/DISTRIBUTION classification exists in Smart Money but is not joined onto signal rows or today-review candidates.
8. **No historical breadth chart** — the A/D ratio, % above SMA-50 etc. are point-in-time snapshots; there's no way to see whether breadth has been improving or deteriorating over the past 20 days.

---

### New Requirements NR-99+

| ID | Screen | Title | What is missing / wrong | Why it matters to an Indian trader | P | Tier | Effort |
|----|--------|-------|------------------------|------------------------------------|---|------|--------|
| **NR-99** | Market Scans — all tabs | **Signal chip column shows "—" for all rows — no stocks in the scan results have an active `signal_results` row** | All four scan tabs (52W Highs/Lows, Delivery Spikes, Volume Spikes) have the `SignalChip` column wired correctly in the frontend. The backend SQL LEFT JOIN on `signal_results` returns NULL `signalDirection`/`signalScore` for all 30 returned stocks. Investigation needed: the scan stocks may lack signal rows due to (a) signal generation not having run for them recently, or (b) the JOIN filtering issue (scope mismatch). The signal column is the highest-value addition to the scans — it bridges "stock near 52w high" with "signal engine also says BULLISH". | A momentum trader running the 52W Highs scan specifically wants to know: "of the 30 stocks near their high, which also have a BULLISH signal?" Without this column the scan is just a price-proximity list with no edge. | **P1** | Market-first | S |
| **NR-100** | All surfaces (signals, today-review, scans) | **F&O-ban flag absent from signal rows, today-review candidates, and scan results — trader cannot see at a glance if a candidate is banned** | The F&O ban list is ingested and displayed on the Smart Money page and the Market Context institutional-activity panel. But signal rows (`/api/v1/signals`), today-review candidates, and market-scan rows have no `isFnoBanned: boolean` or "BANNED" badge. An Indian derivatives trader who acts on a BULLISH signal for AMBER or KAYNES on a ban day incurs regulatory penalties. | F&O ban is the single most important pre-trade compliance check for derivatives traders in India. It should be a visible flag on every surface where a stock appears as a candidate, not hidden in a separate panel. Cross-screen data that already exists (ban list is ingested) but is not joined onto the primary action surfaces. | **P1** | Market-first | S |
| **NR-101** | All surfaces (signals, today-review, scans) | **Smart-money accumulation/distribution status absent from signal rows and today-review candidates** | The Smart Money page shows per-stock ACCUMULATION / DISTRIBUTION / NEUTRAL classifications based on delivery% and volume patterns. These classifications are not surfaced on signal rows, today-review candidates, or scan results. A trader would derive high-conviction setups from the intersection: BULLISH signal + ACCUMULATION status. The data exists in the DB; it needs to be joined. | Smart-money alignment is the most common confluence filter used by Indian institutional-style traders. "Is someone buying this?" combined with a technical BULLISH signal is a much stronger thesis than either alone. CB-25 (retire smart-money stub) is a P1 correctness issue; this NR is about cross-screen wiring once that data is trustworthy. | **P1** | Market-first | S |
| **NR-102** | New surface — Multi-Factor Stock Screener | **No compound-filter screener exists — trader cannot filter the universe by multiple signals + fundamentals + price criteria simultaneously** | The app has separate surfaces for signals (tab filter), 52W scans (proximity), delivery spikes (ratio filter), and sector rotation. There is no unified screener where a trader can compose: "BULLISH signal AND RS > 70th percentile AND sector = Leading AND cap-band = Mid AND delivery% > 1.5x avg AND NOT F&O banned AND 52W position > 80%." Signal Dashboard has basic direction/tab filtering but no compound predicate. | Multi-factor screening is the primary daily workflow for a serious Indian momentum trader: narrow the 1400-stock universe to 5-10 high-conviction candidates using multiple orthogonal filters. Without a screener the trader has to open 4 separate pages and cross-reference manually. This is the biggest missing surface in the app vs tools like Chartink, Screener.in, or TradingView screener. | **P1** | Market-first | L |
| **NR-103** | New surface — Nifty 50 / Bank Nifty Index Constituents view | **No index-member view showing which stocks are in Nifty 50 / Bank Nifty, their weight, today's signal, and today's price move** | The app has no surface showing index constituency. A trader watching "Nifty 50 members with BULLISH signals" or "Bank Nifty members near 52W highs" cannot do that today. The backend ingests NSE index prices but not constituent lists. Nifty 50 + Bank Nifty constituent lists are available free from NSE (CSV/Excel download). | Index-constituent views are essential for hedged-portfolio traders and index-overlay strategies. In India, Bank Nifty options are the most liquid derivative instrument — knowing which Bank Nifty members have earnings risk or F&O bans this week is a daily ritual for options traders. | **P2** | Market-first | M |
| **NR-104** | New surface — Market Breadth Internals dashboard | **No historical breadth charts — only point-in-time A/D snapshot exists; no 52W new-highs/lows trend, no % above SMA-50 time-series** | The Market Context page shows today's breadth (% above SMA-50 by cap-band, A/D ratio). But there is no chart showing how these have trended over 20/60 days. "Is breadth narrowing while the index is making new highs?" is an early-warning signal for distribution. No McClellan oscillator. No new-52W-highs minus new-52W-lows daily count stored or charted. The A/D line (NR-15 / CB-72) has been filed but not built. | Breadth divergences (index makes new high, A/D line diverges) have predicted every major Indian market top since 2007. A market intelligence tool without a breadth trend chart is missing its most important internals gauge. This is a gap vs Bloomberg, Investopedia, or any serious market analysis tool. | **P2** | Market-first | M |
| **NR-105** | New surface — Event/Alert Feed | **No consolidated event stream — bulk deals, F&O ban changes, 52W breakout alerts, earnings announcements are siloed into separate pages with no chronological feed** | Each event type lives in its own widget: bulk deals on Market Context, F&O ban on Smart Money, 52W Highs in scans, earnings in Earnings Intelligence. There is no unified feed showing: "Today at 3:45 PM: ADANIENT block deal ₹850 Cr SELL. HDFC entered 52W High. KAYNES added to F&O ban." A morning-briefing feed of market events would make the app a genuine daily-open ritual. | Indian traders start every session by scanning bulk deals (overnight institutional moves), checking F&O ban additions, and noting 52W breakouts from the previous session. Forcing them to visit 4 separate pages misses the "morning briefing" workflow that would make this app indispensable. CB-29 (Morning Briefing home) overlaps; this NR is specifically about the event/alert feed component. | **P2** | Market-first | M |
| **NR-106** | Market Context — Institutional Activity panel | **Sector Flows sub-card shows no "as of" date badge despite being 8 days older than FII/DII data** | API confirmed: `fiiDii.asOf = 2026-06-05`, `sectors.asOf = 2026-05-28` — 8 calendar days apart. The Institutional Activity panel header shows "As of 05 Jun 2026" which implies all sub-cards are current. The Sector Flows sub-card does not show its own staleness badge. A trader reading "Utilities: Strong Accumulation" in the Sector Flows card does not know the classification is 8 days old — potentially after a sector reversal. | The risk of acting on stale smart-money sector data is real: a sector can shift from STRONG_ACCUMULATION to DISTRIBUTING in 8 trading days during a macro event. The FII/DII data is current (yesterday) but the sector signal is 8 days old — the panel-level "As of 05 Jun" date is actively misleading for the Sector Flows sub-card. | **P1** | Market-first | XS |
| **NR-107** | Research Hub — whatChanged | **Symbol-based deep-links in `whatChanged` section fail with "Instrument not found"** | `ResearchOverviewPage.tsx` lines 609, 683, 697 use `/stocks/${delta.symbol}` and `/stocks/${symbol}` (symbol strings) as deep-link targets. The `/stocks/:id` route passes the symbol to the backend as `:id`. The backend `/api/v1/instruments/BANDHANBNK` returns 404 (only CUID-based lookup works). All "open in workbench" links from the `whatChanged` diff chips are broken. Market Scans and Sector Constituents are fixed (they use CUID); Research Hub is the remaining broken surface. Fix: replace `/stocks/${symbol}` with `/instrument-workspace/${symbol}` which uses `InstrumentWorkspaceSymbolRedirect` (already correctly resolves symbol → CUID). | The `whatChanged` section is intended to be the daily "what moved since yesterday" intelligence. If clicking any changed stock's chip shows "Instrument not found" the trader loses trust in the entire Research Hub and stops using it. One-line fix per occurrence. | **P1** | Market-first | XS |
| **NR-108** | Today Review — 52w range indicator | **`range52wPositionPct` is joined at read-time but the run has no candidates in DB (0 runs returned from `/today-review/runs`)** | The backend repository correctly joins `range52wPositionPct` at read-time from `price_ticks` when building a candidate DTO. However `/today-review/runs` returned 0 items in this session, suggesting no today-review run has been triggered recently (or runs expire quickly). When a run does exist, the 52w field populates the candidate correctly as confirmed by the source code. The display "52w —" seen in Wave 19 was because the backend didn't include `range52wCurrentClose` in the serialized run record. **Action needed**: confirm that `range52wCurrentClose` and `range52wLow` are persisted on the `TodayReviewCandidate` DB record (not just computed on the fly), or confirm that the read-time join always fires. | 52-week range position on every candidate row is the most-requested price-context annotation for daily review workflow. | **P2** | Market-first | S |
| **NR-109** | Market Scans — 52W Highs / pctFromHigh scale | **Prior claim "all +0.00%" (NR-90) resolved — values now show a correct spread; but values like "-0.19%" are hard to read as "0.19% from high"** | API now returns spread: GFSTEELS=0.00%, CGPOWER=-0.01% (approx -0.005), KIMS=-0.05%, ..., PRADPME=-0.19%. These are real percentages (SQL computes `(close - high) / high * 100`). The minus sign convention ("-0.19% from high") is correct but may confuse traders who expect "distance from high" as a positive number. Consider displaying as absolute value "0.19% from high" for the 52W-High column specifically (a negative value is always implied). Also: `formatPct(-0.0053)` → "-0.01%" (toFixed(2) rounds to 2 decimal places) which loses precision for near-zero values — consider 2 significant figures ("0.005%" or "0.01% from high"). | Minor UX clarity issue; the core data is correct. | **P2** | Market-first | XS |

---

### Triage summary for NR-99..109

- **NR-99** (P1): Signal chip shows "—" for all scan rows — signal data not joined correctly. Root cause: scan stocks may lack `signal_results` rows or the JOIN has a scope issue. High-value fix (cross-referencing scans with signals is the core scan workflow).
- **NR-100** (P1): F&O-ban flag missing from signal rows and today-review candidates. Pre-trade compliance data that exists but is not cross-wired onto action surfaces.
- **NR-101** (P1): Smart-money status not on signal rows or today-review candidates. High-conviction confluence signal missing from primary action views.
- **NR-102** (P1/L): Multi-factor screener — the biggest new surface gap vs competitor tools. Large effort but the highest trader-value new feature not yet started.
- **NR-103** (P2/M): Nifty 50 / Bank Nifty index-constituents view. Requires free NSE constituent list ingest (one-time) + a simple table.
- **NR-104** (P2/M): Market breadth internals dashboard with historical A/D trend, new-highs/lows chart. Addresses CB-72 / NR-15 in a concrete UX form.
- **NR-105** (P2/M): Event/alert feed consolidating bulk deals + F&O bans + 52W breakouts + earnings events.
- **NR-106** (P1/XS): Sector Flows staleness badge on Institutional Activity sub-card — one-line fix, high trust impact.
- **NR-107** (P1/XS): Research Hub `whatChanged` symbol deep-links broken — replace `/stocks/${symbol}` with `/instrument-workspace/${symbol}`. One-line fix per occurrence (3 lines total).
- **NR-108** (P2/S): Today Review 52w indicator — confirm persistence of range fields on run records.
- **NR-109** (P2/XS): Minor pctFromHigh display polish — absolute value + precision for near-zero.

**Top-3 recommended next items (trader value × implementation effort):**
1. **NR-107** (Research Hub whatChanged deep-links, XS effort, P1) — one-line fix unblocking the most important daily-briefing workflow.
2. **NR-106** (Sector Flows staleness badge, XS effort, P1) — closes the 8-day trust gap on the institutional-activity panel.
3. **NR-99** (Signal chip data for scan rows, S effort, P1) — makes the market scans from "price lists" into "signal-confirmed candidates" — the core value proposition of cross-referencing scans with signals.

**Highest-value new surface:** NR-102 (Multi-Factor Stock Screener) — L effort but the single biggest feature gap vs every competing Indian market tool. Recommend starting architecture/data-contract design even if implementation is a wave away.

