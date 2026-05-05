# Audit: Global Stock / Instrument Usage

This audit identifies all locations where stocks or instruments are listed, searched, or used as inputs, and evaluates their readiness for the Global Market Scope implementation.

## 1. Frontend Component Audit

| Feature | Component / Location | Displays Stocks? | API Region Support | Global Scope Context | Plan |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Market Data Foundation** | `MarketDataFoundationPage` | Yes (Table) | Partial (via `market` tab) | No | Standardize `region` param; align tabs with global scope. |
| **Market Data Foundation** | `InstrumentSearchSelect` | Yes (Autocomplete) | No | No | Pass `scope.region` to search API; add `global` override prop. |
| **Stock Workbench** | `StockDetailPage` | Yes (Single) | Yes (via ID) | N/A | Add region/country labels to header for context. |
| **Signals** | `SignalsDashboardPage` | Yes (Table) | No | No | Pass `region` and `assetType` to `fetchTopSignals` and `runSignals`. |
| **Strategy** | `StrategyDecisionDashboard`| Yes (Table/List) | Partial (Legacy `country` filter) | No | Reconcile `countryFilter` with `scope.region`; pass region to `marketGate` and `exits`. |
| **Smart Money** | `SmartMoneyIntelligencePage`| Yes (Table) | No | No | Pass `region` to `fetchSmartMoneyTop`, `distribution`, and `sectors`. |
| **Market Context** | `MarketContextPage` | Yes (Sectors/Summary) | No | No | Update `summary` API to be region-aware; store snapshots per region. |
| **Data Quality** | `DataQualityEnginePage` | Yes (Table) | No | No | Pass `region` to `list`, `summary`, and `evaluate` calls. |
| **Portfolio / Watchlist** | `AddToWatchlistDialog` | Yes (Search) | No | No | Default `InstrumentSearchSelect` to global region. |
| **Portfolio / Watchlist** | `PortfolioManagementPage` | Yes (Holdings) | N/A (User-owned) | No | Add region chip/badge; do not hide existing cross-region holdings. |
| **Alerts & Monitoring** | `AlertsMonitoringPage` | Yes (Rules/Events) | No | No | Add region info; ensure `evaluateAlerts` run is region-aware. |
| **AI Copilot** | `AiInvestmentCopilotPage` | Yes (Brief/Stock) | No | No | Pass `region` to `fetchMarketBrief`. |
| **Backtesting** | `BacktestingStrategyLabPage`| Yes (Run/Universe) | No | No | Include `region` and `assetType` in `ALL` universe configuration. |

## 2. Backend API Audit

| Endpoint | Method | Region Support | Limitation |
| :--- | :--- | :--- | :--- |
| `/api/v1/instruments` | GET | Partial | Mapped `IN` to `NSE/BSE` was inconsistent. |
| `/api/v1/signals/top` | GET | No | Returned top scorers across all regions mixed together. |
| `/api/v1/strategy/candidates`| GET | Partial | Used optional `country` string; needed standard `region` code. |
| `/api/v1/smart-money/top` | GET | No | Global results only. |
| `/api/v1/market-context/summary`| GET | No | Aggregated global universe only; no region-specific breadth. |
| `/api/v1/data-quality/instruments`| GET | No | No filtering by exchange or region. |

## 3. Database & Model Audit

- **MarketContextSnapshot**: Lacked `region` field. Snapshots for India would overwrite US snapshots for the same day.
- **Stock**: Has `region`, `exchange`, and `country`, but data consistency varies (e.g., `India` vs `IN`).
- **SignalResult / StrategyDecisionResult**: Related to `Stock`, but queries didn't consistently join to filter by stock metadata.

## 4. Key Implementation Strategy

1. **Standardize Region Mapping**: Create a central utility to map `IN`, `US`, `EU` to database fields.
2. **Hardening the Schema**: Add `region` to all context snapshots.
3. **Subscription Hook**: Ensure all stock-heavy pages subscribe to `useMarketScope()`.
4. **Transparent Filtering**: Add visible scope chips to headers of user-owned modules (Portfolio/Watchlist) so users understand why some items might be missing or prioritized.
