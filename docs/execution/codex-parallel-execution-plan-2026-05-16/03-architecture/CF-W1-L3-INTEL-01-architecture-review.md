# CF-W1-L3-INTEL-01 Architecture Review

Date: 2026-05-17

Owner: Team 07 Portfolio / Watchlist / Alerts

## Status

Architecture draft prepared. Not Ready for Implementation.

## Work Item

Portfolio Intelligence reliability gate under accepted Lane 3 readiness policy.

## Evidence Inspected

- `06-contracts/CF-W1-L3-DQ-01-lane3-readiness-consumer-policy-contract.md`
- `06-contracts/CF-W1-L3-PORT-01-portfolio-watchlist-readiness-dto-contract.md`
- `04-qa/post-decision-child-scenario-matrix-2026-05-17.md`
- `12-ready-queue/blocked-by-upstream-dependency.md`
- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.service.ts`
- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.types.ts`
- `backend/tests/modules/portfolio-intelligence/portfolio-intelligence.service.test.ts`
- `backend/src/modules/portfolio-management/portfolio-management.types.ts`

## Current Source Findings

- Portfolio Intelligence consumes `PortfolioManagementService.summary()` and `allocation()` through public service boundaries.
- It does not directly consume Data Quality Engine readiness.
- It calculates health score, review ranking, red flags, grouped summaries, and action suggestions even when readiness evidence is absent.
- The only current trust field is `dataStatus`, which reflects current price completeness rather than Data Quality readiness.

## Architecture Decision Draft

Use a backend-only, additive Portfolio Intelligence reliability gate that consumes portfolio-management readiness DTOs after `CF-W1-L3-PORT-01A`.

The implementation should not import Data Quality Engine directly unless a later Architect decision says Portfolio Intelligence must bypass Portfolio Management. The preferred dependency is:

```text
portfolio-intelligence -> portfolio-management public service -> portfolio readiness DTOs
```

This keeps Data Quality scoring and Lane 3 readiness mapping centralized in the portfolio-management child slice and avoids duplicate readiness logic.

## Proposed Response Additions

Additive response fields may include:

```ts
type PortfolioIntelligenceReliabilityStatus = 'RELIABLE' | 'LIMITED' | 'BLOCKED';

interface PortfolioIntelligenceReliabilityDto {
  status: PortfolioIntelligenceReliabilityStatus;
  source: 'portfolio-management-readiness';
  readyCount: number;
  limitedCount: number;
  blockedCount: number;
  missingEvaluationCount: number;
  canShowReliableHealthScore: boolean;
  canShowReviewRanking: boolean;
  canShowActionSuggestions: boolean;
  reasons: string[];
  blockers: string[];
  generatedAt: string;
}
```

Existing fields should remain present for compatibility, but implementation must make non-ready reliability explicit and prevent downstream callers from treating existing `status`, `healthScore`, or `actionSuggestion` as trusted without checking the new reliability metadata.

## Policy Mapping

- `READY`: reliable health/review output may be shown when portfolio readiness summary allows trusted display and action workflows where applicable.
- `LIMITED`: diagnostic context may remain, but reliability and action-like labels must be downgraded or marked not trusted.
- Missing readiness DTO, missing DQ, `NOT_READY`, `UNUSABLE`, stale hard blocker, unsupported/scope mismatch, or blocked tier: return not-enough-trusted-data reliability status and blocker reasons.

## Exact Future File Reservations

Allowed after Ready promotion:

- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.service.ts`
- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.types.ts`
- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.md`
- `backend/tests/modules/portfolio-intelligence/portfolio-intelligence.service.test.ts`

## Forbidden Files

- `backend/src/modules/portfolio-management/**`
- `backend/src/modules/data-quality-engine/**`
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- backend or frontend route registries
- shared backend utilities
- shared frontend components
- package manifests
- generated files
- frontend feature files
- alerts-monitoring source
- providers, schedulers, startup/backfill, Angel One, broker, live-provider, paid/cloud, or telemetry flows

## Required QA Scenarios

- READY portfolio readiness allows reliable health/review metadata.
- LIMITED portfolio readiness returns limited reliability and blocks action-like reliability claims.
- Missing readiness DTO returns blocked/not-enough-trusted-data reliability.
- Blocked portfolio readiness returns blocked reliability and preserves blocker reasons.
- Existing response fields remain backward-compatible.
- No Data Quality scoring logic or repository imports are added to Portfolio Intelligence.

## Readiness Result

Not Ready for Implementation. This child must wait for `CF-W1-L3-PORT-01A` implementation acceptance and Team 00 Ready promotion.
