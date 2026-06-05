# Architecture Deep-Analysis — investment-scanner

_Date: 2026-06-05 · Author: Architect review (Claude) · Status: findings only — no changes executed, pending owner approval_

> Scope of this audit: red flags, improvements needed, performance killers, path to a simple/robust/scalable architecture, and adherence to the non-negotiable "free tools / NSE-BSE-only / no paid data providers" constraint. Every load-bearing finding below was verified directly against the code (file:line cited), not relayed unverified.

---

## Overall

The core architecture is sound and the hard constraints are *mostly* honored — the NSE/BSE-only data discipline in the runtime is genuinely well-enforced (verified, not assumed). The real risks are concentrated in three places:

1. **Two persisted-read contract violations on live GET routes** (a read computes — and in one case persists — derived data).
2. A **dormant-but-live broker-credential block** that undercuts the non-negotiable.
3. A **performance model that will not survive scale** — N+1 queries everywhere + a 10-of-20 connection ceiling with no traffic management + Redis declared-but-unused.

Calibration note: this app is in a stated ~12-month **personal-validation phase** (local-first, single user). Several agent findings were rated against a *production* bar; this report re-prioritizes them against the validation-phase bar and explicitly defers commercial-phase concerns.

---

## 5 & 6 — Free tools / no-paid-data adherence (the non-negotiable) ✅ with one blemish

**Verdict: the active runtime is CLEAN.** Verified directly:

- All legacy provider endpoints (Yahoo search, broker sync, catalog sync) return `410 EXTERNAL_PROVIDER_DISABLED_NSE_BSE_ONLY` — `backend/src/modules/market-data-foundation/market-data-foundation.controller.ts:47`.
- **Zero** active-runtime imports of yahoo/yfinance/angel/smartapi/screener/rapidapi/alphavantage/polygon/finnhub/tiingo in `backend/src`.
- All ingestion URLs are official NSE/BSE domains; idempotency is real (natural key `symbol+timestamp` + `skipDuplicates`, plus SHA-256 file-hash dedup).

**The one blemish (🔴 must fix):** `backend/.env:13–38` still carries **live Angel One credentials** — API key, client code, PIN, and `ANGEL_ONE_TOTP_SECRET` (the 2FA seed), with `ANGEL_ONE_ENABLE_MARKET_DATA="true"` and empty `YAHOO_FINANCE_API_KEY` / `ALPHA_VANTAGE_API_KEY` placeholders. The file is gitignored (confirmed — not tracked, not in git history), but:

1. A live TOTP seed in plaintext is a real security exposure regardless of git — **rotate those credentials**; treat them as compromised.
2. Their continued existence — plus the `ENABLE` flag — is a latent contradiction of "broker APIs forbidden, permanently removed." To make the non-negotiable *airtight*, **purge the entire Angel One / Yahoo / AlphaVantage env block.** Post-cleanup no runtime code should read them, making them pure liability.

---

## 1 — Red flags 🔴

