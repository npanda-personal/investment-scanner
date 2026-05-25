# CF-W3-MDPIPE-01B6 Compact Progress Indicator Contract

Date: 2026-05-25

Owner: Team 03 - Solution Architect

Status: Contract ready candidate for the first compact-indicator slice only.

## Intent

Define the smallest read-only contract needed for a feature-page compact pipeline indicator without changing backend DTOs or shared UI.

The first implementation slice applies only to:

- route: `/data-quality`
- stage key: `DATA_QUALITY`

## Source Contract

Consume only the existing frontend status contract:

- `fetchPipelineStatus()`
- `usePipelineStatus(region, assetType)`
- `PipelineStatusSnapshot`
- `PipelineStatusStageGroup`
- `PipelineStatusStage`

No new backend fields are allowed in this slice.

## Stage Resolution

For the first slice, the feature page resolves one stage only:

```ts
const stageGroup = snapshot?.stages.find((stage) => stage.stageKey === 'DATA_QUALITY') ?? null;
const stage = stageGroup?.activeStage ?? stageGroup?.lastStage ?? null;
```

The page must not infer or render any other stage.

## Derived View Model

The compact indicator may derive a local view model like:

```ts
type CompactPipelineIndicatorStatus = PipelineStatusValue | 'NO_RUN_EVIDENCE';

interface CompactPipelineIndicatorModel {
  scope: {
    region: string;
    assetType: string;
  };
  stageKey: 'DATA_QUALITY';
  stageLabel: 'Data Quality';
  status: CompactPipelineIndicatorStatus;
  progress: {
    processedCount: number | null;
    totalCount: number | null;
    percent: number | null;
    hasKnownTotal: boolean;
  };
  counts: {
    succeededCount: number;
    partialCount: number;
    failedCount: number;
    skippedCount: number;
  };
  evidence: {
    startedAt: string | null;
    completedAt: string | null;
    updatedAt: string | null;
    dataThroughDate: string | null;
    warningsCount: number;
    errorsCount: number;
  };
  navigation: {
    href: '/pipeline-ops';
    label: 'View Pipeline Ops details';
  };
}
```

This is a frontend-local derivation only. It must not be promoted into shared DTOs in this slice.

## Status Rules

- `NO_RUN_EVIDENCE`: no matching `DATA_QUALITY` stage row exists.
- `PENDING` or `RUNNING`: derive from `activeStage` when present.
- `COMPLETED`, `PARTIAL`, `FAILED`, `BLOCKED`, `SKIPPED`: derive from `lastStage` when no active stage exists.

The page must use backend status words directly. No friendlier replacement labels are allowed.

## Progress Rules

- If `totalCount > 0`, show `processedCount / totalCount` and percent.
- If `totalCount <= 0`, show processed count and an indeterminate or no-percent presentation.
- The indicator must never invent a percentage from timestamps or prior local batch state.

## No-Run And Error Rules

- When `NO_RUN_EVIDENCE`, show explicit no-evidence copy for the current scope.
- If `usePipelineStatus()` returns an error, show a small inline indicator error and keep the rest of the feature page usable.
- The indicator must not replace page-owned domain errors.

## Interaction Rules

Allowed:

- navigation to `/pipeline-ops`
- passive refresh through the existing polling hook

Forbidden:

- manual trigger buttons
- retries
- batch runner start
- command POSTs
- provider/live calls

## Compatibility Boundaries

This contract must not require edits to:

- backend DTOs
- `frontend/src/features/pipeline-ops/**`
- shared frontend components
- route registries
- package manifests

## Future Extension Rule

Later pages may adopt the same pattern, but each new page/stage mapping requires its own file reservation and Team 00 promotion.

This contract does not authorize multi-page rollout in one pass.
