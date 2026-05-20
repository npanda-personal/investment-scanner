# CF-W1-L3-DQ-01B Portfolio Intelligence Reliability Gate Contract

Date: 2026-05-20

Owner: Team 03 Architecture Factory

## Status

Contract prepared. Not Ready for Implementation.

This child is the next bounded implementation packet after the `DQ-01A` passive readiness contract gate. It is narrower than `INTEL-02`: reliability gate first, richer review traceability later.

## Intent

Portfolio Intelligence is a review surface. It must fail closed when the accepted Lane 3 readiness evidence is not trusted, and it must say whether its health, review, red-flag, and action-like output is:

- `RELIABLE`
- `LIMITED`
- `DIAGNOSTIC`
- `BLOCKED`

This child governs reliability gating only. It does not own full review traceability provenance.

## Required Upstream Contract

This child consumes accepted portfolio passive readiness metadata only:

- `PortfolioSummaryDto.readinessSummary`
- `HoldingValuationDto.readiness`

The only approved read boundary is:

```text
portfolio-intelligence -> PortfolioManagementService.summary()
```

Forbidden upstream dependencies:

- watchlist readiness DTOs
- `DataQualityEngineRepository`
- direct DQE scoring or readiness mapping helpers
- recreated readiness mapping logic inside `portfolio-intelligence`

## Required Representation Boundary

The first child stays backend-only and module-local.

Allowed implementation surface after Team 00 promotion:

- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.service.ts`
- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.types.ts`
- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.md`
- `backend/tests/modules/portfolio-intelligence/portfolio-intelligence.service.test.ts`

This child must not require:

- Prisma/schema/migrations
- route changes
- frontend feature work
- shared DTO or shared utility extraction
- `portfolio-management` or `watchlist-management` source edits

## Required Additive Contract

Additive top-level response metadata is required:

```ts
type PortfolioIntelligenceReliabilityStatus =
  | 'RELIABLE'
  | 'LIMITED'
  | 'DIAGNOSTIC'
  | 'BLOCKED';

interface PortfolioIntelligenceReliabilityDto {
  status: PortfolioIntelligenceReliabilityStatus;
  source: 'portfolio-management-readiness';
  readyCount: number;
  limitedCount: number;
  blockedCount: number;
  missingEvaluationCount: number;
  canTrustHealthScore: boolean;
  canTrustReviewRanking: boolean;
  canTrustRedFlags: boolean;
  canTrustActionSuggestions: boolean;
  reasons: string[];
  blockers: string[];
}
```

Required attachment point:

- `PortfolioIntelligenceResponse.reliability`

## Required Behavior

1. `READY` upstream readiness:
   - may produce `reliability.status = RELIABLE`
   - may allow trusted health score, review ranking, red flags, and action-like labels

2. `LIMITED` upstream readiness:
   - must not imply trusted actionability
   - must return `LIMITED` or `DIAGNOSTIC`, not `RELIABLE`
   - must set `canTrustActionSuggestions = false`

3. missing readiness metadata:
   - must fail closed
   - must never infer trust from `dataStatus`, `currentPrice`, signal presence, or P&L alone
   - should return `BLOCKED` unless the implementation intentionally exposes heuristics as clearly `DIAGNOSTIC`

4. blocked readiness evidence:
   - blocked summary state
   - blocked holding readiness
   - `NOT_READY`
   - `UNUSABLE`
   - stale hard-blockers
   - unsupported scope
   - scope mismatch

   must not produce trusted health, review, red-flag, or action-like claims

5. backward compatibility:
   - existing response fields remain present
   - review ranking shape remains preserved where practical

## Required Suppression Rule

When readiness is not trusted, the child must suppress action-like trust claims.

Minimum contract expectation:

- `canTrustActionSuggestions = false` whenever reliability is not `RELIABLE`

Recommended implementation posture for the first slice:

- preserve `actionSuggestion` field presence for compatibility
- normalize non-trusted action-like output toward review-oriented language rather than stronger claims

## Explicit Non-Goals

This child does not add:

- `latestTrustedDataDate`
- source-module provenance fields
- per-review-item traceability DTOs
- per-red-flag provenance packets

Those remain later `INTEL-02` scope.

## Sequencing Rule

- `DQ-01A` is a hard contract prerequisite.
- `PORT-01A` is a hard implementation prerequisite.
- Current plain `dev` does not contain accepted `PORT-01A` commit `f1432e6`, so implementation must stack on that accepted baseline or on a later clean `dev` that contains it.
- `PORT-01B` is not a code dependency.
- `WATCH-01` is sequencing-only and must not be disturbed.
- `INTEL-02` shares the same writer set and stays downstream unless Team 00 intentionally combines the scopes.

## Forbidden Behavior

- do not import `DataQualityEngineRepository`
- do not duplicate DQE scoring, stale thresholds, liquidity scoring, coverage scoring, or readiness tier mapping
- do not consume watchlist readiness DTOs
- do not modify `portfolio-management` source/tests
- do not modify `watchlist-management` source/tests
- do not modify Prisma schema, migrations, route registries, shared utilities, shared UI, frontend files, package manifests, or generated files
- do not introduce direct financial advice language or arbitrary target prices
- do not add traceability-only fields reserved for `INTEL-02`

## Focused Test Contract

Focused backend tests must prove:

- `RELIABLE` when upstream readiness is trusted
- `LIMITED` when passive display is visible but not action-trusted
- `DIAGNOSTIC` when heuristics are exposed without trusted standing
- `BLOCKED` when readiness evidence is missing or blocked
- missing readiness never becomes trusted because `dataStatus = COMPLETE`
- action-like trust claims are suppressed when reliability is not `RELIABLE`
- existing response fields remain present
- no DQE repository imports or watchlist dependencies are introduced
