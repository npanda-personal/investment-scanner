# CF-W1-STRAT-01 Readiness Check

Date: 2026-05-17

## Requirement

`CF-W1-STRAT-01` - Strategy Decision no-target / exit-invalidation compatibility slice.

## Current Fields Exposing Target Semantics

- `StrategyDecisionDto.riskPlan.targetPrice`.
- `StrategyDecisionEngineService.buildDecisionDto()` currently derives `targetPrice` from `latestPrice * 1.15`.
- `buildDecisionDto()` currently emits `Target price achieved.` in `exitRules`.
- `buildDecisionDto()` currently uses a fixed 15% target rationale.

## DTO Constraint

`riskPlan.targetPrice` exists in the Strategy Decision DTO. It is a TypeScript string field inside the module-local DTO and is serialized as JSON in the existing repository. It is not a Prisma schema column and does not require route or migration changes for this bounded source slice.

The field can be made compatibility-safe by changing the module-local type to allow `null` and by emitting `null` instead of an arbitrary projected value.

## Boundary Verification

| Check | Result |
| --- | --- |
| Can stop generating arbitrary numeric target values without schema/route/shared changes? | Yes |
| Can replace target-achieved wording module-locally? | Yes |
| Can replace fixed 15% rationale module-locally? | Yes |
| Does this require `trade-plan-risk-engine` changes? | No |
| Does this require Prisma/schema changes? | No |
| Does this require route registry changes? | No |
| Does this require shared utility changes? | No |
| Does this require package or generated/common fixture changes? | No |
| Does this require UI implementation? | No |
| Are focused Strategy Decision tests available? | Yes |

## Allowed Files

- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.service.ts`
- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.types.ts`
- `backend/tests/modules/strategy-decision-engine/**`

## Forbidden Files

- `backend/src/modules/trade-plan-risk-engine/**`
- `backend/tests/modules/trade-plan-risk-engine/**`
- Frontend files.
- Prisma schema/migrations.
- Route registries.
- Shared utilities/UI.
- Package manifests.
- Generated/common fixtures.
- Provider, startup/backfill, Angel One, or live-provider files.

## Implementation Allowed

Yes.

The implementation is allowed because Option B-Strict is explicitly approved, the change is module-local, tests can be added inside Strategy Decision tests, and no forbidden file is required.
