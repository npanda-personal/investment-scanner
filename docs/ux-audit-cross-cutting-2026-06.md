# UX Audit — Cross-Cutting Dimensions — 2026-06-05

Second, deeper UX pass. Companion to [`ux-audit-2026-06.md`](ux-audit-2026-06.md) (page-by-page) and
[`ui-runtime-issues-2026-06.md`](ui-runtime-issues-2026-06.md) (runtime/data-trust). Where the first UX doc walked
each screen, this one attacks the **cross-cutting dimensions** a page-by-page pass under-weights:
**design-system consistency, accessibility, responsive/mobile, journeys & wayfinding, data-formatting/trust, and
forms/feedback.**

**Method:** 6 parallel agents read the actual rendered code across `frontend/src` and reported with `file:line`
citations. Tags: **[QW]** quick win · **[RD]** bigger redesign · **[High/Med/Low]** = a11y severity.

**Codebase moved since the first audit:** `shared/format/money.ts` (`inr`/`inrCompact`) now exists, the Workbench
price chart now has SMA overlays, and shared `DataTable` / `StalenessBadge` primitives exist. Several findings below
are therefore about **inconsistent adoption** of these new primitives, not their absence.

---

## 1. The payoff: 9 "build-once" primitives

The same root gaps surfaced independently across multiple lenses. Building these once resolves dozens of findings.

| Primitive | Kills | Source lens |
|---|---|---|
| **Central `statusColor` module** (regime / signal / severity / status, domain-split) | ~14 divergent local `statusColor`/`colorFor` clones; `MarketContextPage:12` ≡ `MarketRegimeWidget:5` byte-for-byte | design system |
| **Complete `shared/format`** (`percent`, `dates`, `freshness`, `score`; extend `money`) | 35+ inline `toLocaleString()`, 3 freshness paths, 11 ad-hoc number helpers, USD leakage | formatting |
| **`ToastContext` / `useToast`** global provider | Silent success on portfolio/alert/watchlist mutations; duplicate stacked Snackbars; in-page success Alerts that scroll away | forms |
| **`useConfirmDialog` hook** | 8 destructive actions firing with no confirmation | forms |
| **`NumberField`** (min/max/step + unit adornment) | Threshold/score/capital/qty fields lacking units, bounds, numeric typing | forms |
| **Responsive `DataTable`** (sticky first col + xs card fallback) | `DataTable.tsx:78` hard `minWidth:900`; ~2,886px Today-Review table; "hover to read" on touch | responsive |
| **`aria-label` sweep** on icon buttons | ~35+ icon-only buttons relying on Tooltip `title` → unlabeled to AT | accessibility |
| **Route-focus + skip link + `id="main-content"`** | No focus moved on nav; no skip-to-content; 20+ item sidebar tabbed every load | accessibility |
| **Canonical `/stocks/:id`** + back-state | 3 overlapping surfaces for one stock; hardcoded back targets strand users; double `PageHeader` | journeys |

---

## 2. Genuine bugs surfaced (not just polish)

1. **"3 of NaN"** peer rank — `peer_count + 1` with null peer_count (`StockResearchWorkbenchPage.tsx:503`). [QW]
2. **Symbol-instead-of-ID** stock links → silent bad-ID load (`TodayReviewCandidateDetailPage.tsx:242`,
   `ResearchOverviewPage.tsx:634`). [RD]
3. **Broken CTA** → `/admin/strategy-evaluation` (no such route) (`ResearchOverviewPage.tsx:654`). [QW]
4. **No `*` catch-all route** → blank, layout-less screen on any bad URL (`routes.tsx`). [QW]
5. **Double `PageHeader`** (two "Instrument search" back-buttons) on workspace overview tab
   (`UnifiedStockPage.tsx:89` + `InstrumentDetailPage.tsx:170`). [RD]
