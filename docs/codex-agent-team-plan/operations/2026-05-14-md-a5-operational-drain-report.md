# MD-A5 Operational Drain Report - 2026-05-14

Mode: Operational Drain Mode
Owner: Senior Fullstack Lead / Orchestrator
Scope: `IN / STOCK`
Related board item: P0.1C Trusted Universe Operational Drain
Status: `Partially unblocked; trusted-universe drain still open`

## Runtime Setup

- Backend was rebuilt with `npm.cmd run build`.
- Backend was started on `http://127.0.0.1:3000` with PID `29124`.
- `GET /health` returned `{"status":"ok"}` at `2026-05-14T12:49:53.957Z`.
- Frontend remained stopped.
- No Playwright, Docker, frontend, or additional Node service was started.

## Pre-Drain Evidence

Read-only and dry-run calls were attempted before any mutating drain:

| Check | Endpoint / Payload | Result | Duration |
|---|---|---|---:|
| Repair plan and readiness snapshot | `GET /api/v1/market-data/universe/repair-plan?region=IN&assetType=STOCK`; `GET /api/v1/market-data/review-readiness-summary?region=IN&assetType=STOCK` | Completed | ~47.9s |
| Dry-run price drain | `POST /api/v1/market-data/universe/repair-run`, `actions=["BACKFILL_PRICES"]`, `batchSize=10`, `maxBatchesPerAction=1`, `dryRun=true` | Completed but response projection was not useful in the shell capture | ~43.9s |
| Dry-run provider validation | `POST /api/v1/market-data/universe/repair-run`, `actions=["VALIDATE_PROVIDERS"]`, `batchSize=10`, `maxBatchesPerAction=1`, `dryRun=true` | Completed but response projection was not useful in the shell capture | ~43.5s |

## Snapshot Counts

- `totalCatalogInstruments`: `2907`
- `providerUnknownValidationNeeded`: `0`
- `providerRetryValidationNeeded`: `236`
- `supportedPriceBackfillNeeded`: `2671`
- `businessMetadataAutoRepairable`: `2657`
- `manualBusinessMetadataRequired`: `2659`
- `trustStatus`: `NOT_TRUSTWORTHY`
- `reviewMode`: `NO_REVIEW`
- `nextAction`: `BACKFILL_PRICES`

## Stop Condition

No mutating drain was run.

Reason:

- Pre-drain read-only and dry-run paths were already too slow for operational use.
- Memory utilization rose to `97.89%`, closing the resource gate.
- Backend PID `29124` was stopped immediately after evidence capture.
- After cleanup, memory dropped to `89.18%`, reopening the gate.

## Initial Technical Observation

Local code inspection found that `MarketDataFoundationService.backfillPrices` processes the selected page sequentially. With `supportedPriceBackfillNeeded=2671`, a full operational drain would likely remain slow and resource-heavy unless the summary paths and price backfill executor are optimized first.

## Next Action

- Keep BLK-0006 open until the trusted universe reaches the PO/Architect acceptance threshold or PO explicitly changes the threshold.
- Continue bounded drains only while memory is below the resource gate and provider rate limits are not active.
- Treat Yahoo rate limits as retry-cooling provider failures, not missing-data fallback failures.

## 2026-05-15 Continuation Evidence

Runtime:

- Backend rebuilt with `npm.cmd run build`.
- Backend restarted on `http://127.0.0.1:3000`.
- Memory was checked before provider-heavy drains and stayed near `67-70%`.
- Frontend and Playwright remained stopped.

Code/repair fixes validated during the continuation:

- Legitimate cash-equity symbols containing `FUT` / `future` are no longer excluded or classified as futures.
- NSE SME catalog identity rows with underscore headers are parsed.
- Numeric Indian `DD-MM-YYYY` listing dates are parsed.
- Catalog identity repair runs operate on actionable rows instead of paging through already-complete catalog rows.
- Price-readiness full-history checks now use total stored bars instead of the 252-bar rolling window.
- The 15-year history start boundary allows a short weekend/holiday tolerance.
- Price backfill now uses bounded worker concurrency.
- Direct catalog, metadata, manual import, and price repair paths invalidate universe snapshots.
- Yahoo price rate limits are recorded as retry-cooling provider failures rather than fallback-required missing data.
- Angel One read-only historical provider path was added behind `ANGEL_ONE_ENABLE_MARKET_DATA`; orders remain disabled and out of scope.
- Angel One historical requests are chunked to at most `ANGEL_ONE_HISTORICAL_MAX_DAYS` and throttled by `ANGEL_ONE_HISTORICAL_THROTTLE_MS` to respect provider limits before any bulk backfill.
- Angel One scrip-master resolution now supports ranked cash-equity series variants such as `EQ`, `BE`, and SME-style rows while still excluding derivative/option rows.
- Price storage now uses batched inserts for new candles and batched updates for changed candles instead of per-row upserts.
- Default ingestion validation no longer rejects large price moves as missing/malformed history; spike rejection is opt-in through `MARKET_DATA_REJECT_PRICE_SPIKES=true`, because splits/bonus actions can otherwise erase valid long-history rows.

