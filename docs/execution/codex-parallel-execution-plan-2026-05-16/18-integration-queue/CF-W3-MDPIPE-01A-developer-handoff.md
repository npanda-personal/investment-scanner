# CF-W3-MDPIPE-01A Developer Handoff

Date: 2026-05-25
Work item: `CF-W3-MDPIPE-01A-MDF-OFFICIAL-EOD`
State/mode: Implementation complete, ready for QA gate
Owner: Team 05
Lane/module: Lane 1 - `market-data-foundation`

## Exact Files Changed

- `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.repository.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.types.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.md`
- `backend/tests/modules/market-data-foundation/market-data.service.test.ts`
- `backend/tests/modules/market-data-foundation/market-data.repository.test.ts`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-05-CF-W3-MDPIPE-01A-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W3-MDPIPE-01A-developer-handoff.md`

## Exact Files Inspected

- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W3-MDPIPE-01-incremental-market-data-pipeline-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W3-MDPIPE-01-incremental-market-data-pipeline-architecture.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W3-MDPIPE-01A-MDF-OFFICIAL-EOD-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/13-implementation-evidence/CF-W3-MDPIPE-01A-ready-promotion.md`
- `backend/src/modules/market-data-foundation/market-data-foundation.exchange-eod-adapter.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.scheduler.ts`
- `backend/tests/modules/market-data-foundation/market-data.scheduler.test.ts`

## Behavior Changed

1. Scheduled `syncScheduledRegion(IN/STOCK)` now attempts one official NSE security bhavdata CSV (`latest completed trading date`) before per-symbol provider ingestion.
2. Official rows are parsed once and matched to stale active tasks using symbol aliases from:
   - canonical local symbol
   - provider symbol
   - source symbol
   - display symbol
3. Matched official rows are persisted under canonical local symbol via existing `storeHistorical()` path (idempotent insert/update/no-op semantics preserved).
4. Scheduled summary now includes additive `officialEodBulk` evidence payload:
   - source name/url/file
   - target trading date
   - source fingerprint
   - rows read/parsed
   - matched instrument count
   - rows inserted/updated/no-op from official path
   - fallback reason + warnings
5. Provider fallback remains active for:
   - official path disabled
   - unsupported scope
   - download/parse unavailable
   - partial/no-match official coverage

## Docs Changed

- `backend/src/modules/market-data-foundation/market-data-foundation.md`:
  - added scheduler env var `MARKET_DATA_NSE_OFFICIAL_EOD_BULK_ENABLED`
  - documented scheduled official-bulk-first behavior and evidence fields

## Contracts Changed

- Additive type contract only (no route/schema change):
  - `ScheduledRegionSyncSummary.officialEodBulk?: OfficialEodBulkSyncEvidence`
  - `StockSyncTask` includes optional `sourceSymbol` and `displaySymbol`

## Tests Run

- `cd backend && npm.cmd test -- market-data.service.test.ts market-data.repository.test.ts market-data.scheduler.test.ts --runInBand`
  - Passed: 3 suites, 195 tests.
- `cd backend && npm.cmd run build`
  - Passed (`tsc`).
- `rg -n "target price|price target|profit target|reward/risk|R:R|buy now|sell now|must buy|must sell|guaranteed|financial advice" backend/src/modules/market-data-foundation backend/tests/modules/market-data-foundation`
  - No matches.

## Tests Skipped

- Live provider/public-download execution: intentionally skipped per assignment constraints (mocked fetch only).
- Downstream module wiring/validation: out of scope for this slice.

## Assumptions

- Official latest-candle automated bulk source for this slice is NSE security bhavdata archive endpoint.
- Additive summary JSON fields are acceptable without route/schema changes.

## Risks

- If official NSE archive shape changes, parse may fail and fallback path will take over; this slice does not add persistent failure ledgering.
- BSE official latest-candle bulk automation is not included.

## Blockers

- None encountered for bounded slice.

## Shared-File Requests

- None.

## Next Gate

- QA rerun using `04-qa/CF-W3-MDPIPE-01A-MDF-OFFICIAL-EOD-qa-plan.md` after the Team 10 cross-exchange matching rejection.

## Review Rework Update - 2026-05-25

Team 10 rejected the first review because official NSE bulk matching could map bare NSE symbols into BSE or ambiguous local instruments.

Team 05 completed bounded rework in the same reserved files:

- `StockSyncTask` now carries optional `exchange` identity.
- Active and stale sync-task repository queries project `exchange`.
- Official NSE bulk matching now skips BSE, `.BO`, non-NSE, and ambiguous no-exchange tasks.
- Ambiguous or non-NSE tasks fall back to the existing per-symbol provider ingestion path.
- Focused negative service coverage proves a BSE-like `RELIANCE.BO` task does not consume the NSE `RELIANCE` official row.
- Repository coverage asserts exchange projection.

Team 00 reran:

```powershell
npm.cmd test -- market-data.service.test.ts market-data.repository.test.ts market-data.scheduler.test.ts --runInBand
npm.cmd run build
rg -n "target price|price target|profit target|reward/risk|R:R|buy now|sell now|must buy|must sell|guaranteed|financial advice" backend/src/modules/market-data-foundation backend/tests/modules/market-data-foundation
git diff --check
```

Results:

- Focused backend tests passed: 3 suites, 196 tests.
- Backend build passed.
- Phrase scan found no matches.
- `git diff --check` passed with normal CRLF warnings only.

## Evidence Notes

- Memory utilization check completed before heavy commands (`56.45%` used).
- No Prisma/schema/route/shared utility/package/frontend/downstream/provider-credential/live-provider changes were made.
