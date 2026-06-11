# Dataflow Redesign — Implementation Plan

**Date:** 2026-06-11 · **Design:** `dataflow-proposed.md` · **Status:** AWAITING APPROVAL PER PHASE

Ordering principle: **trust first, redesign second** — rewriting a system you don't trust produces two systems you don't trust. Phase 0 makes the current pipeline observable and honest with surgical diffs; the redesign then proceeds under that safety net. Every phase ships independently and pays for itself. Parallel-agent friendly: tasks marked ∥ are independent within their phase.

Cross-cutting rules for every phase:
- New tables/columns ship as **hand-authored SQL migrations** in `backend/prisma/migrations/` + schema file updates. Never `prisma migrate dev` against the shared DB.
- No server lifecycle actions; other agents run this repo concurrently.
- Each phase ends with a verification gate before the next begins.

---

## Phase 0 — Stop the bleeding (surgical, no redesign)

Seven independent diffs fixing audited defects on the *current* pipeline. Small blast radius, immediate trust recovery.

| # | Task | Files (primary) | Fixes |
|---|---|---|---|
| 0.1 ∥ | **Telegram on pipeline terminal states.** On run COMPLETED/PARTIAL/FAILED/ABANDONED, send summary via existing TelegramProvider: date, stage statuses, succeeded/failed counts, duration. | `pipeline-orchestration.service.ts` (run-completion sites), `notifications-delivery` (small generic `sendOperationalAlert` entry point) | #10 |
| 0.2 ∥ | **NSE holiday calendar.** Wire the existing holiday fetcher (`market-data-foundation.service.ts:~8012`) into `DEFAULT_MARKET_SESSION_CONFIGS.IN` / `shouldRunMarketDataSync`; cache holidays per year; emit explicit `SKIPPED(NSE_HOLIDAY)`. | `market-data-foundation.market-session.ts`, scheduler | #4 |
| 0.3 ∥ | **Lease heartbeat.** Renew lease inside per-batch loops of long stages (signal-gen, calibration, smart-money, DQ); reaper threshold keyed to missed heartbeats, not wall-clock since start. | `pipeline-orchestration.service.ts`, `.repository.ts` | #2 |
| 0.4 ∥ | **Remove timestamp from catch-up fingerprint.** `:catchup:<ISO timestamp>` → deterministic `(tradingDate, attempt)` or drop suffix; restart can no longer mint fresh idempotency keys. | `market-data-foundation.scheduler.ts:343`, `pipeline-orchestration.service.ts:2753` | #3, #8 |
| 0.5 ∥ | **Uniform PARTIAL propagation.** MARKET_CONTEXT propagates downstream on `COMPLETED \|\| PARTIAL(succeeded>0) \|\| SKIPPED` like its neighbors. | `pipeline-orchestration.service.ts:3590` | #7 |
| 0.6 ∥ | **Persist failed instrument IDs.** Add `failedInstrumentIds` (JSONB) to stage-run metadata writes in every stage's failure aggregation; surface in status API. | `pipeline-orchestration.service.ts`, `.repository.ts` | #5 (visibility half) |
| 0.7 ∥ | **Honest status.** Include ABANDONED in `MEANINGFUL_RUN_STATUSES` for `lastRun`; `logScheduledDownstreamFailure` writes a FAILED stage row instead of returning a synthetic object with `stageRunId: null`. | `pipeline-orchestration.repository.ts:21`, `service.ts:5881` | #6, #13 |

**Verification gate:** trigger a manual run on a dev date; confirm Telegram fires on success and on an induced failure; confirm an induced long stage survives >10 min; confirm restart mid-day does not double-run; status API shows ABANDONED after a simulated crash.

---

## Phase 1 — One eligibility authority

