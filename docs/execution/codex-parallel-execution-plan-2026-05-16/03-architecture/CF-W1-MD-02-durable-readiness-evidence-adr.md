# CF-W1-MD-02 Durable Readiness Evidence ADR

Date: 2026-05-17

Owner: Team 03 Architecture Factory

Status: Draft ADR prepared. Not an implementation approval.

## Decision Context

Product Owner approved Option B as ADR direction only in `07-decisions/DECISION-20260517-market-data-durable-readiness-storage-adr-resolution.md`: use companion durable readiness/evidence storage.

Current source evidence remains narrower than the target policy:

- `PriceTick` is unique on `symbol + timestamp`.
- `LatestPrice` is keyed by `symbol`.
- repository storage updates daily candles through the current `symbol_timestamp` key.
- existing characterization tests prove useful derived/read-path behavior, but not full durable per-candle provenance.

Until an implementation slice is separately approved, product claims must remain limited to derived/read-path evidence.

## Decision

Adopt companion durable Market Data readiness/evidence storage as the architecture direction for future implementation.

The companion storage should preserve existing price-row compatibility and record durable evidence beside price data instead of treating the current `PriceTick`/`LatestPrice` keys as contract-complete.

The conceptual future model should support:

- a durable evidence record for each instrument/candle/source readiness evaluation,
- optional run or batch identity for ingestion/validation evidence,
- Data Quality Engine evaluation from Market Data public outputs without moving DQE scoring ownership into Market Data Foundation,
- downstream differentiation between durable evidence and derived/read-path evidence.

No Prisma schema, migration, generated type, repository, service, DQE handoff, provider, scheduler, startup/backfill, route, package, frontend, or executable test work is approved by this ADR draft.

## Natural Key

Future companion evidence storage should use an idempotent natural key that includes, at minimum:

```text
instrument_id or canonical_symbol
region
asset_type
timeframe
timestamp or trading_date
source
source_symbol or provider_symbol where provider identity can differ
```

Recommended default for daily equity data:

```text
canonical_symbol
region
asset_type
timeframe = 1d
trading_date
source
source_symbol
```

If stable `instrument_id` is available at implementation time, prefer it over symbol-only identity while retaining canonical/source symbols for auditability.

## Record Semantics

Recommended future semantics:

- price rows remain normalized market data records;
- companion evidence records are idempotent/upserted latest evidence by natural key;
- ingestion or validation run summaries are append-only when a run/batch model is in scope;
- evidence records must indicate whether the source row is normalized canonical, provider-specific, derived, cached, or fallback-derived;
- lower-quality or less specific evidence must not silently overwrite higher-quality evidence without retaining source, timestamp, and reason fields.

If strict event history becomes necessary, add append-only evidence events in a separate approved slice. Do not make that part of the first implementation slice unless QA and Architect approval explicitly require it.

## Evidence Fields

The future companion evidence contract should account for:

- provider/source name,
- source symbol or provider symbol,
- source timestamp where available,
- ingested timestamp,
- source fingerprint or batch/run identity,
- validation window start/end,
- duplicate provider rows skipped,
- invalid OHLC rows rejected,
- missing latest candle evidence,
- stale latest candle evidence,
- zero or suspicious volume evidence,
- adjusted-close fallback evidence,
- unsupported scope or provider gap evidence,
- retry/cooldown/manual-required provider state where applicable,
- durable-vs-derived evidence marker,
- readiness reasons and blockers appropriate for DQE handoff.

## Options Compared

| Option | Assessment |
| --- | --- |
| Expand existing `PriceTick` / `LatestPrice` | Direct but high-risk. It requires key migration around `symbol + timestamp` and `symbol`, risks mixing normalized price facts with readiness audit evidence, and would touch Prisma/generation broadly. |
| Companion OHLC evidence table | Preferred direction. Preserves price-row compatibility while adding durable per-candle/source evidence and a richer natural key. Requires schema approval before implementation. |
| Durable readiness summary table only | Useful for downstream DQE summaries but insufficient alone for per-candle duplicate, invalid, missing, source, and provenance auditability. Could be a later projection. |
| Keep current storage and limit claims | Safe as the current runtime state, but it cannot support contract-grade durable readiness claims. This remains the fallback until implementation is approved. |

