# UX Audit — User-Facing Trader Pages — 2026-06-05

Companion to [`ui-runtime-issues-2026-06.md`](ui-runtime-issues-2026-06.md). That doc covers **runtime / data-trust**
(test-fixture pollution, latest-run hijack, freshness, enum leakage as a *data* problem). **This doc covers
UX / workflow** — interaction design, information hierarchy, async states, and missing screens — and is largely
independent of the data fixes.

**Method:** 5 parallel agents read the actual rendered code of every user-facing page (not the running app) and
reported gaps with `file:line` citations. Persona scope: **both** the active swing trader and the long-term /
compounder investor are first-class; sequencing below is by trust + effort, not by persona.

**One-line finding:** the app currently reads like a **data-ops console wearing a trader skin** — it surfaces
evidence but rarely lets the trader *act*, it shows its own plumbing, and it is not yet "Indian-market native."

Tags: **[QW]** quick win · **[RD]** bigger redesign · **[NEW]** new screen/element.

---

## 1. Systemic patterns (fix once → pay off everywhere)

### S1 — Information hierarchy inverted: diagnostics before decisions
Trader scrolls past 5–7 screen-heights of run-status / coverage / disclaimers to reach what they came for.
- Daily Review: RunStatusPanel + CoveragePanel (duplicative) + 2 permanent disclaimer Alerts + 10 summary cards +
  BoardSelectionPanel + ExclusionPanel *before* the candidate table. (`TodayReviewPage.tsx:117-169`)
- Research Hub: bare full-screen spinner, no page-level "as of", priority board competes with 4 stacked panels.
  (`ResearchOverviewPage.tsx:133-163`)
- Market Pulse: `marketHealthLabel` (the whole point) has identical visual weight to "Candidate Count".
  (`MarketIntelligencePages.tsx:399-406`)
- **Adjustment [RD]:** decision first, evidence on demand. Lead each page with the answer; collapse run/coverage/
  exclusion plumbing into one "Audit context" accordion below.

### S2 — Developer / architecture copy leaking into the trader UI (trust-killer)
- "Context here must come from persisted read models only. Missing evidence is shown instead of triggering
  data-production work." (`UnifiedStockPage.tsx:199-205`)
- "The InstrumentContextSnapshot read API is missing." (`UnifiedStockPage.tsx:255-264`)
- "Compatibility route retained for localhost history." (`MarketIntelligencePages.tsx:242`)
- "Close shown as adjusted close for MVP" — rendered as a visible chip. (`InstrumentDetailPage.tsx:206`)
- "MVP plan readiness… Billing provider is manual/disabled by default." (`SubscriptionBillingPage.tsx:32`)
- "Upgrade prompts are returned by backend gating errors… Future UI flows can show those as modals."
  (`SubscriptionBillingPage.tsx:72-74`)
- "These states appear after persisted alert read models exist." (`AlertsMonitoringPage.tsx:94-104`)
- **Adjustment [QW]:** purge all dev/architecture notes from rendered copy; stubs get calm "coming soon" or a
  feature flag — never an error-shaped panel (see S6).

### S3 — Not yet "India-first"
- Portfolio "Create New" currency **defaults to USD**; holding & transaction currency are free-text.
  (`PortfolioManagementPage.tsx:481,526`; also data-audit §F)
- No **₹** symbol, no **Cr/Lakh** scaling — Revenue renders "2,345,678" via `toLocaleString`.
  (`InstrumentDetailPage.tsx`, `StockResearchWorkbenchPage.tsx:236-238`)
- "**Country**" columns/buckets always "India" — wasted slots. (`WatchlistManagementPage.tsx:147`,
  `PortfolioManagementPage.tsx:497`)
- No **52-week range**, no **delivery %**, no **VWAP** — generic international OHLCV schema. (`InstrumentDetailPage.tsx`)
- **Adjustment [QW/NEW]:** add `shared/format/money.ts` (₹ + Cr/Lakh + compact) next to existing `enumLabels.ts`;
  lock INR for IN scope; swap "Country" → "Market-cap tier"/"Exchange"; add 52W range + delivery% to price surfaces.

### S4 — Raw enum/code leakage (UX half of data-audit §C)
Central layer exists (`shared/format/enumLabels.ts`: `humanizeCode` / `indexLabel` / `isHeadlineIndex`) but is
**not applied** in many cells: `direction`, `setupType`, `riskCategory`, transaction types (`CASH_IN`), posture
action (`REDUCE_EXPOSURE`), corporate `action_type`, plan codes, readiness. Plus `TagList` silently drops
`tone==='warning'` → **risk tags look identical to positive reason tags everywhere**.
(`MarketIntelligencePages.tsx:690`)
- **Adjustment [QW]:** finish wiring `humanizeCode` through every radar/table cell; fix warning-tone bug.

