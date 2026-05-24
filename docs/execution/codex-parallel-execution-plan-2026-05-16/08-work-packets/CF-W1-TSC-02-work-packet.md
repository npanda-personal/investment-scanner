# CF-W1-TSC-02 Work Packet

Date: 2026-05-24

## Work Item

Active Signal Health rule evidence for Trusted Signal Candidates.

## State

Draft follow-on work packet. Not Ready for Implementation.

The packet is bounded enough for architecture/file-reservation planning, but it is blocked from Team 00 promotion until `CF-W1-TSC-01A-TREV` is accepted and Team 04 prepares a matching QA plan.

## Owner / Lane / Module

- Architecture owner: Team 03 - Solution Architect Factory
- Future implementation owner after blockers clear: Team 07 - Portfolio / Watchlist / Alerts / Today Review
- Lane: Lane 3 with Lane 2 evidence dependency
- Backend module: `today-trade-review`
- Frontend feature: `today-trade-review`

## Smallest Honest First Child

Add one Today Review-owned active health projection for existing Trusted Signal Candidates.

The first child should:

- use accepted `TSC-01A-TREV` source-proven entry trigger evidence;
- require Data Quality readiness before trusted health;
- show health state, evidence status, evidence date, rule/version basis, summary, reason codes, and missing-evidence reasons;
- render the same state and summary in the Today Review candidate list and detail page;
- avoid target price, profit target, R:R, reward/risk, Trade Plan source-of-truth framing, buy/sell wording, and direct-action language.

## Allowed Files After Future Ready Promotion

- `backend/src/modules/today-trade-review/today-trade-review.types.ts`
- `backend/src/modules/today-trade-review/today-trade-review.service.ts`
- `backend/src/modules/today-trade-review/today-trade-review.md`
- `backend/tests/modules/today-trade-review/today-trade-review.service.test.ts`
- `frontend/src/features/today-trade-review/types.ts`
- `frontend/src/features/today-trade-review/components/TodayReviewPage.tsx`
- `frontend/src/features/today-trade-review/components/TodayReviewCandidateDetailPage.tsx`
- `frontend/tests/ui/today-trade-review.spec.ts`

## Branch / Worktree Requirement

Worktree required: yes.

Recommended future isolation after Team 00 promotion:

- Branch: `codex/team07-portfolio-alerts/CF-W1-TSC-02-active-signal-health`
- Worktree: `../investment-scanner-worktrees/team07-CF-W1-TSC-02`
- Base: accepted `CF-W1-TSC-01A-TREV` commit, which itself must include the accepted Team 06 bridge commit `40c00f1`

Reason:

- the writer set overlaps active `CF-W1-TSC-01A-TREV`;
- current `dev` does not contain the full accepted TSC adoption surface;
- health semantics must stack on accepted Trusted Signal Candidate evidence, not pre-adoption Today Review behavior.

## Current Forbidden Files

- application source or tests before Team 00 promotion
- Prisma schema or migrations
- generated files
- `backend/src/modules/today-trade-review/today-trade-review.repository.ts`
- `backend/src/modules/today-trade-review/today-trade-review.controller.ts`
- `backend/src/modules/today-trade-review/today-trade-review.router.ts`
- `backend/src/modules/today-trade-review/today-trade-review.validation.ts`
- `backend/src/modules/today-trade-review/today-trade-review.module.ts`
- `backend/src/modules/today-trade-review/index.ts`
- `backend/tests/modules/today-trade-review/today-trade-review.controller.test.ts`
- `frontend/src/features/today-trade-review/api/**`
- `frontend/src/features/today-trade-review/hooks/**`
- `frontend/src/features/today-trade-review/routes.tsx`
- backend and frontend route registries
- shared backend utilities
- shared frontend components
- package manifests
- Signal Generation, Data Quality, Strategy Framework, Strategy Decision, Signal Quality, Market Data, Backtesting, Trade Plan, Portfolio, Watchlist, Alerts, Copilot, Research Hub, Market Context, or Historical Context source/tests
- provider/live-data, startup/backfill, paid/cloud, broker, telemetry, or credential files

## Required Behavior

Future implementation must:

- add an additive health projection object or equivalent stable fields;
- keep health rule-based and evidence-backed;
- use `ACTIVE` conservatively when no stronger rule-backed health state is proven;
- hard-block trusted health when Data Quality is missing, blocked, unsupported, stale-hard-blocked, or scope-mismatched;
- require documented rule evidence for `HEALTHY`, `WEAKENING`, `RISK_WARNING`, `EXIT_TRIGGERED`, `INVALIDATED`, and `EXPIRED`;
- expose evidence date or missing-evidence reason;
- preserve existing Today Review routes and backward compatibility;
- preserve research-support language.

## Explicitly Deferred

- new Active Signal Monitor page
- durable health history
- schema, repository, route, or controller work
- shared UI components
- upstream module changes
- target/R:R/Trade Plan source-of-truth semantics
- provider/live-data, startup/backfill, paid/cloud, broker, telemetry, or credential work

## One-Writer Constraint

- Reserve the full Today Review backend/frontend writer set to one writer.
- Do not run `CF-W1-TSC-02` in parallel with `CF-W1-TSC-01A-TREV` or any other Today Review source packet.

## QA Handoff Needed

Team 04 should prepare QA after `CF-W1-TSC-01A-TREV` acceptance for:

- active baseline;
- healthy;
- weakening;
- risk warning;
- exit triggered;
- invalidated;
- expired;
- blocked by Data Quality;
- missing rule evidence downgrade;
- legacy candidate compatibility;
- no target/R:R/Trade Plan/advice leakage.

Suggested focused commands after future implementation exists:

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

- Prisma/schema/migration/generated changes;
- repository/controller/router/validation/module/index changes;
- route registry changes;
- shared UI or shared backend utility changes;
- upstream source changes;
- package manifest changes;
- provider/live-data, startup/backfill, paid/cloud, broker, telemetry, or credential work;
- target price, arbitrary profit target, R:R, reward/risk, Trade Plan geometry, or advice-like behavior as health evidence.

## Next Gate

Wait for `CF-W1-TSC-01A-TREV` acceptance.

After that, route `CF-W1-TSC-02` to Team 04 QA planning. Team 00 can evaluate Ready promotion only after the QA plan exists and the accepted `TSC-01A-TREV` base is recorded.
