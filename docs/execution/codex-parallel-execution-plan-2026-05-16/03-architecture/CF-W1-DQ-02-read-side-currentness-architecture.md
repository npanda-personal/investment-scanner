# CF-W1-DQ-02 Read-Side Currentness Architecture

Date: 2026-05-25

Owner: Team 03 Architecture Factory

## Status

Ready candidate after QA.

Residual `CF-W1-DQ-02` can reopen as one bounded no-schema DQE read-side/public-contract child if implementation stays inside DQE repository/service/types/doc/test scope and uses read-time reconstruction from current authoritative evidence. No durable currentness storage is required by architecture at this gate.

## Verdict

`Ready candidate after QA`

Reason:

- current `dev` still leaves `summary()`, `list()`, `diagnostics()`, and latest-evaluation helper reads persistence-shaped first;
- accepted `CF-W1-DQ-02A` already handled evaluator-local classification only;
- the residual trust gap is now a bounded DQE read-side/public-contract problem, and Team 02 / Team 00 explicitly selected read-time reconstruction as the default product direction;
- current source does not prove durable schema fields are necessary yet.

## Evidence Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-DQ-02-residual-read-side-currentness-requirement.md`
- existing DQ residual docs:
  - `03-architecture/CF-W1-DQ-02-architecture-review.md`
  - `03-architecture/CF-W1-DQ-02B-architecture-review.md`
  - `06-contracts/CF-W1-DQ-02-dq-currentness-evidence-contract.md`
  - `06-contracts/CF-W1-DQ-02B-dq-currentness-public-read-path-contract.md`
  - `08-work-packets/CF-W1-DQ-02-work-packet.md`
  - `08-work-packets/CF-W1-DQ-02B-work-packet.md`
  - `17-team-outboxes/TEAM-03-CF-W1-DQ-02B-architecture-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-architecture-factory.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/12-ready-queue/blocked-by-upstream-dependency.md`
- current DQE source/tests:
  - `backend/src/modules/data-quality-engine/data-quality-engine.repository.ts`
  - `backend/src/modules/data-quality-engine/data-quality-engine.service.ts`
  - `backend/src/modules/data-quality-engine/data-quality-engine.types.ts`
  - `backend/src/modules/data-quality-engine/data-quality-engine.controller.ts`
  - `backend/src/modules/data-quality-engine/data-quality-engine.router.ts`
  - `backend/src/modules/data-quality-engine/data-quality-engine.md`
  - `backend/tests/modules/data-quality-engine/data-quality-engine.repository.test.ts`
  - `backend/tests/modules/data-quality-engine/data-quality-engine.service.test.ts`
  - `backend/tests/modules/data-quality-engine/data-quality-engine.routes.test.ts`
  - `backend/tests/modules/data-quality-engine/data-quality-engine.invariants.test.ts`
