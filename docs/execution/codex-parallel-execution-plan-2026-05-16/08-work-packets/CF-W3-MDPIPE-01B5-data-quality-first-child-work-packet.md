# CF-W3-MDPIPE-01B5 Data Quality First Child Work Packet

Date: 2026-05-25

## Work Item

Remove page-local Data Quality bulk-control behavior after the Data Quality compact strip is accepted.

This packet covers only:

- feature page: `Data Quality`
- route: `/data-quality`
- stage: `DATA_QUALITY`

This packet does not cover any other feature page.

## State

`BLOCKED-PENDING-B6-ACCEPTANCE`

## Dependencies

Required before Team 00 promotion:

1. accepted `CF-W3-MDPIPE-01B6` rework on `/data-quality`;
2. accepted `/pipeline-ops` Data Quality manual command path for `DATA_QUALITY_EVALUATE_SCOPE`;
3. Team 00 file reservation for this child only.

## Owner / Lane / Module

- Architecture owner: Team 03 - Solution Architect
- Recommended implementation owner: Team 08 or another Team 00-assigned frontend owner after Team 08 releases the B6 file set
- Lane: frontend pipeline status centralization
- Frontend feature: `data-quality-engine`

## Recommended Branch

```text
codex/w3-mdpipe-01b5-dq-control-removal
```

## Exact Allowed File Reservations After Team 00 Promotion

- `frontend/src/features/data-quality-engine/components/DataQualityEnginePage.tsx`
- `frontend/tests/ui/data-quality-engine.spec.ts`

Docs after implementation:

- active execution-folder implementation evidence and assigned owner outbox only

## Exact Forbidden File Reservations

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
- Prisma/schema/migrations/generated files
- package manifests and lockfiles
- route registries
- root `AGENTS.md`
- `docs/AGENTS.md`
- `docs/codex-agent-team-plan/**`

## Required Behavior

Implementation must:

- remove the header `Evaluate Scope` primary action;
- remove the drawer `Evaluate Scope` action;
- remove the local `BatchProgressBar`;
- replace stale local-control copy with `/pipeline-ops`-aligned wording;
- preserve the accepted compact strip directly below the page header;
- preserve local `Refresh`, diagnostics, filters, views, table, and drawer behavior.

Implementation must not:

- edit the compact-strip component;
- add new page-local manual trigger controls;
- add unavailable-state buttons that still look like local launchers;
- call `POST /api/v1/data-quality/evaluate` from the feature page;
- call `POST /api/v1/pipeline/commands` from the feature page.

## Required Tests

Focused validation after implementation:

```text
cd frontend
npm.cmd run build
```

```text
cd frontend
npm.cmd run test:ui -- pipeline-ops.spec.ts data-quality-engine.spec.ts --workers=1
```

## QA Focus

UI smoke must prove:

1. `/data-quality` shows the accepted compact pipeline strip and no full local bulk-control surface.
2. Header and drawer no longer expose `Evaluate Scope`.
3. Local `BatchProgressBar` is absent.
4. `/pipeline-ops` remains the only manual command path for Data Quality.
5. The page no longer instructs the user to run bulk Data Quality locally.
6. The compact strip still handles loading, error, no-run, active, and terminal states correctly.
7. Rendering or refreshing `/data-quality` does not emit bulk-action POSTs.

## Stop Conditions

Stop and return to Team 00 / Architect if implementation requires:

- edits to `DataQualityPipelineStatusStrip.tsx`;
- edits to `/pipeline-ops` source or tests beyond normal execution;
- shared UI extraction;
- backend changes;
- route or package changes;
- widening into another page in the same pass.

## Handoff Requirements

Developer handoff must include:

- exact files changed;
- exact files inspected;
- proof that only `/data-quality` source was edited;
- proof that page-local bulk controls are gone;
- proof that the compact strip still comes from the accepted `B6` path;
- proof that no page-local bulk POST path remains;
- tests run and skipped.

## Deferred Follow-On

After this child is accepted, each later `B5` child still requires its own page-specific reservation, contract check, and QA pass.

This packet does not authorize a combined follow-on for Signals, Calibration, Market Data, Today Review, Context Snapshots, or any catalog-linked indicator-only page.
