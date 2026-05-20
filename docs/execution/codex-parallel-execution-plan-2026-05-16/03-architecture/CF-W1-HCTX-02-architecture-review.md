# CF-W1-HCTX-02 Architecture Review

Date: 2026-05-19

Owner: Team 03 Architecture Factory

## Status

Ready candidate for one bounded backend-only `historical-context-snapshots` child.

The first child can stay module-local. It does not need Prisma, migrations, generated files, route registry changes, Data Quality Engine source changes, provider calls, shared utilities, or frontend work.

Do not combine the first child with a Historical Context UI coverage card. That is a separate UX/frontend child after the backend contract lands.

## Evidence Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/16-team-inboxes/TEAM-03-CF-W1-HCTX-02-architecture-assignment.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-HCTX-02-historical-context-data-quality-coverage-scope-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/audit-direct-value-gap-2026-05-19.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-01-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-02-requirement-factory.md`
- `backend/prisma/schema.prisma`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.md`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.repository.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.service.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.types.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.validation.ts`
- `backend/tests/modules/historical-context-snapshots/historical-context-snapshots.repository.test.ts`
- `backend/tests/modules/historical-context-snapshots/historical-context-snapshots.service.test.ts`
- `backend/tests/modules/historical-context-snapshots/historical-context-snapshots.routes.test.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.md`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.service.ts`
- `frontend/src/features/historical-context-snapshots/types.ts`
- `frontend/src/features/historical-context-snapshots/api/historicalContextSnapshotsService.ts`
- `frontend/src/features/historical-context-snapshots/hooks/useHistoricalContextSnapshots.ts`
- `frontend/src/features/historical-context-snapshots/components/HistoricalContextSnapshotsPage.tsx`
- `frontend/tests/ui/historical-context-snapshots.spec.ts`

## Current Source Findings

- `historical-context-snapshots.repository.ts` counts `dataQualitySnapshot` rows with `count()` and no scope filter inside `coverage(...)`.
- `historical-context-snapshots.service.ts` returns that raw number directly and only adds the generic empty-market warning.
- `historical-context-snapshots.types.ts` exposes `dataQualitySnapshots` as a bare integer with no provenance fields.
- `historical-context-snapshots.md` already documents the limitation: data-quality coverage is global until the model gains a stock relation or persisted scope fields.
- Prisma proves why the count cannot be scoped today: `SmartMoneyContextSnapshot` has a `stock` relation, but `DataQualitySnapshot` stores only `instrumentId` and no `stock` relation, `region`, or `assetType`.
- The frontend historical-context page does not render a data-quality coverage card today, so no user-facing coverage-scope behavior depends on the current response shape.
- `signal-calibration-engine` consumes Historical Context lookup data, not the Historical Context coverage summary, so calibration does not require a source edit in the first child.

## Architecture Decision

Keep the existing `/context-snapshots/coverage` endpoint and keep `dataQualitySnapshots` unchanged for backward compatibility.

Add one additive provenance packet on the Historical Context coverage response for data-quality coverage semantics. Do not add a new endpoint and do not move logic into Data Quality Engine.

The first child should expose:

- the preserved raw count;
- explicit scope provenance;
- explicit evidence freshness/availability status;
- one stable reason or warning string that explains why the count is or is not trustworthy for the requested market scope;
- the latest known data-quality snapshot date used for that classification.

## Provenance Model Decision

Use two small additive fields, not one overloaded status:

1. `dataQualityCoverageScope`
   - `GLOBAL_ONLY`
   - `SCOPE_PROVEN`
   - `UNAVAILABLE`
2. `dataQualityCoverageEvidence`
   - `PRESENT`
   - `MISSING`
   - `STALE`
   - `UNKNOWN`

Reasoning:

- scope provenance and freshness are different concerns;
- the current module can classify freshness from its own snapshot dates without duplicating Data Quality Engine scoring;
- future schema work can unlock `SCOPE_PROVEN` without replacing the first-child contract.

## Current Reachable Semantics

The first child must be honest about current source limits:

- `GLOBAL_ONLY` is the normal current state whenever `dataQualitySnapshots > 0`.
- `UNAVAILABLE` is valid when no data-quality coverage evidence exists.
- `SCOPE_PROVEN` is a reserved contract state for future relation or persisted-scope work. The first child must not fabricate it from current source.

Evidence status should be derived only from Historical Context snapshot evidence:

- `MISSING`: raw count is `0`.
- `STALE`: data-quality coverage exists, but its latest snapshot date is older than the latest market-context snapshot date for the same Historical Context module.
- `UNKNOWN`: data-quality coverage exists but the module cannot establish freshness safely, such as missing comparison basis.
- `PRESENT`: data-quality coverage exists and its latest snapshot date is current relative to the latest market-context snapshot date, while still remaining `GLOBAL_ONLY` for scope provenance.

## No-DQE-Duplication Rule

The first child must not import or recreate Data Quality Engine readiness, coverage, liquidity, or signal-eligibility scoring.

Allowed logic:

- count existing Historical Context `DataQualitySnapshot` rows;
- inspect the latest `DataQualitySnapshot.snapshotDate`;
- compare that date to the latest Historical Context market snapshot date;
- explain whether the count is global-only or unavailable for requested scope.

Forbidden logic:

- recalculating Data Quality Engine coverage/readiness statuses;
- inferring region or asset type from unrelated sources without a proven relation;
- claiming the count is instrument-scoped for `IN/STOCK`, `US/STOCK`, or any other requested scope.

## Exact Future File Reservations

Reserve this one-writer implementation set:

- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.types.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.repository.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.service.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.md`
- `backend/tests/modules/historical-context-snapshots/historical-context-snapshots.repository.test.ts`
- `backend/tests/modules/historical-context-snapshots/historical-context-snapshots.service.test.ts`