Operational drain evidence:

| Step | Payload / Action | Result |
|---|---|---|
| Baseline after runtime restart | `GET /api/v1/market-data/universe/repair-plan?region=IN&assetType=STOCK` | `totalCatalogInstruments=2912`, `supportedCatalogIdentityRepairNeeded=0`, `missingIsin=0`, `missingListingDate=0`, `supportedPriceBackfillNeeded=2666`, `supportedBusinessMetadataRepairNeeded=2664`, `priceReady=10`, `contextReady=0`, `reviewReady=0` |
| Price backfill batch | `POST /api/v1/market-data/prices/backfill`, `batchSize=25`, `workerConcurrency=3`, `force=true` | Completed in about `19.2s`; `processed=25`, `updated=25`; price queue dropped to `2652`; `priceReady=24` |
| Price backfill batch | `POST /api/v1/market-data/prices/backfill`, `batchSize=25`, `workerConcurrency=5`, `force=true` | Completed in about `17.8s`; `processed=25`, `updated=25`; `priceReady=38` |
| Price backfill batch | `POST /api/v1/market-data/prices/backfill`, `batchSize=100`, `workerConcurrency=5`, `force=true` | Completed in about `79.4s`; `processed=100`, `updated=100`, `priceRowsInserted=178419`; `priceReady=112` |
| Business metadata drain | Non-force `POST /api/v1/market-data/metadata/provider-business/repair`, repeated bounded batches | Auto-repairable queue drained from `2662` to `0`; `contextReady=112`, `reviewReady=108`; remaining business blockers are manual/free-fallback cases where Yahoo did not provide sector, industry, or market cap |
| Rate-limit guard | `POST /api/v1/market-data/prices/backfill`, `batchSize=50`, `workerConcurrency=5` after heavy Yahoo usage | Hit `Edge: Too Many Requests`; provider-heavy drain stopped; code fixed so the 50 rows are retry-cooling and `historyCoverageFallbackRequired=0` after restart |
| Angel One smoke | Single-symbol `SBIN.NS` read-only historical probe after `.env` credentials were supplied | Login/session and scrip-master token lookup succeeded; `getCandleData` returned 2 rows for `2024-09-19` to `2024-09-20` |
| Angel One bounded backfill smoke | `POST /api/v1/market-data/prices/backfill`, `batchSize=3`, `workerConcurrency=1`, `throttleMs=1250` | `processed=3`, `updated=2`, `failed=1`; one fail was `EQUIPPP.NS` due missing token; `priceRowsInserted=5088`; `remainingCandidates=2515` |
| Angel resolver/storage validation batch | `POST /api/v1/market-data/prices/backfill`, `batchSize=5`, `workerConcurrency=1`, `throttleMs=1250` after resolver and storage optimization | `processed=5`, `updated=5`, `failed=0`; `priceRowsInserted=5926`; `remainingCandidates=2507`; no summary warnings |
| Angel parser/storage validation batch | `POST /api/v1/market-data/prices/backfill`, `batchSize=3`, `workerConcurrency=1`, `throttleMs=1250` after stricter parser | Completed in about `28.0s`; `processed=3`, `updated=3`, `failed=0`; `priceRowsInserted=4369`; `remainingCandidates=2502`; one parser-level malformed row was skipped from `EXPLEOSOL.NS` |
| Spike-filter correction proof | Direct `FCSSOFT.NS` validation probe and targeted re-ingest | Before fix, `2050` rows were falsely rejected as abnormal spikes; after fix, `3601/3601` rows validate and targeted re-ingest inserted `2050` missing rows with zero warnings |
| Angel bounded drain batch | `POST /api/v1/market-data/prices/backfill`, `batchSize=20`, `workerConcurrency=2`, `throttleMs=1250` | Completed in about `171.1s`; `processed=20`, `updated=20`, `failed=0`; `priceRowsInserted=32009`; `remainingCandidates=2482`; two genuinely malformed provider rows skipped in logs |
| Angel bounded drain batch | `POST /api/v1/market-data/prices/backfill`, `batchSize=20`, `workerConcurrency=2`, `throttleMs=1250` | Completed in about `167.7s`; `processed=20`, `updated=20`, `failed=0`; `priceRowsInserted=33851`; `remainingCandidates=2467`; limited parser-level malformed rows on three symbols |
| Angel bounded drain batch | `POST /api/v1/market-data/prices/backfill`, `batchSize=20`, `workerConcurrency=2`, `throttleMs=1250` | Completed in about `213.0s`; `processed=20`, `updated=20`, `failed=0`; `priceRowsInserted=41412`; `remainingCandidates=2453`; limited parser-level malformed rows on five symbols |
| Angel bounded drain batch | `POST /api/v1/market-data/prices/backfill`, `batchSize=20`, `workerConcurrency=2`, `throttleMs=1250` | Completed in about `160.2s`; `processed=20`, `updated=20`, `failed=0`; `priceRowsInserted=32875`; `remainingCandidates=2440`; limited parser-level malformed rows on two symbols |
| Backend validation | `npm.cmd run build` and focused Jest for Angel, price backfill, rate limits, spike validation, historical storage, catalog identity, FUT/future, manual metadata, provider business repair | Build passed; focused tests passed `46/46` |

