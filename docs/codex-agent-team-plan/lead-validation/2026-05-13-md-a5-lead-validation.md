# MD-A5 Lead Validation

Date: 2026-05-13
Mode: Lead Validation Mode
Owner: Senior Fullstack Lead / Orchestrator
Work item: MD-A5 - 15-Year History And Free-Source Fallback

## Validation Summary

Lead validation confirms the implementation follows the MD-A5 architecture contract for the accepted scope:

- Required history diagnostics now enforce 15-year/listing-date coverage using start date, latest completed EOD, and minimum expected daily-bar coverage.
- Backfill candidates remain queued when 252-bar readiness passes but required history is incomplete.
- Trusted review excludes provider-supported stocks that do not satisfy the required history window.
- Yahoo zero/shallow cases can use bounded official NSE EOD fallback without introducing paid providers.
- `PriceTick.source` preserves the actual row source.
- UI exposes coverage gaps and fallback-required evidence.

## Evidence Reviewed

- Backend focused tests: 3 suites, 146 tests passed.
- Backend build: passed.
- Frontend build: passed.
- Focused Market Data UI smoke: 8 tests passed.
- `git diff --check`: passed with line-ending warnings only.

## Rejection Review

No rejection. Residual operational work is clearly documented: the full local universe still needs repeated bounded repair batches to populate all missing historical data.

## Lead Decision

Approved for Architect signoff.
