# Track B — Backend User-Account & Platform Module Inventory

**Date:** 2026-06-16  
**Scope:** 14 modules under `backend/src/modules/`  
**Base URL prefix for all endpoints:** `/api/v1` (unless noted)

---

## Legend

- **Auth:** `public` = no middleware; `authed` = `requireAuth` JWT middleware; `admin` = requires `x-admin-key` header matching `ADMIN_API_KEY` env var.
- **Auth Gap:** flagged when a mutating or sensitive endpoint has no `requireAuth`, or when the controller falls back to `'default-user'` even though `requireAuth` is present on the router (indicating the middleware and the fallback are both present — the fallback is dead code but still noteworthy).
- **Data Origin:** Prisma model names (PascalCase = `prisma.<model>`) or raw-SQL table names (snake_case).

---

## 1. auth-identity

**Route prefix:** `/api/v1/auth`  
**Router file:** `auth-identity.router.ts`  
**Auth implementation:** Custom HMAC-SHA256 JWT, 8-hour TTL. `requireAuth` middleware validates bearer token → sets `req.user`.

| Method | Path | Purpose | Request (key fields) | Response (shape) | Auth | Data Origin |
|--------|------|---------|----------------------|-----------------|------|-------------|
| POST | `/api/v1/auth/signup` | Register new user; returns JWT | `{ email, password, name? }` | `{ user: AuthUserDto, accessToken }` | public (rate-limited) | `AppUser` + auto-creates `UserSubscription` (FREE plan) |
| POST | `/api/v1/auth/login` | Authenticate; returns JWT | `{ email, password }` | `{ user: AuthUserDto, accessToken }` | public (rate-limited) | `AppUser` — updates `lastLoginAt` |
| POST | `/api/v1/auth/logout` | Invalidate session (stateless — just returns OK) | — | `{ success: true }` | authed | None (no server-side session) |
| GET | `/api/v1/auth/me` | Return current user profile | — | `AuthUserDto { id, email, name, createdAt, updatedAt, lastLoginAt }` | authed | `AppUser` |
| PATCH | `/api/v1/auth/me` | Update display name | `{ name? }` | `AuthUserDto` | authed | `AppUser` |

**Notes:**
- JWT secret comes from `AUTH_SECRET` env var; falls back to a randomly-generated per-process key in dev (all tokens are invalidated on restart in dev).
- Logout is stateless — token is not blacklisted; the client simply discards it.
- No password-reset or email-verification flows.

---

## 2. subscription-billing

**Route prefix:** `/api/v1/subscription`  
**Router file:** `subscription-billing.router.ts`  
**Auth:** `router.use(requireAuth)` — entire router is authed.

| Method | Path | Purpose | Request (key fields) | Response (shape) | Auth | Data Origin |
|--------|------|---------|----------------------|-----------------|------|-------------|
| GET | `/api/v1/subscription/me` | Current user's subscription, plan, and feature limits | — | `SubscriptionMeDto { userId, subscription, plan, features[] }` | authed | `UserSubscription`, `SubscriptionPlan`, live usage counts |
| GET | `/api/v1/subscription/plans` | List all available plans | — | `SubscriptionPlanDto[]` | authed | `SubscriptionPlan` |
| POST | `/api/v1/subscription/change-plan` | Change own plan | `{ planCode: FREE|PRO|ADMIN, status? }` | `UserSubscriptionDto` | authed | `UserSubscription` |
| GET | `/api/v1/subscription/usage` | Return usage counters for all gated features | — | `UsageDto { userId, counters: FeatureLimitDto[] }` | authed | `UserSubscription` + counts from `Portfolio`, `Watchlist`, `AlertRule`, `UsageCounter` |
| GET | `/api/v1/subscription/features` | Detailed per-feature limit/usage | — | `FeatureLimitDto[] { feature, usageKey, label, used, limit, allowed }` | authed | Same as usage |
| GET | `/api/v1/subscription/provider` | Billing provider status | — | `{ status: string, message: string }` | authed | Computed (no external provider wired — always returns stub OK) |
| PATCH | `/api/v1/subscription/users/:userId/plan` | Admin: change any user's plan | `{ planCode, status? }` + `x-admin-key` header | `UserSubscriptionDto` | authed + `x-admin-key` header | `UserSubscription` |

**Auth Gaps / Notes:**
- `PATCH /subscription/users/:userId/plan` relies on `x-admin-key` header check inside the controller (`requireAdmin(req.headers)`). The router-level `requireAuth` ensures a valid JWT exists, but admin check is a secondary header — not middleware. If `ADMIN_API_KEY` env var is not set, the endpoint throws `403 'Admin API key is not configured'`.
- Controller uses `currentUserId = req.user?.id || 'default-user'` — the `|| 'default-user'` fallback is dead code when `requireAuth` is active but is a latent security gap if the middleware is bypassed.
- `SUBSCRIPTION_LIMITS_DISABLED=true` env var bypasses all feature-gate checks (documented dev shortcut; does not apply during tests).
- `SubscriptionBillingRepository.ensureDefaults()` is called on every `listPlans()` — auto-seeds plans and a `default-user` row; this is a side-effect on reads.

