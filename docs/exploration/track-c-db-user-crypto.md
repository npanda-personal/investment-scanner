# Track C — DB Reconnaissance: User/Account + Crypto Tables

> Read-only gap analysis. Date: 2026-06-15. No schema or data was modified.

---

## USER / ACCOUNT GROUP

---

### AppUser (`app_users`)

**Schema**
- PK: `id` (cuid)
- Fields: `email` (unique, nullable), `displayName`, `passwordHash`, `lastLoginAt`, `createdAt`, `updatedAt`
- Relations: `subscription` (UserSubscription), `usageCounters[]`, `portfolios[]`, `watchlists[]`, `alertRules[]`, `backtestRuns[]`, `backtestStrategies[]`, `notificationPreferences?`, `notificationEvents[]`, `tradeJournalEntries[]`

**Population** — 21 rows
| Column | Non-null |
|---|---|
| email | 20/21 |
| displayName | 21/21 |
| passwordHash | 20/21 |
| lastLoginAt | 6/21 |

Notable: `lastLoginAt` mostly null (6/21) — majority of users have never logged in or it isn't updated. One user missing email + passwordHash.

**Endpoint mapping**
- `auth-identity.repository.ts`: `appUser.findUnique` (by email, by id), `appUser.create`, `appUser.update`
- `subscription-billing.repository.ts`: `appUser.upsert` (provision on first login/register)
- Routes: `POST /auth/register`, `POST /auth/login`, `GET /auth/me`

---

### Portfolio (`portfolios`)

**Schema**
- PK: `id`, FK: `userId → app_users.id` (nullable, SetNull)
- Fields: `name`, `baseCurrency`, `description?`, `createdAt`, `updatedAt`
- Relations: `holdings[]`, `transactions[]`, `alertRules[]`, `alertEvents[]`, `intelligenceSnapshot?`

**Population** — 2 rows (real count)
| Column | Non-null |
|---|---|
| userId | 2/2 |
| description | 0/2 |

**Endpoint mapping**
- `portfolio-management.repository.ts`: full CRUD — `portfolio.findMany`, `portfolio.create`, `portfolio.findFirst`, `portfolio.update`, `portfolio.delete`
- Routes: `GET /portfolios`, `POST /portfolios`, `GET /portfolios/:id`, `PUT /portfolios/:id`, `DELETE /portfolios/:id`

---

### PortfolioHolding (`portfolio_holdings`)

**Schema**
- PK: `id`, FKs: `portfolioId → portfolios.id` (Cascade), `instrumentId → stocks.id` (Cascade)
- Fields: `symbol`, `companyName?`, `quantity`, `averageCost`, `currency`, `notes?`
- Unique: `(portfolioId, instrumentId)`

**Population** — 39 rows
| Column | Non-null |
|---|---|
| companyName | 39/39 |
| notes | 0/39 |

**Endpoint mapping**
- `portfolio-management.repository.ts`: `portfolioHolding.findMany`, `portfolioHolding.create`, `portfolioHolding.update`, `portfolioHolding.deleteMany`, `portfolioHolding.findFirst`
- Routes: `GET /portfolios/:id/holdings`, `POST /portfolios/:id/holdings`, `PUT /portfolios/:id/holdings/:hid`, `DELETE /portfolios/:id/holdings/:hid`

---

### PortfolioTransaction (`portfolio_transactions`)

**Schema**
- PK: `id`, FKs: `portfolioId → portfolios.id` (Cascade), `instrumentId → stocks.id` (nullable, SetNull)
- Fields: `type`, `quantity?`, `price?`, `amount?`, `currency`, `transactionDate`, `notes?`

**Population** — 0 rows (empty)

**Endpoint mapping**
- `portfolio-management.repository.ts`: `portfolioTransaction.findMany`, `portfolioTransaction.create`
- Routes: `GET /portfolios/:id/transactions`, `POST /portfolios/:id/transactions`

---

### Watchlist (`watchlists`)

**Schema**
- PK: `id`, FK: `userId → app_users.id` (nullable, SetNull)
- Fields: `name`, `description?`, `createdAt`, `updatedAt`
- Relations: `items[]`, `alertRules[]`, `alertEvents[]`

