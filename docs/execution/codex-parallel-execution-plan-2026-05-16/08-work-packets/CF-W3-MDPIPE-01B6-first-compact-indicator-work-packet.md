# CF-W3-MDPIPE-01B6 First Compact Indicator Work Packet

Date: 2026-05-25

## Work Item

Ship the first compact feature-page pipeline indicator as a frontend-only overlap slice.

This packet covers only:

- feature page: `Data Quality`
- route: `/data-quality`
- stage: `DATA_QUALITY`

This packet does not cover control removal.

## State

`READY-CANDIDATE`

Blocked sibling:

- `CF-W3-MDPIPE-01B5` remains blocked until `CF-W3-MDPIPE-01B4` is accepted and Team 00 opens a dedicated removal reservation.

## Owner / Lane / Module

- Architecture owner: Team 03 - Solution Architect
- Recommended implementation owner: Team 08 or Team 00-assigned frontend owner
- Lane: cross-cutting frontend status wiring with Lane 1 stage evidence
- Frontend feature: `data-quality-engine`

## Recommended Branch

```text
codex/w3-mdpipe-01b6-dq-compact-indicator
```

## Exact Allowed File Reservations After Team 00 Promotion

- `frontend/src/features/data-quality-engine/components/DataQualityEnginePage.tsx`
- `frontend/src/features/data-quality-engine/components/DataQualityPipelineStatusStrip.tsx` (new)
- `frontend/tests/ui/data-quality-engine.spec.ts`

Docs after implementation:

- active execution-folder implementation evidence and owner outbox only

## Exact Forbidden File Reservations

- all backend source and backend tests
- `frontend/src/features/pipeline-ops/**`
- `frontend/src/app/routes.tsx`
- `frontend/src/app/navigationMetadata.tsx`
- `frontend/src/shared/components/**`
- `frontend/src/shared/hooks/**`
- `frontend/src/shared/theme/**`
- `frontend/src/contexts/MarketScopeContext.tsx`
- all other frontend feature pages and their tests
- Prisma/schema/migrations/generated files
- package manifests and lockfiles
- provider/live code paths
- scheduler/startup behavior
- root `AGENTS.md`
- `docs/AGENTS.md`
- `docs/codex-agent-team-plan/**`

## Required Behavior

Implement a feature-local compact strip that:

- sits below the `PageHeader`;
- uses `usePipelineStatus(scope.region, scope.assetType)`;
- reads only the `DATA_QUALITY` stage;
- shows current scope, status, progress, timestamps, warning count, error count, and a deep link to `/pipeline-ops`;
- stays visible when page data already loaded, with a small inline loading/error treatment.

Preserve existing behavior:

- keep the `Evaluate Scope` button;
- keep the local `BatchProgressBar`;
- keep the page-local `Refresh` action;
- keep current data-quality list, summary, and diagnostics behavior.

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

UI smoke must prove:

- the compact indicator renders on `/data-quality`;
- the indicator deep-links to `/pipeline-ops`;
- the indicator can show no-run evidence without fake progress;
- the indicator can show backend-driven active or terminal progress;
- the legacy `Evaluate Scope` button still exists in this slice;
- rendering the indicator does not post to `POST /api/v1/data-quality/evaluate` or `POST /api/v1/pipeline/commands`.

## Stop Conditions

Stop and return to Team 00 / Architect if implementation requires:

- removal of page-local controls;
- edits to `pipeline-ops` source;
- shared UI extraction;
- backend changes;
- adding command execution from the page;
- widening to another feature page in the same pass.

## Handoff Requirements

Developer handoff must include:

- exact files changed;
- exact files inspected;
- confirmation that only `/data-quality` was touched;
- proof that indicator data comes from `GET /api/v1/pipeline/status`;
- proof that old bulk controls still exist;
- tests run and skipped;
- any UI blocker or contract drift.

## Deferred Follow-On

After `CF-W3-MDPIPE-01B4` acceptance, Team 00 may open a separate `CF-W3-MDPIPE-01B5` Data Quality removal child that deletes the page-local bulk control and local progress bar only if the Pipeline Ops command path is verified equivalent.
