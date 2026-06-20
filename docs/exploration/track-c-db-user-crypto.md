# Track C — DB Audit: User/Account + Crypto Group

**Re-audit date:** 2026-06-16  
**Method:** schema.prisma inspection + live Docker psql SELECT/introspection (read-only). Row counts marked (est) use `pg_class.reltuples`; real `COUNT(*)` used where estimate was -1 (unanalyzed) or the table is small.

---

## USER / ACCOUNT GROUP

---

### AppUser (`app_users`)

**Schema:**  
`id` (cuid PK), `email` (unique, nullable), `displayName`, `passwordHash`, `lastLoginAt`, `createdAt`, `updatedAt`.  
Relations: UserSubscription (1:1), UsageCounter[], Portfolio[], Watchlist[], AlertRule[], BacktestRun[], BacktestStrategy[], NotificationPreference (1:1), NotificationEvent[], TradeJournalEntry[].

**Population:**  
- **21 rows** (real COUNT).  
- email is nullable but functionally populated for all users via auth flow.  
- 19 users on FREE plan, 2 on ADMIN plan (see UserSubscription below).

**Endpoint mapping:**  
`auth-identity.repository.ts` — login/register/lookup.  
`api/routes.ts` — auth routes reference AppUser implicitly via session.

---

### Portfolio (`portfolios`)

**Schema:**  
`id` (cuid PK), `userId` (FK → app_users, nullable, SetNull), `name`, `baseCurrency`, `description`, `createdAt`, `updatedAt`.  
Relations: PortfolioHolding[], PortfolioTransaction[], AlertRule[], AlertEvent[], PortfolioIntelligenceSnapshot (1:1).

**Population:**  
- **2 rows** (real COUNT — pg_class est was 1, stale stat).  
- userId likely populated for both.

**Endpoint mapping:**  
`portfolio-management.repository.ts` — CRUD.  
`portfolio-intelligence.repository.ts` — intelligence snapshot reads.

---

### PortfolioHolding (`portfolio_holdings`)

**Schema:**  
`id` (cuid PK), `portfolioId` (FK → portfolios, Cascade), `instrumentId` (FK → stocks, Cascade), `symbol`, `companyName`, `quantity`, `averageCost`, `currency`, `notes`, `createdAt`, `updatedAt`.  
Unique: `[portfolioId, instrumentId]`.

**Population:**  
- **39 rows** (real COUNT).  
- Populated and in active use (seed/test data).

**Endpoint mapping:**  
`portfolio-management.repository.ts`.

---

### PortfolioTransaction (`portfolio_transactions`)

**Schema:**  
`id` (cuid PK), `portfolioId` (FK → portfolios, Cascade), `instrumentId` (FK → stocks, nullable, SetNull), `type`, `quantity`, `price`, `amount`, `currency`, `transactionDate`, `notes`, `createdAt`, `updatedAt`.

**Population:**  
- **0 rows** (real COUNT). CONFIRMED EMPTY — unchanged from prior audit.

**Endpoint mapping:**  
`portfolio-management.repository.ts`.

---

### Watchlist (`watchlists`)

**Schema:**  
`id` (cuid PK), `userId` (FK → app_users, nullable, SetNull), `name`, `description`, `createdAt`, `updatedAt`.  
Relations: WatchlistItem[], AlertRule[], AlertEvent[].

**Population:**  
- **2 rows** (real COUNT).

**Endpoint mapping:**  
`watchlist-management.repository.ts`.

---

### WatchlistItem (`watchlist_items`)

**Schema:**  
`id` (cuid PK), `watchlistId` (FK → watchlists, Cascade), `instrumentId` (FK → stocks, Cascade), `symbol`, `companyName`, `notes`, `tags` (JSON), `createdAt`, `updatedAt`.  
Unique: `[watchlistId, instrumentId]`.

**Population:**  
- **41 rows** (real COUNT).  
- Populated (watchlists have items).

**Endpoint mapping:**  
`watchlist-management.repository.ts`.

---

### AlertRule (`alert_rules`)

**Schema:**  
`id` (cuid PK), `userId` (FK, nullable), `name`, `type`, `scope`, `instrumentId` (FK → stocks, nullable, Cascade), `portfolioId` (FK, nullable, Cascade), `watchlistId` (FK, nullable, Cascade), `condition` (JSON), `enabled` (bool), `lastObservedDirection`, `createdAt`, `updatedAt`.

