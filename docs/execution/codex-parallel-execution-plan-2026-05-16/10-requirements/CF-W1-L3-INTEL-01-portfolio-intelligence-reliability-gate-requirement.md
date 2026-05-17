# CF-W1-L3-INTEL-01 - Portfolio Intelligence Reliability Gate Requirement

Date: 2026-05-17

## Status

Requirement draft prepared by Team 07. Not Ready for Implementation.

This is a child requirement under accepted Lane 3 readiness policy `CF-W1-L3-DQ-01`. It depends on the portfolio-management readiness DTO child slice `CF-W1-L3-PORT-01A`, because Portfolio Intelligence should consume portfolio readiness evidence from Portfolio Management rather than duplicate Data Quality Engine scoring or readiness mapping.

## Product Value

Portfolio Intelligence must not present health scores, review rankings, red flags, or action-like labels as reliable when the underlying portfolio holdings lack trusted Data Quality evidence. It may still provide limited diagnostic context, but reliability claims and action-like outputs must fail closed or be visibly downgraded when readiness is missing, limited, stale, unsupported, not ready, unusable, or blocked.

## Current Evidence

- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.service.ts` builds `healthScore`, `status`, `reviewRanking`, `redFlags`, grouped summaries, and `actionSuggestion` values from `PortfolioSummaryDto` fields.
- Current `PortfolioIntelligenceResponse` carries only `dataStatus: string` from Portfolio Management.
- Current `PortfolioSummaryDto.dataStatus` is based on missing price fields, not Data Quality readiness.
- `CF-W1-L3-PORT-01` defines the needed future portfolio readiness DTO fields, but that source slice is not implemented yet.

## Acceptance Criteria

Future accepted implementation must:

- Consume readiness evidence exposed by Portfolio Management after `CF-W1-L3-PORT-01A`.
- Not import `DataQualityEngineRepository` or duplicate DQ scoring, stale thresholds, liquidity scoring, or coverage scoring.
- Add explicit Portfolio Intelligence reliability metadata to the response.
- Preserve existing route paths and response fields for backward compatibility.
- Mark `READY` portfolio readiness as eligible for reliable health/review output when all required portfolio-intelligence conditions pass.
- Mark `LIMITED` readiness as diagnostic/limited and suppress or downgrade reliability and action-like labels.
- Mark missing DQ, `NOT_READY`, `UNUSABLE`, stale hard blockers, unsupported scope, scope mismatch, blocked tier, or missing readiness DTOs as not-enough-trusted-data.
- Ensure review rankings, red flags, explanations, grouped summaries, and `actionSuggestion` values do not overclaim reliability when readiness is not trusted.
- Avoid direct financial advice language and arbitrary target prices.
- Include focused backend tests for READY, LIMITED, missing readiness DTO, and blocked readiness scenarios.

## Non-Goals

- No portfolio-management source changes in this child slice.
- No Data Quality Engine source/export changes.
- No Prisma schema, migration, route registry, shared utility, shared UI, frontend, package, generated type, provider, startup/backfill, Angel One, broker, paid/cloud, or telemetry work.
- No alert readiness suppression; that remains `CF-W1-L3-ALERT-01`.
- No Copilot or Stock Research UX work.

## Future Candidate Files After Ready Promotion

- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.service.ts`
- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.types.ts`
- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.md`
- `backend/tests/modules/portfolio-intelligence/portfolio-intelligence.service.test.ts`

## Stop Conditions

- `CF-W1-L3-PORT-01A` is not implemented and accepted, leaving no portfolio readiness DTO to consume.
- Implementation requires portfolio-management source edits in the same pass.
- Implementation requires shared readiness DTOs, Data Quality Engine changes, route changes, schema changes, frontend changes, or UI language decisions.
- Product language ambiguity appears around existing `HOLD` or `REDUCE_RISK` action labels and cannot be resolved as a backend-only reliability downgrade.

## Next Gate

Wait for `CF-W1-L3-PORT-01A` portfolio readiness DTO implementation and acceptance, then route this child packet through QA/architecture acceptance and Team 00 Ready promotion.
