# Product Value Charter

> North-star document for the investment-scanner. It defines **who the app serves, how each part adds value, and what we build next — prioritized by user value, not monetization.** All technical TODOs live *underneath* the value themes here so every fix maps to a trader/investor outcome.

_Last consolidated: 2026-06-04._

---

## 1. Phase & Principles

- **Phase: personal validation (~12 months).** The owner will test the app with their own trades and portfolio picks before any commercial release.
- **Top priority: accuracy, consistency, and intelligence** of the app — NOT revenue. Prioritize by **user value**, not business/monetization value.
- **100% free / local / open-source** data and tooling during this phase. Licensing, legal, and paid services/tools are deliberately **parked** for the future commercial phase and are out of scope here.
- **Research-support, not financial advice.** NSE/BSE-only official data. (See `docs/instructions.md`, `docs/architecture.md`.)

---

## 2. The Core Insight: close the accuracy loop

The app can currently *produce* opinions but cannot yet *prove* them, because **signal outcomes are never recorded** (computed on-the-fly, not persisted). That leaves the value loop **open**:

```
signal fires → outcome measured → track record → calibration adjusts → backtest validated vs reality → repeat
```

Closing this loop is the highest-leverage move in the whole product. It is the foundation of "are the signals accurate?", honest backtests, self-improving calibration, and a trustworthy track record over the 1-year test. **Everything in Theme 1 below exists to close this loop.**

---

## 3. The Trader Value Model — 5 jobs

Every module exists to answer one of five questions a trader/investor actually asks. This is how to understand the app.

| # | The trader's question | What it produces | Modules behind it |
|---|---|---|---|
| 1 | **"Should I even be trading right now?"** | Market-health → capital posture (risk-on / raise cash / stay out) | market-context-intelligence, market-pulse, regime |
| 2 | **"What deserves my attention today — long *and* short?"** | Daily ranked shortlist + discovery | today-trade-review, market-intelligence, (future screeners) |
| 3 | **"Is this idea good, and what's my exact plan?"** | Setup → entry / stop / target / invalidation | signal-generation, strategy-framework, trade-plan-risk, stock-research-workbench |
| 4 | **"Can I trust it? Has this actually worked?"** ⭐ | Realized accuracy, calibration, validated backtests | signal-quality-lab, signal-calibration, backtesting-strategy-lab |
| 5 | **"What do I hold, and what changed?"** | Holdings health + monitoring | portfolio-management, portfolio-intelligence, watchlist, alerts, notifications |

Cross-cutting: **"Explain it / keep me honest"** → ai-investment-copilot, research-hub, (future thesis/decision log).
Enablers (invisible but required): market-data-foundation, data-quality-engine, pipeline-orchestration, auth-identity, subscription-billing.

⭐ Job 4 is the owner's #1 priority and currently the weakest layer.

---

## 4. Current State vs. Asks (honest, code-grounded)

| Ask | Today | Gap |
|---|---|---|
| Test if signals are accurate | Outcomes computed on-the-fly, **never stored** | No realized track record exists → accuracy is unprovable. **(keystone)** |
| Backtests that make sense | Works, but **in-sample only**; silent 50-instrument cap; benchmark date-misalignment; no real index benchmark; ENTRY-only | Looks credible but can mislead; needs out-of-sample validation. |
| Go to cash when market is bad | Primitives exist (`RISK_ON/NEUTRAL/RISK_OFF`, gate `CLOSED/SELECTIVE/OPEN`) but only **suppress** longs silently | No first-class "raise cash / exposure band / stay out" output. |
| Long **and** short | Longs first-class; shorts only in Today-Review "Lite" logic, **lumped under exit-risk**, not validated/backtested/calibrated | Shorts are second-class; need symmetric treatment. |

---

## 5. Value-Prioritized Backlog (themes, accuracy-first)

Ordered by user value. Each theme lists **new capabilities** (✦) and the **existing TODOs** it absorbs (IDs from the consolidated backlog review). P-levels are correctness/value severity.

