# CF-W1-L3-PORT-01 - Portfolio And Watchlist Readiness DTO Requirement

Date: 2026-05-17

## Status

Parent requirement split. Not Ready for Implementation.

Team 03 prepared the child architecture contract and backend file reservations. Team 04 prepared the child QA plan. Team 02 split the first implementation candidate as `CF-W1-L3-PORT-01A` for portfolio-management only. Watchlist remains future `CF-W1-L3-PORT-01B`.

## Product Value

Portfolio and watchlist views must not infer trust from non-null prices or signals. They need explicit Data Quality readiness metadata so passive display, future alerts, and future trust surfaces can separate trusted, limited, and blocked context.

## Evidence

- Parent policy `CF-W1-L3-DQ-01` resolved as Option B.
- Contract: `06-contracts/CF-W1-L3-PORT-01-portfolio-watchlist-readiness-dto-contract.md`.
- Architecture review: `03-architecture/CF-W1-L3-PORT-01-architecture-review.md`.
- Work packet draft: `08-work-packets/CF-W1-L3-PORT-01-work-packet.md`.
- QA plan: `04-qa/CF-W1-L3-PORT-01-qa-plan.md`.
- First child requirement: `10-requirements/CF-W1-L3-PORT-01A-portfolio-readiness-dto-requirement.md`.
- Ready queue still has no active app-code item.

## Acceptance Criteria

- Portfolio and watchlist DTOs expose DQ readiness evidence from Data Quality Engine public services.
- `READY`, `LIMITED`, missing, and blocked DQ states map to explicit display/action readiness fields.
- Existing response fields remain backward-compatible.
- Lane 3 modules do not duplicate DQ scoring logic or import DQ repositories.
- Focused backend tests prove ready, limited, missing, and blocked states.

## Non-Goals

- No Prisma, route, shared utility, frontend, provider, alert, portfolio-intelligence, or UI work.
- No readiness scoring changes in Data Quality Engine.
- No direct financial advice or arbitrary target-price language.

## Next Gate

Team 00 Ready evaluation for `CF-W1-L3-PORT-01A` as the first portfolio-only implementation slice.
