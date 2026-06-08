# Feature Audit v2 (delta) — 2026-06-06

**Author:** PO review (read-only audit; no code changed)
**Companion to:** `docs/feature-audit-2026-06.md` (v1, 2026-06-05). This is a **second, deeper pass** framed as a *delta* — it leads with corrections to v1, then reports NEW / CHANGED / CONFIRMED-with-new-evidence findings. Where v1 and v2 disagree, **v2 wins** (it was code-verified; v1 leaned on module docs).
**Method:** 4 parallel read-only explorers on different axes than v1 — dataset ground-truth, dead-code/dead-endpoint sweep, user-journey/redundancy, cross-cutting correctness. Three load-bearing contradictions were re-verified by hand (citations below).

> **Status: PROPOSAL ONLY.** Nothing executed. No cut/change/build without owner approval.

---

## ⚠️ 0. Corrections to v1 (hand-verified)

The codebase moved between 2026-06-05 and 2026-06-06; three v1 statements are now wrong or stale.

1. **Calibration is NOT dead compute.** — *corrects v1 §2 & §5.*
   The strategy evaluator consumes it: `signalScore()` returns `calibratedSignal?.calibratedScore ?? rawSignal?.score` (`backend/src/modules/strategy-framework/strategy-framework.evaluator.ts:552`); direction likewise (:556). Calibration drives strategy-decision, research-hub, and the workbench.
   **The real, narrower issue:** it's applied in the *decision layer* but the raw signal **lists/cards** (`signals/top`, screener) still display the *raw* score, so the same stock can show different numbers on different surfaces.
   **Reframed owner ruling:** not "wire it or kill it" → **"make the surfaced number consistent: is what the user sees raw or calibrated?"**

2. **`daily-overview-dashboard` is no longer orphaned.** — *corrects v1 §1.*
   Now routed (`frontend/src/app/routes.tsx:97`) and in nav (`frontend/src/app/navigationMetadata.tsx:38`, "Daily Overview"). It is now a **third competing "today" surface** (with Market Pulse + Daily Review) — a redundancy issue, not an orphan.

3. **Copilot + Notifications are now in nav.** — *corrects v1 §2.*
   `navigationMetadata.tsx:46–47`. v1's "undiscoverable" is stale. **New problem:** Alerts (`:45`) and Notifications (`:46`) share the same `NotificationsNoneIcon` — visual collision.

---

## ① Useless / cut-or-defer — new evidence

| Finding | Angle | Evidence |
|---|---|---|
| **Dead billing endpoints** (reinforces "park billing") | Admin | `/subscription/usage`, `/subscription/provider`, `PATCH /subscription/users/:userId/plan` and client fn `fetchSubscriptionFeatures()` are defined but called by nothing (`subscription-billing.router.ts:14–17`; `subscriptionBillingService.ts:16-19`). Billing is not just premature — parts are already dead code. |
| **`/alerts/summary` dead** | User | Route exists (`alerts-monitoring.router.ts:21`); no frontend wrapper calls it. |
| **Nav overcrowding** | User | 13 items in one flat "Trader Workflow" group; **three "today" entry points** (Market Pulse / Daily Review / Daily Overview); Alerts+Notifications icon collision; no grouping by job. |
| **Dead `refresh()` method** | Admin | `market-context-intelligence.controller.ts:140` — unrouted, harmless, incomplete cleanup. |

---

## ② Features that need changes — new / sharper

| Finding | Angle | Evidence |
|---|---|---|
| **Short side is structurally invisible in the UI** (top user-facing issue) | User | Shorts exist in data (`shortReview` group) but are **merged into the "Exit Risk / Short Review" tab** (`TodayReviewPage.tsx:54,1173`) — user can't separate "exit my long" from "open a short." No short watchlist (`AddToWatchlistDialog` has no direction field), no short radar (Stock Interest Radar is long-only). |
| **Score visibility is split** | User | User sees trade-plan entry/exit zones but **not the signal conviction/calibration behind them**; the stock page's Signals/Quality/Calibration tabs just redirect to admin. Sharper now that calibration *is* used by decisions. |
| **Smart Money ownership = hard placeholder** | User | `smart-money-intelligence.provider.ts:4-15` returns all-null `ownershipDataStatus:'MISSING'`. Confirms the rename call. |
| **Earnings estimated dates not flagged on the user calendar** | User | 4-tier fallback chain (`earnings-intelligence.service.ts:614-667`); provenance warnings exist only in the admin summary — the trader sees dates with no "ESTIMATED" badge. |
| **Quality-Lab live-compute** | Admin | ~24s on a 20k-signal corpus when outcomes aren't persisted — persist by default (`signal-quality-lab.service.ts:100-117`). |