- current Market Data ownership evidence:
  - `backend/src/modules/market-data-foundation/index.ts`
  - `backend/src/modules/market-data-foundation/market-data-foundation.market-session.ts`
  - `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
  - `backend/src/modules/market-data-foundation/market-data-foundation.types.ts`
  - `backend/src/modules/market-data-foundation/market-data-foundation.md`

## Current Source Findings

- `data-quality-engine.service.ts` still returns repository-shaped `summary()` and `list()` results directly, and `diagnostics()` returns the persisted repository row whenever one exists.
- `data-quality-engine.repository.ts` still derives `stalePriceCount` from `dataGaps` string matching and reconstructs DTOs from persisted arrays rather than a currentness-specific contract.
- current `DataQualityEvaluationDto` has no read-side currentness object.
- Market Data already owns session timing through `latestCompletedTradingDateForRegion()` and exposes current evidence on read models such as `latest_price_date`, `expected_latest_trading_date`, `readiness_blockers`, `trusted_baseline_blocker_codes`, `latest_completed_eod_date`, and `stored_data_through_date`.
- controller/router behavior is thin pass-through only; no route branching or response shaping logic exists outside the DQE service layer.

## Architecture Decision

Open the residual child as a DQE read-side/public-contract packet, not as a schema packet and not as another evaluator-only child.

Implementation must centralize one DQE-owned read-time reconstruction path and reuse it across:

- `summary()`
- `list()`
- `diagnostics()` when a persisted row already exists
- `getLatestEvaluationForInstrument()`
- `getEvaluationsForInstruments()`

Summary counts must be computed from the same reconstructed per-instrument currentness semantics used by row/detail/latest-helper reads. Do not keep a summary-only stale heuristic.

## Smallest Bounded Child

Child label:

`CF-W1-DQ-02-RS1 read-side currentness reconstruction`

Bounded scope:

- DQE repository read helpers may widen to fetch the persisted DQ rows needed for the read surfaces.
- DQE service owns read-time reconstruction, cross-surface reuse, and summary aggregation.
- DQE types own the additive currentness contract.
- DQE module doc records the new public semantics and the explicit no-durable-history limitation.
- Focused DQE repository/service tests prove cross-surface consistency and fail-closed propagation.

No route, schema, generated, package, provider, startup, or frontend scope is part of this child.

## Required Read-Side Contract Semantics

The additive contract must distinguish, at minimum:

- `CURRENT_COMPLETED_SESSION`
- `CURRENT_FINALIZATION_PENDING`
- `STALE_COMPLETED_SESSION_MISSED`
- `MISSING_LATEST_PRICE`
- `SESSION_EVIDENCE_UNAVAILABLE`
- `PROVIDER_GAP_BLOCKED`
- `CONTRADICTORY_EVIDENCE`

Equivalent field names are acceptable, but the semantics are not optional. The contract must remain fail-closed when evidence is missing or contradictory.

Minimum additive fields:

- currentness status
- currentness reason code
- latest observed trading date when known
- latest completed trading date when known
- plain-language reason

## Future Allowed Files

Exact future writer set for the first implementation pass:

- `backend/src/modules/data-quality-engine/data-quality-engine.repository.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.service.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.types.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.md`
- `backend/tests/modules/data-quality-engine/data-quality-engine.repository.test.ts`
- `backend/tests/modules/data-quality-engine/data-quality-engine.service.test.ts`
- `backend/tests/modules/data-quality-engine/data-quality-engine.invariants.test.ts`

## Future Forbidden Files

Exact forbidden scope for this child:

- `backend/src/modules/data-quality-engine/data-quality-engine.controller.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.router.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.validation.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.module.ts`
- `backend/src/modules/data-quality-engine/index.ts`
- `backend/src/api/routes.ts`
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- generated Prisma or generated type files
- package manifests
- shared backend utilities
- all `backend/src/modules/market-data-foundation/**` source/docs/tests
- provider, scheduler, worker, queue, startup, or backfill source in any module
- all frontend source/tests
- shared UI files
- `frontend/src/app/routes.tsx`

Result:

- route registry scope: forbidden, not required
- schema/storage scope: forbidden, not required
- shared utility scope: forbidden, not required
- package/generated scope: forbidden, not required
- provider/startup/backfill scope: forbidden, not required
- frontend scope: forbidden, not required

## One-Writer Notes

- One writer owns the entire DQE child in a single pass.
- Do not split repository and service across separate implementers because the contract depends on one shared reconstruction basis.
- Team 07 `CF-W2-TSC-05A` is in a separate worktree and has no file overlap with this DQE child.

## Testing Decision

Service/repository focused tests are sufficient for the first child.

Controller/route response tests are not required for this packet because:

- controller methods only parse inputs and forward `res.json(...)`;
- router tests currently assert route registration only;
- no route registry change, validation change, or controller branching change is authorized.

Add controller/route response tests only if Team 00 later approves controller logic changes, query-parsing changes, or literal HTTP payload snapshot coverage as a separate concern.

## QA Handoff Notes

Team 04 should plan focused backend verification for cross-surface consistency on:

- current completed session
- finalization pending
- stale missed completed session
- missing latest price
- session evidence unavailable
- provider-gap blocked
- contradictory evidence
- fail-closed propagation through latest-helper consumers and existing eligibility filters

Required QA rule:

- the same instrument and same current evidence must produce the same currentness status/reason on `summary`, `list`, `diagnostics`, and latest-helper reads;
- summary must count the same reconstructed categories used by detail/list/latest-helper rows;
- unavailable, blocked, and contradictory evidence must not degrade into implied freshness.

## Performance / Stop Conditions

The child remains viable only if implementation can keep reconstruction bounded inside DQE with current public inputs.

Stop and return to Team 00 for a Decision Packet if implementation proves either of these true:

1. truthful cross-surface reconstruction cannot be delivered without widening into Market Data source writers, route files, or durable schema/storage; or
2. summary/list reconstruction requires unbounded or clearly laptop-hostile per-instrument read fan-out that cannot be kept acceptably bounded inside the allowed DQE writer set.

No such blocker is proven by the current audit, so durable schema/storage is not requested at this gate.

## Next Gate

Team 04 QA plan for the bounded DQE read-side child, then Team 00 Ready promotion if QA accepts the packet shape.
