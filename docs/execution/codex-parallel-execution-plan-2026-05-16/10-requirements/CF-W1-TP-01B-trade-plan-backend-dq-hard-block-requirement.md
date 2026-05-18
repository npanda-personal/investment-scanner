# CF-W1-TP-01B - Trade Plan Backend DQ Hard-Block Requirement

Date: 2026-05-17

## Status

Requirement created. Not Ready for Implementation.

Team 03 prepared the backend-only child contract and backend file reservations under parent policy `CF-W1-TP-01A`. Team 04 prepared the child QA plan. This item is the current front-runner for the next Team 00 Ready promotion after the PORT-01A rework routing, but it still needs Team 00 Ready promotion before Trade Plan source or test work starts.

## Product Value

Trade Plan paper-review readiness must fail closed when Data Quality evidence is missing or blocked, and target-shaped compatibility fields must not behave as advice-like target prices or trusted readiness proof.

## Evidence

- Parent policy `CF-W1-TP-01A` resolved as Option B.
- Contract: `06-contracts/CF-W1-TP-01B-backend-compatibility-dq-hard-block-contract.md`.
- Architecture review: `03-architecture/CF-W1-TP-01B-architecture-review.md`.
- Work packet draft: `08-work-packets/CF-W1-TP-01B-work-packet.md`.
- QA plan: `04-qa/CF-W1-TP-01B-qa-plan.md`.
- Team 03 2026-05-18 near-ready file-reservation matrix confirms this backend-only child is bounded, with exact Trade Plan file reservations and optional geometry-file use only with Architect note.
- Team 06 2026-05-18 readiness inspection: child packet is aligned enough to become a bounded backend-only implementation handoff, but is not Ready until Team 00 promotes it and copies exact reservations into a Team 06 implementation inbox.
- Current Team 00 routing keeps this ahead of `CF-W1-NOTIF-02`, `CF-W1-L3-ALERT-01`, and `CF-W1-L3-AUTH-03`.
- Ready queue still has no active app-code item.

## Acceptance Criteria

- Missing, `NOT_READY`, blocked, stale, unusable, illiquid, or signal-ineligible DQ blocks trusted paper-review readiness.
- `LIMITED` remains blocked or limited-review-only unless a later Product Owner decision narrows it.
- Target-shaped fields remain compatibility-only and do not drive trusted readiness.
- Trusted output avoids advice and target-price language.
- Focused backend tests prove DQ hard blocks and target compatibility behavior.

## Non-Goals

- No frontend, Today Review, Prisma, route, shared utility/UI, provider, startup/backfill, package, or generated-file work.
- No broader target-geometry/API/UI migration.

## Next Gate

Team 00 Ready evaluation and implementation handoff, including exact Trade Plan file reservations copied into a new Team 06 implementation inbox.
