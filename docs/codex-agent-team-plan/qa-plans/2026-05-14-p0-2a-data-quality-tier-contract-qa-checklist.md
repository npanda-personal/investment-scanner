# P0.2A QA Checklist - Data Quality Use-Case Tier Contract

Date: 2026-05-14
Mode: QA Verification Planning Mode
Status: Blocked (implementation evidence pending)
Owner: QA Shadow (P0.2A)

## Scope

- Packet: `P0.2A - Data Quality Use-Case Tier Contract`
- Primary verification target: Data Quality tier contract and its use of Market Data trusted-baseline inputs for IN/STOCK.
- No runtime edits in this artifact pass; do not modify source code here.

## Acceptance Criteria Checklist

- [ ] Distinct use-case tiers are exposed for:
  - `dailyReview`
  - `signal`
  - `backtest`
  - `calibration`
  - `automation`

- [ ] Tier state enum supports exactly the required states and is consistent across:
  - API contract (list/detail/summary responses)
  - stored evaluation DTOs
  - filter/query behavior

  Required states: `READY`, `LIMITED`, `BLOCKED`

- [ ] `automation` is always `BLOCKED` in Phase 0.
  - Required reason code appears as `PHASE0_AUTOMATION_NOT_AUTHORIZED`.

- [ ] `backtest` and `calibration` remain non-promotable from insufficient data:
  - shallow price depth
  - missing/unknown listing-date confidence
  - missing trust context from Market Data

- [ ] Existing generic score fields (e.g., readiness/liquidity/coverage scores) remain in payload as **transitional evidence only** and are not treated as primary readiness decisions for backtest/calibration/automation promotion.

- [ ] Route validation remains bounded and safe:
  - pagination limits are clamped (`limit`, `offset`, `cursor`-derived paths)
  - evaluation batch size is clamped to safe max/mins
  - unknown/invalid readiness/filter parameters fall back safely without throwing

## Required Evidence From Developer Handoff

1. Focused tests added/updated (must pass):
   - `backend/tests/modules/data-quality-engine/data-quality-engine.validation.test.ts`
   - `backend/tests/modules/data-quality-engine/data-quality-engine.service.test.ts`
   - `backend/tests/modules/data-quality-engine/data-quality-engine.routes.test.ts`
   - `backend/tests/modules/data-quality-engine/data-quality-engine.repository.test.ts` (if filter/query surfaces changed)

2. Bounded API evidence capture (IN/STOCK scope only, no heavy jobs):
   - `GET /api/v1/data-quality/summary?region=IN&assetType=STOCK`
   - `GET /api/v1/data-quality/instruments?region=IN&assetType=STOCK&limit=25&offset=0`
   - `GET /api/v1/data-quality/instruments/<instrumentId>` (one known stock with blocked and one limited case)
   - `GET /api/v1/market-data/review-universe?region=IN&assetType=STOCK&limit=25&offset=0`
   - `GET /api/v1/market-data/review-readiness-summary?region=IN&assetType=STOCK`

3. Evidence expectations in payloads:
   - each instrument exposes all 5 tier values (where available)
   - each tier value includes explicit state + blocker/reason evidence
   - at least one stock demonstrating:
     - dailyReview limited
     - backtest blocked
     - calibration blocked
     - automation blocked + `PHASE0_AUTOMATION_NOT_AUTHORIZED`
   - same symbol cannot be marked automation-ready from score-only evidence

## QA Rejection Triggers

- Missing any one of the 5 required tier keys in API responses for scoped IN/STOCK instruments.
- Any tier using states outside `READY/LIMITED/BLOCKED` or mixing contract state names (`NOT_READY`, legacy generic states) in the same surface.
- `automation` not hard-blocked, or missing explicit `PHASE0_AUTOMATION_NOT_AUTHORIZED`.
- Promotion of backtest/calibration to `READY` when:
  - deep-history prerequisites are not met, or
  - listing-date confidence is absent.
- Any path where generic score/range is used as the sole gate for readiness output.
- Validation allowing unbounded requests (`limit`, `offset`, `batchSize`) after parse/route validation.
- API/evidence indicates different tier behavior per endpoint without deterministic shared contract mapping.
