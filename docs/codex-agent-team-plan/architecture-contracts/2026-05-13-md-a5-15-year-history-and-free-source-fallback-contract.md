# MD-A5 15-Year History And Free-Source Fallback Architecture Contract

Date: 2026-05-13
Mode: Architecture Planning Mode
Owner: MD-A5 Solution Architect Agent
Lane/module: Lane 1, `market-data-foundation`
Work item: MD-A5 - 15-Year History And Free-Source Fallback
Owned artifact: `docs/codex-agent-team-plan/architecture-contracts/2026-05-13-md-a5-15-year-history-and-free-source-fallback-contract.md`

## 1. Architecture Verdict And Root Cause

Verdict: Market Data Foundation must treat historical daily OHLCV coverage as a date-window contract, not a bar-count convenience or a Yahoo-only provider result.

MD-A3 made the existing `BACKFILL_PRICES` lane deep by default for shallow provider-supported rows, and MD-A4 hardens provider validation so Yahoo insufficiency is not silently accepted as final. MD-A5 is the next required architecture step because the application still lacks a durable contract that proves each active `IN / STOCK` instrument has daily OHLCV from the required start date through the latest completed EOD, with source provenance and an approved free fallback when Yahoo cannot supply the full window.

Root cause:

- `backfillPrices` currently computes a 15-year deep start, but it does not make the listing-date-aware window an explicit per-instrument contract.
- `classifyInstrumentUniverseReadiness` relies on 120/200/252-bar thresholds and recent quality stats. Those are necessary for Lite and technical workflows, but they do not prove 15-year or listing-date-to-latest-completed-EOD coverage.
- `PriceTick.source` is currently written as `yahoo` by the repository storage path. That loses source-level truth once rows may come from Yahoo, NSE, BSE, or manual official-file imports.
- Yahoo chart success for a subset of dates can make a row look repaired while older history is still missing.
- Yahoo chart failure, zero rows, or shallow history is not enough to classify the stock as unrecoverable. For Indian equities, official/public NSE/BSE EOD files are the approved no-cost fallback where practical.
- Missing listing date is currently a context gap, but it also changes the required history start. MD-A5 must compute the 15-year target when listing date is missing and keep the listing-date gap visible instead of blocking all price repair.
- Exchange official EOD files are date-batched, while Yahoo fetches are symbol-batched. A robust local implementation must avoid per-symbol per-day downloads and must cache official daily files locally.

Architecture decision: extend the existing bounded Market Data repair workflow with a source-aware historical coverage contract and official/free exchange-file fallback. Do not add paid providers, broker APIs, hosted queues, hosted databases, paid observability, or downstream gate relaxation.

Official/public source direction verified for planning:

- NSE official reports page includes `CM-UDiFF Common Bhavcopy Final (zip)` and notes older `CM - Bhavcopy(csv)` / `CM - Common Bhavcopy(csv)` reports are discontinued from July 08, 2024 in favor of UDiFF.
- BSE official Bhav Copy page publishes `Equity (UDiFF)` and historical Bhav Copy options, and notes older standardized/equity formats were discontinued from July 08, 2024.

## 2. Required History Window Contract

For each active, non-delisted scoped instrument where `region=IN` and `assetType=STOCK`, the required daily OHLCV window is:

```text
requiredHistoryEndDate = latestCompletedTradingDateForRegion("IN")
requiredHistoryStartDate =
  max(stock.ipoDate/listingDate, requiredHistoryEndDate - 15 years)
```

If listing date is missing:

- Use `requiredHistoryStartDate = requiredHistoryEndDate - 15 years`.
- Set `listingDateStatus='MISSING_USED_15_YEAR_TARGET'`.
- Queue listing-date inference/repair using free sources only.
- Surface the listing-date gap in repair-plan, health, row detail, and provenance diagnostics.
- Do not mark the row as complete from listing date. The only accepted claim is that the 15-year target was attempted.
- Do not allow downstream signals, Today Review, Strategy Decision, Signal Quality, or Trade Plans to treat the instrument as deeply coverage-sufficient until either a repaired listing date proves the listing-date window or the 15-year target is complete and the listing-date gap is still disclosed as a context/coverage limitation.

