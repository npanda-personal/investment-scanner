# CF-W1-HCTX-01 QA Plan

Date: 2026-05-18

Owner: Team 04 QA Factory

Status: Backend-only Historical Context explainability QA plan prepared. QA-ready for Team 00 Ready evaluation. Executable validation remains blocked until Team 00 promotes one bounded implementation handoff for the reserved `historical-context-snapshots` files.

Current status refresh: Team 03 prepared the missing `CF-W1-HCTX-01` architecture/contract/work-packet packet on 2026-05-18. Team 04 aligns this QA plan to the same module-local backend slice and does not widen it into frontend or upstream module work.

## Scope

Validation plan for additive lookup explainability and provenance labeling in `historical-context-snapshots`.

In-scope surfaces after Team 00 Ready promotion:

- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.service.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.types.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.md`
- `backend/tests/modules/historical-context-snapshots/historical-context-snapshots.service.test.ts`
- optional only if the implementation adds endpoint-level additive response assertions: `backend/tests/modules/historical-context-snapshots/historical-context-snapshots.routes.test.ts`

Out of scope for this first slice:

- repository, controller, router, validation, Prisma, migration, package, generated, or route-registry changes
- frontend historical-context page rendering
- Market Context Intelligence, Smart Money Intelligence, Market Data Foundation, Signal Calibration, or Signal Quality source changes
- provider, live-market, paid/cloud, telemetry, broker, startup/backfill, or UI smoke work

This plan does not approve application source edits, tests, builds, or services. It records the QA packet only.

## Required QA Assertions

- Lookup output exposes additive explainability metadata for market, sector, country, smart-money, and data-quality selection evidence.
- Exact-date selection is distinguishable from nearest-prior selection and includes stable lag semantics.
- Missing requested evidence inside lookback is explicit and does not look complete.
- Metadata-gap sector input such as `Unknown` is labeled as intentionally unavailable evidence, not generic missing persisted data.
- Optional components that were not requested remain `NOT_REQUESTED` and are not mislabeled as data gaps.
- Existing lookup response fields remain backward-compatible, including `market`, `sector`, `country`, `smartMoney`, `dataQuality`, `dataStatus`, and `gaps`.
- Research-support wording is preserved; no advice-like or UI-only formatting semantics are introduced.

## Scenario Matrix

| Scenario | Expected assertion after implementation |
| --- | --- |
| Requested date has persisted snapshots for every requested component | Explainability reports exact-date selection, `lagDays = 0`, non-partial result, and current lookup fields remain present. |
| Requested date has no exact snapshot but has an earlier snapshot within lookback | Explainability reports nearest-prior selection with explicit selected snapshot date and positive lag. |
| Requested component has no persisted snapshot inside lookback | Component evidence reports missing-within-lookback; response remains diagnostic rather than silently complete. |
| Sector input is a metadata-gap value such as `Unknown` | Sector evidence reports metadata-gap input rather than generic missing sector evidence. |
| Optional component is not requested | Component evidence reports not-requested and is not added to gaps as missing data. |
| Requested market snapshot is absent inside lookback | Market evidence reports missing-within-lookback and overall explainability stays partial/untrusted rather than implying completeness. |
| Additive explainability is returned through route response | Existing route payload fields remain compatible while new explainability fields are additive only. |

## Focused Command Guidance

Commands below are guidance only. They were not run during this docs-only QA planning task.

Future focused validation after Team 00 Ready promotion and implementation handoff:

```powershell
cd backend
npm.cmd test -- historical-context-snapshots.service.test.ts historical-context-snapshots.routes.test.ts --runInBand
```

If the implementation stays fully service-local and does not add route assertions, the minimum focused command is:

```powershell
cd backend
npm.cmd test -- historical-context-snapshots.service.test.ts --runInBand
```

Approval-gated backend build after accepted implementation, Team 00 validation approval, and memory/resource check:

```powershell
cd backend
npm.cmd run build
```

## Skipped / Forbidden Checks

Skipped in this planning pass:

- all executable tests
- backend/frontend builds
- local servers, services, provider checks, and UI smoke

Forbidden by default for this slice:

- `historical-context-snapshots.repository.test.ts` unless Team 00 explicitly widens the packet
- validation/controller/router file edits or tests as a way to expose additive metadata
- frontend Playwright or historical-context UI checks
- Prisma generate, migrate, db push, db execute, or any schema/data mutation
- provider/live-market, paid/cloud, telemetry, broker, startup/backfill, or broad backend suites

## Stop Conditions

Stop QA and return to Team 00 / Architect if:

- implementation expands beyond the reserved service/types/doc/test file set
- implementation requires repository, controller, router, or validation edits
- implementation requires frontend rendering or shared DTO work to justify the additive backend fields
- upstream modules must change to derive selected-date lag or gap reasons
- tests require live snapshot generation, provider flows, Prisma mutation, or broad cross-module suites
- the packet starts folding Signal Calibration or Signal Quality consumer rewrites into the same writer pass

## Evidence Required Later

- Exact implementation handoff limited to the reserved `historical-context-snapshots` files
- Scenario results for exact-date, nearest-prior, missing-within-lookback, metadata-gap, and not-requested cases
- Confirmation that current lookup route/query behavior stayed unchanged and additive
- Focused command output only after approval
- Skipped checks with reason and next owner
- Clear note whether optional route-level assertions were added or the QA pass remained service-test only
