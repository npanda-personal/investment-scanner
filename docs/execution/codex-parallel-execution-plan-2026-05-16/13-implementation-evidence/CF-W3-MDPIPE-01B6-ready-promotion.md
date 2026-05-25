# CF-W3-MDPIPE-01B6 Ready Promotion

Date: 2026-05-25

Owner: Team 00 - Master Orchestrator / Integration

Status: READY FOR IMPLEMENTATION

## Work Item

`CF-W3-MDPIPE-01B6` - first compact per-screen backend pipeline progress indicator.

First slice:

- Feature page: Data Quality Engine
- Route: `/data-quality`
- Stage key: `DATA_QUALITY`
- Mode: frontend-only, read-only overlap slice

## Gate Evidence

- Requirement: `10-requirements/CF-W3-MDPIPE-01B3-bulk-pipeline-ops-dashboard-requirement.md`
- Architecture: `03-architecture/CF-W3-MDPIPE-01B5-01B6-control-migration-progress-indicators-architecture.md`
- Contract: `06-contracts/CF-W3-MDPIPE-01B6-compact-progress-indicator-contract.md`
- Work packet: `08-work-packets/CF-W3-MDPIPE-01B6-first-compact-indicator-work-packet.md`
- QA plan: `04-qa/CF-W3-MDPIPE-01B5-01B6-control-migration-progress-indicators-qa-plan.md`
- Dependency closure: `CF-W3-MDPIPE-01B4` accepted and committed as `8d45ddc feat: add pipeline command api`
- Open decisions: none

## Allowed Files

- `frontend/src/features/data-quality-engine/components/DataQualityEnginePage.tsx`
- `frontend/src/features/data-quality-engine/components/DataQualityPipelineStatusStrip.tsx` (new)
- `frontend/tests/ui/data-quality-engine.spec.ts`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-08-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W3-MDPIPE-01B6-developer-handoff.md`

## Forbidden Files

- all backend source and backend tests
- `frontend/src/features/pipeline-ops/**`
- `frontend/src/app/routes.tsx`
- `frontend/src/app/navigationMetadata.tsx`
- `frontend/src/shared/components/**`
- `frontend/src/shared/hooks/**`
- `frontend/src/shared/theme/**`
- `frontend/src/contexts/MarketScopeContext.tsx`
- all other frontend feature pages and tests
- Prisma schema, migrations, and generated files
- package manifests and lockfiles
- provider/live call paths
- scheduler/startup behavior
- root `AGENTS.md`
- `docs/AGENTS.md`
- `docs/codex-agent-team-plan/**`

## Required Behavior

- Add a feature-local compact read-only pipeline status strip below `PageHeader`.
- Use `usePipelineStatus(scope.region, scope.assetType)` from the existing Pipeline Ops feature export.
- Resolve only `DATA_QUALITY`.
- Show scope, status, progress, relevant timestamps, warning/error counts, and a deep link to `/pipeline-ops`.
- Keep the page-local `Evaluate Scope` button.
- Keep the local `BatchProgressBar`.
- Do not emit `POST /api/v1/data-quality/evaluate` or `POST /api/v1/pipeline/commands` from indicator rendering.

## Required Validation

```powershell
cd frontend
npm.cmd run build
npm.cmd run test:ui -- pipeline-ops.spec.ts data-quality-engine.spec.ts --workers=1
```

## Team Assignment

- Owner: Team 08 - UX / Research / Copilot frontend worker
- Branch recommendation: `codex/w3-mdpipe-01b6-dq-compact-indicator`
- Worktree recommendation: dedicated Team 08 implementation worktree if using worktrees; otherwise one writer in `dev` only if Team 00 keeps all other frontend writers idle.

## Product Owner Action

Not required. This is a routine implementation handoff under standing delegation and does not introduce a true consent blocker.
