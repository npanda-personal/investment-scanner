# Track B — Backend User-Account API Inventory

**Scope:** 14 modules under `backend/src/modules/`
**URL base prefix:** All endpoints mount under `/api/v1/…` except `research-hub` (`/api/v1/research/…`).
**Auth mechanism:** Custom HS256 JWT (`Authorization: Bearer <token>`). `requireAuth` middleware injects `req.user`. Fallback default-user ID (`'default-user'`) used when token absent — **no hard 401 on most business routes**.
**Generated:** 2026-06-15

---

## 1. auth-identity

Router: `/api/v1` · rate-limited on signup/login

| # | METHOD | PATH | Purpose | Request (key fields) | Response (key fields) | Auth | Data Origin |
|---|--------|------|---------|----------------------|-----------------------|------|-------------|
| 1 | POST | `/api/v1/auth/signup` | Register new user | `email`, `password`, `name?` | `{ user: {id,email,name,createdAt,lastLoginAt}, accessToken }` | Public (rate-limited) | `AppUser` (Prisma), also creates `UserSubscription` (FREE plan) |
| 2 | POST | `/api/v1/auth/login` | Authenticate user, return JWT | `email`, `password` | `{ user, accessToken }` | Public (rate-limited) | `AppUser.passwordHash` — scrypt verify |
| 3 | POST | `/api/v1/auth/logout` | Server-side logout (stateless — returns success only) | — | `{ success: true }` | Auth required | No DB write — JWT is stateless, TTL=8h |
| 4 | GET | `/api/v1/auth/me` | Fetch current user profile | — | `{ id, email, name, createdAt, updatedAt, lastLoginAt }` | Auth required | `AppUser` |
| 5 | PATCH | `/api/v1/auth/me` | Update display name | `name?` (max 120 chars) | `{ id, email, name, … }` | Auth required | `AppUser.displayName` |

**Notes:**
- JWT signed with `AUTH_SECRET` env var (random 32-byte secret in dev). No refresh token — tokens expire after 8 hours.
- `logout` is effectively a no-op (no token blacklist); the client must discard the token.
- `requireAuth` also exposes `optionalAuth` middleware used by some other modules (not yet wired on any of these 14).

---

## 2. subscription-billing

Router: `/api/v1` · all routes guarded by `requireAuth`

| # | METHOD | PATH | Purpose | Request (key fields) | Response (key fields) | Auth | Data Origin |
|---|--------|------|---------|----------------------|-----------------------|------|-------------|
| 6 | GET | `/api/v1/subscription/me` | Current user's subscription + all feature limits | — | `{ userId, subscription:{planCode,status,startedAt,expiresAt}, plan:{id,code,name}, features:[…] }` | Authed | `UserSubscription`, `SubscriptionPlan`, `Portfolio`/`Watchlist`/`AlertRule` counts, `UsageCounter` |
| 7 | GET | `/api/v1/subscription/plans` | List available plans | — | `[{id,code,name,active}]` | Authed | `SubscriptionPlan` |
| 8 | GET | `/api/v1/subscription/usage` | Usage counters for current user | — | `{ userId, counters:[{feature,usageKey,label,used,limit,allowed}] }` | Authed | `UsageCounter`, counts of `Portfolio`/`Watchlist`/`AlertRule` rows |
| 9 | GET | `/api/v1/subscription/features` | Feature-gate status array | — | `[{feature,usageKey,label,used,limit,allowed}]` | Authed | Same as usage |
| 10 | GET | `/api/v1/subscription/provider` | Billing provider health | — | `{ enabled:false, provider:'manual', message }` | Authed | **Stubbed** — `SubscriptionBillingProvider.enabled = false`; always returns disabled |
| 11 | POST | `/api/v1/subscription/change-plan` | Self-service plan change | `{ planCode, status? }` | `{ userId, planCode, status, startedAt, expiresAt, updatedAt }` | Authed | `UserSubscription` upsert |
| 12 | PATCH | `/api/v1/subscription/users/:userId/plan` | Admin override plan for any user | `X-Admin-Key` header + `{ planCode, status? }` | Same as change-plan | Admin (header key) | `UserSubscription` upsert |

