# CF-W3-MDPIPE-01B5 - Data Quality Control Removal QA Plan

Date: 2026-05-25

Owner: Team 04 / Team 00

Status: QA plan prepared. Not ready for execution; pending the Team 00 B5 implementation handoff.

## Scope

QA planning for the Data Quality page control-removal child after `CF-W3-MDPIPE-01B6` acceptance.

This plan covers only:

- route: `/data-quality`
- feature page: `data-quality-engine`
- page-level control centralization after the compact B6 strip is already accepted

This plan does not authorize implementation and does not promote the work item to Ready.

## Contract Inputs

- `03-architecture/CF-W3-MDPIPE-01B5-data-quality-first-child-control-removal-architecture.md`
- `06-contracts/CF-W3-MDPIPE-01B5-data-quality-page-control-removal-contract.md`
- `08-work-packets/CF-W3-MDPIPE-01B5-data-quality-first-child-work-packet.md`
- `09-summaries/CF-W3-MDPIPE-01B6-po-acceptance-packet.md`
- `04-qa/CF-W3-MDPIPE-01B5-01B6-control-migration-progress-indicators-qa-plan.md`

## Required QA Assertions

- `/data-quality` no longer exposes a page-local `Evaluate Scope` header action after B5 lands.
- `/data-quality` no longer exposes a drawer-level `Evaluate Scope` action after B5 lands.
- `/data-quality` no longer renders the local `BatchProgressBar` after B5 lands.
- The accepted compact B6 strip remains visible and correct in loading, fetch-error, loaded no-run, running, and terminal states.
- The B6 strip continues to use the read-only `usePipelineStatus(region, assetType)` status path.
- Rendering or refreshing `/data-quality` does not emit `POST /api/v1/data-quality/evaluate`.
- Rendering or refreshing `/data-quality` does not emit `POST /api/v1/pipeline/commands`.
- Manual Data Quality trigger access remains available only in `/pipeline-ops` through the approved command catalog path.
- Existing Data Quality filters, table, summary, drawer detail, refresh behavior, and scope-aware diagnostics do not regress.
- Page copy no longer instructs the user to run bulk Data Quality locally.
- The implementation stays inside the reserved Data Quality page boundary and does not widen into shared UI, routes, backend, schema, or pipeline-ops source.

## Scenario Matrix

| Scenario | Input condition | Expected QA result |
| --- | --- | --- |
| Header control removal | Load `/data-quality` after B5 lands | No `Evaluate Scope` header button is present. |
| Drawer control removal | Open the Data Quality drawer after B5 lands | No `Evaluate Scope` drawer action is present. |
| Progress surface removal | Load the page in a state that previously showed local batch progress | No local `BatchProgressBar` renders. |
| Compact strip loading | Pipeline status is still loading | The compact strip shows loading state only and does not mislabel the page as no-run. |
| Compact strip error | Pipeline status fetch fails | The strip shows inline unavailable/error copy and the rest of the page remains usable. |
| Compact strip no-run | Loaded snapshot has no `DATA_QUALITY` stage row | The strip shows `NO_RUN_EVIDENCE` only after the loaded no-run condition is confirmed. |
| Compact strip running | `DATA_QUALITY` is active | The strip shows active status, progress, and timestamps without restoring the removed local bulk controls. |
| Compact strip terminal | Latest evidence is terminal | The strip shows the terminal state and preserves the `/pipeline-ops` details link. |
| No render POSTs | Load or refresh `/data-quality` | No Data Quality evaluate POST or pipeline command POST is emitted. |
| Centralized command home | User needs a manual Data Quality trigger | The only manual trigger path is `/pipeline-ops` via the approved catalog command. |
| Regression guard | Filters, table, summary, or drawer interactions are exercised | Existing Data Quality behavior still works and no unrelated UI regressions appear. |
| Scope drift | Implementation widens into shared UI, route registries, backend, Prisma, or pipeline-ops source | QA reject and return to Team 00 / Architect. |

## Focused Command Guidance

Run after the B5 implementation handoff only, and check laptop memory before starting the build or Playwright step:

```powershell
cd frontend
npm.cmd run build
```

```powershell
cd frontend
npm.cmd run test:ui -- pipeline-ops.spec.ts data-quality-engine.spec.ts --workers=1
```

## UI Smoke Expectations

- `/data-quality` renders the accepted compact strip and keeps the page usable for diagnostics.
- The page no longer offers a local bulk launcher anywhere in the header, drawer, or progress region.
- The compact strip still reflects loading, error, no-run, active, and terminal states correctly.
- The strip still links out to `/pipeline-ops` for manual command detail and evidence.
- Filters, table, summary, refresh, and drawer content remain functional after the control removal.
- The render path does not call provider/live endpoints, bulk evaluate POSTs, or pipeline command POSTs from the feature page.

## Forbidden Scope

- Backend source or backend tests.
- Route registries.
- Shared frontend components or shared hooks.
- `frontend/src/features/pipeline-ops/**`.
- Prisma schema, migrations, generated files, or package manifests / lockfiles.
- Any new bulk-control launcher, disabled launcher shell, or duplicate command affordance on `/data-quality`.
- Any widening into other feature pages in the same pass.

## Readiness Blockers

- B5 implementation has not yet been handed off in the reserved file set.
- QA cannot execute until Team 00 provides the scoped post-change handoff for `/data-quality`.
- This plan intentionally does not promote Ready.

## Readiness Verdict

- `CF-W3-MDPIPE-01B5`: `READY-CANDIDATE / PENDING-B5-IMPLEMENTATION-HANDOFF`