| # | Task | Notes |
|---|---|---|
| 1.1 | **`shared/types/` foundation:** `eligibility-policy.ts` (all thresholds + reason-code vocabulary), `signal.types.ts` (SignalDirection, SignalConfidence, direction thresholds), `strategy.types.ts` (single `StrategyDecision`). Leaf-level — imports nothing from modules. | The `StrategyDecision` unification: adopt the strategy-decision-engine member set (`TRADE_CANDIDATE`…), add a documented alias mapping for strategy-framework's `SIGNAL`/`ENTRY_CANDIDATE` during migration; migrate research-hub + backtesting consumers; delete both local types. |
| 1.2 | **`instrument_eligibility` table** (facts + verdicts + reason codes + policy_version) — hand-authored SQL migration + Prisma schema file. | Indexed on `(trading_date)`, `(instrument_id, trading_date)` unique. |
| 1.3 | **data-quality-engine computes facts + verdicts** as its pipeline stage output (replacing/extending `DataQualityEvaluation` writes). One staleness definition (session-aware). | Fold SGE fundamentals gate into policy (`requires_fundamentals: MAINBOARD` on `signal_eligible`); fold MDF universe blocker logic into `review_eligible` reasons. |
| 1.4 | **Shadow mode (golden master), ~1 week:** legacy gates keep deciding; new verdicts computed alongside; nightly diff report (instrument, legacy decision, verdict, reasons) written to a table/log + Telegram count summary. | Decision rule for disagreements: legacy wins until diff report is reviewed and policy adjusted or divergence accepted. |
| 1.5 | **Flip consumers to verdicts** (∥ per consumer once 1.4 is clean): signal-generation (`filterEligibleInstruments` → read verdicts; delete `applyFundamentalsEligibilityGate`), strategy-framework `applyCommonNoise` (read verdict + reasons), smart-money gate, trade-plan blockers, today-trade-review `stateFor` + MDF trusted-universe call, signal-position-ledger filters, backtesting proxy (read persisted point-in-time facts). | Each consumer flip is a small PR-able unit. |
| 1.6 | **Delete** HCS readinessScore formula, backtest proxy, duplicate staleness code. | HCS *module* retirement waits for Phase 4 backfill. |

**Verification gate:** one full week of shadow diffs reviewed; post-flip, signal counts / review universe size / decision distribution match shadow expectations; "why excluded?" surfaces reason codes end-to-end on today-trade-review.

---

## Phase 2 — DAG runner

| # | Task | Notes |
|---|---|---|
| 2.1 | **Resolve open question Q1** (market-context ← signals dependency): produce the table-level read/write map per stage; default to status-quo ordering (context after calibration). | Prereq for any parallelism claims. |
| 2.2 | **Runner + registry:** `PipelineStageAdapter` interface; generic runner (topo order, bounded concurrency, heartbeat leases, persisted per-stage state reusing `PipelineRun`/`PipelineStageRun`, PARTIAL-with-receipts propagation, retry = failed set only, idempotency key `(stage, tradingDate, version)`). | ~300 lines + tests. Unit-test the runner against fake adapters: failure mid-DAG, partial, resume, concurrent-run rejection, heartbeat expiry. |
| 2.3 | **Wrap existing stage services as adapters** (∥, strangler-fig — one stage at a time, runner executes wrapped stages, legacy chain executes the rest until all are wrapped): ingest, eligibility, earnings, derivatives(+OI), smart-money, signal-gen, calibration, market-context, strategy-decision, trade-plan. | No domain logic changes — adapters call the same service methods the chain calls today. |
| 2.4 | **Single execution path:** scheduler calls `runner.execute(tradingDate)`; manual endpoint exposes `execute(tradingDate, fromStage?)`; delete `PIPELINE_COMMAND_POLICIES` DEFERRED/FORBIDDEN maze + the ~15 `runScheduled*Stage` methods + recursive chain. | The big deletion. Keep individual non-pipeline commands (backfills, imports) as plain endpoints. |
| 2.5 | **Enable parallel intelligence group** per the verified dependency map, bounded concurrency (start at 3); measure stage `durationMs` before/after. | Watch Postgres connection pressure (compose caps at 20). |

**Verification gate:** 3 consecutive clean nightly runs via runner; induced failure in a parallel stage produces PARTIAL + receipts + Telegram + working `retry(failedSet)`; manual re-run of a single stage for a past date works; orchestrator file shrinks materially.

---

## Phase 3 — Snapshot assembler + reader migration