6. **Falsy-zero green** — 0%/null daily change renders green not neutral (`SmartMoneyIntelligencePage.tsx:128`). [QW]
7. **USD currency leakage** on NSE instruments (SignalCard/SignalTable/AddSignal/AddInstrument defaults). [QW]

---

## 3. New screens / elements (additive to the first audit's N1–N5)

- **Cockpit home** replacing raw Market Pulse (regime gate + shortlist count + alert badge + top names); reuse
  `DailyOverviewDashboardPage` hooks.
- **Breadcrumb system** in `PageHeader` — deep routes have no trail.
- **404 / Not-Found page** inside the layout.
- **Persisted list-state** (sessionStorage) for Today-Review / Watchlist / Portfolio.
- **Canonical stock-route consolidation** (`/research/stocks/:id` → redirect `/stocks/:id?tab=research`).
- **`ScopedCurrencySelect`** + **`ChipTagInput`** shared inputs.
- **`ResearchSupportBanner`** — single dismissible (sessionStorage) banner replacing ~13 scattered disclaimers.

---

## 4. Suggested sequencing

1. **Bugs first** (§2) — small, high-trust; several are silent data-corruption or dead-ends.
2. **The 9 primitives** (§1) — each dedupes dozens of sites; `statusColor`, `format/*`, Toast, `useConfirmDialog`,
   `aria-label` sweep have the highest ratio.
3. **Responsive table strategy + mobile drawer/AppBar.**
4. **Wayfinding** — 404, breadcrumbs, canonical stock route, cockpit home.
5. **A11y depth** — focus management, chart text-alternatives, live regions.

---
---

## Appendix A — Design System & Visual Consistency (line-cited)

### Up/down color semantics
- `SmartMoneyIntelligencePage.tsx:128` [QW] — `x && x < 0 ? error : success`; zero/null falls to green. Use `changeColor()`.
- `TradePlanDetail.tsx:155,147` [QW] — stop=red / target=green hardcoded on the level label; wrong for SHORT plans. Color the signed delta only.
- `PortfolioIntelligencePanel.tsx:102` [QW] — `unrealizedPnLPercent` has no color; inconsistent with `SummaryCard` tone. Apply `changeColor()`.
- `MarketIntelligencePages.tsx:634` [QW] — A/D ratio `<1` uses `warning.main` (amber) not `error.main`.

### Chip/Badge/status color — multiple sources of truth [RD]
~14 independent `statusColor`/`colorFor`/`severityColor`/`decisionColor` functions: `StatusBadge.tsx` (exported, only
used by `InstrumentDetailPage:61`), `PortfolioIntelligencePanel:46,52,58`, `DataQualityEnginePage:75`,
`InstrumentDetailPage:61`, `MarketDataStatusPanel:29`, `MarketContextPage:12`, `MarketRegimeWidget:5` (byte-for-byte
dup of the former), `SignalBadge:5`, `ResearchOverviewPage:703`, `ResearchDrilldownTabs:639`,
`SmartMoneyIntelligencePage:34`, `NotificationsDeliveryPage:30`, `AiInvestmentCopilotPage:27`, `TradePlanDetail:25`,
`TradePlanDashboard:18`, `AlertsMonitoringPage:31`.
- Fix: `shared/components/statusColor.ts` split into `regimeColor` / `signalDirectionColor` / `statusColor` (set-based,
  extend `StatusBadge`) / `severityColor`; delete locals.
- `sectorStatusSx` (`SmartMoney:46-55`, hex 5-band) vs `ResearchDrilldownTabs:639` (3-value palette strings) → same
  sector status renders differently per page. Extract one `SectorFlowChip`.

### Typography scale
- `MarketContextPage.tsx:117`, `PortfolioIntelligencePanel.tsx:186` [QW] — `variant="h3"` (~48px, off-token) for score
  kickers. Introduce a `kpi` token / `<KpiNumber>`.
