# TEAM-04 CF-W1-L3-WATCH-01 QA Plan Outbox

Date: 2026-05-20

## Work Item

`CF-W1-L3-WATCH-01` - watchlist review actionability and explainable review-priority ordering.

## State

QA-READY for planning.

Ready-promotion recommendation: conditional NOT-READY for implementation until Team 00 confirms the implementation base is accepted `CF-W1-L3-PORT-01B` commit `a2edfb6` or a later clean `dev` where `a2edfb6` is an ancestor.

## Owner / Lane / Module

- Owner: Team 04 QA Factory
- Future implementation owner: Team 07 Portfolio / Watchlists / Alerts
- Lane: Lane 3
- Backend module: `watchlist-management`
- Frontend feature: `watchlist-management`

## Files Written

- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-L3-WATCH-01-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-CF-W1-L3-WATCH-01-qa-plan.md`

## Files Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-L3-WATCH-01-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-L3-WATCH-01-watchlist-review-actionability-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-L3-WATCH-01-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-L3-WATCH-01-watchlist-review-actionability-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/refinement-queue.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/requirements-backlog.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/12-ready-queue/ready-for-implementation.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-02-requirement-factory.md`
- `git show a2edfb6:docs/execution/codex-parallel-execution-plan-2026-05-16/09-summaries/CF-W1-L3-PORT-01B-po-acceptance-packet.md`
- `git show a2edfb6:docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-00-CF-W1-L3-PORT-01B-delegated-po-acceptance.md`
- `git show a2edfb6:backend/src/modules/watchlist-management/watchlist-management.types.ts`
- `git show a2edfb6:backend/src/modules/watchlist-management/watchlist-management.service.ts`

## Base Evidence

- Current branch: `dev`.
- Current workspace status: dirty with unrelated Research Hub application changes and active docs.
- Accepted baseline inspected: `a2edfb616b8c0c8fe55afb6b723457bd07700c42`.
- Baseline ancestry command run: `git merge-base --is-ancestor a2edfb6 HEAD`.
- Result: `a2edfb6 is NOT ancestor of HEAD`.

This means QA planning is complete, but implementation Ready promotion must not proceed from current unstacked `dev`.

## QA Coverage Required

QA plan requires implementation evidence for:

- high, medium, refresh, and background review-priority mapping;
- deterministic signal freshness mapping;
- deterministic `reviewPriorityDesc` ordering with contract tie-breaks;
- unknown sort fallback to `recentlyAdded`;
- preservation of accepted PORT-01B `readiness` and `readinessSummary`;
- proof that DQ readiness is not used as review-priority evidence;
- watchlist detail UI rendering of priority and reason summary;
- notes/tags editing preservation;
- absence of advice, target, alert, portfolio-action, automation, or execution semantics;
- absence of broad UI/shared/routes/schema/package/provider/live/startup scope.

## Required Commands After Implementation

```powershell
cd backend
npm.cmd test -- watchlist-management.service.test.ts watchlist-management.validation.test.ts --runInBand
npm.cmd run build
```

```powershell
cd frontend
npm.cmd run test:ui -- watchlist-management.spec.ts --workers=1
npm.cmd run build
```

If no focused UI smoke is added, Team 04 must record the exact blocker and residual risk because WATCH-01 is user-visible.

Required scans:

```powershell
git diff --name-only
rg -n "DataQualityEngineService|readinessSummary|readiness\\.|signalReadinessStatus|coverageStatus|liquidityStatus|readinessBlockers|warnings" backend/src/modules/watchlist-management frontend/src/features/watchlist-management
rg -n "buy now|sell now|must buy|must sell|guaranteed|profit target|price target|target price|ready to execute|high conviction trade|automated trade|alert created|portfolio action" backend/src/modules/watchlist-management frontend/src/features/watchlist-management backend/tests/modules/watchlist-management frontend/tests/ui
```

## Blockers

- Current `dev` does not contain accepted `a2edfb6`; implementation must start from `a2edfb6` or later clean `dev` containing it.
- Team 00 still needs exact watchlist file reservations and no active watchlist writer conflict confirmation.
- Current unrelated dirty Research Hub changes must remain untouched and excluded from WATCH-01.

## Next Gate

Team 00 sequencing / Ready evaluation.

Recommendation: do not promote to implementation from the current main workspace state. Promote only after safe base evidence and watchlist file reservations are recorded.
