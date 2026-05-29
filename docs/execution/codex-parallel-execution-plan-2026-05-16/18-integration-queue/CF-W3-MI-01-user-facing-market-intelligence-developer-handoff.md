# Developer Handoff: User-Facing Market Intelligence Implementation

Date: 2026-05-29
Work item: Trader-facing market intelligence UX and user/admin segregation
Owner: Codex fullstack lead
State: Implemented, pending review/signoff

## Files Changed

Frontend app shell:
- `frontend/src/app/HomePage.tsx`
- `frontend/src/app/NavigationLayout.tsx`
- `frontend/src/app/navigationMetadata.tsx`
- `frontend/src/app/routes.tsx`

New user-facing feature:
- `frontend/src/features/market-intelligence/index.ts`
- `frontend/src/features/market-intelligence/routes.tsx`
- `frontend/src/features/market-intelligence/types.ts`
- `frontend/src/features/market-intelligence/api/marketIntelligenceService.ts`
- `frontend/src/features/market-intelligence/hooks/useMarketIntelligenceSnapshot.ts`
- `frontend/src/features/market-intelligence/components/MarketIntelligencePages.tsx`

User-facing cleanup:
- `frontend/src/features/today-trade-review/components/TodayReviewPage.tsx`
- `frontend/src/features/today-trade-review/components/TodayReviewCandidateDetailPage.tsx`
- `frontend/src/features/market-data-foundation/components/InstrumentDetailPage.tsx`
- `frontend/src/features/market-data-foundation/components/UnifiedStockPage.tsx`
- `frontend/src/features/research-hub/components/ResearchOverviewPage.tsx`
- `frontend/src/features/signal-position-ledger/components/SignalPositionLedgerPage.tsx`
- `frontend/src/features/alerts-monitoring/components/AlertsMonitoringPage.tsx`
- `frontend/src/features/ai-investment-copilot/components/AiInvestmentCopilotPage.tsx`

Tests:
- `frontend/tests/ui/daily-overview-dashboard.spec.ts`
- `frontend/tests/ui/research-hub.spec.ts`
- `frontend/tests/ui/today-trade-review.spec.ts`
- `frontend/tests/ui/user-admin-route-segregation.spec.ts`

Requirements/docs:
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W3-MI-01-user-facing-market-intelligence-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/05-ux/CF-W3-MI-01-market-intelligence-ux.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W3-MI-01-user-admin-market-intelligence-architecture.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W3-MI-01-user-admin-market-intelligence-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W3-MI-01-user-facing-market-intelligence-ui-qa-evidence.md`

Note: these active execution docs were copied from temporary untracked files under `docs/codex-agent-team-plan/`. The active execution paths above are the source of record for this work item.

## Behavior Changed

- `/` now opens Market Pulse instead of the old Daily Overview page.
- New user pages were added:
  - `/market-pulse`
  - `/indices`
  - `/breadth`
  - `/institutional-flow`
  - `/derivatives-context`
  - `/market-map`
- Primary trader navigation now emphasizes market context, daily review, research, portfolios, watchlists, and alerts.
- Operator/data-production pages are available under `/admin/*` navigation and also remain as hidden legacy direct routes for compatibility.
- Today Review was renamed Daily Review in the UI and no longer exposes a user-facing run button.
- Instrument Workspace no longer exposes market-data sync from the user workflow.
- Research Hub drilldowns now point to market-intelligence pages instead of signal/strategy/operator dashboards.
- Signal Position Ledger was moved out of trader navigation because the current active read can materialize data server-side.
- Derivatives Context is present as a read-only approval-gated page with F&O eligibility display only.

## Contracts Changed

- No backend contract changes.
- No Prisma schema changes.
- No package changes.
- New frontend-only read composition uses existing endpoints:
  - `GET /api/v1/today-review/latest`
  - `GET /api/v1/market-data/movers`
  - `GET /api/v1/market-data/universe/health`
  - `GET /api/v1/instruments`
- User-facing Market Pulse intentionally does not call `GET /api/v1/market-context/summary` because backend audit found that endpoint can materialize a snapshot when missing.

## Validation

- `npm.cmd run build` from `frontend` passed.
- Focused Playwright smoke passed:
  - `npm.cmd run test:ui -- today-trade-review.spec.ts user-admin-route-segregation.spec.ts daily-overview-dashboard.spec.ts research-hub.spec.ts --workers=1 --project=chromium --reporter=list`
  - Result: 11 passed.
- Source scan found no prohibited direct-advice/run/generate/sync wording in the updated trader-facing surfaces scanned.

## Skipped Or Blocked

- `npm.cmd run lint` is blocked by repo configuration: ESLint 9 cannot find `eslint.config.*`.
- Backend build/tests were not run because no backend code changed.
- Full UI regression was not run due scope; focused smoke covered changed routes/pages.

## Risks

- `/admin/*` is a frontend segregation layer, not backend authorization. Backend write endpoints still need role/access enforcement if this becomes multi-user.
- Some legacy direct operator routes remain accessible for compatibility. They are removed from primary trader navigation but not deleted.
- Full index membership, official breadth, FII/DII, derivatives, and market-map snapshots still need backend read models before full product acceptance.
- Signal Position Ledger needs a persisted-only read endpoint before it can safely return to trader navigation.

## Next Gate

Code review, architecture signoff, QA review, and Product Owner UX acceptance.
