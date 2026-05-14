# P0.1C QA Evidence - Market Data Readiness Performance

Date: 2026-05-14
Mode: QA Verification Mode
Owner: QA / Senior Fullstack Lead
Work item: P0.1C Market Data Readiness Performance

## Final Decision

Decision: `PASS WITH RECORDED FOLLOW-UP`
Lead validation readiness: `YES - P0.1C can move to Lead validation.`

P0.1C is accepted for the scoped performance fix because repeated Market Data readiness reads now reuse one universe snapshot and return in milliseconds after the first snapshot is built. The cold first-snapshot path still takes about 8.3 seconds and is recorded as P0.1D follow-up, not waived.

## Scope Verified

- Market Data read-path snapshot reuse for:
  - `reviewReadinessSummary`
  - `universeHealth`
  - `trustedReviewUniverseHealth`
  - `repairPlan`
  - dry-run `repairRun`
- Repository price-readiness stats query consolidation.
- Docker local profile:
  - default compose stack starts Postgres only.
  - Redis and pgAdmin are opt-in profiles.
  - Postgres is capped at `1GiB`.

## Runtime Evidence

Direct DB-backed service timing with only Postgres running:

| Check | Result |
|---|---:|
| `summary-cold` | `8333ms` |
| `health-warm` | `15ms` |
| `review-universe-warm` | `3ms` |
| `repair-plan-warm` | `19ms` |
| `summary-warm` | `37ms` |
| Postgres container memory | `323.7MiB / 1GiB` |

Runtime result: warm/repeated reads pass. Cold first-snapshot latency remains too high for a final product-quality bar and is moved to P0.1D cold-start/index tuning.

## Validation Commands

- `docker compose config`
  - Result: `PASS`
  - Confirmed default stack includes only `postgres`.
- `npm.cmd test -- tests/modules/market-data-foundation/market-data.repository.test.ts tests/modules/market-data-foundation/market-data.service.test.ts --runInBand`
  - Result: `PASS`, 2 suites, 158 tests.
- `npm.cmd run build`
  - Result: `PASS`
- Direct service runtime timing script against local Postgres.
  - Result: `PASS` for warm/repeated-read performance.

## QA Findings

1. Snapshot reuse works at service layer.
   - Cold summary builds one snapshot.
   - Follow-up read methods reuse the snapshot and return in milliseconds.

2. Docker default startup is safer.
   - `docker compose config` shows only Postgres by default.
   - Redis requires `--profile cache`.
   - pgAdmin requires `--profile tools`.

3. Memory risk remains outside container limit.
   - Postgres stayed within the `1GiB` limit.
   - Docker Desktop / WSL still held host memory after runtime checks, so the Orchestrator shut Docker/WSL down when host memory crossed the 95% hard gate.

## Residual Follow-Up

Create/continue P0.1D:

- cold first-snapshot latency should be reduced below the product target;
- investigate `price_ticks` index/query plan with `EXPLAIN`;
- consider persisted price-readiness summaries if index tuning is insufficient;
- consider WSL memory configuration outside repo if Docker Desktop continues to hoard host memory.

## Skipped Checks

- Full frontend Playwright was not run.
  - Reason: P0.1C is backend/runtime-performance and Docker/WSL memory crossed the hard gate during runtime checks.
- Full Express HTTP timing after the final direct service proof was not rerun.
  - Reason: direct service timing isolated the backend logic and avoided starting another long-lived Node server under high memory pressure.

## Final Rejection Reasons

None for P0.1C scoped acceptance. P0.1D owns the residual cold-start/index tuning.