- `DailyOverviewDashboardPage.tsx:94` [QW] — ad-hoc `fontSize:{xs:26,md:32}` override on `h4`; use `PageHeader`.
- `SignalTable.tsx:41,47,53` [QW] — `subtitle2` + hardcoded `'orange'`/`'#4caf50'`/`'#f44336'`. Use `caption` + palette.
- `InstrumentDetailPage.tsx:200` [QW] — `h6` + `fontSize:14` monospace override; use `body2`.
- 15+ sub-pixel hardcoded font sizes (`fontSize:10`/`'0.65rem'`/`'0.6rem'`): `SignalCard:61`, `SignalTable:134`,
  `BulkBlockDealsWidget:163`, `SignalTrackRecordPanel:125,158,270,274`, `MarketIntelligencePages:1013`,
  `StockResearchWorkbenchPage:359,615`, `ResearchOverviewPage:413,621`. Add a `micro` token.

### Spacing / padding
- [RD] Two competing page-padding systems: `.page-container` CSS class (`index.css:22`, 16px mobile/24px desktop) vs
  inline `sx={{p:3, maxWidth, mx:'auto'}}` (15+ pages, 24px fixed, no mobile scaling). Standardize on the class / a
  `PageShell`.
- [QW] Card padding `p:1.5`/`p:2`/`p:3` with no semantic rule. Tokenize `cardPadding`/`panelPadding`.
- [QW] `BacktestingStrategyLabPage.tsx:217` `maxWidth:1280` (no centering); `SubscriptionBillingPage.tsx:28`
  `maxWidth:1180`; neither matches the theme `containerTiers`.

### Dark/light parity
- `SmartMoneyIntelligencePage.tsx:46-55` [RD] — hex band colors break light-mode contrast. Use `alpha(palette.*, n)` + mode.
- `BacktestingStrategyLabPage.tsx:847-853` [QW] — hex heatmap, no mode adaptation.
- `index.css:88` [QW] — `.spinner` `#2563eb` legacy color (likely dead CSS); remove.
- `TradePlanDetail.tsx:139,148,157` [QW] — `bgcolor:'action.hover'` pills differ greatly across modes; use outlined Chip.

### Reuse vs duplication [RD]
- Raw `Table` re-implemented instead of `DataTable`: `MarketContextPage` (CapBandBreadth), `FiiDiiActivityWidget`,
  `BulkBlockDealsWidget`, `SmartMoneyIntelligencePage` (SectorView), `ResearchDrilldownTabs` (FlowTabPanel),
  `DailyOverviewDashboardPage:222`.
- `Metric` card defined locally in both `MarketContextPage:14` and `SmartMoneyIntelligencePage:384` → `MetricCard`.
- Panel-title pattern copy-pasted (`MarketIntelligencePages` SectionHeader, `ResearchOverviewPage` inline h6,
  `StrategyDecisionDashboard` h6) → `PanelHeader`.
- `colorFor` duplicated `MarketContextPage:12` / `MarketRegimeWidget:5` → hoist to feature `utils.ts`.

**Recommended tokens/primitives:** `typography.micro`, `typography.kpi`, `density.cardPadding/panelPadding`,
`MetricCard`, `PanelHeader`, `statusColor.ts`, `SectorFlowChip`, page-container discipline.

---

## Appendix B — Accessibility (WCAG, line-cited)

### Keyboard operability
- `MarketDataOpsEvidence.tsx:222` [High, 2.1.1/4.1.2] — clickable `TableRow`, no `role`/`tabIndex`/`onKeyDown`.
- `DataTable.tsx:137-148` [High] — shared clickable rows lack keyboard support → affects every `onRowClick` consumer.
- `SignalTrackRecordPanel.tsx:254-259,362-367` [Med] — `role="button"`+`aria-expanded` but no `onKeyDown`/`tabIndex`.
- `MarketContextPage.tsx:132-145` [Med] — sector cards have `role="button"`+`aria-label` but no `tabIndex`/`onKeyDown`.

