# Frontend Trader-Personal Screens — Re-Audit (2026-06-16)

Audit method: source-code inspection + direct API probing with a test-user JWT (test@example.com, planCode=ADMIN). Computer-use / Chrome MCP unavailable in this session (timeout / no extension). All findings are derived from component source and live API responses; no state was mutated.

---

## 1. Portfolio Management (`/portfolios`, `/portfolios/:id`)

**Purpose:** Manual portfolio tracker — holdings, valuation (mark-to-market), allocation breakdown, intelligence overlay, and transaction log.

**UI elements:**
- Top bar: Select-portfolio autocomplete + Create-New inline form (name / currency / description / Create button).
- When a portfolio is selected: five tabs — Overview, Holdings, Allocation, Intelligence, Transactions.
- Overview tab: Capital-Posture banner (live from `/api/v1/market-context/capital-posture?region=...`), then 4 summary cards (Total Value / Unrealized P&L / Daily Change / Holdings count).
- Holdings tab: read-only table (Symbol → research link, Company, Qty, Avg Cost, Current, Value, Unrealized P&L %, Signal badge) + Add Holding / Edit Holding inline form (instrument search-select, qty, avg cost, currency, notes).
- Allocation tab: Top Holdings / Sectors / Countries bar lists.
- Intelligence tab: delegates to `PortfolioIntelligencePanel`.
- Transactions tab: Add Transaction form (type, instrument, qty, price, amount, date, currency, notes) + transaction list table.
- Delete portfolio: outlined error button → MUI Dialog with cancel/confirm (confirmation gate IS present).

**API calls (method + path):**
- `GET /api/v1/portfolios` — list
- `GET /api/v1/portfolios/:id/summary`
- `GET /api/v1/portfolios/:id/allocation`
- `GET /api/v1/portfolios/:id/transactions`
- `GET /api/v1/market-context/capital-posture?region=...` — live; fetched when Overview tab is active and a portfolio is selected
- `POST /api/v1/portfolios` — create
- `POST /api/v1/portfolios/:id/holdings` — add
- `PATCH /api/v1/portfolios/:id/holdings/:hid` — update
- `DELETE /api/v1/portfolios/:id/holdings/:hid` — remove
- `POST /api/v1/portfolios/:id/transactions` — add
- `DELETE /api/v1/portfolios/:id` — delete

**Data notes:**
- Test user has **zero portfolios** → page shows "Select or create a portfolio" state correctly.
- No holdings → "No holdings yet. Add your first holding…" with CTA button to switch to Holdings tab — clean zero-state.
- No transactions → "No transactions recorded yet." — correct zero-state.
- Capital Posture uses a live fetch (not persisted-read) on every Overview tab activation. This may conflict with the persisted-read convention for trader-facing pages; flagged but left as out-of-scope.
- Scope chip (IN/US/etc.) shown in header badges; allocation currency adapts to `selectedPortfolio.baseCurrency`.

**Gaps / Issues:**
- ISSUE (unchanged from prior audit): The Capital Posture section does a live GET on page-load sub-event (Overview tab activation), violating the persisted-read trader-facing pattern.
- No pagination on the Holdings or Transactions table — could become unwieldy with many records, but no functional break today.
- `GET /api/v1/portfolios/:id/changes` endpoint exists in router but is not used by the FE; dead surface.

---

## 2. Watchlist Management (`/watchlists`, `/watchlists/:id`)

**Purpose:** Track stocks of interest before they become holdings; annotate with notes and tags; view price + signal overlay.

**UI elements:**
- Select-watchlist autocomplete + Create-New inline form (name / description / Create button).
- When a watchlist is selected: instrument-search-select + sort dropdown (Recently Added / Signal Score / Daily Change High / Daily Change Low / Symbol) + Add Stock button.
- DataTable: Symbol (→ research link), Company, Sector, Country, Price, Daily % change (color-coded), Signal (badge + confidence chip + date), Notes/Tags inline editable fields, Actions (Save notes/tags, Set Price Alert dialog, Remove).
- "Set Price Alert" opens `CreateAlertDialog` pre-filled with `scope=STOCK, type=PRICE_ABOVE, instrumentId`.
- Delete watchlist: error outlined button → confirmation dialog (gate IS present).
- Snackbar for silent errors.