| # | Task | Notes |
|---|---|---|
| 3.1 | **`daily_instrument_snapshot` table** (SQL migration): unique `(instrument_id, trading_date, snapshot_version)`; latest-version read view; per-section provenance columns; indexes for review queries `(trading_date, review_eligible, calibrated_score)`. | |
| 3.2 | **snapshot-assembler module** as final DAG stage: bulk-reads all module result tables for the date, composes rows, writes versioned snapshot, marks date READY, fires post-assembly hooks (alerts eval, signal-position-ledger refresh, Telegram). Partial-failure policy: write with provenance, never block. | New module; composes only, owns no domain logic. |
| 3.3 | **Reader migrations** (∥ per reader, each behind a flag with legacy fan-out fallback + golden-master diff before flag flip): **today-trade-review** (biggest win: 11 deps → 1, delete lazy-require + N+1 trade-plan loop) · **portfolio-intelligence** (staleness = `assembled_at`) · **ai-investment-copilot** (delete its 3 lazy-requires) · **research-hub**. | Golden master: run legacy and snapshot paths side-by-side for N days; diff ranked outputs; flip only on clean diff. |
| 3.4 | **alerts-monitoring on assembly:** post-assembly hook evaluates rules against snapshot diffs (replaces manual-only `evaluate`); fix inverted coupling so alerts-monitoring pushes to notifications-delivery. | |

**Verification gate:** today-trade-review serves from snapshot with response payload identical to legacy (diff-verified) and latency = single indexed read; pulling the flag restores legacy instantly; alerts fire from assembly on a test rule.

---

## Phase 4 — Cleanup & consolidation

| # | Task | Notes |
|---|---|---|
| 4.1 | **market-data split, interface-first:** `MarketDataReadApi` interface → consumers migrate (∥) → physical split of the 15.8k-line service into ingestion vs read; read side enforces the READY watermark. No Redis unless profiling demands it. | |
| 4.2 | **Backfill snapshot history** from existing module tables (signals, calibration, decisions, context snapshots) as far back as data allows; then retire **historical-context-snapshots** module; backtesting + signal-quality-lab read historical snapshots via the owning module's bulk range-query API (kills the cross-module repository + raw-Prisma access). | Calibration's regime lookback must be covered before retirement. |
| 4.3 | **Snapshot-sprawl audit:** decide per existing snapshot table (workbench, research_overview, stock_interest, market_pulse, …) — superseded by `daily_instrument_snapshot` vs legitimately page-shaped. Delete the superseded. | **DECIDED 2026-06-11:** `daily_instrument_snapshot` = canonical per-instrument/day. KEEP as page-shaped caches (serve persisted-read pages, not per-instrument truth): workbench_snapshots, research_overview_snapshots, market_pulse_snapshots, stock_interest_snapshots, market_scan_snapshots, sector_snapshots, portfolio_intelligence_snapshots (user-scoped). KEEP region-level: market_context_snapshots / sector_context_snapshots / country_context_snapshots (region-scoped context is not per-instrument; the snapshot copies per-row values from them). SUPERSEDED once snapshot history accumulates ≥ calibration lookback: smart_money_context_snapshots, data_quality_snapshots (their per-instrument content is now in the canonical snapshot + instrument_eligibility) — retire with the HCS module (time-gated, see 4.2). |
| 4.4 | **Hard-coded constants sweep:** replace inline `>= 60` direction thresholds and re-declared LOW/MEDIUM/HIGH unions with `shared/types` imports; ESLint `no-restricted-imports` rule to block cross-module repository imports and deep module paths. | Lint rule prevents regression. |

**Verification gate:** boundary lint passes repo-wide; backtest results unchanged pre/post snapshot-source switch (same strategy, same window, same trades); module dependency graph has no cycles (verifiable via madge or similar).

---

## Effort & sequencing summary

| Phase | Scope | Parallelizable? | Risk |
|---|---|---|---|
| 0 | 7 surgical diffs | Fully ∥ | Low — each diff independently revertible |
| 1 | 1 table, 1 policy file, ~8 consumer flips | Consumer flips ∥ after shadow week | Low-med — shadow mode de-risks |
| 2 | Runner + 10 adapters, big deletion | Adapter wrapping ∥ | Med — mitigated by strangler-fig + runner tests |
| 3 | 1 table, 1 module, 4 reader flips | Readers ∥, each flagged | Med — golden-master gates every flip |
| 4 | Split, backfill, consolidation | Mostly ∥ | Low-med — mechanical with lint enforcement |

Dependencies: 0 → 1 → (2 ∥ 3.1–3.2 prep) → 3 → 4. Phase 2 and Phase 3 prep can overlap once Phase 1 verdicts are flipped; Phase 3 reader flips want the runner live so the assembler runs under DAG semantics, but the assembler can initially run as the last link of the legacy chain if sequencing demands.