If listing date is present and later than the 15-year target:

- Fetch and validate from listing date through latest completed EOD.
- The row can be deeply history-ready with fewer than 15 calendar years only when `listingDateBasis='CATALOG_OR_EXCHANGE_MASTER'` or better evidence exists.

If listing date is present and earlier than or equal to the 15-year target:

- Fetch and validate from the 15-year target through latest completed EOD.
- Older-than-15-year rows are not required for MD-A5 acceptance.

The contract applies to daily EOD OHLCV bars only:

- Required fields: date, open, high, low, close, volume.
- Adjusted close is desirable when supplied by a source; exchange bhavcopy rows usually must store `adjustedClose=null` and surface close-fallback/adjustment limitations.
- Latest completed EOD is mandatory. In-progress current-day candles must not be fetched or used for EOD review readiness.
- Calendar uncertainty remains a hard blocker for declaring coverage complete.

Coverage status must be per instrument:

- `FULL_WINDOW_COMPLETE`: required window has latest completed EOD, acceptable trading-day coverage, positive recent volume, and no unresolved hard data-quality issue.
- `PARTIAL_WINDOW_GAPS`: some rows exist, but required trading dates or acceptable gap tolerance fail.
- `SOURCE_FALLBACK_PENDING`: Yahoo is insufficient and official/free exchange fallback has not completed.
- `SOURCE_UNAVAILABLE`: approved free source could not supply the date range after bounded attempts; remains visible, not trusted.
- `LISTING_DATE_GAP`: listing date missing or conflicting; 15-year target may be attempted but listing-date certainty is unresolved.
- `MARKET_CALENDAR_UNCERTAIN`: expected trading sessions cannot be determined.

Existing 120/200/252-bar readiness remains valid for Lite/technical gates, but it is not enough to satisfy MD-A5 deep-history readiness. MD-A5 adds a stricter historical coverage dimension alongside current trusted-universe gates.

### Listing-Date Inference And Repair

Listing date is part of the history-window contract, not optional display metadata. MD-A5 must define and implement a free-source-only repair path before accepting unknown listing dates as permanent.

Allowed listing-date sources, in priority order:

1. Existing local `Stock.ipoDate` when it was imported from a known exchange/catalog source.
2. Official/public NSE security master/catalog files, including the current NSE equity/security list where it carries listing-date fields.
3. Official/public BSE security master/catalog/bhavcopy-related files when they carry listing-date or first-listed evidence.
4. Operator-supplied local CSV copied from official NSE/BSE/public exchange files, with source name, file date, and content fingerprint.
5. Inference from earliest official exchange EOD row only as a fallback evidence class, not as a definitive IPO/listing date.

Rejected listing-date sources:

- Paid providers.
- Paid exchange products.
- Broker APIs.
- Commercial provider free tiers that depend on paid upgrade paths.
- Unofficial mirrors or scraped third-party profile pages.

Listing-date repair states:

- `LISTING_DATE_VERIFIED`: date came from official exchange/catalog source or existing trusted local source.
- `LISTING_DATE_REPAIRED_FROM_OFFICIAL_SOURCE`: missing local date was filled from NSE/BSE official/public data.
- `LISTING_DATE_INFERRED_FROM_FIRST_OFFICIAL_EOD`: no master listing date was available, but the earliest official exchange EOD row is known. This narrows the history target but must remain disclosed as inferred.
- `LISTING_DATE_MISSING_USED_15_YEAR_TARGET`: no free official/public source supplied listing date yet; 15-year target is used.
- `LISTING_DATE_CONFLICT`: free sources disagree or conflict with stored metadata; manual official-source review required.

If listing date is inferred from first official EOD:

- Store/report `listingDateBasis='FIRST_OFFICIAL_EOD_ROW'`.
- Keep an inference warning in row detail and repair evidence.
- Do not overwrite an existing official listing date with the inferred value.
- Use the inferred date only to avoid demanding impossible pre-listing prices after the fallback source proves no earlier official rows exist for the symbol.

