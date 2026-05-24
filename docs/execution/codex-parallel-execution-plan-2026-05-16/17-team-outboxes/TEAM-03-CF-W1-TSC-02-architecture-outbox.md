# Team 03 Outbox - CF-W1-TSC-02 Architecture Readiness

Date: 2026-05-24

Team: Team 03 - Solution Architect Factory

## Work Item

`CF-W1-TSC-02 - active signal health with rule-backed exit/invalidation evidence`

## Mode

Architecture readiness prep only. No application code implemented.

## Verdict

SPLIT REQUIRED.

The parent should not be promoted directly. One bounded first implementation child is feasible:

- `CF-W1-TSC-02A-TREV-HEALTH`

## Why

- current `dev` Today Review is still Trade Plan-shaped and is not the honest base for TSC-02
- accepted `CF-W1-TSC-01A-TREV` local commit `9fbc989` is the correct writer base
- Today Review already has additive JSON snapshot surfaces that can carry health projection fields without schema, route, repository, shared UI, or upstream source edits
- current upstream evidence is sufficient for a conservative Today Review-owned health projection

## Exact File Reservations For Future Child

Allowed:

- `backend/src/modules/today-trade-review/today-trade-review.types.ts`
- `backend/src/modules/today-trade-review/today-trade-review.service.ts`
- `backend/src/modules/today-trade-review/today-trade-review.md`
- `backend/tests/modules/today-trade-review/today-trade-review.service.test.ts`
- `frontend/src/features/today-trade-review/types.ts`
- `frontend/src/features/today-trade-review/components/TodayReviewPage.tsx`
- `frontend/src/features/today-trade-review/components/TodayReviewCandidateDetailPage.tsx`
- `frontend/tests/ui/today-trade-review.spec.ts`

Forbidden:

- Prisma schema or migrations
- generated files
- Today Review repository/controller/router/validation/index
- `frontend/src/features/today-trade-review/api/**`
- `frontend/src/features/today-trade-review/hooks/**`
- `frontend/src/features/today-trade-review/routes.tsx`
- backend and frontend route registries
- shared backend utilities
- shared frontend components
- package manifests
- upstream/downstream source/tests outside the reserved Today Review file set
- provider/live-data, startup/backfill, paid/cloud, broker, telemetry, or credential files

## Dependencies

Hard:

- accepted `CF-W1-TSC-01A-TREV` commit `9fbc989`
- accepted Signal Generation bridge commit `40c00f1` through that base
- Team 04 `CF-W1-TSC-02` QA plan
- Team 00 stacked Ready promotion

Optional:

- `CF-W1-DQ-03` residual summary fields if already present on base

Not part of first child:

- `CF-W1-TSC-03`
- `CF-W1-BT-04`

## QA Handoff

Team 04 should plan:

- `ACTIVE`, `HEALTHY`, `WEAKENING`, `RISK_WARNING`, `EXIT_TRIGGERED`, `INVALIDATED`, `EXPIRED`, `BLOCKED`
- missing-rule-evidence downgrade
- DQ hard-block behavior
- legacy snapshot compatibility
- list/detail consistency
- no target/R:R/Trade Plan/advice leakage

## Ready Recommendation

- Parent `CF-W1-TSC-02`: keep out of Ready
- Child `CF-W1-TSC-02A-TREV-HEALTH`: Ready candidate after QA plan and Team 00 promotion on base `9fbc989`

## Files Changed

- `03-architecture/CF-W1-TSC-02-architecture-review.md`
- `06-contracts/CF-W1-TSC-02-active-signal-health-rule-evidence-contract.md`
- `08-work-packets/CF-W1-TSC-02-work-packet.md`
- `17-team-outboxes/TEAM-03-CF-W1-TSC-02-architecture-outbox.md`

## Files Inspected

- `AGENTS.md`
- `10-requirements/CF-W1-TSC-02-active-signal-health-rule-evidence-requirement.md`
- `10-requirements/CF-W1-TSC-01A-today-review-trusted-signal-candidate-adoption-requirement.md`
- `10-requirements/next-top-10-candidates.md`
- `12-ready-queue/ready-for-implementation.md`
- `09-summaries/CF-W1-BT-04-po-acceptance-packet.md`
- `06-contracts/CF-W1-TSC-01A-trigger-evidence-adoption-contract.md`
- `06-contracts/CF-W1-DQ-03-data-quality-residual-reason-summary-contract.md`
- `06-contracts/CF-W1-SIG-TRIGGER-ENTRY-01-rule-trigger-entry-price-evidence-contract.md`
- Today Review backend/frontend source
- Signal Generation types
- Strategy Decision types/service
- Backtesting types

## Next Gate

Team 04 QA planning, then Team 00 stacked Ready evaluation for `CF-W1-TSC-02A-TREV-HEALTH`.