**Population:**  
- **0 rows** (real COUNT). CONFIRMED EMPTY — unchanged from prior audit.

**Endpoint mapping:**  
`alerts-monitoring.repository.ts`.

---

### AlertEvent (`alert_events`)

**Schema:**  
`id` (cuid PK), `alertRuleId` (FK → alert_rules, Cascade), `type`, `severity`, `title`, `message`, `instrumentId` (nullable), `portfolioId` (nullable), `watchlistId` (nullable), `metadata` (JSON), `triggeredAt`, `readAt`, `dismissedAt`.

**Population:**  
- **0 rows** (real COUNT). CONFIRMED EMPTY — downstream of empty AlertRule; unchanged from prior audit.

**Endpoint mapping:**  
`alerts-monitoring.repository.ts`.

---

### BacktestStrategy (`backtest_strategies`)

**Schema:**  
`id` (cuid PK), `userId` (FK → app_users, nullable, SetNull), `name`, `description`, `config` (JSON), `createdAt`, `updatedAt`.

**Population:**  
- **4 rows** (real COUNT).

**Endpoint mapping:**  
`backtesting-strategy-lab.repository.ts` / `backtesting-strategy-lab.service.ts`.

---

### BacktestRun (`backtest_runs`)

**Schema:**  
`id` (cuid PK), `userId` (FK, nullable), `strategyId` (FK → backtest_strategies, nullable, SetNull), `config` (JSON), `status`, `startedAt`, `completedAt`, `metrics` (JSON?), `equityCurve` (JSON?), `trades` (JSON?), `error`.

**Population:**  
- **281 rows** (real COUNT — pg_class est was 134, stale stat).  
- `metrics`, `equityCurve`, `trades` populated for COMPLETED runs; null for FAILED/RUNNING.

**Endpoint mapping:**  
`backtesting-strategy-lab.repository.ts` / `backtesting-strategy-lab.service.ts`.

---

### TradeJournalEntry (`trade_journal_entries`)

**Schema:**  
`id` (cuid PK), `userId` (FK → app_users, Cascade), `instrumentId` (optional — not FK-enforced at DB level), `symbol`, `sourceSignalId`, `direction`, `decision`, `reviewedAt`, `entryPrice`, `stopPrice`, `targetPrice`, `thesis`, `conviction`, `outcomeStatus`, `exitPrice`, `exitAt`, `realizedReturnPct`, `notes`, `tags` (JSON), `createdAt`, `updatedAt`.

**Population:**  
- **1 row** (real COUNT). One smoke-test entry for test@example.com: RELIANCE, LONG, WATCHING. No price/conviction/outcome data populated.

**Endpoint mapping:**  
`trade-journal.repository.ts`, `trade-journal.router.ts`, `trade-journal.module.ts`.

---

### NotificationPreference (`notification_preferences`)

**Schema:**  
`id` (cuid PK), `userId` (FK → app_users, unique, Cascade), `emailNotificationsEnabled`, `alertEmailsEnabled`, `dailyDigestEnabled`, `weeklyDigestEnabled`, `quietHoursStart`, `quietHoursEnd`, `createdAt`, `updatedAt`.

**Population:**  
- **3 rows** (real COUNT).  
- Boolean fields default false; quiet hours likely null for most.

**Endpoint mapping:**  
`notifications-delivery.repository.ts`.

---

### NotificationEvent (`notification_events`)

**Schema:**  
`id` (cuid PK), `userId` (FK → app_users, Cascade), `type`, `channel`, `title`, `message`, `payload` (JSON), `status`, `error`, `createdAt`, `sentAt`.

**Population:**  
- **5 rows** (real COUNT).  
- Low volume; `sentAt` and `error` will be partially null.

**Endpoint mapping:**  
`notifications-delivery.repository.ts`.

---

### SubscriptionPlan (`subscription_plans`)

**Schema:**  
`id` (cuid PK), `code` (unique), `name`, `active` (bool), `createdAt`, `updatedAt`.

**Population:**  
- **3 rows**: `FREE` (Free, active), `PRO` (Pro, active), `ADMIN` (Admin, active).

**Endpoint mapping:**  
`subscription-billing.repository.ts`.

---

