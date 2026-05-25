# CF-W3-MDPIPE-01B5 Data Quality Page Control Removal Contract

Date: 2026-05-25

Owner: Team 03 - Solution Architect

Status: Contract ready candidate after `CF-W3-MDPIPE-01B6` acceptance. Not ready for implementation while `B6` remains in rework.

## Intent

Remove Data Quality page-local bulk-control behavior only after `/pipeline-ops` provides the approved equivalent command path and `/data-quality` already ships the accepted compact status strip.

This contract centralizes bulk operation control on `/pipeline-ops`.

## In Scope

Route:

```text
/data-quality
```

Mapped stage:

```text
DATA_QUALITY
```

Approved dashboard command home:

```text
/pipeline-ops -> DATA_QUALITY_EVALUATE_SCOPE
```

## Required Feature-Page Result

After the child lands, `/data-quality` must:

- keep the compact read-only `DATA_QUALITY` strip;
- keep the `/pipeline-ops` deep link;
- keep diagnostics, readiness, filters, and drawer detail behavior;
- stop exposing page-local bulk evaluation controls.

## Removal Rules

The child must remove or neutralize all local bulk-control entry points on `/data-quality`:

- header-level `Evaluate Scope` action;
- drawer-level `Evaluate Scope` action;
- local `BatchProgressBar` bulk progress strip;
- page copy that instructs the user to run bulk evaluation locally.

Allowed replacement behavior:

- compact read-only pipeline strip;
- local `Refresh`;
- link to `/pipeline-ops`.

Forbidden replacement behavior:

- any new local manual trigger;
- any disabled local pseudo-trigger that looks like a future launcher;
- any duplicate bulk command affordance outside `/pipeline-ops`.

## Read-Only Status Requirement

The compact indicator remains governed by the accepted `CF-W3-MDPIPE-01B6` contract.

`B5` must not alter the status-source model:

- use the existing `usePipelineStatus(region, assetType)` path;
- rely on the accepted `DATA_QUALITY` strip behavior;
- do not add local progress estimation or local no-run inference;
- do not change loading/error/no-run classification rules.

## Command Routing Rule

After migration:

- feature page bulk execution must not call `POST /api/v1/data-quality/evaluate`;
- feature page bulk execution must not call `POST /api/v1/pipeline/commands`;
- manual bulk execution lives only on `/pipeline-ops`.

This contract does not authorize new commands, wider command availability, or feature-page trigger buttons.

## Compatibility Boundaries

This child must not require edits to:

- `frontend/src/features/data-quality-engine/components/DataQualityPipelineStatusStrip.tsx`
- `frontend/src/features/pipeline-ops/**`
- route registries
- shared frontend components
- shared frontend hooks
- backend DTOs
- backend source or backend tests
- Prisma/schema/migrations/generated files
- package manifests or lockfiles

## Exact File Writer Set

- `frontend/src/features/data-quality-engine/components/DataQualityEnginePage.tsx`
- `frontend/tests/ui/data-quality-engine.spec.ts`

## UI Contract

The page must clearly communicate the centralization model:

- `/pipeline-ops` is the Monitoring and Ops home;
- `/data-quality` shows compact status and domain diagnostics only.

The page must not leave stale local-control language such as:

- `Run Evaluate Scope`
- `Evaluate Scope`
- `Run Evaluate Scope to populate diagnostics`

unless the text appears only in historical evidence rendered from backend data, not as an available instruction.

## Test Contract

Focused UI verification must prove:

- no local `Evaluate Scope` button remains on `/data-quality`;
- no local bulk progress bar remains on `/data-quality`;
- compact strip remains visible and scope-aware;
- strip deep link still routes to `/pipeline-ops`;
- `/pipeline-ops` remains the only page with the Data Quality manual command affordance;
- no Data Quality bulk POST is emitted from `/data-quality`;
- accepted `B6` loading/error/no-run distinctions remain intact after removal.