Listing-date repair must be bounded and source-fingerprinted like catalog identity repair. It must update only the matched stock id and must reject ambiguous NSE/BSE symbol collisions.

## 3. Free-Source Fallback Strategy

### Source Priority

Primary source order for `IN / STOCK` daily EOD:

1. Local stored `PriceTick` rows with acceptable provenance and validation.
2. Yahoo daily chart, because it is already integrated and efficient for symbol-window fetches.
3. Official/public exchange EOD files:
   - NSE primary for NSE-listed symbols: `CM-UDiFF Common Bhavcopy Final (zip)` from `https://www.nseindia.com/all-reports`.
   - BSE primary for BSE-listed symbols: `Equity (UDiFF)` / Historical Bhav Copy from `https://www.bseindia.com/markets/MarketInfo/BhavCopy.aspx` and related BSE bhavcopy pages.
   - Legacy official NSE/BSE historical formats may be used only when they are still available from official/public exchange endpoints or operator-supplied files downloaded from those official pages.
4. Manual local import of official NSE/BSE daily files when automated download is unavailable, rate-limited, blocked by exchange controls, or unstable.

Rejected sources:

- Paid market-data providers.
- Paid exchange data products.
- Broker APIs or broker account downloads.
- Commercial provider free tiers unless a future PO/Architect approval records no-cost sustainability and replaceability.
- Scraping arbitrary non-official mirrors.

### Fallback Trigger

Fallback must be attempted or explicitly queued when any of these occur:

- Yahoo returns zero usable rows for a supported or probably valid instrument.
- Yahoo returns a shallow range that does not cover `requiredHistoryStartDate` through `requiredHistoryEndDate`.
- Yahoo omits latest completed EOD while exchange files for that date should exist.
- Yahoo is rate-limited, times out, or errors repeatedly for an otherwise valid exchange-listed stock.
- Yahoo symbol mapping is uncertain but exchange/source symbol and exchange identity are available.

Do not convert these cases to clean `UNSUPPORTED` unless MD-A4 provider identity rules prove the symbol cannot be mapped and official fallback cannot apply.

### Exchange File Fetch Model

Official exchange EOD fallback must be date-batched, not symbol-day-batched:

- Resolve the missing date ranges across a bounded candidate batch.
- Group requests by source, exchange, and trading date.
- Download or read each official date file once into a local cache.
- Parse all relevant symbols for the current bounded batch from that date file.
- Reuse cached files for later symbols/reruns using a content fingerprint.
- Never issue one HTTP request per symbol per date.

Local cache requirements:

- Store raw downloaded files under a controlled workspace/cache directory, or store only normalized parsed rows plus content hashes if raw retention is disabled.
- Cache key includes source, exchange, trading date, file format, source URL identity, and content hash.
- Cache must distinguish `DOWNLOAD_FAILED`, `NOT_PUBLISHED_YET`, `NO_TRADING_SESSION`, `PARSE_FAILED`, `NO_SYMBOL_ROWS`, and `READY`.
- Retention must be configurable and local-only. No hosted storage.

Parsing requirements:

- Normalize dates to UTC midnight.
- Map source symbol/security code to canonical `Stock.symbol` using exchange-aware identity: provider symbol, source symbol, exchange, ISIN when available.
- Reject ambiguous NSE/BSE collisions as manual-required; do not update the wrong row.
- Keep OHLC values positive and internally consistent.
- Keep volume null only when source genuinely lacks volume; for trusted review, missing/zero recent volume remains a blocker.
- Deduplicate same source/date/symbol rows before storage.

Historical practicality:

- UDiFF is the target current format for NSE/BSE because both exchanges moved away from older formats around July 08, 2024.
- For dates before available UDiFF coverage, implementation may use official legacy bhavcopy archives if available, with a separate parser and `formatVersion`.
- If an older official date file cannot be downloaded automatically, the system must expose a manual official-file import lane instead of requiring a paid provider or marking coverage complete.