---

## 3. watchlist-management

**Route prefix:** `/api/v1/watchlists`  
**Router file:** `watchlist-management.router.ts`  
**Auth:** `router.use(requireAuth)` — entire router is authed.

| Method | Path | Purpose | Request (key fields) | Response (shape) | Auth | Data Origin |
|--------|------|---------|----------------------|-----------------|------|-------------|
| GET | `/api/v1/watchlists` | List user's watchlists | — | `{ watchlists: WatchlistDto[] }` | authed | `Watchlist` |
| POST | `/api/v1/watchlists` | Create watchlist | `{ name, description? }` | `WatchlistDto` | authed | `Watchlist`; checks subscription limit via `UserSubscription` |
| GET | `/api/v1/watchlists/:id` | Get watchlist with enriched items | `?sort=recentlyAdded|signalScoreDesc|dailyChangeDesc|dailyChangeAsc|symbolAsc` | `WatchlistDetailDto { watchlist, items: WatchlistDashboardItemDto[], source, generatedAt }` | authed | `Watchlist`, `WatchlistItem`; enriched live from `price_ticks` + `signal_results` |
| PATCH | `/api/v1/watchlists/:id` | Update watchlist metadata | `{ name?, description? }` | `WatchlistDto` | authed | `Watchlist` |
| DELETE | `/api/v1/watchlists/:id` | Delete watchlist | — | 204 | authed | `Watchlist` |
| POST | `/api/v1/watchlists/:id/items` | Add instrument to watchlist | `{ instrumentId, notes?, tags? }` | `WatchlistItemDto` | authed | `WatchlistItem`; validates instrument via `instruments` table |
| PATCH | `/api/v1/watchlists/:id/items/:itemId` | Update watchlist item (notes, tags) | `{ notes?, tags? }` | `WatchlistItemDto` | authed | `WatchlistItem` |
| DELETE | `/api/v1/watchlists/:id/items/:itemId` | Remove item from watchlist | — | 204 | authed | `WatchlistItem` |

**Notes:**
- `GET /watchlists/:id` triggers live enrichment (price + signal) on every call — not a persisted-read. Can be slow for large watchlists.
- `currentUserId` fallback to `'default-user'` is present in controller but dead code when `requireAuth` is active.

---

## 4. alerts-monitoring

**Route prefix:** `/api/v1/alerts`  
**Router file:** `alerts-monitoring.router.ts`  
**Auth:** `router.use(requireAuth)` — entire router is authed.

| Method | Path | Purpose | Request (key fields) | Response (shape) | Auth | Data Origin |
|--------|------|---------|----------------------|-----------------|------|-------------|
| GET | `/api/v1/alerts/rules` | List user's alert rules | — | `{ rules: AlertRuleDto[] }` | authed | `AlertRule` |
| POST | `/api/v1/alerts/rules` | Create alert rule | `{ name, type, scope, condition, instrumentId?, portfolioId?, watchlistId?, enabled? }` | `AlertRuleDto` | authed | `AlertRule`; checks subscription limit |
| GET | `/api/v1/alerts/rules/:id` | Get single alert rule | — | `AlertRuleDto` | authed | `AlertRule` |
| PATCH | `/api/v1/alerts/rules/:id` | Update alert rule | `{ name?, type?, scope?, condition?, enabled? }` | `AlertRuleDto` | authed | `AlertRule` |
| DELETE | `/api/v1/alerts/rules/:id` | Delete alert rule | — | 204 | authed | `AlertRule` |
| POST | `/api/v1/alerts/evaluate` | Manually trigger evaluation of all rules for the current user | — | `AlertEvaluationResult` | authed | `AlertRule`, live market data + signals |
| GET | `/api/v1/alerts/events` | List alert events for the user | — | `{ events: AlertEventDto[] }` | authed | `AlertEvent` |
| PATCH | `/api/v1/alerts/events/:id/read` | Mark event as read | — | `AlertEventDto` | authed | `AlertEvent` |
| PATCH | `/api/v1/alerts/events/:id/dismiss` | Dismiss event | — | `AlertEventDto` | authed | `AlertEvent` |
| POST | `/api/v1/alerts/events/mark-all-read` | Mark all events read | — | `{ count: number }` | authed | `AlertEvent` |
| GET | `/api/v1/alerts/summary` | Unread/critical count summary | — | `{ unreadCount, criticalCount }` | authed | `AlertEvent` (computed in-memory from listEvents) |

