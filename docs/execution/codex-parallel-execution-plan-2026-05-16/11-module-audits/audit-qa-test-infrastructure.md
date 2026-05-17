# Audit: QA / Test Infrastructure

Date: 2026-05-17

Mode: Local read-only Audit Team G fallback because subagent thread limit was reached.

## Scope Inspected

- `backend/tests/**`
- `frontend/tests/ui/**`
- `backend/package.json`
- `frontend/package.json`
- `.github/workflows/ci.yml`
- active execution docs

No tests, builds, servers, providers, staging, commits, or file edits were run during this audit.

## Findings

- Backend has broad module-level Jest coverage across Market Data, Data Quality, Signal Generation, Strategy Framework, Signal Quality, Signal Calibration, Backtesting, Trade Plan, Portfolio, Watchlist, Alerts, Copilot, Auth, Subscription, Notifications, and related modules.
- Recent accepted invariant tests exist for Data Quality, Market Data readiness evidence, Market Data storage readiness, and strict Signal Generation DQ filtering.
- Frontend has Playwright smoke coverage for Market Data, Data Quality, Signal Generation, Signal Quality, Signal Calibration, Strategy Framework, Strategy Decision, Backtesting, Market Context, Historical Context, Smart Money, Research Hub, Today Trade Review, and Trade Plan.
- Direct UI smoke coverage for AI Investment Copilot and Stock Research Workbench trust/readiness states was not found in the inspected test list.
- `backend/package.json` exposes `npm test` only; focused Jest patterns are supported through `npm test -- <pattern>`.
- `frontend/package.json` exposes `npm run test:ui`; Playwright tests must be treated as service/browser-dependent and not run unless explicitly approved.
- Prior focused Jest runs in this environment can fail inside the sandbox with `spawn EPERM`; rerunning the exact focused command outside the sandbox has been required for accepted test evidence.
- Full backend or UI suites are too broad for autonomous small waves unless resource gates and provider-safety are explicitly approved.
- Existing frontend regression notes already warn not to run provider-heavy/full-universe workflows in automated UI suites.

## Safe Commands By Module

Backend focused command pattern:

```text
cd backend
npm test -- <test-file-or-pattern>
```

Safe only when test files use mocked/local data and no live provider, startup, service, Prisma, package, route registry, or shared-file stop condition applies.

Frontend UI command pattern:

```text
cd frontend
npm run test:ui -- <spec-file> --workers=1
```

Run only with explicit approval because it starts browser automation and typically requires local app services.

## Candidate Stories

- `CF-W1-QA-01`: Create module-safe focused test command matrix.
- `CF-W1-QA-02`: Add Copilot and Stock Research Workbench UI smoke plans before UI implementation.
- `CF-W1-QA-03`: Add standard evidence template for sandbox `spawn EPERM` fallback handling.
- `CF-W1-QA-04`: Define resource gate checklist before broader backend or Playwright test runs.

