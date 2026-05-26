# CF-W2-DOV-01 Ready Promotion

Date: 2026-05-26

Owner: Team 00 - Master Orchestrator / Integration

## Refreshed Ready Promotion - 2026-05-26

Status: Ready for bounded Team 08 rework/implementation after Product Owner correction, Team 02 requirement refresh, Team 08 UX refresh, Team 03 architecture refresh, and Team 04 QA refresh.

This refreshed promotion supersedes the earlier admin/developer-style dashboard packet. Team 08 must rework the existing DOV worktree to the investor/trader-first dashboard shape. The prior implementation and review artifacts are historical evidence only unless they still satisfy this refreshed packet.

### Refreshed First-Slice Sections

Implement now from existing public read APIs:

- Header Rail
- Market Pulse
- High-Priority Review Candidates
- Watch And Blocked
- compact Evidence Caveats
- secondary Supporting Navigation

Placeholder-only now:

- `Coming soon - Market Movers`
- `Coming soon - FII/DII Activity`
- optional below-primary `Coming soon - Signal Position Follow-Through`
- optional below-primary `Coming soon - Calibration Evidence-Through Summary`
- optional below-primary `Coming soon - Measured Outcome Follow-Through`

Deferred:

- market-wide movers read model/API
- FII/DII source/API
- backend dashboard adapter
- persisted dashboard snapshot
- calibration/outcome/signal-position dashboard rollups

### Refreshed Gate Evidence

- Requirement refresh: `10-requirements/CF-W2-DOV-01-daily-overview-interactive-market-dashboard-requirement.md`
- UX refresh: `05-ux/CF-W2-DOV-01-daily-overview-dashboard-ux-plan.md`
- Architecture refresh: `03-architecture/CF-W2-DOV-01-architecture-review.md`
- Contract refresh: `06-contracts/CF-W2-DOV-01-daily-overview-dashboard-contract.md`
- Work packet refresh: `08-work-packets/CF-W2-DOV-01-work-packet.md`
- QA refresh: `04-qa/CF-W2-DOV-01-qa-plan.md`
- Team 02 outbox: `17-team-outboxes/TEAM-02-requirement-factory.md`
- Team 03 outbox: `17-team-outboxes/TEAM-03-CF-W2-DOV-01-architecture-outbox.md`
- Team 04 outbox: `17-team-outboxes/TEAM-04-CF-W2-DOV-01-qa-plan-outbox.md`
- Team 08 UX outbox: `17-team-outboxes/TEAM-08-CF-W2-DOV-01-ux-outbox.md`

### Refreshed File Reservation

Allowed implementation files:

- `frontend/src/app/HomePage.tsx`
- `frontend/src/features/daily-overview-dashboard/index.ts`
- `frontend/src/features/daily-overview-dashboard/types.ts`
- `frontend/src/features/daily-overview-dashboard/api/dailyOverviewDashboardApi.ts`
- `frontend/src/features/daily-overview-dashboard/hooks/useDailyOverviewDashboard.ts`
- `frontend/src/features/daily-overview-dashboard/components/**`
- `frontend/tests/ui/daily-overview-dashboard.spec.ts`

Allowed reporting docs:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-08-CF-W2-DOV-01-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W2-DOV-01-developer-handoff.md`

Forbidden scope:

- all backend files and backend tests
- backend or frontend route registries
- `frontend/src/app/navigationMetadata.tsx`
- `frontend/src/shared/**`
- shared hooks, theme, context, or app-level market-scope rewrites
- existing feature page/API/hook/type rewrites outside read-only imports
- Prisma schema or migrations
- generated files
- package manifests or lockfiles
- provider/live-data calls
- startup/backfill/scheduler/worker/queue files
- pipeline command execution
- direct Smart Money or Backtesting fanout beyond the approved read set
- calibration aggregation from current calibration responses
- replacing placeholders with inferred or hardcoded summaries

### Required Rework Behavior

- `/` remains the existing route and resolves through `HomePage.tsx`.
- `HomePage.tsx` should be a thin shell over the feature-local dashboard.
- First viewport must feel like an investor/trader daily briefing, not a pipeline or module-health console.
- Candidate lanes must use Today Review `longReview`, `shortReview`, and `exitRiskReview` as primary truth.
- Watch/blocked sections must use Today Review watch/blocked/insufficient/unproven evidence and reason summaries where available.
- Market Pulse may use Today Review, Research Overview, review-readiness, and limited region-level Market Context only with truthful caveats.
- Evidence Caveats must be compact and secondary.
- Market Movers and FII/DII must remain honest placeholders with no fake rows, values, labels, or Smart Money/watchlist relabeling.
- Refresh must be read-only and must not trigger pipeline commands or provider/live refresh.
- No target, reward/risk, R:R, buy/sell, direct advice, fake confidence, fake freshness, or invented values.

### Required Validation

```powershell
cd frontend
npm.cmd run build
npm.cmd run test:ui -- daily-overview-dashboard.spec.ts --workers=1
```

Forbidden language scan:

```powershell
rg -n "buy now|sell now|must buy|must sell|target price|price target|profit target|reward/risk|R:R|guaranteed|financial advice|best trade" frontend/src/app/HomePage.tsx frontend/src/features/daily-overview-dashboard frontend/tests/ui/daily-overview-dashboard.spec.ts
```

### Stop Conditions

Stop and return to Team 00 if the rework requires backend changes, route-registry edits, shared UI/hooks/context, package/schema/generated files, provider/live calls, pipeline commands, startup/backfill/scheduler changes, market-wide movers/FII-DII invention, or Signal Position Ledger UI/API integration.

---

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
