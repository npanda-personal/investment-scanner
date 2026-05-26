# CF-W2-DOV-02 Ready Promotion

Date: 2026-05-26

Owner: Team 00 - Master Orchestrator / Integration

## Verdict

`READY FOR TEAM 08 IMPLEMENTATION`

This promotion is scoped to a bounded frontend-only Daily Overview follow-up.

## Work Item

`CF-W2-DOV-02 - Daily Overview calibration evidence-through summary`

## Branch / Worktree

- Branch: `codex/team08-ux-research/CF-W2-DOV-02`
- Worktree: `C:\work\repo\investment-scanner-worktrees\team08-CF-W2-DOV-02`
- Required base: `50bccc8 feat: add daily overview dashboard`

The required base was built from:

- `1be7d1a feat: add calibration evidence basis`
- replayed accepted DOV-01 commit `a371e2f feat: add daily overview dashboard`

## Gate Evidence

- Requirement: `10-requirements/CF-W2-DOV-02-daily-overview-calibration-evidence-through-summary-requirement.md`
- Architecture review: `03-architecture/CF-W2-DOV-02-architecture-review.md`
- Contract: `06-contracts/CF-W2-DOV-02-daily-overview-calibration-evidence-summary-contract.md`
- Work packet: `08-work-packets/CF-W2-DOV-02-work-packet.md`
- QA plan: `04-qa/CF-W2-DOV-02-qa-plan.md`
- Dependency integration base evidence: `09-summaries/CF-W2-DOV-02-dependency-integration-base-evidence.md`

## Allowed Implementation Files

- `frontend/src/features/daily-overview-dashboard/types.ts`
- `frontend/src/features/daily-overview-dashboard/api/dailyOverviewDashboardApi.ts`
- `frontend/src/features/daily-overview-dashboard/hooks/useDailyOverviewDashboard.ts`
- `frontend/src/features/daily-overview-dashboard/components/DailyOverviewDashboardPage.tsx`
- `frontend/src/features/daily-overview-dashboard/components/CalibrationEvidenceSummaryPanel.tsx`
- `frontend/tests/ui/daily-overview-dashboard.spec.ts`

Allowed reporting docs:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-08-CF-W2-DOV-02-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W2-DOV-02-developer-handoff.md`

## Forbidden Scope

- `frontend/src/app/HomePage.tsx`
- `frontend/src/app/routes.tsx`
- `frontend/src/app/navigationMetadata.tsx`
- `frontend/src/shared/**`
- `frontend/src/contexts/**`
- `frontend/src/features/signal-calibration-engine/**`
- `frontend/tests/ui/signal-calibration-engine.spec.ts`
- all `backend/src/**`
- all `backend/tests/**`
- Prisma schema, migrations, generated files
- package manifests and lockfiles
- provider/live/startup/backfill/scheduler/worker/queue files
- route registries
- root `AGENTS.md`
- `docs/AGENTS.md`
- `docs/codex-agent-team-plan/**`

## Required Behavior

- Replace the Daily Overview `Calibration Evidence-Through Summary` placeholder with a truthful compact section.
- Keep the section below primary Daily Overview candidate-review content.
- Show explicit `region / assetType` scope and horizon.
- Use only calibration-owned scoped page-summary/evidence-basis truth from the accepted CAL-02A base.
- Show latest measurable evidence date when present.
- Show `Waiting` only for horizon-limited evidence with maturity wording.
- Show `Unavailable` or explicit failure when evidence is missing or the panel fetch fails.
- Do not use `/signals/calibration/health`, first-row proxy logic, first warning/blocker proxy logic, row `generatedAt`, or visible-row counts as evidence-through truth.
- Link to `/signals/calibration` for detail.
- Preserve research-support language only.

## Required Validation

```powershell
cd frontend
npm.cmd run build
$env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:<dedicated-port>'; npm.cmd run test:ui -- daily-overview-dashboard.spec.ts --workers=1
```

Required language guard:

```powershell
rg -n -i "buy now|sell now|must buy|must sell|target price|price target|profit target|reward/risk|R:R|trade plan|best trade|broker|execute order|place order|guaranteed|financial advice" frontend/src/features/daily-overview-dashboard frontend/tests/ui/daily-overview-dashboard.spec.ts
```

## Stop Conditions

Stop and return to Team 00 if implementation requires any forbidden file, shared UI/hooks, Signal Calibration source/test edits, backend work, schema/storage/generated/package changes, provider/live/startup/backfill/scheduler changes, or product-language drift.
