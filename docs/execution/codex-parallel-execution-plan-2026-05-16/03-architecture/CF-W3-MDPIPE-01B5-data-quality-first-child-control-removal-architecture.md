# CF-W3-MDPIPE-01B5 - Data Quality First Child Control Removal Architecture

Date: 2026-05-25

Architect: Team 03 - Solution Architect

Status: `BLOCKED-PENDING-B6-ACCEPTANCE`

## Decision

`CF-W3-MDPIPE-01B5` must proceed one page at a time.

Do not open a multi-page removal pass.

The first safe child after `CF-W3-MDPIPE-01B6` acceptance is:

```text
/data-quality -> DATA_QUALITY
```

This child preserves `/pipeline-ops` as the Bulk Pipeline Monitoring and Ops home and reduces `/data-quality` to a compact status surface plus domain content.

## Why The B5 Path Must Stay One Page At A Time

Multi-page removal is not safe yet because:

1. `CF-W3-MDPIPE-01B6` is still in rework and currently occupies the same Data Quality frontend files that any first `B5` child would need.
2. The approved command path is still narrow. The current command contract enables only `DATA_QUALITY_EVALUATE_SCOPE`; other page-level controls do not yet have equivalent approved `/pipeline-ops` command coverage.
3. Several candidate pages keep non-pipeline local tools that must remain local even after bulk-control migration, especially Market Data, Context Snapshots, and Backtests.
4. Validation risk is high if multiple pages remove controls at once, because each page has different no-run, empty-state, and residual-tool behavior.

## Current Dependency State

Read-only evidence:

- `09-summaries/team-00-pipeline-ops-runtime-summary.md`
- `05-ux/CF-W3-MDPIPE-01B5-01B6-pipeline-ops-control-migration-ux.md`
- `10-requirements/CF-W3-MDPIPE-01B3-bulk-pipeline-ops-dashboard-requirement.md`
- `10-requirements/CF-W3-MDPIPE-01B4-command-api-manual-trigger-safety-requirement.md`
- `06-contracts/CF-W3-MDPIPE-01B4-pipeline-command-api-contract.md`
- `06-contracts/CF-W3-MDPIPE-01B6-compact-progress-indicator-contract.md`
- `18-integration-queue/CF-W3-MDPIPE-01B6-code-review.md`

Current gating facts:

- `/pipeline-ops` is already the Monitoring and Ops home.
- Team 08 is actively reworking `CF-W3-MDPIPE-01B6`.
- Team 10 rejected `B6` because the Data Quality strip misclassified loading/error as `NO_RUN_EVIDENCE`.
- The first approved command path is still only `DATA_QUALITY_EVALUATE_SCOPE`.
- Team 05 is actively editing `CF-W3-MDPIPE-01C` backend files and remains out of scope for this child.

## First Safe B5 Child

The first safe `B5` child is a Data Quality-only removal pass after the Data Quality compact strip is accepted.

Allowed behavior change:

- remove page-local bulk-control entry points from `/data-quality`;
- keep the accepted compact `DATA_QUALITY` strip;
- route the user to `/pipeline-ops` for manual bulk execution and durable run evidence.

Required preserved behavior:

- `/pipeline-ops` remains the only home for approved manual bulk commands;
- `/data-quality` remains usable as a diagnostics and readiness page;
- the compact strip remains read-only and scope-aware;
- page-local diagnostics, filters, drawer detail, and refresh behavior remain local.

## Entry Criteria For This Child

Do not start implementation until all of the following are true:

1. `CF-W3-MDPIPE-01B6` rework is accepted through QA and Team 10 re-review.
2. The accepted `B6` strip on `/data-quality` correctly separates loading, fetch error, and loaded no-run evidence.
3. Team 00 confirms the `/pipeline-ops` Data Quality command path is still the approved equivalent manual command for this page.
4. Team 00 opens a dedicated `B5` Data Quality removal reservation.

If `B6` rework expands its file set, `B5` stays blocked until those files are released.

## Exact File Reservation For The First Child

Allowed writer set:

- `frontend/src/features/data-quality-engine/components/DataQualityEnginePage.tsx`
- `frontend/tests/ui/data-quality-engine.spec.ts`

Forbidden:

- `frontend/src/features/data-quality-engine/components/DataQualityPipelineStatusStrip.tsx`
- `frontend/src/features/pipeline-ops/**`
- `frontend/src/app/routes.tsx`
- `frontend/src/app/navigationMetadata.tsx`
- `frontend/src/shared/components/**`
- `frontend/src/shared/hooks/**`
- `frontend/src/shared/theme/**`
- `frontend/src/contexts/MarketScopeContext.tsx`
- `frontend/src/features/market-data-foundation/**`
- all other feature pages and UI specs
- all backend source and backend tests
- Prisma/schema/migrations/generated files
- package manifests and lockfiles
- route registries
- shared UI and shared utility files

Why the strip file is forbidden:

- `B6` owns the compact-strip acceptance;
- `B5` should consume that accepted strip, not reopen it;
- this keeps the first removal child to one page file plus one focused UI spec.

## Required Page-Level Removal Scope

The first child must remove all page-local Data Quality bulk-control entry points that duplicate the new `/pipeline-ops` command home:

- header `Evaluate Scope` primary action;
- drawer-level `Evaluate Scope` action;
- local `BatchProgressBar` bulk progress surface;
- stale page copy that tells the user to run `Evaluate Scope` locally.

The first child must preserve:

- page-local `Refresh`;
- diagnostics table, filters, and quality views;
- details drawer and research link;
- accepted compact pipeline strip and `/pipeline-ops` deep link.

## No-Route / No-Shared / No-Package Constraints

This child is not allowed to:

- edit frontend or backend route registries;
- edit shared frontend components or shared hooks;
- edit `pipeline-ops` source or shared DTOs;
- edit package manifests, lockfiles, or generated files;
- add provider/live, scheduler, or backend execution behavior;
- move Data Quality command execution back onto the feature page.

## Required QA Focus

QA should treat this as a centralization proof, not a cosmetic cleanup.

Minimum focus:

1. `/data-quality` no longer exposes a working local `Evaluate Scope` entry point anywhere on the page.
2. `/data-quality` no longer renders the local `BatchProgressBar`.
3. The accepted compact strip still shows correct loading, fetch-error, loaded no-run, active, and terminal states after control removal.
4. `/pipeline-ops` remains the only manual command surface for `DATA_QUALITY_EVALUATE_SCOPE`.
5. Page copy no longer instructs the user to run Data Quality locally.
6. Rendering or refreshing `/data-quality` emits no `POST /api/v1/data-quality/evaluate` and no `POST /api/v1/pipeline/commands`.
7. Scope changes still rehydrate the compact strip from `GET /api/v1/pipeline/status`.

## Stop Conditions

Stop and return to Team 00 if the first child needs any of the following:

- edits to `DataQualityPipelineStatusStrip.tsx`;
- edits to `/pipeline-ops` source;
- shared UI extraction;
- backend changes or command-contract expansion;
- route changes;
- package or generated-file changes;
- widening into Signals, Calibration, Market Data, Today Review, or any other page.

## Architecture Verdict

- `CF-W3-MDPIPE-01B5` should advance one page at a time.
- The first safe child is `Data Quality` only.
- The child stays blocked until `CF-W3-MDPIPE-01B6` is accepted and Team 00 opens a separate removal reservation.