### S5 — Surfaces ideas, won't let you act (no loop closure)
- Radar tables: no **Add to Watchlist**, half lack a workspace link.
- Instrument Workspace: no inline **watchlist/alert quick-add** (rail says "available through Watchlists" but no link).
- Daily Review: no **prev/next** candidate nav, no **mark-reviewed/dismiss**.
- Daily Review Shortlist: no **refresh**, no **export/copy** of the 10 names.
- **Adjustment [RD]:** consistent per-row action (★ watchlist, 🔔 alert, open) on every ranking table; review-progress
  state + prev/next on the candidate flow.

### S6 — Stub / "coming-soon" surfaces dressed as broken states
- Instrument Context Rail = **8 chips all "Unavailable"** + error-styled panel. (`UnifiedStockPage.tsx:193-271`)
- Compounder / Trader-Setup / Risk radars render **tabs on top of an "unavailable" banner**.
  (`MarketIntelligencePages.tsx:299-307`)
- Watchlist "Intelligence Overlays — Coming soon" permanent card; Alerts "Planned Radar Alert States" card.
- **Adjustment [QW]:** when a backend is absent, suppress working chrome; show one calm placeholder.

### S7 — Weak async states
Full-screen spinners that blank the page (Portfolio/Watchlist hide even the Create form); **no skeletons**; **no
Retry** on most errors; `Promise.all` partial failure rendered as total failure; no relative timestamps; no
Snackbar/Toast infra (feedback relies on dismissable Alerts that scroll away).
- **Adjustment [RD]:** skeletons matching final layout; Retry on every error; section-level failure; global Snackbar
  provider; relative-time helper.

### S8 — Tables wide, dense, unsortable, unfilterable
16–18 column tables (Earnings 16; Today-Review 18 ≈ 3,180px) → horizontal scroll, **no sticky symbol col, no sort,
no column-visibility, no per-tab counts**, no confidence-score filter on the primary ranking key.
- **Adjustment [RD/NEW]:** standard `RankingTable` — sticky first col, header sort, column-visibility menu, per-tab
  count badges, primary-axis filters.

---

## 2. Per-page: top gaps → proposed adjustments

| Page | Highest-value gaps | Proposed adjustment |
|---|---|---|
| **Market Pulse** (home) | Health label not hero; "Top 5 Indices" niche/inverse (data §D); freshness inverted (§E); sector table unsorted; warning-tone dropped | Hero health card (color-keyed); apply `isHeadlineIndex`; sort sectors; fix tag tone |
| **Daily Review** | Diagnostics-first (S1); 18-col table; no confidence filter; summary cards not clickable; warnings joined to run-on string | Reorder (table first); column-visibility; confidence chips/slider; clickable cards → tabs |
| **Candidate Detail** | No prev/next; "Do nothing unless" (entry condition) buried as 1 of 8 facts; always-on policy Alert; raw tier codes | Prev/next nav; elevate entry/exit blocks; collapse policy note; humanize tiers |
| **Research Hub** | No page "as of"; "Market is CLOSED" misreads as NSE-closed (it's the gate); only `blockers[0]` shown; readiness collapses to "RESEARCH ONLY" for all | Sticky as-of banner; relabel "Market Gate: OPEN/RESTRICTED"; show all blockers |
| **Instrument Workspace** | Double PageHeader; 4/8 tabs are external-link stubs; Context Rail 8×"Unavailable"; search doesn't filter (data §G); `.NS` leaks | Single header; inline signal/quality summary (or hide); fix rail stub; sticky/filtering search |
| **Research Workbench** | Close-only chart, no volume align/MA/52W/corp-action markers; INR Cr labels missing; back always → /research | Real chart component (N2); ₹ Cr formatting; `navigate(-1)` |
| **Portfolios** | USD default (P0); free-text currency; holding delete no-confirm; "Countries" bucket; UUID shown on edit; no realized P&L / benchmark | INR lock; confirm dialogs; symbol not UUID; market-cap-tier bucket; add Realized P&L + vs-Nifty |
| **Watchlists** | "Coming soon" card; always-on inline note/tag fields (50 rows = 50 TextFields); no target-price; "Country" col; one-direction alert | Collapse overlays card; click-to-edit row detail; target-price field; both alert directions |
| **Alerts** | Scope/Type can form nonsensical combos; threshold has no unit (₹/%/score); delete/mark-all no-confirm; can't view dismissed; no rule edit | Scope-aware type filter; unit-aware threshold; confirms; dismissed archive; edit flow |
| **AI Copilot** | "Select an entity" wrong for Market/Alert tabs; button always "Load Brief"; cross-tab summary bleed; no panel skeleton | Tab-specific copy + labels; per-tab summary; panel skeleton |
| **Notifications** | Quiet-hours free-text saving each keystroke; "SMTP configured: Yes" shown in *warning* yellow; test-email is primary CTA; no pagination | `type="time"` + onBlur; success color; demote test; paginate history |
| **Billing** | No plan differentiation/price/features; plan change no-confirm/no-success; dev jargon subtitle; no reset date on limits | Comparison cards; confirm + success; user-facing copy; "resets monthly" |
| **Account** | Saves silently; Save always enabled; Log out adjacent to Save; no loading hydration | Success toast; dirty-detection; "Danger zone" section; skeleton |

---

## 3. New screens & shared elements

**Shared elements (build once, reuse):**
1. **`shared/format/money.ts`** — ₹ + Cr/Lakh + compact + colored change. Companion to `enumLabels.ts`. *(S3)*
2. **Charting component** — timeframe (1M/3M/6M/1Y/3Y), aligned volume bars, 20/50/200-DMA overlays, 52W hi/lo band,
   dividend/split/earnings markers, crosshair. Replaces close-only line on Workbench + Instrument Detail. *Biggest
   single credibility upgrade; serves both personas.*
3. **Standard `RankingTable`** — sticky symbol col, sort, column-visibility, per-tab counts, row actions. *(S5+S8)*
4. **Global Snackbar/Toast provider** + relative-time helper. *(S7)*
5. **Command palette (Cmd/Ctrl+K)** + **Recently viewed** — symbol nav has no hotkey and defaults to alphabetical
   first-20. *(swing-trader speed)*
6. **Global "Data as of: 04-Jun-2026 EOD · Fresh" anchor** in app chrome — every page reinvents freshness today.

**New screens:**
- **N1 — "My Day" cockpit (new home).** Today `HomePage = MarketPulsePage` verbatim. Replace with personalized start
  screen: market gate → today's shortlist → open portfolio risk → unread alerts → what changed. *(swing trader, but
  benefits all)*