### Icon-only controls without accessible names [High, 4.1.2]
~35+ IconButtons rely on MUI Tooltip `title` (not injected as accessible name): `AlertsMonitoringPage:158,164,170,202,207`,
`SignalCard:87,92,97,102`, `SignalTable:263,268,275,280,286,291,296`, `BacktestingStrategyLabPage:396,401,450,455,690`,
`DataQualityEnginePage:276,281`, `MarketDataFoundationPage:1037`, `PortfolioIntelligencePanel:35,90,129`,
`ResearchOverviewPage:431`, `SignalCalibrationEnginePage:246`. Plus `NavigationLayout.tsx:188` logout uses `title=`,
and `:101,104,162` drawer toggles have no name. Fix: add `aria-label` directly to each.

### Color-only meaning [1.4.1]
- Daily change red/green typography `SignalTable:194`, `SmartMoneyIntelligencePage:128` — add arrow icon.
- `FiiDiiActivityWidget.tsx:196-202,214-220` & `BulkBlockDealsWidget.tsx:154,190-193` — buy/sell icons unlabeled.
- `BacktestingStrategyLabPage.tsx:838-907` [High, 1.4.1/1.4.11] — heatmap color is sole magnitude signal; add legend + cell `aria-label`.
- `BacktestingStrategyLabPage:716`, `SignalTrackRecordPanel:117,131,139`, `ResearchDrilldownTabs:228,240` — color-only.

### Focus management
- `NavigationLayout.tsx` [High, 2.4.3] — no focus move on route change; SR users re-traverse every page.
- `SignalTable.tsx:324-329`, `DataQualityEnginePage.tsx:440-444` [High] — Drawer opens without focusing its heading.
- Dialogs (`CreateAlertDialog:82`, `PortfolioManagementPage:564`, `DailyOverviewDashboardPage:333`,
  `HistoricalContextSnapshotsPage:228`) [Med] — no `aria-describedby` linking body text.
- [High, 2.4.1] No skip-to-content link; `Box component="main"` (`NavigationLayout:195`) has no `id`.

### Form labeling
- FormControl `Select`s with `InputLabel` lacking `id`/`labelId` [High, 1.3.1/4.1.2]:
  `BacktestingStrategyLabPage:252,260,266,309,321,331,368`, `StrategyFrameworkPage:285,297,312`,
  `TradePlanDashboard:243,345`.
- `AddInstrumentPage:74,81,88,95` [Med] — `required` not announced; error Alert not field-associated.
- `CreateAlertDialog:143-150` [Med] — threshold error not in a live region.

### Live regions [High, 4.1.3]
- Snackbar success/error Alerts (`SignalCard:133,138`, `SignalTable:489,494`, `WatchlistManagementPage:331`) have no
  `role="status"`/`aria-live` → silent to AT. LinearProgress loaders (`DailyOverviewDashboardPage:159,216,285,313`) too.
- `CircularProgress` spinners (`AlertsMonitoringPage:60`, others) [Med] — add `aria-label="Loading…"`.

### Charts [High, 1.1.1]
- No `role="img"`/text alternative: `BacktestingStrategyLabPage:617-629` (equity curve),
  `InstrumentDetailPage:236-244` (prices), `StockResearchWorkbenchPage:408-453` (price+volume+SMA).
- Monthly-returns heatmap `:860-907` — no per-cell `aria-label`.

### Landmarks & headings
- `NavigationLayout:195` [High] — add `id="main-content"` + skip link.
- `:192` [Med] — Drawer `<nav>` unnamed; add `aria-label="Main navigation"`.
- `PageHeader.tsx:58-79` [Med] — title renders `<h4>`, never `<h1>`; heading levels skip. Set `component="h1"`.
- `NavigationLayout:163` [Low] — AppBar title duplicates nav label; `component="span"`/`aria-hidden`.

