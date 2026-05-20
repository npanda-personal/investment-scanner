# CF-W1-L3-DQ-01B - Portfolio Intelligence Reliability Gate Requirement

Date: 2026-05-20

## Status

Audit-derived future child requirement. Not Ready for Implementation.

## Product Value

Portfolio Intelligence is a review surface, so it must fail closed when the underlying readiness signal is not trusted. A score or red flag is only useful if it can say whether the result is reliable, limited, diagnostic-only, or blocked. After the watchlist readiness baseline is accepted, the remaining user value is the portfolio-intelligence gate that keeps review labels from overclaiming trust.

This child is narrower than the parent Lane 3 policy because it only covers portfolio-intelligence reliability and review labels. It does not reopen Data Quality scoring or portfolio-management display contracts.

## Evidence

- `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/post-decision-source-readiness-audit-2026-05-17.md` names `CF-W1-L3-DQ-01B` as the portfolio-intelligence reliability gate child.
- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.service.ts` still computes health, review ranking, red flags, and `actionSuggestion` from summary fields while carrying only `dataStatus`.
- The same audit shows portfolio-intelligence review output still needs explicit reliability gating when readiness is not `READY`.
- Parent policy `CF-W1-L3-DQ-01` already resolved the display-versus-action trust model, so this child can stay additive and focused.

## Bounded Requirement

Define a portfolio-intelligence reliability gate that downgrades or blocks health, review, red flag, and action-like labels whenever the underlying readiness state is not trusted.

The first child slice should focus on:

- `READY` versus `LIMITED`, `NOT_READY`, `UNUSABLE`, stale, blocked, unsupported, and scope-mismatched states;
- explicit reliable, limited, diagnostic-only, and blocked output labeling;
- preservation of existing response fields and review ranking shape where possible;
- consumption of public DQE outputs and accepted portfolio readiness evidence only;
- no duplicate DQE scoring or readiness mapping logic.

## Acceptance Criteria

- Portfolio Intelligence labels health, review, and action-like output as reliable only when readiness is trusted.
- `LIMITED` and blocked states degrade or suppress reliability claims instead of implying trust.
- Missing readiness evidence cannot produce trusted review output.
- Existing response fields remain backward-compatible unless a later contract adds explicit reliability metadata.
- Focused tests cover READY, LIMITED, missing-readiness, and blocked-readiness scenarios.

## Non-Goals

- No portfolio-management source changes in this child.
- No Data Quality Engine scoring duplication.
- No Prisma schema, route registry, shared utility, shared UI, frontend, package, provider, startup/backfill, broker, paid/cloud, or telemetry work.
- No alert readiness suppression in this child.
- No direct financial advice wording or target prices.

## Future Candidate Files After Ready Promotion

- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.service.ts`
- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.types.ts`
- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.md`
- `backend/tests/modules/portfolio-intelligence/portfolio-intelligence.service.test.ts`

## Next Gate

Product refinement and an architecture contract for the portfolio-intelligence reliability gate, then QA planning and Team 00 routing after the passive readiness child is acknowledged.
