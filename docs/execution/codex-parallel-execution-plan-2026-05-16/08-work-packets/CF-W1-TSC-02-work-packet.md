# CF-W1-TSC-02 Work Packet

Date: 2026-05-24

## Work Item

Parent requirement:

- `CF-W1-TSC-02 - Active Signal Health rule-backed exit/invalidation evidence`

Bounded first child:

- `CF-W1-TSC-02A-TREV-HEALTH`

## State

Split required.

The parent stays out of Ready. One bounded first child is feasible and should be the only promotable implementation packet.

## Owner / Lane / Module

- Architecture owner: Team 03 - Solution Architect Factory
- Future implementation owner: Team 07 - Portfolio / Watchlist / Alerts / Today Review
- Lane: Lane 3 with Lane 2 evidence inputs
- Backend module: `today-trade-review`
- Frontend feature: `today-trade-review`

## Required Base

- accepted `CF-W1-TSC-01A-TREV` local commit `9fbc989`
- accepted Signal Generation bridge commit `40c00f1` through that base

Do not start from plain `dev`.

## Smallest Honest First Child

Add one Today Review-owned health projection for Trusted Signal Candidates that:

- preserves accepted Trusted Signal Candidate grouping from `CF-W1-TSC-01A-TREV`;
- adds active-signal health state plus evidence status;
- shows strategy/rule/version basis, evidence date, summary, and missing-evidence reasons;
- uses current rule-backed evidence only;
- hard-blocks trusted health when Data Quality is missing, blocked, or unsupported;
- does not introduce new persistence, routes, or pages;
- does not include `CF-W1-TSC-03` supporting trust evidence.

## Exact File Reservations

### Allowed implementation files

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
- Signal Generation, Strategy Decision, Data Quality, Market Data, Backtesting, Trade Plan, Portfolio, Watchlist, Alerts, Copilot, Research Hub, Market Context, and Historical Context source/tests
- provider/live-data, startup/backfill, paid/cloud, broker, telemetry, or credential files

## Required Behavior

The first child must:

- reserve only these health states: `ACTIVE`, `HEALTHY`, `WEAKENING`, `RISK_WARNING`, `EXIT_TRIGGERED`, `INVALIDATED`, `EXPIRED`, `BLOCKED`
- keep state derivation conservative and rule-backed
- preserve existing Today Review route contracts
- expose evidence date or explicit missing-evidence reason
- keep list/detail state and summary consistent for the same candidate
- preserve backward compatibility for older candidate rows that do not yet carry new health fields
- avoid target price, synthetic target, reward/risk, Trade Plan-first, direct buy/sell, and advice-like wording

## Dependencies

### Hard dependencies

- accepted `CF-W1-TSC-01A-TREV` base commit `9fbc989`
- Team 04 `CF-W1-TSC-02` QA plan
- Team 00 stacked Ready promotion

### Optional dependency

- `CF-W1-DQ-03` if residual summary fields are already present on the chosen base

### Explicitly not part of this child

- `CF-W1-TSC-03`
- `CF-W1-BT-04`
- new active-monitor page
- durable health history

## Branch / Worktree Recommendation

- Branch: `codex/team07-portfolio-alerts/CF-W1-TSC-02A-active-signal-health`
- Worktree: `../investment-scanner-worktrees/team07-CF-W1-TSC-02A`
- Base: accepted `CF-W1-TSC-01A-TREV` commit `9fbc989`

Reason:

- same writer set as accepted TSC-01A Today Review work;
- current `dev` is not the correct trust-language or evidence baseline;
- one-writer discipline is required across the full Today Review reservation.

## QA Handoff Needed

Team 04 should prepare focused verification for:

- `ACTIVE`
- `HEALTHY`
- `WEAKENING`
- `RISK_WARNING`
- `EXIT_TRIGGERED`
- `INVALIDATED`
- `EXPIRED`
- `BLOCKED`
- missing-rule-evidence downgrade
- hard-blocked Data Quality
- legacy snapshot compatibility
- no target/R:R/Trade Plan/advice leakage
- list/detail consistency

Suggested validation after future implementation:

```powershell
cd backend
npm.cmd test -- today-trade-review.service.test.ts --runInBand
npm.cmd run build
```

```powershell
cd frontend
npm.cmd run build
npm.cmd run test:ui -- today-trade-review.spec.ts --workers=1
```

## Stop Conditions

Stop and return to Team 00 / Architect if implementation requires:

- schema, migration, or generated-file changes;
- repository/controller/router/validation/index edits;
- route or route-registry changes;
- shared UI or shared backend utility changes;
- upstream source edits;
- package changes;
- provider/live-data, startup/backfill, paid/cloud, broker, telemetry, or credential work;
- TSC-03 support evidence;
- target/R:R/Trade Plan semantics as health proof.

## Ready Recommendation

- Parent `CF-W1-TSC-02`: not Ready
- Child `CF-W1-TSC-02A-TREV-HEALTH`: Ready candidate after Team 04 QA planning and Team 00 promotion on stacked base `9fbc989`