## Prisma And Migration Impact

Future implementation is expected to require additive Prisma schema work, a migration, and generated Prisma client changes. That is a true consent blocker and must be split into a separate approved implementation packet.

Recommended future schema posture:

- additive companion storage first;
- no destructive migration of `PriceTick` or `LatestPrice` in the first slice;
- no startup or provider-heavy backfill by default;
- existing rows remain usable as price rows but not retroactively contract-grade durable evidence.

## Migration And Backfill

Default migration approach:

- create additive companion storage only after explicit approval;
- do not backfill automatically at startup;
- do not call live providers during migration;
- mark pre-existing price rows as lacking durable evidence unless a bounded, local, separately approved backfill derives evidence from existing local data;
- keep any historical backfill bounded by region, asset type, timeframe, batch size, and explicit operator action.

## Rollback

Rollback strategy for the future additive implementation:

- stop writing companion evidence records;
- have Market Data and DQE ignore companion evidence if the feature is disabled or the table is absent;
- preserve existing `PriceTick` and `LatestPrice` behavior;
- downgrade product claims to derived/read-path evidence;
- drop companion storage only through an approved rollback migration if no accepted downstream requirement depends on it.

## Query And Handoff Strategy

Market Data Foundation should own persistence and read models for companion evidence.

Data Quality Engine should remain the evaluator. DQE may consume Market Data public service outputs or exported DTOs, but downstream modules must not import Market Data repositories directly or duplicate DQE readiness scoring.

Downstream signal, alert, portfolio, watchlist, backtest, calibration, trade-plan, and copilot workflows should consume DQE public outputs and show or block based on DQE readiness status/reasons.

## Future Split Packets

| Packet | Purpose | Status |
| --- | --- | --- |
| `CF-W1-MD-02A` | Prisma/schema proposal for additive companion durable evidence storage. | Blocked by explicit schema/migration approval. |
| `CF-W1-MD-02B` | Market Data repository/service write and read model for companion evidence. | Blocked until schema packet is accepted. |
| `CF-W1-MD-02C` | DQE handoff from Market Data public evidence outputs. | Blocked until Market Data evidence read model exists. |
| `CF-W1-MD-02D` | Downstream readiness adoption for signals/alerts/portfolio/watchlists/backtests/trade-plan/copilot. | Blocked until DQE public contract is accepted. |

Candidate future source files must be reserved exactly by each packet before implementation. No file is reserved by this ADR draft.

## Future Focused Test Strategy

After implementation approval only, focused tests should prove:

- natural-key idempotency includes scope, timeframe, source, and source symbol/provider symbol;
- duplicate provider rows and invalid OHLC rows create durable evidence;
- stale/missing latest candle evidence can be queried without live providers;
- zero or suspicious volume evidence remains visible and blocks readiness where policy requires;
- DQE consumes public Market Data evidence without repository coupling;
- downstream consumers distinguish durable evidence from derived/read-path evidence.

Provider, scheduler, startup, Angel One, live provider, broad build, UI, and Prisma mutation validation remain excluded unless separately approved.

## Local And Cost Constraints

The future implementation must preserve:

- localhost-only development and runtime;
- no paid APIs, paid data providers, paid infrastructure, or cloud dependency;
- no broker execution or broker-account behavior;
- no external telemetry;
- no startup/backfill behavior without explicit approval;
- no hidden live-provider calls during tests or migrations.

## Stop Conditions

Stop and return to Team 00 / Architect / Product Owner if a future packet requires:

- Prisma schema or migration without explicit approval;
- route registry or shared utility changes;
- generated/common fixture or package changes;
- provider, live-provider, Angel One, startup, backfill, repair, or scheduler behavior;
- a product claim that current derived/read-path evidence is durable;
- DQE scoring ownership moving into Market Data Foundation;
- downstream modules bypassing DQE public outputs.

## ADR Outcome

Architecture can proceed to future split-packet planning.

`CF-W1-MD-02` remains not Ready for Implementation. Source/schema/test work is blocked until the next packet receives explicit Product Owner, Architect, Orchestrator, and QA approval with exact file reservations.
