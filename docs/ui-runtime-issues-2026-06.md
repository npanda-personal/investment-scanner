# UI/UX Runtime Audit (real browser) — 2026-06-05

3 parallel agents drove the **running app** in a real headless browser (Preview/Playwright) against
live backend data — capturing rendered state, console errors, and failed network calls. This catches
runtime + data-reliability issues that code-only review misses (several items the prior code audit
marked "fixed" are shown here as still broken). Login: test@example.com. Data context: latest real
market EOD ≈ 2026-06-04; today 2026-06-05.

Severity: **P0** = data is wrong/misleading (breaks trust) · **P1** = broken/empty surface or pervasive polish · **P2** = minor.

---

## A. ROOT-CAUSE DATA POLLUTION — `TEST_CONNECTED_CHAIN` seed is in the working DB (P0)
The single biggest "data isn't reliable" cause. A seeded integration-test fixture (`TEST_CONNECTED_CHAIN`,
dated 2026-05-29, 3 instruments incl. RELIANCE) lives in the production-like dev DB and leaks everywhere:
- **RELIANCE workbench price = 193.21 INR** (real ≈ 1,400–1,500). Source label `TEST_CONNECTED_CHAIN` ×22; fundamentals tagged `TEST_CONNECTED_CHAIN`; no banner distinguishing fixture from real data. (user)
- Admin → Market Data → Import "Recent Source Files (Latest 10)" lists `TEST_CONNECTED_CHAIN CM / DELIVERY / FUNDAMENTAL — 2026-05-29` as COMPLETED real imports (550 rows). (admin)
- **→ Fix:** quarantine/remove the TEST_CONNECTED_CHAIN rows from the working dataset (and/or exclude `catalogSource/source LIKE 'TEST_%'` from all production reads + import lists). Re-import real RELIANCE EOD so the workbench shows a real price.

## B. ROOT-CAUSE — "latest signal run" pointer hijacked by a 3-instrument test run (P0)
- Admin → Signals shows **7 signals** (Bullish 7) instead of the **2,048** real signals generated Jun-4.
- `/api/v1/signals/runs/latest` returns the connected-chain test run (`sourceDataDate 2026-05-29`, `batchSize 3`, `generatedCount 2`) executed Jun-5 00:58, which overwrote "latest" → `/signals/top` + `/signals/screener` return total=7. The **entire signals surface (user + admin) shows a 7-signal test slice**, not the real universe. (admin)
- **→ Fix:** "latest run" selection must ignore tiny/manual test runs (filter by modelVersion/source/universe size or exclude TEST runs); re-point to the real full-universe run. Highest-leverage single fix for trust.

## C. PERVASIVE — raw enum/codes leak to the UI on nearly every page (P1, very widespread)
A humanization/label layer is missing. Observed raw codes rendered verbatim:
- **Indices:** `NSE_INDEX_NIFTY50_PR_1X_INVERSE`, `NSE_INDEX_NIFTY_MIDSMALL_IT_AND_TELECOM`, `^CNXMETAL`, `^CNXPHARMA`, `^CNXAUTO` (Market Pulse indices + Strong/Weak sectors).
- **Setup/strategy:** `MOMENTUM_CONTINUATION`, `PULLBACK_IN_UPTREND`, `DEFENSIVE_EXIT`, `RESEARCH_ONLY`, `UNPROVEN`.
- **Reasons/warnings:** `STRONG`, `TOP_RELATIVE_RANK`, `HIGH_SECTOR_SCORE`, `LATEST_PRICE_STALE_CLOSE_FALLBACK_USED`, `SECTOR_INDEX_PRICE_STALE_FOR_DATA_THROUGH_DATE`.
- **Board/lane/exclusion:** `LONG_REVIEW reserved slot`, `OUTSIDE_SCOPE`, `REPAIR_DATA`, `FULL_REVIEW`.
- **Data-health/quality:** `REVIEW_READY`, `STALE_OR_INCOMPLETE`, `CATALOG_ONLY`, `PRICE_READY`, `PARTIAL`, `UNUSABLE`, `NOT_READY`, `BLOCKED`.
- **Billing plan chip** double-renders: "Admin / ADMIN", "Free / FREE".
- **→ Fix:** central enum→label maps (`src/shared/labels`) + apply in the offending tables (Market Pulse, today-review, research-hub, sector intelligence, data-quality, catalog, billing).

## D. Market Pulse "Top 5 Indices" = wrong/irrelevant indices (P0/P1)
Shows inverse + midsmall niche indices (`NIFTY50_PR_1X_INVERSE` 225.35, `MIDSMALL_IT_AND_TELECOM`) as the
headline market snapshot instead of NIFTY 50 / BANK NIFTY / SENSEX. Trader gets no useful market overview.
**→ Fix:** curate a headline-index allowlist; rank by relevance, not arbitrary value.

