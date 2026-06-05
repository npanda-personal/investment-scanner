# Feature Audit — 2026-06-05

**Author:** PO review (read-only audit; no code changed)
**Phase context:** Personal-validation phase, single owner-user, free/local, NSE/BSE-only, intelligence-first. Value model = the 5 trader jobs ("Should I trade now? / What to watch today (long+short)? / Is this idea good + my plan? / Can I trust it (track record)? / What do I hold + what changed?").
**Method:** 7 parallel read-only explorers inventoried all 28 backend modules / 27 frontend features (what each does, user-vs-admin, wired-vs-dead, overlaps, quality flags). Findings reconciled and judged against the product charter.

> **Status: PROPOSAL ONLY.** Nothing in this report has been executed. No feature is to be cut, changed, or built without owner approval. Two items are explicitly flagged as owner-only domain rulings.

---

## 0. Structural finding (read this first)

The "two angles" split — **admin-facing datasets vs user-facing datasets** — is the key lens.

| User-facing (the trader sees) | Admin/operator-facing (running the machine) |
|---|---|
| Market Pulse (home), Daily Review Shortlist, Stock Interest Radar, **Earnings Intelligence**, ~~Compounder / Trader-Setup / Risk Radars~~ (stubs), Instrument Workspace | Market Data Ops, Data Quality, Pipeline Ops |
| Today Review (Daily Review) | Signal Generation, **Signal Quality Lab**, **Signal Calibration** |
| Research Hub, Stock Research Workbench (Research tab) | Strategy Framework, Strategy Decision, Backtesting Lab |
| Portfolio (+ Intelligence panel), Watchlist, Alerts | Historical Context, Market Context |
| Smart Money, Copilot\*, Notifications\*, Account, Capital-posture chip | Trade Plans, Trigger Monitor (Position Ledger), **Billing** |

\* routed but **not in any nav** — undiscoverable.

**The imbalance:** ~15 operator pages vs ~12 user surfaces, for an app with **one user who is both**. Substantial build went into the machine room (justified by data-foundation-first), but several operator tools are over-built while several charter trader-jobs are under-built or invisible. That imbalance is the through-line of everything below.

---

## ① Useless / cut-or-defer

