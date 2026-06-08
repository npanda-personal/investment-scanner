# UX Audit — Browser-Based, User-Facing Screens — 2026-06

Third UX pass, but the **first done in a running browser** rather than from code. Companion to
[`ux-audit-2026-06.md`](ux-audit-2026-06.md) (page-by-page, code) and
[`ux-audit-cross-cutting-2026-06.md`](ux-audit-cross-cutting-2026-06.md) (dimensional, code).

**Method:** drove the live app via the in-Claude-Code preview browser at **desktop 1440×900**, logged in as the
seed test user (`test@example.com`), navigating each route and reading the rendered DOM / accessibility tree.
Screenshots timed out (perpetual progress/poll animation never settles — itself a minor note), so findings are
from rendered text + structure, which is precise for content/hierarchy/consistency.

**Scope:** user-facing screens only; admin/operator excluded.
**Coverage (20 screens):** Login, Market Pulse, Sector Rotation, Index Constituents, Market Events, Daily Review,
Daily Overview, Research Hub, Review Shortlist, Stock Interest Radar, Earnings Intelligence, Market Scans, Screener,
Watchlists, Portfolios, Alerts, Notifications, AI Copilot, Instrument Workspace + stock page (RCOM) + tabs, Account.
**Coverage gaps:** test account has no portfolios and no selectable watchlists → could not audit a *populated*
holdings/watchlist table; candidate-detail page not opened.

---

## 0. What's improved since the code audits (fair baseline)
Live browsing confirms real progress, so this audit doesn't re-flag fixed items:
- **Portfolio create-form currency now defaults to INR** (USD bug from runtime-audit §F is fixed).
- **Instrument search now filters** ("RELIANCE" → REL-prefixed matches; the "doesn't filter" finding is fixed).
- Newer pages use proper **₹ + Cr Indian formatting** (e.g. Index Constituents `₹3,72,348.5 Cr`).
- Stock workspace now shows **~120-day range**, an adjusted-price note, price chart, OHLCV table, fundamentals in Cr.
- Market Pulse **curates real headline indices** (Nifty 50/Next 50, not inverse/niche) and shows **granular
  "as of … · N days old"** staleness badges + a health sparkline.

---

## 1. Headline: a two-tier app
Newer pages are well-designed and India-native; older core pages carry the debt — and the older ones are the
trader's primary daily screens.
- **Strong tier (newer):** Daily Overview, Sector Rotation, Index Constituents, Market Events, Market Scans, Screener.
- **Weak tier (older core):** Market Pulse, Daily Review, Research Hub, Review Shortlist.

---

## 2. Cross-page consistency & trust gaps (only visible by browsing — highest priority)
1. **Contradictory breadth:** Market Pulse & Research Hub show **A/D 0.86**; Daily Overview shows **A/D 1.07** (same day).
2. **Contradictory confidence:** Daily Overview "**A / 95**" vs Daily Review "**76 (from 95)**" vs Research Hub
   "**Unproven / Research Only**" for the same candidates.
3. **Two sector taxonomies:** GICS (Technology, Financial Services…) on Daily Overview / Index Constituents vs NSE
   indices (Nifty Metal, Bank…) on Sector Rotation. **Research Hub shows both on one page.**
4. **Four market-state vocabularies:** "Fragile" / "NEUTRAL" / "SELECTIVE" / "Neutral regime."
5. **Three date formats:** `6/7/2026, 12:40:05 AM` · `6/5/2026` · `Mon, 08 Jun, 2026`. No IST anywhere.
6. **Three currency renderings:** `₹0.97` · `INR 177.94` · `(Rs.)` headers beside ₹ values.
7. **Freshness contradictions:** Market Pulse "Freshness: **Fresh**" above 4 stale alerts + "VIX · 5 days old";
   "FRESH" (caps) on Stock Interest vs "Fresh" elsewhere.

**Fix:** compute shared metrics (A/D, confidence, sector taxonomy, regime label, freshness, formatting) **once** and
reuse. This is the single highest-trust improvement.

---

## 3. Data glitches visible to users right now
- **INFY (Infosys) shows ₹90.2, sector "—"** on Index Constituents (trades far higher) — visible bad price.
- **Duplicate candidates** in Research Hub (SAMHI ×2, SHANTI ×2 in Exit/Reduce Risk).
- **Review Shortlist's "10 names to review today" are the first 10 alphabetical Active-Ledger rows**
  (3IINFOLTD, AARVI, ABB…); Today Review contributed **0/40**, Stock Interest **0/3** — value-prop fails live,
  after a **~20-second text-only load** with no skeleton.
- **Earnings Intelligence has no real calendar:** every row = same estimated date (8/14/2026, "Days To Result 70");
  extreme figures like **"+1240.7%" profit growth** with no small-base context.
- **AI Copilot "Load Brief" is a silent no-op** on the Market Brief tab (no result, no loading, no error).

---

## 4. Developer / operator copy leaking to traders
- **Instrument Workspace landing:** "Backend Unavailable… Persisted backend read API capability is not implemented
  for this snapshot yet."
