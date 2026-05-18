# CF-W1-HCTX-01 Architecture Review

Date: 2026-05-18

Owner: Team 03 Architecture Factory

## Status

Backend-only Historical Context explainability packet prepared. Not Ready for Implementation.

This packet is intentionally module-local for the first slice. It adds additive lookup provenance and gap explanation without opening Prisma, route, provider, shared utility, package, generated, or frontend scope.

## Evidence Inspected

- `AGENTS.md`
- `10-requirements/CF-W1-HCTX-01-historical-context-explainability-requirement.md`
- `10-requirements/requirements-backlog.md`
- `10-requirements/next-top-10-candidates.md`
- `10-requirements/top-10-ready-candidates.md`
- `17-team-outboxes/TEAM-02-requirement-factory-2026-05-17.md`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.md`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.types.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.service.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.repository.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.controller.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.validation.ts`
- `backend/tests/modules/historical-context-snapshots/historical-context-snapshots.service.test.ts`
- `backend/tests/modules/historical-context-snapshots/historical-context-snapshots.routes.test.ts`
- `backend/tests/modules/historical-context-snapshots/historical-context-snapshots.repository.test.ts`
- `frontend/src/features/historical-context-snapshots/components/HistoricalContextSnapshotsPage.tsx`
- `frontend/src/features/historical-context-snapshots/types.ts`
- `frontend/src/features/historical-context-snapshots/api/historicalContextSnapshotsService.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.md`

## Current Source Findings

- `historical-context-snapshots.lookup(...)` already returns nearest persisted context on or before the requested date within the requested lookback window.
- The lookup response already includes raw snapshot objects with `snapshotDate`, but the contract only exposes coarse `dataStatus` plus `gaps[]`; it does not provide an explicit selected-date provenance story.
- The service can derive selected-date lag, exact-date versus nearest-prior selection, and per-component missing status from existing snapshot payloads without repository, controller, router, or schema changes.
- Sector metadata-gap handling already exists and is surfaced through `gaps[]`, so the first explainability packet can upgrade that into stable provenance semantics rather than inventing new persistence behavior.
- The current frontend lookup card renders only `dataStatus`, a regime chip, raw component labels, and a single gaps string. It does not force selected-date lag, persisted-versus-missing evidence, or partial lookup semantics, but that UI follow-up is not required for the first bounded backend packet.

## Module Boundary Review

`historical-context-snapshots` owns this requirement.

Reasons:

- lookup selection and nearest-snapshot provenance are defined inside this module;
- this module already owns metadata-gap treatment for sector lookup;
- downstream modules such as Signal Calibration and Signal Quality consume snapshot evidence and should not duplicate explanation logic.

Upstream modules remain evidence producers only:

- `market-context-intelligence`
- `smart-money-intelligence`
- `market-data-foundation`

The first slice does not require frontend approval. A later consumer-only UX pass may use the additive fields, but that is separate work.

## Architecture Decision

Prepare `CF-W1-HCTX-01` as a bounded `historical-context-snapshots` slice that adds additive lookup explainability metadata on top of the current lookup response.

The first implementation should introduce stable additive metadata equivalent to:

```ts
type SnapshotLookupReasonCode =
  | 'PERSISTED_EXACT_DATE'
  | 'PERSISTED_NEAREST_PRIOR_DATE'
  | 'MISSING_WITHIN_LOOKBACK'
  | 'METADATA_GAP_INPUT'
  | 'NOT_REQUESTED';

interface SnapshotLookupSelectionEvidence {
  requested: boolean;
  requestedDate: string;
  lookbackDays: number;
  selectedSnapshotDate: string | null;
  lagDays: number | null;
  reasonCode: SnapshotLookupReasonCode;
  reason: string;
}

interface SnapshotLookupExplainability {
  requestedDate: string;
  lookbackDays: number;
  market: SnapshotLookupSelectionEvidence;
  sector: SnapshotLookupSelectionEvidence;
  country: SnapshotLookupSelectionEvidence;
  smartMoney: SnapshotLookupSelectionEvidence;
  dataQuality: SnapshotLookupSelectionEvidence;
  selectedNearestSnapshotDate: string | null;
  maxLagDays: number | null;
  partial: boolean;
  summary: string;
}
```

The exact type names may differ, but the semantics must stay stable.

Recommended first-pass mapping:

- `PERSISTED_EXACT_DATE`: matching snapshot exists on the requested date.
- `PERSISTED_NEAREST_PRIOR_DATE`: lookup selected a persisted snapshot before the requested date within lookback.
- `MISSING_WITHIN_LOOKBACK`: requested component has no persisted snapshot inside lookback.
- `METADATA_GAP_INPUT`: the request asked for a metadata-gap sector such as `Unknown`, so ranked sector evidence is intentionally unavailable.
- `NOT_REQUESTED`: optional component was not part of the lookup request.

## Exact Future File Reservations

- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.service.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.types.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.md`
- `backend/tests/modules/historical-context-snapshots/historical-context-snapshots.service.test.ts`
- optional only if endpoint-level additive response assertions are added: `backend/tests/modules/historical-context-snapshots/historical-context-snapshots.routes.test.ts`

## Forbidden Files

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.repository.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.controller.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.router.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.validation.ts`
- Market Context Intelligence source or exports
- Smart Money Intelligence source or exports
- Market Data Foundation source or exports
- Signal Calibration source
- Signal Quality Lab source
- backend and frontend route registries
- shared backend utilities
- shared frontend components
- package manifests
- generated files
- frontend source/tests
- provider/live-market, paid/cloud, broker, or telemetry flows

## Dependency And Conflict Notes

- No Prisma, route, provider, shared DTO, generated-type, package, or frontend blocker is required for the first bounded slice.
- This packet depends on persisted snapshot rows already carrying `snapshotDate` and current lookup behavior returning those rows intact.
- The first slice must remain backend-only. If a later packet wants the Historical Context frontend page to render the new explainability fields, that is a separate consumer/UI follow-up and should not be folded into this writer pass.
- This packet conflicts with any active Lane 1 work reserving `historical-context-snapshots.service.ts`, `historical-context-snapshots.types.ts`, or the same service test file.

## Required QA Scenarios

Focused backend QA should prove:

- complete exact-date lookup with zero lag;
- nearest-prior lookup within lookback with explicit lag explanation;
- partial lookup with missing sector, smart-money, or data-quality evidence and stable reason codes;
- metadata-gap sector lookup returns provenance explaining that ranked sector evidence is intentionally unavailable;
- missing market snapshot inside lookback produces a missing provenance result rather than silently looking complete;
- backward-compatible existing lookup fields remain present while the new explainability metadata is additive.

## Readiness Result

Architecture packet prepared. Not Ready for Implementation.

The slice is bounded and module-local, but Team 04 QA planning and Team 00 sequencing are still required.
