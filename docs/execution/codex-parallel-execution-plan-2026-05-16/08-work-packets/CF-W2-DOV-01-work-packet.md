# Work Packet: CF-W2-DOV-01 Daily Overview Dashboard

Date: 2026-05-26

## Status

Architecture-prepared.

Team 00 may send this packet to Team 04 for QA planning. Do not start implementation until Team 04 QA planning is complete and Team 00 records a Ready promotion.

## Requirement

Replace the static launch-card `/` page with a real Daily Overview dashboard using existing public read APIs and explicit `Coming soon` placeholders for unresolved truth surfaces.

## Recommended Owner

Team 07 or another Team 00-designated frontend owner with Lane 3 UX-shell responsibility.

Recommended branch:

- `codex/team07-lane3/CF-W2-DOV-01`

Recommended worktree:

- `C:\work\repo\investment-scanner-worktrees\team07-CF-W2-DOV-01`

Recommended base:

- latest `dev` at Team 00 Ready promotion time, provided no other active writer is holding `frontend/src/app/HomePage.tsx`

## Allowed Files

- `frontend/src/app/HomePage.tsx`
- `frontend/src/features/daily-overview-dashboard/index.ts`
- `frontend/src/features/daily-overview-dashboard/types.ts`
- `frontend/src/features/daily-overview-dashboard/api/dailyOverviewDashboardApi.ts`
- `frontend/src/features/daily-overview-dashboard/hooks/useDailyOverviewDashboard.ts`
- `frontend/src/features/daily-overview-dashboard/components/**`
- `frontend/tests/ui/daily-overview-dashboard.spec.ts`

Allowed branch-local reporting docs after Ready promotion:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-07-CF-W2-DOV-01-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W2-DOV-01-developer-handoff.md`

## Forbidden Files

- `backend/src/**`
- `backend/tests/**`
- `frontend/src/app/routes.tsx`
- `frontend/src/app/navigationMetadata.tsx`
- `frontend/src/shared/components/**`
- existing feature pages outside read-only imports
- Prisma schema or migrations
- package manifests
- generated files
- shared hooks/utilities rewrites
- provider/live-data files
- pipeline command files
- root `AGENTS.md`
- `docs/AGENTS.md`
- `docs/codex-agent-team-plan/**`

## Required Behavior

- `/` remains the existing route and continues to resolve through `HomePage.tsx`.
- `HomePage.tsx` becomes a thin shell that renders the new dashboard feature.
- The dashboard loads the first viewport from:
  - Today Review latest
  - Research Overview
  - review-readiness summary
- The dashboard defers:
  - Market Context summary
  - Data Quality summary
  - Signal latest run
  - Pipeline status
- Today Review truth owns run status, trust status, review mode, and candidate counts.
- Research Hub truth owns research priorities, strategy-proof summary, and light signal/smart-money confirmation summary.
- Market Context truth owns regime/breadth/sector context.
- Data Quality truth owns DQ summary and readiness blocker framing.
- Pipeline Ops truth owns active/latest stage state.
- The page stays read-only.
- Refresh refetches reads only.
- Calibration aggregate remains `Coming soon`.
- Signal Position Follow-Through remains `Coming soon`.
- Measured Outcome Follow-Through remains `Coming soon`.
- No target, reward/risk, target-price, broker, or direct-advice wording is introduced.

## Required UX Rules

- The first viewport must show scope, trust context, and Daily Pulse, not launch cards.
- The page must be dense and dashboard-like, not marketing-like.
- Each section must have its own empty / limited / unavailable state.
- Mixed-source disagreement must be shown explicitly.
- Drilldowns must route to the owning surface.

## Validation

Run:

```text
cd frontend
npm.cmd run build
npm.cmd run test:ui -- daily-overview-dashboard.spec.ts --workers=1
```

UI smoke expectations:

- `/` no longer renders the old launch-card grid
- first viewport shows scope plus Daily Pulse
- Today Review and Research Hub drill links work
- blocked or empty states explain why data is absent
- `Coming soon` placeholders render exactly where current source truth is intentionally deferred

## Stop Conditions

Stop and return to Team 00 if implementation requires:

- backend changes
- route-registry changes
- shared UI changes
- package changes
- Prisma/schema changes
- generated-file changes
- direct Smart Money or Backtests fanout beyond the approved read set
- calibration aggregation from current `signals/calibration` responses
- replacing placeholders with inferred summaries

## Known Limitations To Preserve

- Research Hub actionability dimensions for Today Review / Calibration / Trade Plan are still unstable on the current base.
- Market Context is region-scoped, not fully asset-type-scoped.
- Backtesting current-proof freshness labels are not available on the current base.
- Calibration evidence-through aggregation is not available on the current base.
- The dashboard is section-live, not one atomic persisted snapshot.

## Dependency Notes

- Team 04 QA planning is required before Ready promotion.
- Team 00 must reserve `frontend/src/app/HomePage.tsx` as a shared file.
- No Team 00 backend gate is required unless implementation tries to open a backend summary adapter.
