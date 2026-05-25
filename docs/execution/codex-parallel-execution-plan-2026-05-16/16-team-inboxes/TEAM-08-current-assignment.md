# TEAM-08 Current Assignment

Date: 2026-05-25

Team: TEAM-08 - UX / Research / Copilot

Prompt file: `docs/execution/codex-parallel-execution-plan-2026-05-16/15-automation-prompts/AUTO-08-ux-research-copilot.md`

## Assignment

Pull `CF-W3-MDPIPE-01B6` as the active Team 08 implementation item.

This is a frontend-only compact backend pipeline progress indicator for the Data Quality page. It is an overlap slice: do not remove existing Data Quality page controls yet.

Branch/worktree:

- Branch recommendation: `codex/w3-mdpipe-01b6-dq-compact-indicator`
- Worktree recommendation: `C:\work\repo\investment-scanner-worktrees\team08-CF-W3-MDPIPE-01B6`

## Gate Evidence

- Requirement: `10-requirements/CF-W3-MDPIPE-01B3-bulk-pipeline-ops-dashboard-requirement.md`
- Architecture: `03-architecture/CF-W3-MDPIPE-01B5-01B6-control-migration-progress-indicators-architecture.md`
- Contract: `06-contracts/CF-W3-MDPIPE-01B6-compact-progress-indicator-contract.md`
- Work packet: `08-work-packets/CF-W3-MDPIPE-01B6-first-compact-indicator-work-packet.md`
- QA plan: `04-qa/CF-W3-MDPIPE-01B5-01B6-control-migration-progress-indicators-qa-plan.md`
- Ready promotion: `13-implementation-evidence/CF-W3-MDPIPE-01B6-ready-promotion.md`
- Dependency closure: `CF-W3-MDPIPE-01B4` committed as `8d45ddc feat: add pipeline command api`

## Allowed Writes

- `frontend/src/features/data-quality-engine/components/DataQualityEnginePage.tsx`
- `frontend/src/features/data-quality-engine/components/DataQualityPipelineStatusStrip.tsx` (new)
- `frontend/tests/ui/data-quality-engine.spec.ts`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-08-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W3-MDPIPE-01B6-developer-handoff.md`

## Forbidden Writes

- all backend source and backend tests
- `frontend/src/features/pipeline-ops/**`
- `frontend/src/app/routes.tsx`
- `frontend/src/app/navigationMetadata.tsx`
- `frontend/src/shared/components/**`
- `frontend/src/shared/hooks/**`
- `frontend/src/shared/theme/**`
- `frontend/src/contexts/MarketScopeContext.tsx`
- all other frontend feature pages and tests
- Prisma schema, migrations, generated files
- package manifests and lockfiles
- provider/live call paths
- scheduler/startup behavior
- root `AGENTS.md`
- `docs/AGENTS.md`
- `docs/codex-agent-team-plan/**`

## Required Behavior

- Add a feature-local compact read-only pipeline status strip below the Data Quality `PageHeader`.
- Consume `usePipelineStatus(scope.region, scope.assetType)` from the existing Pipeline Ops feature export.
- Resolve only the `DATA_QUALITY` stage.
- Show current scope, stage status, processed/total progress, latest relevant timestamps, warning/error counts, and a deep link to `/pipeline-ops`.
- Keep `Evaluate Scope`.
- Keep the local `BatchProgressBar`.
- Do not post to Data Quality evaluation, Pipeline Ops command execution, provider/live, scheduler, or downstream execution paths from the indicator.

## Required Validation

```powershell
cd frontend
npm.cmd run build
npm.cmd run test:ui -- pipeline-ops.spec.ts data-quality-engine.spec.ts --workers=1
```

## Stop Conditions

Stop and return to Team 00 if this requires shared UI, route/navigation, backend, package, generated, provider/live, scheduler/startup, another feature page, or command execution from `/data-quality`.

## Expected Outbox

Update `17-team-outboxes/TEAM-08-outbox.md`.

Write `18-integration-queue/CF-W3-MDPIPE-01B6-developer-handoff.md` after implementation and validation.
