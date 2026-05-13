# Phase 0 QA Plan - Trusted Data Baseline And Data Quality Use-Case Tiers - 2026-05-14

## Scope And Sources

- Roadmap source: `docs/codex-agent-team-plan/po-roadmaps/2026-05-14-lead-po-autonomous-strategy-roadmap.md`
- Data-foundation roadmap source: `docs/codex-agent-team-plan/po-roadmaps/2026-05-14-associate-po-data-foundation-roadmap.md`
- Market Data contract anchors:
  - `docs/architecture.md`
  - `docs/module-verification-register.md`
  - `backend/src/modules/market-data-foundation/market-data-foundation.md`
- Data Quality contract anchors:
  - `backend/src/modules/data-quality-engine/data-quality-engine.md`
  - `backend/src/modules/data-quality-engine/data-quality-engine.types.ts`
  - `frontend/src/features/data-quality-engine/types.ts`

## Phase 0 Verification Goal

Prove the system can trust its `IN / STOCK` universe before downstream decisions, and prove Data Quality reports separate readiness tiers by use case instead of collapsing them into one generic score.

Roadmap intent to verify:

- Trusted Data Baseline reaches a durable `LIMITED_REVIEW` floor before aiming at `FULL_REVIEW`.
- Every active stock has an explicit classification path, not just a generic partial state.
- Data Quality separates:
  - daily review readiness,
  - signal readiness,
  - backtest readiness,
  - calibration readiness,
  - automation readiness.

## Acceptance Verification Plan

1. Verify the canonical review readiness summary for `region=IN&assetType=STOCK`.
   - Confirm the API returns `reviewMode`, `trustStatus`, `userDecision`, `reviewUniverse`, `readinessCounts`, `nextAction`, and `blockers`.
   - Confirm the summary is fail-closed and still exposes bounded repair guidance when review is not yet trustworthy.
   - Confirm `trustedCount` and `reviewReady` do not rise from shallow history alone.

2. Verify Market Data classification remains explicit and conservative.
   - Confirm active stocks can be distinguished as complete, fallback needed, incomplete after fallback, listing-date missing, identity repair needed, retry-blocked, or manual review.
   - Confirm the UI and API do not hide missing depth, stale EOD, missing volume, or identity gaps behind a generic success state.

3. Verify Data Quality exposes separate use-case tiers.
   - Confirm the API and UI distinguish review, signal, backtest, calibration, and automation readiness.
   - Confirm `READY`, `LIMITED`, and `NOT_READY` remain meaningful per use case instead of being reused as a single universal answer.
   - Confirm downstream wording does not imply automation eligibility when only review-level readiness exists.

4. Verify consumers stay conservative.
   - Today Review must consume the Market Data review-readiness summary without contradicting it.
   - Data Quality must display Market Data-owned review state as display-only context, not recalculate trust.
   - Any limited or unavailable state must remain visible in the consumer pages.

## Regression Scope

- Backend semantic coverage:
  - `backend/tests/modules/market-data-foundation/market-data.universe.test.ts`
  - `backend/tests/modules/today-trade-review/today-trade-review.service.test.ts`
  - `backend/tests/modules/data-quality-engine/data-quality-engine.service.test.ts`
  - `backend/tests/modules/data-quality-engine/data-quality-engine.validation.test.ts`
  - `backend/tests/modules/data-quality-engine/data-quality-engine.routes.test.ts`
- Frontend smoke coverage:
  - `frontend/tests/ui/market-data-foundation.spec.ts`
  - `frontend/tests/ui/data-quality-engine.spec.ts`
  - `frontend/tests/ui/today-trade-review.spec.ts` if the summary contract or wording changes
- Shared contract risk area:
  - review-readiness DTO shape
  - tier labels and filter labels
  - no-review and limited-review copy
  - bounded batch request payloads

## Expected Evidence

### Backend Evidence

- Passing semantic tests proving:
  - canonical `review-readiness-summary` behavior for `IN / STOCK`
  - explicit trust/baseline classification
  - data-quality tier separation
  - conservative consumption by Today Review
- Route and validation evidence proving:
  - allowed endpoints remain unchanged
  - `region`, `assetType`, `limit`, `offset`, and batch fields are clamped and parsed safely

### Frontend Evidence

- Browser smoke showing:
  - trusted review summary is visible on the Data Quality page
  - review mode, trust status, next action, and batch size are readable
  - tier filters or tabs reflect the separate use-case readiness model
  - no generic loading or blank state persists for the stable local dataset

### Runtime Evidence

- One bounded local capture from the already running app, not a new heavy job:
  - `GET /api/v1/market-data/review-readiness-summary?region=IN&assetType=STOCK`
  - `GET /api/v1/data-quality/summary?region=IN&assetType=STOCK`
  - `GET /api/v1/data-quality/signal-readiness?region=IN&assetType=STOCK`
  - `GET /api/v1/data-quality/liquidity?region=IN&assetType=STOCK`
  - `GET /api/v1/today-review/latest?region=IN&assetType=STOCK`
- Capture the payloads or screenshots that show the same scope and no contradictory readiness claims.

## Live-Data Checks

- Verify the `IN / STOCK` review summary mode and trust status are internally consistent.
- Verify the trusted universe counts do not claim review readiness from catalog size alone.
- Verify review-mode data through date, required data through date, and stored data through date are surfaced together.
- Verify Data Quality tier output matches the intended use case:
  - daily review can be limited while backtest or calibration stays blocked
  - missing history stays visible as a history trust issue, not as a generic failure
- Verify Today Review does not publish candidates from a missing or contradictory trusted-universe state.

## Memory-Safe Sequencing

1. Read the roadmap and contract docs first.
2. Inspect the backend and frontend contract files next.
3. Re-check the focused tests for the exact DTOs and labels.
4. Use mocked UI smoke for non-bulk visibility only.
5. If runtime capture is needed, use the existing local services only and keep the session to one narrow `IN / STOCK` evidence pass.
6. Do not start new heavy servers, long repair jobs, or provider-heavy actions during QA planning.
7. Keep the repository memory gate in mind: avoid starting any new process-heavy verification when memory is at or above 95%, and wait for it to fall below 90% before adding more work.

## Blockers

- No implementation evidence has been provided yet for this Phase 0 slice.
- QA signoff is not allowed before the implementation handoff and runtime evidence arrive.
- Any fallback to paid providers, paid tools, or broad provider-heavy repair work is out of scope and would block acceptance.
- If the live dataset still returns `NO_REVIEW` or `NOT_TRUSTWORTHY`, that is a valid current blocker and must be reported, not papered over.
- If the Data Quality tier model collapses the requested use cases into one score, that is a contract blocker.

## Verification Priority

1. Trusted review baseline for `IN / STOCK`.
2. Separate Data Quality tiers by use case.
3. Conservative consumer behavior in Today Review and Data Quality UI.
4. Bounded evidence capture from existing local services.
5. Only then revisit signoff.

## Handoff Status

Blocked on implementation and runtime evidence.
