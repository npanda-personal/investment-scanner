# CF-W1-HCTX-03 QA Plan

Date: 2026-05-20

Owner: Team 04 QA Factory

## Work Item

`CF-W1-HCTX-03` - historical context nearest-snapshot age and provenance warnings.

## QA Status

`ACCEPT / READY-FOR-TEAM00-EVALUATION`

Backend-only QA planning prepared from the requirement draft, Team 03 architecture packet, and current module tests. Executable QA remains blocked until Team 00 promotes one exact implementation handoff for the reserved historical-context files below.

Team 03 has published the architecture review, contract, and work packet for this child, and the writer set is now exact.

## Verdict

The historical-context nearest-snapshot age and provenance QA plan is ready for Team 00 Ready evaluation as one bounded backend-only `historical-context-snapshots` slice.

## Scope

First-slice QA for additive nearest-snapshot age and provenance warnings in `historical-context-snapshots`.

Planned in-scope implementation surfaces, once Team 00 promotes an exact handoff:

- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.service.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.types.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.md`
- `backend/tests/modules/historical-context-snapshots/historical-context-snapshots.service.test.ts`

Out of scope for this first child:

- Prisma schema and migrations
- backend or frontend route registries
- controller, router, validation, module, index, or repository changes unless Team 03 later proves they are required
- frontend feature work, shared UI, shared utilities, package manifests, generated files
- provider/live-data, startup/backfill, paid/cloud, broker, or telemetry work
- duplicate freshness scoring in downstream consumers

## Contract Inputs Reviewed

- `10-requirements/CF-W1-HCTX-03-historical-context-nearest-snapshot-age-and-provenance-warnings-requirement.md`
- `03-architecture/CF-W1-HCTX-03-architecture-review.md`
- `06-contracts/CF-W1-HCTX-03-historical-context-nearest-snapshot-age-and-provenance-contract.md`
- `08-work-packets/CF-W1-HCTX-03-work-packet.md`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.md`
- `backend/tests/modules/historical-context-snapshots/historical-context-snapshots.service.test.ts`

## Required QA Assertions

- Lookup output exposes requested date, selected snapshot date, lag days, and lookback window.
- The response labels same-day, near-date, fallback, and out-of-lookback cases distinctly.
- Missing-snapshot and metadata-gap cases have stable reason text and do not collapse into generic partial output.
- The nearest-snapshot rule stays unchanged; only provenance and age labeling are added.
- Downstream review surfaces can reuse the warning labels without recalculating age or freshness.
- Existing lookup response fields remain backward-compatible and additive.
- No data-quality scoring, signal scoring, or market-context freshness taxonomy is duplicated here.
- No direct advice, target price, or broker wording is introduced.

## Scenario Matrix

| Scenario | Expected QA evidence |
| --- | --- |
| Same-day hit | Selected snapshot date equals requested date; lag is `0`; label reads as ideal or same-day evidence. |
| Near-date hit | Snapshot falls inside the lookback window; lag is explicit; label reads as near enough, not same-day. |
| Fallback within window | The nearest available snapshot is older than ideal but still inside lookback; warning explains fallback provenance. |
| Out-of-lookback | No acceptable snapshot exists inside the window; output is explicit about the miss instead of implying freshness. |
| Missing snapshot | No snapshot rows exist; response uses stable missing-snapshot wording. |
| Metadata gap | Requested context cannot be resolved cleanly because metadata is missing; response names the gap. |
| Boundary proof | Only the bounded historical-context service/types/doc/test set changes; no schema, route, shared, provider, or live-data widening appears. |

## Copy / Language Scan

Scan touched text for:

- `same-day`
- `near`
- `fallback`
- `lag`
- `lookback`
- `missing snapshot`
- `metadata gap`
- `provenance`

Also confirm the module does not drift into advice-like wording or imply duplicate freshness scoring.

## Focused Automation Requirements

Run only after Team 00 promotes a bounded implementation handoff:

```powershell
cd backend
npm.cmd test -- historical-context-snapshots.service.test.ts --runInBand
```

```powershell
cd backend
npm.cmd run build
```

Optional drift scan after implementation:

```powershell
rg -n "same-day|near|fallback|lag|lookback|metadata gap|provenance" backend/src/modules/historical-context-snapshots backend/tests/modules/historical-context-snapshots
```

## Blocked / Skipped Test Handling

- No executable validation is run during this planning pass.
- If Team 03 later widens the slice into controller, router, validation, repository, route registry, or UI work, return the child to Team 00 / Architect.
- If a future handoff requires schema, migration, provider, live-data, or backfill work, stop and split it into a separate consent-gated child.

## QA Rejection Criteria

- The lookup rule changes instead of only adding provenance and age labeling.
- Freshness or age is derived from non-owned heuristics instead of the module-owned lookup result.
- Missing-snapshot, metadata-gap, or out-of-lookback cases are silent or misleading.
- Existing lookup fields are removed or renamed.
- Implementation touches forbidden scope:
  - `backend/prisma/schema.prisma`
  - `backend/prisma/migrations/**`
  - backend or frontend route registries
  - shared backend utilities or shared frontend components
  - package manifests
  - generated files
  - provider/live-data, startup/backfill, paid/cloud, broker, or telemetry scope
  - downstream consumer rewrites

## Evidence Required Later

- Exact implementation handoff and writer set.
- Exact changed files and exact files inspected.
- Scenario evidence for same-day, near-date, fallback, missing-snapshot, metadata-gap, and out-of-lookback behavior.
- Focused service-test output.
- Backend build output.
- Confirmation that no forbidden scope or duplicate freshness scoring was introduced.
- Skipped checks, blockers, and next owner.
