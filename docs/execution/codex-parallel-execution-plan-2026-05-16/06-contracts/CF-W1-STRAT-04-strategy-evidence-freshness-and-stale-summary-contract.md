# CF-W1-STRAT-04 Strategy Evidence Freshness And Stale-Summary Contract

Date: 2026-05-20

Owner: Team 03 Architecture Factory

## Status

Draft architecture contract for a bounded first slice. Not Ready for Implementation.

## Contract Intent

Strategy Framework must tell the user whether a compact strategy-evidence summary is current, stale, partial, or structurally limited without changing rating math, backtest simulation internals, route behavior, or persistence shape.

The first slice exists to stop compact strategy summaries from reading like fresh proof when they are:

- old enough to need a rerun,
- missing persisted diagnostic basis fields,
- supported only by low or insufficient samples,
- or structurally limited because no compact evidence exists.

## Ownership

`strategy-framework` owns this contract.

Backtesting Strategy Lab remains the owner of detailed run history and simulation internals. No downstream consumer should invent a second freshness dialect for compact strategy proof in this first slice.

## Required First-Slice Boundary

Allowed future implementation boundary:

- `backend/src/modules/strategy-framework/strategy-framework.service.ts`
- `backend/src/modules/strategy-framework/strategy-framework.types.ts`
- `backend/src/modules/strategy-framework/strategy-framework.md`
- `backend/tests/modules/strategy-framework/strategy-framework.service.test.ts`
- `frontend/src/features/strategy-framework/types.ts`
- `frontend/src/features/strategy-framework/components/StrategyFrameworkPage.tsx`
- `frontend/tests/ui/strategy-framework.spec.ts`

Forbidden:

- repository/evaluator/registry/controller/router/validation/index edits;
- frontend API or route file edits;
- Backtesting Strategy Lab source edits;
- Prisma/schema/migrations;
- route-registry, shared utility, shared UI, package, generated, provider/live-data, startup/backfill, paid/cloud, broker, or telemetry scope.

## Required Additive Semantics

The first slice must preserve existing fields and add evidence-freshness metadata only.

Recommended additive shape:

```ts
type StrategyEvidenceFreshnessStatus =
  | 'CURRENT'
  | 'STALE'
  | 'PARTIAL'
  | 'STRUCTURALLY_LIMITED';

type StrategyEvidenceFreshnessReasonCode =
  | 'SUMMARY_CURRENT'
  | 'SUMMARY_STALE'
  | 'MISSING_SUMMARY'
  | 'LOW_SAMPLE_SUFFICIENCY'
  | 'INSUFFICIENT_SAMPLE_SUFFICIENCY'
  | 'RATING_WARNINGS_PRESENT'
  | 'RATING_CAPS_PRESENT'
  | 'MISSING_DIAGNOSTIC_BASIS'
  | 'NON_ENTRY_OR_DRAFT_LIMIT';

interface StrategyEvidenceFreshness {
  status: StrategyEvidenceFreshnessStatus;
  label: string;
  reasonSummary: string;
  reasonCodes: StrategyEvidenceFreshnessReasonCode[];
  rerunRecommended: boolean;
  basisDate: string | null;
  ageDays: number | null;
}
```

Recommended additive placement:

```ts
interface StrategyPerformanceSummaryDto {
  // existing fields preserved
  evidenceFreshness?: StrategyEvidenceFreshness;
}

interface StrategyProofRegistryRow {
  // existing fields preserved
  evidenceFreshness?: StrategyEvidenceFreshness;
}
```

Exact type names may differ. The semantics must not.

## Required Mapping Rules

- `CURRENT`
  - compact summary exists;
  - `generatedAt` is inside the first-slice freshness window;
  - sample is not `INSUFFICIENT`;
  - no missing diagnostic-basis reason is present;
  - no warning/cap reason is present.

- `STALE`
  - compact summary exists;
  - `generatedAt` is outside the first-slice freshness window;
  - rerun is recommended even if other metrics remain available.

- `PARTIAL`
  - compact summary exists;
  - evidence is usable for review, but caution must remain visible because of one or more of:
    - `LOW_SAMPLE` sample sufficiency;
    - `ratingWarnings`;
    - `ratingCapsApplied`;
    - missing persisted warning/cap/coverage/benchmark basis on older rows.

- `STRUCTURALLY_LIMITED`
  - no compact summary exists; or
  - sample sufficiency is `INSUFFICIENT`; or
  - the strategy is draft or a non-entry support rule in the compact proof surface.

## Required Freshness Window Rule

The first slice must use one documented module-local max-age rule derived from `generatedAt`.

Recommended first-pass rule:

- summary age `<= 30` calendar days: eligible for `CURRENT`
- summary age `> 30` calendar days: `STALE`

This child must not introduce timeframe-specific persisted rerun policy or run-history provenance. If Team 00 wants that, split a later child.

## Required Reason-Summary Rule

Add one concise reusable summary label and one reason summary built only from current module evidence.

Recommended precedence:

1. missing summary
2. non-entry or draft structural limit
3. insufficient sample
4. stale age
5. low sample
6. warning/cap presence
7. missing diagnostic basis
8. current summary

The first child must not invent new scoring, new proof grades, or new simulation calculations just to produce the freshness summary.

## Required UI Contract

The existing Strategy Framework feature must show the additive freshness packet on the current user-facing surfaces that already consume these DTOs:

- catalog rows
- proof registry rows / detail panel
- performance matrix rows

The UI may use one compact chip plus one short explanatory line. It must stay research-supportive and must not imply a direct trade instruction.

## Compatibility Rules

- preserve rating math
- preserve proof-status derivation
- preserve registered-backtest eligibility behavior
- preserve current API paths and query params
- preserve existing `missingEvidenceReason`, `ratingReasons`, `ratingWarnings`, `ratingCapsApplied`, `latestPerformance`, and `nextAction`
- keep all new fields additive only

## Explicit Rejection In This Pass

Reject the following from `CF-W1-STRAT-04`:

- repository or schema changes
- new strategy-evidence persistence model
- Backtesting Strategy Lab source changes
- route or query-contract changes
- shared UI extraction
- frontend API file changes
- strategy registry or evaluator behavior rewrites

If any of that becomes necessary, stop and return the item to Team 00 / Architect as a new child or blocker.

## Test Contract

Focused tests must prove:

- current summary state
- stale summary state
- partial state from low sample
- partial state from warnings/caps or missing historical diagnostic basis
- structurally limited state from no summary or insufficient sample
- visible catalog/performance/proof labels with no route/API regression

