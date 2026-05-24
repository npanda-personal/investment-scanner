# CF-W2-TSC-05 Today Review No-Target Ranking And Eligibility Reframe Requirement

Date: 2026-05-24

## Product Value

Today Review is being reframed as the main Trusted Signal Candidate workflow. Current module docs and source still treat trade-plan geometry, target/reward fields, and reward/risk thresholds as part of candidate promotion and ranking. That is a deeper product-trust problem than copy alone: even if UI wording is cleaned up, the workflow can still rank or promote candidates based on target-shaped assumptions the Product Owner no longer wants as trusted candidate evidence.

This requirement keeps Today Review aligned with the research-support direction by removing target/R:R dependence from candidate ranking and promotion semantics while preserving rule-triggered entry evidence, data-quality readiness, signal health, and rule-based exit/invalidation trust.

## Audit Evidence

- `backend/src/modules/today-trade-review/today-trade-review.md` still says Today Review answers where planned entry, invalidation, and reward areas are, and lists trade-plan reward/risk and geometry in the Phase 1 score.
- The same module doc says Lite promoted candidates require valid entry/stop/target geometry and the list/detail surfaces still show target/reward and reward/risk fields.
- `backend/src/modules/today-trade-review/today-trade-review.service.ts` still:
  - penalizes or blocks Lite candidates with reward/risk thresholds,
  - derives Lite target values from fixed risk multiples,
  - uses `tradePlan.rewardRiskRatio` and trade-plan geometry in scoring helpers,
  - emits candidate reasons that still map through trade-plan proof-chain language.
- `frontend/src/features/today-trade-review/components/TodayReviewPage.tsx` still describes the shortlist as built from trusted evidence and trade-plan geometry.

## Requirement

Define a bounded Today Review follow-on that removes target/reward and reward/risk dependence from candidate promotion and ranking semantics.

Trusted candidate ranking should prioritize:

- source-proven rule-trigger entry evidence where available;
- strategy/rule/version provenance;
- data-quality readiness and currentness;
- current signal health or blockage;
- supporting backtesting/calibration/status evidence already approved for reuse;
- reason summary and missing-evidence honesty.

Target/reward, synthetic target levels, reward/risk thresholds, and trade-plan-first geometry must not decide whether a candidate appears trusted or how it is ranked in the trusted workflow.

## Acceptance Criteria

- Today Review candidate promotion and ranking do not require arbitrary target levels, fixed risk-multiple target generation, or reward/risk thresholds.
- If legacy trade-plan compatibility data is present, it is either excluded from trusted candidate ranking logic or explicitly marked compatibility-only where architecture approves.
- Lite candidate logic does not synthesize trusted-looking target evidence from fixed 2R/3R geometry.
- Candidate detail and grouped list continue to show entry evidence, invalidation/risk context, blockers, DQ readiness, supporting trust evidence, and missing-evidence explanations.
- The requirement stays additive and bounded to Today Review source/tests/docs unless Team 03 explicitly proves an upstream dependency must be split first.
- No Prisma/schema, route registry, shared UI, package manifest, generated type, provider/live, startup/backfill, broker, paid service, or broad Trade Plan rewrite is included.

## Non-Goals

- No rewrite of `trade-plan-risk-engine`.
- No new scoring model shared across other modules.
- No new persistence model for candidate snapshots.
- No schema migration.
- No route changes.
- No direct buy/sell advice.
- No attempt to solve Today Review language cleanup, ranking cleanup, and downstream consumer adoption in one unbounded pass unless Team 03 explicitly re-slices it.

## Dependencies

- `CF-W1-TSC-03A-TREV-SUPPORTING-EVIDENCE` should finish first so Today Review reserved files are released.
- `CF-W2-TSC-04` remains the earlier language-cleanup companion; this requirement addresses ranking/promotion semantics, not just copy.
- Team 03 should confirm whether this can remain a Today Review-only read-path change or needs a narrower child split between Lite candidate generation and persisted candidate presentation.

## Likely Module Ownership

- Backend: `today-trade-review`
- Frontend: `today-trade-review`
- QA: candidate ranking regression, no target/R:R leakage, trusted-group ordering, Lite candidate downgrade/compatibility checks
- Architecture: one-writer Today Review reservation after Team 07 releases the current implementation stack

## Status

Planning-only. Do not start implementation while Team 07 owns Today Review implementation files for `CF-W1-TSC-03A-TREV-SUPPORTING-EVIDENCE`.
