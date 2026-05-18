# CF-W1-L3-INTEL-02 Architecture Review

Date: 2026-05-18

Owner: Team 03 Architecture Factory

## Status

Portfolio Intelligence review-traceability architecture packet prepared. Not Ready for Implementation.

This child stays separate from `CF-W1-L3-INTEL-01`, but both packets reserve the same `portfolio-intelligence` files and must be combined or sequenced by Team 00.

## Evidence Inspected

- `AGENTS.md`
- `10-requirements/CF-W1-L3-INTEL-02-portfolio-intelligence-review-traceability-requirement.md`
- `03-architecture/CF-W1-L3-INTEL-01-architecture-review.md`
- `06-contracts/CF-W1-L3-INTEL-01-portfolio-intelligence-reliability-gate-contract.md`
- `03-architecture/CF-W1-L3-PORT-01-architecture-review.md`
- `06-contracts/CF-W1-L3-PORT-01-portfolio-watchlist-readiness-dto-contract.md`
- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.service.ts`
- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.types.ts`
- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.md`
- `backend/tests/modules/portfolio-intelligence/portfolio-intelligence.service.test.ts`
- `backend/src/modules/portfolio-management/portfolio-management.types.ts`

## Current Source Findings

- Portfolio Intelligence computes `healthScore`, `status`, `reviewRanking`, `redFlags`, `groupedSummary`, and `actionSuggestion` from portfolio summary fields and thresholds.
- The module currently exposes only `dataStatus` from Portfolio Management; it does not surface readiness reasons, blocker provenance, or latest trusted data date.
- Review items and red flags currently explain heuristics, but they do not trace whether the review surface is reliable, limited, diagnostic-only, or blocked.
- The module already depends on `PortfolioManagementService.summary()` and `allocation()` through public service boundaries and should stay on that boundary.

## Architecture Decision

Prepare `CF-W1-L3-INTEL-02` as a portfolio-intelligence-only traceability layer that consumes accepted portfolio readiness DTOs after `CF-W1-L3-PORT-01A`.

This child should:

- stay inside `portfolio-intelligence` service/types/docs/tests;
- consume readiness metadata from accepted portfolio summary DTOs, not directly from DQE;
- add explainable traceability metadata for review ranking, red flags, and overall review surface state;
- distinguish `RELIABLE`, `LIMITED`, `DIAGNOSTIC`, and `BLOCKED` review states;
- keep existing response fields backward-compatible.

## Proposed Additive Traceability Shape

The first packet should add additive fields equivalent to:

```ts
type PortfolioReviewTraceabilityStatus = 'RELIABLE' | 'LIMITED' | 'DIAGNOSTIC' | 'BLOCKED';

interface PortfolioReviewTraceabilityDto {
  status: PortfolioReviewTraceabilityStatus;
  sourceModules: Array<'portfolio-management' | 'data-quality-engine' | 'portfolio-intelligence'>;
  latestTrustedDataDate: string | null;
  reasons: string[];
  blockers: string[];
}
```

Attach points may include:

- top-level `reviewTraceability` on `PortfolioIntelligenceResponse`
- per-item `traceability` on `ReviewItem`
- optional per-holding `traceability` on `HoldingIntelligence` when the module needs to explain why a ranking exists

## Exact Future File Reservations

- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.service.ts`
- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.types.ts`
- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.md`
- `backend/tests/modules/portfolio-intelligence/portfolio-intelligence.service.test.ts`

## Forbidden Files

- `backend/src/modules/portfolio-management/**`
- `backend/src/modules/data-quality-engine/**`
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- backend and frontend route registries
- shared backend utilities
- shared frontend components
- package manifests
- generated files
- frontend feature files
- alerts-monitoring source/tests
- watchlist-management source/tests
- providers, startup/backfill, paid/cloud, broker, or telemetry flows

## Dependency And Constraint Notes

- `CF-W1-L3-INTEL-02` depends on accepted `CF-W1-L3-PORT-01A` because portfolio readiness DTOs are the approved upstream source for trusted data date, blocker reasons, and readiness status.
- `CF-W1-L3-INTEL-02` does not depend on `CF-W1-L3-PORT-01B`; watchlist readiness is outside `portfolio-intelligence` scope.
- The packet is constrained by `portfolio-intelligence` source boundaries: it shares the exact same file set as `CF-W1-L3-INTEL-01`, so Team 00 must combine or sequence them with one writer.
- Preferred sequencing is `CF-W1-L3-PORT-01A` acceptance first, then either a combined `INTEL-01 + INTEL-02` handoff or a strict sequence where `INTEL-01` lands before `INTEL-02`.

## Required QA Scenarios

Focused backend QA should prove:

- reliable review state when accepted readiness metadata is trusted;
- limited review state when readiness is passive-only;
- diagnostic review state when heuristics are shown but trust is not action-ready;
- blocked review state when readiness metadata is missing or blocked;
- source modules, blocker reasons, and latest trusted data date are carried through where available;
- existing public Portfolio Intelligence fields remain backward-compatible.

## Readiness Result

Architecture packet prepared. Not Ready for Implementation.

The file reservations are exact, but upstream `CF-W1-L3-PORT-01A` acceptance and same-file sequencing with `CF-W1-L3-INTEL-01` are both required before Team 00 can evaluate this child for Ready.