### UserSubscription (`user_subscriptions`)

**Schema:**  
`id` (cuid PK), `userId` (FK → app_users, unique, Cascade), `planCode` (index), `status`, `startedAt`, `expiresAt`, `updatedAt`.

**Population:**  
- **21 rows** (real COUNT — 1:1 with AppUser).  
- Distribution: 19 FREE (ACTIVE), 2 ADMIN (ACTIVE).  
- **test@example.com current plan: ADMIN / ACTIVE.** NOT restored since the prior audit when a browser agent accidentally set it. Still on Admin as of 2026-06-16.

**Endpoint mapping:**  
`subscription-billing.repository.ts`.

---

### UsageCounter (`usage_counters`)

**Schema:**  
`id` (cuid PK), `userId` (FK → app_users, Cascade), `key`, `period`, `periodStart`, `count` (int), `updatedAt`.  
Unique: `[userId, key, periodStart]`.

**Population:**  
- **27 rows** (real COUNT — pg_class est was 5, stale stat).  
- Rate-limiting / billing gate counters per user/key/period.

**Endpoint mapping:**  
`subscription-billing.repository.ts`.

---

## CRYPTO GROUP

---

### CryptoAsset (`crypto_assets`)

**Schema:**  
`id` (cuid PK), `symbol` (unique — Binance pair e.g. BTCUSDT), `name`, `region` (default GLOBAL), `exchange`, `currency`, `marketCap`, `rank`, `assetType`, `instrumentSegment`, `displaySymbol`, `providerSymbol`, `sourceSymbol`, `catalogSource`, `providerSupportStatus`, `providerError`, `isDelisted`, `source`, `dataStatus`, `isActive`, `lastSuccessfulDataLoadTimestamp`.  
Descriptive metadata (CoinPaprika enrichment): `description` (Text), `logoUrl`, `websiteUrl`, `categoryTags` (String[]), `circulatingSupply`, `totalSupply`, `maxSupply`, `fullyDilutedValuation`, `athPrice`, `athDate`, `atlPrice`, `atlDate`, `genesisDate`, `contractAddresses` (JSON), `metadataSource`, `metadataUpdatedAt`.

**Population:**  
- **436 rows** (est).  
- **description: 0/436 populated. logoUrl: 0/436 populated. circulatingSupply: 0/436 populated. CONFIRMED unchanged from prior audit — metadata enrichment has never run.**

**Endpoint mapping:**  
`market-data-foundation.crypto-repository.ts`, `market-data-foundation.crypto-snapshots-repository.ts`, `signal-generation-engine.crypto-repository.ts`.

---

### CryptoFundamentalSnapshot (`crypto_fundamental_snapshots`)

**Schema:**  
`id` (cuid PK), `instrumentId` (FK → crypto_assets, Cascade), `symbol`, `snapshotDate`, `defillamaSlug`, `category`, `chains` (JSON), `tvlUsd`, `tvlChange1dPct/7dPct`, `fees24hUsd/7dUsd`, `revenue24hUsd/30dUsd`, `annualizedRevenueUsd`, `stakingApyPct`, `coverageStatus` (FULL/PARTIAL/NONE), `source` (default DEFILLAMA).

**Population:**  
- **648 rows** (est). Max snapshotDate: **2026-06-16** — pipeline current.  
- Coverage partial by design: non-DeFi coins get `coverageStatus=NONE` with all TVL/fee columns null.

**Endpoint mapping:**  
`market-data-foundation.crypto-snapshots-repository.ts`.

---

### CryptoFuturesSnapshot (`crypto_futures_snapshots`)

**Schema:**  
`id` (cuid PK), `instrumentId` (FK → crypto_assets, Cascade), `symbol`, `snapshotDate`, `fundingRatePct`, `openInterestUsd`, `source` (default BINANCE_FUTURES).

**Population:**  
- **1,122 rows** (est). Max snapshotDate: **2026-06-16** — pipeline current.  
- Spot-only coins absent; futures-eligible coins populate `fundingRatePct` and `openInterestUsd`.

**Endpoint mapping:**  
`market-data-foundation.crypto-snapshots-repository.ts`.

---

### CryptoDailyMetricSnapshot (`crypto_daily_metric_snapshots`)