**Notes:**
- Endpoint 10 (`/subscription/provider`) is a **stub** — the `SubscriptionBillingProvider` class has `enabled = false` hardcoded; it will never return a real billing provider status.
- `SUBSCRIPTION_LIMITS_DISABLED=true` in `.env` bypasses all gating (except in test env).
- Plans: `FREE`, `PRO`, `ADMIN`. No actual payment integration.

---

## 3. watchlist-management

Router: `/api/v1` · all routes guarded by `requireAuth`

| # | METHOD | PATH | Purpose | Request (key fields) | Response (key fields) | Auth | Data Origin |
|---|--------|------|---------|----------------------|-----------------------|------|-------------|
| 13 | GET | `/api/v1/watchlists` | List all watchlists for current user | — | `{ watchlists:[{id,name,description,createdAt,updatedAt}] }` | Authed | `Watchlist` |
| 14 | POST | `/api/v1/watchlists` | Create new watchlist | `{ name, description? }` | `{ id,name,description,createdAt,updatedAt }` | Authed | `Watchlist` create; subscription gate: `CREATE_WATCHLIST` |
| 15 | GET | `/api/v1/watchlists/:id` | Get watchlist detail with enriched items | `?sort=recentlyAdded\|signalScoreDesc\|dailyChangeDesc\|dailyChangeAsc\|symbolAsc` | `{ watchlist, items:[enriched], source, generatedAt }` | Authed | `Watchlist`, `WatchlistItem`, live price from `PriceTick` via `MarketDataFoundationService`, signal from `SignalResult` |
| 16 | PATCH | `/api/v1/watchlists/:id` | Update watchlist metadata | `{ name?, description? }` | `{ id,name,… }` | Authed | `Watchlist` update |
| 17 | DELETE | `/api/v1/watchlists/:id` | Delete watchlist | — | 204 | Authed | `Watchlist` delete (cascades items) |
| 18 | POST | `/api/v1/watchlists/:id/items` | Add instrument to watchlist | `{ instrumentId, notes?, tags? }` | `{ id,watchlistId,instrumentId,symbol,companyName,notes,tags,… }` | Authed | `WatchlistItem` create; resolves instrument from `Stock` |
| 19 | PATCH | `/api/v1/watchlists/:id/items/:itemId` | Update item notes/tags | `{ notes?, tags? }` | Updated item | Authed | `WatchlistItem` update |
| 20 | DELETE | `/api/v1/watchlists/:id/items/:itemId` | Remove item from watchlist | — | 204 | Authed | `WatchlistItem` deleteMany |

**Notes:**
- GET detail (15) is a **live-enrichment read**: each item fans out to `MarketDataFoundationService` (price ticks) and `SignalGenerationEngineService` (latest signal). Not persisted-read.
- `ownerWhere` clause allows both `userId = current` and `userId = null` — unowned watchlists are globally visible.

---

## 4. alerts-monitoring

Router: `/api/v1` · all routes guarded by `requireAuth`

| # | METHOD | PATH | Purpose | Request (key fields) | Response (key fields) | Auth | Data Origin |
|---|--------|------|---------|----------------------|-----------------------|------|-------------|
| 21 | GET | `/api/v1/alerts/rules` | List alert rules for current user | — | `{ rules:[{id,name,type,scope,instrumentId,portfolioId,watchlistId,condition,enabled,…}] }` | Authed | `AlertRule` |
| 22 | POST | `/api/v1/alerts/rules` | Create alert rule | `{ name, type, scope, condition, instrumentId?, portfolioId?, watchlistId?, enabled? }` | Created rule | Authed | `AlertRule` create; subscription gate: `CREATE_ALERT` |
| 23 | GET | `/api/v1/alerts/rules/:id` | Get single alert rule | — | Rule object | Authed | `AlertRule` |
| 24 | PATCH | `/api/v1/alerts/rules/:id` | Update alert rule | `{ name?, type?, scope?, condition?, enabled?, … }` | Updated rule | Authed | `AlertRule` update |
| 25 | DELETE | `/api/v1/alerts/rules/:id` | Delete alert rule | — | 204 | Authed | `AlertRule` delete |
| 26 | POST | `/api/v1/alerts/evaluate` | Evaluate all rules and fire events | — | `{ triggered, skipped, errors }` | Authed | Reads `AlertRule` + live market/signal data; writes `AlertEvent` |
| 27 | GET | `/api/v1/alerts/events` | List alert events (last 200) | — | `{ events:[{id,alertRuleId,type,severity,title,message,triggeredAt,readAt,dismissedAt,…}] }` | Authed | `AlertEvent` |
| 28 | PATCH | `/api/v1/alerts/events/:id/read` | Mark event as read | — | Updated event | Authed | `AlertEvent` update `readAt` |
| 29 | PATCH | `/api/v1/alerts/events/:id/dismiss` | Dismiss event | — | Updated event | Authed | `AlertEvent` update `dismissedAt` + `readAt` |
| 30 | POST | `/api/v1/alerts/events/mark-all-read` | Mark all unread events as read | — | `{ updated: N }` | Authed | `AlertEvent` updateMany |
| 31 | GET | `/api/v1/alerts/summary` | Unread + critical event counts | — | `{ unreadCount, criticalCount }` | Authed | `AlertEvent` (computed in-process from full list) |

