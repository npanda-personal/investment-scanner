# MD-A5 Operational Drain QA Evidence - 2026-05-14

Mode: QA Verification Mode
Owner: Senior Fullstack Lead / Orchestrator acting as runtime QA recorder
Scope: `IN / STOCK`
Related operation report: [MD-A5 Operational Drain Report](../operations/2026-05-14-md-a5-operational-drain-report.md)
Status: `Rejected / Blocked - partial repair evidence captured`

## Verdict

P0.1C is not fully signed off.

The original operational drain did not proceed because the pre-drain local API paths were too slow and memory crossed the cleanup gate. The 2026-05-15 continuation fixed several implementation defects and captured mutating drain evidence, but the trusted universe is still not complete. QA remains blocked until token coverage and trusted-universe counts improve.

## Evidence Captured

- Backend health passed on `http://127.0.0.1:3000/health`.
- Frontend stayed stopped.
- No mutating repair-run was executed.
- Repair-plan/readiness snapshot completed in about `47.9s`.
- Dry-run `BACKFILL_PRICES` repair-run completed in about `43.9s`.
- Dry-run `VALIDATE_PROVIDERS` repair-run completed in about `43.5s`.
- Memory rose to `97.89%`; backend was stopped.
- Memory dropped to `89.18%` after cleanup.

## Acceptance Criteria Result

| Criterion | Result | Notes |
|---|---|---|
| App backend locally accessible | Pass | `/health` passed before cleanup. |
| Pre-drain repair-plan evidence captured | Pass with concern | Counts captured, but runtime was too slow. |
| Bounded operational drain improves trusted-data counts | Not run | Blocked before mutation. |
| No unbounded/heavy job runs under memory pressure | Pass | Backend was stopped when memory crossed the gate. |
| Evidence supports PO/Architect signoff | Fail | Performance and resource behavior must be fixed or explicitly bounded before signoff. |

## Rejection Reasons

1. Local Market Data summary/dry-run paths are too slow before any provider-heavy mutation starts.
2. Memory crossed the 95% hard gate during pre-drain verification.
3. `supportedPriceBackfillNeeded=2671` makes the sequential price-backfill executor a likely drain bottleneck.
4. P0.1C has limited trusted-universe improvement evidence.
5. Token coverage for the read-only provider path is incomplete (only one successful one-symbol smoke path is currently captured).

## Required Next Iteration

Responsible owner: Senior Fullstack Lead / Orchestrator to route to Market Data backend developer after Architect review.

Next iteration must:

- explain and reduce the read-only `repair-plan`, `review-readiness-summary`, and dry-run `repair-run` runtime;
- determine whether `backfillPrices` needs bounded parallel workers;
- preserve free/public data-source policy and no paid provider usage;
- run focused backend tests before QA;
- rerun P0.1C with before/after counts only after memory is below 90%.

## 2026-05-15 QA Continuation

Runtime evidence:

- Backend build passed with `npm.cmd run build`.
- Focused backend tests passed for price backfill concurrency, rate-limit classification, catalog identity repair, listing-date parsing, and retry/fallback behavior.
- Live backend repair-plan and universe-health endpoints were rechecked after restart.
- Memory stayed near `67-70%` during bounded repair runs.
- No frontend or Playwright session was started.

Validated fixes:

- Catalog identity gaps for supported `IN / STOCK` rows are closed: `supportedCatalogIdentityRepairNeeded=0`, `missingIsin=0`, `missingListingDate=0`.
- Business metadata provider auto-repair queue was drained to `businessMetadataAutoRepairable=0`.
- Price backfill is bounded-concurrent and improved `priceReady` from `10` to `112`.
- Yahoo rate-limit errors are not counted as fallback-required missing data; latest live `historyCoverageFallbackRequired=0`.
- Angel One read-only historical provider path is implemented with chunked, throttled requests and orders disabled.
- `SBIN.NS` read-only smoke passed: `getHistorical` returned 2 rows for `2024-09-19` to `2024-09-20`.
- Bounded backfill smoke run for Angel read-only path:
  - Payload used: `workerConcurrency=1`, `batchSize=3` (throttle `1250ms`).
  - Result: `processed=3`, `updated=2`, `failed=1`.
  - Failure detail: `EQUIPPP.NS` token lookup not found.
  - `priceRowsInserted=5088`, `remainingCandidates=2515`.
