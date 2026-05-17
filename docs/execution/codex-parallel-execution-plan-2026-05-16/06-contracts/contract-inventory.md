# Contract Inventory

Contracts must be confirmed before parallel implementation changes their behavior.

| Contract | Owning Team | Consumers | Current Status | Blocks Parallel Work | Approvals |
|---|---|---|---|---|---|
| Market scope | Solution Architect | all modules | frontend context and backend helper exist | yes | Architect + QA |
| Instrument identity | Market Data Foundation | DQ, signals, portfolio, watchlist, alerts | `Stock` model exists with aliases/provider fields | yes | Architect |
| OHLC/price data | Market Data Foundation | DQ, signals, quality, backtests, context | `PriceTick` and `LatestPrice` exist | yes | Architect + QA |
| Data quality result | Data Quality Engine | signals, decisions, backtests, trade plans, copilot | `DataQualityEvaluation` exists | yes | Architect + QA |
| Indicator result | Strategy Framework / Signal Generation | signals, backtests, decisions | no standalone owner observed | yes | Architect |
| Strategy definition | Strategy Framework | signals, decisions, backtests, alerts | `StrategyDefinition` exists | yes | PO + Architect |
| Rule evaluation | Strategy Framework | signals, decisions, backtests | evaluator files exist | yes | Architect |
| Signal/trigger object | Signal Generation Engine | quality, calibration, decisions, alerts, research | `SignalResult` exists; root trigger fields need gap audit | yes | PO + Architect + QA |
| Signal quality result | Signal Quality Lab | calibration, decisions, research | module exists | no after signal contract | QA |
| Calibration result | Signal Calibration Engine | decisions, research | `SignalCalibrationResult` exists | no after quality contract | QA |
| Strategy decision | Strategy Decision Engine | trade risk, research, today review | `StrategyDecisionResult` exists | no after upstream contracts | PO + Architect |
| Backtest result | Backtesting Strategy Lab / Strategy Framework | strategy proof, trade risk | `BacktestRun`, `StrategyPerformanceSummary` exist | no after OHLC/strategy | Architect + QA |
| Trade-plan/risk | Trade Plan Risk Engine | research, today review | `TradePlanResult` exists | yes | PO + Architect |
| Watchlist interaction | Watchlist Management | signals, research, alerts | module exists | no | QA |
| Portfolio context | Portfolio Management / Intelligence | research, alerts, trade risk | modules exist | no | QA |
| Alert rule | Alerts Monitoring | signals, portfolio, watchlists | `AlertRule`, `AlertEvent` exist | no | QA |
| UI view models | UX + feature teams | frontend pages | distributed in feature `types.ts` | yes for UI | UX + QA |
| Batch orchestration | Orchestrator + module owners | market data, DQ, signals, backtests | patterns exist, needs inventory | yes | Architect + QA |
| Progress UI | UX + shared UI | frontend batch workflows | shared components exist | no | UX + QA |
| Audit trail | Architect + module owners | QA/release/research | run models and snapshots exist | yes | Architect |
| Journal/forward validation | Today Review / Signal Quality | research workflow | partial modules exist | yes | PO + Architect |

## Required Contract Doc Path

Approved future contract docs should live under:

```text
docs/execution/codex-parallel-execution-plan-2026-05-16/contracts/
```

No contract docs were created in this Sprint 0 setup beyond this inventory.
