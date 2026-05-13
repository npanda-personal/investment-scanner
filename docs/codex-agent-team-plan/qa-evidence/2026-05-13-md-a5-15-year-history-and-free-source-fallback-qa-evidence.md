# MD-A5 QA Evidence - 15-Year History And Free-Source Fallback

Date: 2026-05-13
Mode: QA Verification Mode
Owner: QA Agent
Work item: MD-A5 - 15-Year History And Free-Source Fallback

## Scope

QA validated the MD-A5 implementation mechanics for required 15-year/listing-date historical coverage, free official NSE fallback parsing/integration, source provenance preservation, UI evidence, and downstream fail-closed behavior.

Full live all-catalog history population was not run in this QA pass. The accepted implementation is bounded and resumable; the local DB may still require repeated authorized repair batches to drain remaining `IN / STOCK` history gaps.

## Automated Evidence

| Evidence item | Status | Command/request | Key fields observed | Gaps or risk |
| --- | --- | --- | --- | --- |
| Backend focused tests | PASS | `npm.cmd test -- --runTestsByPath tests/modules/market-data-foundation/market-data.service.test.ts tests/modules/market-data-foundation/market-data.repository.test.ts tests/modules/market-data-foundation/market-data.exchange-eod-adapter.test.ts --runInBand` | 3 suites, 146 tests passed. | None for focused scope. |
| Backend build | PASS | `npm.cmd run build` in `backend` | TypeScript compile passed. | None. |
| Frontend build | PASS | `npm.cmd run build` in `frontend` | TypeScript/Vite build passed. | Existing chunk-size warning only. |
| Frontend UI smoke | PASS | `npm.cmd run test:ui -- market-data-foundation.spec.ts --workers=1` | 8/8 Market Data Foundation UI tests passed. | Required escalation because Playwright worker spawn is blocked by sandbox. |
| Diff hygiene | PASS | `git diff --check` | No whitespace errors. | Existing LF-to-CRLF warnings only. |

## Requirement Checks

| Check | Status | Evidence |
| --- | --- | --- |
| Old active stocks require 15-year daily OHLCV through latest completed EOD. | PASS | Required-history diagnostics compute 15-year start and require oldest date, latest completed EOD, and minimum expected trading-bar coverage. |
| Younger active stocks use listing date when listing date is newer than the 15-year target. | PASS | Focused service test verifies deep backfill starts at listing date for a newer listing. |
| Missing listing date does not reduce required window. | PASS | Missing listing date uses the 15-year target and increments listing-date coverage diagnostics. |
| Sparse rows cannot masquerade as complete history. | PASS | Added test rejects sparse 15-year boundary rows even when first/latest dates span the target. |
| Yahoo zero-row history does not become clean unsupported in backfill. | PASS | Backfill keeps fallback-required treatment and now attempts bounded official NSE fallback when enabled. |
| Free official/public fallback exists without paid dependency. | PASS | Added NSE security bhavdata adapter/parser and bounded fallback integration; no paid provider, broker API, hosted queue, or commercial free-tier dependency added. |
| Row source provenance is preserved. | PASS | `HistoricalPrice.source` is stored into `PriceTick.source`; repository test verifies fallback source updates. |
| Trusted review remains fail-closed for incomplete history. | PASS | Trusted review excludes provider-supported stocks whose required history coverage is incomplete. |
| UI exposes the hard coverage gate. | PASS | UI shows 15-year/listing-date counts, fallback-required counts, sample coverage rows, and trusted-review exclusion count. |

## Residual Risks

- Full active-universe historical data population was not performed during QA. Remaining gaps must be drained with repeated bounded repair runs.
- Automatic BSE fallback parsing exists in the adapter, but no stable automatic BSE download URL is enabled by default; BSE rows may require configured/manual official public files.
- NSE fallback uses bounded daily CSV archive attempts. Large historical catch-up still needs operational batching and should not run as one unbounded UI request.

## QA Decision

PASS for MD-A5 implementation scope. The code now enforces the 15-year/listing-date standard and provides free official NSE fallback mechanics. Product data completion remains an operational drain activity, not a claim that every local DB row is already fully populated.
