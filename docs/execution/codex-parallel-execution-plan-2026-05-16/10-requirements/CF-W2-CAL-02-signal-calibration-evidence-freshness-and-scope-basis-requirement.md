# CF-W2-CAL-02 - Signal Calibration Evidence Freshness And Scope Basis Requirement

Date: 2026-05-25

## Status

Parent requirement remains active in the delivery pipeline through bounded child `CF-W2-CAL-02A`, which is currently active with Team 06. The parent is not a fresh unassigned packet and is not Ready for independent implementation routing.

## Product Value

Signal Calibration currently tells the user whether calibration is usable, limited, or unavailable, but it does not clearly show what measured evidence window and latest measurable date those judgments came from for the selected scope and horizon. That creates a direct trust gap: a calibrated score can look current even when the supporting Signal Quality evidence may be older, horizon-limited, or only partially measurable for the active market.

The next slice should make the evidence basis explicit so a user can answer:

- what scope this calibration evidence applies to;
- which horizon the evidence is using;
- what latest measurable price/evaluation date the evidence reaches;
- whether the page-level health story is a real scoped aggregate or only a row-level proxy.

## Evidence

- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.types.ts` exposes sample counts, evidence status, readiness, and generated-at fields, but no explicit evidence-through date, Signal Quality summary timestamp, or scoped aggregate basis for calibration outputs.
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.service.ts` derives calibration evidence from `SignalQualityLabService.summary(...)`, but the returned calibration DTOs and health response do not carry the summary's measurable latest-price date or a scoped evidence-as-of marker.
- `backend/src/modules/signal-quality-lab/signal-quality-lab.types.ts` already exposes the upstream ingredients calibration needs for truthful freshness framing, including `generatedAt`, `evaluationDiagnostics.latestAvailablePriceDate`, `evaluationDiagnostics.nextEvaluableDate`, and per-horizon availability.
- `frontend/src/features/signal-calibration-engine/hooks/useSignalCalibrationEngine.ts` loads `/signals/calibration/health` without `region`, `assetType`, or `horizon`, so the page-level health path is not scoped to the active market.
- `frontend/src/features/signal-calibration-engine/components/SignalCalibrationEnginePage.tsx` fills page-level readiness/influence summary cards from the first table row when no scoped aggregate exists, which is not a trustworthy page-level proxy when the table contains mixed evidence states.

## Dependencies

- Keep accepted `CF-W1-CAL-01A` excluded. This requirement is a fresh follow-on about evidence basis visibility, not another DQ gate rewrite.
- Reuse Signal Quality Lab public outputs; do not duplicate outcome maturity logic inside calibration.
- Stay separate from Team 07 Today Review work and Team 05 `CF-W1-DQ-02-RS1` rework.

## Bounded Requirement

Define a scoped calibration evidence-basis contract so calibration list, compare, and health surfaces can truthfully describe the freshness and scope of their supporting measured evidence.

The first child slice should focus on:

- additive scoped calibration evidence metadata for the active `region`, `assetType`, and selected `horizon`;
- an explicit evidence-as-of basis using existing Signal Quality timing outputs such as summary generation time, latest measurable price date, and next evaluable date where relevant;
- a truthful page-level/scoped aggregate readiness summary so the frontend does not need to infer page health from the first row;
- consistent wording that distinguishes calibration timestamp from evidence-through timestamp;
- no new calibration model, no new scoring math, no schema/migration work, and no duplicate Signal Quality computation engine.

## Acceptance Criteria

- Calibration health or equivalent scoped summary is truthful for the selected scope and does not rely on an unscoped global read when the user is viewing a scoped market.
- Calibration outputs can show both when the calibration row was produced and what latest measurable evidence date the selected horizon currently reaches.
- If evidence is horizon-limited or still waiting for future price maturity, calibration explains that with explicit scope/horizon basis instead of implying current proof.
- The frontend can render page-level readiness/influence/evidence-basis summary without using a first-row proxy.
- Existing calibration score math and accepted DQ readiness semantics remain intact.
- Focused tests later cover at least: current measurable evidence, horizon-maturity-limited evidence, missing Signal Quality evidence, and mixed-row page states inside one scope.

## Non-Goals

- No schema, Prisma, migration, route-registry, or package-manifest work.
- No new calibration model or confidence algorithm.
- No duplication of Signal Quality forward-outcome logic inside calibration.
- No Today Review, Pipeline Ops, or shared UI rewrite in this requirement.

## Next Gate

Bounded child `CF-W2-CAL-02A` is already the active execution slice. No duplicate architecture or implementation packet should be opened from this parent until Team 06, Team 04, Team 10, and Team 03 clear the current child through the normal gates.
