# TEAM-08 Current Assignment

Date: 2026-05-25

Team: TEAM-08 - UX / Research / Copilot

Prompt file: `docs/execution/codex-parallel-execution-plan-2026-05-16/15-automation-prompts/AUTO-08-ux-research-copilot.md`

## Latest Assignment Override - 2026-05-26 DOV-02

Team 00 promotes `CF-W2-DOV-02` as a bounded Daily Overview follow-up implementation.

Work item:

- `CF-W2-DOV-02` - Daily Overview calibration evidence-through summary.

Branch / worktree:

- Branch: `codex/team08-ux-research/CF-W2-DOV-02`
- Worktree: `C:\work\repo\investment-scanner-worktrees\team08-CF-W2-DOV-02`
- Required base: `50bccc8 feat: add daily overview dashboard`

Read latest active docs from the main workspace:

- `C:\work\repo\investment-scanner\AGENTS.md`
- `C:\work\repo\investment-scanner\docs\execution\codex-parallel-execution-plan-2026-05-16\10-requirements\CF-W2-DOV-02-daily-overview-calibration-evidence-through-summary-requirement.md`
- `C:\work\repo\investment-scanner\docs\execution\codex-parallel-execution-plan-2026-05-16\03-architecture\CF-W2-DOV-02-architecture-review.md`
- `C:\work\repo\investment-scanner\docs\execution\codex-parallel-execution-plan-2026-05-16\06-contracts\CF-W2-DOV-02-daily-overview-calibration-evidence-summary-contract.md`
- `C:\work\repo\investment-scanner\docs\execution\codex-parallel-execution-plan-2026-05-16\08-work-packets\CF-W2-DOV-02-work-packet.md`
- `C:\work\repo\investment-scanner\docs\execution\codex-parallel-execution-plan-2026-05-16\04-qa\CF-W2-DOV-02-qa-plan.md`
- `C:\work\repo\investment-scanner\docs\execution\codex-parallel-execution-plan-2026-05-16\09-summaries\CF-W2-DOV-02-dependency-integration-base-evidence.md`
- `C:\work\repo\investment-scanner\docs\execution\codex-parallel-execution-plan-2026-05-16\13-implementation-evidence\CF-W2-DOV-02-ready-promotion.md`

Allowed implementation files:

- `frontend/src/features/daily-overview-dashboard/types.ts`
- `frontend/src/features/daily-overview-dashboard/api/dailyOverviewDashboardApi.ts`
- `frontend/src/features/daily-overview-dashboard/hooks/useDailyOverviewDashboard.ts`
- `frontend/src/features/daily-overview-dashboard/components/DailyOverviewDashboardPage.tsx`
- `frontend/src/features/daily-overview-dashboard/components/CalibrationEvidenceSummaryPanel.tsx`
- `frontend/tests/ui/daily-overview-dashboard.spec.ts`