**API calls:**
- `GET /api/v1/watchlists` — list
- `GET /api/v1/watchlists/:id?sort=...` — detail with items
- `POST /api/v1/watchlists` — create
- `POST /api/v1/watchlists/:id/items` — add stock
- `PATCH /api/v1/watchlists/:id/items/:iid` — update notes/tags
- `DELETE /api/v1/watchlists/:id/items/:iid` — remove stock
- `DELETE /api/v1/watchlists/:id` — delete watchlist

**Data notes:**
- Test user has 2 watchlists: **IN** (27 stocks, all with prices, none with signals — `latestSignal: null` for every item) and **US** (14 stocks, mix of BULLISH/NEUTRAL signals scored 43–74 from 2026-06-05).
- IN watchlist: no signals baked — signal generation pipeline may not be running for IN instruments or snapshots are stale.
- US watchlist: signals present, prices current as of latest EOD run.
- Client-side pagination (slice of detail.items), page defaults to 25.

**Gaps / Issues:**
- ISSUE: IN watchlist has 27 stocks but every `latestSignal` is null. Needs investigation whether IN signal pipeline is running.
- Sort options send `sort` query param to backend — server-side sort.
- No bulk-remove or bulk-select on watchlist items table.

---

## 3. Alerts Monitoring (`/alerts`)

**Purpose:** Personal alert rules (conditions on stocks/portfolios/watchlists) and an alert inbox showing triggered events.

**UI elements:**
- Page header with "Create Alert" button (opens `CreateAlertDialog`).
- Alert Inbox panel: All / Unread toggle-button-group; "Evaluate Now" button (triggers backend evaluation); "Mark All Read" button. Each event card: severity chip, title, message, timestamp, Open Context link, Mark Read (if unread), Dismiss icon.
- Alert Rules panel: list of rules with name, type, scope, threshold; Enabled/Disabled chip; Enable/Disable toggle icon; Delete icon.

**API calls:**
- `GET /api/v1/alerts/rules` — list rules
- `GET /api/v1/alerts/events` — list events
- `GET /api/v1/alerts/summary` — unread/critical counts
- `POST /api/v1/alerts/rules` — create
- `PATCH /api/v1/alerts/rules/:id` — update (enable/disable)
- `DELETE /api/v1/alerts/rules/:id` — delete
- `POST /api/v1/alerts/evaluate` — manual evaluation
- `PATCH /api/v1/alerts/events/:id/read` — mark read
- `PATCH /api/v1/alerts/events/:id/dismiss` — dismiss
- `POST /api/v1/alerts/events/mark-all-read` — bulk read

**Data notes:**
- `alert_rules`: 0 rows. Zero-state: "No alert rules yet." — correct.
- `alert_events`: 0 rows. Zero-state: "No alert events yet. Create rules and check alerts when you want a local review." — correct.
- Summary: `{ unreadCount: 0, criticalCount: 0 }`.

**Gaps / Issues:**
- Zero-states render correctly. No functional issues observed.
- No pagination on inbox or rules panel — acceptable for a personal tool.

---

## 4. AI Investment Copilot (`/copilot`)

**Purpose:** Deterministic, text-based research summaries generated from existing backend modules. Five tabs: Market Brief, Stock Summary, Portfolio Summary, Watchlist Summary, Alert Digest.

**UI elements:**
- Five-tab navigation (scrollable, auto scroll buttons).
- Left panel: ActionCard (Market Brief / Alert Digest — single "Load Brief" button) or RequestCard (Stock / Portfolio / Watchlist — selector + "Summarize" button, disabled until selection made).
- Right panel: SummaryPanel — title, generated-at, data-status chip, prominent `Alert severity="info"` disclaimer ("Research support only; never an instruction."), summary text, source-modules chips, 4 list sections (Key Takeaways, Suggested Next Reviews, Bullish Factors, Bearish/Risk Factors), Data Gaps section.

**API calls:**
- `GET /api/v1/copilot/market-brief`
- `GET /api/v1/copilot/alert-digest`
- `POST /api/v1/copilot/stock-summary` (body: `{ instrumentId }`)
- `POST /api/v1/copilot/portfolio-summary` (body: `{ portfolioId }`)
- `POST /api/v1/copilot/watchlist-summary` (body: `{ watchlistId }`)
- `GET /api/v1/portfolios` — fetched on mount to populate portfolio picker
- `GET /api/v1/watchlists` — fetched on mount to populate watchlist picker

**Data notes (live API sample — Market Brief):**
- Returns real content: regime NEUTRAL, 3 keyTakeaways, bullishFactors (Technology/Utilities/Industrials), bearishFactors (IT/Consumer Defensive/Real Estate), riskFactors (macro data missing), dataStatus PARTIAL, generated real-time.
- Alert Digest returns real content summarising the 0-event state correctly.

