# Frontend Recon — Trader Personal / Account Screens

**Wave:** Trader Personal  
**Date:** 2026-06-15  
**Server:** http://localhost:5173 (shared dev instance)  
**Auth:** test@example.com / TestUser123!

---

## 1. Portfolios (`/portfolios`)

**Purpose:** Create and browse manual portfolios; view holdings, valuation, allocation, and transactions.

**UI Elements:**
- Page header: "Portfolios" with "Scope: IN" label and subtitle "Manual portfolios, holdings, valuation, allocation, and transaction tracking."
- **Left panel — Select Portfolio:** Autocomplete/combobox "Search portfolios..." with an Open button. For the test user the dropdown is empty (no existing portfolios).
- **Left panel — Create New form:** Name (text), Currency (text, defaults to "INR"), Description (text), and "Create" button. No validation hints visible in empty state; the Create button is always present regardless of form fill.
- **Right panel (default):** Empty state — heading "Select a portfolio" + instruction "Choose or create a portfolio to view holdings, valuation, allocation, and transactions." No portfolio detail tabs are rendered until one is selected.

**API Calls (on page load):**
- `GET /api/v1/portfolios?region=IN&assetType=STOCK` → 200 (returns empty array for test user)
- `GET /api/v1/alerts/events?region=IN&assetType=STOCK` → 200 (header alert badge)
- `GET /api/v1/market-context/capital-posture?region=IN&assetType=STOCK` → 200 (header posture chip)

**Data Notes:**
- Portfolio list is empty for test user; no holdings/transaction data exists.
- The `portfolio_transactions` table is known-empty in the DB — the UI gracefully shows the empty-state panel.

**Gaps / Issues:**
- The Create form has no visible required-field markers or inline validation before submit.
- No "No portfolios yet" empty state is shown inside the search combobox — it just shows nothing when opened.
- No `DELETE` or rename portfolio controls observed from this view.

---

## 2. Watchlists (`/watchlists`)

**Purpose:** Track candidate stocks before they become portfolio holdings.

**UI Elements:**
- Page header: "Watchlists" with "Scope: IN" label and subtitle "Track stocks you are interested in before they become portfolio holdings."
- **Left panel — Select Watchlist:** Autocomplete/combobox "Search watchlists..." with Open button. Empty for test user.
- **Left panel — Create New form:** Name (required, text) and Description (text, no currency field — contrast with Portfolios). "Create" button.
- **Right panel (default):** Empty state — "Select a watchlist" / "Choose or create a watchlist to view tracked stocks."

**API Calls (on page load):**
- `GET /api/v1/watchlists?region=IN&assetType=STOCK` → 200 (empty array)
- `GET /api/v1/alerts/events?region=IN&assetType=STOCK` → 200
- `GET /api/v1/market-context/capital-posture?region=IN&assetType=STOCK` → 200

**Data Notes:**
- Watchlist list is empty for test user; structure mirrors Portfolios page layout.

**Gaps / Issues:**
- Same as Portfolios: no required-field markers on the Create form; combobox empty-state is silent.
- Watchlist detail tabs (e.g., stock list, signals) not visible since no watchlist selected.

---

## 3. Alerts (`/alerts`)

**Purpose:** Manage personal alert rules and view the alert event inbox.

**UI Elements:**
- Page header: "Alerts" with "Scope: IN" label and subtitle "Personal alert rules and alert inbox for stocks, triggers, portfolios, and watchlists."
- **"Create Alert" button** (top right of content area) → opens "Create Alert Rule" modal dialog.
- **Alert Inbox section:**
  - Toggle group: "All" / "Unread" filter buttons.
  - "Evaluate Now" button (tooltip: "Run alert rules now and check for new events").
  - "Mark All Read" button.
  - Empty state: "No alert events yet. Create rules and check alerts when you want a local review."
- **Alert Rules section:** Empty state — "No alert rules yet."