| # | Red flag | Evidence | Why it matters |
|---|----------|----------|----------------|
| R1 | **GET signal route generates on cache-miss** | `latestForInstrument` GET handler (`signal-generation-engine.controller.ts:56`) → service falls back to `this.run()` (`signal-generation-engine.service.ts:300`) | Violates "trader pages = persisted reads only." A GET computes a signal on demand → look-ahead / wall-clock contamination on a read path, plus unbounded compute under load. The clean path (`latestPersistedForInstruments`, `service.ts:305`) exists right beside it — the route just calls the wrong one. |
| R2 | **GET market-context summary generates AND writes** | `summary` GET handler (`market-context-intelligence.controller.ts:13`) → `this.run()` → `saveSnapshot()` (`market-context-intelligence.service.ts:83,75`) | Same contract breach, worse: a **read persists a row**. `latestPersistedSummary` exists (`service.ts:87`) but `summary` doesn't use it. |
| R3 | **Live broker credentials + TOTP seed on disk** | `backend/.env:18–38` | Security exposure + non-negotiable contradiction (see §5/6). |
| R4 | **Signal-quality-lab GET has a live-compute fallback** | `signal-quality-lab.service.ts:175–189` — code even comments "do NOT silently recompute live," then does | Third persisted-read leak; lower traffic but same class. |
| R5 | **Cross-module repository import** | `backtesting-strategy-lab.service.ts:21` imports `historical-context-snapshots.repository` directly | Breaks the module-boundary rule (downstream must not import another module's repository); couples backtest to another module's data layer. The only confirmed hard-boundary violation. |

**Down-graded from agent ratings:** "all `index.ts` export repositories" is P2 hygiene, not P0 — *no consumer actually reaches them* (R5 is the lone real breach). "No graceful shutdown / no observability / no read-replica" are real but **mis-prioritized for a personal-validation local-first app** — commercial-phase concerns, not now.

---

## 2 — Improvements needed 🟡

- **Single-source the persisted-read pattern.** R1/R2/R4 are the same bug three times: a "get-or-generate" method doubling as the read path. Establish one rule — `*Persisted*` methods for GET, generation only behind POST/scheduler — and add a lightweight lint/test asserting GET handlers never call `.run()` / `.save*()`. Highest-value structural fix.
- **Circular dependencies are real.** 18+ lazy `require()` workarounds across 7 services (copilot, workbench, signal-generation, strategy-framework, market-data-foundation, portfolio-intelligence, today-trade-review). They work, but each is a deferred landmine. Worth one focused pass to invert the worst cycle (likely signal-generation ↔ strategy-decision / calibration).
- **Duplicated domain logic** — regime / marketGate thresholds still echo across ~6 modules even after the #42 single-sourcing. The canonical `regimeFromScore` exists in `market-context-intelligence.service.ts:318`; consumers should import it, not re-encode the bands.
- **Pipeline-orchestration scope.** Memory describes it as "just a ledger," but it instantiates 11 downstream services and executes stages (`pipeline-orchestration.service.ts:289+`). That's a legitimate orchestrator/dispatcher pattern — but **update the mental model / docs**: it's a dispatcher, not a passive ledger. Don't let it accrete business logic.
- **Frontend uncommitted change set is coherent and safe to commit** — a clean `shared/format/enumLabels` extraction adopted across 13 pages + freshness-derived-from-dates + INR default + a `TEST_`-row filter. No persisted-read violations; research-support language intact. Ship as one commit.

---

## 3 — Performance killers 🟠

1. **N+1 queries on every hot path** (confirmed, multiple):
   - Backtest fetches prices **serially per instrument** — `backtesting-strategy-lab.service.ts:258`. A 50-stock backtest = 50 sequential round-trips.
   - Portfolio summary = **4 queries × each holding, twice** — `portfolio-management.service.ts:85,186`.
   - Signal enrichment **re-queries prices inside a per-signal map** that were already batch-fetched ~60 lines earlier — `signal-generation-engine.service.ts:884` (batch at `:819`).
   - Strategy-rating lookup is a serial loop *nested inside* the per-signal map — `signal-generation-engine.service.ts:1325`.
2. **The 10-of-20 connection ceiling has no traffic management.** N+1 + concurrent backtests + the scheduler all draw from the same 10 connections with no per-endpoint concurrency bound. **Most likely cause of a real outage** (P2024 timeouts → cascade). The memory's own rule ("bound per-endpoint concurrency instead of raising the limit") is only partially implemented (chunked reads in the repo, nothing at the endpoint layer).
3. **Redis is declared but never used.** `REDIS_URL` is set, the container sits in a non-default `profiles:[cache]` so it isn't even started, and no client is instantiated. Latest-price / strategy-rating / signal-summary reads hit Postgres cold every time — the single biggest *available* win for both latency and connection pressure.
4. **Timescale is a plain table.** `price_ticks` (5.5M rows) has no hypertable / `time_bucket` / continuous aggregates. Range scans for backtests and readiness checks don't use the one tool purpose-built for them.

**Fix order:** batch the N+1s (#1) and bound endpoint concurrency (#2) first — correctness-under-load. Then wire Redis for read-model surfaces (#3). Timescale aggregates (#4) when backtest range-scan latency becomes the bottleneck.

---

## 4 — Toward simple, robust, scalable 🟢

The architecture is already *simple in the right way*: clear module pipeline, persisted read-models, additive nullable migrations (40, clean), idempotent ingestion. To harden without over-engineering for a phase you're not in yet:

- **Robustness (do now, cheap):** rotate + purge the broker creds; fix the 3 persisted-read leaks; add a `statement_timeout` in Postgres init so one slow query can't pin a connection; make `/health` actually probe Postgres (`app.ts:15` currently returns `ok` blindly).
- **Scalability (do as load appears, not before):** wire Redis for read-models; batch the N+1s; introduce a per-endpoint concurrency limiter (a tiny semaphore, not a job queue). Reduce Prisma pool **down** to ~6–8 to leave headroom for migrations / scheduler — counterintuitively safer than 10 under the 20-cap.
- **Explicitly defer (commercial-phase, not validation-phase):** durable job queue (pg-boss / Temporal), structured logging / error tracking, read replicas, graceful-shutdown drain. These were rated P0/P1 against a *production* bar; against the 12-month personal-validation bar they're premium. Keeping them out now *is* the "keep it simple" choice — just track them so they're not forgotten at the commercial gate.

---

## Recommended remediation sequence

1. **Security / non-negotiable (today):** rotate Angel One creds → purge the broker / Yahoo / AlphaVantage env block.
2. **Trust contract (this iteration):** fix R1/R2/R4 — point GET routes at the `*Persisted*` methods; add a test asserting GET handlers don't generate / write.
3. **Boundary:** fix R5 (backtest → use historical-context-snapshots *service*, not its repository).
4. **Perf:** batch the four N+1 sites + add endpoint concurrency bound + drop pool to ~7.
5. **Then:** wire Redis read-model cache; commit the frontend format refactor.
6. **Backlog (commercial gate):** Timescale aggregates, durable jobs, observability, graceful shutdown.

---

## Appendix — what's working well (verified)

- NSE/BSE-only runtime enforcement: all provider routes 410'd, no forbidden imports.
- Ingestion idempotency: `symbol+timestamp` natural key + `skipDuplicates` + SHA-256 file-hash dedup; best-effort adjusted-close recompute never blocks price import.
- Point-in-time correctness in signal generation: fundamentals look-ahead guard (`officialResultDate` or `periodEndDate + 45d`), live-price-injection guard for historical batches, RSI/ADX warm-up windows.
- Calibration wiring is additive: raw `score` always preserved; `calibratedScore` / `calibrationStatus` are separate optional fields.
- Research-support language: copilot disclaimer + forbidden-phrase sanitization applied to all output fields; frontend copy neutral.
- Migrations: 40, additive/nullable-heavy, clean.

_No code changes were made as part of this audit. Execution of the remediation sequence is pending owner approval._
