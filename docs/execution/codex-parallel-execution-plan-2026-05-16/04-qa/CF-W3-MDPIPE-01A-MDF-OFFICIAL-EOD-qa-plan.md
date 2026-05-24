# CF-W3-MDPIPE-01A - Market Data Official EOD Bulk QA Plan

Date: 2026-05-25

Owner: Team 04

Status: Ready for Slice 1 validation.

## Scope

Validate that Market Data Foundation can refresh latest completed `IN/STOCK` candles from one official NSE EOD file before falling back to per-symbol provider calls.

## Acceptance Checks

- Official EOD bulk path is attempted for scheduled `IN/STOCK` latest-candle sync when enabled.
- Existing test mode keeps live downloads disabled unless explicitly enabled by env.
- Stale instruments are matched by canonical symbol/provider symbol aliases.
- Stored rows use canonical local symbol, not necessarily the exchange source symbol.
- Existing `storeHistorical()` idempotent inserted/updated/no-op behavior remains unchanged.
- Catalog sync records official source evidence in summary.
- If official download or parsing fails, the existing per-symbol provider path remains available.
- No full historical reload is triggered by the new latest-candle path.
- No downstream stage is auto-wired in this slice.

## Focused Test Commands

```powershell
cd backend
npm.cmd test -- market-data.service.test.ts market-data.repository.test.ts market-data.scheduler.test.ts --runInBand
npm.cmd run build
```

## Focused Regression Search

```powershell
rg -n "target price|price target|profit target|reward/risk|R:R|buy now|sell now|must buy|must sell|guaranteed|financial advice" backend/src/modules/market-data-foundation backend/tests/modules/market-data-foundation
```

## Manual Verification - Later

After the slice is merged into the active runtime and the Product Owner explicitly allows local provider/public-download execution:

- Confirm scheduler status shows the latest completed `IN/STOCK` candle current.
- Confirm `Sync Catalog` no longer reports 2,672 skipped stale instruments when official EOD has rows for the target date.
- Confirm Market Data table `Data Through` reflects the latest completed date for matched symbols.
- Confirm unmatched symbols remain explainable and can fall back to existing repair/provider paths.

## Rejection Conditions

Reject if:

- the slice requires Prisma/schema, route registry, frontend, package, generated, shared utility/UI, or downstream source changes;
- the slice makes Angel One the broad-universe primary latest loader;
- the slice starts a full historical reload from routine scheduled sync;
- trusted downstream stages are triggered without DQ gating;
- test mode performs live downloads by default.
