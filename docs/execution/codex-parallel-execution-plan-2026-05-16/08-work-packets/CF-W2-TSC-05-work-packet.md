# CF-W2-TSC-05 Work Packet

Date: 2026-05-25

## Work Item

Parent requirement:

- `CF-W2-TSC-05 - Today Review no-target ranking and eligibility reframe`

Bounded future child:

- `CF-W2-TSC-05A-TREV-RANKING-ELIGIBILITY-REFRAME`

## State

Docs-only sequencing prep completed.

Current verdict: `Not Ready for implementation`.

This packet is intentionally stacked behind accepted `CF-W2-TSC-04A-TREV-CANDIDATE-LANGUAGE`. Current main still contains the pre-`TSC-04A` Today Review list/detail/spec wording and service semantics, so Team 00 must not promote `CF-W2-TSC-05A` from the current workspace state.

## Owner / Lane / Module

- Architecture owner: Team 03 - Architecture Factory
- Future implementation owner: Team 07 - Portfolio / Watchlist / Alerts / Today Review
- Lane: Lane 3 with accepted Lane 2 evidence inputs only
- Backend module: `today-trade-review`
- Frontend feature: `today-trade-review`

## Hard Sequencing Dependency

Required before any Ready discussion:

- accepted `CF-W2-TSC-04A-TREV-CANDIDATE-LANGUAGE`
- Team 00-recorded accepted `TSC-04A` branch/commit or merged base
- released Today Review writer set from Team 07

Do not start from:

- current main workspace state
- plain `dev`
- any Today Review baseline that still shows pre-`TSC-04A` target/R:R language

## Smallest Honest Future Child

Add one Today Review-owned semantic cleanup packet that:

- preserves accepted `TSC-04A` no-target language cleanup as the base;
- removes target/reward, reward/risk, paper-readiness, and trade-plan-geometry dependence from Today Review rank, promotion, and eligibility;
- stops Lite candidate trusted ranking from depending on synthetic `2R/3R` target math;
- keeps source-proven trigger evidence, rule/version provenance, DQ readiness, signal health, supporting evidence, and documented invalidation/risk context as the trusted basis;
- keeps compatibility-only trade-plan payload fields out of trusted score/state decisions;
- updates Today Review module docs and focused tests/specs to the same semantic boundary.

## Exact File Reservations

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

- Prisma schema or migrations
- generated files
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

## Required Behavior

The future child must:

- keep the work fully inside the reserved Today Review files;
- remove `rewardRiskRatio`, target price/range, target method, modeled reward, paper-review thresholds, and trade-plan geometry from Today Review trusted rank/state decisions;
- preserve source-proven trigger evidence, strategy/rule/version provenance, DQ readiness, signal health, and documented invalidation/risk context as the ranking basis;
- keep compatibility-only trade-plan payloads out of trusted promotion reasons and ranking components;
- keep Today Review list/detail status read-only and avoid local pipeline controls;
- avoid direct buy/sell or advice-like wording.

## Branch / Worktree Recommendation

Only after Team 00 has the accepted `TSC-04A` base:

- Branch: `codex/team07-portfolio-alerts/CF-W2-TSC-05A-TREV-RANKING-ELIGIBILITY`
- Worktree: `../investment-scanner-worktrees/team07-CF-W2-TSC-05A`
- Base: accepted `CF-W2-TSC-04A` commit `TBD by Team 00`

Reason:

- this is the same Today Review writer set as `TSC-04A`;
- it must stack directly on the accepted no-target language cleanup;
- it must stay isolated from active Team 07 `TSC-04A` work until that worktree is released.

## QA Handoff Recommendation

Future Team 04 planning should start only after the accepted `TSC-04A` base is available.

Recommended focus:

- prove that reward/risk and target-shaped compatibility fields no longer determine candidate state or order;
- prove that Lite candidates no longer depend on synthetic target math for trusted promotion;
- prove that documented invalidation/risk blockers still work where they are rule-based and evidence-backed;
- prove that DQ readiness, signal health, supporting evidence, and missing-evidence honesty remain visible;
- prove that touched list/detail/spec surfaces do not reintroduce target/R:R trust wording after the semantic rewrite;
- reject the packet if truthful implementation requires upstream Trade Plan or Strategy Decision edits.

## Stop Conditions

Stop and return to Team 00 / Team 03 if implementation requires:

- upstream `trade-plan-risk-engine` or `strategy-decision-engine` source edits
- schema, migration, or generated-file changes
- repository/controller/router/validation/index edits
- route or route-registry changes
- shared UI or shared backend utility changes
- package changes
- inability to separate allowed invalidation/risk blockers from target/paper-review blockers using current Today Review-visible fields

## Ready Recommendation

Current result: `Not Ready for implementation`.

Next valid gate:

- wait for accepted `CF-W2-TSC-04A` implementation evidence and exact base commit from Team 00;
- then route this child to Team 04 for a fresh QA plan on that accepted base;
- only after that should Team 00 decide whether `CF-W2-TSC-05A` becomes Ready.
