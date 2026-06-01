# Market Data Foundation Refactor: NSE/BSE Bhavcopy First

## Summary

Market Data Foundation must use official/free exchange files as the automated market-data source for the local-first NSE/BSE reset.

The approved automated and operator-supported sources are:

- NSE CM UDiFF Bhavcopy as the primary daily stock candle source.
- BSE BhavCopy as backup/fill only when the NSE candle is missing and identity matching is safe.
- NSE delivery data as enrichment.
- NSE F&O UDiFF as enrichment for eligible underlyings and index/derivatives context.
- Manual verified fundamentals only.

No active automated runtime path may use Yahoo Finance, yfinance, Angel One, broker APIs, Screener scraping, or provider fallback logic.

## Operating Rules

- Import and downstream market-data workflows are limited to 1D and above.
- Intraday candles are out of scope.
- Missing exchange files must not trigger provider fallback.
- Manual and scheduled runs must use the same backend pipeline path and persistence rules.
- Trader pages must only read persisted database rows.
- Trader pages must not trigger import, sync, repair, backfill, generation, evaluation, or calibration during render.

## Source Policy

Approved:

- NSE CM UDiFF Bhavcopy
- BSE BhavCopy fill-only backup
- NSE delivery data
- NSE F&O UDiFF
- NSE/BSE official filings
- Manual verified fundamentals

Forbidden:

- Yahoo Finance
- yfinance
- Angel One
- broker APIs
- Screener scraping
- provider fallback

## Required Market Data Workflows

- Run daily NSE/BSE exchange pipeline.
- Run historical exchange candle backfill.
- Import manual verified fundamentals.
- Retry failed stage/run.
- Show SourceFileImport evidence.
- Show latest data-through date and source freshness.

## Required Persistence

The refactor must preserve and use the approved persistence concepts already present in the reset plan:

- SourceFileImport
- InstrumentExchangeIdentity
- PriceTick.sourceFileImportId
- LatestPrice rebuilt from persisted exchange candles
- PipelineRun / PipelineStageRun ledger

## Required Validation

- NSE CM import saves PriceTick rows.
- Rerun is duplicate-safe.
- LatestPrice updates.
- BSE fills only missing NSE rows.
- Index/sector rows import.
- Delivery snapshots import.
- F&O enrichment imports without fake futures rows.
- Historical backfill resumes/skips already completed dates.
- Manual fundamentals import persists verified source evidence.
- Trader pages read persisted data only.
- No active runtime path calls Yahoo, yfinance, Angel One, or broker APIs.

## Implementation Slices

1. Provider Runtime Removal Contract
2. Operator UI Control Replacement
3. Backend Command Coverage
4. Cleanup Provider Package And Dead Code
5. Live Local Validation

This document is aligned with `docs/nse-bse-market-data-reset-plan.md` and should be treated as a concise design reference for the NSE/BSE-only Market Data Foundation reset.