**Notes:**
- Evaluate (26) is an active side-effectful operation — it pulls latest market/signal data live and writes new `AlertEvent` rows.
- `ownerWhere` on rules uses `OR [{userId}, null]` — same pattern as watchlists.
- `AlertEvent` is linked to its rule via FK; `ownedEventWhere` joins through `alertRule`.

---

## 5. portfolio-management

Router: `/api/v1` · all routes guarded by `requireAuth`

| # | METHOD | PATH | Purpose | Request (key fields) | Response (key fields) | Auth | Data Origin |
|---|--------|------|---------|----------------------|-----------------------|------|-------------|
| 32 | GET | `/api/v1/portfolios` | List all portfolios | — | `{ portfolios:[{id,name,baseCurrency,description,createdAt,updatedAt}] }` | Authed | `Portfolio` |
| 33 | POST | `/api/v1/portfolios` | Create portfolio | `{ name, baseCurrency, description? }` | Portfolio object | Authed | `Portfolio` create; subscription gate: `CREATE_PORTFOLIO` |
| 34 | GET | `/api/v1/portfolios/:id` | Get portfolio + holdings + transactions | — | `{ portfolio, holdings:[…], transactions:[…] }` | Authed | `Portfolio`, `PortfolioHolding`, `PortfolioTransaction` |
| 35 | PATCH | `/api/v1/portfolios/:id` | Update portfolio metadata | `{ name?, baseCurrency?, description? }` | Updated portfolio | Authed | `Portfolio` update |
| 36 | DELETE | `/api/v1/portfolios/:id` | Delete portfolio | — | 204 | Authed | `Portfolio` delete |
| 37 | POST | `/api/v1/portfolios/:id/holdings` | Add holding | `{ instrumentId, quantity, averageCost, currency, notes? }` | `{ id,portfolioId,instrumentId,symbol,companyName,quantity,averageCost,currency,… }` | Authed | `PortfolioHolding` create; resolves `Stock` for symbol; touches `Portfolio.updatedAt` |
| 38 | PATCH | `/api/v1/portfolios/:id/holdings/:holdingId` | Update holding | `{ quantity?, averageCost?, currency?, notes? }` | Updated holding | Authed | `PortfolioHolding` update; touches `Portfolio.updatedAt` |
| 39 | DELETE | `/api/v1/portfolios/:id/holdings/:holdingId` | Remove holding | — | 204 | Authed | `PortfolioHolding` deleteMany; touches `Portfolio.updatedAt` |
| 40 | GET | `/api/v1/portfolios/:id/summary` | Portfolio summary (current value, P&L) | — | `{ totalInvested, currentValue, pnl, pnlPercent, holdings:[valuation…] }` | Authed | `PortfolioHolding` + latest price from `PriceTick` (live) |
| 41 | GET | `/api/v1/portfolios/:id/allocation` | Asset allocation breakdown | — | `{ totalValue, buckets:[{label,value,percent}] }` | Authed | `PortfolioHolding` + live prices |
| 42 | GET | `/api/v1/portfolios/:id/changes` | Holdings with signal direction change detection | `?lossThreshold` | `{ portfolio, holdingsWithChanges:[…] }` | Authed | `PortfolioHolding`, `SignalResult` (2 most-recent rows), `PriceTick` |
| 43 | GET | `/api/v1/portfolios/:id/transactions` | List transactions | — | `{ transactions:[{id,type,quantity,price,amount,currency,transactionDate,notes,…}] }` | Authed | `PortfolioTransaction` |
| 44 | POST | `/api/v1/portfolios/:id/transactions` | Record a transaction | `{ type, currency, transactionDate, instrumentId?, quantity?, price?, amount?, notes? }` | Created transaction | Authed | `PortfolioTransaction` create |

