# Product Owner Feature Audit — Indian-Equity Domain Lens — 2026-06

A **product/feature** review (not UX, not code), written from a Product Owner + NSE/BSE domain-expert perspective.
Grounded in the live browser walkthrough captured in [`ux-audit-browser-2026-06.md`](ux-audit-browser-2026-06.md).
Companion to the three UX audits in this folder.

**Judged against the core jobs-to-be-done** and the product's **hard constraints**: NSE/BSE-only · no paid data ·
research-support (not advice) · no order execution.

## Core jobs-to-be-done
1. Is today risk-on or risk-off? (regime)
2. What do I look at today? (discovery / shortlist)
3. Is this stock worth acting on — and what's my plan? (deep-dive + entry/exit/risk + proof)
4. Track what I own / watch (portfolio / watchlist)
5. Tell me when something happens (alerts)

**Thesis:** the product over-serves #1–2 with five overlapping surfaces, exposes internal plumbing as "features," and
under-serves the Indian-market depth that would differentiate it. **Consolidate the redundant, cut the plumbing,
reinvest in domain depth.**

---

## 1 — Useless / redundant — cut or merge

| Feature | Verdict | Rationale |
|---|---|---|
| **Review Shortlist** | Cut / merge into Daily Review | Duplicates Daily Review's job; live it serves the first 10 *alphabetical* ledger rows (Today Review contributed 0/40), ~20s load. A broken third copy of "what to review today." |
| **Research Hub — Actionability/Readiness matrix** (8 dims tagged `strategy-decision-engine`, `signal-quality-lab`…) | Cut the matrix; keep only the priority board | Engineering readiness telemetry dressed as a trader feature. Reads "UNPROVEN/LIMITED" everywhere → erodes trust, delivers nothing actionable. |
| **Research Hub — Drilldown Analysis** (mini Market Pulse / Breadth / Sector / Flow) | Cut | Re-renders shrunken copies of pages that already exist. |
| **AI Copilot** (current form) | Cut / defer | "Deterministic summaries of existing modules" = restating on-screen data; live, "Load Brief" is a silent no-op. Revisit only as true NL Q&A over the data or a genuine daily narrative. |
| **Notifications → manual "Send Daily/Weekly Digest / Test Email"** | Cut from user surface | Manually firing digests + `log-email-provider` is dev/QA scaffolding. Digests should be scheduled. |
| **Alerts → "Evaluate Now"** | Cut / hide | Manual rule-evaluation is a debug control, not a feature. |
| **Stock-workspace stub tabs** (Signals / Signal Quality / Calibration / Smart Money) | Cut from user workspace (or make inline — §2) | 4 of 8 tabs are "Open in … Engine" links to admin dashboards; advertise capability not delivered inline. |
| **Earnings → "Result Reaction History" tab** | Cut | Needs official earnings dates the system doesn't have; can never populate. |

**Net:** the five-way market/daily overlap (Market Pulse, Daily Overview, Daily Review, Review Shortlist, Research
Hub) should collapse toward **two** surfaces: a *market cockpit* and a *daily shortlist*.

---

## 2 — Features that need changes (keep, refocus)

| Feature | Change |
|---|---|
| **Daily Review** (most important feature) | Strip the operator wall (provider-unknown/backfill counts, raw DB IDs, board/quota/lane jargon) into a collapsed "data readiness" note. Present cleanly: symbol · setup · entry trigger · invalidation · why. Fix confidence to one number (not "76 (from 95)"). |
| **Market Pulse** | Make it the clean **go/no-go** owner (regime + breadth + VIX + sector). Fix self-contradiction ("Fresh" over 4 stale alerts). Good bones — keep. |
| **Sector taxonomy (everywhere)** | Standardize on **NSE sectoral indices** (Nifty Bank, IT, Auto, FMCG, Pharma, Metal, PSU Bank, Realty, Energy, FinServ…). GICS (Technology/Basic Materials/Consumer Cyclical) is a domain tell of generic/foreign mapping; today both coexist and even contradict on one page. |
| **Earnings Intelligence** | Without a real results calendar it's fundamental-growth analysis mislabeled as earnings timing. Either acquire real corporate-calendar data (§3a) or descope + rename to "Recent Results / Fundamental Momentum" and drop the estimated-date calendar. |
| **Discovery cluster** (Stock Interest Radar + Market Scans + Screener + Index Constituents) | Four overlapping "find stocks" tools (breakouts in both Radar and Scans). Rationalize into one coherent **Discover**: Screener (rules) + Scans (event-driven 52w/delivery/volume) + Index drill; fold Radar tabs in. |
| **Screener** | Add Run/results + **Save screen** (named, re-runnable) + alert-on-screen. Highest-leverage discovery tool; currently loads empty. |
| **Watchlists** | Ship the perpetual "Intelligence Overlays — Coming soon" (signal flip, near-52w, results-due, F&O ban on watched names) or remove the promise. Add **target price** + one-click alert. |
| **Portfolios** | Add Indian-investor essentials (see §3): realized P&L, XIRR/CAGR, **benchmark vs Nifty**, **capital-gains STCG/LTCG tax-lot view**, **dividend tracking**. Today: holdings + allocation + transactions only. |
| **Alerts** | Ship the planned domain-native types ("Entered Radar, Upcoming Result, Risk Radar Entry, Sector Weakness, 52W High, Delivery Accumulation") + F&O ban entry + block deal in a held/watched name. |

