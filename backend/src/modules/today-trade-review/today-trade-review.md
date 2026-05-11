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