**Create Alert Rule Dialog** (fields from source code):
- Name (text)
- Scope (select): Stock | Portfolio | Watchlist
- Type (select, 11 options): Price Above, Price Below, Daily Move Above, Daily Move Below, Signal Score Above, Signal Direction Changed, Portfolio Holding Drawdown, Portfolio Bearish Signal, Watchlist Signal Score Above, Watchlist Price Above, Watchlist Price Below
- Conditional fields by scope:
  - STOCK: InstrumentSearchSelect autocomplete
  - PORTFOLIO: Autocomplete from user's portfolios list
  - WATCHLIST: Autocomplete from user's watchlists list
- Threshold (number): hidden when Type = SIGNAL_DIRECTION_CHANGED (threshold-free)
- Cancel / Create buttons

**API Calls (on page load):**
- `GET /api/v1/alerts/rules?region=IN&assetType=STOCK` → 200 (empty)
- `GET /api/v1/alerts/events?region=IN&assetType=STOCK` → 200 (empty)

**Data Notes:**
- Both `alert_rules` and `alert_events` tables are empty for test user — confirmed by API 200 + empty state copy.
- Evaluate Now would trigger `POST /api/v1/alerts/evaluate` (not triggered during recon).

**Gaps / Issues:**
- The "Create Alert" button at the page level did not respond to a CSS-selector click; required a direct JS `.click()` on the button element — possible event-propagation quirk.
- No pagination or date-range filter on the Alert Inbox.
- No "Dismiss" or "Delete" action visible on alert events (not observable since inbox is empty, but the `dismissedAt` field exists in the type).

---

## 4. AI Investment Copilot (`/copilot`)

**Purpose:** On-demand deterministic research summaries assembled from existing intelligence modules. No external LLM.

**UI Elements:**
- Page heading: "AI Investment Copilot"
- Subtitle: "Deterministic research summaries from your existing modules. Research support only, never an instruction." (correct research-support language — no advice wording)
- **5 tabs:**
  1. **Market Brief** — "Load Brief" button; no input needed. Inline disclaimer alert: "Research support only; never an instruction."
  2. **Stock Summary** — Instrument search autocomplete + "Summarize" button.
  3. **Portfolio Summary** — Portfolio autocomplete + "Summarize" button.
  4. **Watchlist Summary** — Watchlist autocomplete + "Summarize" button.
  5. **Alert Digest** — "Load Brief" button; no input needed.

**Output observed — Market Brief (loaded):**
- Status badge: PARTIAL
- Timestamp: "Generated 6/15/2026, 5:28:16 PM"
- Sources labeled: `market-context-intelligence`, `smart-money-intelligence`
- Key Takeaways, Suggested Next Reviews, Bullish Factors, Bearish/Risk Factors sections rendered with real data.
- Data Gaps section: "Macro proxy data is not configured yet."
- Content: regime=NEUTRAL; bullish sectors Technology (RS 79), Utilities (71), Industrials (69); bearish/lagging IT, Consumer Defensive, Real Estate.

**Output observed — Alert Digest (loaded):**
- Status badge: COMPLETE
- Content: "0 unread alert events, including 0 critical items" — correct empty-state handling.
- Sections: Key Takeaways, Suggested Next Reviews, Bullish/Bearish Factors (all returning placeholder "no factors" copy).

**API Calls:**
- `GET /api/v1/copilot/market-brief?region=IN&assetType=STOCK` → 200 (on "Load Brief")
- `GET /api/v1/copilot/alert-digest?region=IN&assetType=STOCK` → 200 (on "Load Brief")
- (Stock/Portfolio/Watchlist Summary endpoints not called — no instrument/entity selected)

**Data Notes:**
- Output is fully deterministic rule-based template assembly — no external LLM calls observed in network log.
- PARTIAL status on Market Brief is due to missing macro proxy data, not a code error.
- Copilot usage is gated: "Copilot summaries today: 9 / 10" visible on billing page — usage metered correctly.

