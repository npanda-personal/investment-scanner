# TEAM-03 CF-W2-SPL-01A Architecture Outbox

Date: 2026-05-26

Team: Team 03 Architecture Factory

Mode: docs-only architecture audit in main workspace

## Assignment

Align Team 03 architecture prep to the completed Team 02 Signal Position Ledger requirement set:

- `CF-W2-SPL-01 - Signal Position Ledger`
- `CF-W2-SPL-01A - Signal Position Ledger first slice`

Goal:

- inspect current code/docs;
- produce a source map and first-slice recommendation;
- determine whether `CF-W2-SPL-01A` can become a Ready candidate without app-code changes.

## Files Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/00-control/active-work-board.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/shared-file-control.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/contract-inventory.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W2-SPL-01-signal-position-ledger-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W2-SPL-01A-signal-position-ledger-first-slice-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W2-SPL-01-pre-architecture-qa-scaffold.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-SIG-TRIGGER-ENTRY-01-rule-trigger-entry-price-evidence-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-TSC-02-active-signal-health-rule-evidence-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-TSC-03-supporting-trust-evidence-contract.md`
- `backend/prisma/schema.prisma`
- `backend/src/api/routes.ts`
- `frontend/src/app/routes.tsx`
- `backend/src/modules/signal-generation-engine/**`
- `backend/src/modules/strategy-decision-engine/**`
- `backend/src/modules/today-trade-review/**`
- `backend/src/modules/data-quality-engine/**`
- `backend/src/modules/market-data-foundation/**`
- `backend/src/modules/strategy-framework/**`
- `backend/src/modules/backtesting-strategy-lab/**`
- `backend/src/modules/trade-plan-risk-engine/**`

## Files Changed

- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W2-SPL-01A-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-CF-W2-SPL-01A-architecture-outbox.md`

## Result

`CF-W2-SPL-01A` is not Ready.

Team 03 did not create a contract or work-packet because the current requirement still bundles:

- active read-model compatibility work; and
- durable closed-history truth that current persisted evidence does not support.

## Architecture Finding

Current source can already supply:

- source-proven entry trigger price/timestamp from `signal-generation-engine`;
- current latest price basis from `market-data-foundation`;
- current DQ/trust basis from `data-quality-engine`;
- strategy/rule/version provenance from `signal-generation-engine`, `strategy-decision-engine`, and `strategy-framework`;
- supporting proof labels from `strategy-framework` and `backtesting-strategy-lab`.

Current source cannot yet supply truthfully:

- a durable signal-position open event distinct from repeated daily signal rows;
- a documented close event with close type, close date, close price, and close reason;
- a reusable active/closed lifecycle record for a new module to consume without replay ambiguity.

## Missing Gate

Primary missing gate:

- Team 02 split or Team 00 decision on the first honest child shape.

Needed next:

1. split into active-only read-model child plus later durable closed-history child; or
2. explicitly open a storage-first lifecycle packet.

Secondary missing gate:

- Team 04 executable QA plan still depends on the child boundary. The existing file is only a pre-architecture scaffold.

## Future Ready Direction

If Product/Team 00 approves a split, the likely next honest child is:

- active-only `signal-position-ledger` read model first

with likely module-local writer sets in:

- `backend/src/modules/signal-position-ledger/**`
- `frontend/src/features/signal-position-ledger/**`
- focused backend tests
- one frontend UI smoke spec

Shared route registries would remain deferred requests, not automatic first-child reservations.

## Validation

No tests, builds, Prisma commands, servers, UI runs, or app-code edits were performed.

Validation was source and docs inspection only.

## Consent Blockers

No true user-consent or sandbox blocker occurred.

The blockers are product/architecture gates only:

- truthful closed-history source is missing on the current base;
- executable QA planning depends on a split child.

## Next Gate

- Team 02: split the child or revise the first-slice boundary.
- Team 03: after that split, issue the exact contract/work-packet.
- Team 04: convert the scaffold into a real QA plan for the chosen child.
