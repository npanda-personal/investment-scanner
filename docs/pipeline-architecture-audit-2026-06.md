# Pipeline Architecture Audit — Production-Grade Scheduled Multi-Market Ingestion

_Date: 2026-06-07 · Author: Architect review (Claude) · Mode: READ-ONLY — findings + recommended design only, no code changed, execution pending owner approval_

> Context: expanding from India-only to **IN + US + EU + Crypto**. This audit assesses the data **pipelines** against five production requirements:
> 1. Robust, modular, scalable
> 2. Scheduled **daily** run — once/day, after each market closes and its EOD data is published (e.g. NSE bhavcopy)
> 3. Manual trigger = **fallback only**
> 4. Retry on failed schedules — **3 attempts, 15-min interval**
> 5. Solid **production-grade** automated scheduling
>
> All load-bearing claims below were verified directly against code (file:line). Where the sub-agents disagreed or over-stated, I re-checked and corrected — noted inline.

---

## TL;DR scorecard

| # | Requirement | Status | One-line verdict |
|---|-------------|--------|------------------|
| 1 | Robust / modular / scalable | 🟡 **Partial** | Market **abstractions** (providers, calendars, profiles, crypto isolation, orchestrator ledger) are genuinely good and scale to N markets cheaply. The **scheduling/execution layer** is not robust. |
| 2 | Scheduled daily after-close | 🟡 **Partial** | Per-market session/close/holiday awareness is well-modeled, but the **trigger is a drifting 24h `setInterval` tied to process-start time, not a cron pinned to each market's post-close window**. |
| 3 | Manual = fallback only | 🟡 **Mixed** | Manual orchestrator commands exist (good), but `RUN_ON_STARTUP=true` makes **every boot an unintended auto-trigger**, and there's no clean per-region "run now" endpoint. |
| 4 | Retry 3× @ 15 min | 🔴 **Not met** | **No automatic retry.** On failure: log + wait ~24h for the next tick. Only a **manual** `PIPELINE_RETRY_FAILED_STAGE` command exists. |
| 5 | Production-grade | 🔴 **Not met** | In-memory run lock, no failure isolation, no retry, fires on every boot, single-process with the API. Happy-path only. |

**Bottom line:** the codebase already contains the *right backbone* — a durable orchestrator ledger with atomic leases, idempotency keys, attempt counting, scope fields, and a stale-lease reaper. But **scheduling and retry live in the wrong layer** (a naive `setInterval`), and the orchestrator's retry primitives are not wired into an automatic loop. The fix is to move cadence + retry into the durable layer; it's an integration job, not a rewrite.

---

## Current-state architecture (verified)

### Two loosely-coupled systems

1. **`MarketDataFoundationScheduler`** (`market-data-foundation.scheduler.ts`) — owns the cadence. A `setInterval`, fires `runOnce()`, loops regions, calls `syncScheduledRegion(region)`, and on success hands off to the orchestrator.
2. **`PipelineOrchestrationService`** (`pipeline-orchestration/`) — owns durable run/stage state. Persists `PipelineRun` / `PipelineStageRun` with leases, idempotency, attempt counts; fans out the daily stage chain (DATA_QUALITY → RAW_SIGNALS → SIGNAL_CALIBRATION → MARKET_CONTEXT → … → TODAY_REVIEW). They **are integrated** — the scheduler calls `pipelineOrchestration.runScheduledDataQualityStage(...)` (`scheduler.ts:159-160`).

### How the schedule actually behaves (verified)