**Population** — 2 rows
| Column | Non-null |
|---|---|
| userId | 0/2 — both watchlists are user-less (orphan or system) |
| description | 0/2 |

**Endpoint mapping**
- `watchlist-management.repository.ts`: `watchlist.findMany`, `watchlist.create`, `watchlist.findFirst`, `watchlist.update`, `watchlist.delete`
- Routes: `GET /watchlists`, `POST /watchlists`, `GET /watchlists/:id`, `PUT /watchlists/:id`, `DELETE /watchlists/:id`

---

### WatchlistItem (`watchlist_items`)

**Schema**
- PK: `id`, FKs: `watchlistId → watchlists.id` (Cascade), `instrumentId → stocks.id` (Cascade)
- Fields: `symbol`, `companyName?`, `notes?`, `tags?`
- Unique: `(watchlistId, instrumentId)`

**Population** — 41 rows
| Column | Non-null |
|---|---|
| companyName | 41/41 |
| notes | 0/41 |
| tags | 41/41 |

**Endpoint mapping**
- `watchlist-management.repository.ts`: `watchlistItem.findMany`, `watchlistItem.findUnique`, `watchlistItem.create`, `watchlistItem.update`, `watchlistItem.deleteMany`
- Routes: `GET /watchlists/:id/items`, `POST /watchlists/:id/items`, `GET /watchlists/:id/items/:iid`, `PUT /watchlists/:id/items/:iid`, `DELETE /watchlists/:id/items/:iid`

---

### AlertRule (`alert_rules`)

**Schema**
- PK: `id`, FKs: `userId?`, `instrumentId?`, `portfolioId?`, `watchlistId?`
- Fields: `name`, `type`, `scope`, `condition` (Json), `enabled`, `lastObservedDirection?`

**Population** — 0 rows (empty)

**Endpoint mapping**
- `alerts-monitoring.repository.ts`: `alertRule.findMany`, `alertRule.create`, `alertRule.update`, `alertRule.delete`
- Routes: `GET /alerts/rules`, `POST /alerts/rules`, `PUT /alerts/rules/:id`, `DELETE /alerts/rules/:id`

---

### AlertEvent (`alert_events`)

**Schema**
- PK: `id`, FK: `alertRuleId → alert_rules.id` (Cascade), plus optional `instrumentId`, `portfolioId`, `watchlistId`
- Fields: `type`, `severity`, `title`, `message`, `metadata` (Json), `triggeredAt`, `readAt?`, `dismissedAt?`

**Population** — 0 rows (empty; no alert rules exist so no events can fire)

**Endpoint mapping**
- `alerts-monitoring.repository.ts`: `alertEvent.findFirst`, `alertEvent.create`, `alertEvent.findMany`, `alertEvent.update`, `alertEvent.updateMany`
- Routes: `GET /alerts/events`, `PUT /alerts/events/:id/read`, `PUT /alerts/events/:id/dismiss`, `PUT /alerts/events/read-all`

---

### BacktestStrategy (`backtest_strategies`)

**Schema**
- PK: `id`, FK: `userId → app_users.id` (nullable, SetNull)
- Fields: `name`, `description?`, `config` (Json)
- Relations: `runs[]`

**Population** — 4 rows
| Column | Non-null |
|---|---|
| userId | 0/4 — all strategies are user-less |

**Endpoint mapping**
- `backtesting-strategy-lab.repository.ts`: `backtestStrategy.findMany`, `backtestStrategy.create`, `backtestStrategy.findFirst`, `backtestStrategy.update`, `backtestStrategy.delete`
- Routes: `GET /backtests/strategies`, `POST /backtests/strategies`, etc.

---

### BacktestRun (`backtest_runs`)

**Schema**
- PK: `id`, FKs: `userId?`, `strategyId → backtest_strategies.id` (nullable, SetNull)
- Fields: `config` (Json), `status`, `startedAt`, `completedAt?`, `metrics?`, `equityCurve?`, `trades?`, `error?`

**Population** — 281 rows (est 134 from pg_class, real count 281)
| Column | Non-null | Notes |
|---|---|---|
| strategyId | 0/281 | All runs are strategy-less |
| userId | 0/281 | All runs are user-less |
| completedAt | 281/281 | All have completion timestamp |
| metrics | 281/281 | |
| equityCurve | 281/281 | |
| trades | 281/281 | |
| error | 3/281 | 3 FAILED runs |