**Notes:**
- Summary (40), allocation (41), and changes (42) all perform **live price reads** from `PriceTick` — not persisted-read.
- Holdings mutation (37–39) bumps `Portfolio.updatedAt` so portfolio-intelligence staleness detection works.

---

## 6. portfolio-intelligence

Router: `/api/v1` · all routes guarded by `requireAuth`

| # | METHOD | PATH | Purpose | Request (key fields) | Response (key fields) | Auth | Data Origin |
|---|--------|------|---------|----------------------|-----------------------|------|-------------|
| 45 | GET | `/api/v1/portfolios/:id/intelligence` | Persisted portfolio intelligence snapshot | — | `{ portfolioId, healthScore, status, holdings:[{…intelligence}], marketPosture, summary, generatedAt }` | Authed | `PortfolioIntelligenceSnapshot.payloadJson`; falls back to lazy compute if absent |
| 46 | POST | `/api/v1/portfolios/:id/intelligence/refresh` | Force-recompute and upsert snapshot | — | Full intelligence object | Authed | Reads `PortfolioHolding`, `DailyInstrumentSnapshot`, `SnapshotWatermark`; writes `PortfolioIntelligenceSnapshot` |
| 47 | GET | `/api/v1/portfolios/:id/red-flags` | Red flag items from intelligence snapshot | — | `{ redFlags:[{holdingId,symbol,label,severity,reason}] }` | Authed | `PortfolioIntelligenceSnapshot.payloadJson` |
| 48 | GET | `/api/v1/portfolios/:id/review` | Review action items from intelligence snapshot | — | `{ review:[{…}] }` | Authed | `PortfolioIntelligenceSnapshot.payloadJson` |

**Notes:**
- Endpoints 45, 47, 48 are **persisted-read** — they serve from `portfolio_intelligence_snapshots`. On first call with no snapshot they materialise one lazily.
- Intelligence data merges `DailyInstrumentSnapshot` (signal/calibration/decision/trade-plan) with `SnapshotWatermark` for staleness detection. Key table: `daily_instrument_snapshots`.

---

## 7. trade-journal

Router: `/api/v1` · all routes guarded by `requireAuth`

| # | METHOD | PATH | Purpose | Request (key fields) | Response (key fields) | Auth | Data Origin |
|---|--------|------|---------|----------------------|-----------------------|------|-------------|
| 49 | GET | `/api/v1/trade-journal/post-mortem` | Aggregate win/loss stats from all journal entries | — | `{ totalEntries, acted, skipped, watching, winRate, avgReturn, … }` | Authed | `TradeJournalEntry` (persisted reads only) |
| 50 | POST | `/api/v1/trade-journal` | Create trade journal entry | `{ symbol, direction, decision, reviewedAt, entryPrice?, stopPrice?, targetPrice?, thesis?, conviction?, outcomeStatus?, exitPrice?, exitAt?, notes?, tags? }` | Created entry | Authed | `TradeJournalEntry` create |
| 51 | GET | `/api/v1/trade-journal` | List journal entries (paginated + filtered) | `?decision, ?outcomeStatus, ?symbol, ?fromDate, ?toDate, ?page, ?pageSize` | `{ entries:[…], total }` | Authed | `TradeJournalEntry` |
| 52 | GET | `/api/v1/trade-journal/:id` | Get single entry | — | Entry object | Authed | `TradeJournalEntry` |
| 53 | PATCH | `/api/v1/trade-journal/:id` | Update entry | Partial of create fields | Updated entry | Authed | `TradeJournalEntry` update; auto-computes `realizedReturnPct` from direction+prices |
| 54 | DELETE | `/api/v1/trade-journal/:id` | Delete entry | — | 204 | Authed | `TradeJournalEntry` delete |

**Notes:**
- `realizedReturnPct` is computed automatically on update: LONG = `(exit-entry)/entry`, SHORT = `(entry-exit)/entry`.
- Route order: `post-mortem` is registered before `/:id` to avoid swallowing by the param route.
- No external API calls — pure DB read/write.

---

## 8. notifications-delivery

Router: `/api/v1` · all routes guarded by `requireAuth`

