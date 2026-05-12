# Today Trade Review

## Objective

Today Trade Review publishes the Phase 1 before-market research-support shortlist for the current market scope, defaulting to `IN / STOCK`.

It answers: which stocks deserve review today, in which direction, why, where the planned entry/invalidation/reward areas are, and what blocks or invalidates the idea.

## Ownership

Owns:
- Manual daily review run orchestration.
- Persisted daily shortlist snapshots.
- Candidate ranking and product-facing state mapping.
- Run status, warnings, data-through metadata, and source snapshot metadata.
- Candidate detail aggregation from persisted Today Review snapshots.

Does not own:
- Raw signal generation or calibration.
- Strategy Framework definitions or proof calculation.
- Backtest simulation.
- Trade-plan geometry calculation.
- Market-data ingestion or data-quality scoring.
- Market-context generation.
- Portfolio/watchlist personalization.
- Broker execution, live trading, or order workflows.

## Persistence

Prisma models:
- `TodayReviewRun`: one logical run per `runDate + region + assetType`.
- `TodayReviewCandidate`: one candidate per `runId + instrumentId + strategyCode + direction`.

Manual reruns update the same logical daily run instead of creating duplicates. Candidates snapshot the publication-time state so the page does not recompute the full upstream graph on normal load.

Run source snapshots include `reviewUniverse` and `scanFunnel`. `reviewUniverse` records Trusted Review Universe mode, target trading date, required data-through date, stored data-through date, trusted count, catalog count, context-gap counts, scan policy, and coverage warnings. `scanFunnel` records trusted universe count, instruments scanned/skipped, scan limit, scan completeness, scan ordering, trusted membership load status (`COMPLETE`, `CONFIGURED_PARTIAL`, or `LOAD_FAILED`), membership failure reason when applicable, Strategy Decision candidates seen/eligible/excluded, outside-trusted-universe exclusions, setups detected, promoted candidates, watch/unproven counts, blocked counts, no-setup count, and top no-promotion reasons. These fields are persisted in JSON so the UI can explain zero-candidate or limited-coverage runs without recomputing the market-data graph.

Existing upstream rows are not deleted or repaired by this module. If upstream snapshots are stale or contradictory, Today Review maps conservatively:
- hard blockers -> `BLOCKED`
- missing required data -> `INSUFFICIENT_DATA`
- missing or weak proof -> `UNPROVEN`
- weak/non-hard evidence -> `WATCH_ONLY`

## Candidate States

Product-facing states:
- `LONG_REVIEW`
- `SHORT_REVIEW`
- `EXIT_RISK_REVIEW`
- `WATCH_ONLY`
- `BLOCKED`
- `AVOID`
- `INSUFFICIENT_DATA`
- `UNPROVEN`

Rules:
- Raw bullish/bearish signals are support evidence only and never promote candidates by themselves.
- Today Review run eligibility uses Market Data Foundation Trusted Review Universe, not strict full-catalog `universeSignoff`. If Trusted Review Universe health is unavailable, or if trusted membership page loading fails, returns null/undefined, returns an unexpected empty page, or under-returns before the expected scan limit, the run persists `NO_REVIEW`, publishes no candidates, and records `Trusted Review Universe unavailable or not ready; Today Review cannot publish candidates.` plus the detailed membership failure reason. `NO_REVIEW` publishes no candidates with warnings; `LIMITED_REVIEW` runs the Lite workflow with coverage warnings; `FULL_REVIEW` runs normal generation.
- Configured partial scans are allowed only when `TODAY_REVIEW_TRUSTED_SCAN_LIMIT` intentionally caps the trusted set below `trustedCount`; the persisted scan funnel must show `trustedLoadStatus=CONFIGURED_PARTIAL`, the scan limit, instruments scanned/skipped, and scan ordering. Membership load failures are not treated as partial scans.
- Strategy Decision entry/exit candidates are filtered to the trusted instrument ids/symbols loaded for the run. A Strategy Decision candidate outside that trusted snapshot must not appear in any Today Review candidate section.
- Today Review Lite can create OHLCV price-action candidates from trusted instruments when Strategy Decision coverage is sparse. Lite eligibility requires current latest EOD, at least 120 OHLCV bars, recent volume, and no critical corporate-action blocker.
- Missing sector, industry, market cap, ISIN, or listing date is a context gap for Lite candidates, not a hard blocker.
- Lite promoted candidates require valid entry/stop/target geometry and `PROVEN` or `WEAK` historical OHLCV evidence. `UNPROVEN` evidence maps to `WATCH_ONLY`.
- Promoted long review candidates require Strategy Decision evidence, Strategy Framework proof, acceptable data quality, acceptable market gate, and valid Trade Plan geometry.
- Market gate `CLOSED` blocks new long review candidates.
- Trade-plan `BLOCKED` or hard geometry blockers force `BLOCKED`.
- Positive proof/readiness reasons never override hard blockers.

## Ranking

Phase 1 score is transparent and capped at 0-100:
- Strategy proof/rating/readiness: 25
- Trade-plan reward/risk and geometry: 20
- Market/regime alignment: 15
- Sector alignment: 10
- Signal/calibration support: 10
- Data quality/freshness/liquidity: 15
- Smart-money confirmation: 5

Hard blockers override score to zero and grade `D`.

Lite score uses a separate transparent price-action blend:
- signal/setup strength: 30
- OHLCV historical evidence: 25
- reward/risk: 20
- liquidity/volume: 15
- data freshness: 10
- context-gap and risk penalties subtract confidence

Grades:
- `A`: strong review candidate
- `B`: valid but lower priority
- `C`: watch only
- `D`: avoid / blocked
- `UNPROVEN`: insufficient proof or evidence

## Endpoints

All routes are under `/api/v1` and require authentication.

- `GET /today-review/latest?region=IN&assetType=STOCK`
  - Returns the latest `COMPLETED` or `PARTIAL` run with grouped candidates.
- `GET /today-review/runs?region=IN&assetType=STOCK&limit=20&offset=0`
  - Returns run history.
- `GET /today-review/runs/:id`
  - Returns one run and grouped candidates.
- `GET /today-review/candidates/:id`
  - Returns persisted candidate detail snapshots.
- `POST /today-review/run`
  - Builds or rebuilds today's run for the requested scope.

## Frontend

Routes:
- `/today-review`
- `/today-review/candidates/:candidateId`

The list page shows:
- scope, last run, data-through date, run status, trust status, and rerun action
- review mode, target session, required data-through, stored data-through, trusted universe count, catalog count, coverage warnings, and scan funnel counts
- summary cards
- grouped sections for Long Review, Exit Risk / Short Review, Watch Only, and Blocked
- scan fields for entry zone, stop/invalidation, target/reward, reward/risk, confidence, grade, data freshness, data quality, proof, market/regime, sector alignment, reason, and blocker

The detail page shows:
- business reason
- strategy proof panel
- market context panel
- data quality panel
- trade plan panel
- entry, stop/invalidation, target/reward, reward/risk
- failure and "do nothing unless" conditions
- blockers, warnings, and drilldown links

## Verification Commands

Backend:

```bash
npm test -- --runInBand --runTestsByPath tests/modules/today-trade-review/today-trade-review.service.test.ts tests/modules/today-trade-review/today-trade-review.controller.test.ts
npm run build
```

Frontend:

```bash
npm run test:ui -- today-trade-review.spec.ts --workers=1
npm run build
```

When Prisma schema changes:

```bash
npx prisma generate
```