Status breakdown: COMPLETED = 278, FAILED = 3.

**Endpoint mapping**
- `backtesting-strategy-lab.repository.ts`: `backtestRun.create`, `backtestRun.update`, `backtestRun.findMany`, `backtestRun.findFirst`, `backtestRun.delete`
- Routes: `POST /backtests/runs`, `GET /backtests/runs`, `GET /backtests/runs/:id`

---

### TradeJournalEntry (`trade_journal_entries`)

**Schema**
- PK: `id`, FK: `userId → app_users.id` (Cascade), `instrumentId?` (no FK enforced at DB level)
- Fields: `symbol`, `sourceSignalId?`, `direction`, `decision`, `reviewedAt`, `entryPrice?`, `stopPrice?`, `targetPrice?`, `thesis?`, `conviction?`, `outcomeStatus?`, `exitPrice?`, `exitAt?`, `realizedReturnPct?`, `notes?`, `tags?`

**Population** — 1 row
- Decision: WATCHING, Direction: LONG, outcomeStatus: null (not yet acted)
- All optional enrichment fields (entryPrice, stopPrice, targetPrice, thesis, conviction) are null in this lone row.

**Endpoint mapping**
- `trade-journal.repository.ts`: `tradeJournalEntry.create`, `tradeJournalEntry.findMany`, `tradeJournalEntry.count`, `tradeJournalEntry.findFirst`, `tradeJournalEntry.update`, `tradeJournalEntry.delete`
- Routes: `GET /journal/entries`, `POST /journal/entries`, `GET /journal/entries/:id`, `PUT /journal/entries/:id`, `DELETE /journal/entries/:id`

---

### NotificationPreference (`notification_preferences`)

**Schema**
- PK: `id`, FK: `userId → app_users.id` (Cascade), unique on `userId`
- Fields: `emailNotificationsEnabled`, `alertEmailsEnabled`, `dailyDigestEnabled`, `weeklyDigestEnabled`, `quietHoursStart?`, `quietHoursEnd?`

**Population** — 3 rows (all linked to a userId)
- Quiet hours fields likely all null (optional).

**Endpoint mapping**
- `notifications-delivery.repository.ts`: `notificationPreference.upsert`, `notificationPreference.update`
- Routes: `GET /notifications/preferences`, `PUT /notifications/preferences`

---

### NotificationEvent (`notification_events`)

**Schema**
- PK: `id`, FK: `userId → app_users.id` (Cascade)
- Fields: `type`, `channel`, `title`, `message`, `payload` (Json), `status`, `error?`, `createdAt`, `sentAt?`

**Population** — 5 rows
| type | status | count |
|---|---|---|
| TEST_EMAIL | SENT | 2 |
| ALERT_DIGEST | SENT | 1 |
| WEEKLY_DIGEST | SENT | 1 |
| DAILY_DIGEST | SENT | 1 |

**Endpoint mapping**
- `notifications-delivery.repository.ts`: `notificationEvent.findMany`, `notificationEvent.create`
- Routes: `GET /notifications/events`; internal delivery pipeline also writes here

---

### SubscriptionPlan (`subscription_plans`)

**Schema**
- PK: `id`, unique `code`
- Fields: `name`, `active`

**Population** — 3 rows (seeded)
| code | name | active |
|---|---|---|
| FREE | Free | true |
| PRO | Pro | true |
| ADMIN | Admin | true |

**Endpoint mapping**
- `subscription-billing.repository.ts`: `subscriptionPlan.upsert`, `subscriptionPlan.findMany`
- Routes: `GET /subscription/plans`

---

### UserSubscription (`user_subscriptions`)

**Schema**
- PK: `id`, FK: `userId → app_users.id` (Cascade), unique on `userId`
- Fields: `planCode`, `status`, `startedAt`, `expiresAt?`, `updatedAt`

**Population** — 21 rows (one per AppUser)
| Column | Non-null |
|---|---|
| expiresAt | 0/21 — all subscriptions have no expiry (perpetual / never set) |

