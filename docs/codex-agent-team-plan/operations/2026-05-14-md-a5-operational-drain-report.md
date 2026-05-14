# MD-A5 Operational Drain Report - 2026-05-14

Mode: Operational Drain Mode
Owner: Senior Fullstack Lead / Orchestrator
Scope: `IN / STOCK`
Related board item: P0.1C Trusted Universe Operational Drain
Status: `Blocked before mutation`

## Runtime Setup

- Backend was rebuilt with `npm.cmd run build`.
- Backend was started on `http://127.0.0.1:3000` with PID `29124`.
- `GET /health` returned `{"status":"ok"}` at `2026-05-14T12:49:53.957Z`.
- Frontend remained stopped.
- No Playwright, Docker, frontend, or additional Node service was started.

## Pre-Drain Evidence

Read-only and dry-run calls were attempted before any mutating drain:

| Check | Endpoint / Payload | Result | Duration |
|---|---|---|---:|
| Repair plan and readiness snapshot | `GET /api/v1/market-data/universe/repair-plan?region=IN&assetType=STOCK`; `GET /api/v1/market-data/review-readiness-summary?region=IN&assetType=STOCK` | Completed | ~47.9s |
| Dry-run price drain | `POST /api/v1/market-data/universe/repair-run`, `actions=["BACKFILL_PRICES"]`, `batchSize=10`, `maxBatchesPerAction=1`, `dryRun=true` | Completed but response projection was not useful in the shell capture | ~43.9s |
| Dry-run provider validation | `POST /api/v1/market-data/universe/repair-run`, `actions=["VALIDATE_PROVIDERS"]`, `batchSize=10`, `maxBatchesPerAction=1`, `dryRun=true` | Completed but response projection was not useful in the shell capture | ~43.5s |

## Snapshot Counts

- `totalCatalogInstruments`: `2907`
- `providerUnknownValidationNeeded`: `0`
- `providerRetryValidationNeeded`: `236`
- `supportedPriceBackfillNeeded`: `2671`
- `businessMetadataAutoRepairable`: `2657`
- `manualBusinessMetadataRequired`: `2659`
- `trustStatus`: `NOT_TRUSTWORTHY`
- `reviewMode`: `NO_REVIEW`
- `nextAction`: `BACKFILL_PRICES`

## Stop Condition

No mutating drain was run.

Reason:

- Pre-drain read-only and dry-run paths were already too slow for operational use.
- Memory utilization rose to `97.89%`, closing the resource gate.
- Backend PID `29124` was stopped immediately after evidence capture.
- After cleanup, memory dropped to `89.18%`, reopening the gate.

## Initial Technical Observation

Local code inspection found that `MarketDataFoundationService.backfillPrices` processes the selected page sequentially. With `supportedPriceBackfillNeeded=2671`, a full operational drain would likely remain slow and resource-heavy unless the summary paths and price backfill executor are optimized first.

## Next Action

- Keep BLK-0006 open.
- Do not start a large mutating market-data drain until the slow local summary/dry-run path is explained.
- Use the read-only Market Data performance investigation to decide whether the next item is:
  - a bounded Market Data backend performance fix packet, or
  - a smaller operational drain with proven acceptable runtime and memory behavior.

