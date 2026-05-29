# QA Evidence: User-Facing Market Intelligence UI

Date: 2026-05-29
Work item: Trader-facing market intelligence UX and user/admin segregation
QA state: Focused smoke passed; full regression not run

## Commands Run

```powershell
cd frontend
npm.cmd run build
```

Result: Passed.

```powershell
cd frontend
npm.cmd run test:ui -- today-trade-review.spec.ts user-admin-route-segregation.spec.ts daily-overview-dashboard.spec.ts research-hub.spec.ts --workers=1 --project=chromium --reporter=list
```

Result: 11 passed.

Team 00 re-run on active working tree:

```powershell
cd frontend
npm.cmd run build
```

Result: Passed on 2026-05-29 during gate review.

## Blocked Checks

```powershell
cd frontend
npm.cmd run lint
```

Result: Blocked by repository configuration.

Blocker:
- ESLint 9 expects `eslint.config.*`.
- The repo does not currently provide an ESLint 9 flat config.

## Evidence Covered

- Market Pulse loads from mocked persisted/read-only endpoints.
- Market Pulse does not call `GET /api/v1/market-context/summary`.
- Market Pulse shows missing states for index snapshot, official breadth, institutional flow, and derivatives context.
- Daily Review has no user-facing run action and shows Admin / Data Ops ownership when no persisted snapshot exists.
- Daily Review candidate table and detail flows continue to work.
- Research Hub drilldowns route users to market-intelligence pages instead of operator dashboards.
- Primary navigation has user routes for Market Pulse, Market Map, Indices, Breadth, Institutional Flow, Derivatives Context, Research Workbench, Portfolios, Watchlists, and Alerts.
- Direct trader nav links to `/pipeline-ops`, `/market-data-foundation`, `/signals`, `/signals/calibration`, `/backtests`, and `/trade-plans` are absent.
- Admin navigation exposes operator routes under `/admin/*`.

## Known Gaps

- Full regression suite was not run.
- Individual route-load/empty-state smoke coverage is still needed for `/indices`, `/breadth`, `/institutional-flow`, `/derivatives-context`, and `/market-map`.
- Signal Position Ledger nav segregation should be asserted explicitly: absent from primary trader nav and present under `/admin/signal-position-ledger`.
- Backend access control was not changed.
- New snapshot models are not implemented yet.
- Derivatives Context remains approval-gated.
