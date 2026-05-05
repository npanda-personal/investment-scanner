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
| GET | `/signals/calibration/top` | Top calibrated results by calibrated score |
| GET | `/signals/calibration/compare/:instrumentId` | Raw vs calibrated latest signal |
| GET | `/signals/calibration/model` | Model version, rules, and thresholds |
| GET | `/signals/calibration/health` | Calibration count, latest timestamp, and gaps |

## Batch Calibration

`POST /signals/calibration/run` supports single-stock and batch modes.

Single-stock request:

- `instrumentId`, or
- `symbol`

Batch request:

- `batchSize`: default `25`, clamped from `1` to `100`
- `offset` or `cursor`: default `0`
- optional `direction`, `sector`, `country`

Batch mode processes the latest raw signal for each instrument in the requested window. It does not load or calibrate the entire universe in one request.

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
- `calibratedCount`
- `skippedCount`
- `failedCount`
- `warnings`
- `durationMs`

Individual instrument failures are counted in `failedCount` and returned in `warnings`/`errors`; the rest of the batch continues. A batch-level failure only occurs when the request cannot be parsed or the batch cannot be loaded.

Frontend behavior:

- The `/signals/calibration` Run Calibration button runs batches sequentially.
- The button shows a spinner and remains disabled while batches are running.
- After every successful batch, the dashboard refetches top calibrated signals, model info, and health metadata.
- If one batch fails, the loop stops and shows the error while preserving previously completed batches.

## Calibration Model

Default calibration model version:

- `signal-calibration-v1`

Quality metric window:

- `20D`

The model starts with the raw Signal Generation Engine score and applies bounded explainable adjustments.

Caps:

- per adjustment: `-10` to `+10`
- total delta: `-25` to `+25`
- final calibrated score: clamped `0-100`

## Adjustment Categories

MVP categories:

- signal type quality
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

These penalties respect the existing per-adjustment and total delta caps.

## Confidence Methodology

Calibrated confidence considers:

- raw confidence
- number of boosts vs penalties
- severe penalties
- noisy signal flags
- data gaps

`HIGH` requires strong raw confidence, supportive evidence, and no penalties. Sparse evidence, noisy instruments, or missing context reduce confidence to `LOW`.

## Persistence

Prisma model:

- `SignalCalibrationResult`

Stored fields include raw score/direction/confidence, calibrated score/direction/confidence, boosts, penalties, reasons, gaps, calibration model version, raw signal model version, and timestamps.

Calibration results are idempotent for a raw signal/model pair. Recalibrating the same `SignalResult` with the same `calibrationModelVersion` updates the existing row instead of creating duplicate calibrated results.

Natural key:

- `signalResultId + calibrationModelVersion`

The migration `202604290008_stock_data_idempotency` removes duplicate calibration rows for the same natural key by keeping the most recently updated row before adding the database uniqueness constraint.

## Transparency

Frontend route:

- `/signals/calibration`

The dashboard shows raw score next to calibrated score and lists boosts, penalties, reasons, and data gaps. The UI explicitly states that calibration is historical measurement support, not prediction or trading advice.

## Integrations

Uses public module exports:

- `signal-generation-engine` for raw/latest signals
- `signal-quality-lab` for measured quality metrics and noisy flags
- `historical-context-snapshots` for regime, sector, smart-money, and data-quality lookup
- `data-quality-engine` for latest coverage, readiness, liquidity, warnings, and blockers

Raw-vs-calibrated comparison responses include a `dataQuality` object when a latest evaluation exists. The frontend displays this as a data-quality caution panel alongside boosts and penalties.

## Performance And UX Behavior

- Calibration top/model/health endpoints are lightweight and bounded for initial page load.
- Full calibration runs are manual and batch-based; the UI keeps the run button disabled with progress text until all batches finish.
- Raw-vs-calibrated comparison is fetched only after a user selects one instrument from the searchable selector.

## Known Limitations

- Calibration quality depends on historical signal outcomes and context snapshots being available.
- Missing context creates data gaps rather than failed responses.
- No machine learning, adaptive weighting, paid providers, live intraday recalibration, or trading recommendations.

## Verification

Run from `backend`:

- `npx.cmd prisma generate`
- `npm.cmd run build`
- `npm.cmd test -- signal-calibration-engine --runInBand`

Run from `frontend`:

- `npm.cmd run build`