- **Interval is hard-floored to 1440 min (24h):** `intervalMinutes: Math.max(parseNumber(env.MARKET_DATA_SCHEDULER_INTERVAL_MINUTES, 1440), 1440)` (`scheduler.ts:366`). ⚠️ **`backend/.env` sets `MARKET_DATA_SCHEDULER_INTERVAL_MINUTES=15`, but the `Math.max(..,1440)` floor overrides it — the 15 is dead/misleading config.** The scheduler can only tick once per 24h.
- **The tick is tied to process-start time, not market close.** `setInterval(fn, 24h)` (`scheduler.ts:59`) fires at boot-time + 24h increments. There is no cron alignment to NSE/NYSE/Euronext post-close windows.
- **A per-tick session gate decides whether to actually sync:** `shouldRunMarketDataSync(region, now, …)` (`market-session.ts`) is genuinely good — per-region timezone, regular open/close, weekends, holidays, a post-close finalization window, and "is today's candle already confirmed final." But it's only consulted on the **one daily tick**. If that tick's time-of-day doesn't land inside a given market's post-close window, that market is skipped for the day.
- **Fires on every boot:** `runOnStartup` defaults `true` (`scheduler.ts:374`); `server.ts` calls `startMarketDataStartupLoads()` on listen → a full sync attempt on every restart, regardless of time of day.

### Verified robustness gaps

- **In-memory run lock only:** `private activeRun = false` (`scheduler.ts:89,194`). No DB lock. Two processes/replicas both run; a crash mid-run leaves no durable trace at the scheduler level. _(Note: the orchestrator's own stage leases ARE durable + atomic and a reaper cleans them — but the scheduler's `activeRun` is not.)_
- **No failure isolation in the region loop (confirmed):** `syncScheduledRegion(region)` at `scheduler.ts:150` is **not** wrapped in try/catch. The try/catch at `:158-178` only wraps the *downstream* DataQuality stage; the outer `try/finally` at `:91/193` only resets `activeRun`. **So if one region's ingest throws, the exception aborts every later region AND the crypto lane** (`:186`). Only the crypto lane and the downstream stage are individually isolated; the core per-region ingest is not.
- **No automatic retry (confirmed):** grep across `backend/src` shows no `nextRetryAt`/`maxAttempts`/`backoff`/`scheduleRetry` for the EOD pipeline. The only retry is the **manual** `PIPELINE_RETRY_FAILED_STAGE` command (`pipeline-orchestration.service.ts:2301`). _(The `nextRetryAt`/`RETRY_COOLDOWN` symbols that exist are a **different** subsystem — provider-metadata repair — not the daily pipeline.)_ On a failed scheduled run the code logs and waits for the next 24h tick.
- **Single process with the API:** scheduler + pipeline run in the Express process (`server.ts`). A heavy run can contend with API requests; every API replica would run its own scheduler.

### What the orchestrator already does RIGHT (verified — reusable backbone)

- **Durable, scope-aware ledger:** `PipelineRun`/`PipelineStageRun` carry `scopeRegion` + `scopeAssetType` + `timeframe` → daily runs are **already per-market** (IN/US/EU/CRYPTO).
- **Atomic leases:** `acquireStageLease` is a single `updateMany` with a compound WHERE on lease-expiry/owner (`pipeline-orchestration.repository.ts`) → safe against concurrent execution.
- **Idempotency:** `idempotencyKey @unique` on both run and stage + `@@unique([pipelineRunId, stageKey])` → no double-write.
- **Attempt counting:** `attemptCount` increments per lease (the retry *counter* already exists — just not the retry *loop* or a cap).
- **Stale-lease reaper:** `startPipelineReaperScheduler()` marks leaked stages FAILED on startup + on an interval — the exact polling pattern an auto-retry loop should reuse.

---

## Multi-market modularity & scalability (the good news)

The market abstractions are clean and genuinely scale — adding a market is ~20 lines across ~4 files + an env var, **not** a cross-cutting rewrite:

- **Provider registry** (`provider-registry.ts`): `resolveEodProvider(region)` / `isRegionProviderEnabled(region)` with per-region env gates. India stays strictly NSE/BSE file-based; US/EU use the free Yahoo EOD provider; the global Yahoo/Angel disable for IN is untouched. ✅
- **Trading calendars** (`market-session.ts`): `DEFAULT_MARKET_SESSION_CONFIGS` is a declarative per-region registry (timezone, open/close, weekdays, holidays, post-close window). Adding a market = one config object. Crypto correctly bypasses (24/7). ✅
- **Market profiles & capabilities** (`market-profile.ts`): per-region benchmark, risk-free rate, currency, timezone, and capability flags (`hasInstitutionalFlow`, `hasIndexConstituents`, …). ✅ infra ready.
- **Crypto isolation** (`crypto_*` tables + `market-repository-router.ts`): physically isolated, dispatched by `resolveMarketPlane().isCrypto`; a crypto write can never reach an equity table. Scheduler runs crypto as a separate injected lane. ✅ no shared-DB hazard.

**Scalability gaps to fix before EU/next markets (P1):**
- `shouldUseExchangeDailyImportPath()` is hardcoded `region === 'IN'` (`market-data-foundation.service.ts`). Any other exchange-file market (e.g. a future SGX) needs this generalized to a registry (`EXCHANGE_FILE_REGIONS`).
- **EU catalog source is missing** — the EU provider is gated/enabled but there's no universe importer (no NASDAQ-Trader equivalent for LSE/Euronext/Xetra). Blocks EU rollout.
- **~5 region `switch` statements** in `market-profile.ts` (benchmark/risk-free/timezone/currency) + region filters in `market-scope.ts` / `repository.ts` → consolidate into one `SUPPORTED_REGIONS` registry to kill the scatter.
- **Capability flags are declared but not enforced** — domain logic still branches on `region === 'IN'` instead of `profile.capabilities.hasDelivery`. Refactor so new markets light up features by capability, not by string checks.
- **Global scheduler frequency** — one `intervalMinutes` for all markets; crypto (24/7) and equities (daily) genuinely want different cadences.

---

## Red flags, prioritized