Allowed reporting docs:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-08-CF-W2-DOV-02-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W2-DOV-02-developer-handoff.md`

Required behavior:

- Replace the Daily Overview `Calibration Evidence-Through Summary` placeholder with a truthful compact summary.
- Keep the section below primary Daily Overview candidate-review content.
- Use only calibration-owned scoped page-summary/evidence-basis truth from the accepted CAL-02A base.
- Show explicit scope, horizon, latest measurable evidence date when available, waiting-for-maturity wording when horizon-limited, and unavailable/failure wording when missing.
- Do not use `/signals/calibration/health`, first-row proxy logic, row `generatedAt`, first warning/blocker rows, or visible-row counts as evidence-through truth.
- Preserve research-support language and avoid target, R:R, Trade Plan-first, broker/execution, advice, or guarantee wording.

Forbidden files:

- `frontend/src/app/HomePage.tsx`
- `frontend/src/app/routes.tsx`
- `frontend/src/app/navigationMetadata.tsx`
- `frontend/src/shared/**`
- `frontend/src/contexts/**`
- `frontend/src/features/signal-calibration-engine/**`
- `frontend/tests/ui/signal-calibration-engine.spec.ts`
- all `backend/src/**`
- all `backend/tests/**`
- Prisma/schema/migrations/generated files
- package manifests and lockfiles
- provider/live/startup/backfill/scheduler/worker/queue files
- route registries

Expected handoff:

- Update `17-team-outboxes/TEAM-08-CF-W2-DOV-02-outbox.md`.
- Create `18-integration-queue/CF-W2-DOV-02-developer-handoff.md`.
- Include changed files, inspected files, validation commands, skipped checks, risks, and next gate: Team 04 QA Verification.

## Latest Assignment Override - 2026-05-26 UX-01B

Team 00 promotes `CF-W1-UX-01B` as a bounded Stock Research Workbench trust-evidence implementation item.

Work item:

- `CF-W1-UX-01B` - Stock Research Workbench trust evidence contract.

Branch / worktree:

- Branch: `codex/team08-ux-research/CF-W1-UX-01B`
- Worktree: `C:\work\repo\investment-scanner-worktrees\team08-CF-W1-UX-01B`
- Required base: stack from accepted Workbench trust-framing branch `codex/team08-ux-research/CF-W1-UX-01A` at `246d5a3 feat: add workbench trust framing`, then merge current `dev` before implementation.

Evidence to use:

- Requirement: `10-requirements/CF-W1-UX-01B-stock-research-workbench-trust-evidence-contract-requirement.md`
- Architecture review: `03-architecture/CF-W1-UX-01B-architecture-review.md`
- Contract: `06-contracts/CF-W1-UX-01B-stock-research-workbench-trust-evidence-contract.md`
- Work packet: `08-work-packets/CF-W1-UX-01B-work-packet.md`
- QA plan: `04-qa/CF-W1-UX-01B-qa-plan.md`
- Ready promotion: `13-implementation-evidence/CF-W1-UX-01B-ready-promotion.md`
- Ready handoff: `12-ready-queue/ready-for-implementation.md`

Allowed implementation files:

- `backend/src/modules/stock-research-workbench/stock-research-workbench.controller.ts`
- `backend/src/modules/stock-research-workbench/stock-research-workbench.service.ts`
- `backend/src/modules/stock-research-workbench/stock-research-workbench.types.ts`
- `backend/src/modules/stock-research-workbench/stock-research-workbench.validation.ts`
- `backend/src/modules/stock-research-workbench/stock-research-workbench.md`
- `backend/tests/modules/stock-research-workbench/stock-research-workbench.service.test.ts`
- `backend/tests/modules/stock-research-workbench/stock-research-workbench.validation.test.ts`
- `backend/tests/modules/stock-research-workbench/stock-research-workbench.routes.test.ts`
- `frontend/src/features/stock-research-workbench/api/stockResearchWorkbenchService.ts`
- `frontend/src/features/stock-research-workbench/types.ts`
- `frontend/src/features/stock-research-workbench/components/StockResearchWorkbenchPage.tsx`
- `frontend/tests/ui/stock-research-workbench.spec.ts`

Allowed reporting docs:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-08-CF-W1-UX-01B-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-UX-01B-developer-handoff.md`

Required behavior:

- Add additive page-owned `trust_evidence` without removing or renaming existing Workbench response fields.
- Send and reflect requested `region` and `assetType` from the Workbench client.
- Show explicit scope verification states: verified match, unverified, mismatch, or unsupported.
- Show latest page-owned evidence timestamp only with a truthful basis; otherwise keep evidence unavailable/unknown.
- Show blocker and limitation reasons on the Workbench page.
- Gate downstream Signal and Strategy widgets with page-owned `LIMITED` or `BLOCKED` states only.
- Suppress blocked widgets and show a local blocked reason.
- Preserve existing range controls, loading, error, and empty states.
- Keep research-support language and avoid advice, target, reward/risk, guarantee, or action-authorizing wording.

Forbidden files:

- `backend/src/api/routes.ts`
- `frontend/src/app/routes.tsx`
- `frontend/src/app/navigationMetadata.tsx`
- `frontend/src/contexts/MarketScopeContext.tsx`
- `backend/src/modules/market-data-foundation/**`
- `backend/src/modules/data-quality-engine/**`
- `backend/src/modules/signal-generation-engine/**`
- `backend/src/modules/strategy-decision-engine/**`
- `frontend/src/features/signal-generation-engine/**`
- `frontend/src/features/strategy-decision-engine/**`
- `frontend/src/shared/**`
- Prisma schema, migrations, generated files, package manifests, lockfiles, provider/live, startup/backfill, scheduler, worker, queue, paid/cloud, broker, or telemetry files

Required validation:

```powershell
cd backend
npm.cmd test -- stock-research-workbench.service.test.ts stock-research-workbench.validation.test.ts stock-research-workbench.routes.test.ts --runInBand
npm.cmd run build
cd frontend
npm.cmd run build
npm.cmd run test:ui -- stock-research-workbench.spec.ts --workers=1
```

Expected handoff:

- Update `17-team-outboxes/TEAM-08-CF-W1-UX-01B-outbox.md`.
- Create `18-integration-queue/CF-W1-UX-01B-developer-handoff.md`.
- Record exact branch/worktree, base commit, changed files, inspected files, behavior changed, tests run, skipped checks, forbidden files confirmed untouched, risks, blockers, and next gate: Team 04 QA Verification.

Stop and return to Team 00 if implementation requires route/navigation edits, shared UI/context, upstream module source/test changes, unsupported-scope fallback behavior, downstream widget internals, schema/generated/package/provider scope, or product-language drift.

## Latest Assignment Override - 2026-05-26 DOV-01

Team 00 promotes `CF-W2-DOV-01` as a bounded frontend-only Daily Overview dashboard implementation item.

Work item:

- `CF-W2-DOV-01` - Daily Overview interactive market dashboard first slice.

Branch / worktree:

- Branch: `codex/team08-ux-research/CF-W2-DOV-01`
- Worktree: `C:\work\repo\investment-scanner-worktrees\team08-CF-W2-DOV-01`
- Required base: Team 00 docs checkpoint commit containing `13-implementation-evidence/CF-W2-DOV-01-ready-promotion.md`

Evidence to use:

- Requirement: `10-requirements/CF-W2-DOV-01-daily-overview-interactive-market-dashboard-requirement.md`
- UX plan: `05-ux/CF-W2-DOV-01-daily-overview-dashboard-ux-plan.md`
- Architecture review: `03-architecture/CF-W2-DOV-01-architecture-review.md`
- Contract: `06-contracts/CF-W2-DOV-01-daily-overview-dashboard-contract.md`
- Work packet: `08-work-packets/CF-W2-DOV-01-work-packet.md`
- QA plan: `04-qa/CF-W2-DOV-01-qa-plan.md`
- Ready promotion: `13-implementation-evidence/CF-W2-DOV-01-ready-promotion.md`
- Ready handoff: `12-ready-queue/ready-for-implementation.md`

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

Required behavior:

- Keep `/` on the existing route and make `HomePage.tsx` a thin shell over the new dashboard feature.
- First viewport shows scope, freshness/trust context, and Daily Pulse.
- Use existing read APIs only; refresh is read-only.
- Keep Calibration Evidence-Through, Signal Position Follow-Through, and Measured Outcome Follow-Through as explicit `Coming soon` placeholders.
- Use section-local loading/error/empty states and show mixed evidence honestly.
- Keep research-support wording and avoid direct advice, targets, reward/risk, `R:R`, broker, and Trade Plan-first framing.

Forbidden files:

- all `backend/src/**` and `backend/tests/**`
- `frontend/src/app/routes.tsx`
- `frontend/src/app/navigationMetadata.tsx`
- shared UI, shared hooks, theme, or context rewrites
- existing feature page rewrites outside read-only imports/API calls
- Prisma schema or migrations
- generated files
- package manifests and lockfiles
- provider/live-data files
- pipeline command execution surfaces
- replacing approved `Coming soon` placeholders with inferred or hardcoded summaries

Required validation:

```powershell
cd frontend
npm.cmd run build
npm.cmd run test:ui -- daily-overview-dashboard.spec.ts --workers=1
```

Expected handoff:

- Update `17-team-outboxes/TEAM-08-CF-W2-DOV-01-outbox.md`.
- Create `18-integration-queue/CF-W2-DOV-01-developer-handoff.md`.
- Record exact branch/worktree, base commit, changed files, inspected files, behavior changed, tests run, skipped checks, forbidden files confirmed untouched, risks, blockers, and next gate: Team 04 QA Verification.

Stop and return to Team 00 if implementation needs backend changes, route-registry edits, shared UI, package/schema/generated scope, provider/live refresh, mutating pipeline commands, direct Smart Money or Backtests fanout beyond the approved read set, calibration aggregation from current calibration responses, or placeholder fakery.

## Assignment

Pull `CF-W3-MDPIPE-01B5` as the active Team 08 implementation item.

This is the Data Quality first child for page-local bulk-control removal after the accepted compact B6 pipeline status strip.

Product direction:

- `/pipeline-ops` is the Bulk Pipeline Dashboard for Monitoring and OPS.
- `/data-quality` should show compact backend pipeline progress/status and domain diagnostics only.
- Manual Data Quality execution must live only in `/pipeline-ops`.

Branch/worktree:

- Branch recommendation: `codex/w3-mdpipe-01b5-dq-control-removal`
- Worktree recommendation: `C:\work\repo\investment-scanner-worktrees\team08-CF-W3-MDPIPE-01B5`

## Gate Evidence

- Requirement: `10-requirements/CF-W3-MDPIPE-01B3-bulk-pipeline-ops-dashboard-requirement.md`
- UX plan: `05-ux/CF-W3-MDPIPE-01B5-01B6-pipeline-ops-control-migration-ux.md`
- Architecture: `03-architecture/CF-W3-MDPIPE-01B5-data-quality-first-child-control-removal-architecture.md`
- Contract: `06-contracts/CF-W3-MDPIPE-01B5-data-quality-page-control-removal-contract.md`
- Work packet: `08-work-packets/CF-W3-MDPIPE-01B5-data-quality-first-child-work-packet.md`
- QA plan: `04-qa/CF-W3-MDPIPE-01B5-data-quality-control-removal-qa-plan.md`
- Ready promotion: `13-implementation-evidence/CF-W3-MDPIPE-01B5-ready-promotion.md`
- Dependency closure: `CF-W3-MDPIPE-01B4` committed as `8d45ddc feat: add pipeline command api`
- Dependency closure: `CF-W3-MDPIPE-01B6` committed as `fb57cb0 feat: add data quality pipeline status strip`

## Allowed Writes

- `frontend/src/features/data-quality-engine/components/DataQualityEnginePage.tsx`
- `frontend/tests/ui/data-quality-engine.spec.ts`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-08-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W3-MDPIPE-01B5-developer-handoff.md`

## Forbidden Writes

- `frontend/src/features/data-quality-engine/components/DataQualityPipelineStatusStrip.tsx`
- `frontend/src/features/pipeline-ops/**`
- `frontend/src/app/routes.tsx`
- `frontend/src/app/navigationMetadata.tsx`
- `frontend/src/shared/components/**`
- `frontend/src/shared/hooks/**`
- `frontend/src/shared/theme/**`
- `frontend/src/contexts/MarketScopeContext.tsx`
- all other frontend feature pages and UI specs
- all backend source and backend tests
- Prisma schema, migrations, generated files
- package manifests and lockfiles
- provider/live call paths
- scheduler/startup behavior
- root `AGENTS.md`
- `docs/AGENTS.md`
- `docs/codex-agent-team-plan/**`

## Required Behavior

- Remove the page-local Data Quality `Evaluate Scope` header action.
- Remove the drawer-local Data Quality `Evaluate Scope` action.
- Remove the local `BatchProgressBar`.
- Preserve the accepted compact B6 pipeline status strip directly below the page header.
- Preserve local `Refresh`, diagnostics, filters, views, table, and drawer detail behavior.
- Replace stale local-control copy with `/pipeline-ops`-aligned wording where needed.
- Do not add a disabled local trigger shell or future-launcher affordance on `/data-quality`.
- Do not post to Data Quality evaluation, Pipeline Ops command execution, provider/live, scheduler, or downstream execution paths from `/data-quality` render or refresh.

## Required Validation

```powershell
cd frontend
npm.cmd run build
npm.cmd run test:ui -- pipeline-ops.spec.ts data-quality-engine.spec.ts --workers=1
```

## Stop Conditions

Stop and return to Team 00 if this requires edits to the compact strip component, Pipeline Ops source, shared UI, route/navigation, backend, package, generated files, provider/live, scheduler/startup, another feature page, or command execution from `/data-quality`.

## Expected Outbox

Update `17-team-outboxes/TEAM-08-outbox.md`.

Write `18-integration-queue/CF-W3-MDPIPE-01B5-developer-handoff.md` after implementation and validation.