- **Alerts:** "Planned Radar Alert States… appear after persisted alert read models exist."
- **Research Hub:** raw module slugs (`strategy-decision-engine`, `signal-quality-lab`, `trade-plan-risk-engine`);
  "Run Strategy Evaluation" CTA.
- **Daily Review:** ops telemetry wall on the trader's main screen ("548 instruments still carry legacy UNKNOWN
  provider status," "1490 need price backfill," "BANKINDIA persisted legacy risk snapshot is unavailable") **plus raw
  DB IDs** (`cmowuxf77006xw52g…`).
- **Notifications:** raw `EMAIL_LOG`, `log-email-provider`; "MVP delivery is free/local-friendly."
- **Workspace tables:** raw enums per row (`NSE_UDIFF_CM_BHAVCOPY`, `MANUAL_VERIFIED`, `PARTIAL`); kebab-case tags on
  Stock Interest (`positive-daily-price-action`, `weak-delivery`, `data-gap`).

---

## 5. Information architecture
- **Nav is now 18 flat items** in one "Trader Workflow" group (grew from 13); no sub-grouping.
- **Four overlapping "start of day" surfaces** (Market Pulse, Daily Overview, Daily Review, Review Shortlist) that
  overlap in content and disagree on numbers (§2).
- **AI Copilot / Notifications buried; Account not in nav at all** (reachable only via `/account`; avatar icon only
  logs out).
- **4 of 8 stock-workspace tabs are external-link stubs** (Signals / Signal Quality / Calibration / Smart Money) —
  no inline data, no cue they navigate away.

---

## 6. Proposed improvements & adjustments to existing screens
- **One source of truth** for shared metrics & formatting (kills §2 contradictions).
- **Pick one sector taxonomy** (NSE indices for an NSE/BSE tool); map GICS onto it everywhere.
- **Daily Review:** demote the ops wall into a collapsed "Data readiness" accordion; lead with the candidate table;
  remove raw DB IDs; drop the always-empty columns (Daily tier / Automation / DQ / Proof show "—").
- **Purge developer/architecture copy** (Instrument Workspace, Alerts, Research Hub, Notifications); replace stub
  states with calm "Coming soon," not error-shaped panels.
- **Review Shortlist:** fix sourcing so the 10 names draw from Today Review / Stock Interest; replace the 20-second
  text load with a skeleton + per-source progress.
- **Standardize formatting:** ₹/Cr everywhere (retire "INR …" and "(Rs.)"), one date format with IST, consistent
  minus glyph (`₹−3,098.0 Cr` vs `₹-11.29`), scores as "x / 100," consistent FRESH/Fresh casing.
- **Add row actions** (★ watchlist, 🔔 alert) to radar/scan/constituent tables (currently only "Open").
- **Stub tabs:** make them inline summaries or visibly external (icon + "opens dashboard").
- **Screener:** add an empty-state/"apply filters" guidance (loads with headers only, no rows, no message).

## 7. New screens / elements needed
- **One consolidated "Today" cockpit** replacing the 4 overlapping daily surfaces (go/no-go gate → shortlist →
  movers → alerts), others as drill-downs.
- **Earnings calendar view** (real dates) replacing the all-estimated wide table.
- **Global "Data as of …" freshness anchor** in the header.
- **Account/Settings in nav** + avatar menu (Account / Log out).
- **Sub-grouped navigation** (Orientation · Discover · My Lists · Deep Dive).
- **Owed:** populated holdings & watchlist audits (no data on the test account this session).

---

## Appendix — per-screen live observations

**Login** — card floats in a large empty dark canvas; no logo/brand/value-prop; no "Forgot password?"; no remember-me;
Log in disabled until fields filled (no explanation).

**Market Pulse (`/`)** — "Freshness: Fresh" above 4 stale alerts (INDEX/SECTOR_INDEX/DELIVERY stale 06-01; VIX 5 days
old). Health "Fragile" / score 45 with sparkline + "unchanged from yesterday" (good). Headline indices curated (Nifty
50 etc.) but Nifty 50 "+0.0%" move. Candidate Count 1,430. A/D 0.86. Generated-at raw locale datetime. Six equal-weight
cards. "No results due in next 2 weeks" earnings chip (good).

