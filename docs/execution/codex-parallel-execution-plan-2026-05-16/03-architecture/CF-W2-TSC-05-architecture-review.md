# CF-W2-TSC-05 Architecture Review

Date: 2026-05-25

Owner: Team 03 - Architecture Factory

## Status

SEQUENCING ONLY. NOT READY.

`CF-W2-TSC-05` should not move to Ready from the current main workspace state.

The smallest honest future child is:

- `CF-W2-TSC-05A-TREV-RANKING-ELIGIBILITY-REFRAME`

Current verdict: child definition is prepared, but it must stay explicitly sequenced behind accepted `CF-W2-TSC-04A-TREV-CANDIDATE-LANGUAGE`. Current main still contains pre-`TSC-04A` target/R:R wording and semantics, so `CF-W2-TSC-05A` must stack on the accepted future `TSC-04A` branch/commit once Team 00 records it.

## Evidence Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W2-TSC-05-today-review-no-target-ranking-and-eligibility-reframe-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W2-TSC-04-today-review-no-target-candidate-language-cleanup-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W2-TSC-04-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W2-TSC-04-today-review-no-target-candidate-language-cleanup-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W2-TSC-04A-today-review-no-target-candidate-language-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/13-implementation-evidence/CF-W2-TSC-04A-ready-promotion.md`
- `backend/src/modules/today-trade-review/today-trade-review.md`
- `backend/src/modules/today-trade-review/today-trade-review.service.ts`
- `backend/src/modules/today-trade-review/today-trade-review.types.ts`
- `backend/tests/modules/today-trade-review/today-trade-review.service.test.ts`
- `frontend/src/features/today-trade-review/types.ts`
- `frontend/src/features/today-trade-review/components/TodayReviewPage.tsx`
- `frontend/src/features/today-trade-review/components/TodayReviewCandidateDetailPage.tsx`
- `frontend/tests/ui/today-trade-review.spec.ts`

## Current-State Findings

### 1. Main has not absorbed `CF-W2-TSC-04A` yet

Current main still shows the pre-`TSC-04A` target/R:R language and Trade Plan-first framing that Team 07 is reworking in a separate worktree:

- `TodayReviewPage.tsx` still says the shortlist is built from trusted coverage, supporting evidence, and trade-plan geometry.
- `TodayReviewCandidateDetailPage.tsx` still shows `Target 1 / Target 2 or reward range`, `Reward/risk`, and a `Trade plan` panel.
- `today-trade-review.service.ts` still emits `paper review`, `trade-plan geometry`, and `Trade-plan proof-chain` wording.
- `today-trade-review.spec.ts` still asserts those same strings.

That means `CF-W2-TSC-05A` must not start from current main. It must stack on the accepted future `CF-W2-TSC-04A` branch/commit once available.

### 2. The target/R:R semantic dependence is concentrated inside Today Review

Current Today Review service still uses target-shaped compatibility data in its own ranking and eligibility path:

- Lite candidate promotion downgrades `WATCH_ONLY` on `rewardRiskRatio < 1.2`.
- Lite scoring adds reward/risk points and a reward/risk penalty.
- Lite compatibility generation synthesizes `target1`, `target2`, `target.method = LITE_REWARD_RISK_MULTIPLE`, and `rewardRiskRatio`.
- Strategy candidate watch reasons still add `Reward/risk is below the paper review threshold.`
- Strategy candidate scoring still uses `tradePlanScore()` with `planStatus`, `paperReadinessStatus`, and `rewardRiskRatio`.
- Candidate state still reads `tradePlan.planStatus` and `tradePlan.paperReadinessStatus`.
- Explainability still exposes a `tradePlan` ranking component and `Trade-plan proof-chain` promotion reason.

This is not just stale UI text. The semantic dependence lives in Today Review-owned service logic.

### 3. A bounded Today Review-local child is still feasible after `TSC-04A`

Even with the current dependence, the first honest next child can still remain Today Review-owned because Today Review itself:

- synthesizes Lite compatibility trade-plan fields;
- decides candidate state, watch reasons, blockers, score, rank, and explainability;
- chooses which trade-plan-derived fields are trusted versus compatibility-only on the read path.

That means the first semantic cleanup does not need a Trade Plan engine rewrite, route change, schema change, or shared contract migration if it stays inside Today Review and treats legacy trade-plan data as compatibility-only.

### 4. The child must change semantics, not just labels

After `TSC-04A`, the next child must remove target/R:R dependence from:

- Lite candidate eligibility and score;
- strategy candidate watch-only and blocked logic where the trigger is target/paper-review semantics;
- ranking component breakdowns;
- candidate reason summaries and promotion reasons;
- list/detail trust messaging that explains why a candidate is promoted or deprioritized.

So `CF-W2-TSC-05A` is not another copy pass. It is a Today Review semantic rewrite inside the existing module boundary.

### 5. Upstream ambiguity remains the stop boundary

This child is only honest if Today Review can separate:

- documented invalidation/risk context that is still allowed, from
- target/reward, reward/risk, paper-review, and geometry-only compatibility status that must stop driving ranking or eligibility.

If the current Today Review-visible trade-plan fields cannot make that distinction without upstream source changes, stop and split a separate upstream compatibility packet. Do not widen `CF-W2-TSC-05A` into `trade-plan-risk-engine`, `strategy-decision-engine`, or other modules.

## Architecture Decision

Split `CF-W2-TSC-05` into one bounded stacked child:

