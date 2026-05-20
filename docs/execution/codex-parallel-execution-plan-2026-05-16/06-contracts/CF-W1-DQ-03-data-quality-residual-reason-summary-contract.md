# CF-W1-DQ-03 Data Quality Residual Reason Summary Contract

Date: 2026-05-20

Owner: Team 03 Architecture Factory

## Status

Draft architecture contract for a bounded first slice. Not Ready for Implementation.

## Contract Intent

Data Quality Engine must expose one DQ-owned residual explanation that downstream trust consumers can reuse without duplicating DQ interpretation logic.

The first slice must derive from existing DQ output only. It must not create a second readiness model or require durable persistence.

## Ownership

`data-quality-engine` owns the contract.

Downstream modules may display or relay this packet later, but they must not own the interpretation taxonomy.

## Required First-Slice Boundary

Allowed future implementation boundary:

- `backend/src/modules/data-quality-engine/data-quality-engine.service.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.types.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.md`
- `backend/tests/modules/data-quality-engine/data-quality-engine.service.test.ts`
- `backend/tests/modules/data-quality-engine/data-quality-engine.invariants.test.ts`

Forbidden:

- repository/controller/router/validation/index edits;
- Market Data source edits;
- frontend work;
- downstream consumer source edits;
- Prisma/schema/migrations;
- route-registry, shared utility, shared UI, package, generated, provider/live-data, startup/backfill, paid/cloud, broker, or telemetry scope.

## Required Additive Semantics

The additive payload must preserve semantics equivalent to:

```ts
type DataQualityResidualCategory =
  | 'CLEAN'
  | 'LIMITED'
  | 'BLOCKED'
  | 'COVERAGE_GAP'
  | 'LIQUIDITY_GAP'
  | 'MISSING_DATA'
  | 'UNSUPPORTED';

interface DataQualityResidualSummary {
  category: DataQualityResidualCategory;
  reasonCodes: string[];
  reasonSummary: string;
}
```

Recommended additive placement:

```ts
interface DataQualityEvaluationDto {
  // existing fields
  residualSummary: DataQualityResidualSummary;
}
```

Exact type names may differ. The semantics must not.

## Required Mapping Rules

- derive only from existing fields already present on `DataQualityEvaluationDto` or computed in `evaluateInstrument(...)`;
- `CLEAN` is allowed only when there is no residual blocker or material limitation to summarize;
- `LIMITED` must cover non-blocking incompleteness or weaker trust cases;
- `BLOCKED` must represent non-ready or fail-closed conditions already owned by DQ;
- `COVERAGE_GAP`, `LIQUIDITY_GAP`, `MISSING_DATA`, and `UNSUPPORTED` must be chosen only from existing DQ evidence, not from new heuristics invented outside DQ.

## Service Coverage Rule

The first slice must decorate:

- newly evaluated payloads;
- list payloads returned from repository reads;
- diagnostics payloads returned from repository reads;
- any service method that exposes `DataQualityEvaluationDto` or a map of those DTOs to callers.

This rule keeps the first slice useful without requiring durable repository persistence.

## Compatibility Rules

- preserve all existing DQ fields;
- keep filtering and readiness behavior unchanged;
- add only additive interpretation fields.

## Test Contract

Focused backend tests must prove:

- clean mapping;
- limited mapping;
- blocked mapping;
- coverage-gap mapping;
- liquidity-gap mapping;
- unsupported or missing-data mapping;
- service decoration on repository-returned DTOs as well as freshly evaluated DTOs.