---

## ③ New features — additions to v1 §3

| Gap | Angle | Evidence |
|---|---|---|
| **A first-class Short surface** (now with UI proof, not just backend) | User | No discoverable page/watchlist/radar for "what do I short today." |
| **LTCG/STCG tax-status view + `acquisitionDate` field** | User | Zero tax/holding-period logic in portfolio (grep `tax/LTCG/STCG` → nothing); India's 12-month threshold is unaddressable today. Post-validation, but a real domain gap. |
| **Watchlist "what changed" parity** | User | Portfolio has `/portfolios/:id/changes`; watchlist has no equivalent endpoint/method. |
| **Position-sizing reconciliation** | User | Copilot *mentions* sizing caution (`ai-investment-copilot.service.ts:326`); no view computes recommended size vs actual weight from entry/stop geometry. |

---

## ④ Admin vs user datasets — new ground-truth

- **Good news (new):** **FII/DII is a real, live-ingested dataset** — `fii-dii.service.ts:49` hits the NSE public endpoint and persists to `fii_dii_snapshots` (upsert on `(trading_date, category)`). Not a stub.
- **Admin datasets that should be user-facing:** track record (Signal Quality Lab, admin-only) and calibration status — still admin-only; the stock page's Quality/Calibration tabs punt to admin.
- **User surfaces backed by thin data:** Smart Money ownership (placeholder), Earnings dates (estimated). The UI implies more than the data delivers.

### Dataset population status (verified from code, no DB queries)
| Dataset | Module | Status |
|---|---|---|
| Smart Money insider/institutional ownership | smart-money-intelligence | 🔴 EMPTY placeholder (`provider.ts:4-15`) |
| Signal Quality outcomes | signal-quality-lab | 🟡 on-demand default (slow), opt-in persist |
| Earnings official result dates | earnings-intelligence | 🟡 partial + 4-tier fallback (`service.ts:614-667`) |
| Nifty 50 benchmark | backtesting-strategy-lab | 🟡 real when ingested, equal-weight fallback (`service.ts:1629-1679`) |
| Delivery % (NSE) | market-data-foundation | 🟡 real but sparse |
| Fundamentals (NSE XBRL) | market-data-foundation | 🟡 real but ~30-50% coverage (rest unfetchable) |
| FII/DII macro flow | market-context-intelligence | 🟢 real, daily ingest |
| Market Pulse snapshots | market-intelligence | 🟢 real, scheduled |
| Historical context snapshots | historical-context-snapshots | 🟢 real, scheduled, gaps marked MISSING |
| Calibration (applied) | strategy-framework + signal-calibration | 🟢 real, consumed by evaluator (`evaluator.ts:552`) |
| Trade Plans | trade-plan-risk-engine | 🟢 real (no user UI to author) |
| Trade Journal | trade-journal | 🟡 real backend, no UI |

---

## ✅ Clean bill (the trust posture holds)

Dedicated correctness sweep found, with file:line evidence:
- **No persisted-read violations** — all generation/refresh/evaluate is on POST (signals, alerts, data-quality, context-snapshots, strategy, calibration, today-review, smart-money).
- **No scope (region/assetType) leakage** — reads propagate scope; no cross-scope fallback.
- **No research-support language violations** — every copilot summary carries `'For research support only, not financial advice.'` (`ai-investment-copilot.service.ts:303,365,400,431,465`); UI copy clean.
- **No NSE/BSE-only violations** — legacy providers return `EXTERNAL_PROVIDER_DISABLED_NSE_BSE_ONLY`; no active yfinance/Yahoo/Angel/broker imports.
- **DB discipline intact** — single shared `new PrismaClient()` at `backend/src/db/prisma.ts:6`; no rogue clients.

---

## Net read vs v1

The headline shifts: **the short-side UX gap and the raw-vs-calibrated score-surfacing inconsistency are now the sharpest user-facing issues — bigger than billing.** Billing is *also* partly dead code now (extra reason to park it). The v1 "kill calibration?" framing was wrong — what needs a ruling is **the consistency of the number the user sees**, not the engine's existence.

### Owner-only rulings (updated)
1. **Surfaced signal score: raw or calibrated?** (replaces v1's wire-vs-retire question.)
2. **Billing's fate this phase** — park/hide (now with dead-code evidence) vs keep maintaining.

---

*End of v2 delta report. No executions performed. Awaiting owner direction.*
