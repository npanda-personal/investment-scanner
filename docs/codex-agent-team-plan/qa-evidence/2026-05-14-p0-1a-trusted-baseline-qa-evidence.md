# P0.1A QA Evidence - Market Data Trusted Baseline DTO And Residual States

Date: 2026-05-14
Mode: Final QA Verification Mode
Checklist: `docs/codex-agent-team-plan/qa-plans/2026-05-14-p0-1a-trusted-baseline-qa-checklist.md`
Owned artifact: `docs/codex-agent-team-plan/qa-evidence/2026-05-14-p0-1a-trusted-baseline-qa-evidence.md`

## Final Decision

Decision: `PASS`
Lead validation readiness: `YES - P0.1A can move to Lead validation.`

No rejection reasons remain after the developer revision.

## Revision Verification

The prior HOLD condition is resolved.

1. `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
   - `sourceFallbackReasonForBaseline` now maps manual reasons containing `zero usable price rows` to `YAHOO_ZERO_ROWS` without checking `storedHistoryBars`.
   - Verified source path:
     - `manualRequiredReason` is normalized.
     - official/public fallback wording is required.
     - `/zero usable price rows/i` maps directly to `YAHOO_ZERO_ROWS`.
     - non-Yahoo official fallback remains `OFFICIAL_FALLBACK_ATTEMPTED_STILL_INCOMPLETE`.

2. `backend/tests/modules/market-data-foundation/market-data.service.test.ts`
   - Regression fixture `PARTIALZERO.NS` is present with partial stored history (`priceHistoryBars: 300`).
   - Regression asserts:
     - `trusted_baseline_residual_state: FALLBACK_REQUIRED_AFTER_YAHOO_ZERO_ROWS`
     - `required_history_status: FALLBACK_REQUIRED`
     - `provider_fallback_state: YAHOO_INSUFFICIENT_FALLBACK_REQUIRED`
     - `source_fallback_reason: YAHOO_ZERO_ROWS`

## Checklist Results

1. Additive trusted-baseline DTO fields: `PASS`
   - Trusted baseline fields are added to `V1Instrument` and trusted review instrument DTOs.
   - Runtime source mapping exposes residual state, blocker codes, completed EOD evidence, stored/required history dates, listing-date status, provider/fallback state, primary source, fallback attempts, and source fallback reason.

2. Residual-state exhaustiveness: `PASS`
   - Explicit residual taxonomy covers:
     - `REVIEW_READY`
     - `REQUIRED_HISTORY_INCOMPLETE`
     - `LISTING_DATE_MISSING_REQUIRED_15Y`
     - `FALLBACK_REQUIRED_AFTER_YAHOO_ZERO_ROWS`
     - `FALLBACK_ATTEMPTED_STILL_INCOMPLETE`
     - `CATALOG_IDENTITY_REPAIR_REQUIRED`
     - `RETRY_BLOCKED_PROVIDER_VALIDATION`
     - `UNSUPPORTED_OR_INACTIVE_EXCLUDED`
   - Additional explicit state `PROVIDER_VALIDATION_PENDING` is additive and avoids generic collapse.

3. Listing-date behavior: `PASS`
   - Missing listing date maps to `MISSING_USED_15_YEAR_TARGET`.
   - Missing listing date maps to residual `LISTING_DATE_MISSING_REQUIRED_15Y` before a ready state can be returned.
   - No source-reviewed path promotes missing-listing-date instruments to deep-history readiness.

4. Yahoo/fallback distinction: `PASS`
   - Yahoo zero usable rows maps to `YAHOO_ZERO_ROWS`, `YAHOO_INSUFFICIENT_FALLBACK_REQUIRED`, and `FALLBACK_REQUIRED_AFTER_YAHOO_ZERO_ROWS`.
   - Official/public fallback attempted but still incomplete remains distinct as `OFFICIAL_FALLBACK_ATTEMPTED_STILL_INCOMPLETE` and `FALLBACK_ATTEMPTED_STILL_INCOMPLETE`.
   - Partial stored history no longer changes Yahoo-zero-row classification.

5. Blocker code stability: `PASS`
   - Blocker codes are derived from readiness blockers plus deterministic residual/status additions.
   - The regression test covers stable expected codes through explicit residual/provider/source outputs.

6. `review-readiness-summary` regression: `PASS`
   - Source diff did not remove or rename the existing summary route or summary contract fields.
   - Baseline fields are additive to instrument-level DTO paths; no summary semantic contradiction found in source review.

## Tests And Evidence Reviewed

1. Source review:
   - `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
   - `backend/src/modules/market-data-foundation/market-data-foundation.repository.ts`
   - `backend/src/modules/market-data-foundation/market-data-foundation.types.ts`
   - `backend/tests/modules/market-data-foundation/market-data.service.test.ts`
   - `backend/tests/modules/market-data-foundation/market-data.repository.test.ts`
   - `backend/tests/modules/market-data-foundation/market-data.universe.test.ts`

2. Developer-reported in-band focused test evidence:
   - Command: `npm.cmd run test -- --runInBand tests/modules/market-data-foundation/market-data.service.test.ts`
   - Result: `PASS`, 119 tests passed.

3. QA source checks after revision:
   - Confirmed revised Yahoo-zero-row classification no longer depends on `storedHistoryBars`.
   - Confirmed `PARTIALZERO.NS` partial-history regression assertions are present.

## Skipped Checks

1. QA did not start local backend services or run bounded API snapshots.
   - Reason: final verification instruction allowed source review plus developer-reported in-band backend test evidence, and forbade provider-heavy or unbounded runtime activity.
2. QA did not rerun the backend test locally.
   - Reason: developer handoff included the focused in-band service test result, and the revision was directly verifiable by source/test review.
3. QA did not run frontend, Playwright, provider, or broad repair jobs.
   - Reason: outside P0.1A QA scope and explicitly disallowed for this verification lane.

## Final Rejection Reasons

None.
