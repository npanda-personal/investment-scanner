# CF-W3-MDPIPE-01B5 Ready Promotion

Date: 2026-05-25

Owner: Team 00 - Master Orchestrator / Integration

Status: READY FOR IMPLEMENTATION

## Work Item

`CF-W3-MDPIPE-01B5` - Data Quality first child for page-local bulk-control removal.

First slice:

- Feature page: Data Quality Engine
- Route: `/data-quality`
- Stage key: `DATA_QUALITY`
- Mode: frontend-only control centralization

## Gate Evidence

- Requirement: `10-requirements/CF-W3-MDPIPE-01B3-bulk-pipeline-ops-dashboard-requirement.md`
- UX plan: `05-ux/CF-W3-MDPIPE-01B5-01B6-pipeline-ops-control-migration-ux.md`
- Architecture: `03-architecture/CF-W3-MDPIPE-01B5-data-quality-first-child-control-removal-architecture.md`
- Contract: `06-contracts/CF-W3-MDPIPE-01B5-data-quality-page-control-removal-contract.md`
- Work packet: `08-work-packets/CF-W3-MDPIPE-01B5-data-quality-first-child-work-packet.md`
- QA plan: `04-qa/CF-W3-MDPIPE-01B5-data-quality-control-removal-qa-plan.md`
- Dependency closure: `CF-W3-MDPIPE-01B4` accepted and committed as `8d45ddc feat: add pipeline command api`
- Dependency closure: `CF-W3-MDPIPE-01B6` accepted and committed as `fb57cb0 feat: add data quality pipeline status strip`
- Open decisions: none

## Allowed Files

- `frontend/src/features/data-quality-engine/components/DataQualityEnginePage.tsx`
- `frontend/tests/ui/data-quality-engine.spec.ts`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-08-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W3-MDPIPE-01B5-developer-handoff.md`

## Forbidden Files

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
- Prisma schema, migrations, and generated files
- package manifests and lockfiles
- route registries
- provider/live call paths
- scheduler/startup behavior
- root `AGENTS.md`
- `docs/AGENTS.md`
- `docs/codex-agent-team-plan/**`

## Required Behavior

- Remove the page-local Data Quality `Evaluate Scope` header action.
- Remove the drawer-local Data Quality `Evaluate Scope` action.
- Remove the local `BatchProgressBar` from `/data-quality`.
- Preserve the accepted B6 compact pipeline status strip.
- Preserve local `Refresh`, diagnostics, filters, views, table, and drawer detail behavior.
- Keep `/pipeline-ops` as the only manual bulk-operation command home.
- Do not emit `POST /api/v1/data-quality/evaluate` or `POST /api/v1/pipeline/commands` from `/data-quality` render or refresh.

## Required Validation

```powershell
cd frontend
npm.cmd run build
npm.cmd run test:ui -- pipeline-ops.spec.ts data-quality-engine.spec.ts --workers=1
```

## Team Assignment

- Owner: Team 08 - UX / Research / Copilot frontend worker
- Branch recommendation: `codex/w3-mdpipe-01b5-dq-control-removal`
- Worktree recommendation: `C:\work\repo\investment-scanner-worktrees\team08-CF-W3-MDPIPE-01B5`

## Product Owner Action

Not required. This is a routine implementation handoff under standing delegation and stays inside the approved Data Quality frontend file reservation.