**Endpoint mapping**
- `subscription-billing.repository.ts`: `userSubscription.upsert`, `userSubscription.findUnique`
- Routes: `GET /subscription/me`, `PUT /subscription/me`

---

### UsageCounter (`usage_counters`)

**Schema**
- PK: `id`, FK: `userId → app_users.id` (Cascade)
- Fields: `key`, `period`, `periodStart`, `count`, `updatedAt`
- Unique: `(userId, key, periodStart)`

**Population** — 5 rows
| key | period | count |
|---|---|---|
| COPILOT_SUMMARIES_DAY | DAY | 20 (rows) |
| BACKTEST_RUNS_MONTH | MONTH | 6 (rows) |

Small table, actively written by the copilot and backtest pipelines.

**Endpoint mapping**
- `subscription-billing.repository.ts`: `usageCounter.findUnique`, `usageCounter.upsert`
- Internal gating logic for quota enforcement — no direct GET endpoint

---

## CRYPTO GROUP

> App context: `/crypto` route redirects to home; crypto pipeline IS running (daily pipeline active), but the trader-facing UI is inactive.

---

### CryptoAsset (`crypto_assets`)

**Schema**
- PK: `id`, unique `symbol` (Binance pair e.g. BTCUSDT)
- Key fields: `name`, `region` (default GLOBAL), `exchange` (default CRYPTO), `currency`, `marketCap?`, `rank?`, `assetType` (CRYPTO), `isActive`, `isDelisted`
- Rich metadata: `description?`, `logoUrl?`, `categoryTags[]`, `circulatingSupply?`, `athPrice?`, `contractAddresses?`
- Relations: `signalResults[]`, `dataQualityEvaluations[]`, `interestSnapshots[]`, `fundamentalSnapshots[]`, `events[]`, `futuresSnapshots[]`, `dailyMetricSnapshots[]`

**Population** — 436 rows
| Column | Non-null | Notes |
|---|---|---|
| marketCap | 393/436 | 43 assets missing |
| rank | 393/436 | 43 missing |
| description | 0/436 | Fully null — metadata enrichment not run |
| logoUrl | 0/436 | Fully null |
| circulatingSupply | 0/436 | Fully null |
| metadataUpdatedAt | 0/436 | Fully null |

Rich descriptive metadata (description, logoUrl, circulatingSupply, contractAddresses, etc.) has never been populated — CoinPaprika enrichment stage has not run or has not been wired.

**Endpoint mapping**
- `market-data-foundation.crypto-repository.ts`: `cryptoAsset.findUnique` (by symbol, by id), `cryptoAsset.upsert`, `cryptoAsset.findMany`, `cryptoAsset.count`
- `market-data-foundation.repository.repair-queries.ts`: `cryptoAsset.findMany` (cross-reference with latest prices)
- Routes: `/api/crypto/assets`, admin pipeline endpoints

---

### CryptoFundamentalSnapshot (`crypto_fundamental_snapshots`)

**Schema**
- PK: `id`, FK: `instrumentId → crypto_assets.id` (Cascade)
- Fields: `symbol`, `snapshotDate`, `defillamaSlug?`, `category?`, `chains?`, `tvlUsd?`, `tvlChange1dPct?`, `fees24hUsd?`, `revenue24hUsd?`, `coverageStatus` (FULL/PARTIAL/NONE), `source`

**Population** — 432 rows (~1 per asset per snapshot day)
| Column | Non-null | Notes |
|---|---|---|
| defillamaSlug | 432/432 | All set |
| tvlUsd | 348/432 | 84 assets have no TVL (non-DeFi) |
| fees24hUsd | 220/432 | Majority lack fee data |
| coverageStatus | all FULL | Despite tvl/fees nulls — status may be miscategorized |

**Endpoint mapping**
- `market-data-foundation.crypto-snapshots-repository.ts`: `cryptoFundamentalSnapshot.upsert`, `cryptoFundamentalSnapshot.findFirst`
- `market-data-foundation.crypto-metrics.service.ts`: `cryptoFundamentalSnapshot.findMany`
- Used as an input to `CryptoDailyMetricSnapshot` (mirrored tvlUsd, tvlChange7dPct columns)

