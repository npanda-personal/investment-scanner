# P0.1B Conservative Today Review Read-Only Context Architecture Contract

Date: 2026-05-14  
Mode: Architecture Planning Mode  
Work item: P0.1B - Conservative Today Review Read-Only Context  
Owner lane: Today Review consumer  
Dependency status: P0.2A backend tier contract released at `eff957c`; P0.2B Data Quality UI tier visibility released at `a5c6f26`  
Status: PASS - Ready for implementation under this contract

## 1. Objective

Add trusted-data baseline context and Data Quality use-case tier context to Today Review as read-only evidence, without changing candidate-generation logic in this slice.

This slice is consumer-only:

- Market Data remains trusted-baseline owner.
- Data Quality remains use-case tier owner.
- Today Review displays those outputs conservatively and never recomputes trust logic.

## 2. Ownership And Boundary Contract

## 2.1 Canonical ownership

1. `market-data-foundation` owns baseline truth: review mode, trust status, trusted-universe coverage, stored/required dates, bounded next action, and baseline blocker semantics.
2. `data-quality-engine` owns use-case tiers: `dailyReview`, `signal`, `backtest`, `calibration`, `automation` with tier reasons and evidence.
3. `today-trade-review` consumes both as display-only context.

## 2.2 Forbidden in P0.1B implementation

1. No change to Today Review candidate-selection, ranking, or promotion logic.
2. No new freshness/depth/listing-date/provider heuristics in Today Review.
3. No rewriting of Data Quality or Market Data rule logic inside Today Review.
4. No schema migration and no provider/repair workflow changes.

## 3. Read-Only Consumer Architecture

## 3.1 Run-level context surface (Today Review page)

Today Review run panels should render baseline context from stored run snapshot and latest run payload:

- `sourceSnapshot.reviewReadiness` (Market Data summary)
- `sourceSnapshot.reviewUniverse`
- existing `scanFunnel`

Display intent:

1. Show trusted baseline state first (`reviewMode`, `trustStatus`, required/stored dates, bounded next action).
2. Show inconsistencies as warnings (for example, conflicting mode values between summary fields).
3. Keep all values read-only and traceable to source module labels.

## 3.2 Candidate-level context surface (list + detail)

For each candidate, consume existing `dataQualitySnapshot` fields if present:

- `useCaseTiers` (`dailyReview`, `signal`, `backtest`, `calibration`, `automation`)
- `tierEvidence` (`trustedBaselineResidualState`, `requiredHistoryStatus`, `listingDateStatus`, `trustedBaselineBlockerCodes`, `hasSignalHistory`)

Display intent:

1. Show per-tier status and reason codes as context evidence.
2. Keep automation explicitly policy-blocked when provided by DQ.
3. Never infer a tier if the tier payload is missing.

## 4. Conservative Consumer Rules (Fail-Closed)

Today Review must never become more permissive due to missing context.

Required behavior:

1. If tier payload is missing for a candidate, render explicit context-missing warning and apply a conservative confidence downgrade in the UI layer (display-only), or show a blocker chip; never upgrade confidence/counts.
2. If `dailyReview` tier is `LIMITED` or `BLOCKED`, render explicit limiting/blocking context in candidate surfaces.
3. If higher-use-case tiers (`backtest`, `calibration`, `automation`) are `LIMITED`/`BLOCKED`, render them as constraints, not as eligibility signals.
4. Automation must always render as blocked if present and must never imply execution readiness.

Non-negotiable:

- No candidate can appear better-ranked or more promotable because tier context is absent.

## 5. Reserved Implementation Write Scope

Primary reserved scope for P0.1B implementation:

- `frontend/src/features/today-trade-review/types.ts`
- `frontend/src/features/today-trade-review/components/TodayReviewPage.tsx`
- `frontend/src/features/today-trade-review/components/TodayReviewCandidateDetailPage.tsx`
- `frontend/tests/ui/today-trade-review.spec.ts`

Conditional-only scope (use only if type passthrough is required; no logic edits):

- `backend/src/modules/today-trade-review/today-trade-review.types.ts`

Out of scope:

- `backend/src/modules/today-trade-review/today-trade-review.service.ts`
- any `market-data-foundation` or `data-quality-engine` implementation files
- Prisma schema/migrations

## 6. API/DTO Dependency Assumptions

P0.1B assumes additive, backward-compatible payloads from released dependencies:

1. Market Data review-readiness snapshot remains available under Today Review `sourceSnapshot.reviewReadiness` and `sourceSnapshot.reviewUniverse`.
2. Data Quality candidate snapshot may include:
   - `useCaseTiers` with `READY | LIMITED | BLOCKED`
   - `tierEvidence` with trusted-baseline references and blocker-code hints.
3. Legacy rows without tier fields remain possible; Today Review must degrade safely (context-missing, never context-assumed).
4. Tier reason strings are treated as opaque reason codes/messages; Today Review displays but does not reinterpret them into new business rules.

## 7. Acceptance Criteria

P0.1B implementation is accepted when all conditions are met:

1. Today Review run page shows Market Data trusted-baseline context read-only (mode, trust, required/stored dates, bounded next action).
2. Candidate list/detail show Data Quality use-case tiers and reasons when present.
3. Missing tier context is explicitly visible and handled conservatively (confidence downgrade and/or blocker semantics at display level).
4. No candidate-generation/ranking logic changes are introduced in this slice.
5. No duplicated freshness/depth/business rule computation appears in Today Review.
6. Automation remains visibly policy-blocked and non-executable in copy/state.
7. Existing run/candidate loading paths remain backward compatible for legacy snapshots.

## 8. QA Evidence Requirements

Required evidence for QA signoff:

1. Focused UI test evidence in `frontend/tests/ui/today-trade-review.spec.ts` covering:
   - tier-present candidate rendering,
   - tier-missing candidate rendering (conservative fallback),
   - `LIMITED`/`BLOCKED` tier visibility,
   - automation policy-blocked visibility.
2. Runtime bounded payload evidence from existing local services:
   - `GET /api/v1/today-review/latest?region=IN&assetType=STOCK`
   - one sample candidate payload showing `dataQualitySnapshot.useCaseTiers` and `tierEvidence` (or explicit missing-case proof)
3. Negative assertion evidence that no candidate count or promotion group increases due to added context display.

## 9. Risks And Mitigations

1. Risk: UI accidentally implies tier-derived promotion decisions.  
   Mitigation: label tier panel as read-only context and keep grouping logic untouched.

2. Risk: legacy snapshots without tiers appear silently healthy.  
   Mitigation: explicit context-missing state with conservative downgrade/blocker.

3. Risk: future DTO drift between DQ and Today Review types.  
   Mitigation: optional fields with strict null-safe rendering and focused UI tests.

## 10. Rollback Notes

If P0.1B implementation causes misleading or unstable Today Review behavior:

1. Roll back only Today Review UI/context additions in this packet scope.
2. Keep P0.2A/P0.2B contracts intact (no dependency rollback in this packet).
3. Re-verify legacy Today Review rendering and no-run/run states after rollback.

## 11. Blockers And Readiness

Current blockers: none for architecture planning.

Implementation blockers to enforce at handoff:

1. If dependency DTO fields are renamed after `eff957c` / `a5c6f26`, re-baseline this contract before coding.
2. If implementation requires edits outside reserved scope or candidate-generation logic changes, stop and request orchestrator re-scope.

Readiness verdict: **PASS - P0.1B is ready for implementation assignment as a conservative, read-only consumer slice.**
