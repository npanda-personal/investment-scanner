# MD-A3 Lead Validation - Deep Price Backfill For Supported Shallow Rows

Date: 2026-05-13  
Mode: Lead Validation Mode  
Owner: Senior Fullstack Lead / Orchestrator  
Work item: MD-A3 - Deep Price Backfill For Supported Shallow Rows

## Inputs

- Product brief: [MD-A3 product brief](../po-briefs/2026-05-13-md-a3-deep-price-backfill-product-brief.md)
- Architecture contract: [MD-A3 architecture contract](../architecture-contracts/2026-05-13-md-a3-deep-price-backfill-contract.md)
- Developer handoff: [MD-A3 developer handoff](../developer-handoffs/2026-05-13-md-a3-developer-handoff.md)
- QA plan: [MD-A3 QA plan](../qa-plans/2026-05-13-md-a3-deep-price-backfill-qa-plan.md)
- QA evidence: [MD-A3 QA evidence](../qa-evidence/2026-05-13-md-a3-deep-price-backfill-qa-evidence.md)
- PO root-cause audit: [Market Data missing-data PO audit](../po-audits/2026-05-13-market-data-missing-data-root-cause-audit.md)
- Architecture root-cause audit: [Market Data missing-data architecture audit](../architecture-contracts/2026-05-13-market-data-missing-data-architecture-audit.md)

## Validation Result

Lead validation status: `SIGNED OFF`

The implementation satisfies the Architect asks after QA signoff:

- Normal bounded `BACKFILL_PRICES` now deep-backfills provider-supported shallow rows without an operator-supplied `fullReload`.
- Provider fetches are capped and reported through `latestCompletedEodDate` and `targetEndDate`.
- Candidate ordering is deterministic: missing latest, under 120, under 200, under 252, stale, then symbol.
- Response diagnostics expose row counts, zero-row provider returns, deep versus incremental work, remaining candidates, and still-under-120/200/252 counts.
- Zero-row provider returns are not counted as successful repairs and do not demote supported rows to unsupported during price backfill.
- Provider adjusted-close mapping no longer fakes adjusted close from close.
- Frontend backfill payload remains scoped and omits `fullReload`; the repair panel shows diagnostics and warning treatment for zero/no-progress outcomes.

Lead correction made before QA signoff:

- Recomputed `remainingCandidates` now refreshes `hasMore` and `nextOffset`, so the UI/API does not incorrectly report completion when the mutating repair queue still has work.

## Evidence

Automated validation:

- `backend`: `npm.cmd test -- --runTestsByPath tests/modules/market-data-foundation/market-data.service.test.ts tests/modules/market-data-foundation/market-data.provider.test.ts --runInBand` passed, 2 suites / 102 tests.
- `backend`: `npm.cmd run build` passed.
- `frontend`: `npm.cmd run build` passed.
- `frontend`: `npm.cmd run test:ui -- market-data-foundation.spec.ts --workers=1 --output=test-results-md-a3` passed, 8/8 tests after sandbox-only `EPERM` process-spawn failures were rerun with approved escalation.
- `git diff --check` passed with line-ending warnings only.

Live bounded validation:

- Endpoint: `POST /api/v1/market-data/prices/backfill`
- Payload: `region=IN`, `assetType=STOCK`, `batchSize=1`, `force=true`; no `fullReload`.
- Result: HTTP `200` in `7664 ms`.
- Key fields: `processedCount=1`, `totalCount=701`, `hasMore=true`, `nextOffset=0`, `priceRowsReceived=17`, `priceRowsNoOp=17`, `zeroRowProviderReturns=0`, `deepReloaded=1`, `incrementalCaughtUp=0`, `latestCompletedEodDate=2026-05-13`, `targetEndDate=2026-05-13T23:59:59.999Z`, `remainingCandidates=701`, `stillUnder120=72`, `stillUnder200=113`, `stillUnder252=130`.

## Residual Notes

- MD-A3 fixes the deep-backfill policy for supported shallow rows; it does not finish all Market Data missing-data work.
- Remaining candidates are still present locally, so repeated bounded backfill runs and follow-up root-cause items remain necessary.
- QA did not run a broad provider-heavy full-universe repair or a 20-row sample table. This was intentional to avoid multi-hour local provider load.
- PO and Architect audits identify further high-priority root causes: provider support classification gaps, scope-level freshness hiding per-instrument stale data, legacy synchronous sync exposure, global symbol identity risk, provider timeout/retry taxonomy, and holiday/session accuracy.

## Next Gate

Move to Architect Signoff. Architect should verify the solution remains local-first, uses no paid services, preserves conservative downstream trust gates, and keeps remaining missing-data root causes visible rather than hiding them behind validation text.