**Notes:**
- Alert types: `PRICE_ABOVE`, `PRICE_BELOW`, `DAILY_MOVE_ABOVE`, `DAILY_MOVE_BELOW`, `SIGNAL_SCORE_ABOVE`, `SIGNAL_DIRECTION_CHANGED`, `PORTFOLIO_HOLDING_DRAWDOWN`, `PORTFOLIO_BEARISH_SIGNAL`, `WATCHLIST_SIGNAL_SCORE_ABOVE`, `WATCHLIST_PRICE_ABOVE`, `WATCHLIST_PRICE_BELOW`.
- `GET /alerts/summary` fetches all events and counts in memory — not a DB aggregate query; can be slow for users with many events.
- `currentUserId` fallback to `'default-user'` is present but dead code under `requireAuth`.

---

## 5. portfolio-management

**Route prefix:** `/api/v1/portfolios`  
**Router file:** `portfolio-management.router.ts`  
**Auth:** `router.use(requireAuth)` — entire router is authed.

| Method | Path | Purpose | Request (key fields) | Response (shape) | Auth | Data Origin |
|--------|------|---------|----------------------|-----------------|------|-------------|
| GET | `/api/v1/portfolios` | List user's portfolios | — | `{ portfolios: PortfolioDto[] }` | authed | `Portfolio` |
| POST | `/api/v1/portfolios` | Create portfolio | `{ name, baseCurrency, description? }` | `PortfolioDto` | authed | `Portfolio`; checks subscription limit |
| GET | `/api/v1/portfolios/:id` | Get portfolio with holdings | — | `{ portfolio: PortfolioDto, holdings: PortfolioHoldingDto[] }` | authed | `Portfolio`, `PortfolioHolding` |
| PATCH | `/api/v1/portfolios/:id` | Update portfolio | `{ name?, baseCurrency?, description? }` | `PortfolioDto` | authed | `Portfolio` |
| DELETE | `/api/v1/portfolios/:id` | Delete portfolio | — | 204 | authed | `Portfolio` |
| POST | `/api/v1/portfolios/:id/holdings` | Add holding | `{ instrumentId, symbol, quantity, averageCost, currency? }` | `PortfolioHoldingDto` | authed | `PortfolioHolding` |
| PATCH | `/api/v1/portfolios/:id/holdings/:holdingId` | Update holding | `{ quantity?, averageCost? }` | `PortfolioHoldingDto` | authed | `PortfolioHolding` |
| DELETE | `/api/v1/portfolios/:id/holdings/:holdingId` | Remove holding | — | 204 | authed | `PortfolioHolding` |
| GET | `/api/v1/portfolios/:id/summary` | Portfolio P&L summary | — | `PortfolioSummaryDto { totalValue, totalCost, totalGainLoss, totalGainLossPct, holdingValuations[] }` | authed | `Portfolio`, `PortfolioHolding`, live price from `price_ticks` |
| GET | `/api/v1/portfolios/:id/allocation` | Portfolio allocation breakdown | — | `PortfolioAllocationDto { buckets[], holdingValuations[] }` | authed | `Portfolio`, `PortfolioHolding`, `instruments`, live price |
| GET | `/api/v1/portfolios/:id/changes` | Holdings with recent signal/price changes | `?lossThreshold=<float>` | `PortfolioChangesDto { lossCrossings[], signalFlips[] }` | authed | `Portfolio`, `PortfolioHolding`, `signal_results`, live price |
| GET | `/api/v1/portfolios/:id/transactions` | List portfolio transactions | — | `{ transactions: PortfolioTransactionDto[] }` | authed | `PortfolioTransaction` |
| POST | `/api/v1/portfolios/:id/transactions` | Record transaction | `{ type: BUY|SELL|DIVIDEND, quantity, price, executedAt, notes? }` | `PortfolioTransactionDto` | authed | `PortfolioTransaction` |

**Notes:**
- Summary, allocation, and changes endpoints perform live price/signal lookups on every call (not persisted-read). May be slow for large portfolios.
- `currentUserId` fallback to `'default-user'` is dead code under `requireAuth`.

---

## 6. portfolio-intelligence

**Route prefix:** `/api/v1/portfolios/:id`  
**Router file:** `portfolio-intelligence.router.ts`  
**Auth:** `router.use(requireAuth)` — entire router is authed.

| Method | Path | Purpose | Request (key fields) | Response (shape) | Auth | Data Origin |
|--------|------|---------|----------------------|-----------------|------|-------------|
| GET | `/api/v1/portfolios/:id/intelligence` | Persisted-read: portfolio AI intelligence snapshot | — | `PortfolioIntelligenceResponse { overallHealthScore, status, holdingIntelligence[], signalOverlay, marketPosture, redFlags[], review[], ... }` | authed | `PortfolioIntelligenceSnapshot` (payloadJson); falls back to live compute if `PORTFOLIO_SNAPSHOT_READS=0` |
| POST | `/api/v1/portfolios/:id/intelligence/refresh` | Force recompute + upsert intelligence snapshot | — | `PortfolioIntelligenceResponse` | authed | Recomputes from `PortfolioHolding`, `DailyInstrumentSnapshot`, live signals; writes to `PortfolioIntelligenceSnapshot` |
| GET | `/api/v1/portfolios/:id/red-flags` | Persisted-read: red flags only | — | `{ redFlags: RedFlag[] }` | authed | `PortfolioIntelligenceSnapshot` |
| GET | `/api/v1/portfolios/:id/review` | Persisted-read: review items only | — | `{ review: ReviewItem[] }` | authed | `PortfolioIntelligenceSnapshot` |