## 2026-05-16 Post-Reboot Continuation Evidence

Runtime:

- Docker Desktop was restarted after the system reboot and `investment_scanner_postgres` is healthy.
- Backend and frontend monitor ports are stopped; the continuation used direct backend scripts against Docker Postgres.
- Root-level `*.log` files were moved under `logs/`; future runtime logs must use `logs/`.
- Angel One credentials remained configured locally; orders remain disabled.

Implementation fixes added after QA audit:

- Scheduler catch-up now runs when the latest completed candle is missing, even if the normal market-session decision would skip.
- IN/STOCK provider validation now uses Angel One first when Angel can handle the symbol; Yahoo remains fallback only for non-IN/non-Angel paths or fail-open Angel failures.
- Angel historical throttle and Market Data backfill provider throttle were set to `750ms`, below the SmartAPI historical limit of 3 requests/second and 180/minute while avoiding observed live access-rate throttling at `450ms`.
- Concurrent Angel calls now share one in-flight login and one in-flight scrip-master download per provider instance, avoiding duplicate `loginByPassword` calls during bounded worker drains.
- Angel POST calls now retry bounded access-rate responses after a cooldown instead of immediately failing the symbol.

Validation:

- `npm.cmd run build`: passed.
- Focused scheduler/service tests: `3 passed`, `135 skipped`, `2 suites passed`.
- Focused Angel provider throttle test: passed.
- Full focused Market Data regression after login de-duplication and bounded retry: `56 passed`, `147 skipped`, `5 suites passed`.
- Business metadata blocker diagnostics tests: `2 passed`, `133 skipped`, `1 suite passed`.
- Backend build after diagnostics hardening: passed.
- Frontend build after metadata diagnostics panel: passed; existing large chunk warning remains.
- Force-default safety tests: direct `backfillPrices` and repair-run backfill default to `force=false`; explicit `force=true` or `fullReload=true` is required.
- Backend build after force-default safety fix: passed.
- `git diff --check`: passed with CRLF line-ending warnings only.

Post-reboot live drain evidence:

| Step | Payload / Action | Result |
|---|---|---|
| Post-reboot baseline | Direct `repairPlan` and `universeHealth` for `IN / STOCK` | `supportedPriceBackfillNeeded=2479`, `supportedBusinessMetadataRepairNeeded=577`, `historyCoverageIncomplete=2440`, `reviewReady=204`, `priceCoveragePercentage=7.2`, `trustStatus=NOT_TRUSTWORTHY` |
| Angel bounded drain batch | `batchSize=20`, `workerConcurrency=2`, old service throttle `1250ms` | Completed in about `155.9s`; `processed=20`, `updated=20`, `failed=0`; `priceRowsInserted=32425`; `remainingCandidates=2465` |
| Counter refresh | Direct `repairPlan` and `universeHealth` | `supportedPriceBackfillNeeded=2465`, `historyCoverageIncomplete=2424`, `reviewReady=217`, `priceCoveragePercentage=7.8`, `trustStatus=NOT_TRUSTWORTHY` |
| Angel 450ms smoke | `batchSize=5`, `workerConcurrency=2`, effective service throttle `450ms` | Completed in about `28.4s`; `processed=5`, `updated=5`, `failed=0`; `priceRowsInserted=8313`; `remainingCandidates=2459` |
| Angel normal drain batch | `batchSize=20`, `workerConcurrency=2`, `force=false`, `throttleMs=450` | Completed in about `57.0s`; `processed=20`, `updated=20`, `failed=0`; `priceRowsInserted=30845`; `remainingCandidates=2445` |
| Angel normal drain batch | `batchSize=20`, `workerConcurrency=2`, `force=false`, `throttleMs=450` | Completed in about `75.2s`; `processed=20`, `updated=20`, `failed=0`; `priceRowsInserted=40862`; `remainingCandidates=2430` |
| Angel normal drain batch | `batchSize=20`, `workerConcurrency=2`, `force=false`, `throttleMs=450` | Completed in about `69.5s`; `processed=20`, `updated=20`, `failed=0`; `priceRowsInserted=42573`; `remainingCandidates=2413` |
| Angel normal drain batch before login de-duplication | `batchSize=20`, `workerConcurrency=2`, `force=false`, `throttleMs=450` | Completed in about `69.2s`; `processed=20`, `updated=19`, `failed=1`; `priceRowsInserted=32398`; failed symbol hit `loginByPassword` access-rate response; prompted in-flight login/scrip-master de-duplication fix; `remainingCandidates=2401` |
| Angel safer-throttle smoke | `batchSize=10`, `workerConcurrency=2`, `force=false`, `throttleMs=750` | Completed in about `71.8s`; `processed=10`, `updated=10`, `failed=0`; `priceRowsInserted=21451`; `remainingCandidates=2373` |
| Angel safer-throttle drain batch | `batchSize=20`, `workerConcurrency=2`, `force=false`, `throttleMs=750` | Completed in about `82.3s`; `processed=20`, `updated=20`, `failed=0`; `priceRowsInserted=26298`; `remainingCandidates=2360` |
| Angel safer-throttle drain batch | `batchSize=20`, `workerConcurrency=2`, `force=false`, `throttleMs=750` | Completed in about `90.8s`; `processed=20`, `updated=20`, `failed=0`; `priceRowsInserted=29515`; `remainingCandidates=2345` |
| Angel safer-throttle drain batch | `batchSize=20`, `workerConcurrency=2`, `force=false`, `throttleMs=750` | Completed in about `107.7s`; `processed=20`, `updated=20`, `failed=0`; `priceRowsInserted=37302`; `remainingCandidates=2330` |
| Angel safer-throttle two-batch loop | Two sequential `batchSize=20`, `workerConcurrency=2`, `force=false`, `throttleMs=750` batches using one service/provider instance | Completed in about `126.7s` and `114.3s`; `processed=40`, `updated=40`, `failed=0`; `priceRowsInserted=85130`; `remainingCandidates=2303` |
| Angel safer-throttle two-batch continuation | Two sequential `batchSize=20`, `workerConcurrency=2`, `force=false`, `throttleMs=750` batches using one service/provider instance | Completed in about `109.3s` and `92.3s`; `processed=40`, `updated=40`, `failed=0`; `priceRowsInserted=67284`; `remainingCandidates=2274` |
| Angel safer-throttle two-batch continuation | Two sequential `batchSize=20`, `workerConcurrency=2`, `force=false`, `throttleMs=750` batches using one service/provider instance | Completed in about `78.4s` and `89.1s`; `processed=40`, `updated=40`, `failed=0`; `priceRowsInserted=48580`; `remainingCandidates=2251`; malformed provider rows skipped for `MBLINFRA.NS`, `MHLXMIRU.NS`, `MICEL.NS`, `MINDTECK.NS`, and `MIRCELECTR.NS` |
| Angel safer-throttle two-batch continuation | Two sequential `batchSize=20`, `workerConcurrency=2`, `force=false`, `throttleMs=750` batches using one service/provider instance | Completed in about `99.2s` and `112.8s`; `processed=40`, `updated=40`, `failed=0`; `priceRowsInserted=66810`; `remainingCandidates=2222`; malformed provider rows skipped for `MMP.NS`, `MONARCH.NS`, and `MSPL.NS` |
| Angel safer-throttle two-batch continuation | Two sequential `batchSize=20`, `workerConcurrency=2`, `force=false`, `throttleMs=750` batches using one service/provider instance | Completed in about `111.1s` and `127.1s`; `processed=40`, `updated=40`, `failed=0`; `priceRowsInserted=86170`; `remainingCandidates=2191`; malformed provider rows skipped for `NACLIND.NS`, `NAGREEKCAP.NS`, `NDLVENTURE.NS`, and `NDRAUTO.NS` |
| Angel safer-throttle two-batch continuation | Two sequential `batchSize=20`, `workerConcurrency=2`, `force=false`, `throttleMs=750` batches using one service/provider instance | Completed in about `108.4s` and `109.3s`; `processed=40`, `updated=40`, `failed=0`; `priceRowsInserted=67696`; `remainingCandidates=2164`; malformed provider rows skipped for `NIBL.NS`, `NIITLTD.NS`, `NILASPACES.NS`, `NINSYS.NS`, `NIPPOBATRY.NS`, and `NORBTEAEXP.NS` |
| Angel safer-throttle two-batch continuation | Two sequential `batchSize=20`, `workerConcurrency=2`, `force=false`, `throttleMs=750` batches using one service/provider instance | Completed in about `117.9s` and `92.0s`; `processed=40`, `updated=40`, `failed=0`; `priceRowsInserted=65992`; `remainingCandidates=2139`; malformed provider rows skipped for `REGENCERAM.NS`, `RHFL.NS`, `RIIL.NS`, `RKDL.NS`, `ROLEXRINGS.NS`, and `ROLLT.NS` |
| Angel safer-throttle two-batch continuation | Two sequential `batchSize=20`, `workerConcurrency=2`, `force=false`, `throttleMs=750` batches using one service/provider instance | Completed in about `118.3s` and `97.8s`; `processed=40`, `updated=40`, `failed=0`; `priceRowsInserted=68851`; `remainingCandidates=2109`; malformed provider rows skipped for `RSSOFTWARE.NS`, `SABAR.NS`, and `SADBHIN.NS` |
| Angel safer-throttle two-batch continuation | Two sequential `batchSize=20`, `workerConcurrency=2`, `force=false`, `throttleMs=750` batches using one service/provider instance | Completed in about `113.2s` and `99.5s`; `processed=40`, `updated=40`, `failed=0`; `priceRowsInserted=71291`; `remainingCandidates=2081`; malformed provider rows skipped for `SAKUMA.NS`, `SAMPANN.NS`, `SARVESHWAR.NS`, and `SATIN.NS` |
| Angel safer-throttle two-batch continuation | Two sequential `batchSize=20`, `workerConcurrency=2`, `force=false`, `throttleMs=750` batches using one service/provider instance | Completed in about `78.1s` and `104.1s`; `processed=40`, `updated=40`, `failed=0`; `priceRowsInserted=54259`; `remainingCandidates=2059`; malformed provider rows skipped for `SEMAC.NS`, `SGIL.NS`, and `SHAHALLOYS.NS` |
| Angel safer-throttle two-batch continuation | Two sequential `batchSize=20`, `workerConcurrency=2`, `force=false`, `throttleMs=750` batches using one service/provider instance | Completed in about `100.9s` and `97.6s`; `processed=40`, `updated=40`, `failed=0`; `priceRowsInserted=57052`; `remainingCandidates=2039`; malformed provider rows skipped for `SHREERAMA.NS` and `SHREYANIND.NS` |
| Angel safer-throttle two-batch continuation | Two sequential `batchSize=20`, `workerConcurrency=2`, explicit `force=false`, `throttleMs=750` batches using one service/provider instance | Completed in about `116.3s` and `103.4s`; `processed=40`, `updated=40`, `failed=0`; `priceRowsInserted=66673`; `remainingCandidates=1989`; malformed provider rows skipped for `SMLT.NS`, `SOMATEX.NS`, `SOMICONVEY.NS`, `SOTL.NS`, `SPORTKING.NS`, `SPRL.NS`, and `SPMLINFRA.NS` |
| Angel safer-throttle two-batch continuation | Two sequential `batchSize=20`, `workerConcurrency=2`, explicit `force=false`, `throttleMs=750` batches using one service/provider instance | Completed in about `116.6s` and `126.3s`; `processed=40`, `updated=40`, `failed=0`; `priceRowsInserted=81038`; `remainingCandidates=1957`; malformed provider rows skipped for `STERTOOLS.NS`, `SUDARSCHEM.NS`, `SULA.NS`, `SUNDRMBRAK.NS`, and `SUNDROP.NS` |
| Angel safer-throttle two-batch continuation | Two sequential `batchSize=20`, `workerConcurrency=2`, explicit `force=false`, `throttleMs=750` batches using one service/provider instance | Completed in about `126.4s` and `92.5s`; `processed=40`, `updated=40`, `failed=0`; `priceRowsInserted=73977`; `remainingCandidates=1927`; malformed provider rows skipped for `SUPREMEENG.NS` and `SUPREMEINF.NS` |

