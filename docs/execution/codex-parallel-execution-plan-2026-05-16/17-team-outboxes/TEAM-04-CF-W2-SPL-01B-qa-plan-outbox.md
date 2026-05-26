# TEAM-04 CF-W2-SPL-01B QA Plan Outbox

Date: 2026-05-26

Team: Team 04 QA Factory

Mode: docs-only QA planning refresh in main workspace

## Assignment

Refresh `CF-W2-SPL-01B` QA planning so it matches the completed Team 03 verdict:

- backend-only;
- active-only;
- read-path-only;
- no route-registry scope;
- no frontend or shared UI scope;
- no schema/migration/generated/package scope;
- no durable closed lifecycle semantics.

## Files Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W2-SPL-01B-signal-position-ledger-active-positions-read-model-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W2-SPL-01B-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W2-SPL-01B-active-position-read-model-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W2-SPL-01B-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W2-SPL-01B-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-CF-W2-SPL-01B-architecture-outbox.md`
- `backend/package.json`

## Files Changed

- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W2-SPL-01B-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-CF-W2-SPL-01B-qa-plan-outbox.md`

## Result

Team 04 replaced the broader split-child QA framing with a backend-only QA gate aligned to the completed Team 03 packet.

The refreshed QA plan now includes:

- a backend-only acceptance matrix;
- exact focused backend test and build commands;
- explicit rejection checks for frontend, route-registry, schema, shared-file, generated-file, and durable-lifecycle drift;
- product-language guardrails that reject active-trade/open-trade/closed-trade/target/R:R/advice wording;
- a Ready recommendation for Team 00 promotion.

## Ready Recommendation

Recommendation: READY FOR TEAM 00 PROMOTION as a bounded backend-only child.

This is a QA planning readiness recommendation only. It does not self-approve implementation.

## Blockers

No remaining Team 04 planning blocker inside the active execution docs.

Normal downstream gates remain:

- Team 00 one-writer reservation across the `signal-position-ledger` backend module and backend tests;
- implementation must stay inside the Team 03 allowed file set;
- any later route-registry or frontend exposure must be opened as separate shared-file work.

## Validation

No builds, tests, UI checks, Prisma commands, or live-data checks were run.

Validation performed:

- documentation review
- packet alignment review
- command-surface confirmation from `backend/package.json`

## Next Gate

Next owner: Team 00 for Ready promotion and sequencing.