| # | METHOD | PATH | Purpose | Request (key fields) | Response (key fields) | Auth | Data Origin |
|---|--------|------|---------|----------------------|-----------------------|------|-------------|
| 55 | GET | `/api/v1/notifications/preferences` | Get notification preferences | — | `{ id,userId,emailNotificationsEnabled,alertEmailsEnabled,dailyDigestEnabled,weeklyDigestEnabled,quietHoursStart,quietHoursEnd,… }` | Authed | `NotificationPreference` (upsert on first read) |
| 56 | PATCH | `/api/v1/notifications/preferences` | Update notification preferences | Any subset of preference fields | Updated preferences | Authed | `NotificationPreference` update |
| 57 | GET | `/api/v1/notifications/events` | List notification events (last 50) | — | `{ events:[{id,type,channel,title,message,status,sentAt,…}] }` | Authed | `NotificationEvent` |
| 58 | GET | `/api/v1/notifications/provider-status` | Email provider health | — | `{ enabled, provider, message }` | Authed | Computed from `createNotificationProvider()` — reads ENV vars |
| 59 | POST | `/api/v1/notifications/test-email` | Send test email to current user | — | `{ type, channel, status, sentAt }` | Authed | `AppUser.email` + external email provider (SMTP/Resend/etc.) |
| 60 | POST | `/api/v1/notifications/send-alert-digest` | Send alert digest email | — | Delivery result | Authed | `AlertEvent` (live) + email provider |
| 61 | POST | `/api/v1/notifications/send-daily-digest` | Send daily market digest | — | Delivery result | Authed | Copilot market brief + email provider |
| 62 | POST | `/api/v1/notifications/send-weekly-digest` | Send weekly digest | — | Delivery result | Authed | Alert events + copilot summary + email provider |
| 63 | GET | `/api/v1/notifications/telegram/status` | Telegram bot configuration status | — | `{ configured, botUsername?, chatId?, message }` | Authed | ENV vars `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` |
| 64 | GET | `/api/v1/notifications/telegram/setup` | Discover Telegram chat ID from bot updates | — | `{ chatId, firstName, username, hint }` or 404 | Authed | **External: Telegram Bot API** (`/getUpdates`) |
| 65 | POST | `/api/v1/notifications/telegram/test` | Send Telegram test message | — | `{ status, messageId? }` | Authed | **External: Telegram Bot API** (`/sendMessage`) |

**External API hits:** Endpoints 59–62 hit the configured email provider (SMTP / Resend — ENV-driven). Endpoints 64–65 hit the **Telegram Bot API**.

---

## 9. today-trade-review

Router: `/api/v1` · all routes guarded by `requireAuth`

| # | METHOD | PATH | Purpose | Request (key fields) | Response (key fields) | Auth | Data Origin |
|---|--------|------|---------|----------------------|-----------------------|------|-------------|
| 66 | GET | `/api/v1/today-review/latest` | Latest completed review run (persisted-read) | `?region, ?assetType, ?enrich` | `{ run:{id,runDate,status,candidateCounts,candidates:[…]}, groups, … }` | Authed | `TodayReviewRun` + `TodayReviewCandidate`; enriched with `Stock.sector`, `price_ticks` (52w range LATERAL), `fno_ban_list`, `SmartMoneyContextSnapshot` |
| 67 | GET | `/api/v1/today-review/runs` | List all review runs (paginated) | `?region, ?assetType, ?limit, ?offset` | `{ items:[run…], total }` | Authed | `TodayReviewRun` + `TodayReviewCandidate` |
| 68 | GET | `/api/v1/today-review/runs/:id` | Get single run by ID | — | Run object with candidates | Authed | `TodayReviewRun`, `TodayReviewCandidate` |
| 69 | GET | `/api/v1/today-review/candidates/:id` | Get single candidate detail | — | Candidate object with enrichment | Authed | `TodayReviewCandidate` + batch enrichment (sector, 52w, F&O ban, smart money) |
| 70 | POST | `/api/v1/today-review/run` | Trigger a new review run | `{ region?, assetType? }` | Completed run object (201) | Authed | Reads `DailyInstrumentSnapshot`, signals, strategy decisions, trade plans; writes `TodayReviewRun` + `TodayReviewCandidate` |