**Re-audit focus — prior findings:**

| Prior finding | Current state |
|---|---|
| Does it produce real output? | RESOLVED — Market Brief and Alert Digest return real structured output from backend. |
| Research-support disclaimer present? | RESOLVED — `Alert severity="info"` "Research support only; never an instruction." renders in SummaryPanel. Subtitle also carries research-support wording. |
| Tab switch fails to clear prior panel? | STILL PRESENT — `activeSummary` state is held in the hook and is NOT reset when `activeTab` changes. Switching from Market Brief to Stock Summary leaves the Market Brief result visible until a new summary is explicitly requested. |

**Gaps / Issues:**
- ISSUE (persists): Tab switch does not clear `activeSummary`. User can mistake a prior-tab result for the current-tab context.
- Copilot does live GETs on button press, not persisted snapshots — consistent with an on-demand tool but worth noting.
- No per-tab result history or "last loaded" timestamp per tab.

---

## 5. Notifications (redirects `/notifications` → `/account`)

The `notifications-delivery` route is a React Router `<Navigate to="/account" replace />`. The standalone `/notifications` path no longer exists as a dedicated route — all notification preferences now live inside the Account page (`/account`).

**AccountPage (`/account`) — Notifications section:**
- Four `FormControlLabel + Switch` toggles: Enable email notifications, Alert email digests, Daily digest, Weekly digest.
- Quiet-hours TextFields with labels "Quiet hours start" / "Quiet hours end" and placeholder "22:00" / "07:00".
- Toggles and TextFields auto-save immediately on change via `patchPreference(...)` — no explicit Save button needed.
- Provider Status paper: provider name, SMTP configured/active chips, info alert.
- Manual Sends: Send Test Email, Send Alert Digest, Send Daily Digest, Send Weekly Digest buttons.

**API calls (notifications section):**
- `GET /api/v1/notifications/preferences`
- `PATCH /api/v1/notifications/preferences`
- `GET /api/v1/notifications/events`
- `GET /api/v1/notifications/provider-status`
- `POST /api/v1/notifications/test-email`
- `POST /api/v1/notifications/send-alert-digest`
- `POST /api/v1/notifications/send-daily-digest`
- `POST /api/v1/notifications/send-weekly-digest`

**Data notes:**
- Test user preferences: all booleans false, quietHoursStart/End null.
- Provider status: `{ activeChannel: "EMAIL_LOG", providerName: "log-email-provider", smtpConfigured: false, smtpAvailable: false }`.
- Delivery events: 0 records. Zero-state: "No notification delivery records yet." — correct.

**Re-audit focus — prior findings:**

| Prior finding | Current state |
|---|---|
| Quiet-hours inputs missing labels? | RESOLVED — both TextFields have explicit MUI `label` props. |
| No visible Save button? | RESOLVED / by-design — auto-save on change via `patchPreference`. Consistent UX. |

**Gaps / Issues:**
- MINOR: Quiet-hours TextFields fire a PATCH on every keystroke (no debounce) — typing "22:00" sends 5 requests.
- `/notifications` redirect to `/account` is silent with no scroll-to-notifications anchor. Users following old bookmarks land at the top of the account page with no visual cue.
- `NotificationsDeliveryPage.tsx` component still exists but is unreachable via routing — dead component (same functionality duplicated in AccountPage).

---

## 6. Subscription & Billing (`/billing`)

**Purpose:** Plan management, feature usage metering, and billing provider status.

**UI elements:**
- Header: title + current-plan chip (color: secondary for ADMIN, primary for PRO, default for FREE).
- Left column: "My Plan" card (plan name, status, account email) + "Available Plans" card listing all plans.
- Right column: "Feature Limits" grid + info Alert.
- PlanCard per plan: name, "Active plan option" / "Inactive" caption, action button.
  - Button label: "Current" if already on that plan (outlined, disabled), "Select" for PRO, "Downgrade" for FREE.
  - Button fires `changePlan(plan.code)` directly on click — **NO confirmation dialog**.
- FeatureUsage per feature: label, used/limit text, LinearProgress bar (hidden when limit=null), status chip.

**API calls:**
- `GET /api/v1/subscription/me` — current subscription + features
- `GET /api/v1/subscription/plans` — all plans
- `POST /api/v1/subscription/change-plan` — change plan (no confirmation in UI)

