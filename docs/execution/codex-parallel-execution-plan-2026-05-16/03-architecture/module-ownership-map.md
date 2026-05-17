# Module Ownership Map

Ownership is based on current backend modules and frontend features. A team owns its module/feature paths only. Shared files require explicit Orchestrator and Solution Architect reservation.

## Governance Teams

| Team | Mission | Owned Artifacts | Must Not Do |
|---|---|---|---|
| Delivery Governance / Orchestrator | Intake, WIP, file reservations, handoffs, integration sequencing | Active board, work packets, shared-file reservations | Implement by default or self-approve |
| Product Owner Agent | Product direction, acceptance criteria, language, final acceptance | Product briefs and PO acceptance docs | Implement code |
| UX Agent | UX-before-UI, states, information hierarchy, trust surfaces | UX plans and view-model acceptance criteria | Invent fields not in contracts |
| Solution Architect Agent | Contracts, boundaries, schema strategy, shared-file decisions | Architecture contracts, ADRs, dependency graph | Approve implementation without evidence |
| QA Automation Team | Test plans, verification, evidence, live-data validation | QA plans/evidence | Accept incomplete handoffs |
| Code Review / Lead Validation Team | Correctness, module boundaries, hidden risk | Lead validation docs | Review own implementation |
| Release Audit Team | Release checklist, rollback, local evidence | Release checklist and release notes | Require GitHub push without PO approval |
| Documentation Team | Module docs, stale-doc reports, decision records | Planning docs and module docs | Treat historical docs as authority |

## Module Teams

| Team | Backend Path | Frontend Path | Primary Contracts |
|---|---|---|---|
| Market Data Foundation | `backend/src/modules/market-data-foundation` | `frontend/src/features/market-data-foundation` | instruments, provider metadata, OHLC, price sync, repair, batch status |
| Data Quality Engine | `backend/src/modules/data-quality-engine` | `frontend/src/features/data-quality-engine` | readiness, coverage, liquidity, signal eligibility |
| Indicator / Strategy Framework | `backend/src/modules/strategy-framework` | `frontend/src/features/strategy-framework` | strategy definitions, rule versions, evaluators, performance summaries |
| Signal Generation Engine | `backend/src/modules/signal-generation-engine` | `frontend/src/features/signal-generation-engine` | signal/trigger generation, run audit |
| Signal Quality Lab | `backend/src/modules/signal-quality-lab` | `frontend/src/features/signal-quality-lab` | forward outcome and reliability |
| Signal Calibration Engine | `backend/src/modules/signal-calibration-engine` | `frontend/src/features/signal-calibration-engine` | calibrated score/confidence |
| Strategy Decision Engine | `backend/src/modules/strategy-decision-engine` | `frontend/src/features/strategy-decision-engine` | review candidates, risk labels, decision reasons |
| Backtesting Strategy Lab | `backend/src/modules/backtesting-strategy-lab` | `frontend/src/features/backtesting-strategy-lab` | backtest runs and metrics |
| Trade Plan Risk Engine | `backend/src/modules/trade-plan-risk-engine` | `frontend/src/features/trade-plan-risk-engine` | research risk plans, exits, invalidation |
| Stock Research Workbench | `backend/src/modules/stock-research-workbench` | `frontend/src/features/stock-research-workbench` | research workflow view models |
| Portfolio Management | `backend/src/modules/portfolio-management` | `frontend/src/features/portfolio-management` | portfolios, holdings, transactions |
| Portfolio Intelligence | `backend/src/modules/portfolio-intelligence` | `frontend/src/features/portfolio-intelligence` | portfolio analytics/context |
| Watchlist Management | `backend/src/modules/watchlist-management` | `frontend/src/features/watchlist-management` | watchlists and watchlist items |
| Alerts Monitoring | `backend/src/modules/alerts-monitoring` | `frontend/src/features/alerts-monitoring` | alert rules and alert events |
| Market Context Intelligence | `backend/src/modules/market-context-intelligence` | `frontend/src/features/market-context-intelligence` | regime, breadth, market context |
| Historical Context Snapshots | `backend/src/modules/historical-context-snapshots` | `frontend/src/features/historical-context-snapshots` | point-in-time context snapshots |
| Smart Money Intelligence | `backend/src/modules/smart-money-intelligence` | `frontend/src/features/smart-money-intelligence` | smart-money context from price/volume |
| AI Investment Copilot | `backend/src/modules/ai-investment-copilot` | `frontend/src/features/ai-investment-copilot` | deterministic local summaries |
| Auth Identity | `backend/src/modules/auth-identity` | `frontend/src/features/auth-identity` | user identity and protected routes |
| Subscription Billing | `backend/src/modules/subscription-billing` | `frontend/src/features/subscription-billing` | local plan gates and usage limits |
| Notifications Delivery | `backend/src/modules/notifications-delivery` | `frontend/src/features/notifications-delivery` | local/free notification delivery |
| Research Hub | `backend/src/modules/research-hub` | `frontend/src/features/research-hub` | research overview aggregation |
| Today Trade Review | `backend/src/modules/today-trade-review` | `frontend/src/features/today-trade-review` | daily shortlist and candidate review |

## Ownership Risks

- Market Data has broad dirty changes and must be serialized until the source-control state is resolved.
- `research-hub` and `today-trade-review` have structure deviations that need Architect review before hardening.
- Shared route, schema, market-scope, auth, subscription, shared UI, and package files are not module-owned implementation surfaces.