- **N2 — Peer / sector comparison panel.** No peer or sector-relative context exists anywhere. *(compounder investor)*
- **N3 — Earnings calendar view.** Date-grouped/calendar mode for the 16-col earnings table during result season. *(both)*
- **N4 — Realized P&L / closed positions + benchmark.** No realized-gains view, no vs-Nifty. *(both)*
- **N5 — Alert rule dry-run.** "What would this rule have fired on in the last 30 days?" *(swing trader)*

**Navigation IA:** flat **13-item "Trader Workflow"** group → sub-group into *Start of Day · Discover (radars) ·
My Lists · Deep Dive*. **AI Copilot, Notifications, Account are not in the nav at all** — discoverability gap.

---

## 4. Suggested sequencing (trust + effort)

1. **Mechanical high-trust wins [QW]** — INR currency default + ₹/Cr formatter (S3); purge dev copy (S2); finish
   `humanizeCode` wiring + warning-tone fix (S4); confirm dialogs on destructive actions.
2. **Shared infrastructure** — Snackbar, skeletons/Retry (S7), standard `RankingTable` + row actions (S5/S8),
   "Data as of" anchor.
3. **Hierarchy re-layouts [RD]** — Daily Review, Research Hub, Market Pulse decision-first (S1); fix stub surfaces (S6).
4. **Net-new value [NEW]** — charting component, My Day cockpit (N1), peer comparison (N2), earnings calendar (N3),
   review-progress + prev/next.

---

## Appendix — line-cited findings by page

> Raw output from the parallel readers, retained for traceability. Severity language is the readers' own.

### Market Intelligence (Market Pulse, radars, Review Shortlist)
- Market Pulse: 6 equal-weight ScoreCards, health label not hero (`MarketIntelligencePages.tsx:399-406`); "Candidate
  Count" unlabeled (:405); breadth/delivery summaries are plain prose (:432-433); sector table unsorted (:467-499);
  `TagList` drops `tone==='warning'` → risk tags == reason tags (:690); per-row Freshness identical every row
  (:420,362-373); loading = bare LinearProgress (:291); error has no Retry (:292).
- Stock Interest Radar: no per-tab counts (:343-346); 10-col table, no sticky symbol (:509); "Open" button not
  a11y-labeled (:520); `returns` field exists in type but never rendered; `direction` raw (:515); verbose empty
  state (:350); no snapshot timestamp near tabs; no Add-to-Watchlist.
