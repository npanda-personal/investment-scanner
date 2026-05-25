# Signal Calibration Engine

## Ownership

`signal-calibration-engine` owns explainable calibration of raw Signal Generation Engine results.

It does not create raw signals, change raw signal scoring, optimize strategies, or provide trading advice. Raw `SignalResult` rows remain unchanged. Calibrated results are persisted separately in `SignalCalibrationResult`.

Strategy Framework may consume calibrated score/direction/confidence as optional context. Calibration remains owned by this module and is not overwritten by strategy evaluation.

## Endpoints

Mounted under `/api/v1`:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/signals/calibration/:instrumentId` | Latest calibrated signal for one instrument, calculated on demand if missing |
| POST | `/signals/calibration/run` | Run calibration for one instrument, symbol, or limited latest-signal universe |
| GET | `/signals/calibration/top` | Paginated calibrated results by scope, calibrated score, and filters |
| GET | `/signals/calibration/compare/:instrumentId` | Raw vs calibrated latest signal |
| GET | `/signals/calibration/model` | Model version, rules, horizons, and sample thresholds |
| GET | `/signals/calibration/health` | Calibration count, latest timestamp, health-level calibration evidence, readiness, and gaps |

## Batch Calibration

`POST /signals/calibration/run` supports single-stock and batch modes.

Single-stock request:

- `instrumentId`, or
- `symbol`

Batch request:

- `batchSize`: default `25`, clamped from `1` to `100`
- `offset` or `cursor`: default `0`
- optional `direction`, `sector`, `country`, `region`, `assetType`, `horizon`

Batch mode processes the latest raw signal for each instrument in the requested window. It does not load or calibrate the entire universe in one request.

Pipeline automation can call the service with explicit `instrumentIds`. That path is for scheduled downstream processing after Raw Signals and uses only latest persisted raw signal rows for the requested instruments. It does not generate raw signals, invoke provider/live paths, or paginate the full region. Duplicate requested ids are deduped before processing; requested ids without a persisted raw signal are counted in `skippedCount` with a warning instead of being reported as clean success.

Response fields include the previous compatibility fields plus progress metadata:

- `generated`
- `skipped`
- `errors`
- `results`
- `generatedAt`
- `processedCount`
- `totalCount`
- `batchSize`
- `offset`
- `nextOffset`
- `hasMore`
- `selectedHorizon`
- `calibrationEvidence`
- `calibrationReadiness`
- `calibratedCount`
- `passthroughCount`
- `skippedCount`
- `failedCount`
- `outOfScopeSkipped`
- `warnings`
- `durationMs`

Individual instrument failures are counted in `failedCount` and returned in `warnings`/`errors`; the rest of the batch continues. If Signal Quality diagnostics are unavailable or too sparse, the run succeeds with `passthroughCount` results that preserve the raw score and explain the missing evidence. `skippedCount` is reserved for records that were not calibrated at all, such as a single requested instrument outside the selected market scope.

## Global Market Scope & Pagination

The `/signals/calibration/top`, `/signals/calibration/run`, and `/signals/calibration/compare/:instrumentId` endpoints respect Global Market Scope (`region` and `assetType`). The backend filters calibration rows through `Stock` metadata using the shared market-scope helper, so `region=IN&assetType=STOCK` excludes US/EU rows when their stock metadata is out of scope. Scoped single-instrument compare/run requests do not persist calibration for instruments outside the requested scope; they return a not-found/skip result instead.

The `/signals/calibration/top` endpoint returns a `PaginatedCalibrationResponse` with `items`, `totalCount`, `limit`, `offset`, `hasMore`, `sortBy`, and `sortDirection`.

Supported query params include `region`, `assetType`, `limit`, `offset`, `sortBy`, `sortDirection`, `direction`, `confidence`, `calibrationConfidence`, `evidenceStatus`, `minRawScore`, `minCalibratedScore`, `minAbsDelta`, `hasDataGaps`, `search`, and `horizon`. `limit` is clamped to 100. Sorting supports `symbol`, `rawScore`, `calibratedScore`, `scoreDelta`, and `generatedAt`.

The frontend table uses server-side pagination, sorting, search, and filters. Resetting the global market scope resets pagination and refetches the list to prevent stale cross-region rows.

## Calibration Model

Default calibration model version:

- `signal-calibration-v2`

Supported quality metric horizons:

- `1D`, `5D`, `10D`, `20D`, `60D` (defaults to `20D`)

The model starts with the raw Signal Generation Engine score and applies bounded explainable adjustments.

Adjustment Caps (dynamically determined by sample safety):

- `HIGH` confidence: `-10` to `+10`
- `MEDIUM` confidence: `-6` to `+6`
- `LOW` confidence: `-3` to `+3`
- `INSUFFICIENT_SAMPLE`: `-1` to `+1` (or 0)

Total delta:

- `-25` to `+25` (final calibrated score: clamped `0-100`)

## Sample Safety & Calibration Evidence

Calibration explicitly integrates with Signal Quality Lab diagnostics (`horizonAvailability`, `evaluationDiagnostics`) to ensure adjustments are grounded in sufficient historical data. The calibration engine respects the following thresholds:

- **HIGH confidence:** $\ge 200$ overall evaluated samples, $\ge 50$ relevant group samples.
- **MEDIUM confidence:** $\ge 100$ overall evaluated samples, $\ge 30$ relevant group samples.
- **LOW confidence:** $\ge 50$ overall evaluated samples, $\ge 20$ relevant group samples.
- **INSUFFICIENT_SAMPLE:** $< 50$ overall evaluated samples, $< 20$ group samples, or $0$ evaluated samples for the requested horizon.

If the selected horizon (e.g., `5D`) has 0 evaluated samples because the future has not happened yet, calibration returns `INSUFFICIENT_SAMPLE`, sets `calibrationApplied=false`, and preserves the raw score.

The calibration UI clearly displays:
- Evidence warnings (e.g., "Horizon 5D has insufficient evaluated outcomes.")
- Evidence Status (`SUFFICIENT`, `LOW_SAMPLE`, `INSUFFICIENT`, `MISSING`)
- Overall and group evaluated samples
- Readiness status, downstream influence, and authoritative score
- Adjustment cap and whether sample-size fallback/passthrough was used

Response DTOs add `calibrationEvidence`, `calibrationConfidence`, `calibrationApplied`, `adjustmentCapApplied`, `sampleSizePenaltyApplied`, `overallEvaluatedSamples`, `groupEvaluatedSamples`, `evidenceStatus`, and `warningsCount`.

Source-module readiness guardrails are additive and are not persisted in this slice. Calibration-owned responses also expose:

- `calibrationEvidence.requiredOverallSamples`
- `calibrationEvidence.requiredGroupSamples`
- `calibrationEvidence.warnings`
- `calibrationReadiness.status`: `USABLE`, `LIMITED`, or `UNAVAILABLE`
- `calibrationReadiness.confidenceTier`: `HIGH`, `MEDIUM`, `LOW`, or `INSUFFICIENT_SAMPLE`
- `calibrationReadiness.calibrationApplied`
- `calibrationReadiness.adjustmentCapApplied`
- `calibrationReadiness.downstreamInfluence`: `NORMAL`, `LIMITED`, or `NONE`
- `calibrationReadiness.authoritativeScore`: `CALIBRATED_SCORE`, `RAW_SCORE`, or `NO_SCORE`
- `calibrationReadiness.reasons`
- `calibrationReadiness.blockers`

The health response exposes the same standardized guardrail shape. When no calibration rows exist, health returns
`calibrationEvidence.evidenceStatus=INSUFFICIENT`, zero evaluated samples, required thresholds, and
`calibrationReadiness.status=UNAVAILABLE` with `downstreamInfluence=NONE`. When persisted rows exist but do not carry
source readiness evidence, health returns `calibrationEvidence.evidenceStatus=MISSING` and keeps calibration influence
disabled until calibration is refreshed with source evidence.

Readiness rules:

- `USABLE` requires sufficient selected-horizon evidence and allows normal downstream influence.
- `LIMITED` means evidence exists but is low-sample or has data gaps; downstream influence is limited.
- `UNAVAILABLE` means evidence is missing, selected-horizon evaluated samples are zero, or raw score is unavailable; downstream influence is `NONE`.
- When selected-horizon evaluated samples are zero, calibration is not applied, confidence tier is `INSUFFICIENT_SAMPLE`, and raw score is authoritative when a raw score exists.
- Existing persisted rows without stored readiness evidence are treated conservatively on read. The source module derives current readiness from Signal Quality diagnostics when available; if diagnostics are missing, downstream influence is `NONE`.

## Adjustment Categories

MVP categories:

- signal type quality (subject to `MIN_GROUP_SAMPLES = 20`)
- score bucket quality
- sector quality
- market regime alignment
- sector leadership alignment
- smart-money confirmation/conflict
- data-quality penalties
- noisy signal penalties

Each boost or penalty is returned with a label, delta, type, and evidence where available.

Data Quality Engine penalties:

- coverage `UNUSABLE`: `-10`
- coverage `POOR`: `-6`
- readiness `NOT_READY`: `-10`
- readiness `LIMITED`: `-4`
- liquidity `ILLIQUID`: `-6`
- liquidity `UNKNOWN`: `-3`
- missing latest data-quality evaluation: no penalty, but a data gap is added

These penalties respect the dynamically calculated sample safety delta caps.

Per-group sample safety:

- signal type, score bucket, and sector adjustments require at least 20 evaluated group samples
- low-sample groups are skipped and recorded in reasons/data gaps
- if overall or selected-horizon evidence is insufficient, all adjustments are skipped and the raw score is used
- if Signal Quality fails, diagnostics are marked `MISSING` and the response carries a warning/data gap

## Confidence Methodology

Calibrated confidence considers:

- Sample Size Thresholds (Overall and Group Evidence)
- raw confidence
- number of boosts vs penalties
- severe penalties
- noisy signal flags
- data gaps

`HIGH` requires strong raw confidence, supportive evidence, no penalties, and `HIGH` base sample size. Sparse evidence, noisy instruments, low sample size, or missing context reduce confidence to `LOW` or `INSUFFICIENT_SAMPLE`.

## Persistence

Prisma model:

- `SignalCalibrationResult`

Stored fields include raw score/direction/confidence, calibrated score/direction/confidence, boosts, penalties, reasons, gaps, calibration model version, raw signal model version, and timestamps. Calibration evidence details are computed from Signal Quality diagnostics and appended to DTO responses; existing rows are not migrated.

Calibration results are idempotent for a raw signal/model pair. Recalibrating the same `SignalResult` with the same `calibrationModelVersion` updates the existing row instead of creating duplicate calibrated results.

Natural key:

- `signalResultId + calibrationModelVersion`

The migration `202604290008_stock_data_idempotency` removes duplicate calibration rows for the same natural key by keeping the most recently updated row before adding the database uniqueness constraint.

## Transparency

Frontend route:

- `/signals/calibration`

The dashboard shows the current scope (`IN / STOCK`, `US / STOCK`, etc.), selected horizon, sample warning banner, summary cards, and a full DataTable with pagination and server-side sorting/filtering. The compare selector uses the shared scoped instrument search, so it defaults to the selected global region and asset type.

The UI explicitly states that calibration is historical measurement support for research support only. A prominent warning banner appears if sample data is sparse.

## Integrations

Uses public module exports:

- `signal-generation-engine` for raw/latest signals
- `signal-quality-lab` for measured quality metrics, noisy flags, and horizon diagnostic availability
- `historical-context-snapshots` for regime, sector, smart-money, and data-quality lookup
- `data-quality-engine` for latest coverage, readiness, liquidity, warnings, and blockers

Raw-vs-calibrated comparison responses include a `dataQuality` object when a latest evaluation exists. The frontend displays this as a data-quality caution panel alongside boosts and penalties.

Downstream strategy triage modules that need fast, bounded reads should use the public `latestPersistedForInstrument` service method. It returns only already persisted calibration context and does not trigger on-demand calibration.

## Performance And UX Behavior

- Calibration top/model/health endpoints are lightweight and bounded for initial page load.
- Full calibration runs are manual and batch-based; the UI uses the shared batch runner with module-owned `signal_calibration_engine_batch_size = 100` and `signal_calibration_engine_batch_request_workers_count = 4`, keeps the run button disabled, and shows determinate progress until all batches finish.
- Batch progress keeps applied calibrations, passthrough raw-score preservations, skipped records, out-of-scope skips, failures, and warnings as separate counters.
- Batch runs load Signal Quality grouping metrics once per batch and reuse them across signals. Per-instrument lookups are still used for historical context snapshots and latest Data Quality Engine evaluation.
- Raw-vs-calibrated comparison is fetched only after a user selects one instrument from the searchable selector.

## Known Limitations

- Calibration quality depends on historical signal outcomes and context snapshots being available.
- Missing context creates data gaps rather than failed responses.
- No machine learning, adaptive weighting, paid providers, live intraday recalibration, or trading recommendations.
- When a selected horizon has insufficient future data (0 evaluated samples), calibration effectively skips adjustments; wait for more data.
- Existing persisted calibration rows do not store region, asset type, or evidence fields directly; list responses join/derive these fields from stock metadata and current Signal Quality diagnostics.

## Verification

Run from `backend`:

- `npx.cmd prisma generate`
- `npm.cmd run build`
- `npm.cmd test -- signal-calibration-engine --runInBand`
- `npm.cmd test -- signal-quality-lab --runInBand`

Run from `frontend`:

- `npm.cmd run build`