## 4. Data Provenance And Diagnostics Fields

MD-A5 must add source-aware diagnostics to API responses and persisted audit state. Implementation may use existing repair attempt/state JSON first; schema changes are allowed only if the backend owner proves existing fields cannot support durable evidence.

Required per-instrument coverage fields:

- `requiredHistoryStartDate`
- `requiredHistoryEndDate`
- `listingDate`
- `listingDateStatus`: `PRESENT_USED_LISTING_DATE`, `PRESENT_OLDER_THAN_15Y_USED_15Y`, `MISSING_USED_15_YEAR_TARGET`, `INVALID`, `CONFLICTING`
- `historyCoverageStatus`
- `oldestStoredEodDate`
- `latestStoredEodDate`
- `storedRowsInRequiredWindow`
- `expectedTradingSessionsInRequiredWindow`
- `missingTradingSessionsCount`
- `maxGapTradingDays`
- `coveragePercent`
- `latestCompletedEodPresent`
- `recentVolumeCoveragePercent`
- `adjustedCloseCoveragePercent`
- `usesAdjustedCloseFallback`
- `coverageSourceSummary`

Required source/provenance fields for repair summaries and attempts:

- `primarySourceAttempted`: `YAHOO`
- `fallbackSourcesAttempted`: array such as `NSE_CM_UDIFF_BHAVCOPY`, `BSE_EQUITY_UDIFF_BHAVCOPY`, `NSE_LEGACY_BHAVCOPY`, `BSE_LEGACY_BHAVCOPY`, `MANUAL_OFFICIAL_FILE`
- `selectedSourceByDateRange`: compact list of `{ source, exchange, startDate, endDate, rowsUsed }`
- `sourceFallbackReason`: `YAHOO_ZERO_ROWS`, `YAHOO_SHALLOW_HISTORY`, `YAHOO_MISSING_LATEST_EOD`, `YAHOO_TIMEOUT`, `YAHOO_RATE_LIMITED`, `PROVIDER_SYMBOL_UNCERTAIN`, `MANUAL_OFFICIAL_FILE_REQUIRED`
- `sourceDownloadStatusCounts`
- `sourceParseStatusCounts`
- `sourceFilesRead`
- `sourceFilesDownloaded`
- `sourceFilesCacheHits`
- `sourceFilesFailed`
- `sourceRowsRead`
- `sourceRowsMatched`
- `sourceRowsUnmatched`
- `sourceRowsRejected`
- `sourceFingerprintSamples`: capped list with source, trading date, content hash, row count, and format version
- `manualOfficialFileRequiredCount`
- `officialSourceUnavailableCount`

Required row/source metadata when storing prices:

- Preserve `PriceTick.source` as the real row source: `yahoo`, `nse_cm_udiff_bhavcopy`, `bse_equity_udiff_bhavcopy`, `nse_legacy_bhavcopy`, `bse_legacy_bhavcopy`, or `manual_official_exchange_file`.
- If a future schema is approved, add row-level `sourceFileDate`, `sourceFileSha256`, `sourceFileFormat`, `sourceDownloadUrlName`, and `sourceIngestionRunId`. Until then, these fields must be present in repair attempts/run summaries and source cache manifests.
- Latest price rows derived from price ticks must not erase the underlying source evidence.

Required repair-plan/health counts:

- `historyWindowComplete`
- `historyWindowIncomplete`
- `listingDateMissingUsing15YearTarget`
- `yahooHistoryInsufficient`
- `officialFallbackPending`
- `officialFallbackSucceeded`
- `officialFallbackFailed`
- `manualOfficialFileRequired`
- `historyCoverageSourceUnavailable`
- `historyCoverageCalendarUncertain`
- `listingDateRepairNeeded`
- `listingDateVerified`
- `listingDateInferredFromFirstOfficialEod`
- `listingDateConflict`

Required sample results, capped to 20:

```json
{
  "symbol": "ABC.NS",
  "exchange": "NSE",
  "requiredHistoryStartDate": "2011-05-12",
  "requiredHistoryEndDate": "2026-05-12",
  "listingDate": null,
  "listingDateStatus": "MISSING_USED_15_YEAR_TARGET",
  "historyCoverageStatus": "SOURCE_FALLBACK_PENDING",
  "primarySourceAttempted": "YAHOO",
  "fallbackSourcesAttempted": ["NSE_CM_UDIFF_BHAVCOPY"],
  "sourceFallbackReason": "YAHOO_SHALLOW_HISTORY",
  "storedRowsInRequiredWindow": 1830,
  "expectedTradingSessionsInRequiredWindow": 3710,
  "missingTradingSessionsCount": 1880,
  "coveragePercent": 49.3,
  "latestCompletedEodPresent": true,
  "warnings": ["Listing date missing; 15-year target used."]
}
```

Warnings and sample arrays must stay capped; machine-readable counts carry totals.

## 5. API And Workflow Contract

Canonical operator action remains the existing price lane:

`POST /api/v1/market-data/prices/backfill`

Request extension:

```json
{
  "region": "IN",
  "assetType": "STOCK",
  "batchSize": 25,
  "force": true,
  "policy": "FULL_REQUIRED_WINDOW_WITH_FREE_FALLBACK",
  "sourcePolicy": "YAHOO_THEN_OFFICIAL_EXCHANGE",
  "allowManualOfficialFileImport": true
}
```

Field rules:

- `policy='FULL_REQUIRED_WINDOW_WITH_FREE_FALLBACK'` is the MD-A5 behavior. Existing `AUTO_DEEP_FOR_SHALLOW` remains compatible but does not satisfy MD-A5 acceptance by itself.
- `sourcePolicy` defaults to `YAHOO_THEN_OFFICIAL_EXCHANGE` for `IN / STOCK`.
- `batchSize` default for MD-A5 should be lower than MD-A3 if exchange fallback is enabled. Recommended default: `25`; hard max: `50` while official daily-file fallback is active.
- `force` may bypass cooldown but cannot bypass latest-completed-EOD cap, source provenance, fallback classification, or batch caps.
- `fullReload=true` means reattempt the required window. It must not delete existing rows unless a separate destructive scrub is explicitly approved.

Response extends `MarketDataRepairSummary` with the provenance fields listed above and these additional fields:

- `historyWindowAttempted`
- `historyWindowComplete`
- `historyWindowPartial`
- `historyWindowFailed`
- `listingDateMissingUsing15YearTarget`
- `yahooRowsReceived`
- `yahooRowsUsed`
- `fallbackRowsReceived`
- `fallbackRowsUsed`
- `priceRowsBySource`
- `remainingHistoryWindowCandidates`
- `sampleCoverageResults`

Repair-run integration:

- Existing `BACKFILL_PRICES` remains the action, but the action result must expose the selected history policy and source policy.
- Drain mode may execute repeated bounded price batches, but must stop on max batch count, repeated source download failure, calendar uncertainty, no data movement, or manual official-file requirement.
- `COMPLETED` for a requested MD-A5 history run means no selected candidate remains unfinished for the requested policy. It does not mean full-catalog signoff passes unless signoff also says `PASS`.

New optional diagnostic endpoint may be added if needed:

- `GET /api/v1/market-data/history-coverage?region=IN&assetType=STOCK`
- Purpose: read-only coverage distribution and representative gaps.
- It must be bounded/paginated and must not fetch providers.
- It is optional; the required evidence can be added to existing health, repair-plan, and repair summaries.

Manual official file import may be added as a bounded repair sub-lane if automatic official downloads are not practical:

- It must accept only user-supplied local CSV/ZIP content or a configured official source, not arbitrary runtime URLs.
- It must fingerprint content and parse with source-specific parsers.
- It must update only matched scoped instruments and report unmatched/ambiguous rows.

## 6. Performance, Batching, And Progress Constraints

MD-A5 is potentially heavier than MD-A3 because a 15-year exchange fallback can span thousands of trading-date files. The architecture must avoid any full-window all-symbol synchronous job.

