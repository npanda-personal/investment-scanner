# CF-W1-DQ-03 QA Plan

Date: 2026-05-20

Owner: Team 04 QA Factory

## Work Item

`CF-W1-DQ-03` - data quality residual reason summary for downstream trust consumers.

## QA Status

`ACCEPT / READY-FOR-TEAM00-EVALUATION`

Backend-only QA planning prepared from the requirement draft, Team 03 architecture packet, and current module tests. Executable QA remains blocked until Team 00 promotes one exact implementation handoff for the reserved data-quality-engine files below.

Team 03 has published the architecture review, contract, and work packet for this child, and the writer set is now exact.

## Verdict

The data-quality residual reason summary QA plan is ready for Team 00 Ready evaluation as one bounded backend-only `data-quality-engine` slice.

## Scope

First-slice QA for additive residual-summary exposure in `data-quality-engine`.

Planned in-scope implementation surfaces, once Team 00 promotes an exact handoff:

- `backend/src/modules/data-quality-engine/data-quality-engine.service.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.types.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.md`
- `backend/tests/modules/data-quality-engine/data-quality-engine.service.test.ts`

Out of scope for this first child:

- Prisma schema and migrations
- backend or frontend route registries
- controller, router, validation, module, index, or repository changes unless Team 03 later proves they are required
- frontend feature work, shared UI, shared utilities, package manifests, generated files
- provider/live-data, startup/backfill, paid/cloud, broker, or telemetry work
- duplicate readiness or eligibility scoring in downstream consumers

## Contract Inputs Reviewed

- `10-requirements/CF-W1-DQ-03-data-quality-residual-reason-summary-for-downstream-trust-consumers-requirement.md`
- `03-architecture/CF-W1-DQ-03-architecture-review.md`
- `06-contracts/CF-W1-DQ-03-data-quality-residual-reason-summary-contract.md`
- `08-work-packets/CF-W1-DQ-03-work-packet.md`
- `backend/src/modules/data-quality-engine/data-quality-engine.md`
- `backend/tests/modules/data-quality-engine/data-quality-engine.service.test.ts`
- `backend/tests/modules/data-quality-engine/data-quality-engine.invariants.test.ts`

## Required QA Assertions

- The output exposes a compact residual reason summary derived from existing DQ fields.
- Stable labels distinguish clean, limited, blocked, coverage-gap, liquidity-gap, missing-data, and unsupported states.
- Downstream consumers can reuse the summary instead of rebuilding DQ interpretation logic.
- Existing `dataGaps`, `readinessBlockers`, `coverageStatus`, `liquidityStatus`, `recommendedFixes`, and related outputs remain backward-compatible.
- Missing readiness fails closed and does not become trusted because a non-null data payload exists.
- No duplicate scoring model or secondary trust taxonomy is introduced.
- No direct advice, target price, broker, or automation wording is introduced.

## Scenario Matrix

| Scenario | Expected QA evidence |
| --- | --- |
| Clean | Residual summary reads as clean or equivalent and does not invent blockers. |
| Limited | Output remains usable but clearly notes partial trust or limited coverage. |
| Blocked | Blockers are explicit and suppress downstream trust claims. |
| Coverage gap | Missing or incomplete coverage is named in the residual summary. |
| Liquidity-constrained | Illiquid or thin-liquidity evidence is surfaced distinctly from other gaps. |
| Unsupported | Unsupported region, asset, or data shape is called out explicitly. |
| Mixed evidence | Summary stays compact while still explaining the dominant reason the data is not clean. |
| Boundary proof | Only the bounded `data-quality-engine` service/types/doc/test set changes; no downstream consumer rewrites appear. |

## Copy / Language Scan

Scan touched text for:

- `clean`
- `limited`
- `blocked`
- `coverage gap`
- `liquidity gap`
- `missing data`
- `unsupported`
- `residual reason`

Also confirm the module does not drift into direct advice language or a second readiness model.

## Focused Automation Requirements

Run only after Team 00 promotes a bounded implementation handoff:

```powershell
cd backend
npm.cmd test -- data-quality-engine.service.test.ts --runInBand
```

```powershell
cd backend
npm.cmd run build
```

Optional drift scan after implementation:

```powershell
rg -n "residual|coverage gap|liquidity gap|missing data|unsupported|limited|blocked" backend/src/modules/data-quality-engine backend/tests/modules/data-quality-engine
```

## Blocked / Skipped Test Handling

- No executable validation is run during this planning pass.
- If Team 03 later widens the slice into controller, router, validation, repository, route registry, or UI work, return the child to Team 00 / Architect.
- If a future handoff requires schema, migration, provider, live-data, or backfill work, stop and split it into a separate consent-gated child.

## QA Rejection Criteria

- The residual summary invents a second scoring model or replaces the current DQ contract.
- The summary is not additive and breaks existing caller compatibility.
- Missing readiness becomes trusted because the payload is otherwise complete.
- Downstream consumers are rewritten instead of reusing the compact summary.
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
- Scenario evidence for clean, limited, blocked, coverage-gap, liquidity-constrained, missing-data, unsupported, and mixed-evidence behavior.
- Focused service-test output.
- Backend build output.
- Confirmation that no duplicate scoring or forbidden scope was introduced.
- Skipped checks, blockers, and next owner.
