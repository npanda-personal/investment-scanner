# TEAM-03 CF-W2-SPL-01B Architecture Outbox

Date: 2026-05-26

Team: Team 03 Architecture Factory

Mode: docs-only architecture readiness in main workspace

## Assignment

Prepare the bounded architecture packet for:

- `CF-W2-SPL-01B - Signal Position Ledger Active Positions Read Model`

Goal:

- determine whether the split child can become Ready using existing persisted/public evidence only;
- keep the first implementation bounded;
- avoid schema, route-registry, shared UI, package/generated, provider/live, startup/backfill, broker, portfolio, and Trade Plan target/R:R scope.

## Files Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/shared-file-control.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W2-SPL-01B-signal-position-ledger-active-positions-read-model-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W2-SPL-01A-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W2-SPL-01B-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-02-requirement-factory.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-TSC-02-active-signal-health-rule-evidence-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-TSC-03-supporting-trust-evidence-contract.md`
- `backend/prisma/schema.prisma`
- `backend/src/api/routes.ts`
- `frontend/src/app/routes.tsx`
- `backend/src/modules/signal-generation-engine/**`
- `backend/src/modules/market-data-foundation/**`
- `backend/src/modules/data-quality-engine/**`
- `backend/src/modules/strategy-decision-engine/**`
- `backend/src/modules/strategy-framework/**`
- `backend/src/modules/today-trade-review/**`

## Files Changed

- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W2-SPL-01B-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W2-SPL-01B-active-position-read-model-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W2-SPL-01B-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-CF-W2-SPL-01B-architecture-outbox.md`

## Verdict

`CF-W2-SPL-01B` can become Ready as one bounded backend-only read-model child.

## Why

- current `dev` already provides source-proven entry trigger evidence through the enriched Signal Generation trigger contract;
- current `dev` already provides latest persisted price basis and current DQ/trust basis;
- current `dev` already provides strategy/rule/version provenance sufficient for a first read-model row;
- current `dev` still does not provide durable lifecycle truth, so the packet explicitly limits health/lifecycle to compatibility-only exit-risk states and explicit unavailable semantics;
- route-registry and frontend exposure are not required for the smallest honest first child.

## Exact Future File Reservation Result

Allowed in the first child:

- new backend module files under `backend/src/modules/signal-position-ledger/**`
- focused backend module tests under `backend/tests/modules/signal-position-ledger/**`

Forbidden in the first child:

- `backend/src/api/routes.ts`
- all `frontend/src/features/signal-position-ledger/**`
- `frontend/src/app/routes.tsx`
- Prisma/schema/migrations
- shared UI / shared backend utilities
- package/generated
- provider/live/startup/backfill
- Today Review / Trade Plan / Portfolio / Backtesting source edits

## QA / Ready Result

Ready is possible after Team 04 QA confirmation for the backend-only boundary.

Important nuance:

- the current Team 04 QA plan is broader than this packet and includes route/UI follow-on ideas;
- Team 00 should evaluate Ready against the backend-only subset only;
- a surfaced API/page still requires a later Team 00 shared-file gate.

## Remaining Non-Architecture Gate

Still needed before implementation:

- Team 04 QA confirmation aligned to the backend-only packet
- Team 00 Ready promotion with exact one-writer reservation

Not needed for this packet:

- schema/storage consent
- route-registry consent
- shared UI consent
- package/generated consent

## Tests / Validation

- Tests run: none
- Builds run: none
- UI checks run: none
- Reason: docs-only architecture readiness pass

## Next Gate

Team 04 QA confirmation for the backend-only child, then Team 00 Ready evaluation and sequencing.