- Angel scrip-master resolver was broadened for cash-equity series variants and derivative rows remain excluded by tests.
- Price storage was optimized from per-row upserts to batched `createMany` for new rows plus batched updates for changed existing rows.
- Default ingestion validation no longer hard-rejects large price moves as missing/malformed data; spike rejection is now opt-in for diagnostics so corporate actions do not erase valid history.
- Follow-up bounded Angel batches passed:
  - `batchSize=5`, `workerConcurrency=1`: `processed=5`, `updated=5`, `failed=0`, `priceRowsInserted=5926`, `remainingCandidates=2507`.
  - `batchSize=3`, `workerConcurrency=1`: completed in about `28.0s`, `processed=3`, `updated=3`, `failed=0`, `priceRowsInserted=4369`, `remainingCandidates=2502`.
  - `FCSSOFT.NS` targeted re-ingest: inserted `2050` rows previously rejected by spike validation, zero warnings.
  - `batchSize=20`, `workerConcurrency=2`: completed in about `171.1s`, `processed=20`, `updated=20`, `failed=0`, `priceRowsInserted=32009`, `remainingCandidates=2482`.
  - `batchSize=20`, `workerConcurrency=2`: completed in about `167.7s`, `processed=20`, `updated=20`, `failed=0`, `priceRowsInserted=33851`, `remainingCandidates=2467`.
  - `batchSize=20`, `workerConcurrency=2`: completed in about `213.0s`, `processed=20`, `updated=20`, `failed=0`, `priceRowsInserted=41412`, `remainingCandidates=2453`.
  - `batchSize=20`, `workerConcurrency=2`: completed in about `160.2s`, `processed=20`, `updated=20`, `failed=0`, `priceRowsInserted=32875`, `remainingCandidates=2440`.
- Backend validation passed after the Angel/storage/spike changes:
  - `npm.cmd run build`
  - Focused Jest passed `46/46` for Angel, price backfill, rate limits, spike validation, historical storage, catalog identity, FUT/future, manual metadata, and provider business repair.
- Metadata remediation investigation confirmed current no-paid immediate path is `GET /api/v1/market-data/metadata/manual-template` followed by `POST /api/v1/market-data/metadata/manual-import`; no current automated free source fills sector, industry, and market cap together.

Latest live result:

| Metric | Value |
|---|---:|
| `totalCatalogInstruments` | `2912` |
| `supportedPriceBackfillNeeded` | `2430` |
| `supportedBusinessMetadataRepairNeeded` | `577` |
| `businessMetadataManualRequired` | `577` |
| `historyCoverageIncomplete` | `2380` |
| `priceCoveragePercentage` | `9.1%` |
| `metadataCoveragePercentage` | `72.1%` |
| `reviewReady` | `250` |
| `trustStatus` | `NOT_TRUSTWORTHY` |

## 2026-05-16 QA Continuation

Post-reboot validation:

- Docker Postgres is healthy after the system restart.
- `npm.cmd run build` passed.
- Focused scheduler/service validation passed: `3` relevant tests passed across `2` suites.
- Focused Angel provider throttle validation passed.
- Root runtime logs are centralized under `logs/`; root-level `*.log` artifacts are no longer present.

Validated additional fixes:

- Scheduler no longer skips when latest completed EOD is missing.
- Angel One is now used for IN/STOCK provider validation before Yahoo where supported.
- Angel historical and Market Data backfill provider throttles are configured to `750ms`, below the documented 3/sec and 180/minute SmartAPI historical cap and safer than the observed 450ms live rate.
- Concurrent Angel historical workers now share one in-flight login and one in-flight scrip-master download per provider instance.
- Angel POST calls retry bounded access-rate responses after a cooldown.
- Normal drain batches now use `force=false`.

Post-reboot drain evidence:

- Baseline after reboot: `reviewReady=204`, `supportedPriceBackfillNeeded=2479`, `historyCoverageIncomplete=2440`, `priceCoveragePercentage=7.2%`.
- `batchSize=20`, old `1250ms` throttle: `processed=20`, `updated=20`, `failed=0`, `priceRowsInserted=32425`, `remainingCandidates=2465`.
- `batchSize=5`, effective `450ms` throttle smoke: `processed=5`, `updated=5`, `failed=0`, `priceRowsInserted=8313`, `remainingCandidates=2459`.
- `batchSize=20`, `force=false`, `450ms` throttle: `processed=20`, `updated=20`, `failed=0`, `priceRowsInserted=30845`, `remainingCandidates=2445`.
- `batchSize=20`, `force=false`, `450ms` throttle: `processed=20`, `updated=20`, `failed=0`, `priceRowsInserted=40862`, `remainingCandidates=2430`.
- `batchSize=20`, `force=false`, `450ms` throttle: `processed=20`, `updated=20`, `failed=0`, `priceRowsInserted=42573`, `remainingCandidates=2413`.
- `batchSize=20`, `force=false`, `450ms` throttle before login de-duplication: `processed=20`, `updated=19`, `failed=1`, `priceRowsInserted=32398`, `remainingCandidates=2401`; failure was Angel `loginByPassword` access-rate response.
- `batchSize=10`, `force=false`, `750ms` throttle after bounded retry: `processed=10`, `updated=10`, `failed=0`, `priceRowsInserted=21451`, `remainingCandidates=2373`.
- `batchSize=20`, `force=false`, `750ms` throttle: `processed=20`, `updated=20`, `failed=0`, `priceRowsInserted=26298`, `remainingCandidates=2360`.
- `batchSize=20`, `force=false`, `750ms` throttle: `processed=20`, `updated=20`, `failed=0`, `priceRowsInserted=29515`, `remainingCandidates=2345`.
- `batchSize=20`, `force=false`, `750ms` throttle: `processed=20`, `updated=20`, `failed=0`, `priceRowsInserted=37302`, `remainingCandidates=2330`.
- Two-batch loop using one service/provider instance: `processed=40`, `updated=40`, `failed=0`, `priceRowsInserted=85130`, `remainingCandidates=2303`.
- Two-batch continuation using one service/provider instance: `processed=40`, `updated=40`, `failed=0`, `priceRowsInserted=67284`, `remainingCandidates=2274`.
- Two-batch continuation using one service/provider instance: `processed=40`, `updated=40`, `failed=0`, `priceRowsInserted=48580`, `remainingCandidates=2251`; malformed provider rows were skipped for five symbols and need continued QA watch.
- Two-batch continuation using one service/provider instance: `processed=40`, `updated=40`, `failed=0`, `priceRowsInserted=66810`, `remainingCandidates=2222`; malformed provider rows were skipped for three symbols and need continued QA watch.
- Two-batch continuation using one service/provider instance: `processed=40`, `updated=40`, `failed=0`, `priceRowsInserted=86170`, `remainingCandidates=2191`; malformed provider rows were skipped for four symbols and need continued QA watch.
- Two-batch continuation using one service/provider instance: `processed=40`, `updated=40`, `failed=0`, `priceRowsInserted=67696`, `remainingCandidates=2164`; malformed provider rows were skipped for six symbols and need continued QA watch.
- Two-batch continuation using one service/provider instance: `processed=40`, `updated=40`, `failed=0`, `priceRowsInserted=65992`, `remainingCandidates=2139`; malformed provider rows were skipped for six symbols and need continued QA watch.
- Two-batch continuation using one service/provider instance: `processed=40`, `updated=40`, `failed=0`, `priceRowsInserted=68851`, `remainingCandidates=2109`; malformed provider rows were skipped for three symbols and need continued QA watch.
- Two-batch continuation using one service/provider instance: `processed=40`, `updated=40`, `failed=0`, `priceRowsInserted=71291`, `remainingCandidates=2081`; malformed provider rows were skipped for four symbols and need continued QA watch.
- Two-batch continuation using one service/provider instance: `processed=40`, `updated=40`, `failed=0`, `priceRowsInserted=54259`, `remainingCandidates=2059`; malformed provider rows were skipped for three symbols and need continued QA watch.
- Two-batch continuation using one service/provider instance: `processed=40`, `updated=40`, `failed=0`, `priceRowsInserted=57052`, `remainingCandidates=2039`; malformed provider rows were skipped for two symbols and need continued QA watch.
- Two-batch continuation using one service/provider instance and explicit `force=false`: `processed=40`, `updated=40`, `failed=0`, `priceRowsInserted=66673`, `remainingCandidates=1989`; malformed provider rows were skipped for seven symbols and need continued QA watch.
- Two-batch continuation using one service/provider instance and explicit `force=false`: `processed=40`, `updated=40`, `failed=0`, `priceRowsInserted=81038`, `remainingCandidates=1957`; malformed provider rows were skipped for five symbols and need continued QA watch.
- Two-batch continuation using one service/provider instance and explicit `force=false`: `processed=40`, `updated=40`, `failed=0`, `priceRowsInserted=73977`, `remainingCandidates=1927`; malformed provider rows were skipped for two symbols and need continued QA watch.
- Post-fix focused Market Data regression passed: `56` tests across `5` suites.
- Business metadata blocker diagnostics validation passed: `2` focused tests; backend build passed; frontend build passed with existing large chunk warning; `git diff --check` passed with CRLF warnings only.
- Latest counters: `reviewReady=791`, `supportedPriceBackfillNeeded=1927`, `historyCoverageIncomplete=1785`, `priceCoveragePercentage=29.3%`, `metadataCoveragePercentage=72.1%`, `trustStatus=NOT_TRUSTWORTHY`.
- Architect review rejected mixed-scope diagnostics signoff; diagnostics, Angel/provider behavior, and repair-behavior changes must be reviewed as separate artifacts before signoff.
- Force-default follow-up tests passed: direct price backfill and repair-run price backfill default to non-forced unless `force=true` or `fullReload=true`; backend build passed after fix.

QA verdict remains **not signed off** because:

1. `reviewReady=791` is not enough for trusted downstream signals/strategies/trades.
2. `1927` supported rows still need price backfill.
3. `577` rows still need business metadata; diagnostics show `marketCap=25`, `sector+industry=276`, and `sector+industry+marketCap=276` missing-field sets after free provider repair.
4. Angel One is now the active read-only Indian price provider path, but continued drains must stay bounded and throttled.
5. Trusted-data counts (`reviewReady=791`, `supportedPriceBackfillNeeded=1927`) are below practical acceptance thresholds.