Latest live counters after the 2026-05-16 continuation:

- `totalCatalogInstruments`: `2912`
- `supportedCatalogIdentityRepairNeeded`: `0`
- `missingIsin`: `0`
- `missingListingDate`: `0`
- `supportedPriceBackfillNeeded`: `1927`
- `supportedBusinessMetadataRepairNeeded`: `577`
- `businessMetadataAutoRepairable`: `0`
- `businessMetadataManualRequired`: `577`
- `historyCoverageIncomplete`: `1785`
- `historyCoverageFallbackRequired`: `0`
- `priceCoveragePercentage`: `29.3`
- `metadataCoveragePercentage`: `72.1`
- `reviewReady`: `791`
- `trustStatus`: `NOT_TRUSTWORTHY`

## Business Metadata Remediation Plan (Next Operator Iteration)

Priority: close `businessMetadataManualRequired` after current price stability improvements.

Current metadata blocker state:

- `supportedBusinessMetadataRepairNeeded = 577`
- `businessMetadataAutoRepairable = 0`
- `businessMetadataManualRequired = 577`
- Live blocker diagnostics: `unresolvedTotal = 577`, `missingSector = 552`, `missingIndustry = 552`, `missingMarketCap = 301`
- Missing-field sets: `marketCap = 25`, `sector+industry = 276`, `sector+industry+marketCap = 276`

