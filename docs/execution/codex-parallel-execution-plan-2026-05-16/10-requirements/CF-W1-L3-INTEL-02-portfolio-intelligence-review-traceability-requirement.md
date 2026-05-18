# CF-W1-L3-INTEL-02 - Portfolio Intelligence Review Traceability Requirement

Date: 2026-05-18

## Status

Audit-derived future child requirement. Not Ready for Implementation.

## Product Value

Portfolio Intelligence is a review surface. Investors need to know whether a health score, review ranking, red flag, or action-like label is actually trustworthy or merely diagnostic. A review workflow that traces the evidence behind the label is more useful than a score without context.

## Evidence

- Audit `11-module-audits/audit-portfolio-watchlist-alerts.md` found Portfolio Intelligence computes health score, status, review ranking, red flags, grouped summaries, and `actionSuggestion` from portfolio summary fields.
- The same audit found Portfolio Intelligence currently carries only `summary.dataStatus`, which is not a DQ readiness signal.
- Audit `11-module-audits/current-assignment-readiness-drift-audit-2026-05-18.md` notes Portfolio Intelligence still computes review-oriented labels from `currentPrice`, `latestSignal`, and `dataStatus` without readiness metadata.
- Existing child requirement `CF-W1-L3-INTEL-01` covers reliability gating; this child narrows the user-review workflow so the review surface explains why a result is diagnostic, blocked, or reliable.

## Acceptance Criteria

- Portfolio Intelligence review output distinguishes reliable, limited, diagnostic, and blocked states with explainable reasons.
- Review ranking and red flags do not imply trust when the underlying readiness state is not trusted.
- The user can trace why a result is shown, including source modules, blocker reasons, and the latest trusted data date when available.
- Current public response fields remain backward-compatible unless a later accepted contract explicitly adds review metadata.
- Focused tests cover reliable, limited, blocked, and missing-readiness review states.

## Non-Goals

- No portfolio-management source changes in this child slice.
- No Data Quality Engine scoring duplication.
- No Prisma schema, route registry, shared utility, shared UI, frontend, package, generated type, provider, startup/backfill, broker, paid/cloud, or telemetry work.
- No direct financial advice wording or target prices.

## Future Candidate Files After Ready Promotion

- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.service.ts`
- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.types.ts`
- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.md`
- `backend/tests/modules/portfolio-intelligence/portfolio-intelligence.service.test.ts`

## Next Gate

Product refinement and an architecture contract for the Portfolio Intelligence review-traceability slice, then QA planning and Team 00 Ready evaluation after the upstream portfolio readiness contract is available.