**Schema:**  
`id` (cuid PK), `instrumentId` (FK → crypto_assets, Cascade), `symbol`, `name`, `snapshotDate`, `dataThroughDate`, `price`, `marketCap`, `rank`, `signalScore`, `signalDirection`, `signalConfidence`, `volumeSpike`, `pctChange1d/7d/30d`, `distanceFromAthPct`, `near52wHigh`, `near52wLow`, `rsi14`, `macd`, `macdSignal`, `macdHist`, `bbPercentB`, `sma50`, `sma200`, `crossState`, `rsVsBtcPct`, `tvlUsd`, `tvlChange7dPct`, `fundingRatePct`, `openInterestUsd`, `calculationVersion`, `dataStatus`, `createdAt`, `updatedAt`.

**Population:**  
- **1,284 rows** (est). Max snapshotDate: **2026-06-16** — pipeline current.  
- Primary board read source for crypto; written daily by CRYPTO_DAILY_METRICS pipeline stage.

**Endpoint mapping:**  
`market-data-foundation.crypto-metrics.service.ts`.

---

### CryptoEvent (`crypto_events`)

**Schema:**  
`id` (cuid PK), `instrumentId` (FK → crypto_assets, nullable, SetNull), `symbol`, `source` (default COINMARKETCAL), `externalId`, `title`, `description` (Text), `category`, `eventDate`, `dateConfidence`, `isHot`, `percentageChange`, `votes`, `proofUrl`, `sourceUrl`.  
Unique: `[source, externalId]`.

**Population:**  
- **0 rows** (real COUNT). CONFIRMED EMPTY — unchanged from prior audit. Requires `CRYPTO_COINMARKETCAL_API_KEY` (not set); writer is dormant.

**Endpoint mapping:**  
None active (no writer or reader wired).

---

### CryptoPriceTick (`crypto_price_ticks`)

**Schema:**  
`id` (cuid PK), `symbol`, `region` (default GLOBAL), `exchange`, `timestamp`, `open`, `high`, `low`, `close`, `adjustedClose`, `volume` (BigInt), `quoteVolume` (Decimal), `source`, `ingestionTimestamp`, `lastUpdatedTimestamp`, `dataStatus`.  
Unique: `[symbol, timestamp]`.

**Population:**  
- **328,467 rows** (real COUNT). Max timestamp: **2026-06-16**. Min: 2022-11-07.  
- Pipeline actively ingesting; data is current.

**Endpoint mapping:**  
`market-data-foundation.serving.price-reads.ts`, `market-data-foundation.crypto-repository.ts`.

---

### CryptoLatestPrice (`crypto_latest_prices`)

**Schema:**  
`symbol` (PK), `region` (default GLOBAL), `price`, `timestamp`, `updatedAt`.

**Population:**  
- **436 rows** (est — matches crypto_assets universe). Max updatedAt: **2026-06-16 07:39 UTC** — very fresh.

**Endpoint mapping:**  
`market-data-foundation.serving.price-reads.ts`.

---

### CryptoSignalGenerationRun (`crypto_signal_generation_runs`)

**Schema:**  
Mirrors `signal_generation_runs`: `id`, `region`, `assetType`, `requestedByUserId`, `status`, `modelVersion`, `rulesetVersion`, `sourceDataDate`, `generatedDate`, `batchSize`, `offset`, all count fields, `warnings` (JSON), `startedAt`, `completedAt`.  
Relation: CryptoSignalResult[].

**Population:**  
- **180 rows** (real COUNT — pg_class est was 150). Max generatedDate: **2026-06-16** — pipeline current.

**Endpoint mapping:**  
`signal-generation-engine.crypto-repository.ts`.

---

### CryptoSignalResult (`crypto_signal_results`)

**Schema:**  
Mirrors `signal_results`: `id`, `instrumentId` (FK → crypto_assets, Cascade), `generationRunId` (FK, nullable, SetNull), `symbol`, `companyName`, `sector`, `country`, `score`, `direction`, `confidence`, `triggeredSignals` (JSON), `negativeSignals` (JSON), `explanation`, `generatedAt`, `generatedDate`, `modelVersion`, `rulesetVersion`, `sourceDataDate`, `sourcePriceDate`, `scoringInputSummary` (JSON?), `dataQualityEligibilitySnapshot` (JSON?), `source`, `dataStatus`, `reliabilityTier`, `lifecycleState`, `priorScore`.  
Relation: CryptoSignalOutcome[].

