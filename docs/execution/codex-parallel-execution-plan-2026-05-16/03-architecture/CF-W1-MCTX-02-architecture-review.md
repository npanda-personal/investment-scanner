# CF-W1-MCTX-02 Architecture Review

Date: 2026-05-20

Owner: Team 03 Architecture Factory

## Status

Architecture-readiness packet prepared for a bounded first slice.

Readiness result: `Not Ready for Implementation`.

This item remains a draft requirement. This packet does not move it to Ready.

## Evidence Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-MCTX-02-market-context-freshness-basis-labels-for-persisted-vs-generated-summaries-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/audit-fresh-direct-value-gaps-2026-05-20.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-MCTX-01-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-MCTX-01-market-context-regime-evidence-contract.md`
- `backend/src/modules/market-context-intelligence/market-context-intelligence.md`
- `backend/src/modules/market-context-intelligence/market-context-intelligence.service.ts`
- `backend/src/modules/market-context-intelligence/market-context-intelligence.types.ts`
- `backend/src/modules/market-context-intelligence/market-context-intelligence.repository.ts`
- `backend/tests/modules/market-context-intelligence/market-context-intelligence.service.test.ts`
- active-scope conflict references:
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/16-team-inboxes/TEAM-06-CF-W1-SQLAB-02A-implementation-assignment.md`
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/16-team-inboxes/TEAM-07-CF-W1-L3-TREV-02-implementation-assignment.md`
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/16-team-inboxes/TEAM-07-CF-W1-L3-INTEL-03-implementation-assignment.md`

## Current Source Findings

- `summary()` already distinguishes the two paths structurally: use existing persisted snapshot if available, otherwise `run(...)` and then read again from the repository.
- `run(...)` currently computes a fresh summary but only returns `{ status: 'success' }`, which hides whether the current response was generated as a fallback.
- `latestPersistedSummary()` already gives a bounded persisted-only read path.
- Current `MarketContextSummary` has `updatedAt`, `dataStatus`, `macro`, and breadth/sample fields, but no explicit freshness-basis label or reason packet.
- A backend-first first slice can be implemented inside service/types/docs/tests only by returning or decorating provenance on the service response. No route, schema, or shared UI edit is structurally required for the first slice.

## Module Ownership

`market-context-intelligence` owns this first slice.

Reasons:

- the trust gap is in the owned summary DTO and the service choice between persisted and generated paths;
- the basis label must be produced where the service knows whether a snapshot existed at request start;
- downstream modules should later reuse this owned basis label rather than infer it from timestamps.

## Architecture Verdict

Bounded no-schema, no-route, no-shared-file first slice is feasible.

Recommended first slice:

- backend-only;
- additive to `MarketContextSummary`;
- service-local provenance decoration;
- keep repository untouched in the first slice;
- if needed, adjust `run(...)` to compute and return the fresh summary object internally before persisting, but keep that change inside the service file.

Recommended stable semantics:

- basis label such as `PERSISTED_AT_REQUEST_START`, `GENERATED_ON_DEMAND`, `GENERATED_FALLBACK_AFTER_MISSING_PERSISTED`;
- `persistedSnapshotAvailableAtStart: boolean`;
- one reason summary explaining why the returned summary is persisted or generated;
- explicit macro-missing and partial-evidence reason labels derived from existing summary fields only.

## Exact Future File Reservations

If Team 00 later promotes a first implementation slice, reserve only:

- `backend/src/modules/market-context-intelligence/market-context-intelligence.service.ts`
- `backend/src/modules/market-context-intelligence/market-context-intelligence.types.ts`
- `backend/src/modules/market-context-intelligence/market-context-intelligence.md`
- `backend/tests/modules/market-context-intelligence/market-context-intelligence.service.test.ts`

## Exact Forbidden Files

- `backend/src/modules/market-context-intelligence/market-context-intelligence.repository.ts`
- `backend/src/modules/market-context-intelligence/market-context-intelligence.controller.ts`
- `backend/src/modules/market-context-intelligence/market-context-intelligence.router.ts`
- `backend/src/modules/market-context-intelligence/market-context-intelligence.validation.ts`
- `backend/src/modules/market-context-intelligence/index.ts`
- `backend/tests/modules/market-context-intelligence/market-context-intelligence.repository.test.ts`
- `backend/tests/modules/market-context-intelligence/market-context-intelligence.routes.test.ts`
- all frontend `market-context-intelligence` files/tests
- `backend/src/modules/historical-context-snapshots/**`
- `backend/src/modules/signal-calibration-engine/**`
- `backend/src/modules/research-hub/**`
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- backend and frontend route registries
- shared backend utilities
- shared frontend components
- package manifests
- generated files
- provider/live-data, startup/backfill, paid/cloud, broker, or telemetry scope

## Dependency Risks And Stop Conditions

Stop and return to Team 00 if the first slice requires:

- repository changes to persist new basis metadata;
- schema/migration changes;
- route/controller/validation changes;
- frontend/UI adoption as part of first-slice acceptance;
- edits in downstream consumers like Historical Context, Signal Calibration, or Research Hub.

Specific risk:

- if Team 00 requires the first slice to make the label user-visible immediately on the page/widget, split a second feature-local child later. Keep this first slice backend-first.

## Parallel-Safety With Active Teams

- Safe in parallel with active `CF-W1-SQLAB-02A`; file sets are disjoint.
- Safe in parallel with active `CF-W1-L3-TREV-02`; file sets are disjoint.
- Safe in parallel with active `CF-W1-L3-INTEL-03`; file sets are disjoint.

The child is not safe to parallelize with any future `market-context-intelligence` writer reserving the same service/types/test files.

## QA Planning Handoff Notes

Future Team 04 planning should cover:

- persisted snapshot available at request start;
- generated-on-demand fallback when persisted snapshot is missing;
- additive basis labeling on both `summary()` and `latestPersistedSummary()` behavior where applicable;
- partial evidence and macro-unconfigured reason labels;
- backward compatibility of existing summary fields.