| Feature | Angle | Call | Why |
|---|---|---|---|
| **Subscription-Billing** (page + gating apparatus) | Admin | **Park/hide** (keep schema) | Premature for a free/local single-owner validation phase. Gates already disabled via `SUBSCRIPTION_LIMITS_DISABLED` / `COPILOT_USAGE_UNLIMITED`; FREE-gate bugs already bit the owner (#26: copilot blocked owner). Pure liability + maintenance with zero phase value. Keep auto-FREE-on-signup (harmless); stop maintaining the rest until the commercial phase (already parked). |
| **Compounder Radar / Trader-Setup Radar / Risk Radar** | User | **Remove from nav** | Live nav links rendering "backend not available yet." Dead links in your own product erode trust in everything beside them. Cut from nav until backed (or fold into Stock Interest Radar tabs). |
| **daily-overview-dashboard** | User | **Decide: promote or delete** | Fully built, wired to real APIs — and **completely unrouted/unreachable.** Also duplicates Today Review + Market Context + Movers. Finished-but-orphaned is the worst state. Either make it the home (see §3) or delete it. |
| **Daily Review Shortlist vs Today Review** | User | **Collapse to one** | Two pages, same trader job ("what do I watch today"). Shortlist = 10-slot cross-source aggregation; Today Review = authoritative run. Pick one as the product; demote the other to a widget. |
| **Notifications-Delivery** (full prefs page) | User | **Simplify/defer** | For one local user: no scheduler, log-only email, quiet-hours stored-but-not-enforced, SMTP unimplemented — a whole preferences surface is over-built. Keep digest *generation*; defer the page. |
| **Market Context** standalone admin page | Admin | **Keep, low-priority** | Its value (regime/posture) already reaches the user via the AppBar chip and feeds Today Review/Portfolio. Page is operator-debug only. Not harmful; don't invest. |

**Highest-leverage cut:** billing — the biggest chunk of off-thesis surface area carrying real bug risk.

---

## ② Features that need changes

| Feature | Angle | Change | Why it matters |
|---|---|---|---|
| **Signal Calibration** | Admin→? | **Decide its fate** ⚠️ owner ruling | Calibration is computed and persisted but **never applied to served scores** — a fully-built transparency tool nobody downstream consumes. Either (a) wire `calibratedScore` as the displayed score, or (b) formally retire the engine. Today it is dead compute. |
| **Track-record / scorecard** | Admin→**User** | **Surface to the trader** | Charter calls track record the *trust backbone* ("Can I trust it?"), but it lives only in **Signal Quality Lab (admin-only)**. The user never sees whether signals have worked. Clearest admin-dataset-that-must-become-user-facing. |
| **Earnings Intelligence** | User | **Honest dates + expose refresh** | User page runs on **estimated** result dates (period-cadence inference, no official calendar); refresh isn't exposed over HTTP (pipeline-only). Run #36 (official NSE board-meeting/result dates) to make it honest, or label every date as estimated. Currently implies precision it lacks. |
| **Smart Money** | Both | **Reframe / rename** | Insider & institutional ownership are hardcoded `MISSING` placeholders; it's purely price-volume accumulation/distribution. Name implies FII/insider data it doesn't have. Rename (e.g. "Accumulation/Distribution") or clearly flag the ownership gap. |
| **Benchmark / alpha-vs-beta (#41)** | Admin | **Get a real Nifty history** | Backtests + track record fall back to **equal-weight** (NSE Nifty history Akamai-blocked). Every "edge" shown is beta until fixed. #1 *credibility* fix — gates the honesty of the whole intelligence claim. |
| **Signal Quality Lab outcomes** | Admin | **Persist by default** | Outcomes on-demand by default → O(signal-count) price fetches per load + inconsistent reads. Make persisted the default. |
| **Portfolio health 25% signal-weight** | User | **Reframe** (#37) | Weighting portfolio health 25% on a score that is explicitly *research-worthiness, not a forecast* is internally inconsistent. Long-open reframe. |
| **Copilot + Notifications** | User | **Surface in nav or cut** | Both fully built, both invisible. Undiscoverable = wasted build. Decide in-or-out. |

---

## ③ New features needed (gaps vs the 5 trader jobs)

| Gap | Angle | Job it serves | Note |
|---|---|---|---|
| **Trade Journal FRONTEND** | User | "What did I decide & how did it go?" (human/validation loop) | **Backend is 100% done; there is no UI.** Cheapest high-value build in the app, and the literal point of the 12-month personal-validation phase. Top of the list. |
| **User-facing Track-Record Scorecard** | User | "Can I trust it?" | Promote Quality-Lab data into a trader surface. Trust backbone. |
| **Capital Posture panel** | User | "Should I go to cash?" | Chip exists; the *decision surface* (regime → suggested exposure, in Today Review/Portfolio) is only partial (#35b). |
| **One consolidated daily home** | User | "Should I trade now?" | Resolve the dashboard/shortlist/today-review three-way overlap into a single command-center landing built around the 5 jobs. Likely home for the orphaned `daily-overview-dashboard`. |
| **First-class Short surface** | User | "What to watch short" | Pipeline was revived but shorts stay regime-gated/anti-predictive; needs an honest, regime-aware short surface, not a mirror of longs. |
| **Official earnings calendar dataset (#36)** | Admin | feeds Earnings Intelligence honesty | Net-new operator data feed; unblocks the earnings reframe above. |

---

## ④ Recommended priority (PO call — not yet approved)

1. **Trade Journal UI** — backend done, serves the core thesis, cheap. *(net-new, user)*
2. **#41 real Nifty history** — until this lands every edge claim is beta. *(change, admin)*
3. **Surface the track-record scorecard to the user** — trust backbone out of the admin basement. *(change, user)*
4. **Rule on calibration** — wire it or kill it; stop paying for dead compute. *(decision, admin)*
5. **Cut billing + the 3 stub radars from the surface** — remove off-thesis weight and dead links. *(cut)*
6. **Collapse the daily-home overlap** (dashboard/shortlist/today-review) into one. *(cut+new, user)*

---

## ⑤ Owner-only domain rulings required

These cannot be decided from the code or charter alone:

1. **Calibration verdict** — is the served signal score **raw** or **calibrated**? (Determines wire-vs-retire.)
2. **Billing's fate this phase** — park/hide now, or keep maintaining the gating apparatus?

---

## ⑥ Appendix — per-module wired/dead status (evidence summary)

**User-facing**
- **market-intelligence** — wired (Market Pulse, Shortlist, Stock Interest). Stubs: Compounder/Trader-Setup/Risk radars ("backend not available yet"). Sector intel duplicated with Market Context.
- **today-trade-review** — fully wired; authoritative daily run, board selection, candidate drill-down.
- **daily-overview-dashboard** — component complete + wired, but **not mounted in routes** (unreachable). Duplicates today-review/market-context/movers.
- **research-hub** — wired; snapshot-first persisted reads; clean integration with trade-plan.
- **stock-research-workbench** — wired; embedded as "Research" tab of the unified stock page.
- **portfolio-management** — fully wired (CRUD + valuation, persisted).
- **portfolio-intelligence** — wired; calc-only panel on top of portfolio-management (no own persistence). Clean layering.
- **watchlist-management** — fully wired; distinct from alerts.
- **alerts-monitoring** — wired; manual evaluation (no scheduler). Placeholder "Planned Radar Alert States" section.
- **ai-investment-copilot** — wired, deterministic (not LLM); lazily wired to strategy-decision/trade-plan/today-review. Route `/copilot` **not in nav**. Usage cap bypassed via env in validation phase.
- **notifications-delivery** — wired; log-only email, no scheduler, quiet-hours stored-but-not-enforced, SMTP unimplemented. Route `/notifications` **not in nav**.
- **auth-identity** — fully wired; scrypt hashing, rate-limited login/signup, auto-FREE subscription. No reset/verification/revocation (acceptable for phase).
- **Earnings Intelligence** (user page owned by market-intelligence; backend module `earnings-intelligence`) — read path wired; result dates **estimated** (no official calendar); refresh **not exposed over HTTP** (pipeline-only); no dedicated feature folder.
- **smart-money-intelligence** — wired price-volume scoring; insider/institutional ownership are `MISSING` placeholders. Both user (`/smart-money`) and admin (`/admin/smart-money`).

**Admin/operator-facing**
- **market-data-foundation** — fully wired; 70+ endpoints; NSE/BSE-only enforced (legacy providers return `EXTERNAL_PROVIDER_DISABLED_NSE_BSE_ONLY`). Dual health contracts (Full Catalog vs Trusted Review).
- **data-quality-engine** — fully wired; DB-only reads; per-module eligibility gates.
- **signal-generation-engine** — fully wired; raw `score` authoritative; `calibratedScore` optional overlay.
- **signal-quality-lab** — wired; outcomes **on-demand by default** (persist optional). Houses the (admin-only) track record.
- **signal-calibration-engine** — wired as measurement/transparency tool but **not applied to served scores**.
- **signal-position-ledger** ("Trigger Monitor") — wired; persisted-read, manual refresh; lifecycle ACTIVE→…→CLOSED.
- **strategy-framework** — wired; 10 active + 2 draft strategies; single source of strategy definitions.
- **strategy-decision-engine** — wired; consumes framework; feeds research-hub/trade-plan. Primarily operator surface.
- **trade-plan-risk-engine** — wired; admin-only; generation on POST (persisted reads on GET). Classification only (no paper/live trades).
- **backtesting-strategy-lab** — wired; daily-close simulator; ALL-universe capped to 50; benchmark equal-weight fallback (see #41).
- **pipeline-orchestration / pipeline-ops** — wired; durable run/stage ledger + bounded manual commands; read-only status API.
- **historical-context-snapshots** — wired; persists regime/sector/country/smart-money/DQ context; manual generation (no scheduler).
- **market-context-intelligence** — wired; regime/breadth/sector/capital-posture; surfaced to users via AppBar chip.
- **subscription-billing** — wired but **unenforced** (env-disabled); admin-only nav; no Stripe/revenue path. Premature for phase.

**Backend-only (no frontend)**
- **trade-journal** — backend fully wired + persisted; **no UI** (see §3, top priority).

---

*End of report. No executions performed. Awaiting owner approval before any cut/change/build.*