**Data notes:**
- Test user: planCode=ADMIN, status=ACTIVE, startedAt 2026-06-15.
- Plans: Admin, Free, Pro — all active.
- Features (all limits null = unlimited on ADMIN): Portfolios used 0, Watchlists used 0, Alerts used 0, Backtest runs this month used **25** (limit null → "Unlimited"), Copilot summaries today used **1** (limit null → "Unlimited").

**Re-audit focus — prior findings:**

| Prior finding | Current state |
|---|---|
| Current plan shown correctly? | RESOLVED — planCode=ADMIN, Chip label "Admin", color "secondary". Correctly reflects DB state. |
| Single-click plan change with NO confirmation? | STILL PRESENT — `onSelect={() => void changePlan(plan.code)}` has no confirmation dialog. One click on "Select" or "Downgrade" immediately fires `POST /api/v1/subscription/change-plan`. This caused the prior accidental plan change. |
| Dev/implementation commentary as user copy? | STILL PRESENT — `Alert severity="info"` on Feature Limits reads: "Upgrade prompts are returned by backend gating errors when a limit is reached. Future UI flows can show those as modals near the blocked action." This is developer commentary, not user-facing copy. |
| Over-limit usage (25/5 backtests) shown? | CHANGED — on ADMIN plan all limits are null (unlimited). Feature row shows "25 / Unlimited" with an "Unlimited" chip, no warning rendered. The prior "25/5" was when the test user was on a limited plan. |

**Gaps / Issues:**
- ISSUE (persists): Plan change fires immediately on button click with no confirmation gate.
- ISSUE (persists): Developer commentary rendered as user-facing Alert.
- MINOR: PlanCard shows no feature summary or pricing info — user cannot compare plans before switching.

---

## 7. Radar Screens (Re-audit)

Three routes registered in `frontend/src/features/market-intelligence/routes.tsx`:

| Route | Status |
|---|---|
| `/compounder-radar` | **STILL STUB** — `fetchCompounderRadarSnapshot` returns `unavailable(scope, 'Compounder Radar backend not available yet.')`. Page renders "Compounder Radar data not available yet." with suggestion link to `/stock-interest-radar`. |
| `/trader-setup-radar` | **STILL STUB** — same pattern. "Trader Setup Radar data not available yet." |
| `/risk-radar` | **STILL STUB** — same pattern. "Risk Radar data not available yet." |

All three have proper "Not Applicable for Asset Class" fallbacks for crypto/non-fundamentals scope, but the underlying snapshot fetch functions short-circuit to `unavailable(...)` before any API call is made. No backend endpoints exist for these radars.

---

## Summary Table — Re-audit Focus Items

| Issue | Prior state | Current state (2026-06-16) |
|---|---|---|
| Billing: current plan shown correctly | Incorrect (mis-set) | RESOLVED — ADMIN plan correctly shown |
| Billing: single-click plan change, no confirmation | Present | STILL PRESENT |
| Billing: developer commentary as user copy | Present | STILL PRESENT |
| Billing: over-limit usage display (25/5 backtests) | Present | CHANGED — now ADMIN (unlimited), shows "25 / Unlimited" |
| Copilot: real output produced | Failing / empty | RESOLVED — Market Brief and Alert Digest return real data |
| Copilot: research-support disclaimer | Missing | RESOLVED — inline Alert + subtitle both present |
| Copilot: tab switch fails to clear prior panel | Present | STILL PRESENT |
| Notifications: quiet-hours inputs missing labels | Present | RESOLVED — labels added |
| Notifications: no visible Save button | Present | RESOLVED / by-design — auto-save on change |
| Radar screens: still stubs | All 3 stubs | STILL STUBS — all 3 |

---

## Distinct API Paths Observed (this wave)

```
GET  /api/v1/auth/me
GET  /api/v1/portfolios
GET  /api/v1/portfolios/:id/summary
GET  /api/v1/portfolios/:id/allocation
GET  /api/v1/portfolios/:id/transactions
GET  /api/v1/market-context/capital-posture?region=...
GET  /api/v1/watchlists
GET  /api/v1/watchlists/:id?sort=...
GET  /api/v1/alerts/rules
GET  /api/v1/alerts/events
GET  /api/v1/alerts/summary
GET  /api/v1/copilot/market-brief
GET  /api/v1/copilot/alert-digest
GET  /api/v1/subscription/me
GET  /api/v1/subscription/plans
GET  /api/v1/subscription/usage
GET  /api/v1/subscription/features
GET  /api/v1/notifications/preferences
GET  /api/v1/notifications/events
GET  /api/v1/notifications/provider-status
```