## E. Freshness label inverted — "Fresh" on stale data (P1)
Market Pulse: Snapshot 6/2, Data Through 6/1, labelled **"Freshness: Fresh"** on 6/5 (4 days old).
Research-hub "What Changed" correctly says "Stale — over 1 day old" (good — use that pattern).
**→ Fix:** compute freshness vs `expectedLatestTradingDate` (≈6/4), not a fixed window.

## F. Currency still defaults to USD on Portfolio "Create New" (P0)
Indian-market-only app; new-portfolio currency field defaults to `USD` → all P&L in USD unless changed.
(Prior code audit's "INR" fix only touched display formatters, not this form default.)
**→ Fix:** default INR on the create form (and any other create/transaction forms).

## G. Instrument Workspace — multiple broken surfaces (P1)
- Landing shows permanent **"Status: Backend Unavailable — this radar requires a persisted read API that has not been produced yet"** (dev stub as default state).
- **Search combobox does not filter** by typed text (typing "RELIANCE" still lists all alphabetically).
- **4 of 8 workbench tabs are external-link stubs** (Signals, Signal Quality, Calibration, Smart Money) — no inline data, just a link to another dashboard.
- **Deep-link `/instrument-workspace/RELIANCE` → blank page** ("No routes matched"). No route registered.
- adjusted_close == close everywhere (MVP disclaimer buried as inline text).

## H. Pipeline freshness/skew (admin, P1)
- Downstream stages (`SIGNAL_CALIBRATION, MARKET_CONTEXT, SIGNAL_QUALITY, SMART_MONEY, STRATEGY_DECISION, RESEARCH_PROJECTION, TODAY_REVIEW`) data-through **Jun-3** while `RAW_SIGNALS` is Jun-4 — downstream never re-ran after Jun-4 signals.
- `MARKET_DATA` stage "last run" shows only **3 instruments** (the test batch), not the full universe load.
- `MARKET_PULSE` and `BACKTEST_PROOF` stages **"Not yet active"** (never run) — Market Pulse snapshot (6/2) comes from a separate manual path.
- **→ Fix:** re-run the downstream chain through Jun-4; wire MARKET_PULSE/BACKTEST_PROOF stages.

## I. Today-Review metadata not flowing (P1)
All 10 rows show `Daily tier: Missing`, `Automation: Missing`, `Sector: Unknown`, `Proof: Unproven` —
sector + tier + proof metadata absent from the persisted review output.

## J. MUI Tooltip console-error flood (P2 functional, but pervasive)
500+ `MUI: You have provided a 'title' prop to the child of <Tooltip/>` errors — a `title` prop passed to a
Tooltip child across **every data-table row** (today-review, and confirmed app-wide by the UX pass). Benign
to function but floods the console and indicates a systematic component bug. **→ Fix:** one shared chip/cell fix.

## K. Billing (admin, P1/P2)
- Raw DB id shown as identity: `User: cmq00jg710000w500fuirv4tp` (should be email/name).
- Backtest counter "**11 / 5**" over the Free cap — enforcement is intentionally disabled in dev (SUBSCRIPTION_LIMITS_DISABLED) but the UI presents it as a broken/exceeded gate with no context.
- Plan chips double-render display name + raw enum.

## L. Smaller items (P2)
- Watchlist "Intelligence Overlays" stub ("not available yet" + disabled chips, no timeline).
- Daily-review-shortlist: 8s load with only a progressbar (no skeleton); "Today Review: 0 selected / 40 available" (freshest source contributes nothing to the shortlist).
- Research-hub: 0 review candidates despite 1,374 promoted in today-review (gate too strict / inconsistent).
- Calibration admin: "Evidence Through: —" blank for all 1,138 rows; overview says LIMITED / MISSING_SIGNAL_QUALITY_EVIDENCE while rows show calibrated.
- Strategy-decision admin: Rating/Readiness = UNKNOWN for all 64 candidates.
- Admin Data-Health: zero-value metric cards flash before async data loads.
- Signal-quality admin: "Average 5D Return: —" blank.

---

## Priority fix order (proposed)
1. **B + A** (P0 root causes) — exclude test runs from "latest" + quarantine TEST_CONNECTED_CHAIN. Fixes the 7-signals problem, RELIANCE fake price, import pollution in one stroke → restores data trust across user+admin signals/workbench.
2. **F** (USD→INR portfolio default) — trivial, high-trust.
3. **D + E** (headline indices + freshness label) — Market Pulse correctness.
4. **C + J** (enum humanization layer + tooltip fix) — pervasive polish, mechanical.
5. **G** (instrument-workspace route + search + stubs), **H** (pipeline catch-up), **I**, **K**, **L**.
