# CF-W1-MCTX-02 QA Plan

Date: 2026-05-20

Owner: Team 04 QA Factory

## Work Item

`CF-W1-MCTX-02` - market context freshness basis labels for persisted vs generated summaries.

## QA Status

`ACCEPT / READY-FOR-TEAM00-EVALUATION`

Backend-only QA planning prepared from the requirement draft, Team 03 architecture packet, and current module tests. Executable QA remains blocked until Team 00 promotes one exact implementation handoff for the reserved market-context files below.

Team 03 has published the backend-only architecture review, contract, and work packet for this child, and the writer set is now exact.

## Verdict

The market-context freshness-basis QA plan is ready for Team 00 Ready evaluation as one bounded backend-only `market-context-intelligence` slice.

## Scope

First-slice QA for additive freshness-basis labeling in `market-context-intelligence`.

Planned in-scope implementation surfaces, once Team 00 promotes an exact handoff:

- `backend/src/modules/market-context-intelligence/market-context-intelligence.service.ts`
- `backend/src/modules/market-context-intelligence/market-context-intelligence.types.ts`
- `backend/src/modules/market-context-intelligence/market-context-intelligence.md`
- `backend/tests/modules/market-context-intelligence/market-context-intelligence.service.test.ts`

Out of scope for this first child:

- Prisma schema and migrations
- backend or frontend route registries
- controller, router, validation, module, index, or repository changes unless Team 03 later proves they are required
- frontend feature work, shared UI, shared utilities, package manifests, generated files
- provider/live-data, startup/backfill, paid/cloud, broker, or telemetry work
- regime math rewrites or a new trust taxonomy that conflicts with existing DQ language

## Contract Inputs Reviewed

- `10-requirements/CF-W1-MCTX-02-market-context-freshness-basis-labels-for-persisted-vs-generated-summaries-requirement.md`
- `03-architecture/CF-W1-MCTX-02-architecture-review.md`
- `06-contracts/CF-W1-MCTX-02-market-context-freshness-basis-contract.md`
- `08-work-packets/CF-W1-MCTX-02-work-packet.md`
- `backend/src/modules/market-context-intelligence/market-context-intelligence.md`
- `backend/tests/modules/market-context-intelligence/market-context-intelligence.service.test.ts`

## Required QA Assertions

- The response shows whether the current summary is persisted, generated, or derived from a fallback path.
- Freshness basis labels are explicit and stable for persisted summary, freshly generated summary, and fallback or derived summary states.
- Missing upstream components and partial evidence have stable reason text.
- Existing regime math, scope behavior, and response fields remain backward-compatible.
- Macro remains explicitly missing when providers are unconfigured.
- No advice-like wording, target-price wording, or broker framing is introduced.

## Scenario Matrix

| Scenario | Expected QA evidence |
| --- | --- |
| Persisted summary | Basis label clearly identifies persisted evidence and does not imply fresh generation. |
| Fresh generated summary | Basis label identifies on-demand generation and keeps the freshness wording explicit. |
| Fallback or derived summary | Basis label distinguishes derived or fallback evidence from a true persisted snapshot. |
| Missing upstream component | The summary names the missing component instead of presenting a vague partial state. |
| Partial evidence | The service stays useful while making the evidence limitation visible. |
| Macro unconfigured | Macro remains `MISSING` and is called out separately from the regime summary. |
| Boundary proof | Only bounded backend service/types/doc/test files change; no schema, route, shared, frontend, or provider widening appears. |

## Copy / Language Scan

Scan touched text for:

- `persisted`
- `generated`
- `fallback`
- `derived`
- `fresh`
- `partial`
- `missing`
- `macro`
- `basis`

Also confirm the feature stays in research-support language and does not imply advice or automation.

## Focused Automation Requirements

Run only after Team 00 promotes a bounded implementation handoff.

```powershell
cd backend
npm.cmd test -- market-context-intelligence.service.test.ts --runInBand
```

```powershell
cd backend
npm.cmd run build
```

Optional drift scan after implementation:

```powershell
rg -n "persisted|generated|fallback|derived|fresh|partial|missing|macro|basis" backend/src/modules/market-context-intelligence backend/tests/modules/market-context-intelligence
```

## Blocked / Skipped Test Handling

- No executable validation is run during this planning pass.
- This child is backend-only because Team 03 reserved only backend service/types/doc/test files.
- If Team 03 later widens into route registry, shared UI, schema, provider, or live-data work, return the child to Team 00 / Architect.
- Do not substitute broad cross-module suites for the bounded backend checks.

## QA Rejection Criteria

- Freshness-basis labels are missing, vague, or collapse persisted and generated evidence into one ambiguous label.
- Missing upstream components are hidden behind generic partial wording.
- Macro unconfigured state is not explicit.
- Existing regime math or response fields are renamed or removed.
- Implementation touches forbidden scope:
  - `backend/prisma/schema.prisma`
  - `backend/prisma/migrations/**`
  - backend or frontend route registries
  - shared backend utilities or shared frontend components
  - package manifests
  - generated files
  - provider-live-data, startup/backfill, paid/cloud, broker, or telemetry scope
  - regime-math rewrites or trust-taxonomy rewrites

## Evidence Required Later

- Exact implementation handoff and writer set.
- Exact changed files and exact files inspected.
- Scenario evidence for persisted, generated, fallback, partial, missing-component, and macro-unconfigured behavior.
- Focused backend test output.
- Backend build output.
- Confirmation that no forbidden scope or advice-like wording was introduced.
- Skipped checks, blockers, and next owner.

