# MD-A2 PO Acceptance - Sync Catalog Progress And Bulk Performance

Date: 2026-05-13
Mode: PO Acceptance Mode
Work item: MD-A2 - Sync Catalog Progress And Bulk Performance
Decision: Accepted

## Product Requirement

The product defect was that the visible `Sync Catalog` action could run for hours behind one invisible whole-universe request. That was unacceptable because the user had no reliable progress, evidence, partial result, bounded work contract, or recovery path while Market Data remained the upstream trust layer for Signals, Signal Quality, Strategy Decision, Today Review, and Trade Plans.

MD-A2 acceptance requires:

- `Sync Catalog` must not fire one synchronous whole-universe request with no progress.
- The user must see immediate state, scoped progress, counts, warnings/failures, terminal evidence, and retry/continue guidance.
- Backend work must be bounded and server-owned, with capped provider-facing concurrency.
- `region` and `assetType` must be present on the visible workflow.
- Bounded local-safe checks must prove the old hidden multi-hour request mode cannot happen from the visible button.

## Acceptance Review

Accepted. MD-A2 solves the specific product defect.

Evidence reviewed shows that the visible `Sync Catalog` workflow now starts `POST /api/market-data-foundation/stocks/sync-runs`, receives a prompt `202` run contract, polls a status URL, supports cancellation, and exposes progress/terminal counts instead of holding the original request open for full-catalog provider work.

Product acceptance reasons:

- The visible button no longer posts to legacy `/stocks/sync-all`; UI tests explicitly guard this.
- The backend returns a scoped run contract with `runId`, `region`, `assetType`, caps, counts, warnings/errors, timestamps, and `statusUrl`.
- Provider-facing load is backend-owned and capped at `batchSize <= 50`, `workerCount <= 2`, `workerConcurrency <= 3`, and `maxBatches <= 100`.
- Repository selection is bounded by `take`, and active runs exclude already processed IDs.
- The UI shows `Catalog sync progress`, processed/total counts, success/failure/skipped/no-op counts, warning/error evidence, cancellation, and partial continuation.
- Local-safe evidence proved start responsiveness: the bounded live `IN/STOCK` start returned HTTP `202` in `124 ms`, then status polling returned terminal `COMPLETED` with `processedCount=2905`, `skippedCount=2905`, `percentComplete=100`, and no recent errors.
- QA, Lead, and Architect all signed off.

## Evidence Reviewed

- [PO audit](../po-audits/2026-05-13-market-data-full-module-po-audit.md)
- [QA evidence](../qa-evidence/2026-05-13-md-a2-qa-evidence.md)
- [Lead validation](../lead-validation/2026-05-13-md-a2-lead-validation.md)
- [Architect signoff](../architecture-signoff/2026-05-13-md-a2-architect-signoff.md)

Validation evidence:

```text
backend npm.cmd run build
backend npm.cmd test -- market-data.service.test.ts market-data.routes.test.ts --runInBand
frontend npm.cmd run build
frontend npm.cmd run test:ui -- market-data-foundation.spec.ts --workers=1 --output=test-results-md-a2
```

Reported result:

```text
Backend build passed.
Backend focused tests passed: 2 suites / 94 tests.
Frontend build passed.
Frontend mocked UI tests passed: 8/8 tests.
Bounded live API start returned HTTP 202 in 124 ms.
Status poll returned HTTP 200 terminal COMPLETED.
```

## Residual Notes

These do not block MD-A2 acceptance:

- Legacy `syncAllStocks` and `/stocks/sync-all` remain for compatibility, but the visible page-level `Sync Catalog` path does not use them.
- The bounded live run used a freshness-gated no-new-data path, so it did not exercise provider-heavy fetching. That is acceptable for this gate because MD-A2 required local-safe proof that the visible workflow is bounded, responsive, and status-driven.
- `RUN_NOT_FOUND` has backend and frontend handling, but no dedicated mocked UI test was reported.

## Product Decision

Accepted for GitHub check-in.

No rejection owner applies because this packet is accepted.

Next PO priority from the audit: **MD-A3 - Deep Price Backfill For Supported Shallow Rows**, unless MD-A2 follow-up live evidence shows too few provider-supported rows to backfill. In that case, pull **Provider Validation Drain And Retry Classification** first, then return to MD-A3.
