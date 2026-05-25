# CF-W3-MDPIPE-01B5 / CF-W3-MDPIPE-01B6 - Control Migration And Compact Progress Indicators Architecture

Date: 2026-05-25

Architect: Team 03 - Solution Architect

Status: Split verdict.

- `CF-W3-MDPIPE-01B6`: `READY-CANDIDATE` as a first frontend-only compact-indicator overlap slice.
- `CF-W3-MDPIPE-01B5`: `BLOCKED` until `CF-W3-MDPIPE-01B4` is accepted and the enabled command matrix is stable.

## Current State Evidence

Inspected:

- root `AGENTS.md`
- `00-control/active-work-board.md`
- `03-architecture/shared-file-control.md`
- `04-qa/CF-W3-MDPIPE-01B5-01B6-control-migration-progress-indicators-qa-plan.md`
- `05-ux/CF-W3-MDPIPE-01B5-01B6-pipeline-ops-control-migration-ux.md`
- `06-contracts/CF-W3-MDPIPE-01B4-pipeline-command-api-contract.md`
- `03-architecture/CF-W3-MDPIPE-01B3-S1-pipeline-ops-dashboard-architecture.md`
- `03-architecture/CF-W3-MDPIPE-01B4-pipeline-command-api-architecture.md`
- `08-work-packets/CF-W3-MDPIPE-01B4-work-packet.md`
- `01-governance/dirty-worktree-inventory.md`
- current frontend source for:
  - `frontend/src/features/pipeline-ops/**`
  - `frontend/src/features/data-quality-engine/components/DataQualityEnginePage.tsx`
  - current Playwright coverage in `frontend/tests/ui/data-quality-engine.spec.ts`

Current facts:

- `/pipeline-ops` already exists as the read-only monitoring home.
- `CF-W3-MDPIPE-01B4` is active separately and the approved first command scope enables only `DATA_QUALITY_EVALUATE_SCOPE`.
- `DataQualityEnginePage` currently has a header-level `Evaluate Scope` control plus a local `BatchProgressBar`.
- `usePipelineStatus()` and the status DTOs are already exported from `frontend/src/features/pipeline-ops/index.ts`.
- `frontend/src/features/market-data-foundation/**` is already dirty in the main workspace and must not be pulled into this first slice.

## Architecture Decision

Do not combine `CF-W3-MDPIPE-01B5` and `CF-W3-MDPIPE-01B6` into one first implementation pass.

Select the smallest safe first slice:

1. implement `CF-W3-MDPIPE-01B6` first;
2. narrow the first implementation to the Data Quality feature only;
3. keep the page-local `Evaluate Scope` control and local `BatchProgressBar` in place during this overlap slice;
4. defer `CF-W3-MDPIPE-01B5` control removal until `CF-W3-MDPIPE-01B4` is accepted through QA, review, and Architect signoff.

## Why Data Quality First

Data Quality is the safest first compact-indicator target because:

- the command matrix already approves only the Data Quality command path;
- the page-to-stage mapping is direct: `/data-quality` -> `DATA_QUALITY`;
- the feature file set is small and currently not listed as dirty in the main worktree;
- the page does not require route-registry, backend, Prisma, package, or shared-UI edits to render a read-only indicator;
- the overlap model is honest: the new strip shows durable backend status while the old page-local runner still preserves current manual capability.

## First-Slice Behavior

Add a compact read-only pipeline status strip to `DataQualityEnginePage` under the page header and above the scope explainer.

The strip must:

- consume only `GET /api/v1/pipeline/status` via the existing `usePipelineStatus()` hook;
- resolve only the `DATA_QUALITY` stage from `PipelineStatusSnapshot.stages`;
- show scope, stage status, processed/total progress when present, latest relevant timestamps, warning/error counts, and a deep link to `/pipeline-ops`;
- rehydrate on mount, refresh, and `region` / `assetType` changes through the existing hook behavior;
- stay read-only and never call `POST /api/v1/pipeline/commands` or `POST /api/v1/data-quality/evaluate`.

The strip must not:

- replace the page-local button in this first slice;
- replace the local `BatchProgressBar` in this first slice;
- invent stale thresholds from pipeline status alone;
- add trigger buttons to the feature page.

## B5 Control-Migration Gate

`CF-W3-MDPIPE-01B5` is blocked now.

Removal of page-local bulk controls is allowed only after all of the following are true:

1. `CF-W3-MDPIPE-01B4` is accepted, not merely in implementation;
2. the enabled command matrix remains limited and explicit;
3. the corresponding feature page has a shipped compact indicator;
4. the replacement path is functionally equivalent and verified by QA;
5. Team 00 opens a separate removal reservation.

For the first future `B5` child, only the Data Quality page is eligible. No other feature-page bulk control may be removed in the same pass.

## Exact File Reservation For `CF-W3-MDPIPE-01B6` First Slice

Allowed:

- `frontend/src/features/data-quality-engine/components/DataQualityEnginePage.tsx`
- `frontend/src/features/data-quality-engine/components/DataQualityPipelineStatusStrip.tsx` (new)
- `frontend/tests/ui/data-quality-engine.spec.ts`
- active execution docs only

Conditionally allowed only if implementation proves absolutely necessary and Team 00 reserves it explicitly:

- `frontend/src/features/data-quality-engine/index.ts` for a local export only

Forbidden:

- all backend source and backend tests
- `frontend/src/features/pipeline-ops/**`
- `frontend/src/app/routes.tsx`
- `frontend/src/app/navigationMetadata.tsx`
- `frontend/src/shared/components/**`
- `frontend/src/shared/hooks/**`
- `frontend/src/shared/theme/**`
- `frontend/src/contexts/MarketScopeContext.tsx`
- all other feature pages and tests
- Prisma/schema/migrations/generated files
- package manifests and lockfiles
- provider/live calls
- scheduler/startup behavior
- `docs/AGENTS.md`
- `docs/codex-agent-team-plan/**`

Shared UI is explicitly forbidden in this first slice. The indicator must be feature-local.

## Validation Expectations

Required after implementation:

```text
cd frontend
npm.cmd run build
```

```text
cd frontend
npm.cmd run test:ui -- pipeline-ops.spec.ts data-quality-engine.spec.ts --workers=1
```

UI verification must prove:

- the Data Quality page renders a compact read-only pipeline indicator;
- the legacy `Evaluate Scope` button is still present in `B6`;
- the indicator reflects `RUNNING`, terminal, and no-run evidence from mocked pipeline status data;
- the indicator deep link reaches `/pipeline-ops`;
- indicator rendering and refresh do not emit bulk-action POSTs.

## Stop Conditions

Stop and return to Team 00 / Architect if the first slice requires:

- removing the `Evaluate Scope` button or the local `BatchProgressBar`;
- editing shared UI or `pipeline-ops` files;
- editing any backend file;
- widening into Signal, Calibration, Market Data, Today Review, or other feature pages;
- adding command execution from the Data Quality page;
- changing route registries, package files, Prisma, generated files, or market-scope helpers.

## Architecture Verdict

- `CF-W3-MDPIPE-01B6`: Ready candidate as a Data Quality-only, frontend-only, overlap slice.
- `CF-W3-MDPIPE-01B5`: Blocked until `CF-W3-MDPIPE-01B4` is accepted and a separate removal reservation is opened.

No Product Owner consent blocker is open. The block is technical sequencing, not product-direction ambiguity.
