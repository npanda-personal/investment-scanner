# CF-W1-L3-PORT-01A - Portfolio Readiness DTO Requirement

Date: 2026-05-18

## Status

Requirement refined by Team 02. Not Ready for Implementation.

This is the first bounded child slice under `CF-W1-L3-PORT-01`. It narrows the broader portfolio/watchlist readiness DTO work to portfolio-management only. Team 00 still owns Ready promotion and implementation handoff.

## Product Value

Portfolio holdings and summaries must not imply trustworthy market context from non-null prices, valuation fields, or latest signals alone. Portfolio DTOs need explicit Data Quality readiness evidence before Portfolio Intelligence, future alerts, Copilot summaries, or other action-like workflows treat portfolio context as reliable.

## Evidence

- Parent policy `CF-W1-L3-DQ-01` resolved as Option B: passive `LIMITED` display with action-like blocking.
- Parent contract: `06-contracts/CF-W1-L3-PORT-01-portfolio-watchlist-readiness-dto-contract.md`.
- Parent architecture review: `03-architecture/CF-W1-L3-PORT-01-architecture-review.md`.
- Parent work packet: `08-work-packets/CF-W1-L3-PORT-01-work-packet.md`.
- QA plan: `04-qa/CF-W1-L3-PORT-01-qa-plan.md`.
- Team 01 2026-05-18 audit recommends `CF-W1-L3-PORT-01A` as the first Lane 3 readiness slice.
- Team 03 2026-05-18 near-ready file-reservation matrix confirms the portfolio-only child is bounded and implementation-eligible for Ready review, with no shared/high-risk request if implementation consumes only Data Quality public service/types.
- Team 07 2026-05-18 readiness inspection found the slice eligible to become module-local after Team 00 Ready promotion, with no apparent need for Prisma, routes, shared utilities/UI, providers, frontend, watchlist, alerts, or portfolio-intelligence changes.
- Ready queue still has no active app-code item.

## Future Owner / Module

- Future implementation owner: Team 07 Portfolio / Watchlists / Alerts.
- Module: `portfolio-management`.
- Lane: Lane 3.

## Candidate File Reservation After Ready Promotion

Allowed files after Team 00 Ready promotion:

- `backend/src/modules/portfolio-management/portfolio-management.service.ts`
- `backend/src/modules/portfolio-management/portfolio-management.types.ts`
- `backend/src/modules/portfolio-management/portfolio-management.md`
- `backend/tests/modules/portfolio-management/portfolio-management.service.test.ts`

Forbidden files:

- Prisma schema or migrations
- backend or frontend route registries
- shared backend utilities or shared DTOs
- shared frontend components
- package manifests
- generated files
- Data Quality Engine source or public exports
- watchlist-management source/tests in this first slice
- alerts-monitoring source/tests
- portfolio-intelligence source/tests
- frontend files
- providers, startup/backfill, Angel One, broker, live-provider, paid/cloud, or telemetry flows

## Acceptance Criteria

Future accepted implementation must:

- Add module-local readiness DTO fields to portfolio holding valuation output.
- Add a portfolio-level readiness summary to portfolio summary output.
- Preserve existing portfolio response fields, route paths, `dataStatus`, price, valuation, and signal fields.
- Consume Data Quality Engine through public service outputs only.
- Avoid importing Data Quality repositories or duplicating Data Quality scoring, stale thresholds, liquidity scoring, or coverage scoring.
- Map `READY` Data Quality evidence to trusted display/action eligibility only according to the accepted contract.
- Map `LIMITED` to passive display only, with visible reasons and blocked action eligibility.
- Map missing, `NOT_READY`, `UNUSABLE`, stale hard blocker, unsupported, scope mismatch, or blocked tier evidence to blocked/untrusted readiness.
- Ensure `dataStatus = COMPLETE` does not imply Data Quality trust.
- Add focused backend tests for `READY`, `LIMITED`, missing, and blocked/not-ready readiness cases.

## Non-Goals

- No watchlist readiness DTO implementation; that remains future `CF-W1-L3-PORT-01B`.
- No Portfolio Intelligence reliability implementation; that remains `CF-W1-L3-INTEL-01` after this slice is accepted.
- No alert readiness suppression; that remains `CF-W1-L3-ALERT-01`.
- No Data Quality Engine source/export changes.
- No Prisma, route, shared utility, shared UI, frontend, provider, startup/backfill, package, generated-file, paid/cloud, broker, or live-provider work.
- No direct financial advice, target-price language, or action recommendation language.

## Stop Conditions

- Implementation requires Data Quality Engine source/export changes.
- Implementation requires shared DTO/helper files.
- Implementation requires watchlist, alerts, portfolio-intelligence, frontend, route, Prisma, provider, package, generated-file, startup/backfill, or live-data changes.
- Existing portfolio response compatibility cannot be preserved.
- `LIMITED` would need to be treated as action-ready.

## Next Gate

Team 00 Ready evaluation and implementation handoff for the portfolio-only child slice, including exact portfolio-management file reservations copied into a Team 07 inbox or Ready handoff.
