# CF-W2-CAL-02 Signal Calibration Evidence Basis Contract

Date: 2026-05-25

Owner: Team 03 Architecture Factory

## Status

Ready candidate after QA.

## Contract Intent

Expose truthful scoped evidence basis for Signal Calibration without adding schema/storage and without widening route registries or shared files.

This first child must solve two concrete truth gaps:

- a calibration row currently exposes when it was generated, but not what measurable evidence date it is based on;
- the calibration page currently infers page-level readiness from the first row and from unscoped module health.

## Allowed Implementation Boundary

Backend:

- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.service.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.types.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.md`
- `backend/tests/modules/signal-calibration-engine/signal-calibration-engine.service.test.ts`

Frontend:

- `frontend/src/features/signal-calibration-engine/types.ts`
- `frontend/src/features/signal-calibration-engine/api/signalCalibrationEngineService.ts`
- `frontend/src/features/signal-calibration-engine/hooks/useSignalCalibrationEngine.ts`
- `frontend/src/features/signal-calibration-engine/components/SignalCalibrationEnginePage.tsx`
- `frontend/tests/ui/signal-calibration-engine.spec.ts`

Optional only if the implementation adds explicit controller payload assertions:

- `backend/tests/modules/signal-calibration-engine/signal-calibration-engine.routes.test.ts`

## Forbidden Implementation Boundary

- calibration repository/controller/router/validation/module/index files
- backend/frontend route registries
- all `signal-quality-lab` source/tests
- all `data-quality-engine` source/tests
- all other module source/tests
- Prisma schema and migrations
- generated files
- package manifests
- shared backend utilities
- shared frontend components
- feature route files and app route files
- provider/live/scheduler/worker/queue/startup/backfill files

If the implementation cannot stay inside this boundary, stop and escalate.

## Required Additive Contract

### 1. Row-level evidence basis

Every calibration row returned through the existing list/compare paths must keep existing fields and add evidence-basis metadata sourced from current Signal Quality summary outputs.

Minimum required shape:

```ts
interface CalibrationEvidenceBasis {
  status: 'MEASURED' | 'HORIZON_LIMITED' | 'MISSING_SIGNAL_QUALITY_EVIDENCE';
  signalQualityGeneratedAt: string | null;
  latestMeasurablePriceDate: string | null;
  nextEvaluableDate: string | null;
  reasonSummary: string;
}
```

Required semantics:

- `generatedAt` on the calibration row remains row generation time only.
- `latestMeasurablePriceDate` is the evidence-through date for the selected horizon.
- `nextEvaluableDate` is present when the selected horizon still lacks mature future price rows.
- `signalQualityGeneratedAt` reflects when the upstream Signal Quality scoped summary was produced.

The evidence-basis object should live inside `calibrationEvidence` unless implementation proves another additive nesting is clearer.

### 2. Scoped page summary

`PaginatedCalibrationResponse` must add one scoped page-summary object so the calibration page can stop using:

- unscoped `/signals/calibration/health`; and
- `items[0]` readiness/influence/warning fallback.

Minimum required shape:

```ts
interface CalibrationPageSummary {
  scope: {
    region: string;
    assetType: string;
    horizon: string;
  };
  itemsOnPage: number;
  totalScopedRows: number;
  calibrationEvidence: CalibrationEvidence;
  calibrationReadiness: CalibrationReadiness;
}
```

Required semantics:

- `scope` reflects the active `region`, `assetType`, and `horizon` used for the response.
- `calibrationEvidence` carries the same evidence-basis metadata used for rows.
- `calibrationReadiness` is derived from the decorated rows already returned in the current page response, not from the first row.
- `itemsOnPage` and `totalScopedRows` let the frontend label the summary honestly.

## Required Data Sources

Use only existing Signal Quality public outputs already available on current `dev`:

- `generatedAt`
- `evaluationDiagnostics.latestAvailablePriceDate`
- `evaluationDiagnostics.nextEvaluableDate`
- `horizonAvailability`

Do not duplicate Signal Quality forward-outcome logic inside calibration.

## Health Surface Rule

For the first child, module health remains module-level compatibility health.

The scoped calibration page must use the new `PaginatedCalibrationResponse` page summary as the truthful scoped aggregate surface.

The frontend must not treat `/signals/calibration/health` as the active market-scope summary in this child.

## Compare Surface Rule

`compare(...)` already accepts `region`, `assetType`, and `horizon`.

It must reuse the same row-level evidence-basis fields so compare and list tell the same freshness story for the selected scope/horizon.

## Mixed-Row Rule

The page summary must remain truthful when the visible rows contain mixed readiness states.

Specifically:

- no `items[0]` proxy for readiness;
- no `items[0]` proxy for influence;
- no first-warning or first-blocker proxy for page-level banners.

The page may still show row-specific statuses inside the table. The new page summary exists to stop false page-level aggregation.

## Test Contract

Required focused test coverage later:

- row evidence basis with measurable evidence
- row evidence basis with horizon-limited evidence
- row evidence basis when Signal Quality summary is missing
- scoped page summary uses current response rows, not first row
- compare response reuses the same evidence-basis fields
- Playwright smoke confirms the page no longer depends on unscoped health or first-row readiness

## Controller / Route Test Decision

Controller/route tests are optional only.

Rationale:

- current first child uses the existing `/top` response path;
- current controller/router/validation files need not change;
- the contract risk sits in service projection and feature-local rendering.

## Escalation Rule

Escalate to Team 00 and do not keep Ready reservations if implementation proves it needs:

- repository changes for scope counts beyond current `top(...)` capabilities;
- controller/router/validation widening;
- schema/storage or generated types;
- shared UI or route-registry changes.