**Highest-reach fixes:** (1) `aria-label` sweep on all icon buttons; (2) `role="status"`/`role="alert"` on Snackbar children.

---

## Appendix C — Responsive / Mobile (line-cited)

Mobile is a declared target (`index.html` viewport meta). `useMediaQuery` used once (NavigationLayout).

### Wide tables — no mobile strategy
- `DataTable.tsx:78` [QW] — hard `minWidth:900`, no sticky col, no card fallback, `whiteSpace:nowrap`. Breaks <900px.
- `TodayReviewPage.tsx:532-686,841` [QW] — 14+ cols ~2,886px; "hover any clipped cell" impossible on touch. Sticky Symbol; hide ≥8 cols at xs.
- `ActivePositionsTable.tsx:98-165` [QW] — ~1,050px, no column hiding.
- `PipelineOpsTable.tsx:134` [QW] — `minWidth:1320`, 28px expand icon (admin).
- `InstrumentDetailPage.tsx:305-308` [QW] — Fundamentals 1260 / Corp-Actions 1080 / Price 900, no sticky first col.
- `MarketDataOpsEvidence.tsx:175` [QW] — `minWidth:1040` (admin).
- `DailyReviewShortlistPage.tsx:167-218` [QW] — **no `overflowX` guard, no `minWidth`** → page overflow on mobile.
- `SmartMoneyIntelligencePage.tsx:293` [RD] — SectorView no `minWidth`; sector text wraps <480px.
- `PortfolioManagementPage.tsx:409-461,444` [QW] — Holdings no `minWidth`; action icons ~28px tall (<44px).

### Grid breakpoints
- `MarketContextPage.tsx:153` [RD] — hardcoded `repeat(2,1fr)`, no xs override.
- `StrategyDecisionDashboard.tsx:677-706` [RD] — `xs={4}` triple-column ~118px cells on phones.
- `StockResearchWorkbenchPage.tsx:409` [QW] — ResponsiveContainer may collapse to 0 height at xs if parent has none.

### AppBar / nav / touch (`NavigationLayout.tsx`)
- `:166-175` [QW] — capital-posture Chip always rendered, no xs hide → toolbar overflow <sm.
- `:179-188` [QW] — theme Switch (~20px) and logout IconButton (~28px) below 44px touch min.
- `:125-144` [QW] — **temporary drawer doesn't close on nav-item tap**; add `onClick={()=>isMobile&&setOpen(false)}`.
- `DataTable.tsx:49,80` [QW] — compact rows ~39px tap height; add a mobile density.

### Charts — all 3 use `ResponsiveContainer width="100%"` correctly. [OK]

### Dialogs — none use `fullScreen` at xs [RD]; `maxWidth="md" fullWidth` is dense on phones. Add `fullScreen={isMobile}`.

---

## Appendix D — Journeys & Wayfinding (line-cited)

### Morning routine
- F1.1 [QW] — `HomePage.tsx:1` is raw `MarketPulsePage`; no go/no-go cockpit.
- F1.2 [QW] — `/daily-overview` and `/daily-review-shortlist` overlap, zero cross-links.
- F1.3 [QW] — `/market-pulse` and `/` both render MarketPulse; no `<Navigate>` canonicalization → bookmark drift.

### Idea lifecycle
- F2.1 [QW] — Stock Interest Radar rows only have "Open" (`MarketIntelligencePages:1001`); no Add-to-Watchlist/Set-Alert.
- F2.2 [QW] — Earnings table same (no watchlist/alert/today-review path).
- F2.3 [RD] — Alert context link → `/research/stocks/:id` (standalone), not the workspace (`AlertsMonitoringPage:32`).
- F2.4 [QW] — Watchlist → portfolio has no "create position" shortcut.

