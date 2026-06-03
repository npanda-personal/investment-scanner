# Today Trade Review

## Objective

Today Trade Review publishes the Phase 1 before-market research-support shortlist for the current market scope, defaulting to `IN / STOCK`.

It answers: which stocks deserve review today, in which direction, why, what entry trigger context applies, what exit or invalidation condition applies, what data quality status is present, and what evidence blocks or weakens the idea.

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
- Risk snapshot compatibility calculation.
- Market-data ingestion or data-quality scoring.
- Market-context generation.
- Portfolio/watchlist personalization.
- Broker execution, live trading, or order workflows.

## Persistence

Prisma models:
- `TodayReviewRun`: one logical run per `runDate + region + assetType`.
- `TodayReviewCandidate`: one candidate per `runId + instrumentId + strategyCode + direction`.

Manual reruns update the same logical daily run instead of creating duplicates. Candidates snapshot the publication-time state so the page does not recompute the full upstream graph on normal load.

Trader-facing latest-run reads skip known seeded connected-chain fixture snapshots such as `TEST_CONNECTED_CHAIN`. Fixture rows may remain in historical storage for test evidence, but they must not dominate the live Daily Review view or hide the latest real current-market run.

Scheduled pipeline automation may call `TodayTradeReviewService.run()` after upstream research projections complete. The scheduled path disables compatibility risk-snapshot generation and uses only persisted upstream evidence, so publication does not trigger legacy plan generation or provider work. Candidate enrichment uses bulk persisted raw-signal, calibration, data-quality, and smart-money lookups where the upstream services expose them; per-candidate fallback lookups remain only for compatibility when a service does not yet expose a bulk persisted reader.

Run source snapshots include `reviewReadiness`, `reviewUniverse`, and `scanFunnel`. `reviewReadiness` records the Market Data Foundation canonical readiness summary consumed by the run: review mode, trust status, user decision, trusted/catalog/provider-supported counts, data-through dates, blocker categories, and the bounded next action. `reviewUniverse` records the compatible Trusted Review Universe fields used for Lite scanning, with its mode/count/date values aligned to `reviewReadiness` when the summary is available. `scanFunnel` records trusted universe count, instruments scanned/skipped, scan limit, scan completeness, scan ordering, trusted membership load status (`COMPLETE`, `CONFIGURED_PARTIAL`, or `LOAD_FAILED`), membership failure reason when applicable, Strategy Decision candidates seen/eligible/excluded, outside-trusted-universe exclusions, setups detected, promoted candidates, watch/unproven counts, blocked counts, no-setup count, and top no-promotion reasons. These fields are persisted in JSON so the UI can explain zero-candidate or limited-coverage runs without recomputing the market-data graph.

Board assembly is a presentation-layer selection over already-scored candidates. It does not change strategy scoring, Lite scoring, Strategy Decision scoring, Market Pulse, Stock Interest, or the Prisma schema. The current board contract is persisted in `sourceSnapshot.boardSelection` and row-level metadata is persisted under `sourceSignalSnapshot.todayReviewBoard`.

Current board contract:
- total maximum board rows: 40
- `LONG_REVIEW`: 20 rows, with 8 Strategy Decision-backed reserve slots, 8 Lite reserve slots, and 4 flexible slots
- `WATCH_ONLY`: 10 rows
- `EXIT_RISK` section: 5 rows from `EXIT_RISK_REVIEW` and `SHORT_REVIEW`
- `SPECIAL_CASES`: 5 rows

`sourceSnapshot.boardSelection` records the contract version, section quotas, eligible counts, displayed counts, Strategy-backed count, Lite count, suppressed count, and fill/backfill reasons. Candidate responses add `boardSection`, `boardSourceType`, `boardReason`, and `boardContractVersion`. Existing candidate state fields and existing groups remain additive-compatible; `groups.specialCases` is added for the special-case section.

Special cases use existing evidence only. Allowed board reasons are Strategy + Lite overlap, Stock Interest overlap, Active Ledger overlap, newly appeared candidate, and high-quality candidate with one missing evidence area.

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
- When Market Data Foundation exposes `review-readiness-summary`, Today Review snapshots and uses its `reviewMode` as authoritative so Today Review does not contradict the Market Data/Data Quality readiness display. The older Trusted Review Universe fields remain populated for compatibility and Lite scan details.
- Configured partial scans are allowed only when `TODAY_REVIEW_TRUSTED_SCAN_LIMIT` intentionally caps the trusted set below `trustedCount`; the persisted scan funnel must show `trustedLoadStatus=CONFIGURED_PARTIAL`, the scan limit, instruments scanned/skipped, and scan ordering. Membership load failures are not treated as partial scans.
- Strategy Decision entry/exit candidates are filtered to the trusted instrument ids/symbols loaded for the run. A Strategy Decision candidate outside that trusted snapshot must not appear in any Today Review candidate section.
- Today Review Lite can create OHLCV price-action candidates from trusted instruments when Strategy Decision coverage is sparse. Lite eligibility requires current latest EOD, at least 120 OHLCV bars, recent volume, and no critical corporate-action blocker.
- Missing sector, industry, market cap, ISIN, or listing date is a context gap for Lite candidates, not a hard blocker.
- Lite promoted candidates require valid entry trigger context, invalidation condition, and `PROVEN` or `WEAK` historical OHLCV evidence. `UNPROVEN` evidence maps to `WATCH_ONLY`.
- Promoted long review candidates require Strategy Decision evidence, Strategy Framework proof, acceptable data quality, acceptable market gate, and valid exit/invalidation evidence from the compatibility risk snapshot.
- Market gate `CLOSED` blocks new long review candidates.
- Trade-plan `BLOCKED` or hard geometry blockers force `BLOCKED`.
- Positive proof/readiness reasons never override hard blockers.

## Ranking

Phase 1 score is transparent and capped at 0-100:
- Strategy proof/rating/readiness: 25
- Exit/invalidation compatibility evidence: 20
- Market/regime alignment: 15
- Sector alignment: 10
- Signal/calibration support: 10
- Data quality/freshness/liquidity: 15
- Smart-money confirmation: 5

Hard blockers override score to zero and grade `D`.

Lite score uses a separate transparent price-action blend:
- signal/setup strength: 30
- OHLCV historical evidence: 25
- exit/invalidation compatibility evidence: 20
- liquidity/volume: 15
- data freshness: 10
- context-gap and risk penalties subtract confidence

This cleanup does not change the numeric ranking weights, candidate ordering, promotion conditions, or strategy logic. Legacy compatibility fields may still feed the existing numeric component until the separately approved ranking/eligibility reframe removes that dependence.

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
- scope, last run, data-through date, run status, and trust status
- review mode, review session, required data-through, stored data-through, trusted universe count, catalog count, coverage warnings, and scan funnel counts
- summary cards, section counts, Strategy-vs-Lite breakdown, and suppressed-count visibility
- grouped sections for Long Review, Exit Risk / Short Review, Watch Only, Special Cases, and Blocked
- scan fields for entry trigger context, exit condition, invalidation condition, confidence, grade, data freshness, data quality, proof, market/regime, sector alignment, reason, and blocker

The detail page shows:
- business reason
- strategy proof panel
- market context panel
- data quality panel
- exit/invalidation evidence panel
- entry trigger context, exit condition, invalidation condition, data quality, and evidence
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