---

### CryptoFuturesSnapshot (`crypto_futures_snapshots`)

**Schema**
- PK: `id`, FK: `instrumentId → crypto_assets.id` (Cascade)
- Fields: `symbol`, `snapshotDate`, `fundingRatePct?`, `openInterestUsd?`, `source` (BINANCE_FUTURES)
- Unique: `(instrumentId, snapshotDate)`

**Population** — 748 rows
| Column | Non-null |
|---|---|
| fundingRatePct | 748/748 |
| openInterestUsd | 722/748 — 26 rows missing OI |

**Endpoint mapping**
- `market-data-foundation.crypto-snapshots-repository.ts`: `cryptoFuturesSnapshot.upsert`, `cryptoFuturesSnapshot.findFirst`
- `market-data-foundation.crypto-metrics.service.ts`: `cryptoFuturesSnapshot.findMany`
- Mirrored into CryptoDailyMetricSnapshot (fundingRatePct, openInterestUsd)

---

### CryptoDailyMetricSnapshot (`crypto_daily_metric_snapshots`)

**Schema**
- PK: `id`, FK: `instrumentId → crypto_assets.id` (Cascade)
- Fields: `symbol`, `snapshotDate`, `dataThroughDate?`, `price?`, `marketCap?`, `rank?`, signal columns (signalScore, signalDirection, signalConfidence), technical columns (rsi14, macd, sma50, sma200, crossState, bbPercentB, rsVsBtcPct), fundamentals mirror columns (tvlUsd, fundingRatePct, openInterestUsd)
- Unique: `(instrumentId, snapshotDate)`

**Population** — 856 rows (~2 snapshot dates × ~436 assets)
| Column | Non-null |
|---|---|
| price | 856/856 |
| signalScore | 856/856 |
| rsi14 | 856/856 |

Fully populated — this is the primary read source for the crypto signal board.

**Endpoint mapping**
- `market-data-foundation.crypto-snapshots-repository.ts`: `cryptoDailyMetricSnapshot.upsert`, `cryptoDailyMetricSnapshot.findFirst`, `cryptoDailyMetricSnapshot.findMany`
- Serves: `/api/crypto/signals` (signal board), `/api/crypto/assets/:symbol` (instrument workspace)

---

### CryptoEvent (`crypto_events`)

**Schema**
- PK: `id`, FK: `instrumentId → crypto_assets.id` (nullable, SetNull)
- Fields: `source` (default COINMARKETCAL), `externalId`, `title`, `description?`, `category?`, `eventDate`, `dateConfidence?`, `isHot`, `votes?`, `proofUrl?`
- Unique: `(source, externalId)`
- Schema comment: "Dormant until CRYPTO_COINMARKETCAL_API_KEY is set"

**Population** — 0 rows (empty — dormant by design; API key not configured)

**Endpoint mapping**
- No active writers. COINMARKETCAL ingestion stage would write here when API key is provided.

---

### CryptoPriceTick (`crypto_price_ticks`)

**Schema**
- PK: `id`, unique: `(symbol, timestamp)`
- Fields: `symbol`, `region?`, `exchange?`, `open`, `high`, `low`, `close`, `adjustedClose?`, `volume?`, `quoteVolume?`, `source?`, `dataStatus`

**Population** — ~327,595 rows (est)
- Date range: 2022-11-07 to 2026-06-15 (3.5+ years of daily OHLCV)
- This is the largest crypto table by far.

**Endpoint mapping**
- `market-data-foundation.crypto-repository.ts`: `cryptoPriceTick.findFirst`, `cryptoPriceTick.findMany`, `cryptoPriceTick.upsert`
- `signal-generation-engine.crypto-repository.ts`: `cryptoPriceTick.findMany` (price history for signal computation)
- Serves signal generation and metric computation pipelines

---

### CryptoLatestPrice (`crypto_latest_prices`)

**Schema**
- PK: `symbol`
- Fields: `region?`, `price`, `timestamp`, `updatedAt`

**Population** — 436 rows (one per active crypto asset)

