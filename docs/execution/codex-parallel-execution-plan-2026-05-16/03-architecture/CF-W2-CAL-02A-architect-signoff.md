# CF-W2-CAL-02A Architect Signoff

Date: 2026-05-25

Owner: Team 03 - Architecture Factory

## Work Item

`CF-W2-CAL-02A` - Signal Calibration scoped evidence-basis projection

## Verdict

`ACCEPT`

## Decision

The implementation honors the `CF-W2-CAL-02` architecture review and the evidence-basis contract without widening scope beyond the reserved Signal Calibration files.

## Files Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W2-CAL-02-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W2-CAL-02-signal-calibration-evidence-basis-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W2-CAL-02A-qa-verification.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/13-implementation-evidence/CF-W2-CAL-02A-code-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-CF-W2-CAL-02A-qa-verification-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-06-CF-W2-CAL-02A-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-10-CF-W2-CAL-02A-code-review-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W2-CAL-02A-developer-handoff.md`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.service.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.types.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.md`
- `backend/tests/modules/signal-calibration-engine/signal-calibration-engine.service.test.ts`
- `frontend/src/features/signal-calibration-engine/hooks/useSignalCalibrationEngine.ts`
- `frontend/src/features/signal-calibration-engine/components/SignalCalibrationEnginePage.tsx`
- `frontend/src/features/signal-calibration-engine/types.ts`
- `frontend/tests/ui/signal-calibration-engine.spec.ts`

## Architecture Checks

### 1. Architecture contract honored

Pass.

- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.types.ts` adds only additive contract fields:
  - `CalibrationEvidenceBasis`
  - `calibrationEvidence.evidenceBasis`
  - optional `PaginatedCalibrationResponse.pageSummary`
  - `CalibrationPageSummary`
- No repository, controller, router, validation, route-registry, schema, package, generated-file, or shared-component widening was introduced.

### 2. Scoped page summary remains additive and bounded

Pass.

- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.service.ts` adds `pageSummary(...)` on the existing `/signals/calibration/top` response path only.
- The page summary is explicitly scoped by the active `region`, `assetType`, and parsed `horizon`.
- `itemsOnPage` and `totalScopedRows` are bounded to the current scoped `top(...)` response rather than any module-global count.
- The frontend summary cards now consume `data.pageSummary` instead of unscoped health or first-row inference.

### 3. Generated-at and evidence-through timing stay separate

Pass.

- Row `generatedAt` remains the calibration row timestamp.
- Evidence-through timing is projected separately as `calibrationEvidence.evidenceBasis.latestMeasurablePriceDate`.
- The UI keeps these concepts distinct with separate `Calibrated At` and `Evidence Through` surfaces.

### 4. Compare/top evidence-basis parity uses the same visible query basis

Pass.

- `compare(...)` and `top(...)` both use the shared `signalQualitySummaryQuery(...)` helper.
- `compare(...)` no longer injects hidden signal `sector` or `country`.
- `top(...)` includes `sector` and `country` only when they are explicit list filters in the visible query.
- This removes hidden compare-time drift while preserving list filter behavior.

### 5. Missing Signal Quality evidence and failed `/top` requests fail closed

Pass.

- Backend fail-closed evidence basis:
  - `calibrationEvidenceBasis(...)` returns `MISSING_SIGNAL_QUALITY_EVIDENCE` when the Signal Quality summary or latest measurable date is absent.
  - `runEvidenceFromSummary(...)` and `pageSummary(...)` preserve missing-evidence behavior instead of inferring readiness from existing rows.
- Frontend fail-closed scoped summary:
  - `useSignalCalibrationEngine.ts` removes the `/signals/calibration/health` dependency.
  - Failed `/top` reloads replace `pageSummary` with `failClosedPageSummary(...)` for the requested `region`, `assetType`, and `horizon`.
  - Stale rows, stale counts, and stale page-level readiness/evidence state do not survive a failed scoped fetch.

### 6. Forbidden scope remained untouched

Pass.

`git diff --name-only` shows application changes only in the reserved Signal Calibration files:

- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.md`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.service.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.types.ts`
- `backend/tests/modules/signal-calibration-engine/signal-calibration-engine.service.test.ts`
- `frontend/src/features/signal-calibration-engine/components/SignalCalibrationEnginePage.tsx`
- `frontend/src/features/signal-calibration-engine/hooks/useSignalCalibrationEngine.ts`
- `frontend/src/features/signal-calibration-engine/types.ts`
- `frontend/tests/ui/signal-calibration-engine.spec.ts`

No edits were detected in:

- Signal Quality / Data Quality / Market Data source ownership
- Prisma schema or migrations
- backend or frontend route registries
- shared UI or shared backend utilities
- packages, generated files, provider/startup/backfill scope

## Evidence Sufficiency

Sufficient for this scoped slice.

- Team 04 QA evidence: backend build pass, frontend build pass, isolated Playwright smoke pass on `127.0.0.1:5174`, focused backend test pass.
- Team 10 code review: `ACCEPT`, with prior reject reasons explicitly closed.
- Team 03 architect rerun:
  - memory check: `61.529586245662`
  - focused backend test: `npm.cmd test -- signal-calibration-engine.service.test.ts --runInBand` -> pass (`27` tests)

The remaining UI evidence dependence on the isolated QA run is acceptable here because the packet already documents the shared `5173` environment noise and preserves a clean, scoped frontend smoke artifact on `5174`.

## Residual Notes

- Default shared Playwright base URL `127.0.0.1:5173` remains locally noisy; trusted UI evidence for this packet is the isolated Team 04 run on `127.0.0.1:5174`.
- Frontend large-chunk build warning remains pre-existing and unrelated to this packet.

## Architect Conclusion

`CF-W2-CAL-02A` stays inside the approved architecture boundary and closes the scoped truth gaps without contract drift:

- truthful scoped page summary
- separate calibration-generation versus evidence-through timing
- compare/list evidence-basis parity for the same visible scope
- fail-closed missing-evidence and failed-fetch behavior
- no forbidden cross-module or shared-surface edits

## Next Gate

Team 00 delegated PO acceptance, then scoped local commit if accepted.
