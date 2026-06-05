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
