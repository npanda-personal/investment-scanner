# CF-W1-HCTX-02 QA Plan

Date: 2026-05-19

Owner: Team 04 QA Factory

Status: Backend-only Historical Context data-quality coverage-scope QA plan prepared. QA-ready for Team 00 Ready evaluation. Executable validation remains blocked until Team 00 promotes one bounded implementation handoff for the reserved `historical-context-snapshots` repository/service/types/doc/test files.

## Scope

Backend-only QA planning for the bounded first child of `CF-W1-HCTX-02` Historical Context data-quality coverage scope.

This plan covers:

- backward-compatible preservation of `dataQualitySnapshots` as the existing raw count;
- additive provenance semantics for data-quality coverage scope and evidence;
- explicit `GLOBAL_ONLY`, reserved `SCOPE_PROVEN`, and `UNAVAILABLE` scope outcomes;
- explicit `PRESENT`, `MISSING`, `STALE`, and `UNKNOWN` evidence outcomes;
- proof that current source does not overclaim `SCOPE_PROVEN`;
- freshness classification derived only from Historical Context owned snapshot dates;
- guardrails that keep Data Quality Engine scoring ownership separate.

This plan excludes controller, router, validation, module, index, Prisma/schema/migration, generated files, backend/frontend route registries, frontend adoption, shared utilities, shared UI, package manifests, provider/live-data integration, startup/scheduler/backfill work, calibration source changes, DQE source changes, paid/cloud services, broker flows, telemetry, commits, pushes, and executable validation during this planning pass.

## Contract Inputs

- `10-requirements/CF-W1-HCTX-02-historical-context-data-quality-coverage-scope-requirement.md`
- `03-architecture/CF-W1-HCTX-02-architecture-review.md`
- `06-contracts/CF-W1-HCTX-02-historical-context-data-quality-coverage-scope-contract.md`
- `08-work-packets/CF-W1-HCTX-02-work-packet.md`
- `17-team-outboxes/TEAM-03-CF-W1-HCTX-02-architecture.md`
- current module/test surface:
  - `backend/src/modules/historical-context-snapshots/historical-context-snapshots.repository.ts`
  - `backend/src/modules/historical-context-snapshots/historical-context-snapshots.service.ts`
  - `backend/src/modules/historical-context-snapshots/historical-context-snapshots.types.ts`
  - `backend/tests/modules/historical-context-snapshots/historical-context-snapshots.repository.test.ts`
  - `backend/tests/modules/historical-context-snapshots/historical-context-snapshots.service.test.ts`
  - `backend/package.json`

## Required QA Assertions

- `dataQualitySnapshots` remains present as the backward-compatible raw count and is not renamed, removed, or reinterpreted.
- Any new provenance packet is additive only and preserves current caller compatibility.
- `GLOBAL_ONLY` is returned when data-quality snapshot rows exist but current source still cannot prove requested `region` and `assetType` scope.
- `UNAVAILABLE` is returned when no trustworthy scope claim can be made because coverage evidence is absent.
- `SCOPE_PROVEN` remains reserved future semantics and is not emitted from current `dev` source without owned scope proof.
- `MISSING` is returned when raw `dataQualitySnapshots` is zero.
- `STALE` is returned when the latest data-quality snapshot date is older than the latest Historical Context market snapshot date used as comparison basis.
- `UNKNOWN` is returned when data-quality coverage exists but a safe freshness comparison basis is absent.
- `PRESENT` is returned only when coverage exists and freshness can be established from module-owned snapshot dates, even if scope stays `GLOBAL_ONLY`.
- The provenance reason or warning string explicitly explains global-only, missing, stale, or unknown evidence and does not rely only on a generic top-level warning.
- Freshness logic uses Historical Context owned evidence only: raw count, latest data-quality snapshot date, and latest Historical Context market snapshot date.
- No Data Quality Engine coverage, readiness, liquidity, or eligibility scoring is duplicated or imported into this child.
- Existing coverage endpoint shape stays additive and backward-compatible for callers that currently read `marketSnapshots`, `sectorSnapshots`, `countrySnapshots`, `smartMoneySnapshots`, `dataQualitySnapshots`, `latestSnapshotDate`, and `warnings`.

## Scenario Matrix

