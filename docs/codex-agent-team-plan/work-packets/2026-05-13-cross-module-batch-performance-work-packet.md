# Cross-Module Batch Evaluation Performance Work Packet

## Summary

Priority: urgent performance and trust fix raised from live PO testing.

The local DB-backed batch workflows were too slow even when they did not need live provider calls. This packet covers bounded backend parallelism, reduced duplicate reads, frontend batch request overlap where safe, and Signal Quality Lab wording fixes so users can distinguish missing local price history from insufficient future rows.

## Scope

- Data Quality Engine: `POST /api/v1/data-quality/evaluate`
- Signal Generation Engine: `POST /api/v1/signals/run`
- Signal Quality Lab: dashboard diagnostics and refresh wording
- Signal Calibration Engine: `POST /api/v1/signals/calibration/run`
- Strategy Decision Engine: `POST /api/v1/strategy/evaluate`
- Trade Plan Risk Engine: `POST /api/v1/trade-plans/generate/batch`

## Product Intent

Personal trading and investment workflows must not wait through serial batches when the work is independent and DB-backed. Speed cannot weaken trusted-data gates: missing price history, insufficient future rows, and quality blockers must stay visible and conservative.

## Architecture Guardrails

- Use bounded concurrency only; no unbounded `Promise.all` over whole universes.
- Keep worker limits conservative and configurable where appropriate.
- Do not introduce paid providers, paid hosted services, paid tooling, or external queues.
- Do not relax data quality, calibration, strategy, or paper-readiness gates to make counts look better.
- Keep Signal Quality outcomes on demand and non-persisted until a separate architecture contract approves persistence.

## Work Split

- Lane 1: Data Quality batch evaluation concurrency and tests.
- Lane 2A: Signal generation duplicate DQE filter removal and Signal Quality semantics.
- Lane 2B: Signal calibration and strategy evaluation backend concurrency.
- Lane 3: Trade-plan batch generation concurrency and proof-cache reuse.
- QA: focused backend suites, builds, and single-worker Signal Quality UI smoke.

## Acceptance Criteria

- Batch endpoints process independent records with bounded concurrency or reuse cached/batched reads where safe.
- Signal Quality Lab no longer hides missing local price history behind vague maturity wording.
- UI explains whether zero evaluable signals come from missing local price history, insufficient future rows, or both.
- Focused backend tests pass.
- Backend and frontend builds pass.
- Only one Playwright worker is used for UI smoke.
- Scoped implementation commit is pushed to `origin/dev`.
