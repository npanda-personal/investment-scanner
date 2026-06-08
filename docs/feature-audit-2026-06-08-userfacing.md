# User-Facing Feature Audit — Live Browser Walkthrough (2026-06-08)

**Author:** PO review (domain-expert lens, not developer).
**Method:** Read-only Playwright crawl of the running app at `http://localhost:5173`, authenticated as the E2E test user (`test@example.com`). All 21 user-facing screens captured (full-page screenshot + DOM text + console/network logs). **Admin screens (`/admin/*`) were out of scope.**
**Reusable harness:** `frontend/tests/ui/user-facing-audit.spec.ts` (opt-in: `UI_AUDIT=1 npx playwright test user-facing-audit`; artifacts → `frontend/test-results/ui-audit/`).
**Tech health at audit time:** zero console errors, zero HTTP≥400 across all screens. **Every problem below is product/UX, not a crash.**

> **Status: AUDIT / WORK LIST.** This doc is the backlog we will fix against. Read-only when written — nothing was changed in the app.

---

## 0. Headline — priorities are inverted

**The core product is empty; the periphery is rich.** The three screens that answer the one question this app exists for — *"what do I look at today?"* — are non-functional in the running app, while niche power-user screens (Derivatives/F&O, Earnings, Sector Rotation) are full of data.

| Screen | What the trader actually saw | Verdict |
|---|---|---|
| **Daily Review** (`/today-review`) | Infinite "Loading Daily Review for IN / STOCK…" spinner. No content, no empty-state, no error. | 🔴 Broken |
| **Daily Overview** (`/daily-overview`) | Every panel a grey skeleton. "Today Review: **Unavailable**", "Data through: **Unavailable**". | 🔴 Broken |
| **Review Shortlist** (`/daily-review-shortlist`) | Permanent skeleton: "Loading shortlist — collecting persisted sources…". Never resolves. | 🔴 Broken |
| **Instrument Workspace** (`/instrument-workspace`) | "Backend Unavailable… Persisted backend read API capability is not implemented for this snapshot yet." | 🔴 Dead |

**Single most important finding:** a stock can be surfaced on **nine** discovery screens, but when the trader clicks to research it, the destination (Instrument Workspace) is dead. **Discovery everywhere, destination broken.**

---

## 1. Existing gaps

- **G1 — Daily decision loop doesn't work.** Daily Review / Daily Overview / Review Shortlist all empty/loading. The product spine is missing in the running app.
- **G2 — No working per-stock research view.** Instrument Workspace is the natural drill-down from every list and is a "Backend Unavailable" stub. There is nowhere a trader can land on one stock and study it.
- **G3 — No track record anywhere user-facing.** Nothing answers "has this signal/score actually worked?" That evidence lives only in the admin Signal Quality Lab. For a trust-first "research-support" tool, the trust evidence is invisible to the user.
- **G4 — Earnings runs on guesses.** Earnings Intelligence is a large table where **every row says "Estimated from period cadence"** — no official earnings calendar behind it (top banner admits "No official earnings calendar").
- **G5 — Constant stale-data anxiety.** Market Pulse opens with 4 amber warnings ("stale price", "close fallback used", "insufficient sample"); several screens carry "Latest Price Stale / Close Fallback Used" banners. The app repeatedly tells the trader not to trust it.
- **G6 — Promised enrichment is vaporware.** Watchlists: "Watchlist Intelligence Overlays — **Coming soon**." Alerts: a "Planned Radar Alert States" block that "does not evaluate" anything.
- **G7 — Operator language leaks to traders.** "persisted snapshot fields", "this page does not run review generation", "downstreamSafe", "Backend Unavailable for this snapshot." Internal vocabulary in a trader-facing product.

## 2. Unnecessary / no-value features (for a real NSE/BSE cash trader)

