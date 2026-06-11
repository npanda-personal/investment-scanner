# Dataflow Redesign — Measure → Decide → Assemble

**Date:** 2026-06-11
**Status:** PROPOSED (supersedes the BullMQ-based revamp sketched in `dataflow-target.svg`)
**Diagrams:** `dataflow-current.svg` (as-is) · `dataflow-proposed.svg` (this design)
**Implementation plan:** `dataflow-implementation-plan.md`

---

## 1. Why this document exists

Two chronic problems drove this redesign:

1. **The daily pipeline cannot be trusted.** A code-level diagnostic found 16 concrete defects (catalogued in §3.2) — silent stage skips, leases that reap healthy long-running stages, idempotency bypassed on restart, no NSE holiday calendar, failures invisible in the status API, and zero failure notifications.
2. **"Is this stock ready for signals?" is answered in 15 different places** across 11 modules, with **three different formulas all writing a field named `signalReadinessScore`** (catalogued in §3.1). The same instrument can be eligible, ineligible, and "complete" simultaneously depending on which module you ask.

An earlier revamp proposal (`dataflow-target.svg`) prescribed BullMQ + Redis + event choreography. The review verdict: the *diagnosis* (query-time fan-in, fused ingest/read, coupling) was correct, but the queue infrastructure is the wrong first move for a single-process nightly batch — and the proposal's Stage-2 DAG contained a factual dependency error (market-context-intelligence reads signal data, so the 6 intelligence modules are **not** all independent of signal generation). This document replaces that proposal with a design that fixes the actual root causes with zero new infrastructure.

## 2. Design principle

> **Facts are measured once. Verdicts are derived from facts by one declarative policy. Everything user-facing reads from one assembled snapshot.**

Three layers:

| Layer | Responsibility | Owner |
|---|---|---|
| **MEASURE** | Ingest NSE/BSE data; compute per-instrument data facts | market-data-foundation (write side), data-quality-engine (facts) |
| **DECIDE** | DAG of compute stages writing module-owned result tables | pipeline DAG runner + stage adapters |
| **ASSEMBLE** | One `daily_instrument_snapshot` row per instrument/day; the only read surface for trader-facing queries | snapshot-assembler (new, final DAG stage) |

Every defect found in the audit is a violation of one of these three rules.

## 3. Findings (evidence base)

### 3.1 Readiness scoring is scattered — 15 sites, 3 formulas

Full mapping in the audit; the headline divergences:

| Divergence | Sites | Impact |
|---|---|---|
| **Three `signalReadinessScore` formulas** | data-quality-engine (`data-quality-engine.service.ts:541`, tiered: bars/staleness/volume/sector/country/liquidity), historical-context-snapshots (`historical-context-snapshots.service.ts:199`, linear: bars/latest/fundamentals/sector/industry), backtesting-strategy-lab (`backtesting-strategy-lab.service.ts:993`, `closes.length >= 200` proxy) | Same instrument, same day, three different scores stored under the same field name in different tables |
| **Minimum-bars thresholds: 120 / 200 / 252** | MDF trusted universe hard cut (120), backtest proxy + SMA gate (200), MDF `INADEQUATE_PRICE_HISTORY` + DQE backtest eligibility (252) | A 150-bar stock is signal-eligible in DQE but hard-excluded from the trusted review universe |
| **Three staleness definitions** | DQE (trading-session-aware), MDF (date comparison vs expected trading date), HCS (`Boolean(latest)` — no freshness at all) | HCS can mark a 3-day-stale stock COMPLETE while DQE marks it ineligible |
| **Double-gating** | DQE `eligibleForSignals` does not check fundamentals; SGE `applyFundamentalsEligibilityGate` (`signal-generation-engine.service.ts:2497`) re-gates mainboard instruments on fundamentals afterwards | DQE says eligible → SGE silently drops the instrument; no single answer to "why was X excluded?" |
| **Gate logic re-implemented per consumer** | strategy-framework `applyCommonNoise`, smart-money `dataQualityGate`, trade-plan blockers, today-trade-review `stateFor`, signal-position-ledger trusted-signal filters | 5+ hand-rolled combinations of READY/UNUSABLE/ILLIQUID checks, each slightly different |