**Notes:**
- `GET /intelligence` lazily materialises the snapshot on first call if none exists — not a pure persisted-read; mutates DB on cache-miss.
- `PORTFOLIO_SNAPSHOT_READS` env flag (default ON) controls snapshot-first behaviour.
- All three GET endpoints read from the same `portfolio_intelligence_snapshots` table; `redFlags` and `review` extract sub-fields from `payloadJson`.

---

## 7. trade-journal

**Route prefix:** `/api/v1/trade-journal`  
**Router file:** `trade-journal.router.ts`  
**Auth:** `router.use(requireAuth)` — entire router is authed.

| Method | Path | Purpose | Request (key fields) | Response (shape) | Auth | Data Origin |
|--------|------|---------|----------------------|-----------------|------|-------------|
| GET | `/api/v1/trade-journal/post-mortem` | Aggregated win/loss/skip analysis across all entries | — | `PostMortemSummary { totalEntries, byDecision, byDirection, tagSummary[], avgConviction, ... }` | authed | `TradeJournalEntry` (aggregate) |
| POST | `/api/v1/trade-journal` | Create journal entry | `{ symbol, direction: LONG|SHORT, decision: ACTED|SKIPPED|WATCHING, reviewedAt, instrumentId?, sourceSignalId?, entryPrice?, stopPrice?, targetPrice?, thesis?, conviction?(1-10), outcomeStatus?, exitPrice?, exitAt?, notes?, tags? }` | `TradeJournalEntryDto` | authed | `TradeJournalEntry` |
| GET | `/api/v1/trade-journal` | List entries with filters | `?decision=&outcomeStatus=&symbol=&fromDate=&toDate=&page=&pageSize=` | `{ entries: TradeJournalEntryDto[], total }` | authed | `TradeJournalEntry` |
| GET | `/api/v1/trade-journal/:id` | Get single entry | — | `TradeJournalEntryDto` | authed | `TradeJournalEntry` |
| PATCH | `/api/v1/trade-journal/:id` | Update entry | Partial of create body | `TradeJournalEntryDto` | authed | `TradeJournalEntry` |
| DELETE | `/api/v1/trade-journal/:id` | Delete entry | — | 204 | authed | `TradeJournalEntry` |

**Notes:**
- `GET /trade-journal/post-mortem` is registered *before* `GET /trade-journal/:id` to prevent route-parameter shadowing.
- Tags are stored as JSON array in `TradeJournalEntry.tags`.
- `currentUserId` fallback to `'default-user'` is dead code under `requireAuth`.

---

## 8. notifications-delivery

**Route prefix:** `/api/v1/notifications`  
**Router file:** `notifications-delivery.router.ts`  
**Auth:** `router.use(requireAuth)` — entire router is authed.