Operationally preferred sequence:

1. **Freeze manual metadata work until no active provider flood**
   - Continue bounded backfills with provider cooldown until `price backfill` no-progress risk is low.
   - Keep free-source rules intact: no paid providers.

2. **Expose and verify exact manual metadata blockers**
   - Keep the provider-business repair lane drained; `businessMetadataAutoRepairable = 0` means no provider-fillable rows remain from the current free provider path.
   - Use the diagnostics response to verify the 577 unresolved rows are only missing `sector`, `industry`, and/or positive `marketCap`.
   - Expected outcome: manual import work targets only the exact missing-field sets and does not hide unresolved rows behind generic validation messages.

3. **Convert manual backlog using exchange/scrip-master assisted enrichment**
   - Export unresolved rows for `manual-metadata-required` from the template endpoint.
   - Use NSE/BSE catalog sources (and optional configured BSE catalog source) as identity anchors (symbol/exchange/ISIN/listing fields only where available).
   - Use Angel One scrip master only for identity confidence and symbol/series matching (no business-metadata authority).
   - Populate `sector`, `industry`, and positive numeric `marketCap` together in a bounded `csvText` import.

4. **Run bounded manual import batches and re-measure**
   - Use `MANUAL_METADATA_IMPORT` with stable offset and source fingerprint.
   - Capture before/after:
     - `businessMetadataManualRequired`
     - `manualBusinessMetadataRequired`
     - `contextReady` / `reviewReady`
   - Keep unresolved rows unresolved if they fail validation (null-equivalent sector/industry or non-positive market cap).

Open blockers blocking automation:

- The current free metadata strategy cannot treat Scrip Master as business authority; it is identity-only in this implementation.
- There is no guaranteed free source wired for full sector/industry/market-cap coverage at catalog level.
- Manual rows are expected to remain the long tail until a dedicated free business source is integrated in a future packet.
- Angel One is approved only for read-only Indian historical data; orders remain disabled.

Current stop condition:

- Continue bounded Angel-backed price drains only while global provider throttling is active, memory is safe, and no downstream signals/strategy/trades are started.