---

## 3 — New features to add (domain gaps — all constraint-compatible)

NSE/BSE publish the underlying data EOD for free, so each respects no-paid-data / no-execution.

### High impact
- **a) Real Corporate Actions & Events calendar** — results dates, dividends (ex/record), splits, bonus, buyback,
  rights, AGM. Foundational; currently faked with estimates. *(NSE/BSE corp-action feeds free EOD.)*
- **b) FII/DII activity + Institutional Flow** — daily FII/DII cash + F&O provisional/final flow; merge with the block
  deals already in Market Events into one "Institutional Flow" view. *(Free; a `FiiDiiActivityWidget` already exists in
  admin/market-context — surface to users.)*
- **c) Capital-gains / tax-lot tracking (STCG vs LTCG)** — unrealized & realized split into STCG/LTCG buckets,
  days-to-LTCG countdown, Jan-31-2018 grandfathering, STT awareness. Standout investor feature; pure research, no
  execution; computed from the user's own transactions.
- **d) Personalized daily digest** — "what changed in *my* watchlist/holdings today" (signal flip, near-52w,
  results-due, F&O ban, big delivery day). Ties watchlist+alerts+notifications into the daily loop; today every daily
  surface is universe-wide, not personal.

### Medium impact
- **e) F&O / derivatives context (EOD)** — OI, PCR, futures premium/discount, rollover %, max-pain + the F&O ban list
  already tracked. *(NSE F&O bhavcopy + participant OI free EOD.)* Serves the F&O segment currently ignored beyond bans.
- **f) Position-size / risk calculator** — entry + stop + account size + %-risk → position size & R-multiples.
  Research-support, no order placement. (`trade-plan-risk-engine` exists in admin — surface a user version.)
- **g) Dividend income tracker / yield-on-cost** — income calendar for holdings. *(From corp-actions + holdings.)*
- **h) Stock comparison / peer view** — compare 2–5 names (valuation, RS, returns, delivery). Common need, absent.
- **i) User-facing backtest proof** — Research Hub constantly says "No backtest summary available." Surface "how this
  setup performed historically" from the admin `backtesting-strategy-lab`, or stop showing unproven labels.

### Lower / nice-to-have
- **j) Trade journal / decision log** — log "reviewed X → watch/skip, why." Closes the daily-review loop; fits the
  research-support positioning.
- **k) Delivery-% analytics expansion** — delivery-trend + delivery-based accumulation (genuine NSE edge; free in
  bhavcopy; you already have spikes — go deeper).

---

## PO recommendation
Consolidate the five market/daily surfaces into two, delete the internal-readiness plumbing masquerading as features,
and reinvest that scope into Indian-market depth — real corporate-actions/events, FII/DII & institutional flow, EOD F&O
context, and capital-gains/dividend tracking. This moves the product from "many shallow generic dashboards" to
"the NSE/BSE research tool that knows the Indian market."

### Suggested sequencing
1. **Cut/merge** (§1) — removes confusion and maintenance load fast; collapse the 5 daily surfaces → 2.
2. **Refocus Daily Review + standardize sector taxonomy** (§2) — fixes the core loop and a pervasive trust gap.
3. **Domain depth, in order:** Corporate-actions calendar (a) → FII/DII + Institutional Flow (b) → Capital-gains
   tracking (c) → Personalized daily digest (d).
4. **F&O context, position-size calc, comparison, backtest proof** (§3 e/f/h/i) as the next wave.