Required constraints:

- Direct `prices/backfill` with official fallback default `batchSize=25`, hard max `50`.
- Yahoo symbol-window fetches remain sequential by default; hard max provider concurrency `2` only with a shared backend limiter.
- Official exchange file downloads are date-batched and cached. No symbol-day request loops.
- Official source downloads per request must be capped. Recommended defaults:
  - max new exchange files downloaded per direct request: `40`
  - max source files parsed per direct request including cache hits: `250`
  - max wall-clock target for normal UI direct batch: under `60` seconds; longer runs must use operational repair-run/status patterns.
- Repair-run `maxBatchesPerAction` remains bounded. Recommended default for MD-A5 history mode: `5`; hard max `25` unless Orchestrator explicitly authorizes a local maintenance run.
- Source file download timeout default `15 seconds`, hard max `30 seconds`.
- Source file max size follows catalog download safety defaults unless a specific exchange file requires a documented higher cap.
- Local cache lookup must happen before download.
- Provider/source warnings and failed-date samples must be capped.
- Progress must report:
  - candidate symbols processed,
  - required date ranges evaluated,
  - source files downloaded/cache-hit/failed,
  - rows inserted/updated/no-op,
  - rows by source,
  - remaining candidates,
  - fallback/manual-required blockers.
- UI must not run frontend loops over dates, symbols, or source files. One click sends one bounded request or starts one bounded/status-tracked repair run.
- Do not fetch in-progress current-day candles or same-day incomplete official files. Use latest completed EOD only.

No-progress detection:

- A batch has progress if any price row is inserted/updated/no-op-confirmed in the required window, any source file is successfully cached and parsed for a missing date, or a candidate receives a durable terminal classification such as `MANUAL_OFFICIAL_FILE_REQUIRED`.
- Stop as `PARTIAL_BLOCKED` when the same candidates remain and there are only zero-row source results, failed downloads, parse failures, calendar uncertainty, or ambiguous identity.

## 7. Single-Writer Implementation Scopes

Packet MD-A5-BE-1: Required history-window computation and coverage diagnostics.

Owner: backend market-data price coverage developer.
Write scope:

- `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.repository.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.types.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.universe.ts`
- Backend tests under `backend/tests/modules/market-data-foundation/`

Expected output:

- Per-instrument required start/end dates use listing date when available and 15-year target when listing date is missing.
- Health, repair plan, and price backfill summaries expose history coverage diagnostics and listing-date gap counts.
- Existing 120/200/252 readiness remains compatible.

Forbidden:

- Provider fallback implementation.
- Frontend files.
- Paid providers/services.
- Destructive deletion/rewrite of historical rows.

Packet MD-A5-BE-2: Official exchange EOD source adapters and local cache.

Owner: backend source-adapter developer after MD-A5-BE-1 field names stabilize.
Write scope:

- New source adapter/cache files under `backend/src/modules/market-data-foundation/`
- `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.repository.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.types.ts`
- Focused backend tests

Expected output:

- NSE/BSE official EOD parsers normalize UDiFF/current formats and support official legacy/manual file variants where implemented.
- Source cache fingerprints official files and prevents repeated downloads.
- Backfill uses Yahoo first, then official exchange fallback for missing required-window dates.
- Storage preserves row source.

Forbidden:

- Arbitrary URL fetch from user input.
- Paid/free-tier commercial APIs.
- Broker APIs.
- Cross-exchange ambiguous matching.
- Frontend files.

Packet MD-A5-BE-3: Repair-run integration and no-progress/provenance persistence.

Owner: backend repair-run developer after BE-1/BE-2.
Write scope:

- `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.repository.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.types.ts`
- Repair-run tests

Expected output:

- `BACKFILL_PRICES` action records MD-A5 policy, source policy, before/after coverage snapshots, source counts, and fallback blockers.
- Latest repair-run evidence includes source fingerprints, manual-required official files, and remaining history-window candidates.

Packet MD-A5-FE-1: Market Data UI evidence for full-window coverage and fallback.