| Scenario | Input condition | Expected QA result |
| --- | --- | --- |
| Raw count compatibility | Coverage response already returns `dataQualitySnapshots` | Raw count remains present and unchanged; provenance packet mirrors the same count as additive evidence rather than replacing it. |
| Global-only current-source truth | `dataQualitySnapshots > 0` and current source still lacks scope relation or persisted scope fields | Scope is `GLOBAL_ONLY`; response explains that the count is global and not proven for requested `region` and `assetType`. |
| Coverage unavailable | `dataQualitySnapshots = 0` | Scope is `UNAVAILABLE`; evidence is `MISSING`; response does not imply scoped zero completeness. |
| Present but still global-only | Coverage rows exist and latest data-quality snapshot date is current relative to latest market snapshot date | Evidence is `PRESENT` while scope remains `GLOBAL_ONLY`; freshness must not be misread as scope proof. |
| Stale evidence | Coverage rows exist and latest data-quality snapshot date predates latest Historical Context market snapshot date | Evidence is `STALE`; stale reason is explicit and machine-safe. |
| Unknown freshness | Coverage rows exist but comparison market snapshot date is absent or unusable | Evidence is `UNKNOWN`; packet does not invent freshness or scope proof. |
| Reserved scope-proven guardrail | Current `dev` implementation has no owned scope-proof relation or persisted scope fields | `SCOPE_PROVEN` is not emitted; any fabricated current-source proof is a QA reject condition. |
| No DQE duplication | Additive provenance is implemented in Historical Context | No DQE readiness or eligibility scoring appears in repository/service/types/tests; packet stays source-evidence-only. |
| Scope drift | Implementation touches Prisma, routes, controller/router/validation/module/index, DQE source, calibration source, frontend, shared utils/UI, packages, provider/startup/backfill | QA rejects or returns the packet to Team 00 / Architect for a separate child. |

## Focused Command Guidance

Run only after Team 00 promotes the bounded backend-only child and the implementation handoff exists:

```powershell
cd backend
npm.cmd test -- historical-context-snapshots.repository.test.ts historical-context-snapshots.service.test.ts --runInBand
```

Run backend build after the focused tests pass:

```powershell
cd backend
npm.cmd run build
```

Optional targeted drift scan after implementation to confirm `SCOPE_PROVEN` is not fabricated outside the reserved module/test set:

```powershell
rg -n "SCOPE_PROVEN|GLOBAL_ONLY|UNAVAILABLE|PRESENT|MISSING|STALE|UNKNOWN" backend/src/modules/historical-context-snapshots backend/tests/modules/historical-context-snapshots
```

## QA Rejection Criteria

- `dataQualitySnapshots` is removed, renamed, or no longer preserved as the raw compatibility field.
- The provenance semantics are not additive and force existing callers to switch to a new field set.
- `GLOBAL_ONLY` is missing when scoped proof still does not exist.
- `UNAVAILABLE` / `MISSING` behavior is silent or represented as scoped completeness.
- `SCOPE_PROVEN` is emitted from current source without explicit owned scope proof.
- `PRESENT`, `STALE`, or `UNKNOWN` are derived from non-owned heuristics instead of Historical Context snapshot dates.
- Data Quality Engine readiness, coverage, liquidity, or signal-eligibility logic is duplicated or imported.
- Existing route/query behavior changes in this first child.
- Implementation touches forbidden scope:
  - `backend/prisma/schema.prisma`
  - `backend/prisma/migrations/**`
  - generated files
  - `backend/src/api/routes.ts`
  - `frontend/src/app/routes.tsx`
  - `backend/src/modules/historical-context-snapshots/historical-context-snapshots.controller.ts`
  - `backend/src/modules/historical-context-snapshots/historical-context-snapshots.router.ts`
  - `backend/src/modules/historical-context-snapshots/historical-context-snapshots.validation.ts`
  - `backend/src/modules/historical-context-snapshots/historical-context-snapshots.module.ts`
  - `backend/src/modules/historical-context-snapshots/index.ts`
  - `backend/src/modules/data-quality-engine/**`
  - `backend/src/modules/signal-calibration-engine/**`
  - `frontend/src/features/historical-context-snapshots/**`
  - shared backend utilities
  - shared frontend components
  - package manifests
  - provider/live-data integration files
  - scheduler/startup/backfill files
- Validation would require frontend UI smoke, live providers, Prisma mutation, startup/backfill flows, or broad cross-module suites.

## Evidence Required Later

- Exact implementation handoff limited to the approved Historical Context repository/service/types/doc/test files.
- Scenario results for raw count compatibility, `GLOBAL_ONLY`, `UNAVAILABLE`, `PRESENT`, `MISSING`, `STALE`, and `UNKNOWN`.
- Explicit confirmation that `SCOPE_PROVEN` was not fabricated from current source.
- Focused test command output for Historical Context repository and service tests.
- Backend build output.
- Confirmation that no DQE scoring duplication was introduced.
- Confirmation that no forbidden files or commands were used.
- Skipped checks, blockers, and next owner.