**Endpoint mapping**
- `market-data-foundation.crypto-repository.ts`: `cryptoLatestPrice.findUnique`, `cryptoLatestPrice.upsert`, `cryptoLatestPrice.count`
- `signal-generation-engine.crypto-repository.ts`: `cryptoLatestPrice.findMany`
- `market-data-foundation.serving.price-reads.ts`: `cryptoLatestPrice.findUnique` (live price lookup)
- `market-data-foundation.repository.repair-queries.ts`: used in repair cross-reference

---

### CryptoSignalGenerationRun (`crypto_signal_generation_runs`)

**Schema**
- PK: `id`
- Fields: `region`, `assetType`, `requestedByUserId`, `status`, `modelVersion`, `rulesetVersion`, `generatedDate`, counters (totalCount, processedCount, generatedCount, etc.), `completedAt?`

**Population** — 150 rows (est)
| status | count | latest generatedDate |
|---|---|---|
| COMPLETED | 173 | 2026-06-14 |
| RUNNING | 5 | 2026-06-13 |
| COMPLETED_WITH_ERRORS | 1 | 2026-06-15 |

Note: 5 RUNNING runs from 2026-06-13 are likely stuck/zombie — signal generation ran but status not finalized.

**Endpoint mapping**
- `signal-generation-engine.crypto-repository.ts`: `cryptoSignalGenerationRun.create`, `cryptoSignalGenerationRun.update`
- Admin pipeline trigger routes

---

### CryptoSignalResult (`crypto_signal_results`)

**Schema**
- PK: `id`, FK: `instrumentId → crypto_assets.id` (Cascade), `generationRunId?`
- Fields: `symbol`, `score`, `direction`, `confidence`, `triggeredSignals` (Json), `negativeSignals` (Json), `explanation`, `generatedDate?`, `modelVersion`, `lifecycleState?`, `priorScore?`
- Unique: `(instrumentId, modelVersion, generatedDate)`

**Population** — 3,561 rows (est 3,481)
| Column | Non-null | Notes |
|---|---|---|
| generatedDate | 3561/3561 | |
| lifecycleState | 0/3561 | Fully null — lifecycle tracking not enabled for crypto |
| priorScore | 0/3561 | Fully null — delta tracking not enabled |

Direction distribution: BEARISH 1,815 / NEUTRAL 1,652 / BULLISH 94 (heavy bearish skew, ~2.6% bullish).
Date range: 2026-06-07 to 2026-06-15 (only 9 days of signal history).

**Endpoint mapping**
- `signal-generation-engine.crypto-repository.ts`: `cryptoSignalResult.upsert`, `cryptoSignalResult.findUnique`, `cryptoSignalResult.findFirst`, `cryptoSignalResult.findMany`, `cryptoSignalResult.count`
- `market-data-foundation.crypto-snapshots-repository.ts`: `cryptoSignalResult.findFirst` (signal mirroring into daily metric snapshots)
- `market-data-foundation.crypto-metrics.service.ts`: `cryptoSignalResult.findMany`
- Serves: `/api/crypto/signals`

---

### CryptoSignalOutcome (`crypto_signal_outcomes`)

**Schema**
- PK: `id`, FK: `signalResultId → crypto_signal_results.id` (Cascade)
- Fields: mirrored signal fields + `horizon`, `dataComplete`, `priceAtSignal?`, `futurePrice?`, `forwardReturnPercent?`, `benchmarkReturnPercent?`, `alphaPercent?`
- Schema comment: "RESERVED — not yet wired. Schema exists for a future crypto signal-outcome/maturity sweep"

**Population** — 0 rows (empty — reserved, no writer)

**Endpoint mapping** — None. No application code writes to this table.

---

### CryptoSignalCalibrationResult (`crypto_signal_calibration_results`)

**Schema**
- PK: `id`, fields: `signalResultId`, `instrumentId`, `symbol`, raw/calibrated score+direction+confidence, `boosts`, `penalties`, `calibrationReasons`, `dataGaps`
- Schema comment: "RESERVED — not yet wired (future crypto calibration). No writer today"

**Population** — 0 rows (empty — reserved, no writer)

**Endpoint mapping** — None.

---

### CryptoDataQualityEvaluation (`crypto_quality_evaluations`)