**Notes:**
- The 52-week range join on candidates uses a raw LATERAL SQL query over `price_ticks` (COALESCE adjustedClose/close, last 252 rows per symbol) to avoid N+1 and window-function full-scan issues.
- F&O ban data comes from `fno_ban_list` (raw SQL table).
- Smart money status from `SmartMoneyContextSnapshot`.
- `enrich=false` param skips all four enrichment queries for fast reads.
- Fixture runs (seeded test data containing `TEST_CONNECTED_CHAIN` markers in `sourceSnapshot`) are filtered out of `latest`.

---

## 10. historical-context-snapshots

Router: `/api/v1` · all routes guarded by `requireAuth`

| # | METHOD | PATH | Purpose | Request (key fields) | Response (key fields) | Auth | Data Origin |
|---|--------|------|---------|----------------------|-----------------------|------|-------------|
| 71 | POST | `/api/v1/context-snapshots/generate` | Generate and persist snapshots for a date | `{ snapshotDate?, limit?, region?, assetType? }` | `{ snapshotDate, market:{inserted,updated,skipped}, sectors:{…}, countries:{…}, smartMoney:{…}, dataQuality:{…}, warnings }` | Authed | Reads live from `MarketContextIntelligenceService`, `SmartMoneyIntelligenceService`, `DataQualityEngineService`; writes to `MarketContextSnapshot`, `SectorContextSnapshot`, `CountryContextSnapshot`, `SmartMoneyContextSnapshot`, `DataQualitySnapshot` |
| 72 | GET | `/api/v1/context-snapshots/summary` | Snapshot coverage counts by type | `?region, ?date, ?limit` | `{ market, sectors, countries, smartMoney, dataQuality }` | Authed | `MarketContextSnapshot`, `SectorContextSnapshot`, etc. |
| 73 | GET | `/api/v1/context-snapshots/market` | Market-level snapshots | `?region, ?date, ?limit` | `{ items:[{snapshotDate,region,regime,regimeScore,breadth…}] }` | Authed | `MarketContextSnapshot` |
| 74 | GET | `/api/v1/context-snapshots/sectors` | Sector snapshots | `?region, ?date, ?limit, ?sector` | `{ items:[{sector,relativeStrengthScore,…}] }` | Authed | `SectorContextSnapshot` |
| 75 | GET | `/api/v1/context-snapshots/countries` | Country snapshots | `?region, ?date, ?limit` | `{ items:[{country,…}] }` | Authed | `CountryContextSnapshot` |
| 76 | GET | `/api/v1/context-snapshots/smart-money` | Smart money snapshots | `?region, ?date, ?limit` | `{ items:[{instrumentId,status,smartMoneyScore,range,…}] }` | Authed | `SmartMoneyContextSnapshot` |
| 77 | GET | `/api/v1/context-snapshots/coverage` | Snapshot existence/completeness check | `?region, ?date` | Coverage counts per snapshot type | Authed | All snapshot tables |
| 78 | GET | `/api/v1/context-snapshots/lookup` | Look up context snapshots with lookback | `?date, ?lookbackDays, ?region, ?assetType` | `{ market, sectors, smartMoney, … }` | Authed | `MarketContextSnapshot`, `SectorContextSnapshot`, `SmartMoneyContextSnapshot` |

**Notes:**
- `generate` (71) is the write-side pipeline action — used by `pipeline-orchestration` as the `CONTEXT_SNAPSHOTS` stage.
- GET endpoints are pure persisted-reads.

---

## 11. research-hub

Router: `/api/v1/research` (prefix from `routes.ts`)

| # | METHOD | PATH | Purpose | Request (key fields) | Response (key fields) | Auth | Data Origin |
|---|--------|------|---------|----------------------|-----------------------|------|-------------|
| 79 | GET | `/api/v1/research/overview` | Aggregated research readiness dashboard | `?region, ?assetType, ?live` | `{ marketReadiness, priorities, confirmations, nextAction, whatChanged, actionability, backtestSummary, strategyProof, … }` | Public (no `requireAuth`) | Snapshot-first: `ResearchHubSnapshotReader` → `daily_instrument_snapshots`, `market_context_snapshots`; falls back to live fan-out across strategy/signal/smart-money services |
| 80 | GET | `/api/v1/research/health` | Research hub health check | — | Health metrics for each dimension | Public (no `requireAuth`) | Computed from multiple upstream services |