Why this set is sufficient:

- `types.ts` owns the additive response contract;
- `repository.ts` must fetch latest data-quality snapshot date and preserve the raw count;
- `service.ts` must classify provenance/evidence and attach warning text;
- the module doc must record the new honesty contract;
- repository and service tests already own the relevant coverage behavior.

## Forbidden Files

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- generated files
- `backend/src/api/routes.ts`
- `frontend/src/app/routes.tsx`
- `backend/src/modules/historical-context-snapshots/index.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.controller.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.router.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.validation.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.module.ts`
- `backend/tests/modules/historical-context-snapshots/historical-context-snapshots.routes.test.ts`
- `backend/tests/modules/historical-context-snapshots/historical-context-snapshots.validation.test.ts`
- `backend/src/modules/data-quality-engine/**`
- `backend/src/modules/signal-calibration-engine/**`
- `frontend/src/features/historical-context-snapshots/**`
- `frontend/tests/ui/historical-context-snapshots.spec.ts`
- shared backend utilities
- shared frontend components
- package manifests
- provider/live-data integration files
- scheduler/startup/backfill files
- paid/cloud, broker, or telemetry files

## Dependency And Parallel-Safety Notes

- No upstream schema or route dependency blocks the backend child.
- No current downstream source edit is required in `signal-calibration-engine`; calibration uses lookup data, not the coverage summary response.
- Any future adoption of the new provenance packet in the Historical Context page, research surfaces, or calibration/review UX must wait until this backend contract is accepted.
- Do not run another `historical-context-snapshots` writer against the reserved file set in parallel.

## UI / Downstream Split Decision

The first child stays backend-only.

If Team 00 wants a user-facing coverage card or warning banner, that must be a separate child with its own UX and frontend reservations:

- `frontend/src/features/historical-context-snapshots/types.ts`
- `frontend/src/features/historical-context-snapshots/api/historicalContextSnapshotsService.ts`
- `frontend/src/features/historical-context-snapshots/hooks/useHistoricalContextSnapshots.ts`
- `frontend/src/features/historical-context-snapshots/components/HistoricalContextSnapshotsPage.tsx`
- `frontend/tests/ui/historical-context-snapshots.spec.ts`

That UI child should not be combined into the backend first child unless Team 00 intentionally widens the packet.

## QA Handoff For Team 04

Team 04 should plan focused backend QA for:

- preserved `dataQualitySnapshots` raw count;
- `GLOBAL_ONLY` classification when raw data-quality coverage exists but scoped proof does not;
- `UNAVAILABLE` plus `MISSING` when no data-quality snapshot rows exist;
- `STALE` when latest data-quality snapshot date lags the latest market-context snapshot date;
- `UNKNOWN` when comparison basis is missing;
- reserved `SCOPE_PROVEN` contract semantics staying additive and non-fabricated;
- unchanged route surface and backward-compatible response parsing for existing callers.

Suggested focused command after implementation exists:

```powershell
cd backend
npm.cmd test -- historical-context-snapshots.repository.test.ts historical-context-snapshots.service.test.ts --runInBand
npm.cmd run build
```

## Readiness Result

Ready candidate.

Conditions on that recommendation:

- keep the child backend-only and module-local;
- do not widen into frontend coverage cards, Data Quality Engine logic, Prisma/schema work, or calibration-module edits;
- if implementation cannot classify freshness from module-owned snapshot dates alone, return the child to Team 00 for split/block review rather than inventing scope proof.
