# Work Packet: CF-W2-DOV-02 Daily Overview Calibration Evidence Summary

Date: 2026-05-26

Owner: Team 03 - Architecture Factory

Status: `SPLIT REQUIRED`

Do not open implementation from the currently inspected shared base. This packet is implementation-ready only on a base that already contains accepted `CF-W2-DOV-01` and accepted `CF-W2-CAL-02A`.

## Requirement

Replace the Daily Overview calibration placeholder with one truthful compact calibration evidence-through summary below primary candidate-review content.

The summary must:

- reuse calibration-owned scoped evidence-basis truth;
- show active scope and horizon;
- show latest measurable evidence date or explicit waiting/unavailable wording;
- keep research-support language;
- avoid target/reward/risk/Trade Plan-first framing.

## Recommended Owner

Team 08 or another Team 00-designated frontend owner for the accepted `daily-overview-dashboard` feature.

Recommended branch:

- `codex/team08-ux-research/CF-W2-DOV-02`

Recommended worktree:

- `C:\work\repo\investment-scanner-worktrees\team08-CF-W2-DOV-02`

## Dependency Gate

Before implementation starts, Team 00 must confirm the chosen base already includes:

- accepted `CF-W2-DOV-01` Daily Overview dashboard feature (`a371e2f` per execution docs); and
- accepted `CF-W2-CAL-02A` calibration evidence basis (`1be7d1a` per execution docs).

If either dependency is absent:

- do not widen this packet;
- do not reserve `HomePage.tsx` or calibration source files;
- return the item for dependency-base correction.

## Allowed Files

- `frontend/src/features/daily-overview-dashboard/types.ts`
- `frontend/src/features/daily-overview-dashboard/api/dailyOverviewDashboardApi.ts`
- `frontend/src/features/daily-overview-dashboard/hooks/useDailyOverviewDashboard.ts`
- `frontend/src/features/daily-overview-dashboard/components/DailyOverviewDashboardPage.tsx`
- `frontend/src/features/daily-overview-dashboard/components/CalibrationEvidenceSummaryPanel.tsx`
- `frontend/tests/ui/daily-overview-dashboard.spec.ts`

Optional only if needed to swap the accepted local placeholder component:

- `frontend/src/features/daily-overview-dashboard/components/ComingSoonPanel.tsx`

Allowed reporting docs after Team 00 promotion:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-08-CF-W2-DOV-02-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W2-DOV-02-developer-handoff.md`

## Forbidden Files

- `frontend/src/app/HomePage.tsx`
- `frontend/src/app/routes.tsx`
- `frontend/src/app/navigationMetadata.tsx`
- all `frontend/src/shared/**`
- all `frontend/src/contexts/**`
- all `frontend/src/features/signal-calibration-engine/**`
- `frontend/tests/ui/signal-calibration-engine.spec.ts`
- all `backend/src/**`
- all `backend/tests/**`
- Prisma/schema/migrations
- generated files
- package manifests and lockfiles
- provider/live/startup/backfill/scheduler/worker/queue files
- route registries
- root `AGENTS.md`
- `docs/AGENTS.md`
- `docs/codex-agent-team-plan/**`

## Required Behavior

- The existing accepted Daily Overview candidate-review sections remain primary.
- Add one calibration summary block below those primary sections.
- Fetch calibration-owned scoped summary truth only.
- Keep the fetch section-local; failure must not blank the page.
- Do not use row or module-health proxy logic.
- Keep the summary compact and drill through to `/signals/calibration` for detail.

## Required Data Source

Use only the accepted calibration-owned widened read path from `CF-W2-CAL-02A`.

Daily Overview must consume:

- scoped page summary
- calibration readiness
- calibration evidence basis

Do not consume for truth:

- `/signals/calibration/health`
- first row from `/signals/calibration/top`
- visible-row counts
- any other module summary pretending to be calibration evidence-through truth

## Minimum Section Content

The section must show:

- `Calibration Evidence-Through Summary`
- current `region / assetType`
- current selected horizon
- status label: `Usable`, `Limited`, `Unavailable`, or `Waiting`
- latest measurable evidence date when present
- `Waiting for maturity` wording when `nextEvaluableDate` is present
- concise calibration-owned reason summary
- drillthrough link to `/signals/calibration`

## Horizon Rule

Use one feature-local horizon selector for the section only.

Rules:

- default to the accepted calibration default horizon when available;
- otherwise default to `20D`;
- show the active horizon label visibly;
- do not add a new shared dashboard-wide horizon system.

## Validation

Required after implementation:

```text
cd frontend
npm.cmd run build
npm.cmd run test:ui -- daily-overview-dashboard.spec.ts --workers=1
```

Recommended wording scan:

```text
rg -n "buy now|sell now|must buy|must sell|target price|price target|profit target|reward/risk|R:R|trade plan|best trade|guaranteed|financial advice" frontend/src/features/daily-overview-dashboard frontend/tests/ui/daily-overview-dashboard.spec.ts
```

Required UI smoke expectations:

- the calibration summary is below primary candidate-review content
- scope label matches current market scope
- horizon label matches the selected section horizon
- measured state uses evidence-through date, not row generation time
- waiting state shows maturity wording and next evaluable date
- unavailable state stays explicit when evidence basis is missing
- no row-proxy or module-health fallback is visible
- placeholder remains truthful on dependency-missing bases or section-local failure states

## QA Handoff Notes

Team 04 should focus on:

- scope/horizon label correctness
- evidence-through date versus row generation time
- waiting-for-maturity wording
- unavailable state when upstream evidence basis is missing
- section-local failure handling
- no first-row proxy behavior
- no module-health fallback
- placeholder truthfulness when the dependency is absent on the base used for the run

## Stop Conditions

Stop and return to Team 00 if implementation needs:

- `HomePage.tsx` or first-time Daily Overview shell creation
- signal-calibration-engine source/test edits
- backend route or aggregation work
- shared UI or shared hook changes
- schema/storage/generated changes
- package changes
- provider/live/startup/backfill behavior

Any of those means this packet is no longer the bounded additive child approved here.

## Known Limitations To Preserve

- Daily Overview remains a consumer of calibration truth, not the owner.
- The summary is horizon-scoped, not a global confidence verdict.
- Drillthrough may route to `/signals/calibration` without carrying a synchronized cross-page horizon if the accepted parent does not already own that behavior.
- On bases missing accepted CAL-02A or accepted DOV-01, this child must not be forced through with substitute logic.

## Next Gate

1. Team 04 QA planning.
2. Team 00 base verification for accepted `CF-W2-DOV-01` and `CF-W2-CAL-02A`.
3. Only then may Team 00 promote the child for implementation.