### 3.2 Pipeline trust defects (16, by severity)

| # | Sev | Defect | Evidence |
|---|---|---|---|
| 1 | CRIT | DEFERRED commands throw 422; most stages run only via the scheduler chain — no manual escape hatch | `pipeline-orchestration.service.ts:321`, policies `:145-179` |
| 2 | CRIT | 10-min lease, 20-min stale threshold, 30-min reaper; long stages get reaped ABANDONED mid-run (terminal, no retry); startup reap kills in-flight work after restarts | `service.ts:57`, `scheduler.ts:41`, `repository.ts:298` |
| 3 | CRIT | Catch-up fingerprint embeds `now.toISOString()` → fresh idempotency key every tick → restart can double-run a trading date | `market-data-foundation.scheduler.ts:343`, `service.ts:2753` |
| 4 | CRIT | `IN` region `holidays: []` — pipeline fires on NSE holidays, sees "missing" data, fails repeatedly | `market-data-foundation.market-session.ts:176` |
| 5 | HIGH | PARTIAL: failed instrument IDs are never persisted; retries re-process the full list | `service.ts:2661` |
| 6 | HIGH | `logScheduledDownstreamFailure` swallows exceptions to console with **no DB row** — invisible failures | `service.ts:5881` |
| 7 | HIGH | MARKET_CONTEXT propagates downstream only on COMPLETED (neighbors propagate on PARTIAL too) — one partial failure silently skips 8+ downstream stages | `service.ts:3590` vs `:3479` |
| 8 | HIGH | `runOnStartup=true` + in-memory-only `activeRun` guard → restarts re-trigger runs | `scheduler.ts:66-72` |
| 9 | MED | Market-scan refresh errors swallowed (`console.warn` only) | `service.ts:1694` |
| 10 | MED | No notification channel wired to pipeline outcomes (Telegram provider exists, unused here) | — |
| 11 | MED | Manual `PIPELINE_RUN_ALL` capped at 250 instruments; `DRAIN_ALL_BATCHES` FORBIDDEN — `hasMore: true` is never drained | `service.ts:1644`, `:5756` |
| 12 | MED | Trading date from server clock; no cross-validation against provider data date | `market-session.ts:239` |
| 13 | MED | ABANDONED runs excluded from `lastRun` — a crashed pipeline looks like it never ran | `repository.ts:21` |
| 14-16 | LOW | Idempotency key includes batchSize; misc swallowed catches | `service.ts:4940` et al. |

### 3.3 Query-path fan-in (from the earlier review, confirmed)

- today-trade-review calls **11 services** at query time, with a lazy-require cycle workaround to market-context-intelligence and an N+1 trade-plan loop (up to ~50 serial awaits).
- ai-investment-copilot fans out to 12 services, 3 via lazy-require.
- **12+ lazy-`require()` cycle workarounds** exist across the backend.
- backtesting-strategy-lab imports another module's repository **and** reaches through it to raw Prisma.
- `market-data-foundation.service.ts` is ~15,800 lines serving ~16 consumer modules with ingest and read fused.
- **Two different `StrategyDecision` types share one name**: strategy-framework (`SIGNAL`/`ENTRY_CANDIDATE`, 9 members) vs strategy-decision-engine (`TRADE_CANDIDATE`, 8 members), mapped manually at `strategy-decision-engine.service.ts:658`. research-hub consumes one variant, backtesting the other.

## 4. The design

### 4.1 One eligibility authority — `instrument_eligibility`

The root cause is not that thresholds differ — different use cases legitimately need different history depth. The root cause is that **facts are re-measured everywhere and policy is implicit in each site**. Separate them:

**New table `instrument_eligibility`** — one row per `(instrumentId, tradingDate)`, owned by **data-quality-engine**:

```
-- FACTS (measured once per day, from real data)
price_bars              int
last_price_date         date
stale_sessions          int          -- session-aware, the ONE staleness definition
volume_coverage_pct     numeric
max_gap_days            int
liquidity_score         int
has_fundamentals        boolean
has_sector / has_industry / has_country   boolean

-- VERDICTS (derived from facts by policy; each = boolean + reason_codes[])
signal_eligible         boolean,  signal_reasons        text[]
review_eligible         boolean,  review_reasons        text[]
backtest_eligible       boolean,  backtest_reasons      text[]
calibration_eligible    boolean,  calibration_reasons   text[]

policy_version          text
computed_at             timestamptz
```

**One policy file** — `backend/src/shared/types/eligibility-policy.ts`: a declarative constant holding every threshold (bars minimums per verdict, staleness session limit, liquidity floor, volume coverage, `requires_fundamentals: 'MAINBOARD'`, metadata requirements). Unit-tested in isolation. Changing a threshold is a one-line, one-file change with a `policy_version` bump.

**Reason codes** (e.g. `INSUFFICIENT_BARS_252`, `STALE_PRICE_3_SESSIONS`, `MISSING_FUNDAMENTALS`, `ILLIQUID`) replace the ad-hoc blocker strings scattered across strategy-framework, MDF universe classification, trade-plan, and today-trade-review. UI "why is this excluded?" answers come from one vocabulary.

**Consumers become readers.** signal-generation, strategy-framework, smart-money, trade-plan, today-trade-review, signal-position-ledger, backtesting check a named verdict field — never recompute, never re-threshold.

**Deleted by this change:**
- HCS `readinessScore` formula (divergent weights)
- Backtest inline proxy object (reads persisted point-in-time facts instead)
- SGE `applyFundamentalsEligibilityGate` (folds into policy)
- MDF `classifyInstrumentUniverseReadiness` on-the-fly blocker logic (becomes the `review_eligible` derivation, run once in the DAG)
- Two of the three staleness definitions

### 4.2 Pipeline as a declarative DAG with uniform semantics

Replace the 18-deep hard-coded recursive call chain and the DEFERRED/FORBIDDEN command maze with a **stage registry + generic runner** (~300 lines, in-process, no new infrastructure). The existing `PipelineRun` / `PipelineStageRun` Prisma models, idempotency-key scheme, and per-stage upsert idempotency are **kept** — they are good bones.

```ts
interface PipelineStageAdapter {
  key: StageKey;
  dependsOn: StageKey[];                            // the DAG, declared
  run(ctx: StageContext): Promise<StageResult>;     // ctx: tradingDate, eligible set,
}                                                   //      heartbeat(), reportFailures(ids)
```

**The DAG (initial):**

```
ingest
  └─ eligibility                       (data-quality facts + verdicts)
       ├─ earnings-intel        ┐
       ├─ derivatives-intel     │ parallel (bounded concurrency)
       ├─ smart-money-intel     ┘
       └─ signal-generation
            └─ signal-calibration
                 └─ market-context     (NOTE: depends on signals — see §6 Q1)
                      └─ strategy-decision   (uses strategy-framework as in-process library)
                           └─ trade-plan
                                └─ snapshot-assembler
                                     ├─ mark tradingDate READY (watermark)
                                     ├─ alerts evaluation (diff vs rules)
                                     ├─ signal-position-ledger refresh
                                     └─ Telegram run summary
```

**Uniform trust semantics (each fixes audited defects):**

