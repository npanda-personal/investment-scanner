# CF-W3-MDPIPE-01B5-01B6 - Control Migration / Compact Progress Indicators QA Plan

Date: 2026-05-25

Owner: Team 04 / Team 00

Status: QA plan prepared. Readiness is a candidate only, pending the Team 03 and Team 08 architecture/work-packet set that defines the exact feature-page reservation.

## Scope

QA planning for the two follow-on pipeline UI slices:

- `CF-W3-MDPIPE-01B5` page-local bulk-control migration;
- `CF-W3-MDPIPE-01B6` compact per-screen pipeline progress indicators.

This plan covers the feature pages that still participate in the pipeline workflow, including the current smoke surfaces under:

- `frontend/tests/ui/market-data-foundation.spec.ts`
- `frontend/tests/ui/data-quality-engine.spec.ts`
- `frontend/tests/ui/signal-generation-engine.spec.ts`
- `frontend/tests/ui/signal-quality-lab.spec.ts`
- `frontend/tests/ui/strategy-framework.spec.ts`
- `frontend/tests/ui/strategy-decision-engine.spec.ts`
- `frontend/tests/ui/backtesting-strategy-lab.spec.ts`
- `frontend/tests/ui/smart-money-intelligence.spec.ts`
- `frontend/tests/ui/today-trade-review.spec.ts`

The exact page list must still be confirmed by the implementation packet, but the QA bar is the same for every migrated page:

- full page-local bulk controls leave the feature surface or are replaced with a safe unavailable state;
- the page keeps only a compact backend pipeline progress indicator;
- the page does not invent provider/live behavior while rendering the indicator;
- navigation away and back rehydrates the same scoped progress state from the read-only status API.

## Contract Inputs

- `10-requirements/CF-W3-MDPIPE-01B3-bulk-pipeline-ops-dashboard-requirement.md`
- the Team 03 architecture packet for `CF-W3-MDPIPE-01B5`
- the Team 08 UX packet for compact progress indicators
- the Team 00 work packet that reserves the page-level feature files

## Required QA Assertions

- Full bulk operation controls are removed from the feature page or replaced with a clearly unavailable state that cannot launch a bulk job.
- Any remaining action on the page is either a compact status affordance or a safe navigation link, not a page-local bulk runner.
- The compact indicator shows the current or latest run/stage evidence for the active scope, including progress, timestamps, and terminal status when available.
- Returning to the page after navigation rehydrates the compact indicator from the status API instead of resetting to a blank state.
- No-provider/live-call assertions hold during render and refresh.
- Bulk-action POSTs are not emitted from the old page-local controls.
- Forbidden scopes stay blocked, with an explanation when the indicator or navigation entry is not available for the current context.
- The implementation stays inside the exact per-feature reservation and does not widen into shared UI, schema, route, or package work.

## Scenario Matrix

| Scenario | Input condition | Expected QA result |
| --- | --- | --- |
| Bulk-control migration | A page previously had a full bulk control | The full control is gone or replaced by an unavailable state; it does not trigger a bulk POST. |
| Compact indicator only | Page loads for the scoped market context | A compact progress/status element is visible and does not expand into a bulk panel. |
| Active run rehydrate | A pipeline stage is active, then the user leaves and returns | The same active progress is shown again after navigation. |
| Latest terminal rehydrate | No active run exists, but terminal evidence exists | The latest terminal progress is visible after navigation and refresh. |
| Unavailable command state | Command API does not permit the page action | The page does not expose a working bulk launcher and the state is explained. |
| No-provider guard | Render the page while provider routes are stubbed | No provider/live endpoint is called by the indicator path. |
| Scope drift | Implementation reaches into route registries, shared UI, Prisma, package manifests, or generated files | QA reject and return to Team 00 / Architect. |

## Focused Command Guidance

Run after implementation handoff only, with laptop-memory checks respected before builds and Playwright:

```powershell
cd backend
npm.cmd test -- pipeline-orchestration --runInBand
```

```powershell
cd backend
npm.cmd run build
```

```powershell
cd frontend
npm.cmd run build
```

```powershell
cd frontend
npm.cmd run test:ui -- pipeline-ops.spec.ts market-data-foundation.spec.ts data-quality-engine.spec.ts signal-generation-engine.spec.ts signal-quality-lab.spec.ts strategy-framework.spec.ts strategy-decision-engine.spec.ts backtesting-strategy-lab.spec.ts smart-money-intelligence.spec.ts today-trade-review.spec.ts --workers=1
```

## UI Smoke Expectations

- On each touched feature page, the old full bulk controls are absent or explicitly unavailable.
- A compact pipeline progress indicator is visible and scoped correctly to the current `region` and `assetType`.
- The indicator shows active, latest terminal, or empty-state evidence without a generic blank shell.
- If a page still offers a safe control, it is a non-bulk navigation affordance, not a hidden duplicate launcher.
- Navigating away and back preserves the same progress state and does not reintroduce removed controls.
- The render path does not call provider/live endpoints, bulk POSTs, or any downstream execution path.

## Forbidden Scope

- Prisma schema, migrations, or persistence rewrites.
- Route registry widening unless the exact implementation packet reserves it.
- Shared UI component edits, package manifest changes, or generated files.
- Provider/live calls, broker calls, external telemetry, or other non-local dependencies.
- Cross-module refactors outside the exact feature-page reservation.

## Readiness Verdict

- `CF-W3-MDPIPE-01B5`: `READY-CANDIDATE / PENDING-ARCHITECTURE-AND-WORK-PACKET`
- `CF-W3-MDPIPE-01B6`: `READY-CANDIDATE / PENDING-ARCHITECTURE-AND-WORK-PACKET`

