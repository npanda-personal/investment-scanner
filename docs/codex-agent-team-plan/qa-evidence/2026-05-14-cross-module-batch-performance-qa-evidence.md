# Cross-Module Batch Performance QA Evidence - 2026-05-14

## Scope

- `POST /api/v1/signals/run`
- `POST /api/v1/signals/calibration/run`
- `POST /api/v1/strategy/evaluate`
- Supporting Market Data trusted-review date policy and diagnostics ordering uncovered by the full backend suite.

## Product / Architect Decision

- Batch APIs that use local DB data must not perform per-instrument N+1 reads for price windows, fundamentals, calibration snapshots, data-quality snapshots, or smart-money snapshots.
- `strategy=ALL` must build one instrument context and reuse it across strategy evaluators.
- Strategy batch persistence must avoid hundreds of per-row upserts when replacing a generated daily batch.
- Calibration must skip expensive Signal Quality grouping and historical context lookup when the selected horizon has zero evaluated outcome samples; in that state raw score remains authoritative.
- Market Data trusted-review exclusions must report specific actionable causes before broad required-history failure buckets.

## Implementation Evidence

- Added Market Data bulk readers:
  - `listRecentPriceWindowsByInstrumentIds`
  - `storedFundamentalsByInstrumentIds`
- Added batch snapshot readers:
  - `SignalCalibrationEngineRepository.latestForInstruments`
  - `SignalCalibrationEngineService.latestPersistedForInstruments`
  - `SmartMoneyIntelligenceRepository.latestStockSnapshots`
  - `SmartMoneyIntelligenceService.latestPersistedStocks`
- Updated Signal Generation to load instruments, recent prices, stored fundamentals, and shared strategy ratings once per batch.
- Updated Strategy Decision to load price, calibration, data quality, and smart-money context once per batch, then persist the final decision set through `replaceMany`.
- Updated Market Data trusted-review policy to use the injected `now` consistently for required-history windows.

## Live Timing Evidence

Backend rebuilt and restarted on `http://localhost:3000`; frontend remained running on `http://localhost:5173`.

| Endpoint | Payload Shape | Wall Time | Service Duration | Result |
|---|---|---:|---:|---|
| `/api/v1/signals/run` | batch 100, offset 100, DQ filter on, strategy matches on | 5072 ms | 4888 ms | processed 100, attempted 77, updated 77, failed 0 |
| `/api/v1/signals/calibration/run` | batch 100, offset 100, IN/STOCK, 20D | 3633 ms | 3494 ms | processed 100, generated 100, passthrough 100, failed 0 |
| `/api/v1/strategy/evaluate` | strategy ALL, batch 100, offset 500, IN/STOCK | 6807 ms | 6120 ms | processed 100, generated 600, failed 0 |

Earlier same-session live checks before strategy persistence batching showed `/api/v1/strategy/evaluate` at 11.5-11.9 seconds, so the persistence redesign removed the remaining major write bottleneck.

## Automated Verification

- `npm.cmd test -- --runInBand signal-generation-engine.service.test.ts signal-calibration-engine.service.test.ts strategy-decision-engine.service.test.ts` passed: 65 tests.
- `npm.cmd test -- --runInBand market-data.universe.test.ts` passed: 22 tests.
- `npm.cmd test -- --runInBand` passed: 76 suites, 603 tests.
- `npm.cmd run build` passed in `backend`.
- `git diff --check` passed with only repository line-ending warnings.

## Signoff

- QA: signed off on focused and full backend regression evidence plus live API timing evidence.
- Lead: signed off that implementation follows the Architect ask: bulk local DB reads, shared batch context, bounded concurrency, and batch persistence.
- Architect: signed off that no paid providers, tools, or services were introduced and the design keeps local personal-use constraints.
- Product Owner: accepted as a performance repair for the reported batch endpoints; remaining future opportunity is to add progress/polling UI for any batch workflow still exposed as a long-running button action.
