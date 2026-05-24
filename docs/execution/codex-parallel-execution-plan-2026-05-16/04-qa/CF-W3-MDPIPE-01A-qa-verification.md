# CF-W3-MDPIPE-01A QA Verification

Date: 2026-05-25

Verifier: Team 04

Result: ACCEPT

## Scope

`CF-W3-MDPIPE-01A-MDF-OFFICIAL-EOD`

## Verification Summary

Team 04 accepted the current diff after Team 00 added the timestamp integration fix for official EOD matched rows.

Acceptance evidence:

- `syncScheduledRegion()` attempts official NSE EOD bulk before the per-symbol provider loop.
- Scope is constrained to `IN/STOCK`; unsupported scope falls back to existing provider behavior.
- Official rows are stored under canonical local symbol through existing idempotent storage.
- Matched official rows update `lastSuccessfulDataLoadTimestamp`.
- Additive `officialEodBulk` evidence is wired into scheduled sync summary.
- Focused tests cover official-first and disabled fallback behavior.
- No forbidden schema, route, shared, package, frontend, downstream, or provider-credential files changed.

## Team 00 Validation

```powershell
cd backend
npm.cmd test -- market-data.service.test.ts market-data.repository.test.ts market-data.scheduler.test.ts --runInBand
npm.cmd run build
```

Result:

- 3 suites passed.
- 195 tests passed.
- Backend build passed.

Phrase scan:

```powershell
rg -n "target price|price target|profit target|reward/risk|R:R|buy now|sell now|must buy|must sell|guaranteed|financial advice" backend/src/modules/market-data-foundation backend/tests/modules/market-data-foundation
```

Result: no matches.

`git diff --check`: no whitespace errors; normal CRLF warnings only.

## Residual Risks

- Official timestamp update currently suppresses timestamp-update failure after successful row storage, preserving the run instead of failing it. This is non-blocking because the candle storage itself is the authoritative freshness source for stale selection.
- Additional direct unit coverage can be added later for unsupported-scope, no-task, and invalid-date fallback reason branches.

## QA Rerun After Team 10 Rejection

Date: 2026-05-25

Result: ACCEPT.

Team 10 rejected the first review because official NSE bulk matching could map bare NSE symbols into BSE or ambiguous local instruments. Team 05 completed bounded rework and Team 04 accepted the rerun.

Rerun acceptance evidence:

- `StockSyncTask` now carries optional exchange identity.
- Active and stale sync-task repository queries project `exchange`.
- Official NSE bulk matching requires NSE-like exchange identity or explicit `.NS` evidence.
- `.BO`, BSE, non-NSE, and ambiguous no-exchange tasks skip official NSE matching and fall back to the existing per-symbol path.
- Focused negative service coverage proves `RELIANCE.BO` does not consume the NSE `RELIANCE` official row.
- Repository coverage asserts exchange projection for sync tasks.

Team 00 validation after rework:

```powershell
cd backend
npm.cmd test -- market-data.service.test.ts market-data.repository.test.ts market-data.scheduler.test.ts --runInBand
npm.cmd run build
```

Result:

- 3 suites passed.
- 196 tests passed.
- Backend build passed.

Phrase scan found no target/R:R/advice matches.

`git diff --check` passed with normal CRLF warnings only.

Skipped checks:

- Live provider/public-download execution was not run.
- Frontend and downstream-module validation were out of scope for this backend-only rerun.

Residual risks after rerun:

- NSE archive shape drift remains an external dependency; failure falls back to per-symbol ingest.
- BSE official bulk matching remains out of scope.

## Final Next Gate

Team 10 re-review and Team 03 Architect re-signoff.