**Population:**  
- **3,991 rows** (est). Max generatedAt: **2026-06-16** — pipeline actively generating daily.  
- `scoringInputSummary`, `dataQualityEligibilitySnapshot`, `lifecycleState`, `priorScore` partially null depending on run version.

**Endpoint mapping:**  
`signal-generation-engine.crypto-repository.ts`.

---

### CryptoSignalOutcome (`crypto_signal_outcomes`)

**Schema:**  
RESERVED. Mirrors `signal_outcomes` with FK → crypto_signal_results: `id`, `signalResultId`, `instrumentId`, `symbol`, `direction`, `score`, `sector`, `country`, `modelVersion`, `signalGeneratedDate`, `horizon`, `dataComplete`, `priceAtSignal`, `futurePrice`, `windowEndDate`, `forwardReturnPercent`, `maxFavorableExcursion`, `maxAdverseExcursion`, `maxDrawdownPercent`, `benchmarkReturnPercent`, `alphaPercent`, `evaluatedAt`.

**Population:**  
- **0 rows** (real COUNT). CONFIRMED EMPTY — reserved, no writer wired. Unchanged from prior audit.

**Endpoint mapping:**  
None (RESERVED).

---

### CryptoSignalCalibrationResult (`crypto_signal_calibration_results`)

**Schema:**  
RESERVED. Fields: `id`, `signalResultId`, `instrumentId`, `symbol`, raw/calibrated score/direction/confidence, `boosts`, `penalties`, `calibrationReasons`, `dataGaps`, `calibrationModelVersion`, `rawSignalModelVersion`, `generatedAt`.

**Population:**  
- **0 rows** (real COUNT). CONFIRMED EMPTY — reserved, no writer wired. Unchanged from prior audit.

**Endpoint mapping:**  
None (RESERVED).

---

### CryptoDataQualityEvaluation (`crypto_quality_evaluations`)

**Schema:**  
RESERVED. Prisma model `CryptoDataQualityEvaluation` maps to DB table `crypto_quality_evaluations` (note: prior audit listed incorrect table name `crypto_data_quality_evaluations`). Fields: `id`, `instrumentId` (FK → crypto_assets, unique, Cascade), `symbol`, `companyName`, `sector`, `industry`, `country`, `currency`, `coverageScore`, `coverageStatus`, `signalReadinessScore`, `signalReadinessStatus`, `liquidityScore`, `liquidityStatus`, `eligibleForSignals`, `eligibleForBacktesting`, `eligibleForCalibration`, `dataGaps`, `warnings`, `readinessReasons`, `readinessBlockers`, `evaluatedAt`.

**Population:**  
- **0 rows** (real COUNT). CONFIRMED EMPTY — reserved, no writer wired. Unchanged from prior audit.

**Endpoint mapping:**  
None (RESERVED).

---

### CryptoInterestSnapshot (`crypto_interest_snapshots`)

**Schema:**  
RESERVED. Mirrors `stock_interest_snapshots`: `id`, `snapshotDate`, `dataThroughDate`, `generatedAt`, `instrumentId` (FK → crypto_assets, Cascade), `symbol`, `company`, `scopeRegion` (default GLOBAL), `scopeAssetType` (default CRYPTO), `timeframe`, `category`, `score`, `direction`, `reasonTags`, `riskTags`, `freshness`, `warnings`, `calculationVersion`.

**Population:**  
- **0 rows** (real COUNT). CONFIRMED EMPTY — reserved, no writer wired. Unchanged from prior audit.

**Endpoint mapping:**  
None (RESERVED).

---

### CryptoMarketScanSnapshot (`crypto_market_scan_snapshots`)

**Schema:**  
`id` (cuid PK), `scanType` (MOVERS_GAINERS|MOVERS_LOSERS|52W_HIGH|52W_LOW|VOLUME_SPIKE), `scanRange`, `region` (default GLOBAL), `assetType` (default CRYPTO), `tradingDate`, `rank`, `payloadJson` (JSON), `computedAt`, `createdAt`, `updatedAt`.

**Population:**  
- **9,379 rows** (est). Max tradingDate: **2026-06-16** — pipeline current and actively refreshing.

**Endpoint mapping:**  
`market-data-foundation.crypto-snapshots-repository.ts`.
