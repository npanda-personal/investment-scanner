# P0.2A QA Evidence - Data Quality Use-Case Tier Contract

Date: 2026-05-14
Mode: Final QA Verification Mode
Checklist: `docs/codex-agent-team-plan/qa-plans/2026-05-14-p0-2a-data-quality-tier-contract-qa-checklist.md`
Owned artifact: `docs/codex-agent-team-plan/qa-evidence/2026-05-14-p0-2a-data-quality-tier-contract-qa-evidence.md`

## Final Decision

Decision: `PASS`

Lead validation readiness: `YES`

Hold history:
- 2026-05-14 (QA Shadow): `HOLD` because absent trusted-baseline trust context/listing-date confidence could still pass legacy score gates for `signal/backtest/calibration`.

## Rejection Reasons

1. **Resolved:** absent/null trusted-baseline context now fail-closes.
   - In `backend/src/modules/data-quality-engine/data-quality-engine.service.ts`, `useCaseTiers()` sets `trustContextMissing` to `!requiredHistoryStatus` and `listingDateConfidenceMissing` to `!listingDateStatus || listingDateStatus === 'MISSING_USED_15_YEAR_TARGET'`.
   - Missing trust context now adds `TRUST_CONTEXT_MISSING` and `LISTING_DATE_CONFIDENCE_MISSING` reasons and blocks `backtest` and `calibration` (plus `signal`/`dailyReview` fall to `LIMITED`).
   - The repository fallback path (`backend/src/modules/data-quality-engine/data-quality-engine.repository.ts`) mirrors the same fail-closed behavior for persisted rows lacking trust evidence.

2. **Resolved:** `dailyReview` and `signal` are now explicitly limited when trusted context/listing-date is missing.
   - Service-tier construction adds `TIER_REASON_TRUST_CONTEXT_MISSING` and `TIER_REASON_LISTING_DATE_CONFIDENCE_MISSING` to `dailyReview` and `signal` reasons when those inputs are absent.
   - Unit coverage: `backend/tests/modules/data-quality-engine/data-quality-engine.service.test.ts` includes explicit regression for missing trusted fields and expected `LIMITED` states.

3. **Resolved:** `backtest` and `calibration` remain blocked in Phase 0 conditions.
   - Service constructs `backtest`/`calibration` with trust-context/listing-date blockers and `PHASE0_AUTOMATION_NOT_AUTHORIZED` for automation.
   - Regression coverage: `backend/tests/modules/data-quality-engine/data-quality-engine.service.test.ts` and repository coverage ensure blocked outcomes include blocker reasons and automation remains `BLOCKED`.

## Partial Acceptance Evidence

- `data-quality-engine.types.ts` adds `DataQualityUseCaseTiers` with all five required keys and `DataQualityUseCaseTierStatus = READY/LIMITED/BLOCKED`.
- `automation` is set to blocked with `PHASE0_AUTOMATION_NOT_AUTHORIZED` in generated tiers in:
  - `backend/src/modules/data-quality-engine/data-quality-engine.service.ts`
  - `backend/src/modules/data-quality-engine/data-quality-engine.repository.ts`
- Route parse/bounds behavior remains clamped and safe for:
  - `limit` and `offset` in `parseDataQualityQuery`
  - `batchSize` and `offset` (including `cursor`) in `parseDataQualityEvaluateRequest`
- Generic score/blocking signals remain in DTO and tests, preserving transitional fields.

## Tests Run

Executed locally from `backend/`:

- Command: `npm.cmd test -- tests/modules/data-quality-engine --runInBand`
- Result: `PASS` - 4 suites, 17 tests.

- Regression emphasis:
  - `backend/tests/modules/data-quality-engine/data-quality-engine.service.test.ts` now verifies:
    - missing trusted-baseline context/listing-date -> `dailyReview: LIMITED`, `signal: LIMITED`, `backtest: BLOCKED`, `calibration: BLOCKED`
    - shallow trusted-baseline history keeps `dailyReview: LIMITED` but blocks `backtest`/`calibration`
    - `automation` remains `BLOCKED` with `PHASE0_AUTOMATION_NOT_AUTHORIZED`
    - explicit trusted context and listing-date presence yields all use-cases `READY` except `automation`
  - `backend/tests/modules/data-quality-engine/data-quality-engine.repository.test.ts` verifies persisted fallback and explicit mapping behavior when trust evidence is missing.
  - `backend/tests/modules/data-quality-engine/data-quality-engine.validation.test.ts` verifies bounded request handling for offsets/sizes.

## Skipped Checks

- IN/STOCK live evidence captures were not executed in this verifier pass (summary/instruments/detail + review-universe/review-readiness-summary) because the user-scope request was repository-anchored QA re-verification rather than runtime endpoint smoke execution.
- `git diff --check` output on changed files shows only CRLF warnings (line-ending normalization), no functional failures.