### Drill-down round trips
- F3.1 [RD] — `StockResearchWorkbenchPage:230` hardcoded `navigate('/research')` strands alert/signal arrivals.
- F3.2 [RD] — `TodayReviewCandidateDetailPage:77-78` hardcoded `backTo="/today-review"` regardless of origin.
- F3.3 [RD bug] — `:242` `to={/stocks/${candidate.symbol}}` (symbol, not id) → silent bad-ID load.
- F3.4 [RD] — Today-Review tab/sort/filter/page lost on back.
- F3.5 [RD] — Peer nav → `/research/stocks/:id` (`:542`), back strands mid-workbench.

### Cross-surface duplication
- F4.1 [RD] — 3 surfaces for one stock: `/stocks/:id?tab=research` vs `/research/stocks/:id` vs `/stocks/:id`. Linkers
  diverge (`AlertsMonitoringPage:32`, `SignalTable:120`, `StrategyDecisionDashboard:276,444,464`,
  `InstrumentDetailPage:173`, `MarketIntelligencePages:1001`). Consolidate on `/stocks/:id`.
- F4.2 [RD bug] — double `PageHeader` (`UnifiedStockPage:89` + `InstrumentDetailPage:170`).
- F4.3 [RD] — module tabs link to non-namespaced operator routes; no "back to SYMBOL workspace".

### Wayfinding
- F5.1 [QW] — no `<Breadcrumbs>` anywhere.
- F5.2 [QW bug] — no `path:'*'` catch-all → blank screen on bad URLs.
- F5.3 [QW] — `/market-pulse` linked (`ResearchDrilldownTabs:128,256`) but not canonicalized.
- F5.4 [QW] — AppBar title can't reflect current instrument; no `usePageTitle`.
- F5.5 [RD] — shortlist `detailPath` produces 3 URL shapes (service `:479/545/598`).
- F5.6 [QW] — compatibility routes (`/indices`,`/breadth`,…) are dead ends; redirect.
- F5.7 [RD/OK] — `UnifiedStockPage:96` URL-persists tab (good pattern to extend).