**Notes:**
- **No `requireAuth`** on this router — both endpoints are publicly accessible.
- `?live=true` forces live fan-out and bypasses snapshot reads.
- The snapshot reader queries `DailyInstrumentSnapshot`, `MarketContextSnapshot`, and related tables.

---

## 12. stock-research-workbench

Router: `/api/v1`

| # | METHOD | PATH | Purpose | Request (key fields) | Response (key fields) | Auth | Data Origin |
|---|--------|------|---------|----------------------|-----------------------|------|-------------|
| 81 | GET | `/api/v1/research/stocks/:instrumentId/workbench` | Full workbench snapshot for instrument (persisted-read) | — | Full workbench payload or 202 if not yet computed | Public (no `requireAuth`) | `WorkbenchSnapshot.payloadJson`; 202 returned when snapshot absent |
| 82 | GET | `/api/v1/research/stocks/:instrumentId/overview` | Instrument overview (name, sector, last price, signal) | — | `{ symbol, companyName, sector, currentPrice, signalScore, … }` | Public | `Stock`, `PriceTick`, `SignalResult` (live reads) |
| 83 | GET | `/api/v1/research/stocks/:instrumentId/performance` | Historical price performance | `?range=1w\|1m\|3m\|6m\|1y\|ytd` | `{ prices:[{date,close,adjustedClose}], returns:{period,pct} }` | Public | `PriceTick` |
| 84 | GET | `/api/v1/research/stocks/:instrumentId/peers` | Peer comparison (persisted-read) | — | `{ peers:[…] }` or 202 | Public | `WorkbenchSnapshot.payloadJson` (peers section) |
| 85 | GET | `/api/v1/research/stocks/:instrumentId/relative-strength` | Relative strength vs. sector/index | `?range` | `{ rs, … }` | Public | `PriceTick`, computed relative strength |

**Notes:**
- **No `requireAuth`** on any of these routes.
- `workbench` (81) and `peers` (84) are persisted-read from `workbench_snapshots`; return HTTP 202 with `{ _status: 'NOT_YET_COMPUTED' }` when no snapshot exists yet.
- `overview` (82), `performance` (83), `relative-strength` (85) do live reads from `PriceTick`.

---

## 13. ai-investment-copilot

Router: `/api/v1` · all routes guarded by `requireAuth`

| # | METHOD | PATH | Purpose | Request (key fields) | Response (key fields) | Auth | Data Origin |
|---|--------|------|---------|----------------------|-----------------------|------|-------------|
| 86 | POST | `/api/v1/copilot/stock-summary` | AI-style research summary for a stock | `{ instrumentId }` | `{ instrumentId, symbol, summary:[…], signals, tradePlan, marketContext, disclaimer }` | Authed | Snapshot-first: `DailyInstrumentSnapshot`; falls back to live fan-out (`SignalResult`, `StrategyDecisionEngineService`, `TradePlanRiskEngineService`, `SmartMoneyContextSnapshot`, `MarketContextSnapshot`) |
| 87 | POST | `/api/v1/copilot/portfolio-summary` | Research summary for a portfolio | `{ portfolioId }` | `{ portfolioId, holdings:[…], summary, disclaimer }` | Authed | `PortfolioIntelligenceSnapshot` + `AlertEvent` + signals |
| 88 | POST | `/api/v1/copilot/watchlist-summary` | Research summary for a watchlist | `{ watchlistId }` | `{ watchlistId, items:[…], summary, disclaimer }` | Authed | `Watchlist`, `WatchlistItem`, `DailyInstrumentSnapshot` per item |
| 89 | GET | `/api/v1/copilot/market-brief` | Market regime and sector brief | `?region` | `{ regime, sectors, summary, disclaimer }` | Authed | `MarketContextSnapshot`, `SectorContextSnapshot` |
| 90 | GET | `/api/v1/copilot/alert-digest` | Digest of current alert events | — | `{ events:[…], summary, disclaimer }` | Authed | `AlertEvent` (live read from `AlertsMonitoringService`) |

**Notes:**
- All summaries include a hard-coded `disclaimer = 'For research support only, not financial advice.'`.
- Snapshot reads controlled by `COPILOT_SNAPSHOT_READS` env flag (default ON).
- Subscription gate: `RUN_COPILOT_SUMMARY` (10/day on FREE, 100/day on PRO, unlimited on ADMIN).
- No external LLM API — summaries are rule-based template assembly, not generative AI.

---

## 14. pipeline-orchestration