- **U1 — Crypto Market.** Under the only populated scope (India) it's a permanent placeholder: "Crypto Market Overview is not applicable to Indian equities." → **Remove from nav** until a real crypto scope exists.
- **U2 — Daily Overview.** Redundant aggregator of Daily Review + movers + sector strength, and broken. Adds a screen, adds no unique data. → **Remove/merge.**
- **U3 — Notifications (full screen).** Local email-log digests + quiet hours for a single local user with no real delivery. → **Fold into Account or Alerts.**
- **U4 — AI Copilot (as a primary page).** Deterministic re-summaries of data already shown elsewhere; "Load Brief" emits canned text. → **Demote to a panel, not a nav destination.**
- **U5 — Derivatives / F&O.** Rich (OI buildup, PCR, max pain, FII positioning) but power-user scope creep for a 1D, cash-equity, research-support validation app (cash stocks can't be shorted). → **Keep only if the owner trades F&O; otherwise defer.**
- **U6 — Earnings Intelligence as a flagship.** Until official dates exist, demote; estimated-date earnings is a misleading headline.

## 3. Duplicated information across screens

- **D1 — Sector strength/rotation ×3–4:** Market Pulse (Strong/Weak chips **and** a full Sector Intelligence table) + Sector Rotation (quadrants + all-sectors table) + Daily Overview (Sector Strength) + Research Hub coverage.
- **D2 — "Stocks to look at" ×9:** Stock Interest Radar, Market Scans, Screener, Index Constituents, Market Events, Research Hub priority board, Daily Review, Review Shortlist, Daily Overview.
- **D3 — 52-week highs ×4:** Market Events (feed is mostly "NEW HIGH … near 52-week high") ≈ Market Scans "52W Highs" tab ≈ Screener "52W Pos" filter ≈ Stock Interest Radar "Breakouts" tab.
- **D4 — Movers ×3:** Daily Overview price movers + Market Pulse breadth + Market Scans volume/delivery spikes.
- **D5 — Market regime ×4 (and inconsistent):** top-bar "NEUTRAL" chip + Market Pulse "Fragile 64" + Research Hub "Market is SELECTIVE" + Daily Overview header. Top bar (NEUTRAL) and Market Pulse (Fragile) disagree.

## 4. Screens to merge (nav is 20 items in one flat list → target ~8)

- **M1 — Daily Review + Daily Overview + Review Shortlist → one "Today" home.** Three broken, overlapping answers to the same question. Build one that works. **(3→1)**
- **M2 — Screener + Market Scans + Stock Interest Radar + Index Constituents → one "Screener" workspace** with preset chips (52W Highs/Lows, Delivery/Volume Spikes, Index members, Accumulation, Breakouts) on top of the custom filter bar. **(4→1)**
- **M3 — Market Pulse + Sector Rotation + Market Events → one "Market" overview** with Health / Sectors / Events tabs. **(3→1)**
- **M4 — Notifications → into Account; AI Copilot → a panel, not a page.**
- Result: trader nav from **20 → ~8** (Today, Market, Screener, Earnings, Watchlists, Portfolios, Alerts, Instrument). Group them; don't dump them in one flat column.

## 5. Per-screen disposition (fix / change / remove / keep)

**FIX (broken — highest priority):**
- Daily Review, Daily Overview, Review Shortlist — empty/infinite-loading; also add real empty-states instead of perpetual spinners.
- Instrument Workspace — dead backend; **highest-value fix** (it's the destination for every discovery list).

**CHANGE:**
- Earnings Intelligence — get official dates or label honestly + demote.
- Stock Interest Radar — many rows show "Unavailable" sector (metadata gaps); fix.
- All trader copy — strip operator jargon.
- Regime display — reconcile NEUTRAL (top bar) vs Fragile (Market Pulse).

**REMOVE / MERGE:** Crypto (nav), Daily Overview, Notifications (page), Copilot (page); collapse discovery + market clusters per §4.

**KEEP (working, render real data cleanly):** Sector Rotation, Index Constituents, Derivatives, Market Scans, Earnings table, Portfolios, Account, Research Hub, Stock Interest Radar. *The engineering is fine; there are simply too many of them and the important ones are empty.*

## 6. Bottom line

This is not a product with too few features — it's one with **too many half-built screens and a broken core.** Derivatives OI analytics and a sector-rotation quadrant shipped while the "what do I trade today" page spins forever and stock-detail is a stub. A real trader would bounce: the first three things they'd click (Daily Review, Daily Overview, open a stock) are all dead.

**Fix the spine (Today + Instrument Workspace), merge 20 screens → ~8, cut the placeholders (Crypto, Notifications-page, Copilot-page).** The data foundation is clearly there — it's pointed at the wrong screens.

---

## 7. Suggested fix order (for the remediation pass)

1. **Instrument Workspace** — implement the persisted read backend; it's the destination for everything (unblocks G2 + the §3/§4 discovery merges).
2. **"Today" home** — make Daily Review work end-to-end, then fold Daily Overview + Review Shortlist into it (G1 + M1 + U2).
3. **Merge discovery** — Screener + Market Scans + Stock Interest Radar + Index Constituents → one workspace (M2 + D2/D3).
4. **Merge market context** — Market Pulse + Sector Rotation + Market Events → one screen (M3 + D1/D4/D5).
5. **Trust surface** — bring track-record/scorecard to a user-facing screen (G3).
6. **Earnings honesty** — official dates or clear "estimated" labeling + demote (G4 + U6).
7. **Cut placeholders** — Crypto nav, Notifications page, Copilot page (U1/U3/U4).
8. **Copy + regime cleanup** — de-jargon trader screens; reconcile regime labels (G7 + D5).

After each change, re-run the audit harness (`UI_AUDIT=1 npx playwright test user-facing-audit`) and check `test-results/ui-audit/_unhealthy.txt` shrinks.

---

*Evidence: `frontend/test-results/ui-audit/` (screenshots + `_summary.json` + `_unhealthy.txt`) from the 2026-06-08 crawl. Regenerate anytime via the harness.*
