# CF-W1-STRAT-03 Strategy Decision Review Provenance Contract

Date: 2026-05-18

Owner: Team 03 Architecture Factory

## Status

Ready candidate contract for a bounded backend-local child. Not yet promoted for implementation.

## Contract Intent

Strategy Decision must make review provenance explicit without changing decision math, proof-safe defaults, route behavior, or persistence shape.

The first child exists to answer:

- is this a normal framework-backed persisted decision,
- a legacy fallback row surfaced only because the caller allowed legacy,
- or a row created on demand because the current read path had no persisted decision.

## Ownership

`strategy-decision-engine` owns this behavior.

Upstream modules remain evidence providers only:

- Strategy Framework
- Signal Generation Engine
- Signal Calibration Engine
- Data Quality Engine
- Smart Money Intelligence
- Market Context Intelligence

No upstream or downstream module should own Strategy Decision provenance labeling for this child.

## Exact Implementation Boundary

Allowed writer set:

- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.service.ts`
- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.types.ts`
- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.md`
- `backend/tests/modules/strategy-decision-engine/strategy-decision-engine.service.test.ts`

Forbidden:

- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.repository.ts`
- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.controller.ts`
- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.router.ts`
- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.validation.ts`
- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.module.ts`
- `backend/src/modules/strategy-decision-engine/index.ts`
- repository tests
- Prisma, migrations, generated files, route registries, shared utilities, shared UI, package manifests, frontend files
- upstream/downstream source changes

## Required Additive DTO Contract

The first child must keep current fields and add provenance metadata only.

Preferred additive shape:

```ts
type StrategyDecisionProvenanceStatus =
  | 'FRAMEWORK_BACKED'
  | 'LEGACY_FALLBACK'
  | 'READ_PATH_CREATED';

interface StrategyDecisionProvenance {
  status: StrategyDecisionProvenanceStatus;
  persistenceMode: 'PERSISTED_ROW' | 'REQUEST_LOCAL_READ_PATH_CREATE';
  legacyIncludedByRequest: boolean;
  note?: string;
}

interface StrategyDecisionDto {
  // existing fields preserved
  reasonSummary?: string;
  provenance?: StrategyDecisionProvenance;
}
```

Exact names may differ, but all three provenance states and the request-local limitation must remain distinguishable.

## Required Provenance Rules

- `FRAMEWORK_BACKED`
  - persisted row
  - `frameworkBacked=true`
  - current normal default path for proof-safe candidate reads

- `LEGACY_FALLBACK`
  - persisted row
  - `frameworkBacked=false`
  - must remain excluded by default from candidate/funnel reads
  - may appear only when `includeLegacy=true` or on legacy history/lookups

- `READ_PATH_CREATED`
  - used only when the current request triggered `latestForInstrument()` evaluate-and-create behavior
  - may also surface through `watchlist()` and `portfolio()` because those call `latestForInstrument()`
  - must be described as request-local provenance, not as durable persisted origin

## Required Legacy Flag Rule

`legacyIncludedByRequest=true` only when both are true:

- the caller explicitly supplied `includeLegacy=true`
- the returned row is non-framework-backed

For all other cases, the flag must remain `false`.

## Required Reason Summary Contract

Add one concise top-level `reasonSummary` derived from already-owned evidence only.

Allowed evidence inputs:

- `blockers`
- `warnings`
- `dataGaps`
- `reasons`
- existing `riskPlan.reasonSummary`

Required ordering:

1. blocker
2. warning
3. data gap
4. reason
5. existing risk-plan summary
6. neutral fallback

The first child must not invent new scoring, new proof grades, or new rule math just to produce the summary.

## Honest Limitation Contract

The first child must not claim durable stored read-path provenance for later history/list reads.

Why:

- current `StrategyDecisionResult` persistence has no dedicated stored provenance field for read-path origin;
- repository lookups currently return the persisted row shape only;
- adding durable origin persistence would require a separate schema/repository child.

Allowed first-child behavior:

- label `READ_PATH_CREATED` only on the response that actually created the row;
- later reads may truthfully return `FRAMEWORK_BACKED` or `LEGACY_FALLBACK` based on persisted row shape alone.

## Compatibility Rules

- preserve current decision math
- preserve current proof-safe default filtering
- preserve current query params and route paths
- preserve current persistence keys and generated-date behavior
- preserve current `reasons`, `blockers`, `warnings`, `dataGaps`, `strategyVersion`, `frameworkBacked`, `frameworkDecision`, `frameworkAction`, rule arrays, and readiness labels
- keep all new provenance fields additive only

## Explicit Rejection In This Pass

Reject the following from `CF-W1-STRAT-03`:

- repository edits
- schema/migration/generated changes
- controller/router/validation changes
- frontend rendering changes
- Strategy Framework or DQE contract rewrites
- research-hub adoption work
- trade-plan or today-review adoption work
- any attempt to store durable read-path-created provenance in this child

If any of that becomes necessary, stop and return the item to Team 00 / Architect as a new child or blocker.

## Test Contract

Focused backend tests must prove:

- framework-backed persisted response mapping
- legacy include behavior and `legacyIncludedByRequest`
- request-local `READ_PATH_CREATED` mapping on lookup miss
- request-local read-path behavior through watchlist/portfolio aggregations
- no fabricated durable read-path provenance on later history/list reads
- stable `reasonSummary` precedence
- unchanged default candidate filtering and legacy exclusion

## Split / Blocker Result

- Split required: `No`
- Blocked: `No`
- Honest future follow-on if requested later: durable schema/repository provenance child