**Gaps / Issues:**
- Stock Summary, Portfolio Summary, and Watchlist Summary tabs still show the previously-loaded Market Brief output in the right panel after tab switch. The summary panel does not clear/reset when switching tabs — the right panel persists last-loaded content until a new "Summarize" is triggered. This could confuse traders who switch tabs and assume they see the current tab's output.
- No copy-to-clipboard or export action on generated summaries.
- PARTIAL status badge semantics not explained to the user in-UI (no tooltip or legend).

---

## 5. Notifications Delivery (`/notifications`)

**Route behavior:** `<Navigate to="/account" replace />` — the `/notifications` path redirects to `/account`. The redirect functions correctly (verified: navigating to `/notifications` lands on `/account`).

Notification preferences are embedded in the Account page — see Section 6 below.

---

## 6. Subscription & Billing (`/billing`)

**Purpose:** Plan management, feature limit metering, and usage display. No real payment provider.

**UI Elements:**
- Page header: "Subscription & Billing"
- Subtitle explicitly states: "Plan readiness, feature limits, and usage metering. Billing provider is manual/disabled by default." (confirmed: no checkout flow exists)
- **My Plan card:** Shows current plan name, Status: ACTIVE, and user email.
- **Available Plans:** 3 plan cards — Admin, Free, Pro. Each shows a "Select" / "Current" / "Downgrade" button. No price, feature comparison copy, or payment link on any card.
- **Feature Limits section (per Free plan):**
  - Portfolios: 0 / 1 (Available) — progress bar
  - Watchlists: 0 / 1 (Available) — progress bar
  - Alerts: 0 / 5 (Available) — progress bar
  - Backtest runs this month: 25 / 5 — "Limit reached" warning alert
  - Copilot summaries today: 9 / 10 — progress bar
- **Developer note alert** (visible to all users): "Upgrade prompts are returned by backend gating errors when a limit is reached. Future UI flows can show those as modals near the blocked action."

**Plan switching:** Clicking "Select" on Admin plan immediately changed the active plan to Admin (no confirmation dialog, no payment step, instant 200 response). Feature Limits updated to show all limits as "Unlimited". This is expected behavior (billing provider is manual/disabled), but: the test user's plan was mutated to Admin as a side effect of this recon session (not reversed — the "Downgrade" action was blocked by the recon boundary rule).

**API Calls:**
- `GET /api/v1/subscription/me?region=IN&assetType=STOCK` → 200
- `GET /api/v1/subscription/plans?region=IN&assetType=STOCK` → 200
- `POST /api/v1/subscription/change-plan?region=IN&assetType=STOCK` → 200 (on Select click)

**Data Notes:**
- No Stripe/Razorpay/payment-provider calls in network log — consistent with manual/disabled billing.
- Backtest usage shows 25 / 5 (over limit) — this is real persisted usage state, not a test artifact.

**Gaps / Issues:**
- The developer note alert ("Upgrade prompts are returned by backend gating errors...") is visible to all users including non-admin. This is implementation notes copy leaking into the trader-facing UI — should be hidden or moved to admin-only views.
- Plan cards show no price, description, or feature comparison — the Available Plans section is a bare list of names + buttons.
- No confirmation dialog before plan change — a single click mutates the plan.
- "Backtest runs this month: 25 / 5" (over-limit display) shows usage exceeding the plan cap, which is unexpected. Could indicate either that the metering check is not enforced at write time or that counts were accumulated before the limit was set.

---

## 7. Account + Notifications (`/account`)

**Purpose:** Profile editing and notification delivery configuration.

**UI Elements — Profile section:**
- "Signed in as test@example.com"
- Name field (editable text, pre-filled: "Test User")
- "Save profile" button
- "Log out" button

**UI Elements — Notifications section:**
- Section heading "Notifications" with subtitle "Configure delivery preferences, email digests, and notification history."
- **Preferences card:**
  - Provider badge: "EMAIL_LOG"
  - Toggle switches (all OFF for test user): Enable email notifications, Alert email digests, Daily digest, Weekly digest
  - Quiet hours start (time input, empty)
  - Quiet hours end (time input, empty)