Owner: frontend market-data owner after backend fields stabilize.
Write scope:

- `frontend/src/features/market-data-foundation/types.ts`
- `frontend/src/features/market-data-foundation/api/marketDataFoundationService.ts`
- `frontend/src/features/market-data-foundation/components/MarketDataStatusPanel.tsx`
- `frontend/src/features/market-data-foundation/components/MarketDataFoundationPage.tsx`
- `frontend/tests/ui/market-data-foundation.spec.ts`

Expected output:

- Existing repair workbench shows full-window incomplete, listing-date missing using 15-year target, Yahoo insufficient, official fallback pending/succeeded/failed, and manual official-file required counts.
- Listing-date repair/inference states are visible separately from price-source fallback states.
- Batch result renders source/provenance counts without claiming trust when signoff still fails.
- No new unbounded "download all history" button.

Forbidden:

- Backend files.
- New broad screen unless Orchestrator requests it.
- Frontend-driven provider/source loops.

Packet MD-A5-QA-1: Validation evidence.

Owner: QA/Orchestrator assigned agent after implementation.
Write scope:

- Assigned QA evidence document under `docs/codex-agent-team-plan/qa-evidence/`

Forbidden:

- Production code.
- Full 15-year all-catalog live drain without explicit Orchestrator authorization.

## 8. Validation Plan

Backend unit/service tests:

- Old listing with `ipoDate` earlier than 15-year target uses `latestCompletedEod - 15 years`.
- Younger listing uses listing date as required start.
- Missing listing date uses 15-year target and increments listing-date gap diagnostics.
- Missing listing date queues free-source listing-date repair and does not silently become complete metadata.
- Official NSE/BSE catalog row repairs listing date and records source/basis/fingerprint.
- First official EOD inference records `LISTING_DATE_INFERRED_FROM_FIRST_OFFICIAL_EOD` and keeps a warning.
- Conflicting listing dates become manual-required conflict diagnostics and do not overwrite the existing date.
- Invalid/conflicting listing date is surfaced as `LISTING_DATE_GAP` or `CONFLICTING`, not hidden.
- Latest completed EOD cap is used as required end date; in-progress current day is never requested.
- Calendar uncertainty blocks completion and increments `historyCoverageCalendarUncertain`.
- A stored row set with 252 bars but missing most of the 15-year window is not `FULL_WINDOW_COMPLETE`.
- Stored rows covering the full required window with acceptable gaps become `FULL_WINDOW_COMPLETE`.
- Yahoo full-window success stores source as `yahoo` and reports no fallback.
- Yahoo zero rows triggers official fallback pending/attempted, not clean unsupported.
- Yahoo shallow history triggers official fallback for missing date ranges.
- Yahoo missing latest completed EOD triggers official fallback for latest completed date.
- NSE UDiFF parser maps OHLCV rows, rejects malformed values, and preserves source.
- BSE UDiFF parser maps OHLCV rows, rejects malformed values, and preserves source.
- Legacy official-format parser tests are required for each legacy format implemented.
- Official source cache hit avoids a second download for the same source/date/content identity.
- Ambiguous NSE/BSE symbol collision is manual-required and does not write prices to the wrong stock.
- Exchange fallback writes only matched scoped instruments.
- Manual official-file import fingerprints content and rejects unsupported formats.
- Repair summary reports source files downloaded/cache-hit/failed, rows by source, fallback reasons, and sample coverage results.
- Drain no-progress stops when source downloads fail or no candidate receives data/classification progress.

Repository/storage tests:

- `PriceTick.source` reflects actual source for Yahoo, NSE, BSE, and manual official-file rows.
- Existing Yahoo rows are not destructively overwritten by lower-priority exchange rows unless the same daily candle changed and the source policy allows update.
- Same source/date/symbol duplicates are collapsed before storage.
- LatestPrice updates preserve timestamp correctness without erasing source diagnostics in repair evidence.
- Coverage queries compute oldest/latest date, expected sessions, missing sessions, max gap, coverage percent, and recent volume coverage.

