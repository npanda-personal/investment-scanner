# TEAM-03 CF-W1-HCTX-02 Architecture

Date: 2026-05-19

Team: Team 03 - Architecture Factory

Work item: `CF-W1-HCTX-02` Historical Context data-quality coverage scope

Status: Ready candidate

## Files Changed

- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-HCTX-02-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-HCTX-02-historical-context-data-quality-coverage-scope-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-HCTX-02-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-CF-W1-HCTX-02-architecture.md`

## Files Inspected

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

## Exact Evidence

- Current `coverage(...)` logic counts `dataQualitySnapshot` rows globally and does not filter by `region` or `assetType`.
- Current service code returns that raw count directly and does not attach scope provenance.
- Prisma shows `DataQualitySnapshot` has no `stock` relation and no persisted `region` or `assetType`, while `SmartMoneyContextSnapshot` does have a `stock` relation.
- The module doc already admits the limitation, so the immediate gap is contract honesty rather than new discovery.
- The Historical Context frontend does not yet render a data-quality coverage card, so the backend child does not need a same-pass frontend writer.
- Signal Calibration Engine uses Historical Context lookup results rather than the coverage summary, so no calibration source edit is required in the first child.

## Ready-Candidate Result

`CF-W1-HCTX-02` is a `Ready candidate` for one bounded backend-only child.

Reason:

- the first slice can add additive provenance semantics on the existing coverage response;
- the required logic stays inside Historical Context repository/service/type/doc/test ownership;
- no Prisma, route, shared utility, DQE, calibration, or frontend change is required for the first child.

## Scope / Evidence Decision

Decision recorded on 2026-05-19:

- preserve the raw `dataQualitySnapshots` count for backward compatibility;
- add one additive provenance packet with separate scope and evidence classifications;
- allow `scope = GLOBAL_ONLY | SCOPE_PROVEN | UNAVAILABLE`;
- allow `evidence = PRESENT | MISSING | STALE | UNKNOWN`;
- do not fabricate `SCOPE_PROVEN` from current source;
- derive freshness only from Historical Context snapshot dates, not from Data Quality Engine scoring.

## Exact Future File Reservations

- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.types.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.repository.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.service.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.md`
- `backend/tests/modules/historical-context-snapshots/historical-context-snapshots.repository.test.ts`
- `backend/tests/modules/historical-context-snapshots/historical-context-snapshots.service.test.ts`

## Exact Forbidden Files

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- generated files
- backend/frontend route registries
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

## Dependencies

- No upstream schema or route dependency blocks this child.
- Next required doc gate: Team 04 dedicated `CF-W1-HCTX-02` QA plan.
- Any future Historical Context UI coverage card or calibration/review UX adoption must wait until this backend packet is accepted.

Sequencing instruction for Team 00:

1. route `CF-W1-HCTX-02` to Team 04 QA planning now;
2. keep the first child backend-only;
3. open a separate child if user-facing coverage-scope rendering is desired.

## QA Handoff

Team 04 should plan backend QA for:

- preserved raw count compatibility;
- `GLOBAL_ONLY` labeling when rows exist;
- `UNAVAILABLE` plus `MISSING` when rows do not exist;
- `STALE` and `UNKNOWN` evidence-state behavior from module-owned dates;
- non-fabricated `SCOPE_PROVEN` semantics;
- no regression in existing route shape or caller compatibility.

## Tests / Validation In This Docs Pass

- Tests run: none
- Builds run: none
- UI checks run: none
- Live local data checks run: none

Skipped by scope:

- all executable validation, because this was docs-only architecture prep

## Next Gate

Team 04 QA planning, then Team 00 Ready evaluation.