- **Provider Status card:**
  - "SMTP is not configured; notification email is delivered through the local log provider."
  - Provider: log-email-provider
  - SMTP configured: No
  - SMTP active: No
  - Info alert: "Local email delivery is free and requires no paid email service — deliveries are recorded locally."
- **Manual Sends card:** Four buttons — "Send Test Email", "Send Alert Digest", "Send Daily Digest", "Send Weekly Digest". (Not triggered during recon.)
- **Recent Delivery History:** Empty state — "No notification delivery records yet."

**API Calls (on page load):**
- `GET /api/v1/auth/me?region=IN&assetType=STOCK` → 200
- `GET /api/v1/notifications/preferences?region=IN&assetType=STOCK` → 200
- `GET /api/v1/notifications/events?region=IN&assetType=STOCK` → 200
- `GET /api/v1/notifications/provider-status?region=IN&assetType=STOCK` → 200

**Data Notes:**
- All notification toggles are disabled (off) for test user. No delivery history exists.
- Provider is log-email-provider (local, no SMTP) — consistent with zero-paid-services constraint.

**Gaps / Issues:**
- The Quiet hours time inputs have no labels visible in the snapshot tree (they appear in textContent as "Quiet hours start / end" but there is no `<label>` element associated with the `<input>` in the DOM — accessibility gap).
- No "Save preferences" button is visible for the Notifications section; it's unclear whether toggles auto-save on change or require an explicit save action.
- No indication of what email address digests would be sent to (the profile email is shown on /billing but not repeated in the Notifications section).
- The `/notifications` route redirects to `/account` rather than anchoring the page at the Notifications section, which could disorient users who bookmark or link directly to `/notifications`.

---

## Summary Table

| Screen | Route | Key API Paths | State | Notable Issues |
|--------|-------|---------------|-------|----------------|
| Portfolios | `/portfolios` | `GET /api/v1/portfolios` | Empty (no portfolios) | No required-field validation markers on create form |
| Watchlists | `/watchlists` | `GET /api/v1/watchlists` | Empty (no watchlists) | Same as Portfolios |
| Alerts | `/alerts` | `GET /api/v1/alerts/rules`, `GET /api/v1/alerts/events` | Empty (no rules/events) | Create Alert button needs direct JS click; no inbox pagination |
| Copilot | `/copilot` | `GET /api/v1/copilot/market-brief`, `GET /api/v1/copilot/alert-digest` | Functional (PARTIAL / COMPLETE) | Tab switch does not clear previous summary; PARTIAL badge unexplained |
| Notifications | `/notifications` | (redirects to `/account`) | Redirect works | Anchor jump to notifications section missing |
| Billing | `/billing` | `GET /api/v1/subscription/me`, `GET /api/v1/subscription/plans`, `POST /api/v1/subscription/change-plan` | Admin (mutated by recon) | Dev note leaks to trader UI; no plan confirmation dialog; over-limit usage (25/5 backtests) |
| Account | `/account` | `GET /api/v1/notifications/preferences`, `GET /api/v1/notifications/events`, `GET /api/v1/notifications/provider-status` | Active, all notif off | Quiet hours inputs lack `<label>` association; no visible Save for preferences |

---

## Distinct API Paths Observed

- `GET /api/v1/auth/me`
- `GET /api/v1/market-context/capital-posture`
- `GET /api/v1/portfolios`
- `GET /api/v1/watchlists`
- `GET /api/v1/alerts/rules`
- `GET /api/v1/alerts/events`
- `GET /api/v1/subscription/me`
- `GET /api/v1/subscription/plans`
- `POST /api/v1/subscription/change-plan`
- `GET /api/v1/copilot/market-brief`
- `GET /api/v1/copilot/alert-digest`
- `GET /api/v1/notifications/preferences`
- `GET /api/v1/notifications/events`
- `GET /api/v1/notifications/provider-status`
- `GET /api/v1/instruments` (header instrument search)

## Console Errors

None observed across all screens in this wave.