API tests:

- `POST /api/v1/market-data/prices/backfill` accepts `policy='FULL_REQUIRED_WINDOW_WITH_FREE_FALLBACK'`.
- Unsafe batch sizes are clamped or rejected.
- Response includes required history-window, listing-date, source, fallback, row, and remaining-candidate fields.
- `repair-plan`, `universe/health`, `review-readiness-summary`, and latest repair-run expose the new counts without breaking existing fields.
- Optional `history-coverage` endpoint, if added, is read-only and paginated.

Frontend/UI tests:

- Backfill action sends scoped bounded payload and does not expose an unbounded all-history control.
- Workbench renders full-window incomplete, Yahoo insufficient, official fallback pending/succeeded/failed, manual official-file required, and listing-date gap counts.
- Result with fallback failures or `hasMore=true` renders warning/partial treatment.
- Completed HTTP response with failed signoff remains blocked/warning.
- Row detail shows required start/end, listing-date status, source summary, and coverage status when fields exist.

Bounded live/local evidence:

- Capture before/after `repair-plan`, `universe/health`, and `review-readiness-summary` for `region=IN&assetType=STOCK`.
- Run one tiny MD-A5 history backfill batch with `batchSize <= 3`.
- Capture whether Yahoo was enough, official fallback was attempted, or manual official-file import was required.
- Capture source/provenance counts and sample coverage results.
- Capture at least one instrument with missing listing date showing 15-year target plus listing-date gap.
- Capture listing-date repair/inference evidence from a free official/public source or record `LISTING_DATE_MISSING_USED_15_YEAR_TARGET` as the remaining blocker.
- Capture that downstream readiness remains fail-closed for instruments whose required coverage window is incomplete.
- Do not run full 15-year all-catalog fallback unless Orchestrator explicitly authorizes a maintenance run.

## 9. Residual Risks And Rollback Notes

Risks:

- Official exchange websites can change download flow, require cookies, throttle, or temporarily block automated downloads. Manual official-file import must remain the local-first fallback.
- UDiFF current files and legacy historical formats may differ materially. Each format needs its own parser and `formatVersion`.
- Exchange bhavcopy rows are generally unadjusted; adjusted-close provenance may remain a warning until a corporate-action adjustment model exists.
- Missing holiday calendars can make expected-session counts wrong. MD-A5 must surface calendar uncertainty rather than force false completeness.
- Listing dates may not be present in all official files. Earliest official EOD inference is useful but weaker than a verified listing date and must stay visible.
- Large 15-year backfills can take many bounded runs. That is acceptable if progress, cache reuse, and remaining work are explicit.
- Symbol identity collisions can reduce automatic coverage. Refusing ambiguous writes is safer than storing wrong prices.

Rollback notes:

- Keep existing Yahoo-only MD-A3 backfill behavior as compatibility by policy flag.
- If official auto-download breaks, disable automatic exchange download and leave manual official-file import plus `officialFallbackFailed` diagnostics.
- Do not delete existing price rows during rollback.
- Source-aware rows should remain valid; fallback can be paused without weakening downstream gates.
- If provenance schema changes are introduced and need rollback, repair attempts/source-cache manifests must still preserve enough evidence for audit.

## 10. Final Architecture Decision

MD-A5 will extend Market Data Foundation from "deep enough bars for review" to a durable historical coverage contract: every active `IN / STOCK` row must target `max(listing date, latest completed EOD - 15 years)` through latest completed EOD, or use the 15-year target with a visible listing-date repair gap when listing date is missing. Listing date must be repaired or inferred only from free official/public exchange sources or operator-supplied official files, with first-official-EOD inference disclosed as weaker evidence. Yahoo remains the first free price source, but Yahoo insufficiency triggers official/public NSE/BSE EOD fallback first, never paid providers or paid/free-tier commercial APIs. The implementation must preserve row/source provenance, expose coverage diagnostics, stay bounded and cache date-batched exchange files, and keep downstream signals, reviews, decisions, and trades fail-closed until the required coverage window is actually proven.