**Sector Rotation (`/sector-rotation`)** — strong 4-quadrant rotation map (Leading/Improving/Weakening/Lagging),
clickable chips → screener, sortable table (Score, 1W/1M/3M). Issues: cryptic top warnings ("Latest Price Stale Close
Fallback Used," "Sector Index Price Stale For Data Through Date"); NSE taxonomy (Metal/IT/Pharma…) conflicts with GICS
elsewhere.

**Index Constituents (`/index-constituents`)** — strong; index selector, bull/bear/neutral summary, ₹ + Cr formatting,
per-member signal. Glitch: INFY ₹90.2 + sector "—". GICS taxonomy. "1 of 50 symbols not found in catalog."

**Market Events (`/market-events`)** — strong morning briefing (F&O bans, block deals with buyer/seller + ₹ size, 52W
highs), ₹-formatted. Introduces third date format ("Mon, 08 Jun, 2026"). Long flat 52W-high list within a day (no
collapse). Truncated names ("GQG PARTNERS EMERGING MARKET…"). "F&O BAN: AMBER, KAYNES" — AMBER reads like a severity.

**Daily Review (`/today-review`)** — diagnostics-first wall before the table: run/trust panels + ~20-line ops telemetry
(provider-unknown counts, backfill counts, BANKINDIA/DIVISLAB legacy snapshot notes) + raw DB cuid in "Excluded
example." 10 summary counts; Board Contract + Exclusion blocks (operator jargon). 18-column table with "Hover any clipped
cell" (unusable on touch). Confidence "76 (from 95)" confusing; Daily tier/Automation/DQ/Proof columns all "—". Currency
"INR 177.94" text code. 52w-range context present (good). Confidence-downgrade note duplicated in Confidence + Blocker.

**Daily Overview (`/daily-overview`)** — strong "today" page: movers (gainers/losers w/ name+sector+%), timeframe
toggle, Today-at-a-glance counts, Top Signal Candidates (A/95), Sector Strength (1M/3M/6M). Issues: A/D 1.07 (conflicts
with 0.86 elsewhere); grades "A/95" (conflict with "76 from 95"); strategy code "TODAY_REVIEW_LITE v1.0.0"; GICS
taxonomy with both "Technology" (leading) and "Information Technology" (weak).

**Research Hub (`/research`)** — every dimension UNPROVEN/LIMITED/INSUFFICIENT DATA; raw module slugs; readiness
collapses to "Unproven/Research Only" for all; **duplicate** candidates (SAMHI ×2, SHANTI ×2); strategy+version codes
(`DEFENSIVE_EXIT v1.0.0`); bare scores (90/95/80); "Market is SELECTIVE" (another state word); **both** sector
taxonomies on one page; A/D 0.86 (agrees with Market Pulse).

**Review Shortlist (`/daily-review-shortlist`)** — ~20s text-only load; "10 names" = first 10 alphabetical Active-Ledger
rows; Today Review 0/40, Stock Interest 0/3; every row identical "Active risk review / Blocker / Ready / Forward-
validation evidence unavailable"; "Sector unavailable" all rows; explainability list duplicated below table; operator
"Stale Eod: 57 affected; Backfill prices" block. Source-contribution transparency panel is a nice touch.

**Stock Interest Radar (`/stock-interest-radar`)** — 7 tabs no counts; copy admits "Rows are displayed in backend
snapshot order" (no sort); kebab-case raw reason/risk tags; "FRESH" caps; only "Open" action (no watchlist add).

**Earnings Intelligence (`/earnings-intelligence`)** — 16-column table; all result dates estimated to 8/14/2026 (Days
70); 4 disclaimer lines; humanized but verbose reason/risk/warning lists (tall rows); extreme growth values
("+1240.7%") no context; no company-name column; bare scores.

**Market Scans (`/market-scans`)** — clean (52W Highs/Lows, Delivery/Volume Spikes), ₹-formatted, 30 results. Issues:
"Basis: Raw/Adj" cryptic; several sectors "—"; bare signal scores ("BULLISH 80").

**Screener (`/screener`)** — strong India-relevant filters (RS percentile, delivery %, cap band, Exclude F&O Ban) with
proper dropdowns. Gap: renders headers only, **no rows and no empty-state guidance** on load.

**Watchlists (`/watchlists`)** — permanent "Coming soon" overlays banner; always-visible Create form; "Select a
watchlist" empty state; no selectable watchlist for this account.

**Portfolios (`/portfolios`)** — always-visible Create form; **currency defaults to INR (fixed)**; empty state; no
portfolio for this account.

**Alerts (`/alerts`)** — "Planned Radar Alert States" dev-copy card; prominent "Evaluate Now" expert control; empty
inbox + rules.

**Notifications (`/notifications`)** — raw `EMAIL_LOG` / `log-email-provider`; MVP copy; free-text quiet-hours fields;
4 immediate "Send …" buttons; empty history.

**AI Copilot (`/copilot`)** — 5 tabs; "Select an entity" empty-state shown even on Market Brief (no entity); **"Load
Brief" silent no-op** (no result/feedback).

**Instrument Workspace / stock page (`/stocks/:id`)** — landing shows dev copy ("Backend Unavailable… read API not
implemented"). Stock page much improved: ₹/Cr, ~120D range, adjusted-price note, chart, OHLCV table, fundamentals in
Cr. Issues: raw enums (`NSE_EQUITY_SECURITIES`, `NSE_UDIFF_CM_BHAVCOPY` every row, `MANUAL_VERIFIED`, `PARTIAL`);
"Freshness: Inadequate History"; redundant Currency column + "(Rs.)" headers beside ₹; inconsistent minus glyph;
Market Cap/PE "N/A"; **Signals/Quality/Calibration/Smart Money tabs are external-link stubs** ("Open in … Engine").

**Account (`/account`)** — minimal (Name, Save profile, Log out); not in nav; Log out adjacent to Save; no password/
security/email-change.

---

*Note: the preview tool reported `reused: false` attaching to port 5173, so it may have spawned its own dev-server
process; it was left running (stopping is a lifecycle action gated by owner approval per project constraint).*
