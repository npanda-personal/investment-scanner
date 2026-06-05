# Frontend Audit + UX Review — 2026-06-05

7-agent audit (3 user-facing, 3 admin-facing, 1 whole-app UX) of the React/MUI app, combining the
real source with live-API verification. ~80 findings. This is the synthesis + fix plan.

## Cross-cutting themes (highest leverage)

1. **The trust-critical calibration layer is invisible in the UI.** Backend #30 added `calibratedScore`,
   `reliabilityTier`, `calibrationStatus`, `lifecycleState`, and a `signalEvidence` block to signal/workbench
   reads — but the FRONTEND types omit them, so they're silently dropped. Every signal shows the **raw** score
   only (SignalTable/SignalCard/SignalWidget/stock page). Add the fields to FE types + render (calibrated vs raw,
   FULL/PARTIAL tier, track-record). HIGH, mostly S.
2. **Capital Posture / market regime is computed but never surfaced to the trader.** `/market-context/capital-posture`
   returns posture + exposure band + regimeGate; `marketPosture` is on the today-review/portfolio responses. No
   `fetchCapitalPosture`; `marketPosture` omitted from types. Trader job #1 ("is the market healthy?") is
   unanswerable without digging. Add an AppBar regime/posture chip + portfolio header + today-review line.
3. **Currency defaults to USD on an NSE/BSE-only product** (watchlist/portfolio formatters + forms) → INR stocks
   render as "USD 1,520". Default INR (or derive from scope.region). S.
4. **Unbounded backend queries break/slow whole pages** (same class as #51/#52): stock workbench `peerComparison()`
   does `listInstruments({pageSize:10000})` → 500 → the entire `/stocks/:id` research surface is dead; the admin
   `review-readiness-summary` takes 24s and blocks the Data Health tab.
5. **Placeholder/stub UI leaked to production:** "Radar Context: unavailable" card permanently on the main
   today-review page; 4–5 of 8 UnifiedStockPage tabs are blank stubs; portfolio "Intelligence Overlays" is a static
   stub; 3 radar pages are hardcoded "backend not available".
6. **IA/Nav gaps:** the two main daily pages `/today-review` and `/research` are NOT in the sidebar (orphaned);
   the "Daily Review Shortlist" nav points to the stripped 10-slot page, not the real board; 4 near-duplicate radars.
7. **Alerts feature is effectively non-functional from the UI:** no "Evaluate" button (rules never fire), no nav
   unread badge, SIGNAL_DIRECTION_CHANGED type missing from the create dialog.
8. **Unit/format bugs:** `advanceDeclineRatio` run through `formatPercent` (×100 → "+130%"); small-sample win-rates
   shown as peers of large samples; `fetchLatestSignalRun` hardcodes `modelVersion:'signal-engine-v1'` (now v3);
   stale "outcomes not persisted" message.
9. **Missing safety/feedback:** delete (portfolio/watchlist) with no confirmation; silent save failures; no
   retry buttons; no backtest timeout/cancel (hangs forever — ties to #52); destructive/long ops without progress.
10. **Consistency debt:** 3 loading patterns, 3 page-container patterns, copy-pasted formatters across 8+ files,
    duplicate theme toggle, theme not persisted, collapsed sidebar icons have no tooltips.

## Fix waves (assigned to parallel module-cluster agents A–F; high-value/clear items)

- **A — Signals UI** (signal-generation-engine, signal-quality-lab, signal-calibration-engine, signal-position-ledger):
  surface calibratedScore/reliabilityTier/calibrationStatus/lifecycleState in SignalTable/Card/Widget + reliabilityTier
  screener filter; v1→latest run fix; quality-lab show summary.warnings + fix stale "not persisted" msg + raise
  small-sample threshold + label byRegime/byDataQuality empty; calibration raw-score column; render
  SignalPositionSummaryStrip + scope fix.
- **B — Stock workspace** (stock-research-workbench FE+BE, UnifiedStockPage, research-hub): FIX workbench 500
  (peerComparison → sector-filtered query, drop full-universe load); surface signalEvidence/calibration on workbench;
  stub-tab "go to dashboard" links; research-hub whatChanged staleness + run CTA; StrategyDecisionWidget region scope.
- **C — User pages** (watchlist-management, alerts-monitoring, portfolio-management, portfolio-intelligence):
  currency INR; watchlist signal-confidence + one-click "Set Alert" + delete confirm + save error handling;
  alerts "Evaluate Now" + SIGNAL_DIRECTION_CHANGED in dialog + retry + read/unread filter; portfolio delete confirm
  + transaction symbol + zero-holdings empty state + replace Intelligence-Overlays stub with real capital-posture/what-changed.
- **D — Nav/IA + today-review + market-context** (app/navigationMetadata, NavigationLayout, ThemeContext,
  today-trade-review, market-context-intelligence, daily-overview-dashboard, market-intelligence): add /today-review +
  /research to sidebar + rename "Daily Review" + collapsed-icon tooltips + persist theme; AppBar regime/posture chip
  (fetchCapitalPosture); remove "Radar Context: unavailable" card; today-review tab-count bug + candidate watchlist/alert
  shortcuts + marketPosture render; MarketRegimeWidget guard RISK_OFF-with-MISSING; advanceDeclineRatio ratio format;
  market-context refresh + as-of timestamp; radar dead-end → link to working page.
- **E — Strategy/backtest/trade-plan/smart-money/billing** (backtesting-strategy-lab, strategy-decision-engine,
  strategy-framework, trade-plan-risk-engine, smart-money-intelligence, subscription-billing): backtest timeout+cancel
  + realismWarnings as list + benchmark-status tooltip + %-input validation + trade-log pagination + xaxis format +
  CUSTOM_RULES rating note; strategy-decision Actions → /trade-plans/:id + lazy tab load; strategy-framework sign-color
  + draft-reason fix; trade-plan geometry columns + legacy banner; smart-money MISSING above-the-fold banner; billing
  limit warning.
- **F — Admin data/ops** (market-data-foundation page, pipeline-ops, data-quality-engine, historical-context-snapshots):
  un-block review-readiness 24s (lazy, out of Promise.all); pipeline PARTIAL warning + run feedback; add-instrument
  /admin prefix; scope labels on counts; scheduler nextSuggestedRun; filter TEST_ fixtures; historical-context pagination.

## Deferred (larger refactors — tracked, not in this pass)
- Consolidate the 4 radar pages into one tabbed "Market Radars".
- Standardize all pages to shared StatePanels (Loading/Empty/Error) + page-container.
- Centralize formatters (date/percent/currency→INR) in src/shared/utils.
- React Query / SWR caching to kill N+1 fan-outs (daily-review-shortlist 23 fetches, portfolio 5/tab, strategy 6/tab).
- Backend: review-readiness-summary query index/materialization; (and the separately-tracked #51 today-review, #52 backtest perf).