**Schema**
- PK: `id`, FK: `instrumentId → crypto_assets.id` (Cascade), unique on `instrumentId`
- Fields: `coverageScore`, `coverageStatus`, `signalReadinessScore`, `signalReadinessStatus`, `liquidityScore`, eligibility booleans, `dataGaps`, `warnings`
- Schema comment: "RESERVED — not yet wired (future crypto data-quality evaluations)"

**Population** — 0 rows (empty — reserved, no writer)

**Endpoint mapping** — None.

---

### CryptoInterestSnapshot (`crypto_interest_snapshots`)

**Schema**
- PK: `id`, FK: `instrumentId → crypto_assets.id` (Cascade)
- Fields: `snapshotDate`, `dataThroughDate?`, `symbol`, `company`, `scopeRegion` (GLOBAL), `scopeAssetType` (CRYPTO), `timeframe`, `category`, `score`, `direction`, `reasonTags`, `riskTags`, `freshness`
- Schema comment: "RESERVED — not yet wired (future crypto interest/volume radar)"

**Population** — 0 rows (empty — reserved, no writer)

**Endpoint mapping** — None.

---

### CryptoMarketScanSnapshot (`crypto_market_scan_snapshots`)

**Schema**
- PK: `id`, fields: `scanType`, `scanRange?`, `region` (GLOBAL), `assetType` (CRYPTO), `tradingDate`, `rank`, `payloadJson`
- Unique: `(scanType, scanRange, region, assetType, tradingDate, rank)`

**Population** — 8,342 rows (est)
| scanType | count |
|---|---|
| MARKET_MAP | 4,000 |
| MOVERS_LOSERS | 1,973 |
| MOVERS_GAINERS | 1,681 |
| 52W_LOW | 425 |
| VOLUME_SPIKE | 196 |
| 52W_HIGH | 67 |

Date range: 2026-06-07 to 2026-06-15 (9 days). Actively populated by daily pipeline.

**Endpoint mapping**
- `market-data-foundation.crypto-repository.ts`: `cryptoMarketScanSnapshot.deleteMany`, `cryptoMarketScanSnapshot.createMany`, `cryptoMarketScanSnapshot.findFirst`, `cryptoMarketScanSnapshot.findMany`
- Serves: `/api/crypto/scans` (market scan boards — persisted-read)

---

## Summary Table

| Table | Est Rows | Status |
|---|---|---|
| app_users | 21 | Populated |
| portfolios | 2 | Lightly populated |
| portfolio_holdings | 39 | Populated |
| portfolio_transactions | 0 | **Empty** |
| watchlists | 2 | Lightly populated (both user-less) |
| watchlist_items | 41 | Populated |
| alert_rules | 0 | **Empty** |
| alert_events | 0 | **Empty** |
| backtest_strategies | 4 | Lightly populated (all user-less) |
| backtest_runs | 281 | Populated |
| trade_journal_entries | 1 | Near-empty |
| notification_preferences | 3 | Lightly populated |
| notification_events | 5 | Lightly populated |
| subscription_plans | 3 | Seeded (FREE/PRO/ADMIN) |
| user_subscriptions | 21 | Populated (1:1 with users) |
| usage_counters | 5 | Lightly populated |
| crypto_assets | 436 | Populated; rich metadata fully null |
| crypto_fundamental_snapshots | 432 | Populated |
| crypto_futures_snapshots | 748 | Populated |
| crypto_daily_metric_snapshots | 856 | Populated (primary read surface) |
| crypto_events | 0 | **Empty — dormant (no API key)** |
| crypto_price_ticks | ~327,595 | **Large — 3.5 yr history** |
| crypto_latest_prices | 436 | Populated |
| crypto_signal_generation_runs | ~150 | Populated; 5 stuck RUNNING |
| crypto_signal_results | ~3,561 | Populated; lifecycleState + priorScore all null |
| crypto_signal_outcomes | 0 | **Empty — reserved (no writer)** |
| crypto_signal_calibration_results | 0 | **Empty — reserved (no writer)** |
| crypto_data_quality_evaluations | 0 | **Empty — reserved (no writer)** |
| crypto_interest_snapshots | 0 | **Empty — reserved (no writer)** |
| crypto_market_scan_snapshots | ~8,342 | Populated (9 days) |
