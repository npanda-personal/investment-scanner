# CF-W2-TSC-05 Today Review No-Target Ranking Eligibility Contract

Date: 2026-05-25

Owner: Team 03 - Architecture Factory

## Status

Stacked child contract prepared for sequencing only.

This contract applies to the future bounded child:

- `CF-W2-TSC-05A-TREV-RANKING-ELIGIBILITY-REFRAME`

Current verdict: not Ready. The child must stack on accepted `CF-W2-TSC-04A-TREV-CANDIDATE-LANGUAGE` once Team 00 records the exact accepted branch/commit. Current main still contains pre-`TSC-04A` Today Review language and semantics.

## Purpose

Remove target/reward, reward/risk, and trade-plan-geometry dependence from Today Review candidate promotion, ranking, and eligibility semantics while preserving research-support behavior:

- source-proven entry trigger evidence;
- strategy/rule/version provenance;
- data-quality readiness and freshness;
- current signal health and blockage state;
- documented invalidation/risk context;
- supporting trust evidence already approved for reuse;
- explicit missing-evidence honesty.

This remains research-support only. It must not become a target-price workflow, reward/risk workflow, paper-review workflow, direct-action workflow, or automated trade instruction flow.

## Required Base

The child must stack on accepted `CF-W2-TSC-04A-TREV-CANDIDATE-LANGUAGE`, not on current main.

Required sequencing:

1. Team 07 accepted handoff for `CF-W2-TSC-04A`
2. Team 00-recorded accepted `TSC-04A` branch/commit or merged base
3. released Today Review writer set

If `TSC-04A` lands on a different final commit than currently planned, this contract must follow that accepted base.

## Scope

### In scope

- Today Review service-side ranking and eligibility cleanup
- Lite candidate semantic cleanup to remove target/R:R dependence from trusted rank and promotion
- Today Review explainability/ranking-component cleanup
- Today Review module doc wording for ranking and eligibility
- Today Review list/detail trust messaging that explains promotion and watch/block states
- focused Today Review service and UI smoke coverage

### Out of scope

- current main pre-`TSC-04A` baseline
- repository/controller/router/validation/index edits
- route changes
- route-registry edits
- shared backend utilities
- shared frontend UI
- schema or migrations
- package or generated-file changes
- upstream module source changes
- Pipeline Ops controls or page-local manual trigger controls
- Trade Plan engine rewrite
- provider/live-data, startup/backfill, paid/cloud, broker, telemetry, or credential work

## Allowed Files

- `backend/src/modules/today-trade-review/today-trade-review.types.ts`
- `backend/src/modules/today-trade-review/today-trade-review.service.ts`
- `backend/src/modules/today-trade-review/today-trade-review.md`
- `backend/tests/modules/today-trade-review/today-trade-review.service.test.ts`
- `frontend/src/features/today-trade-review/types.ts`
- `frontend/src/features/today-trade-review/components/TodayReviewPage.tsx`
- `frontend/src/features/today-trade-review/components/TodayReviewCandidateDetailPage.tsx`
- `frontend/tests/ui/today-trade-review.spec.ts`

## Forbidden Files

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
- all source/tests outside the allowed Today Review file set

## Required Semantics

### Trusted ranking and promotion basis

Trusted candidate rank and promotion may use:

- source-proven trigger price / entry evidence;
- strategy code, rule evidence, and version provenance;
- data-quality readiness, currentness, liquidity, and coverage status;
- market gate and signal health where they are not target-shaped proxies;
- rule-based invalidation/risk context;
- supporting calibration/backtesting/status evidence;
- explicit missing-evidence and waiting-on-refresh honesty.

### Disallowed target-shaped dependence

Trusted candidate rank, state, and promotion must stop using:

- `rewardRiskRatio`
- target price or target range
- target quality or target method
- synthetic Lite `2R/3R` target generation
- modeled reward
- paper-review or paper-readiness thresholds
- trade-plan geometry as trusted promotion evidence

Compatibility-only trade-plan payload fields may remain readable, but they must not decide:

- `LONG_REVIEW` / `WATCH_ONLY` / `BLOCKED` / `AVOID` state
- candidate score
- candidate rank
- promotion reason text

### Lite-candidate boundary

- Lite eligibility may still require trusted-universe membership, sufficient OHLCV history, recent volume, and hard invalidation sanity.
- Lite trusted ranking must not depend on synthetic target creation or reward/risk thresholds.
- If Lite compatibility fields remain in `tradePlanSnapshot`, they are compatibility-only and not a trusted score input.

### Strategy-candidate boundary

- Today Review may continue reading public Trade Plan outputs for documented invalidation/risk context.
- Today Review must stop treating raw `planStatus`, `paperReadinessStatus`, `paperReadinessReasons`, target fields, or `rewardRiskRatio` as trusted promotion/rank inputs when those are target-shaped compatibility semantics.
- If the existing public fields do not allow that distinction honestly, stop and split a new upstream blocker packet instead of widening this child.

### Explainability and UI

- Ranking breakdowns and promotion reasons must align to the no-target policy.
- `Trade plan` / `reward/risk` / `paper review` / `Trade-plan proof-chain` must not survive as trusted ranking explanations on touched surfaces.
- Compact status may remain read-only only; no local pipeline controls are allowed.

## Explicit Non-Goals

- No new shared scoring model
- No route or schema change
- No Today Review persistence rewrite
- No Trade Plan engine rewrite
- No Strategy Decision rewrite
- No Data Quality or Pipeline Ops source edit
- No Ready promotion from current main

## Stop Conditions

Stop and split again if truthful implementation requires:

- `trade-plan-risk-engine` source edits
- `strategy-decision-engine` source edits
- repository/controller/router/validation/index edits
- route or route-registry edits
- shared UI or shared backend utility edits
- package changes
- schema, migration, or generated-file changes
- inability to separate documented invalidation/risk blockers from target/paper-review blockers using current Today Review-visible fields

## One-Writer Rule

One writer only across the full Today Review backend/frontend reservation.

Do not run this child in parallel with `CF-W2-TSC-04A` or any other Today Review source packet.

## Readiness Note

As of 2026-05-25:

- parent `CF-W2-TSC-05` is not Ready;
- child `CF-W2-TSC-05A-TREV-RANKING-ELIGIBILITY-REFRAME` is defined but intentionally blocked;
- current main is not an acceptable implementation base;
- the next valid base is the accepted future `CF-W2-TSC-04A` branch/commit once Team 00 records it.
