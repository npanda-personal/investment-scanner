# TEAM-05 Outbox - CF-W3-MDPIPE-01A

Date: 2026-05-25
Team: TEAM-05 (Market Data / Data Quality)
Work item: `CF-W3-MDPIPE-01A-MDF-OFFICIAL-EOD`
State: Implemented, reworked after review, and accepted through QA/review/architecture gates

## Completed

- Added scheduled `IN/STOCK` official NSE latest-completed EOD bulk attempt in Market Data Foundation before per-symbol provider ingestion.
- Added alias matching against canonical symbol, provider symbol, source symbol, and display symbol for stale sync tasks.
- Stored matched official rows under canonical local symbols using existing `storeHistorical()` idempotent semantics.
- Added structured scheduled summary evidence for official bulk source/fingerprint/row counts/match counts/fallback reason.
- Preserved per-symbol provider fallback when official path is disabled, unavailable, or partial/no-match.
- Updated MDF docs and focused tests for new behavior.
- Completed Team 10 review rework: BSE, `.BO`, non-NSE, and ambiguous tasks cannot official-match NSE rows through bare-symbol aliases.

## Files Changed

- `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.repository.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.types.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.md`
- `backend/tests/modules/market-data-foundation/market-data.service.test.ts`
- `backend/tests/modules/market-data-foundation/market-data.repository.test.ts`

## Validation Evidence

- Memory check before heavy commands: `MemoryUsedPercent=56.45`
- `cd backend && npm.cmd test -- market-data.service.test.ts market-data.repository.test.ts market-data.scheduler.test.ts --runInBand`
  - Initial result: 3/3 suites passed, 195/195 tests passed.
  - Rerun after cross-exchange rework: 3/3 suites passed, 196/196 tests passed.
- `cd backend && npm.cmd run build`
  - Result: passed (`tsc`).
- QA copy drift scan:
  - `rg -n "target price|price target|profit target|reward/risk|R:R|buy now|sell now|must buy|must sell|guaranteed|financial advice" backend/src/modules/market-data-foundation backend/tests/modules/market-data-foundation`
  - Result: no matches.

## Residual Risks

- Official bulk path currently targets NSE security bhavdata only for scheduled `IN/STOCK`; BSE official bulk remains unsupported for automated scheduled latest-candle use.
- Summary evidence is added to scheduled sync summary JSON but no downstream consumer is wired in this slice (by design).
- Per-instrument sync-state unification remains a later pipeline-ledger/state-unification item.

## Next Gate

- Scoped local commit by Team 00.
