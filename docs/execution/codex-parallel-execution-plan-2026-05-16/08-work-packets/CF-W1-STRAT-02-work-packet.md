# CF-W1-STRAT-02 Work Packet

Date: 2026-05-18

## Work Item

Strategy Framework rule versioning and Data Quality gate policy.

## State

Blocked pending a separate approval-gated durable child.

`CF-W1-STRAT-02A` already delivered the no-schema trust-surfacing child and was accepted on the Team 06 branch as `359d0a3`. This parent packet now exists only to keep the remaining durable history gap explicit. It does not authorize another no-schema pass.

## Owner / Lane / Modules

- Architecture owner: Team 03 Architecture Factory
- Future implementation owner: Team 06 Strategy / Signals / Risk
- Lane: Lane 2
- Backend module: `strategy-framework`
- Frontend feature: `strategy-framework`

## Allowed Files After Ready Promotion

None from this parent packet.

Team 00 must open a separate `CF-W1-STRAT-02B` packet before any application writer is authorized.

Candidate approval-gated future `02B` files to evaluate later:

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- generated Prisma client or generated types
- `backend/src/modules/strategy-framework/strategy-framework.repository.ts`
- `backend/src/modules/strategy-framework/strategy-framework.types.ts`
- `backend/src/modules/strategy-framework/strategy-framework.service.ts`
- `backend/src/modules/strategy-framework/strategy-framework.md`
- `backend/tests/modules/strategy-framework/strategy-framework.repository.test.ts`
- `backend/tests/modules/strategy-framework/strategy-framework.service.test.ts`

## Current Forbidden Files

- all application source or tests under this parent until Team 00 opens `CF-W1-STRAT-02B`
- `backend/src/modules/strategy-framework/strategy-framework.registry.ts`
- `backend/src/modules/strategy-framework/strategy-framework.evaluator.ts`
- `backend/src/modules/strategy-framework/strategy-framework.controller.ts`
- `backend/src/modules/strategy-framework/strategy-framework.router.ts`
- `backend/src/modules/strategy-framework/strategy-framework.validation.ts`
- `backend/tests/modules/strategy-framework/strategy-framework.evaluator.test.ts`
- all `frontend/src/features/strategy-framework/**`
- all `backend/src/modules/data-quality-engine/**`
- backend and frontend route registries
- shared backend utilities
- shared frontend components
- package manifests
- paid/cloud, provider/startup, broker, telemetry, or live-data flows

## Required Behavior

Future `CF-W1-STRAT-02B` implementation must:

- preserve version-keyed durable strategy definition history instead of overwriting by `code`;
- expose durable-history state additively on top of accepted `02A` trust metadata;
- preserve current evaluator math, proof grading, standalone backtest gating, routes, and page tabs.

## Explicitly Deferred

- reopening `CF-W1-STRAT-02A`
- evaluator math, scoring, or backtest-config changes
- Data Quality Engine source changes
- controller/router/validation/API-client changes
- shared UI/navigation or route expansion unless Team 00 later opens a separate compatibility follow-up

## Dependency Notes

- `CF-W1-STRAT-02A` is already complete and should stay closed.
- Full durable/stable rule revisioning remains blocked until Team 00 / Architect authorize a schema/generated/repository child.
- One-writer constraint for future `02B`:
  - reserve schema/migrations/generated/repository/service/types/doc/tests to one writer;
  - do not run in parallel with any other `strategy-framework` source packet.
- Parallel with active Team 06 `CF-W1-SIG-TRIGGER-02A`:
  - this docs-only parent refresh is safe in parallel;
  - future source implementation has no file overlap with `signal-generation-engine`, but Team 00 should not assign another Team 06 implementation pass until the active Team 06 work closes.

## QA Handoff Needed

No new Team 04 executable QA handoff is needed now.

If Team 00 later opens `CF-W1-STRAT-02B`, required QA focus becomes:

- repository/schema behavior for version-keyed persisted definition history;
- additive compatibility of Strategy Framework list/detail/proof payloads while durable history is added;
- regression protection for accepted `02A` trust metadata semantics.

## Stop Conditions

Stop and return to Team 00 / Architect if implementation requires:

- any attempt to reopen accepted `02A` files as the main durable solution;
- evaluator math or score semantics changes;
- Data Quality Engine source changes;
- controller/router/validation or route-registry changes;
- shared utility/UI or package changes.

## Next Gate

Team 00 should keep the parent requirement out of Ready.

Next gate:

1. leave `CF-W1-STRAT-02` blocked as a parent requirement; or
2. open a separate approval-gated `CF-W1-STRAT-02B` packet for schema/repository/generated durable history work.
