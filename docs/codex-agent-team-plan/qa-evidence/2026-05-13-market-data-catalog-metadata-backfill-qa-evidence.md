# Market Data Catalog Metadata Backfill QA Evidence - 2026-05-13

## Scope

This QA pass covers the Market Data Foundation catalog metadata backfill hotfix:

- Backfill metadata must honor the selected catalog source instead of processing the whole `IN / STOCK` catalog.
- Backfill metadata must use bounded worker concurrency so a 34-batch run is not serialized one row at a time.
- Provider validation, when enabled, remains bounded more tightly than DB-only catalog metadata repair.

This is not full Market Data module acceptance. Trusted-data completion and Data Quality Engine validation remain separate gates.

## Evidence

- Backend focused tests: `npm.cmd test -- market-data.service.test.ts market-data.repository.test.ts --runInBand` passed, `153/153`.
- Backend build: `npm.cmd run build` in `backend` passed.
- Frontend build: `npm.cmd run build` in `frontend` passed.
- Focused UI smoke: `npm.cmd run test:ui -- market-data-foundation.spec.ts -g "catalog metadata backfill sends selected catalog source scope" --workers=1` passed, `1/1`.
- `git diff --check` passed with line-ending warnings only.

## QA Findings

- Backend repository query now filters by `catalogSource` when provided.
- Backend service summary returns `catalogSource` and `workerConcurrency`.
- DB-only catalog metadata backfill uses bounded concurrency, defaulting to `16` and capped at `24`.
- Provider-validation catalog metadata backfill uses bounded concurrency, defaulting to `4` and capped at `8`.
- Frontend backfill payload now uses the selected catalog source's `region`, `assetType`, and `catalogSource`.
- The focused UI smoke proves selecting `NSE ETF Securities` sends `assetType: ETF` and `catalogSource: NSE_ETF_SECURITIES` instead of defaulting back to `STOCK`.

## Skipped Checks

- No full live 34-batch provider-heavy run was executed in QA. The fix is validated by focused unit/repository tests, builds, and a mocked UI payload smoke. A live full-universe drain remains operational work and should be run only with resource and provider-rate awareness.

## QA Decision

QA signs off this narrow remediation.

Market Data remains the top product gate until the broader missing-data, trusted-universe, and post-Market-Data Data Quality Engine gates are complete.
