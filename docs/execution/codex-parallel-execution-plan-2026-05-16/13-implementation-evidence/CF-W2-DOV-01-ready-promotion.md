# CF-W2-DOV-01 Ready Promotion

Date: 2026-05-26

Owner: Team 00 - Master Orchestrator / Integration

## Work Item

`CF-W2-DOV-01` - Daily Overview interactive market dashboard first slice.

## Gate Verdict

Ready for bounded Team 08 implementation as a frontend-only dashboard child.

This promotion replaces the static `/` launch-card body with a truthful Daily Overview dashboard composed from existing read APIs. It does not authorize backend source, backend route registry, frontend route registry, shared UI, package, Prisma/schema, generated files, provider/live calls, pipeline command execution, or placeholder fakery.

## Gate Evidence

- Requirement: `10-requirements/CF-W2-DOV-01-daily-overview-interactive-market-dashboard-requirement.md`
- UX plan: `05-ux/CF-W2-DOV-01-daily-overview-dashboard-ux-plan.md`
- Architecture review: `03-architecture/CF-W2-DOV-01-architecture-review.md`
- Contract: `06-contracts/CF-W2-DOV-01-daily-overview-dashboard-contract.md`
- Work packet: `08-work-packets/CF-W2-DOV-01-work-packet.md`
- QA plan: `04-qa/CF-W2-DOV-01-qa-plan.md`
- Team 03 outbox: `17-team-outboxes/TEAM-03-CF-W2-DOV-01-architecture-outbox.md`
- Team 04 outbox: `17-team-outboxes/TEAM-04-CF-W2-DOV-01-qa-plan-outbox.md`
- Team 08 outbox: `17-team-outboxes/TEAM-08-CF-W2-DOV-01-ux-outbox.md`
- Open decisions: one unrelated DQ-RS1 decision only; it does not block this workstream.

## Branch / Worktree

- Branch: `codex/team08-ux-research/CF-W2-DOV-01`
- Worktree: `C:\work\repo\investment-scanner-worktrees\team08-CF-W2-DOV-01`
- Required base: latest `dev` after Team 00 docs checkpoint containing this Ready promotion.

## Allowed Implementation Files

- `frontend/src/app/HomePage.tsx`
- `frontend/src/features/daily-overview-dashboard/index.ts`
- `frontend/src/features/daily-overview-dashboard/types.ts`
- `frontend/src/features/daily-overview-dashboard/api/dailyOverviewDashboardApi.ts`
- `frontend/src/features/daily-overview-dashboard/hooks/useDailyOverviewDashboard.ts`
- `frontend/src/features/daily-overview-dashboard/components/**`
- `frontend/tests/ui/daily-overview-dashboard.spec.ts`

## Allowed Reporting Docs

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-08-CF-W2-DOV-01-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W2-DOV-01-developer-handoff.md`

## Required Behavior

- Keep `/` on the existing route and use `HomePage.tsx` as a thin shell over the new dashboard feature.
- First viewport must show scope, freshness/trust context, and Daily Pulse.
- Use existing read APIs only.
- Critical load should use Today Review latest, Research Overview, and review-readiness summary.
- Deferred sections should use Market Context summary, Data Quality summary, latest Signal run, and Pipeline status where available.
- Keep Calibration Evidence-Through, Signal Position Follow-Through, and Measured Outcome Follow-Through as explicit `Coming soon` placeholders.
- Use section-local loading/error/empty states.
- Keep dashboard refresh read-only; do not trigger pipeline commands or provider/live refresh.
- Preserve research-support language and avoid target price, reward/risk, `R:R`, broker, Trade Plan-first, or direct advice wording.

## Forbidden Scope

- `backend/src/**`
- `backend/tests/**`
- `frontend/src/app/routes.tsx`
- `frontend/src/app/navigationMetadata.tsx`
- `frontend/src/shared/components/**`
- shared hooks, theme, or context rewrites
- existing feature page rewrites outside read-only imports/API calls
- Prisma schema or migrations
- generated files
- package manifests or lockfiles
- provider/live-data files
- pipeline command execution surfaces
- backend or frontend route-registry edits
- replacing `Coming soon` placeholders with inferred or hardcoded summaries

## Required Validation

```powershell
cd frontend
npm.cmd run build
npm.cmd run test:ui -- daily-overview-dashboard.spec.ts --workers=1
```

Language and placeholder guard:

```powershell
rg -n "R:R|reward/risk|target price|price target|profit target|buy now|sell now|must buy|must sell|financial advice|hardcoded|fake" frontend/src/app/HomePage.tsx frontend/src/features/daily-overview-dashboard frontend/tests/ui/daily-overview-dashboard.spec.ts
```

## Stop Conditions

Stop and return to Team 00 if implementation requires backend changes, route-registry edits, shared UI, package changes, Prisma/schema, generated files, direct Smart Money or Backtests fanout beyond the approved read set, calibration aggregation from current calibration responses, mutating refresh behavior, or replacing placeholders with inferred summaries.