- Earnings Intelligence: 16-col table (:530); `daysToResult` raw number no urgency (:534); "Date Source" noise per
  row; Result-Reaction tab has no reaction field in type → misleading.
- Compounder/Trader-Setup/Risk Radars: tabs render above the "unavailable" banner (:299-307,341-353); no company
  name, no workspace link, raw `setupType`/`riskCategory`; Portfolio-Risk tab always empty via `() => []` (:199);
  no severity color on Risk Score; no sort by score.
- Instrument Workspace landing: search box rendered inside "unavailable" shell looks broken (:218-234); helper text
  too quiet (:227-229); no Recently-viewed; no search hotkey.
- Daily Review Shortlist: 8 concurrent sources, no per-source progress; `OpenInNewIcon` implies new tab but is SPA
  nav (:209); 10 explainability accordions dumped below table (:219-222); mostly-empty Warning column (:194);
  Lane not color-coded (:192); Sources chips overflow row height (:193-194); "Data Quality" raw count (:126);
  no refresh; no mark-reviewed; no export; `generatedAt` computed but never shown.
- Compatibility routes (/indices,/breadth,…): dead-end `DataUnavailableState` with dev copy, no forward links
  (:237-251).

### Daily Review + Research
- TodayReviewPage: diagnostics-first ordering (:117-169); duplicate Run/Coverage panels (:177-216); permanent
  disclaimer Alerts (:141-145); summary cards not clickable (:127-137); 18 columns ~3,180px; Automation always
  "BLOCKED" (:1104); EllipsisCell clips Reason/Blocker (:672-679); no row selected-state; page size 10 (:505);
  vague "Search rows" (:743); CSV filename omits tab (:720-723); no confidence filter; `run.warnings.join(' ')`
  run-on (:124); `coverageWarnings.slice(0,3)` silent drop (:291-293); scope read-only, not changeable (:96).
- CandidateDetail: back-label "Today Review" vs page "Daily Review" (:76); no prev/next; always-on automation
  Alert (:136-138); blockers+watchReasons joined to one string (:123); "Do nothing unless" buried (:115);
  `formatEntryTrigger` falls back to reasonSummary → duplicate text (:368-370); raw tier codes
  (`PHASE0_AUTOMATION_NOT_AUTHORIZED`) (:346,334); Refresh has no feedback/age (:83); two drilldowns symbol vs id
  unexplained (:226-235).
- ResearchOverview: full-screen spinner (:50-53); no page "as of" (:111); "Market is OPEN/CLOSED" raw, misreads as
  NSE-closed (:272); only `blockers[0]` shown (:294); `sourceModule` raw code in tile (:232); readiness collapses
  to RESEARCH_ONLY for all (:724-727); PriorityCard "Daily Review" button → full list not the candidate (:401-403);
  decisionScore/CAGR/DD/Sharpe unlabeled (:420,430); weak sectors available but not shown (:508-515); drilldown
  routes maybe-dead (:647-653).
- StockResearchWorkbench: no exchange badge / 52W range (:114-130); price no INR/change treatment (:123-125);
  back hardcoded /research (:108); chart no gridlines/crosshair/MA, hidden volume axis (:197-208); MAX range no
  feedback (:40); defaults 1Y (:67); range-sensitive + fixed-period returns mixed (:213-223); Revenue/NetIncome no
  Cr/L (:236-238); peer cards no exchange/sector (:279-286); raw `action_type` (:304); no Retry on error (:97-99);
  undefined `id` → infinite spinner (:75-76).

### Instrument Workspace + Catalog
- EntitySearchSelect: no custom "no results" (:51-91); scope filter invisible (:24-32); label keeps `.NS` (:63);
  no global hotkey; pageSize 20 no "more" (:28); error swallowed == empty (:36-38); no recents (alphabetical first-20).
- MarketDataFoundationPage: trader vs operator intent mixed across 3 tabs (:1132-1135); "Add Instrument" primary CTA
  on trader path (:1119); row Drawer only action is "Open Workspace" (:1610-1677); Data-Health 3-chip cell unsortable
  (:982-999); sector/industry free-text not dropdowns (:303-304,1556-1558); no stale color (:1002-1013); preset vs
  FilterBar desync (:1074-1081); total count hidden unless filtered (:1580); Manual Fundamentals needs raw UUID
  (:1434); single error string clobbers prior (:1145); scheduler banner no ETA (:1228-1240).
