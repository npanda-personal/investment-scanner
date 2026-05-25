# CF-W1-TSC-02 Active Signal Health Rule Evidence Contract

Date: 2026-05-25

Owner: Team 03 - Architecture Factory

## Status

Blocked archival contract. Not a current Ready-promotion packet.

This contract documents the historical bounded first child:

- `CF-W1-TSC-02A-TREV-HEALTH`

That child is already accepted and locally committed as `34c9993 feat: add today review active signal health`.

Do not reuse this contract as proof that `CF-W1-TSC-02` is a fresh Ready-candidate now.

## Purpose

Record the bounded contract that was used for the first honest active-signal-health child in Today Review, and freeze the file-reservation boundary so later teams do not reopen it accidentally while the current Today Review no-target sequence is active.

## Historical First Child

- Child: `CF-W1-TSC-02A-TREV-HEALTH`
- Historical base: accepted `CF-W1-TSC-01A-TREV` commit `9fbc989`
- Historical accepted outcome: local commit `34c9993 feat: add today review active signal health`

This contract is now historical traceability. It is not permission to start a new `CF-W1-TSC-02` implementation pass.

## Current Reopen Rule

If Product wants more active-signal-health scope after the current Today Review no-target stack:

1. Team 02 must define a new residual child requirement.
2. Team 03 must issue a new architecture/contract/work-packet set.
3. The new child must stack on the accepted post-`CF-W2-TSC-04A` or post-`CF-W2-TSC-05A` base that Team 00 records.
4. Do not reopen this historical contract unchanged.

## Historical Scope

### In scope for the consumed first child

- Today Review candidate-row health projection
- Today Review candidate-detail health projection
- additive Today Review backend/frontend types
- additive health mapping in Today Review service
- focused Today Review service and UI smoke coverage

### Out of scope

- new persistence
- repository/controller/router/validation/index edits
- route changes
- route-registry edits
- shared backend utilities
- shared frontend UI
- schema or migrations
- package or generated-file changes
- upstream module source changes
- new page or new monitor route
- durable health history
- provider/live-data, startup/backfill, paid/cloud, broker, telemetry, or credential work
- later supporting-trust evidence slices

## Provisional Future Allowed Files

No new implementation reservation is active under this contract now.

If Team 00 later opens a new residual health child, the only plausible Today Review-local writer set remains:

- `backend/src/modules/today-trade-review/today-trade-review.types.ts`
- `backend/src/modules/today-trade-review/today-trade-review.service.ts`
- `backend/src/modules/today-trade-review/today-trade-review.md`
- `backend/tests/modules/today-trade-review/today-trade-review.service.test.ts`
- `frontend/src/features/today-trade-review/types.ts`
- `frontend/src/features/today-trade-review/components/TodayReviewPage.tsx`
- `frontend/src/features/today-trade-review/components/TodayReviewCandidateDetailPage.tsx`
- `frontend/tests/ui/today-trade-review.spec.ts`

These files are currently collision-blocked by active `CF-W2-TSC-04A-TREV-CANDIDATE-LANGUAGE` and stacked `CF-W2-TSC-05A-TREV-RANKING-ELIGIBILITY-REFRAME`.

## Forbidden Files

- `backend/src/modules/today-trade-review/today-trade-review.repository.ts`
- `backend/src/modules/today-trade-review/today-trade-review.controller.ts`
- `backend/src/modules/today-trade-review/today-trade-review.router.ts`
- `backend/src/modules/today-trade-review/today-trade-review.validation.ts`
- `backend/src/modules/today-trade-review/index.ts`
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
- all source/tests outside the Today Review-local writer set

## Historical Semantics Preserved For Reference

The consumed first child defined one additive health projection with these states only:

- `ACTIVE`
- `HEALTHY`
- `WEAKENING`
- `RISK_WARNING`
- `EXIT_TRIGGERED`
- `INVALIDATED`
- `EXPIRED`
- `BLOCKED`

Guardrails:

- stronger states required current rule/version evidence;
- missing proof could not silently promote a candidate;
- blocked or missing Data Quality could not produce a trusted healthy state;
- target prices, synthetic profit targets, reward/risk ratios, Trade Plan geometry, and price movement alone were not valid health proof.

These semantics remain the accepted reference point. A future residual child must preserve them unless Product Owner direction and a new architecture packet say otherwise.

## Sequencing Note

Do not start any new `CF-W1-TSC-02` implementation pass:

- in parallel with `CF-W2-TSC-04A`;
- ahead of stacked `CF-W2-TSC-05A`;
- from current main;
- by reusing this historical contract as if the first child were still pending.

## Readiness Note

As of 2026-05-25:

- parent `CF-W1-TSC-02` is blocked;
- historical child `CF-W1-TSC-02A-TREV-HEALTH` is already complete;
- no fresh residual child contract exists yet;
- the current Today Review writer set is occupied by `TSC-04A` and reserved next for `TSC-05A`.
