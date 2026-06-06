# Daily Pipeline Stability — Fix Plan (2026-06-06)

Derived from AUDIT-1..4. Servers are down; verify via tsc + jest + ts-node + DB queries.
Principle: market-data = only external-fetch module; every other module reads persisted
market data and INCREMENTALLY PERSISTS its own outputs; screens read persisted tables only
(no runtime compute); daily = incremental delta + persist-every-run; full-universe = manual
admin-only. Market-WIDE aggregates (regime/breadth/sector/pulse) legitimately produce one
daily snapshot from persisted prices — that is NOT a "full universe load" violation; the
violation is (a) recomputing them on a GET, (b) re-fetching external data, (c) per-stock
stages that partial-save or never persist.

## WAVE P-1 — foundational correctness (ledger health + persisted-read)
- FIX-A [market-context-intelligence]: remove the `summary()` -> `this.run()` GET fallback
  (regime/sectors/breadth/countries trigger a full pipeline on read). Persisted-read, null-safe.
  Sweep all modules for other GET->generate/ingest fallbacks.
- FIX-B [pipeline-orchestration]: stale-lease REAPER — mark leaked RUNNING runs/stage_runs
  FAILED after a timeout (startup + periodic); clean up the current 19+16 leaked rows so
  idempotency gates stop blocking re-runs.
- FIX-C [smart-money-intelligence]: fix the broken upsert (34,166 dup (instrument,date) rows)
  -> true upsert on the unique key; dedup existing rows (keep latest).
- FIX-D [data-quality-engine + market-data price read]: fix the `napi string conversion`
  error in the priceTick batch read that makes DATA_QUALITY skip stocks (only 50 persisted).

## WAVE P-2 — partial-load / completeness + pool safety
- FIX-E [signal-quality-lab]: always persist outcomes on the scheduled path (drop the
  persistOutcomes=false discard).
- FIX-F [pipeline-orchestration + batch runners]: throttle/serialize stage concurrency so it
  never exceeds Prisma connection_limit=10 (the EARNINGS/STOCK_INTEREST/DQ FATAL too-many-clients).
- FIX-G [signal-position-ledger]: durable persist of the full active set (only 39 rows now;
  in-memory refresh state loses progress on restart).
- Wire STOCK_INTEREST into the scheduled chain; de-dupe Research Hub double-run (scheduler + chain).

## WAVE P-3 — persist the compute-on-read screens (snapshot + pipeline + persisted-read GET)
- FIX-H [stock-research-workbench]: WorkbenchSnapshot table + daily per-stock compute; GET reads it.
- FIX-I [market-data-foundation]: precompute movers + 52w/delivery/volume scans + screener
  into snapshot tables via a daily stage; GETs read snapshots.
- FIX-J [research-hub]: dedicated overview snapshot table (not JSONB in pipeline_runs); no
  recompute of whatChanged/actionability on read.
- FIX-K [signal-generation-engine]: persist strategyMatches on SignalResult at generation so
  signals/top + screener stop doing N x 500-bar price queries on read. (revert-prone module — commit fast)
- FIX-L [portfolio-intelligence]: snapshot the health/intelligence compute.
- FIX-M [market-intelligence instrument-context]: persist the 63-bar relative-strength.

## WAVE P-4 — incremental vs manual full-universe separation
- Daily scheduled per-stock stages = incremental (changed-instrument delta) + persist EVERY run.
- Full-universe/historical reload = guarded manual admin endpoint only.
- Backfill/repair the current gaps (signal_results days, delivery 4-day gap) via the manual path.

## THEN — tri-agent sign-off: Architecture + QA + PO. Fix all feedback. Repeat until all 3 sign off.
