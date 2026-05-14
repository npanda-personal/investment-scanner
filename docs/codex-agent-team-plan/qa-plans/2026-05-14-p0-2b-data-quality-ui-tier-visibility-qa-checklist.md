# P0.2B QA Checklist - Data Quality UI Tier Visibility

Date: 2026-05-14
Mode: QA Verification Planning Mode
Owner: QA Shadow (P0.2B)
Status: **Blocked** (implementation handoff + runtime evidence pending)

## Scope

- Packet: `P0.2B - Data Quality UI Tier Visibility`
- UI target scope:
  - `frontend/src/features/data-quality-engine/types.ts`
  - `frontend/src/features/data-quality-engine/api/dataQualityEngineService.ts`
  - `frontend/src/features/data-quality-engine/components/DataQualityEnginePage.tsx`
  - `frontend/tests/ui/data-quality-engine.spec.ts`
- Validation principle: no heavy provider/backfill jobs; one scoped IN/STOCK smoke pass only.

## QA Verification Checklist

1. Verify the page renders **all five use-case tiers** (`dailyReview`, `signal`, `backtest`, `calibration`, `automation`) when available in `useCaseTiers`, and degrades safely when absent.
   - Pass if the page shows any provided tier labels/states distinctly by use case or hides optional fields without layout failure.
   - Fail if only a single readiness score is displayed as the source of truth.

2. Verify **blocker-first display ordering and clarity** for blockers/blocked tiers.
   - Pass if blocked workflows are surfaced before READY items in the expanded diagnostics row/card and each blocker has explicit code/reason text.
   - Fail if blockers are visually buried, not deterministic in order, or only implied.

3. Verify **automation remains policy-blocked** and copy does not imply broker/ execution readiness.
   - Pass if automation renders as blocked and includes the policy reason (`PHASE0_AUTOMATION_NOT_AUTHORIZED` or equivalent approved text), and never renders "ready", "authorized", or execution-ready cues.
   - Fail if automation appears eligible due to score thresholds or if tooltips/copy can be interpreted as execution-capable.

4. Verify the **generic score section is not treated as universal readiness**.
   - Pass if readiness columns/tabs and diagnostics distinguish tiered workflow state from score chips/badges and avoid deriving `backtest/calibration/automation/signal` readiness from score text alone.
   - Fail if any workflow is inferred as ready solely because coverage/signal/liquidity score is numerically high.

5. Verify **legacy payload compatibility**: old responses without `useCaseTiers` / `tierEvidence` must not crash or hide base functionality.
   - Pass if the page still renders summary + table + row diagnostics from current legacy fields (`coverageStatus`, `signalReadinessStatus`, `liquidityStatus`, `eligibleForSignals`, etc.).
   - Pass if missing tier objects are handled as optional and fallback UX is clear.
   - Fail if the page errors, shows empty states incorrectly, or makes optional new fields mandatory.

6. Verify **focused build and UI smoke only**.
   - No unbounded evaluate runs.
   - No long provider sync jobs.
   - No broad historical reprocessing jobs.

## Expected Runtime Evidence Pattern (Post-Handoff)

### Frontend build/test (focused)

- `cd frontend`
- `npm.cmd run build`
- `npm.cmd run test:ui -- data-quality-engine.spec.ts --workers=1 --project=chromium --reporter=list`

### Bound API smoke (scoped to IN/STOCK and read-only)

- Ensure backend/frontend are already up and owned by Orchestrator-managed slot before running.
- Replace `127.0.0.1:3000` with local backend bind if different.

1. `Invoke-RestMethod 'http://127.0.0.1:3000/api/v1/data-quality/summary?region=IN&assetType=STOCK'`
2. `Invoke-RestMethod 'http://127.0.0.1:3000/api/v1/data-quality/instruments?region=IN&assetType=STOCK&limit=25&offset=0'`
3. `Invoke-RestMethod 'http://127.0.0.1:3000/api/v1/data-quality/instruments/<IN_SCOPE_INSTRUMENT_ID>'`
4. `Invoke-RestMethod 'http://127.0.0.1:3000/api/v1/market-data/review-readiness-summary?region=IN&assetType=STOCK'`

Capture responses where `useCaseTiers` is present and where it is absent (legacy-compatible mode) and confirm identical page stability.

## Rejection Triggers

- Missing or collapsed workflow tier rendering in the UI (less than 5 required use-case lanes rendered/represented).
- Blocker rendering that does not appear before READY states or lacks clear reason text.
- Automation shown with anything other than explicit policy-blocked state in UI copy or chip state.
- Any UI path where generic score fields are used as universal "go/no-go" gates.
- Runtime crash or empty diagnostics when tier fields are omitted from API responses.
- Any smoke command triggers full-universe processing or long-running background jobs.

## Blockers and Dependencies

- Blocked until P0.2B frontend implementation handoff arrives with updated page/service/types and runtime snapshots.
- Blocked until Orchestrator provides a stable IN/STOCK backend baseline and sample instrument IDs.
- Blocked until runtime orchestration slot is available for one focused QA smoke pass.
