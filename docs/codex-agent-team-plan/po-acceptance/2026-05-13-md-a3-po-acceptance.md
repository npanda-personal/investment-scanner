# MD-A3 PO Acceptance - Deep Price Backfill For Supported Shallow Rows

Date: 2026-05-13  
Mode: PO Acceptance Mode  
Work item: MD-A3 - Deep Price Backfill For Supported Shallow Rows  
Decision: `Accepted`

## Product Requirement

The product defect was that provider-supported stocks could remain too shallow for signals, decisions, and trade plans because normal price backfill did not force a deep historical reload unless the operator supplied `fullReload`. That is wrong for an investment scanner: the product should make usable OHLCV history available first instead of only showing validation messages that downstream modules cannot act on.

MD-A3 acceptance requires:

- A normal bounded `Backfill prices` or `BACKFILL_PRICES` run must repair supported shallow rows without requiring a `fullReload` toggle.
- The run must target completed EOD data, not in-progress daily candles.
- Results must explain whether the batch performed deep reload, incremental catch-up, no-op, zero-row, or failed work.
- Remaining shallow rows must stay visible through threshold diagnostics, not disappear behind a green success message.
- Adjusted-close evidence must be honest; missing provider adjusted close cannot be faked from close.

## Acceptance Review

Accepted. MD-A3 fixes the specific product blocker for supported shallow rows.

Product acceptance reasons:

- Normal backfill payload omits `fullReload`, but live bounded evidence returned `deepReloaded=1`.
- The backend exposes `latestCompletedEodDate=2026-05-13` and `targetEndDate=2026-05-13T23:59:59.999Z` in the live check.
- The response returned `hasMore=true`, `remainingCandidates=701`, `stillUnder120=72`, `stillUnder200=113`, and `stillUnder252=130`, so the product does not pretend all missing data is fixed after one bounded run.
- Row accounting is visible: `priceRowsReceived=17`, `priceRowsNoOp=17`, `priceRowsInserted=0`, `priceRowsUpdated=0`, and `zeroRowProviderReturns=0`.
- QA, Lead, and Architect signed off.

## Evidence Reviewed

- [MD-A3 product brief](../po-briefs/2026-05-13-md-a3-deep-price-backfill-product-brief.md)
- [MD-A3 architecture contract](../architecture-contracts/2026-05-13-md-a3-deep-price-backfill-contract.md)
- [MD-A3 QA evidence](../qa-evidence/2026-05-13-md-a3-deep-price-backfill-qa-evidence.md)
- [MD-A3 Lead validation](../lead-validation/2026-05-13-md-a3-lead-validation.md)
- [MD-A3 Architect signoff](../architecture-signoff/2026-05-13-md-a3-architect-signoff.md)
- [Market Data missing-data PO audit](../po-audits/2026-05-13-market-data-missing-data-root-cause-audit.md)

Validation evidence:

```text
backend npm.cmd test -- --runTestsByPath tests/modules/market-data-foundation/market-data.service.test.ts tests/modules/market-data-foundation/market-data.provider.test.ts --runInBand
backend npm.cmd run build
frontend npm.cmd run build
frontend npm.cmd run test:ui -- market-data-foundation.spec.ts --workers=1 --output=test-results-md-a3
POST /api/v1/market-data/prices/backfill with IN/STOCK, batchSize=1, force=true, no fullReload
```

Reported result:

```text
Backend focused tests passed: 2 suites / 102 tests.
Backend build passed.
Frontend build passed.
Frontend UI smoke passed: 8/8 tests.
Bounded live API check returned HTTP 200 in 7664 ms.
```

## Residual Product Notes

MD-A3 is accepted, but Market Data is not fully fixed. The PO and Architect audits identified remaining product-critical missing-data root causes:

- Provider support is still unknown/unclassified for too much of `IN / STOCK`.
- Scope-level freshness can still hide per-instrument stale or missing EOD data.
- Legacy synchronous sync behavior remains a product risk unless guarded or retired.
- Symbol identity and NSE/BSE separation need stronger guarantees.
- Provider timeouts, retry classification, and slow-call diagnostics need hardening.
- Holiday/session handling must be accurate because all EOD trust depends on it.

## Product Decision

Accepted for GitHub check-in.

No rejection owner applies because this packet is accepted.

Next PO priority: continue Market Data missing-data root-cause closure before starting downstream Signals, Decisions, or Trade Plan enhancements. The current audits point to provider support classification and per-instrument freshness/sync hardening as the next highest-value items.
