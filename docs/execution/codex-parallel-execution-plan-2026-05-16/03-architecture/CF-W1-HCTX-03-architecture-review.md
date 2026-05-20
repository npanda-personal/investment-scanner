# CF-W1-HCTX-03 Architecture Review

Date: 2026-05-20

Owner: Team 03 Architecture Factory

## Status

Architecture-readiness packet prepared for a bounded first slice.

Readiness result: `Not Ready for Implementation`.

This item remains a draft requirement. This packet does not move it to Ready.

## Evidence Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-HCTX-03-historical-context-nearest-snapshot-age-and-provenance-warnings-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/audit-fresh-direct-value-gaps-2026-05-20.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-HCTX-01-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-HCTX-02-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-HCTX-01-historical-context-explainability-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-HCTX-02-work-packet.md`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.md`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.service.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.types.ts`
- `backend/tests/modules/historical-context-snapshots/historical-context-snapshots.service.test.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.md`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.service.ts`
- active-scope conflict references:
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/16-team-inboxes/TEAM-06-CF-W1-SQLAB-02A-implementation-assignment.md`
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/16-team-inboxes/TEAM-07-CF-W1-L3-TREV-02-implementation-assignment.md`
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/16-team-inboxes/TEAM-07-CF-W1-L3-INTEL-03-implementation-assignment.md`

## Current Source Findings

- `historical-context-snapshots.service.ts` already owns the nearest-on-or-before lookup rule and assembles `gaps` plus `dataStatus`.
- `lookup(...)` already has all inputs needed for age labeling in-module: requested date, `lookbackDays`, requested scope, metadata-gap detection, and the selected lookup payload returned from the repository.
- `historical-context-snapshots.types.ts` currently exposes only the raw lookup surface. There is no additive lag, match-quality, or provenance packet yet.
- `signal-quality-lab` consumes historical context as a downstream read path only. It depends on the lookup semantics but does not need to be edited for the first slice.
- Nothing in the inspected source requires schema, route, shared utility, or frontend changes to add a backend-first provenance packet.

## Module Ownership

`historical-context-snapshots` owns this first slice.

Reasons:

- the trust gap exists in the owned lookup DTO, not in Market Context math or Signal Quality grouping;
- the selection rule already lives in the module service and must stay the single provenance source;
- downstream consumers can reuse additive lookup metadata later without rebuilding lag logic.

## Architecture Verdict

Bounded no-schema, no-route, no-shared-file first slice is feasible.

Recommended first slice:

- backend-only;
- additive to `SnapshotLookupResult`;
- no repository edit unless Team 00 later approves a second child;
- no frontend/UI adoption in this child.

The first slice should expose stable semantics equivalent to:

- requested date;
- selected snapshot date per component when present;
- `lagDays`;
- `lookbackDays`;
- match quality such as `EXACT_DATE`, `NEAREST_PRIOR`, `FALLBACK_WITHIN_LOOKBACK`, `MISSING_WITHIN_LOOKBACK`, `METADATA_GAP_INPUT`, `NOT_REQUESTED`;
- provenance/source label when already available on the selected row;
- one summary field that states whether the response is same-day evidence, near-date evidence, or fallback evidence.

## Exact Future File Reservations

If Team 00 later promotes a first implementation slice, reserve only:

- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.types.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.service.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.md`
- `backend/tests/modules/historical-context-snapshots/historical-context-snapshots.service.test.ts`

## Exact Forbidden Files

- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.repository.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.controller.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.router.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.validation.ts`
- `backend/src/modules/historical-context-snapshots/index.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.module.ts`
- `backend/tests/modules/historical-context-snapshots/historical-context-snapshots.repository.test.ts`
- `backend/tests/modules/historical-context-snapshots/historical-context-snapshots.routes.test.ts`
- `backend/tests/modules/historical-context-snapshots/historical-context-snapshots.validation.test.ts`
- `backend/src/modules/market-context-intelligence/**`
- `backend/src/modules/signal-quality-lab/**`
- `frontend/src/features/historical-context-snapshots/**`
- `frontend/tests/ui/historical-context-snapshots.spec.ts`
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

- repository widening to fetch older-than-lookback rows or alternate provenance history;
- schema or migration changes;
- route/controller/validation changes;
- frontend/UI changes to satisfy acceptance;
- edits in `market-context-intelligence`, `signal-quality-lab`, or any shared utility.

Specific risk:

- if the current lookup payload on `dev` does not already expose enough selected-row date/source metadata for service-local derivation, this child must stay draft-blocked until Team 00 authorizes a repository-touching split.

## Parallel-Safety With Active Teams

- Safe in parallel with active `CF-W1-SQLAB-02A` because Team 06 reserves only `signal-quality-lab/**`.
- Safe in parallel with active `CF-W1-L3-TREV-02` because Team 07 reserves only `today-trade-review/**`.
- Safe in parallel with active `CF-W1-L3-INTEL-03` because Team 07 reserves only `portfolio-intelligence/**`.

The child is not safe to parallelize with any other future `historical-context-snapshots` writer because the proposed file set is fully shared within that module.

## QA Planning Handoff Notes

Future Team 04 planning should cover:

- exact-date match;
- nearest-prior match inside lookback;
- fallback-inside-lookback wording for lagged evidence;
- missing-within-lookback result;
- metadata-gap sector input;
- omitted optional slices staying `NOT_REQUESTED`;
- backward compatibility of existing `market`, `sector`, `country`, `smartMoney`, `dataQuality`, `dataStatus`, and `gaps`.