| Rule | Replaces / fixes |
|---|---|
| **One execution path**: scheduled and manual triggers both call `runner.execute(tradingDate, fromStage?)`. Any stage re-runnable for any date. | DEFERRED/FORBIDDEN policy maze (#1), the 15 `runScheduled*Stage` methods, the 422 dead-ends |
| **Heartbeat leases**: `ctx.heartbeat()` renews every batch; reaper declares ABANDONED only when heartbeats stop; ABANDONED is visible in status | Mid-run reaping (#2), invisible crashed runs (#13) |
| **Honest idempotency**: key = `(stageKey, tradingDate, policyVersion/modelVersion)`; no timestamps in fingerprints; resume re-executes non-terminal stages only | Restart double-runs (#3, #8) |
| **PARTIAL with receipts**: failed instrument IDs persisted per stage run; one propagation rule for ALL stages — continue downstream with succeeded set, mark PARTIAL, retry = failed set only | #5, #7, inconsistent propagation |
| **No silent failures**: adapter exceptions always write a FAILED stage row; nothing returns synthetic objects with `stageRunId: null` | #6, #9 |
| **NSE holiday calendar** wired into session config (fetcher already exists in MDF); holidays produce explicit `SKIPPED(NSE_HOLIDAY)` runs | #4 |
| **Pipeline reports to the owner**: Telegram message on every terminal run state via the existing notifications-delivery TelegramProvider (`✅ READY 2026-06-11 · 987 instruments · 14m` / `⚠️ PARTIAL · earnings failed 12 · retry available`) | #10 |
| **Date cross-validation**: computed tradingDate must match provider data date or the run aborts loudly | #12 |

**Explicit non-goal — BullMQ/Redis:** deferred, not rejected forever. The adapter interface is the future-proofing; if the app ever goes multi-process, re-back the same registry with a queue. Until then a queue adds a Redis operational dependency (incl. Windows dev friction), a second source of job-state truth alongside the existing Postgres run tables, and event-choreography debugging costs — for parallelism achievable with bounded in-process concurrency against a Postgres capped at 20 connections anyway.

### 4.3 `daily_instrument_snapshot` — the only read surface

New table, written by the **snapshot-assembler** (final DAG stage), one row per `(instrumentId, tradingDate, snapshotVersion)`:

```
instrument_id, trading_date, snapshot_version, assembled_at
-- eligibility:    verdicts + reason_codes (from instrument_eligibility)
-- signals:        signal_score, signal_direction, model_version
-- calibration:    calibrated_score, authority/confidence
-- decision:       strategy_decision, rules_fired
-- trade plan:     stop_loss, target, rr_ratio, plan_status
-- context:        market_regime, breadth_pct, sector_rs
-- derivatives:    oi_buildup, participant_positioning
-- earnings:       earnings_proximity_days
-- smart money:    smart_money_code
-- provenance:     per-section status (OK | STALE | FAILED | N/A)
```

Key semantics:

- **Supersede-by-version, not immutable.** NSE restates data (corporate actions, bhavcopy revisions; `recomputeAdjustedClosesForInstrument` exists for a reason). Re-assembly writes version N+1; "latest version per (instrument, date)" is the read view; prior versions retained for audit.
- **Partial-failure policy: write with provenance, don't block.** If earnings-intel failed for 12 instruments, the snapshot row still lands with `earnings: FAILED` in the provenance section; readers degrade gracefully; the PARTIAL run + Telegram message identify the gap.
- **READY watermark.** The trading date is marked READY only when the assembler completes; the read path enforces it — consumers can never observe mid-pipeline state.
- **History replaces historical-context-snapshots** (after backfill — see plan Phase 4). Backtesting and signal-quality-lab read historical snapshot rows through the owning module's bulk range-query API (fixing the cross-module repository + raw-Prisma violation without losing per-bar bulk performance).

**Query-path effect:** today-trade-review becomes `SELECT … WHERE trading_date = ? AND review_eligible ORDER BY calibrated_score` plus presentation. portfolio-intelligence reads snapshot for held instruments and overlays holdings; staleness = `assembled_at`. ai-copilot reads snapshot + user data. The 11-service fan-in, 12 lazy-requires, and the N+1 trade-plan loop disappear.

### 4.4 Shared contracts — `backend/src/shared/types/`

Small and leaf-level (imports nothing from modules), or it recreates the cycles it exists to kill:

- `signal.types.ts` — `SignalDirection`, `SignalConfidence`, direction threshold constants (the `>= 60` currently hard-coded in 5+ modules)
- `strategy.types.ts` — **one** `StrategyDecision` enum (resolves the ENTRY_CANDIDATE vs TRADE_CANDIDATE split — see plan Phase 1 for the migration)
- `eligibility-policy.ts` — the policy constant + reason-code vocabulary (§4.1)
- `snapshot.types.ts` — `DailyInstrumentSnapshot`, the canonical cross-module contract

### 4.5 market-data-foundation — interface-first read/write split

Define `MarketDataReadApi` (the ~20 read methods consumers actually use); the existing service implements it; consumers migrate to the interface; then physically split ingest from read. The read implementation enforces the READY watermark (the existing `market_data_sync_states` FINAL_CONFIRMED marker, today advisory-only). **No Redis cache initially** — reads are indexed TimescaleDB queries at ~1k-instrument scale; add caching only if profiling demands it.

## 5. What gets deleted (the simplicity dividend)

| Today | After |
|---|---|
| 3 readiness formulas, 15 gate sites, 3 staleness definitions | 1 facts table + 1 policy file + 4 named verdicts |
| 18 hard-coded chained stages in a ~4,500-line orchestrator | ~10 declared adapters + ~300-line generic runner |
| DEFERRED/FORBIDDEN command maze, 2 execution paths | 1 path; any stage re-runnable for any date |
| `holidays: []` for IN | Real NSE calendar; explicit holiday skips |
| 11-service query fan-in, 12 lazy-requires, N+1 loops | 1 snapshot read per page |
| Silent 1 AM failures; ABANDONED runs invisible | Telegram on every terminal state; honest status API |
| historical-context-snapshots module + divergent score | Snapshot history (post-backfill) |
| 2 incompatible `StrategyDecision` types | 1 shared enum |

## 6. Open questions (decide during Phase 1/2, before parallelizing)

1. **market-context ← signals dependency.** Current chain runs RAW_SIGNALS before MARKET_CONTEXT because context aggregates signal-derived breadth; calibration therefore reads *prior-day* regime. The DAG above keeps market-context after calibration (status quo semantics). Decide: keep prior-day regime for calibration (no semantic change, backtest-comparable) or split market-context into a price-only part (parallel, pre-signal) and a signal-breadth part (post-signal). Default: keep status quo until signal-quality data justifies the change.
2. **Verdict grandfathering.** When the unified policy disagrees with a legacy gate (it will — that's the point), which wins during transition? Default: legacy behavior wins while the new verdicts are logged shadow-mode (golden-master), flip after a clean comparison week.
3. **Snapshot scope.** Start with the trusted review universe (~300–1,000 instruments) or all instruments? Default: full daily-refresh-eligible set; the table is tiny either way (~250k rows/yr).
4. **Snapshot-table sprawl.** `workbench_snapshots`, `research_overview_snapshots`, `stock_interest_snapshots`, `market_pulse_snapshots` etc. predate this design. Phase 4 decides which are superseded by `daily_instrument_snapshot` vs which remain (page-shaped caches may legitimately stay).

## 7. Hard constraints honored

- NSE/BSE-only, no paid data; no new paid infrastructure (no managed Redis).
- Trader-facing pages remain persisted-read (the snapshot strengthens this).
- **Never `prisma migrate dev` against the shared drifted DB** — new tables ship as hand-authored SQL migrations in `prisma/migrations/` applied deliberately (matching the existing 50 hand-authored migrations).
- Module ownership unchanged: each intelligence module keeps writing its own tables; the assembler composes, it does not own domain logic.
