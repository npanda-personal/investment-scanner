# CF-W1-STRAT-03 Architecture Review

Date: 2026-05-18

Owner: Team 03 Architecture Factory

## Status

Ready candidate.

`CF-W1-STRAT-03` has an honest backend-local, additive, no-schema first child on current `dev`, but the child must stay explicit about one limitation: `READ_PATH_CREATED` is request-local provenance for on-demand lookup flows, not durable stored origin across later history/list reads.

## Evidence Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-STRAT-03-strategy-decision-review-provenance-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/refinement-queue.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/12-ready-queue/ready-for-implementation.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/00-control/team-agent-runtime-queue.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/16-team-inboxes/TEAM-06-current-assignment.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-BT-01A-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-BT-01A-work-packet.md`
- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.md`
- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.service.ts`
- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.types.ts`
- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.repository.ts`
- `backend/tests/modules/strategy-decision-engine/strategy-decision-engine.service.test.ts`
- `backend/tests/modules/strategy-decision-engine/strategy-decision-engine.repository.test.ts`
- `backend/prisma/schema.prisma`
- `frontend/src/features/strategy-decision-engine/components/StrategyDecisionDashboard.tsx`
- `frontend/src/features/strategy-decision-engine/components/StrategyDecisionWidget.tsx`

## Queue And Parallelism Check

- `CF-W1-STRAT-03` is still a docs-only refinement item in `refinement-queue.md`; it is not in Ready.
- The live Ready queue shows active Team 06 `CF-W1-BT-01A` as a stacked backtesting characterization child.
- Team 06 `CF-W1-BT-01A` reserves only:
  - `backend/tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.test.ts`
  - `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.md`
- Proposed `CF-W1-STRAT-03` first-child files are all inside `strategy-decision-engine`.

Conclusion: no file overlap exists with active Team 06 `CF-W1-BT-01A`; the future `STRAT-03` child is parallel-safe against that worktree.

## Current Source Findings

- `StrategyDecisionResult` already persists additive trust inputs needed for a first provenance child:
  - `frameworkBacked`
  - `strategyVersion`
  - `frameworkDecision`
  - `frameworkAction`
  - rule arrays
  - `createdAt` / `updatedAt` at the Prisma row level
- Candidate and funnel reads already default to proof-safe filtering and exclude legacy non-framework-backed rows unless `includeLegacy=true`.
- `latestForInstrument()` still performs an on-demand evaluate-and-create when no persisted row exists.
- Current service methods `candidates()`, `history()`, `watchlist()`, and `portfolio()` return Strategy Decision DTOs and can add response metadata without route or repository changes.
- Current DTOs do not expose a top-level provenance object or top-level reason summary.
- Current persisted schema has no stored provenance column for "this row was first created by a read-path miss."

## No-Schema First Child Determination

Yes, with a bounded rule:

- framework-backed versus legacy fallback can be labeled from existing persisted fields;
- `READ_PATH_CREATED` can be labeled honestly only on the same request path that created the row (`latestForInstrument()`, plus `watchlist()` and `portfolio()` when they call that path);
- later history/list reads cannot honestly reconstruct durable read-path-created origin from current persisted state and must not pretend otherwise.

That limitation does not block the first child because the requirement's direct trust gap is still reduced on the highest-risk review paths without schema, repository, or route changes.

## Architecture Decision

Keep the first child entirely inside `strategy-decision-engine` service/types/doc/service-test scope and add additive response metadata only.

Preferred additive shape:

```ts
type StrategyDecisionProvenanceStatus =
  | 'FRAMEWORK_BACKED'
  | 'LEGACY_FALLBACK'
  | 'READ_PATH_CREATED';

interface StrategyDecisionProvenance {
  status: StrategyDecisionProvenanceStatus;
  persistenceMode: 'PERSISTED_ROW' | 'REQUEST_LOCAL_READ_PATH_CREATE';
  legacyIncludedByRequest: boolean;
  note?: string;
}

interface StrategyDecisionDto {
  // existing fields preserved
  reasonSummary?: string;
  provenance?: StrategyDecisionProvenance;
}
```