**P0 — blocks production**
1. **No automatic retry** (req #4). Failure → 24h gap. _(scheduler.ts runOnce catch just logs; orchestrator retry is manual-only.)_
2. **No failure isolation** — one region's throw aborts all later regions + crypto (`scheduler.ts:150`, unwrapped).
3. **In-memory `activeRun` lock** — unsafe under multi-process/replica; crash leaves no scheduler-level trace (`scheduler.ts:89`).
4. **Drifting 24h `setInterval`, not cron-after-close** (req #2) — the daily tick isn't pinned to each market's publish window; if it lands at the wrong time-of-day a market is skipped that day (`scheduler.ts:59,366`).
5. **Fires a full sync on every boot** (`RUN_ON_STARTUP=true`, `scheduler.ts:374`) — restarts hammer sources at arbitrary times; contradicts "manual = fallback only."

**P1 — reliability / rollout**
6. Misleading interval config (`.env` says 15, code forces 1440).
7. EU catalog source missing; `shouldUseExchangeDailyImportPath` hardcoded to IN.
8. No persisted per-(region, tradingDate) "did today succeed" record / freshness SLA surfaced for alerting.
9. No clean auth-gated manual "run region X now" endpoint (the required fallback path).

**P2 — maintainability / scale**
10. Region `switch` scatter → consolidate to a `SUPPORTED_REGIONS` registry.
11. Capability flags unused by domain logic (region-string branching).
12. Global scheduler cadence; no per-market frequency.
13. Single-process scheduler+API; no worker separation / leader election.

---

## Recommended target architecture (production-grade, all free/local)

The goal: **cron-pinned per-market trigger → durable orchestrator run guarded by a DB lock → automatic retry loop → honest freshness SLA**, with manual commands as the only manual path. Everything below uses tools already in the stack (Postgres, the existing orchestrator + reaper pattern, `node-cron` or a DB-poll loop) — **no paid scheduler/queue/monitoring**. If a durable queue is ever wanted, `pg-boss` (free, Postgres-backed) fits without new infra.

1. **Cron-pinned per-market triggers, not a drifting interval.** Replace the single 24h `setInterval` with a per-market schedule aligned to each market's *publish* time (close + data-publish lag), e.g. NSE bhavcopy ~late-evening IST, NYSE after-close ET, Euronext after-close CET, crypto at a fixed daily UTC cut. Keep the existing `shouldRunMarketDataSync` gate as the correctness check; just give each market its **own** trigger time so the tick reliably lands in-window. Free options: `node-cron` per market, or a DB `scheduled_trigger` table polled by a reaper-style loop (preferred — survives restarts, leader-safe).

2. **Durable daily-run lock per (region, assetType, tradingDate).** Add a unique constraint so the same market-day can't double-run and any replica can safely attempt (the loser no-ops on the unique violation). The orchestrator's `idempotencyKey @unique` already models exactly this — extend it to the scheduled trigger and **retire the in-memory `activeRun` flag**. (Postgres advisory locks are a fine alternative for the "only one scheduler leader" concern.)

3. **Automatic retry in the orchestrator (reuse the reaper).** Add `maxAttempts` (default **3**) and `nextRetryAt` to `PipelineStageRun` (and/or a daily-run record). On FAILED: if `attemptCount < maxAttempts`, set `nextRetryAt = now + 15min`; else mark `ABANDONED` and raise a freshness alert. Extend the **existing** `startPipelineReaperScheduler` poll to also pick up `status=FAILED AND attemptCount<maxAttempts AND nextRetryAt<=now`, re-lease, and re-run. This delivers exactly **3 attempts @ 15-min intervals** using machinery that already exists (`attemptCount`, atomic leases, periodic poll).

4. **Per-region failure isolation.** Wrap each `syncScheduledRegion(region)` in try/catch; record per-region per-day status; **always** continue to the next region and the crypto lane. One market's outage must not blind the others.

5. **Manual = true fallback.** Keep `PIPELINE_RUN_ALL` + add an auth-gated per-region "run now" endpoint. Set **`RUN_ON_STARTUP=false` in production** so boot doesn't auto-fire; on startup only *resume genuinely-incomplete* runs (catch-up), never start a fresh sync. This makes "manual is only a fallback" actually true.

6. **Freshness SLA + alerting.** Persist `lastSuccessfulTradingDate` per (region, assetType); compute "region X is N trading-days stale" against its own calendar; surface it on the scheduler status endpoint so a free monitor (or a daily digest) can alert. This is the observability backbone that makes "did the automated run actually succeed?" answerable.

7. **(Later) worker/leader separation.** Run the scheduler+pipeline in a worker role distinct from the API request path, or gate it to a single leader via the DB lock from (2), so API replicas don't each schedule and a heavy run can't block requests.

### Sequencing (each step independently shippable, all read-compatible)
1. Failure isolation (P0-2) + `RUN_ON_STARTUP=false` in prod (P0-5) — smallest, highest safety.
2. Durable run lock per (region, day) (P0-3) — retires `activeRun`.
3. Automatic retry via the reaper (P0-1, req #4) — the headline gap.
4. Cron-pinned per-market triggers (P0-4, req #2).
5. Freshness SLA + manual run-now endpoint (P1-8, P1-9, req #3).
6. EU catalog source + generalize exchange-file path (P1-7) — unblocks EU.
7. Registry consolidation + capability-gating (P2) — pays off as markets multiply.

---

## Free-tools / no-paid compliance ✅
Every recommendation stays within the non-negotiable: India remains NSE/BSE file-based; US/EU use the free Yahoo EOD path behind the per-region gate; crypto uses free CoinGecko/Binance. Scheduling/retry/locking use Postgres + the existing reaper pattern + `node-cron` (or `pg-boss` if a durable queue is later wanted) — **no paid scheduler, queue, cron service, or monitoring**.

_No code changes were made. This is an audit + recommended design only; execution pending owner approval._
