# TEAM-07 Portfolio / Watchlist / Alerts Outbox - 2026-05-17

Mode: read-only audit/refinement.

Files changed: none by Team 07.

Tests, services, providers, staging, and commits: none.

## Current Readiness

No Team 07 application-code item is ready. The ready queue says no app-code item is available for Teams 05-09.

Team 07 has no current inbox assignment file.

## Grounded Gaps

- Portfolio valuation treats data as complete when current prices are non-null, not when Data Quality is `READY`.
- Portfolio context attaches latest signal context directly.
- Watchlist enrichment returns current price and latest signal without readiness fields.
- Alerts evaluate all enabled rules and create price, signal, portfolio, and watchlist events without DQ evidence.
- Alert event inbox actions are global. `AlertEvent` has no direct `userId`.
- Portfolio/watchlist child operations still miss consistent current-user propagation.
- Portfolio Intelligence derives health/review/action labels from summary price/signal fields and carries only `summary.dataStatus`.

## Candidate Requirements

1. `CF-W1-L3-DQ-01`: parent Lane 3 readiness consumer policy contract.
2. `CF-W1-L3-AUTH-01`: portfolio/watchlist child ownership contract, two-user tests, then source fix.
3. `CF-W1-L3-AUTH-02`: alert event ownership contract, especially schema-vs-join-through-AlertRule decision.
4. `CF-W1-L3-ALERT-01`: alert DQ suppression tests after the Lane 3 DQ contract.
5. `CF-W1-L3-PORT-01` / `CF-W1-L3-INTEL-01`: portfolio/watchlist readiness DTOs and Portfolio Intelligence reliability gate.

## Future Reservations

Likely module-local reservations after contract:

- `backend/src/modules/portfolio-management/**`
- `backend/tests/modules/portfolio-management/**`
- `backend/src/modules/watchlist-management/**`
- `backend/tests/modules/watchlist-management/**`
- `backend/src/modules/alerts-monitoring/**`
- `backend/tests/modules/alerts-monitoring/**`
- `backend/src/modules/portfolio-intelligence/**`
- `backend/tests/modules/portfolio-intelligence/**`

Decision-gated reservations:

- `backend/prisma/schema.prisma` if direct `AlertEvent.userId` is chosen.
- `frontend/src/features/{portfolio-management,portfolio-intelligence,watchlist-management,alerts-monitoring}/**` only after UX/UI scope approval.
- Route registries and shared UI remain forbidden unless explicitly reserved.

## Recommendation

Do not implement Team 07 code yet. Prepare and accept `CF-W1-L3-DQ-01` and `CF-W1-L3-AUTH-01` contracts plus QA plans first. The first plausible code slice is `CF-W1-L3-AUTH-01` if it remains module-local.