Exact names may differ, but the semantics must remain stable.

## Required Mapping Rules

- Persisted row with `frameworkBacked=true`:
  - `provenance.status = FRAMEWORK_BACKED`
  - `persistenceMode = PERSISTED_ROW`
- Persisted row with `frameworkBacked=false`:
  - `provenance.status = LEGACY_FALLBACK`
  - `persistenceMode = PERSISTED_ROW`
- Row created during the current `latestForInstrument()` miss path:
  - `provenance.status = READ_PATH_CREATED`
  - `persistenceMode = REQUEST_LOCAL_READ_PATH_CREATE`
  - this override applies only to the current response, not as a durable later-read guarantee
- `legacyIncludedByRequest=true` only when:
  - the caller used `includeLegacy=true`; and
  - the returned row is non-framework-backed

## Required Reason Summary Rule

The first child must derive one concise top-level `reasonSummary` from evidence already present on the DTO.

Stable derivation order:

1. first blocker if present
2. else first warning if present
3. else first data gap if present
4. else first reason
5. else existing `riskPlan.reasonSummary` if present
6. else a neutral research-support fallback

The summary must stay additive, must not change decision math, and must not introduce advice-like or target-like wording.

## Exact Future File Reservations

One-writer implementation set:

- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.service.ts`
- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.types.ts`
- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.md`
- `backend/tests/modules/strategy-decision-engine/strategy-decision-engine.service.test.ts`

## Explicitly Forbidden Files

- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.repository.ts`
- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.controller.ts`
- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.router.ts`
- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.validation.ts`
- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.module.ts`
- `backend/src/modules/strategy-decision-engine/index.ts`
- `backend/tests/modules/strategy-decision-engine/strategy-decision-engine.repository.test.ts`
- Prisma schema or migrations
- generated files
- backend and frontend route registries
- frontend `strategy-decision-engine` files
- shared backend utilities or shared DTOs
- shared frontend components
- package manifests
- `backend/src/modules/strategy-framework/**`
- `backend/src/modules/signal-generation-engine/**`
- `backend/src/modules/signal-calibration-engine/**`
- `backend/src/modules/data-quality-engine/**`
- `backend/src/modules/smart-money-intelligence/**`
- `backend/src/modules/market-context-intelligence/**`
- `backend/src/modules/trade-plan-risk-engine/**`
- `backend/src/modules/research-hub/**`
- providers, startup/backfill, live-provider, paid/cloud, broker, or telemetry files

## Blocker And Follow-On Notes

- Split required: `No` for the first child.
- Honest limitation: durable cross-request `READ_PATH_CREATED` provenance is not available from current persisted rows.
- Future follow-on only if needed:
  - schema/repository child to persist durable origin metadata for history/list/downstream replay
- That durable follow-on is not required to make the first backend-local child useful and honest.

## QA Planning Handoff Notes

Team 04 should validate:

- candidate and history reads label persisted framework-backed rows as `FRAMEWORK_BACKED`;
- `includeLegacy=true` plus non-framework-backed rows label `LEGACY_FALLBACK` and set `legacyIncludedByRequest=true`;
- default reads still exclude legacy rows unless `includeLegacy=true`;
- `latestForInstrument()` miss path returns `READ_PATH_CREATED` on that response only;
- `watchlist()` and `portfolio()` preserve the same request-local `READ_PATH_CREATED` behavior when a member row is created on demand;
- later persisted history/list reads do not fabricate durable read-path-created origin;
- `reasonSummary` follows the stable precedence rule and remains research-support oriented;
- decision math, query params, route paths, persistence keying, and proof-safe defaults remain unchanged.

## Ready Recommendation

`Ready candidate`

Reason:

- exact module-local writer set exists;
- no schema, repository, route, shared, package, provider, or frontend scope is required;
- no overlap exists with active Team 06 `CF-W1-BT-01A`;
- the first child is honest if it keeps `READ_PATH_CREATED` request-local and documents that limitation plainly.