- InstrumentDetailPage: title shows raw `symbol` w/ `.NS` (:150); double PageHeader inside UnifiedStockPage (:149-159);
  "Currency" wastes a stat card (:166-185); Metadata card is operator fields (:181-184); price no INR/change/OHLC
  (:168-170); chart close-only, "adjusted close for MVP" chip visible (:206); price table `slice(0,20)` silent drop
  (:225); no VWAP/delivery%/OI; `Promise.all` partial failure → whole-page error (:91-105); fundamentals/corp-actions
  no units, generic empty states.
- UnifiedStockPage: 8 tabs, 3 render strategies, no visual cue which navigate away (:106-134); Overview/Prices/
  Fundamentals render identical InstrumentDetailPage (:108-112); tab order not workflow-aligned (:27-36); Context Rail
  8×"Unavailable" + dev-note Papers (:193-271,199-205,255-264); symbol redirect silent fallback to first result
  (:308-314); not-found == network error (:319-322); ModuleTabCard forwards only instrumentId (:153-154).

### Portfolio / Watchlist / Alerts
- Portfolio: global spinner hides Create form (:283); Create always visible (:301-328); empty state no jump-to-create
  (:330-334); reloadOrSelect ordering flashes empty (:204); holdings delete no-confirm (:448-456); edit row not
  highlighted (:263-272); edit shows instrumentId UUID (:469); currency free-text (:481,526); P&L cell no color on
  amount (:439); no "% of portfolio" col; no sort; allocation null = blank tab (:493); top-holdings capped 6 silently
  (:118); "Countries" bucket useless for IN-only (:497); transactions immutable, raw types CASH_IN (:508-511);
  resolveSymbol shows UUID fragment (:68); posture action raw REDUCE_EXPOSURE (:385); Delete Portfolio too prominent
  (:342-346). Missing: realized P&L, cost-basis import, attribution, vs-Nifty benchmark.
- Watchlist: "Coming soon" permanent card (:222-229); global spinner (:210); empty state no CTA (:301,259-262);
  50 live note/tag TextFields (:176-179); per-row Save icon, no save-all/auto-save (:187-191); tags flat comma string
  (:178); "Country" col useless (:147); tall signal cell (:152-170); no stale-signal cue; no target-price col;
  daily change % only no ₹ (:149); active sort not indicated (:285-288); no tag/sector/direction filter; Set-Price-Alert
  only PRICE_ABOVE (:138-140); Delete Watchlist too prominent (:272).
- Alerts: "Planned Radar Alert States" dev card (:94-104); no PageHeader (:64-75); "Evaluate Now" expert control
  prominent (:122-134); dismissed events unviewable (:57); Mark-All-Read no confirm (:135); unread = subtle
  action.hover (:146); contextLink falls back to /alerts → no-op icon (:32); no pagination/bulk-dismiss; no relative
  time (:154); rule labels raw enum + no unit (:194-196); no rule edit (:200-213); delete no-confirm (:206-208); no
  last-triggered/grouping/dedupe. CreateAlertDialog: scope/type unconstrained combos (:88-105); threshold no unit
  (:143); name not validated (:159); shows instrumentId UUID not symbol (:44-45,113); no success feedback;
  `DAILY_MOVE_*` raw decimal (0.03 vs "3"). Missing: summary counts, history chart, delivery settings, dry-run.

### Copilot / Notifications / Billing / Account
- Copilot: "Select an entity" wrong for Market/Alert tabs (:153-158); no empty-state timestamp; no panel skeleton
  while running; button always "Load Brief" incl. Alert Digest (:127); cross-tab summary bleed (:166); `slice(0,8)`
  silent (:194); disclaimer only after content (:171); error no retry (:68); empty portfolio/watchlist dropdowns
  silent (:52-53).
- Notifications: quiet-hours free-text, saves each keystroke, no tz (:154,159); "SMTP configured: Yes" in warning
  yellow (:175); test-email is primary CTA (:189); digest sends no confirm (:191-192); no pre-flight if SMTP off;
  history no pagination/filter (:56-80); no channel config path; reload no spinner (:120).
- Billing: PlanCards no features/price (:86-87); upgrade/downgrade labels not context-aware (:90); plan change no
  confirm (:58) / no success (:37); dev jargon subtitle (:32) + dev info Alert (:72-74); limits no reset date
  (:97-125); triple warning signals (:101,106); My Plan no renewal/period (:42-47); no spinner on change (:89).
- Account: blank field until rerender (no hydration); save silent success (:10-17); Save always enabled (:28);
  Log out adjacent to Save (:27-30); no email-change path/explanation (:25); no security/2FA/sessions; no delete/export.
- Cross-cutting: no Snackbar infra; missing PageHeader on Notifications/Account; full-screen spinners no skeleton;
  inconsistent page padding (Billing/Account).