### Theme 1 — Prove Signal Accuracy ⭐ *(the #1 value goal; built on a verified data foundation)*
*The trust loop. Serves Job 4. Sequenced **after** Theme 6 because accuracy numbers are only as trustworthy as the data underneath.*
- ✦ **Persist `SignalOutcome`** (model + persist on recalc + read API). _P1, L._ — foundation for everything below.
- ✦ **Signal Track-Record Scorecard** — realized win-rate, expectancy, profit factor, max-adverse-excursion, sliced by strategy × regime × sector × timeframe.
- ✦ **Live forward-tracking** — every fired signal auto-tracked forward, building a real record over the 1-year test.
- ✦ **Close the calibration loop** — feed realized outcomes back into signal-calibration confidence.
- Fix stale-data confidence downgrade (#12, P2); `categoryScore` Laplace smoothing to stop sparse-data score inflation (#11, P2).
- Targeted tests: outcome/horizon math (#27).
- _Dependency note: the scorecard's **numbers** are only as trustworthy as the data feeding them — see Theme 6. Build the machinery now; trust grows as data completeness grows._

### Theme 2 — Trustworthy Backtests
*Serves Job 4. "Backtests that actually make sense."*
- ✦ **Walk-forward / out-of-sample validation** — flag overfit (in-sample vs out-of-sample degradation).
- Fix benchmark entry-date misalignment inflating excess CAGR (#15, P2).
- Implement real **regional index benchmark** (currently equal-weight fallback) (#16, P2).
- Surface/justify the **50-instrument cap** instead of silently applying it.
- Decide EXIT/GATE/FILTER backtestability or document ENTRY-only rationale.

### Theme 3 — Capital Posture (know when to go to cash)
*Serves Job 1. The owner's "exit and stay in cash when market health is bad."*
- ✦ **Capital Posture Engine ("Market Risk Director")** — daily first-class output: regime → suggested exposure band (e.g. "RISK_OFF: ≤25% invested, raise cash, no new longs") with evidence (breadth, % below 200-DMA, index trend, delivery). Promote market-health from a hidden gate to a headline call on the Daily Overview.
- Fix trader GET endpoints that **calculate instead of reading** persisted snapshots — required for a trustworthy, fast market-health read (#5, P1).

### Theme 4 — Long & Short Symmetry
*Serves Jobs 2 & 3. "Long and short opportunities are very helpful."*
- ✦ **First-class Short Playbook** — validated, backtested, calibrated short strategies (breakdown, distribution / smart-money outflow, weak-sector relative weakness) on their **own board**, not buried under exit-risk.
- Strategy evaluator default branch should **fail-fast**, not silently emit "not implemented" (#6, P1).
- Confirm Today-Review `NO_REVIEW` truly publishes zero candidates (no PARTIAL leak) (#7, P1) — applies to both directions.
- Trade-plan invalid stop (≥ entry) must **hard-stop**, never coexist with VALID (#8, P1).

### Theme 5 — Close the Human Loop (the 1-year validation engine)
*Serves Job 5 + makes the whole self-test measurable.*
- ✦ **Trade Journal + Decision Log + monthly post-mortem** — log real entries/exits + reasons, compare *your* trades vs the app's signals, monthly "what did the app get right/wrong." Turns a year of trading into a continuous accuracy dataset.
- ✦ **Conviction & invalidation tracker** — per open idea: thesis, what would invalidate it, "what changed since last review."
- **Alerts that matter** — regime flip to RISK_OFF, signal deterioration on a holding, invalidation level hit, earnings approaching on a holding. Fix order-sensitive dedupe (#24); enforce quiet-hours (#25).

### Theme 6 — Foundation & Data Accuracy ⭐ **(NOW FIRST — GIGO)**
*Owner directive (2026-06-04): "if the main foundation data is not accurate, everything else goes for a toss." Every downstream number — signals, backtests, regime, posture — is only as good as this layer. This is the prerequisite, not a parallel track.*
- **Verify correctness, not just presence:** corporate-action adjustment (splits/dividends → adjustedClose) math; OHLCV sanity (no impossible values, no zero-volume garbage); import idempotency & de-duplication; NSE/BSE symbol-identity mapping (collision safety, no wrong-exchange price mixing); EOD freshness vs trading calendar; history-completeness thresholds.
- **Finish the NSE/BSE foundation:** BSE fill, index/sector/delivery/F&O live validation, historical backfill resume, Market Data Ops UI (#3, P1).
- **Reconciliation / spot-check tooling (free):** cross-check stored OHLCV against the source NSE/BSE bhavcopy for a sample of symbols/dates, so "accurate" is demonstrable rather than assumed.
- Tune Data Quality thresholds for the Indian market; move hardcoded values to config (#18).
- **P0 safety (quick warm-ups):** untrack committed `backend/.env` + rotate secrets (#1); make CI actually run tests (#2).

### Cross-cutting quality & debt (fix opportunistically while in the area)
N+1 previous-close lookups (#9) · in-memory latest-row filtering (#10) · strategy-framework barrel-export cycle (#13) · split the 14k-line market-data god-object (#19) · subscription counter race + null-userId counting (#20) · portfolio missing-price/P&L (#21) · watchlist ownership TOCTOU (#22) · copilot output sanitization gaps (#23) · earnings date-provenance ambiguity (#26) · ESLint config + lint in CI (#28) · TS version unification (#29) · stale Prisma schema files (#30) · README link (#31) · centralize env reads (#32).

### Parked (deferred to commercial phase — NOT now)
Auth refresh/revocation & real session management (#33) · autonomous alert scheduler (#34) · monetization/billing depth · licensing, legal, paid data/AI/hosting · multi-user/SaaS hardening.

---

## 6. Sequencing

1. **Phase 0 (quick safety warm-ups):** P0 #1 (.env) + #2 (CI runs tests). Small; protects everything.
2. **Theme 6 — Foundation & Data Accuracy FIRST.** Owner directive: if foundation data isn't accurate, everything downstream is garbage (GIGO). Verify correctness (corporate actions / adjusted close, dedup, identity, freshness, completeness), finish the NSE/BSE foundation, and build free reconciliation/spot-check tooling so accuracy is demonstrable.
3. **Theme 1 — Prove Signal Accuracy** (the #1 value goal) — now trustworthy because the data underneath is. Persist outcomes → scorecard → feed calibration.
4. Then **Theme 3 (Capital Posture)**, **Theme 2 (Trustworthy Backtests)**, **Theme 4 (Short Symmetry)**, **Theme 5 (Human Loop)**.

Work proceeds in **small, approved iterations**, each starting with a read-only deep-dive + plan before edits.