- `CF-W2-TSC-05A-TREV-RANKING-ELIGIBILITY-REFRAME`

The child must be:

- Today Review-owned;
- stacked on accepted `CF-W2-TSC-04A-TREV-CANDIDATE-LANGUAGE`, not current main;
- limited to Today Review service/types/doc/tests plus Today Review list/detail/types/spec updates;
- explicitly no-schema, no-route, no-shared-file, no-package, no-provider/live, and no-startup/backfill;
- held out of Ready until Team 07 releases accepted `TSC-04A` implementation and Team 00 can point to the exact base commit.

## Required Semantic Boundary

### Allowed ranking and eligibility inputs

Trusted candidate ranking and promotion may use:

- source-proven entry trigger evidence where available;
- strategy code, rule provenance, and version provenance;
- data-quality readiness, freshness, and liquidity context already owned by current public reads;
- current signal health and blockage state;
- documented invalidation/risk context;
- supporting calibration/backtesting/status evidence already approved for reuse;
- explicit missing-evidence honesty;
- compact read-only freshness or waiting-on-refresh status.

### Disallowed ranking and eligibility inputs

Trusted candidate ranking and promotion must stop using:

- `rewardRiskRatio`
- target price, target range, target2, or modeled reward
- fixed `2R` / `3R` Lite target generation
- target quality or target method
- paper-review or paper-readiness thresholds
- trade-plan geometry as a promotion basis
- raw `TRADE_PLAN_PROOF_CHAIN` labels as trusted promotion evidence

Compatibility-only payload fields may remain readable, but they must not decide rank, state, or eligibility.

## Exact Future File Reservations

### Allowed future implementation files

- `backend/src/modules/today-trade-review/today-trade-review.types.ts`
- `backend/src/modules/today-trade-review/today-trade-review.service.ts`
- `backend/src/modules/today-trade-review/today-trade-review.md`
- `backend/tests/modules/today-trade-review/today-trade-review.service.test.ts`
- `frontend/src/features/today-trade-review/types.ts`
- `frontend/src/features/today-trade-review/components/TodayReviewPage.tsx`
- `frontend/src/features/today-trade-review/components/TodayReviewCandidateDetailPage.tsx`
- `frontend/tests/ui/today-trade-review.spec.ts`

### Forbidden files

- `backend/src/modules/today-trade-review/today-trade-review.repository.ts`
- `backend/src/modules/today-trade-review/today-trade-review.controller.ts`
- `backend/src/modules/today-trade-review/today-trade-review.router.ts`
- `backend/src/modules/today-trade-review/today-trade-review.validation.ts`
- `backend/src/modules/today-trade-review/index.ts`
- `backend/tests/modules/today-trade-review/today-trade-review.controller.test.ts`
- `frontend/src/features/today-trade-review/api/**`
- `frontend/src/features/today-trade-review/hooks/**`
- `frontend/src/features/today-trade-review/routes.tsx`
- backend and frontend route registries
- shared backend utilities
- shared frontend components
- package manifests
- generated files
- Prisma schema or migrations
- `backend/src/modules/trade-plan-risk-engine/**`
- `backend/src/modules/strategy-decision-engine/**`
- `backend/src/modules/signal-generation-engine/**`
- `backend/src/modules/data-quality-engine/**`
- `backend/src/modules/signal-calibration-engine/**`
- `backend/src/modules/backtesting-strategy-lab/**`
- `frontend/src/features/data-quality-engine/**`
- `frontend/src/features/pipeline-ops/**`
- all other source/tests outside the reserved Today Review file set
- provider/live-data, startup/backfill, paid/cloud, broker, telemetry, or credential files

## Sequencing Blocker

Hard blockers before any Ready discussion:

1. Team 07 must finish and obtain acceptance for `CF-W2-TSC-04A-TREV-CANDIDATE-LANGUAGE`.
2. Team 00 must record the exact accepted `TSC-04A` branch/commit or merged base.
3. The Today Review writer set must be released by Team 07.
4. Team 04 should plan QA against that accepted base, not the current main workspace.

Do not run `CF-W2-TSC-04A` and `CF-W2-TSC-05A` in parallel. The writer set is the same.

## QA Handoff Recommendation For Team 04

Recommend Team 00 route `CF-W2-TSC-05A` to Team 04 only after the accepted `TSC-04A` base is available.

Team 04 should then verify that:

- candidates no longer become `WATCH_ONLY`, `BLOCKED`, or lower-ranked because of target/reward, reward/risk, or paper-readiness thresholds;
- Lite candidates no longer rely on synthetic `2R/3R` target math for trusted ranking or eligibility;
- documented invalidation/risk blockers still work where they are rule-based and evidence-backed;
- supporting evidence, DQ readiness, signal health, and missing-evidence explanations remain visible;
- any remaining trade-plan payload surface is compatibility-only and not a trusted ranking input;
- Today Review still shows compact read-only status only and does not gain local pipeline controls;
- any discovered need for upstream Trade Plan or Strategy Decision semantic changes is rejected back to Team 03 / Team 00 as a new blocker packet.

## Ready Recommendation

Parent item `CF-W2-TSC-05`: not Ready.

Child item `CF-W2-TSC-05A-TREV-RANKING-ELIGIBILITY-REFRAME`: defined, but not Ready while current main remains pre-`TSC-04A` and the accepted `TSC-04A` base commit is not yet available in this workspace.
