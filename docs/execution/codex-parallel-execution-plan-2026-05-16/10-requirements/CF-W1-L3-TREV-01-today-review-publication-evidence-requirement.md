# CF-W1-L3-TREV-01 - Today Review Publication Evidence Requirement

Date: 2026-05-18

## Status

Audit-derived future child requirement. Not Ready for Implementation.

## Product Value

Today Trade Review is a daily investor-facing shortlist, so its trust value depends on whether the run explains why it published candidates, why it withheld them, and whether the review-mode snapshot matches the Market Data readiness summary. A daily review surface is only useful if users can tell the difference between full evidence, limited evidence, partial coverage, and no-review fallback without guessing.

## Evidence

- `backend/src/modules/today-trade-review/today-trade-review.md` defines `reviewReadiness`, `reviewUniverse`, and `scanFunnel` persistence, plus `NO_REVIEW`, `LIMITED_REVIEW`, `FULL_REVIEW`, and `CONFIGURED_PARTIAL` run states.
- The same module doc says Today Review persists `Trusted Review Universe unavailable or not ready; Today Review cannot publish candidates.` when trusted membership cannot be loaded reliably.
- `backend/src/modules/today-trade-review/today-trade-review.service.ts` treats `review-readiness-summary` as authoritative, warns on `NO_REVIEW`, and records trusted-load failure reasons and scan-order metadata.
- `frontend/src/features/today-trade-review/components/TodayReviewPage.tsx` shows review mode, required/stored data-through, trusted-universe count, scan funnel counts, and an explicit mismatch warning when Today Review readiness mode diverges from the Market Data summary snapshot.
- `frontend/src/features/today-trade-review/components/TodayReviewCandidateDetailPage.tsx` already treats Today Review as research-support only and exposes DQ tiers as read-only context, which means the missing requirement is about publication evidence and coherence, not a new advice surface.

## Acceptance Criteria

- Today Review run snapshots clearly distinguish `NO_REVIEW`, `LIMITED_REVIEW`, `FULL_REVIEW`, and configured partial scans.
- When readiness is missing or mismatched, the persisted run explains why candidates were published, suppressed, or downgraded.
- The review surface exposes the review-mode source, required/stored data-through, trusted-universe availability, scan completion, and membership failure reason.
- Strategy Decision entries outside the trusted snapshot remain excluded from all Today Review candidate sections.
- Candidate detail snapshots continue to show review evidence as read-only research support, not advice or automation.
- Focused tests cover full-review, limited-review, no-review, mismatch, and missing-readiness scenarios.

## Non-Goals

- No changes to strategy generation, calibration math, trade-plan geometry, market-context algorithms, or Data Quality scoring.
- No Prisma schema, route registry, shared utility/UI, package manifest, provider, or telemetry work.
- No target prices, buy/sell advice, automation authorization, or broker execution.
- No broad UI redesign outside the existing Today Review flow.

## Future Candidate Files After Ready Promotion

- `backend/src/modules/today-trade-review/today-trade-review.service.ts`
- `backend/src/modules/today-trade-review/today-trade-review.types.ts`
- `backend/src/modules/today-trade-review/today-trade-review.md`
- `frontend/src/features/today-trade-review/components/TodayReviewPage.tsx`
- `frontend/src/features/today-trade-review/components/TodayReviewCandidateDetailPage.tsx`
- `frontend/tests/ui/today-trade-review.spec.ts`

## Next Gate

Product refinement and an architecture contract for bounded Today Review publication evidence and readiness-coherence behavior, then QA planning and Team 00 Ready evaluation after an exact implementation handoff exists.