Router: `/api/v1`

| # | METHOD | PATH | Purpose | Request (key fields) | Response (key fields) | Auth | Data Origin |
|---|--------|------|---------|----------------------|-----------------------|------|-------------|
| 91 | GET | `/api/v1/pipeline/status` | Current pipeline run status | `?region, ?assetType, ?limit, ?pipelineKey` | `{ runs:[{id,pipelineKey,status,startedAt,finishedAt,stages:[…]}], … }` | Public (no `requireAuth`) | `PipelineRun`, `PipelineStageRun` |
| 92 | GET | `/api/v1/pipeline/commands/catalog` | Available pipeline commands with availability flags | `?region, ?assetType` | `{ commands:[{key,label,description,available,blockedReason?}] }` | Public | Computed from service constants + DB state checks |
| 93 | POST | `/api/v1/pipeline/commands` | Execute a pipeline command (admin/operator action) | `{ command, region?, assetType?, … }` | `{ command, status, result }` | Public (`requestedByUserId` defaults to `'local-manual-operator'` when no auth) | Orchestrates all downstream services (market-data-foundation, signal-generation-engine, snapshot-assembler, today-review, etc.); writes `PipelineRun`, `PipelineStageRun` |

**Notes:**
- **No `requireAuth`** on any pipeline route — this is an operator/admin surface with no JWT enforcement.
- Command execution (93) is the primary pipeline trigger; it runs all pipeline stages in sequence using the DAG runner.
- `Cache-Control: no-store` is set on status (91) and catalog (92) responses.
- `requestedByUserId` extracted from `req.user?.id` but no auth middleware — unauthenticated requests get `'local-manual-operator'` attribution.

---

## Cross-Cutting Findings

### Stubbed / Placeholder Endpoints
| Endpoint | Issue |
|---|---|
| `GET /api/v1/subscription/provider` | Permanently returns `{ enabled: false, provider: 'manual' }` — `SubscriptionBillingProvider.enabled` is hardcoded false. No billing integration. |

### Dead / Unused Endpoints
None identified — all endpoints are wired and reachable.

### Auth Gaps
| Surface | Gap |
|---|---|
| `research-hub` (79–80) | No `requireAuth` — public read |
| `stock-research-workbench` (81–85) | No `requireAuth` — public read |
| `pipeline-orchestration` (91–93) | No auth at all — operator actions are unauthenticated |
| Most business routes | Fallback `'default-user'` ID when JWT absent — no hard 401 rejection for missing auth |

### External API Calls
| Module | External Service | Endpoints |
|---|---|---|
| notifications-delivery | Telegram Bot API (`api.telegram.org`) | 64, 65 |
| notifications-delivery | Email provider (SMTP/Resend — ENV-driven) | 59, 60, 61, 62 |
| watchlist-management | None (prices via internal DB) | — |

### Live vs. Persisted-Read Summary
| Module | Pattern |
|---|---|
| portfolio-intelligence (45,47,48) | Persisted-read (`portfolio_intelligence_snapshots`) |
| stock-research-workbench (81,84) | Persisted-read (`workbench_snapshots`) — 202 if absent |
| today-trade-review (66–69) | Persisted-read (`today_review_runs` + enrichment join) |
| historical-context-snapshots (72–78) | Persisted-read (various snapshot tables) |
| research-hub (79–80) | Snapshot-first (env-flag), live fallback |
| ai-investment-copilot (86–90) | Snapshot-first (env-flag), live fallback |
| watchlist-management GET detail (15) | **Live** — fans out to `PriceTick` + `SignalResult` |
| portfolio-management summary/allocation/changes (40–42) | **Live** — fans out to `PriceTick` + `SignalResult` |
| alerts evaluate (26) | **Live** + writes `AlertEvent` |

### Endpoint Count by Module
| Module | Count |
|---|---|
| auth-identity | 5 |
| subscription-billing | 7 |
| watchlist-management | 8 |
| alerts-monitoring | 11 |
| portfolio-management | 13 |
| portfolio-intelligence | 4 |
| trade-journal | 6 |
| notifications-delivery | 11 |
| today-trade-review | 5 |
| historical-context-snapshots | 8 |
| research-hub | 2 |
| stock-research-workbench | 5 |
| ai-investment-copilot | 5 |
| pipeline-orchestration | 3 |
| **Total** | **93** |
