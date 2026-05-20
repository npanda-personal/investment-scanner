# CF-W1-STRAT-04 QA Plan

Date: 2026-05-20

Owner: Team 04 QA Factory

Status: Strategy evidence freshness and stale-summary QA plan prepared. QA-ready for Team 00 Ready evaluation as one bounded `strategy-framework` child. Executable validation remains blocked until Team 00 promotes one exact implementation handoff for the reserved files.

## Scope

Validation plan for additive evidence-freshness metadata and stale-summary labels inside the existing Strategy Framework catalog, proof, and performance workflow.

In-scope surfaces after Team 00 Ready promotion:

- `backend/src/modules/strategy-framework/strategy-framework.service.ts`
- `backend/src/modules/strategy-framework/strategy-framework.types.ts`
- `backend/src/modules/strategy-framework/strategy-framework.md`
- `backend/tests/modules/strategy-framework/strategy-framework.service.test.ts`
- `frontend/src/features/strategy-framework/types.ts`
- `frontend/src/features/strategy-framework/components/StrategyFrameworkPage.tsx`
- `frontend/tests/ui/strategy-framework.spec.ts`

Out of scope for this first slice:

- Prisma schema, migrations, generated files, or persistence-shape changes
- `strategy-framework` repository, evaluator, registry, controller, router, validation, or public-export widening
- backend or frontend route registry changes, query-contract changes, or route-path changes
- `frontend/src/features/strategy-framework/api/strategyFrameworkApi.ts`
- Backtesting Strategy Lab source or tests
- shared UI, shared backend utilities, package manifests, provider/live-data, startup/backfill, paid/cloud, broker, or telemetry scope
- strategy math, rating math, proof-status derivation, or next-action behavior rewrites

This plan does not approve application source edits, tests, builds, services, or Ready movement. It records the QA packet only.

## Contract Inputs And Current Source Alignment

Primary planning inputs:

- `03-architecture/CF-W1-STRAT-04-architecture-review.md`
- `06-contracts/CF-W1-STRAT-04-strategy-evidence-freshness-and-stale-summary-contract.md`
- `08-work-packets/CF-W1-STRAT-04-work-packet.md`
- `10-requirements/CF-W1-STRAT-04-strategy-evidence-freshness-and-stale-summary-labels-requirement.md`

Current Strategy Framework source alignment already supports a bounded freshness derivation:

- the module owns compact strategy-evidence summaries for catalog, proof, and performance surfaces;
- historical persisted rows can lack warning/cap fields until rerun, so the freshness label must stay honest on older rows;
- the existing feature page already renders catalog rows, proof rows, and performance rows, so UI proof can stay feature-local;
- the current API surface is additive-friendly, so the first slice does not need a route or query-contract change.

## Required QA Assertions

- Evidence-freshness metadata is additive only and does not remove or rename existing fields.
- The implementation distinguishes `CURRENT`, `STALE`, `PARTIAL`, and `STRUCTURALLY_LIMITED`.
- Freshness labels are visible on catalog rows, proof registry rows, and performance rows inside the existing Strategy Framework page.
- `generatedAt` remains the freshness basis, with stale rows clearly marked when they fall outside the documented window.
- Persisted historical rows that are missing warning/cap or other diagnostic basis fields remain backward-compatible and do not read like fresh proof.
- Existing strategy math, ratings, proof derivation, readiness labels, and eligibility behavior remain unchanged.
- Reason labels and summaries stay research-supportive and do not become direct advice, target-price, buy/sell, or guaranteed-return wording.
- No schema, route, shared-file, or Backtesting Strategy Lab widening is introduced.

## Scenario Matrix

| Scenario | Expected QA assertion after implementation |
| --- | --- |
| Recent compact summary with complete evidence basis | Freshness state is `CURRENT`, rerun is not recommended, and the page shows a current-label equivalent without changing ratings or next-action behavior. |
| Compact summary older than the freshness window | Freshness state is `STALE`, rerun is recommended, and the label makes the age basis visible without rewriting strategy math. |
| Compact summary with low sample, warnings, caps, or missing diagnostic basis | Freshness state is `PARTIAL`, the cautionary reason is visible, and the existing summary still renders compatibly. |
| No compact summary or insufficient-sample structural limit | Freshness state is `STRUCTURALLY_LIMITED`, the page shows that the evidence is not proof-like, and the label does not pretend the summary is current. |
| Persisted historical row lacking warning/cap fields until rerun | The row still renders compatibly, but the freshness packet stays honest and does not overstate current proof. |
| Feature-local Strategy Framework page rendering | Catalog, proof, and performance surfaces all show the additive freshness packet without introducing advice-like or target-like language. |

## Focused Command Guidance

Commands below are guidance only. They were not run during this docs-only QA planning task.

Future focused validation after Team 00 Ready promotion and implementation handoff:

```powershell
cd backend
npm.cmd test -- strategy-framework.service.test.ts --runInBand
```

Approval-gated backend build after accepted implementation and memory/resource check:

```powershell
cd backend
npm.cmd run build
```

Approval-gated frontend build after accepted implementation and memory/resource check:

```powershell
cd frontend
npm.cmd run build
```

Focused Strategy Framework UI smoke after implementation because the reserved feature page/spec already exist:

```powershell
cd frontend
npm.cmd run test:ui -- strategy-framework.spec.ts --workers=1
```

## Skipped / Forbidden Checks

Skipped in this planning pass:

- all executable tests
- backend and frontend builds
- local servers, services, provider checks, and UI smoke

Forbidden by default for this slice:

- repository/evaluator/registry/controller/router/validation/public-export widening
- route-registry or query-contract changes
- shared UI extraction or shared utility widening
- Prisma generate, migrate, db push, db execute, or any schema/data mutation
- provider/live-market, paid/cloud, telemetry, broker, startup/backfill, or broad backend suites

## Stop Conditions

Stop QA and return to Team 00 / Architect if:

- implementation requires repository, evaluator, schema, or route changes;
- implementation changes strategy math, proof derivation, or rating logic;
- implementation widens into Backtesting Strategy Lab source, shared UI, shared utilities, or frontend API/route files;
- implementation introduces non-additive fields or renames existing summary fields.

## Evidence Required Later

- Exact implementation handoff limited to the reserved `strategy-framework` backend and feature-local UI files
- Scenario evidence for current, stale, partial, and structurally limited freshness states
- Proof that catalog, proof, and performance rows all render the additive freshness packet
- Confirmation that existing strategy math, proof logic, and readiness behavior stayed unchanged
- Explicit note that no schema, route, shared-file, package, provider, live-data, or Backtesting Strategy Lab widening occurred

