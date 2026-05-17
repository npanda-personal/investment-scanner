# CF-W1-L3-DQ-01 - Lane 3 Readiness Consumer Policy Requirement

Date: 2026-05-17

## Status

Product policy resolved. Not Ready for Implementation.

This is a parent policy requirement for Lane 3 consumers. Product Owner approved Option B on 2026-05-17, but child implementation still requires refreshed architecture/QA-backed contracts, exact file reservations, and one-module-at-a-time work packets before portfolio, watchlist, alerts, portfolio intelligence, or related UX implementation starts.

## Product Value

Portfolio, watchlist, and alert workflows must not treat market data or signal context as trusted unless Data Quality readiness has been proven. Users may still need research visibility, but action-like alerts, reliability claims, and portfolio intelligence labels must fail closed or show explicit blockers when readiness is missing, stale, limited, or not ready.

## Current Evidence

Latest inputs:

- `17-team-outboxes/TEAM-07-portfolio-watchlist-alerts-2026-05-17.md`
- `11-module-audits/audit-portfolio-watchlist-alerts.md`
- `12-ready-queue/blocked-by-decision.md`

Observed gaps:

- Portfolio valuation treats data as complete when current prices are non-null, not when Data Quality is `READY`.
- Watchlist enrichment returns current price and latest signal without readiness fields or blockers.
- Portfolio Intelligence derives health/review/action labels from summary price/signal fields and carries only `summary.dataStatus`.
- Alerts create price, signal, portfolio, and watchlist events without checking instrument-level readiness or preserving DQ evidence.
- Action-like alert behavior is higher risk than display-only portfolio/watchlist context and needs a Product Owner plus Architect policy decision.

## Resolved Policy Decision

Resolution: `07-decisions/DECISION-20260517-lane3-readiness-consumer-policy-resolution.md`

Approved policy:

- `READY` supports trusted display and action-like workflows.
- `LIMITED` may appear only in passive portfolio, watchlist, or research contexts.
- `LIMITED` must show visible warnings, reasons, and no reliability/action labels.
- Alerts, action-like workflows, reliability labels, and trusted summaries require `READY`.
- Missing, stale hard blockers, unsupported, `NOT_READY`, and `UNUSABLE` remain blocked.
- Child slices must not overclaim reliability and must implement one module at a time with focused tests.

## Candidate Acceptance Criteria

Future accepted implementation must satisfy all approved contract details, including:

- Lane 3 consumers use Data Quality Engine public outputs and do not duplicate DQ scoring logic.
- Missing DQ evidence fails closed for trusted/action-like workflows.
- `NOT_READY`, `UNUSABLE`, stale, blocked, unsupported, and scope-mismatched data cannot create trusted alert events.
- `LIMITED` data is either blocked or explicitly display-only according to the accepted policy.
- Portfolio and watchlist DTOs expose readiness status, blocker reasons, source timestamp/latest trusted data date, and downstream eligibility where approved.
- Portfolio Intelligence reliability, health, review, and action-like labels are blocked or downgraded when readiness is not trusted.
- Alert events, when allowed, preserve DQ evidence and trigger provenance in metadata.
- Region and asset type scope are preserved in requests and responses where the module owns scoped data.
- Product language remains research-support oriented and avoids direct financial advice.

## Non-Goals

- No application source change in this requirement refinement pass.
- No Prisma schema, route registry, shared utility, package, generated type, provider, server, or frontend shared UI change.
- No alert event ownership model change; that belongs to `CF-W1-L3-AUTH-02`.
- No Copilot trust UX implementation; that belongs to `CF-W1-UX-02`.
- No backtesting, trade-plan, signal-generation, or strategy-decision implementation.

## Future File Reservations After Approval

Likely module-local implementation files after accepted contract and work packet:

- `backend/src/modules/portfolio-management/**`
- `backend/tests/modules/portfolio-management/**`
- `backend/src/modules/watchlist-management/**`
- `backend/tests/modules/watchlist-management/**`
- `backend/src/modules/alerts-monitoring/**`
- `backend/tests/modules/alerts-monitoring/**`
- `backend/src/modules/portfolio-intelligence/**`
- `backend/tests/modules/portfolio-intelligence/**`

Frontend files require separate UX approval and explicit reservation.

## Forbidden Without Separate Approval

- `backend/prisma/schema.prisma`
- backend or frontend route registries
- shared backend utilities
- shared frontend components
- package manifests or generated files
- provider/live-data workflows
- UI implementation or Playwright changes

## Stop Conditions

- Display-vs-action readiness policy remains unresolved.
- Implementation would require schema, route, shared utility, or shared UI edits.
- Data Quality Engine output contract is insufficient for the proposed consumer behavior.
- Tests would only freeze current fail-open behavior.
- Auth or alert ownership changes become necessary in the same slice.

## Next Gate

Post-decision architecture and QA refresh. Do not move to Ready for Implementation until child contracts, exact file reservations, QA scenarios, and implementation work packets are accepted.
