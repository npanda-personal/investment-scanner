# Current-State Audit

This audit is based on root `AGENTS.md`, current source structure, Prisma schema, route registries, package files, visible tests, shared files, and git status. Historical planning docs are not treated as authority.

## Repository Shape

- Backend: Node.js, Express, TypeScript, Prisma.
- Frontend: React, Vite, TypeScript.
- Database approach: Prisma with PostgreSQL datasource in `backend/prisma/schema.prisma`.
- Backend route registry: `backend/src/api/routes.ts`.
- Frontend route registry: `frontend/src/app/routes.tsx`.
- Shared backend utilities: `backend/src/shared`.
- Shared frontend components/hooks/theme: `frontend/src/shared`.

## Current Backend Modules

`ai-investment-copilot`, `alerts-monitoring`, `auth-identity`, `backtesting-strategy-lab`, `data-quality-engine`, `historical-context-snapshots`, `market-context-intelligence`, `market-data-foundation`, `notifications-delivery`, `portfolio-intelligence`, `portfolio-management`, `research-hub`, `signal-calibration-engine`, `signal-generation-engine`, `signal-quality-lab`, `smart-money-intelligence`, `stock-research-workbench`, `strategy-decision-engine`, `strategy-framework`, `subscription-billing`, `today-trade-review`, `trade-plan-risk-engine`, `watchlist-management`.

Classification: usable, with structure deviations in `research-hub` and `today-trade-review` that need Architect review before hardening.

## Current Frontend Features

The frontend feature list mirrors the backend module list. Most features include `api`, `components`, `hooks`, `routes.tsx`, and `types.ts`.

Classification: usable, with some feature-structure variance that should be audited before broad UI implementation.

## Prisma Models Observed

Key models include `PriceTick`, `LatestPrice`, `Stock`, `MarketDataRepairAttempt`, `MarketDataRepairState`, `MarketDataRepairRun`, `SignalResult`, `SignalGenerationRun`, `SignalCalibrationResult`, `DataQualityEvaluation`, `Portfolio`, `Watchlist`, `AlertRule`, `BacktestRun`, `AppUser`, `MarketContextSnapshot`, `SmartMoneyContextSnapshot`, `DataQualitySnapshot`, `MarketDataSyncState`, `StrategyDecisionResult`, `StrategyDefinition`, `StrategyPerformanceSummary`, `TradePlanResult`, `TodayReviewRun`, and `TodayReviewCandidate`.

Classification: usable and high-risk. Schema changes require Architect and Product Owner approval.

## Market Data And Data Quality

- `market-data-foundation` owns instruments, provider paths, OHLC/price data, catalog/import/repair concerns, and scheduler behavior.
- `data-quality-engine` owns readiness-style evaluations.
- Current git status shows many modified Market Data files and tests plus an untracked Angel One provider file.

Classification: usable but risky. It is the first area to revalidate before downstream signal, strategy, backtest, trade-plan, and copilot work.

## Strategy, Signal, Quality, Calibration, Backtesting, Risk

- `strategy-framework` exists and appears to own strategy definitions/evaluation concepts.
- `signal-generation-engine`, `signal-quality-lab`, `signal-calibration-engine`, `strategy-decision-engine`, `backtesting-strategy-lab`, and `trade-plan-risk-engine` are present with tests.
- Trigger/rule/data-quality contract alignment must be audited before new parallel implementation.

Classification: usable, needs contract validation.

## Portfolio, Watchlists, Alerts, Auth, Subscription, Notifications

Dedicated modules and frontend features exist for user-owned workflows, alerts, auth, subscriptions, and notifications.

Classification: usable, needs auth/user-owned data filtering validation before user-facing hardening.

## AI Copilot

Dedicated backend/frontend module exists. It must remain deterministic and cost-free by default and must not call paid or hidden LLM services.

Classification: usable, needs review.

## Tests And Build Files

- Backend package scripts: `build`, `test`, Prisma commands.
- Frontend package scripts: `build`, `lint`, `test:ui`.
- Backend Jest tests exist per module.
- Frontend Playwright specs exist under `frontend/tests/ui`.
- CI exists under `.github/workflows/ci.yml`.

Classification: usable but needs QA baseline review. Frontend CI expectations should be checked because `frontend/package.json` exposes `test:ui`, not a generic `test` script.

## Missing Or Risky Pieces

- Current worktree is dirty and blocks safe implementation assignment.
- Root `AGENTS.md` is untracked.
- `docs/AGENTS.md` is tracked but deleted.
- Market Data changes are broad and affect source, tests, docs, scheduler, and frontend UI.
- Data-quality trust must be proven before downstream trigger workflows resume.
- Old historical planning files are modified and must not be used as current authority.