| Method | Path | Purpose | Request (key fields) | Response (shape) | Auth | Data Origin |
|--------|------|---------|----------------------|-----------------|------|-------------|
| GET | `/api/v1/notifications/preferences` | Get user notification preferences | — | `NotificationPreferenceDto { userId, emailEnabled, emailAlerts, emailDailyDigest, emailWeeklyDigest, telegramEnabled, ... }` | authed | `NotificationPreference` (upserted on read) |
| PATCH | `/api/v1/notifications/preferences` | Update notification preferences | `{ emailEnabled?, emailAlerts?, emailDailyDigest?, emailWeeklyDigest?, telegramEnabled? }` | `NotificationPreferenceDto` | authed | `NotificationPreference` |
| GET | `/api/v1/notifications/events` | List delivery events for user | — | `{ events: NotificationEventDto[] }` | authed | `NotificationEvent` |
| GET | `/api/v1/notifications/provider-status` | Email provider operational status | — | `NotificationProviderStatus { configured, provider, status, message }` | authed | Computed (env vars check) |
| POST | `/api/v1/notifications/test-email` | Send a test email to the user | — | `{ delivered: boolean, message }` | authed | External: email provider (SMTP/SendGrid via `NotificationProvider`) |
| POST | `/api/v1/notifications/send-alert-digest` | Send alert digest email now | — | `{ delivered: boolean }` | authed | `AlertEvent` → external email |
| POST | `/api/v1/notifications/send-daily-digest` | Send daily digest email now | — | `{ delivered: boolean }` | authed | Copilot market brief → external email |
| POST | `/api/v1/notifications/send-weekly-digest` | Send weekly digest email now | — | `{ delivered: boolean }` | authed | AI summary → external email |
| GET | `/api/v1/notifications/telegram/status` | Telegram bot connection status | — | `TelegramStatus { configured, chatId, botToken, status, message }` | authed | Computed (env vars: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`) |
| GET | `/api/v1/notifications/telegram/setup` | Auto-discover Telegram chat ID from most recent /start message | — | `{ chatId, username, hint }` or 404 | authed | External: Telegram Bot API (`getUpdates`) |
| POST | `/api/v1/notifications/telegram/test` | Send a test Telegram message | — | `{ status: SENT|FAILED, messageId?, error? }` | authed | External: Telegram Bot API (`sendMessage`) |

**Notes:**
- External providers: email (SMTP/provider env vars) and Telegram Bot API. Both are fire-and-forget; delivery status is logged to `NotificationEvent`.
- `GET /telegram/setup` calls Telegram `getUpdates` — requires bot to have received a `/start` message. Returns 404 if no updates found.
- `currentUserId` fallback to `'default-user'` is dead code under `requireAuth`.

---

## 9. today-trade-review

**Route prefix:** `/api/v1/today-review`  
**Router file:** `today-trade-review.router.ts`  
**Auth:** Per-route `requireAuth` (not router-level middleware — each route individually applies it).

| Method | Path | Purpose | Request (key fields) | Response (shape) | Auth | Data Origin |
|--------|------|---------|----------------------|-----------------|------|-------------|
| GET | `/api/v1/today-review/latest` | Persisted-read: most recent completed run + grouped candidates | `?region=&assetType=&limit=&offset=&enrich=` | `TodayReviewRunResponse { run: TodayReviewRunDto, groups: TodayReviewGroupedCandidates }` | authed | `TodayReviewRun`, `TodayReviewCandidate`; enriched at read-time with `price_ticks`, `smart_money_context_snapshots`, `fno_ban_list`, `instruments`, `earnings_events` |
| GET | `/api/v1/today-review/runs` | List run history | `?region=&assetType=&limit=&offset=` | `TodayReviewRunHistoryResponse { runs: TodayReviewRunDto[], total }` | authed | `TodayReviewRun` |
| GET | `/api/v1/today-review/runs/:id` | Get specific run with candidates | — | `TodayReviewRunResponse` | authed | `TodayReviewRun`, `TodayReviewCandidate` (enriched) |
| GET | `/api/v1/today-review/candidates/:id` | Get single candidate detail | — | `TodayReviewCandidateDto` | authed | `TodayReviewCandidate` (enriched) |
| POST | `/api/v1/today-review/run` | Trigger new review run (pipeline command) | `{ region?, assetType? }` (body or query) | `TodayReviewRunResponse` (201) | authed | Reads from many upstream tables; writes `TodayReviewRun` + `TodayReviewCandidate` |

**Recent refactor notes (today-review dense-table UX refactor — landed in commits 3681ba9/0fc728f):**
- `direction` and `state` columns were **dropped** from the candidate dense-table view in the frontend; they are still present in `TodayReviewCandidateDto` and returned by the API.
- Earnings and F&O ban columns were also dropped from the dense table. The underlying fields (`earningsProximity`, `inFnoBan`) are still computed and present in the API response (`enrich=true`). Callers that don't need enrichment can pass `?enrich=false` to skip heavy join queries.
- `catalogSector`, `range52wPositionPct`, `range52wHigh`, `range52wLow`, `range52wCurrentClose`, `smartMoneyStatus`, `smartMoneyScore` were added as read-time join fields (batch-loaded, not stored in candidate row).
- No endpoint paths or HTTP methods changed; only the `TodayReviewCandidateDto` response shape gained new fields.

**Notes:**
- `POST /today-review/run` is a write-triggering endpoint with only `requireAuth` — no admin gate. Any authenticated user can trigger a full pipeline review run. **Auth gap: should be admin-only or rate-limited.**
- `?enrich=false` is an opt-out (defaulting to enriched). Without it, reads do multiple batch queries against `price_ticks` (~252-day window), `fno_ban_list`, `smart_money_context_snapshots`, and `earnings_events`.

---

## 10. historical-context-snapshots

**Route prefix:** `/api/v1/context-snapshots`  
**Router file:** `historical-context-snapshots.router.ts`  
**Auth:** `router.use(requireAuth)` — entire router is authed.

| Method | Path | Purpose | Request (key fields) | Response (shape) | Auth | Data Origin |
|--------|------|---------|----------------------|-----------------|------|-------------|
| POST | `/api/v1/context-snapshots/generate` | Generate/upsert context snapshots for a date | `{ snapshotDate?, limit?(1-250), region?(default IN), assetType?(default STOCK) }` | `SnapshotGenerateSummary { market, sectors, countries, smartMoney, dataQuality, warnings[] }` | authed | Reads live from `MarketContextIntelligence`, `SmartMoneyIntelligence`, `DataQuality`; writes to `MarketContextSnapshot`, `SectorContextSnapshot`, `CountryContextSnapshot`, `SmartMoneyContextSnapshot`, `DataQualitySnapshot` |
| GET | `/api/v1/context-snapshots/summary` | Coverage summary across all snapshot types | `?from=&to=&date=&region=&assetType=` | `SnapshotCount[]` | authed | `MarketContextSnapshot`, `SectorContextSnapshot`, `CountryContextSnapshot`, `SmartMoneyContextSnapshot` |
| GET | `/api/v1/context-snapshots/market` | Market-level snapshots | `?from=&to=&date=&region=&assetType=&limit=` | `{ items: MarketContextSnapshotDto[] }` | authed | `MarketContextSnapshot` |
| GET | `/api/v1/context-snapshots/sectors` | Sector-level snapshots | `?from=&to=&sector=&region=&assetType=&limit=` | `{ items: SectorContextSnapshotDto[] }` | authed | `SectorContextSnapshot` |
| GET | `/api/v1/context-snapshots/countries` | Country-level snapshots | `?from=&to=&country=&region=&assetType=&limit=` | `{ items: CountryContextSnapshotDto[] }` | authed | `CountryContextSnapshot` |
| GET | `/api/v1/context-snapshots/smart-money` | Smart-money accumulation/distribution snapshots | `?from=&to=&instrumentId=&region=&assetType=&limit=` | `{ items: SmartMoneyContextSnapshotDto[] }` | authed | `SmartMoneyContextSnapshot` |
| GET | `/api/v1/context-snapshots/coverage` | Count of snapshot records by date/type | `?from=&to=&region=&assetType=` | `SnapshotCoverage { market, sectors, countries, smartMoney }` | authed | All snapshot tables (aggregate counts) |
| GET | `/api/v1/context-snapshots/lookup` | Multi-type lookup for a date+lookback | `?date= (required), ?lookbackDays=(1-60), ?instrumentId=, ?sector=, ?country=, ?region=, ?assetType=` | `SnapshotLookupResult { market[], sectors[], countries[], smartMoney[] }` | authed | All context snapshot tables |

**Notes:**
- `POST /generate` calls live intelligence services at request time — not idempotent-safe (upserts). Any authenticated user can trigger snapshot generation. **Auth gap: should be admin-only.**
- Sector filtering uses a validated sector allowlist (`isKnownSector()`); unknown sectors are skipped with warnings.

---

## 11. research-hub

**Route prefix:** `/api/v1/research`  
**Router file:** `research-hub.router.ts`  
**Auth:** NO `requireAuth` on either route — **fully public**.

| Method | Path | Purpose | Request (key fields) | Response (shape) | Auth | Data Origin |
|--------|------|---------|----------------------|-----------------|------|-------------|
| GET | `/api/v1/research/overview` | Aggregated research-hub overview: market readiness, signal evidence, strategy proof, priorities, actionability | `?region=&assetType=&live=` | `ResearchOverview { marketReadiness, signalEvidence, strategyProof, priorities, actionability, nextActions[], whatChanged, backtestSummary }` | **public** (NO auth) | Snapshot-first reads from `daily_instrument_snapshots`, `pipeline_runs`, `calibration_results`; falls back to live fan-out. Also reads from `TodayReviewRun`, `TradePlanRiskEngine` |
| GET | `/api/v1/research/health` | Research hub system health check | — | `{ status, dimensions[], timestamp }` | **public** (NO auth) | Computed from upstream service health checks |

**AUTH GAP — CRITICAL:**
- Both endpoints have **no `requireAuth`**. The router has no middleware, and no per-route auth guard. Any unauthenticated caller can read the full research overview (market regime, signal evidence, calibration status, strategy proof chains, trade priorities).
- `?live=true` forces live fan-out instead of snapshot reads — potentially expensive for unauthenticated callers.

---

## 12. stock-research-workbench

**Route prefix:** `/api/v1/research/stocks/:instrumentId`  
**Router file:** `stock-research-workbench.router.ts`  
**Auth:** NO `requireAuth` on any route — **fully public**.

| Method | Path | Purpose | Request (key fields) | Response (shape) | Auth | Data Origin |
|--------|------|---------|----------------------|-----------------|------|-------------|
| GET | `/api/v1/research/stocks/:instrumentId/overview` | Basic instrument overview (name, sector, live price) | — | `StockOverviewDto { symbol, companyName, sector, exchange, currentPrice, dailyChange, ... }` | **public** (NO auth) | `instruments`; live price from `price_ticks` |
| GET | `/api/v1/research/stocks/:instrumentId/performance` | Historical price performance metrics | `?range=1M|3M|6M|1Y|2Y|5Y` | `ResearchPerformanceMetrics { ohlcv[], returns, volatility, drawdown }` | **public** (NO auth) | `price_ticks` |
| GET | `/api/v1/research/stocks/:instrumentId/peers` | Persisted-read: sector peers from workbench snapshot | — | `{ peers: PeerDto[] }` or 202 if not yet computed | **public** (NO auth) | `WorkbenchSnapshot.payloadJson` |
| GET | `/api/v1/research/stocks/:instrumentId/relative-strength` | Relative strength vs index | `?range=` | `RelativeStrengthDto { values[], benchmarkSymbol }` | **public** (NO auth) | `price_ticks` |
| GET | `/api/v1/research/stocks/:instrumentId/workbench` | Full persisted workbench snapshot | — | Full `WorkbenchPayload` or 202 (NOT_YET_COMPUTED) or 404 | **public** (NO auth) | `WorkbenchSnapshot.payloadJson` |

**AUTH GAP:**
- All 5 endpoints are public with no `requireAuth`. Unauthenticated callers can read full workbench snapshots (signal scores, calibration, trade plan, sector peers) for any instrument.
- `peers` and `workbench` return 202 with `{ _status: 'NOT_YET_COMPUTED', message: '...' }` when the snapshot has not been computed — this is a documented sentinel.

---

## 13. ai-investment-copilot

**Route prefix:** `/api/v1/copilot`  
**Router file:** `ai-investment-copilot.router.ts`  
**Auth:** `router.use(requireAuth)` — entire router is authed.

| Method | Path | Purpose | Request (key fields) | Response (shape) | Auth | Data Origin |
|--------|------|---------|----------------------|-----------------|------|-------------|
| POST | `/api/v1/copilot/stock-summary` | AI narrative summary for a stock | `{ instrumentId }` | `CopilotSummaryResponse { summary, disclaimer, generatedAt, provenance }` | authed | Snapshot-first: `DailyInstrumentSnapshot`; falls back to live fan-out from `WorkbenchSnapshot`, `signal_results`, `smart_money_context_snapshots`, `market_context` |
| POST | `/api/v1/copilot/portfolio-summary` | AI narrative summary for a portfolio | `{ portfolioId }` | `CopilotSummaryResponse` | authed | `Portfolio`, `PortfolioHolding`, `PortfolioIntelligenceSnapshot` |
| POST | `/api/v1/copilot/watchlist-summary` | AI narrative summary for a watchlist | `{ watchlistId }` | `CopilotSummaryResponse` | authed | `Watchlist`, `WatchlistItem`, enriched with signals |
| GET | `/api/v1/copilot/market-brief` | AI market brief narrative | `?region=` | `CopilotSummaryResponse` | authed | `market_context_intelligence`, `daily_instrument_snapshots` |
| GET | `/api/v1/copilot/alert-digest` | AI narrative digest of recent unread alerts | — | `CopilotSummaryResponse` | authed | `AlertEvent` (via AlertsMonitoringService) |

**Notes:**
- All summaries include `disclaimer: 'For research support only, not financial advice.'`
- `COPILOT_SNAPSHOT_READS` env flag (default ON) controls snapshot-first vs live fan-out.
- Subscription gate: `RUN_COPILOT_SUMMARY` feature (10/day FREE, 100/day PRO, unlimited ADMIN); `assertAllowed` is called before compute; usage tracked in `UsageCounter` table.
- `currentUserId` fallback to `'default-user'` is dead code under `requireAuth`.

---

## 14. pipeline-orchestration

**Route prefix:** `/api/v1/pipeline`  
**Router file:** `pipeline-orchestration.router.ts`  
**Auth:** NO `requireAuth` on any route — **fully public**.

| Method | Path | Purpose | Request (key fields) | Response (shape) | Auth | Data Origin |
|--------|------|---------|----------------------|-----------------|------|-------------|
| GET | `/api/v1/pipeline/status` | Pipeline run history and stage status | `?region=&assetType=&timeframe=&pipelineKey=&limit=(1-100)&stageKeys=` | `PipelineStatusSnapshot { runs: PipelineStatusRunDto[], stages: PipelineStatusStageDto[], ... }` | **public** (NO auth) | `PipelineRun`, `PipelineStageRun` |
| GET | `/api/v1/pipeline/commands/catalog` | Available pipeline command definitions | `?region=&assetType=&timeframe=&pipelineKey=` | `PipelineCommandCatalogResponse { commands: PipelineCommandCatalogItem[], availability: PipelineCommandAvailability }` | **public** (NO auth) | Computed from static command registry |
| POST | `/api/v1/pipeline/commands` | Execute a pipeline command (triggers data ingestion/processing) | `{ commandKey, region?, assetType?, timeframe?, pipelineKey?, runMode: single_batch|incremental_changed_only|full_latest_trading_date, batchSize?(1-100), offset?, reason?, params? }` | `PipelineCommandResponse { run, stages[], summary }` | **public** (NO auth) | Writes `PipelineRun`, `PipelineStageRun`; drives downstream data pipeline |

**AUTH GAP — CRITICAL:**
- All three endpoints have **no `requireAuth`**. The router has no middleware.
- `POST /pipeline/commands` is a **mutating admin action** (triggers data ingestion, signal generation, market data pulls) with zero authentication. Any unauthenticated HTTP caller can trigger full pipeline runs.
- The controller falls back to `'local-manual-operator'` for `requestedByUserId` when no `req.user` — confirming there is no auth expectation built in.
- `force=true` is explicitly blocked in validation (throws 400), but the underlying command execution is otherwise unrestricted.
- `Cache-Control: no-store` is set on status and catalog reads.

---

## Cross-Cutting Findings

### AUTH GAPS (Ranked by Severity)

| Severity | Module | Endpoint(s) | Issue |
|----------|--------|------------|-------|
| **CRITICAL** | pipeline-orchestration | `POST /api/v1/pipeline/commands` | Unauthenticated mutating endpoint — triggers full data pipeline runs with no auth at all |
| **CRITICAL** | pipeline-orchestration | `GET /api/v1/pipeline/status`, `GET /api/v1/pipeline/commands/catalog` | Unauthenticated reads of pipeline internals |
| **CRITICAL** | research-hub | `GET /api/v1/research/overview`, `GET /api/v1/research/health` | Unauthenticated reads of full market intelligence (signals, calibration, strategy proofs) |
| **HIGH** | stock-research-workbench | All 5 endpoints | Unauthenticated reads of full workbench snapshots (per-instrument signal/calibration/trade-plan data) |
| **MEDIUM** | today-trade-review | `POST /api/v1/today-review/run` | Any authenticated user can trigger a full review build (should be admin-only or rate-limited) |
| **MEDIUM** | historical-context-snapshots | `POST /api/v1/context-snapshots/generate` | Any authenticated user can trigger snapshot regeneration (should be admin-only) |
| **LOW** | subscription-billing | `PATCH /api/v1/subscription/users/:userId/plan` | Admin check is a secondary header inside the controller, not middleware; depends on `ADMIN_API_KEY` env var being set |
| **INFO** | watchlist, alerts, portfolio-management, portfolio-intelligence, trade-journal, notifications, copilot | All | `currentUserId = req.user?.id \|\| 'default-user'` fallback is dead code when `requireAuth` is active — latent data-isolation gap if middleware is ever bypassed |

### STUBBED / PLACEHOLDER RESPONSES

| Module | Endpoint | Issue |
|--------|---------|-------|
| subscription-billing | `GET /api/v1/subscription/provider` | Returns computed stub (no real billing provider integrated) — always returns OK-ish status |
| auth-identity | `POST /api/v1/auth/logout` | Stateless — no token blacklist; client must discard token; "logout" is purely cosmetic on the server side |

### DEAD / UNUSED PATTERNS

- The `'default-user'` fallback in controllers for watchlist, alerts, portfolio, trade-journal, copilot is unreachable in production because `requireAuth` is applied at the router level. The pattern exists in every module but is dead code. If `requireAuth` is ever removed or bypassed, all user data would silently scope to the same `'default-user'` row — a data isolation failure.

### EXTERNAL API HITS

| Module | External Service | When |
|--------|-----------------|------|
| notifications-delivery | Email provider (SMTP/SendGrid, via env vars) | On `test-email`, `send-alert-digest`, `send-daily-digest`, `send-weekly-digest` |
| notifications-delivery | Telegram Bot API | On `GET /telegram/setup` (`getUpdates`), `POST /telegram/test` (`sendMessage`) |

### SNAPSHOT vs. LIVE-READ SUMMARY

| Module | Read Strategy |
|--------|--------------|
| portfolio-intelligence | Snapshot-first (`PortfolioIntelligenceSnapshot`); lazy materialise on first GET; env flag `PORTFOLIO_SNAPSHOT_READS` |
| ai-investment-copilot | Snapshot-first (`DailyInstrumentSnapshot`); env flag `COPILOT_SNAPSHOT_READS` |
| stock-research-workbench | Snapshot-first (`WorkbenchSnapshot`); returns 202 if not computed |
| research-hub | Snapshot-first (`ResearchHubSnapshotReader`); env flag `RESEARCH_HUB_SNAPSHOT_READS` |
| today-trade-review | Persisted-read (`TodayReviewRun`/`TodayReviewCandidate`); enriched at read-time |
| historical-context-snapshots | Persisted-read (all context snapshot tables) |
| watchlist-management | `GET /:id` does live enrichment (price + signal) every call — not persisted |
| portfolio-management | Summary/allocation/changes do live price+signal lookups every call — not persisted |
| alerts-monitoring | `GET /alerts/summary` fetches all events in memory, not a DB aggregate |