### Nav IA & hidden items
- F6.1 [QW] — 13-item flat group; sub-group into Orientation/Discovery/Personal/Support.
- F6.2 [QW] — Alerts & Notifications share `NotificationsNoneIcon`; Notifications has no badge.
- F6.3 [QW] — Account reachable only via avatar (which logs out); not in nav.
- F6.4 [QW] — `DailyOverviewDashboardPage:245,466` candidate dialog has no link to candidate detail.
- F6.5 [QW bug] — `ResearchOverviewPage:634` chip → `/stocks/${symbol}` (symbol not id).
- F6.6 [QW bug] — `ResearchOverviewPage:654` → `/admin/strategy-evaluation` (route doesn't exist).

**New connective elements:** cockpit home; `<PageBreadcrumbs>`; persisted list-state; canonical `/stocks/:id`
consolidation; `NotFoundPage`.

---

## Appendix E — Data Formatting & Trust (line-cited)

### Indian number conventions
`money.ts` (`inr`/`inrCompact`) exists but bypassed by 11 helpers [QW]: `MarketDataFoundationPage:69`
(`formatMarketCap`, undefined-locale compact), `InstrumentDetailPage:72` (`formatNumber`), `SignalCard:20-24`,
`SignalTable:24`, `SmartMoneyIntelligencePage:70` (`fmtVolume` `en-US` compact → "12M" not "1.2 Cr"). Add `inrCount`.

### Currency / USD leakage [QW/RD]
`SignalCard:22`, `SignalTable:24`, `AddSignalToPortfolioDialog:47`, `AddInstrumentPage:19` default `'USD'`;
`TradePlanTable:34`/`TradePlanDetail:15` fall back to USD when snapshot currency missing;
`TodayReviewPage:1243`/`TodayReviewCandidateDetailPage:368-369` `formatCurrency` returns `"INR 1420.90"` (code, not ₹).

### Date/time & timezone [QW/RD]
No `Asia/Kolkata`/`IST`/`+0530` anywhere. ~35 inline `toLocaleString()` (e.g. `MarketContextPage:29`,
`TodayReviewPage:1227`, `SignalCard:16`, `SignalTable:256`, `ResearchOverviewPage:134,405`,
`BacktestingStrategyLabPage:433,518` en-GB). No relative timestamps. (`PipelineStatusStrip:61-71` is the good pattern.)

### Freshness — 3+ paths [RD]
`marketIntelligenceService.ts:136-146` (`deriveFreshness`), `MarketIntelligencePages.tsx:442-453`
(`computeIndexFreshness`, dup), `StalenessBadge.tsx` (cleanest), and raw `row.freshness` pass-through
(`MarketIntelligencePages:999/1048/1070/1088/1104/1121`). Centralize `computeFreshness(dataThrough, latestTrading)`.

### Score explainability [QW]
Bare numbers, no scale/legend: `MarketRegimeWidget:40`/`MarketContextPage:117` (h3 score),
`TodayReviewCandidateDetailPage:157-163` (sub-scores 0/1/2/3), `StrategyDecisionDashboard:282` (no `/100`) vs `:638`
(`/100`), `DailyOverviewDashboardPage:257`, `SignalWidget:29,37`, `WatchlistManagementPage:157`,
`ResearchOverviewPage:445`, `SignalQualityLabPage:546`, `HistoricalContextSnapshotsPage:182,199`. (`DataQualityEngine:134-145` clamps+bar = best.) Add `fmtScore`.

### Disclaimer fatigue [RD]
~13 standalone placements across 10 pages: `AiInvestmentCopilotPage:65,171` (two in one view),
`SignalCalibrationEnginePage:322`, `BacktestingStrategyLabPage:773`, `TradePlanDashboard:237`,
`TodayReviewCandidateDetailPage:127`, `PortfolioManagementPage:382`, `StrategyDecisionDashboard:320`,
`StrategyFrameworkPage:149`, `SignalTrackRecordPanel:409`, `SignalQualityLabPage:95,166,297,376` (×4).
No imperative Buy/Sell found in rendered copy (FII/DII "Buy/Sell" labels are domain data, acceptable).
Fix: one dismissible `<ResearchSupportBanner/>`.

### Number polish [QW]
`StockResearchWorkbenchPage:503` `peer_count+1` → "3 of NaN"; undefined-locale `Intl.NumberFormat()` at
`MarketIntelligencePages:758,1258`, `DailyReviewShortlistPage:404`, `TodayReviewPage:1231` (`||0` masks missing),
`DailyOverviewDashboardPage:482`; `toLocaleString()` no-locale `SignalQualityLabPage:56`, `MarketIntelligencePages:639`;
sign/precision inconsistency (3 patterns); `ResearchDrilldownTabs:208` no `+` on zero.

**Proposed `shared/format` API:** extend `money` (`inrCount`); add `percent` (`fmtPct{sign,decimals}`),
`dates` (`fmtDate` UTC trading-date / `fmtDateTime` IST / `fmtRelative`), `freshness` (`computeFreshness`),
`score` (`fmtScore{outOf}`).

---

## Appendix F — Forms, Validation & Feedback (line-cited)

### Validation
- V-1 [QW] `PortfolioManagementPage:211-260` — numeric fields plain text, no `type=number`/min/field error; one shared Alert.
- V-2 [QW] `CreateAlertDialog:148-149` — threshold error hidden until dirty; button just disabled.
- V-3 [QW] `CreateAlertDialog:143-150` — "Threshold" no unit/min/max/step (₹ vs % vs 0–100).
- V-4 [QW] `CreateAlertDialog:88-111` — Scope×Type mismatches allowed; API rejects silently.
- V-5 [QW] `PortfolioManagementPage:79-98,479-522` — qty/price/amount strings; no qty×price cross-check.
- V-6 [QW] `AddSignalToPortfolioDialog:68-85` — sequential guard validation hides later errors.
- V-7 [QW] `BacktestingStrategyLabPage:274,341,374` — capital fields no currency hint/min.
- V-8 [QW] `LoginPage:31-33`/`SignupPage` — no `<form onSubmit>` (no Enter-to-submit).
- V-9 [QW] `SignupPage:33` — static password helper, no `error` state.
- V-10 [QW] `AccountPage:10-17` — no success feedback after `updateName`.

### Defaults & units
- D-1 [QW] `AddInstrumentPage:19` — `currency:'USD'` default.
- D-2 [QW] `AddSignalToPortfolioDialog:47,57` — `signal.currency||'USD'`.
- D-3 [QW] `SignalCard:22`/`SignalTable:24` — USD fallback.
- D-4 [QW] `NotificationsDeliveryPage:150-161` — quiet-hours free-text; PATCH per keystroke; use `type=time`+onBlur.

### Destructive-action safety (no confirmation) [RD]
DS-1 `PortfolioManagementPage:449-454` (remove holding) · DS-2 `AlertsMonitoringPage:207` (delete rule) ·
DS-3 `:170` (dismiss event) · DS-4 `:135` (mark all read) · DS-5 `WatchlistManagementPage:198-203` (remove item) ·
DS-6 `BacktestingStrategyLabPage:401` (delete strategy) · DS-7 `:455` (delete run) ·
DS-8 `SubscriptionBillingPage:58`→`useSubscriptionBilling:28-39` (plan change/downgrade).

### Feedback
- F-1 [QW] `App.tsx` — no global Snackbar/Toast provider; mutations succeed silently.
- F-2 [QW] `PortfolioManagementPage:193-260` — zero success feedback on create/add/edit/transaction.
- F-3 [QW] `NotificationsDeliveryPage:144-147` — per-switch PATCH, global `saving`, no per-switch loading/error.
- F-4 [QW] persistent in-page success Alerts that scroll off: `NotificationsDeliveryPage:135`, `TradePlanDashboard:273`,
  `TodayReviewPage:733`, `HistoricalContextSnapshotsPage:123`, `MarketDataFoundationPage:1258`,
  `SignalCalibrationEnginePage:305`.
- F-5 [QW] `NotificationsDeliveryPage:154,161` — API call per keystroke.
- F-6 [QW] `SignalCard:133-142`/`SignalTable:489-498` — local Snackbars can double-stack.

### Constrained inputs
- CI-1 `SignalsDashboardPage:316-317` (Sector/Country free-text) · CI-2 `:315` (Signal type free-text) ·
  CI-3 `:314` (Min score free-text) · CI-4 `PortfolioManagementPage:481,526`/`AddSignalToPortfolioDialog:133`
  (currency free-text) · CI-5 `AddInstrumentPage:87-96` (Exchange free-text, "NASDAQ" placeholder) ·
  CI-6 (Scope×Type, see V-4) · CI-7 `AddToWatchlistDialog:104`/`WatchlistManagementPage:178` (tags comma string).

### Layout patterns
- L-1 [QW] always-visible create forms compete with content (`PortfolioManagementPage:318-328`,
  `WatchlistManagementPage:249-255`).
- L-2 [QW] edit vs create holding visually identical (`PortfolioManagementPage:465-491`).
- L-3 [QW] transaction form permanently above the log (`:503-529`).
- L-4 [QW] dialog-vs-inline inconsistency app-wide.
- L-5 [QW] `AlertsMonitoringPage:82-90` evaluate message as scroll-away Alert.

**Proposed building blocks:** `useConfirmDialog`, `ToastContext`/`useToast`, `NumberField`, `ScopedCurrencySelect`,
`ChipTagInput`, and a touched-set validation convention (reveal all errors on submit).
