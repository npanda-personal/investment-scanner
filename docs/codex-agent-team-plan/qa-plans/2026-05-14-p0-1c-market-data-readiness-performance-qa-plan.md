# P0.1C Market Data Readiness Performance QA Plan - 2026-05-14

Mode: QA Verification Mode
Owner: QA Engineer / Senior Fullstack Lead
Architecture: [P0.1C performance contract](../architecture-contracts/2026-05-14-p0-1c-market-data-readiness-performance-contract.md)
Status: `Ready for QA after implementation`

## Scope

Verify the Market Data readiness and dry-run repair paths are fast enough to safely resume P0.1C operational drain work.

## Required Checks

1. Backend focused tests:
   - repository tests for `priceReadinessStatsForSymbols`;
   - service tests for `repairPlan`, `reviewReadinessSummary`, dry-run `repairRun`, and `backfillPrices` summary behavior.
2. Runtime API evidence when memory is below 90%:
   - `GET /api/v1/market-data/universe/repair-plan?region=IN&assetType=STOCK`
   - `GET /api/v1/market-data/review-readiness-summary?region=IN&assetType=STOCK`
   - dry-run `POST /api/v1/market-data/universe/repair-run` with `BACKFILL_PRICES`, `batchSize=10`, `maxBatchesPerAction=1`
   - dry-run `POST /api/v1/market-data/universe/repair-run` with `VALIDATE_PROVIDERS`, `batchSize=10`, `maxBatchesPerAction=1`
3. Confirm no mutation in dry-run responses.
4. Confirm response contracts remain compatible with existing UI/API consumers.
5. Confirm memory stays below the cleanup gate during verification.

## Rejection Criteria

- Any pre-drain read-only/dry-run path remains near the previous 44-48 second runtime without a documented, accepted reason.
- Summary DTOs remove or rename existing fields.
- Dry-run mutates data.
- Price backfill launches unbounded provider work or hides partial/failure state.
- Memory crosses 95% during routine pre-drain verification.

