# CF-W2-DOV-02 Daily Overview Calibration Evidence Summary Contract

Date: 2026-05-26

Owner: Team 03 - Architecture Factory

## Status

`SPLIT REQUIRED`

The child itself is bounded and additive. The split is dependency/base selection, not a schema or route consent gate.

## Contract Intent

Replace the Daily Overview calibration placeholder with one truthful compact summary that reuses accepted calibration-owned evidence-basis truth.

Daily Overview is a consumer only. It must not:

- recompute calibration evidence;
- reinterpret calibration health as scoped truth; or
- introduce a dashboard-specific confidence formula.

## Dependency Contract

This child may open only on a base that already contains:

- accepted `CF-W2-DOV-01` Daily Overview frontend feature; and
- accepted `CF-W2-CAL-02A` calibration evidence-basis projection.

If either dependency is missing on the chosen base:

- keep the placeholder truthful; or
- stop and return the packet to Team 00 for dependency-base correction.

## Allowed Implementation Boundary

- `frontend/src/features/daily-overview-dashboard/types.ts`
- `frontend/src/features/daily-overview-dashboard/api/dailyOverviewDashboardApi.ts`
- `frontend/src/features/daily-overview-dashboard/hooks/useDailyOverviewDashboard.ts`
- `frontend/src/features/daily-overview-dashboard/components/DailyOverviewDashboardPage.tsx`
- `frontend/src/features/daily-overview-dashboard/components/CalibrationEvidenceSummaryPanel.tsx`
- `frontend/tests/ui/daily-overview-dashboard.spec.ts`

Optional only if the accepted DOV-01 implementation used a reusable local placeholder component for the current calibration placeholder:

- `frontend/src/features/daily-overview-dashboard/components/ComingSoonPanel.tsx`

## Forbidden Implementation Boundary

- `frontend/src/app/HomePage.tsx`
- all `frontend/src/features/signal-calibration-engine/**`
- `frontend/src/app/routes.tsx`
- `frontend/src/app/navigationMetadata.tsx`
- all `frontend/src/shared/**`
- all `frontend/src/contexts/**`
- all `backend/src/**`
- all `backend/tests/**`
- Prisma/schema/migrations/generated files
- package manifests and lockfiles
- provider/live/startup/backfill/scheduler/worker/queue files
- route registries

If implementation needs anything outside the allowed boundary, stop and escalate.

## Required Consumer Input

Daily Overview must consume the accepted calibration-owned scoped page summary only.

Minimum DOV consumer shape:

```ts
interface DailyOverviewCalibrationSummaryInput {
  scope: {
    region: string;
    assetType: string;
    horizon: string;
  };
  calibrationReadiness: {
    status: 'USABLE' | 'LIMITED' | 'UNAVAILABLE';
    downstreamInfluence: 'NORMAL' | 'LIMITED' | 'NONE';
    reasons: string[];
    blockers: string[];
  };
  calibrationEvidence: {
    status: 'MEASURED' | 'HORIZON_LIMITED' | 'MISSING_SIGNAL_QUALITY_EVIDENCE';
    signalQualityGeneratedAt: string | null;
    latestMeasurablePriceDate: string | null;
    nextEvaluableDate: string | null;
    reasonSummary: string;
  };
}
```

The names above should mirror the accepted `CF-W2-CAL-02A` public contract where possible. DOV may project a feature-local type alias, but it must not rename semantics or invent substitute fields.

## Required Daily Overview Output

The section must render:

- title: `Calibration Evidence-Through Summary`
- scope label
- horizon label
- one presentation state:
  - `Usable`
  - `Limited`
  - `Unavailable`
  - `Waiting`
- latest measurable evidence date when present
- explicit waiting wording when maturity is pending
- one concise reason summary from calibration-owned fields
- drillthrough link to `/signals/calibration`

## Presentation-State Mapping Rule

Daily Overview may map calibration-owned semantics into one compact display state only by these rules:

1. If `calibrationEvidence.status === 'MISSING_SIGNAL_QUALITY_EVIDENCE'`, show `Unavailable`.
2. If `calibrationEvidence.status === 'HORIZON_LIMITED'` and `nextEvaluableDate` is present, show `Waiting`.
3. Else if `calibrationReadiness.status === 'UNAVAILABLE'`, show `Unavailable`.
4. Else if `calibrationReadiness.status === 'LIMITED'`, show `Limited`.
5. Else show `Usable`.

This is a UI label mapping only. It does not create new calibration truth.

## Required Wording Rules

Prefer:

- `calibration evidence`
- `evidence-through`
- `horizon basis`
- `waiting for maturity`
- `limited evidence`
- `unavailable`
- `consider detail in Signal Calibration`

Avoid:

- target
- price target
- reward/risk
- `R:R`
- `trade plan`
- `best setup`
- `strong buy`
- `sell now`
- module health

## Required Horizon Rule

The child needs one DOV-local horizon selection only for this section.

Rules:

- keep the selector local to the summary section;
- default to the calibration default horizon when available on the chosen base;
- otherwise default to `20D`;
- always show the active horizon label in the rendered summary.

Do not add a new dashboard-wide shared horizon system in this child.

## Required Placement Rule

The section must remain below primary Daily Overview candidate-review content.

It must not:

- replace Market Pulse;
- replace candidate lanes; or
- move evidence/support content back into first-viewport operations-console identity.

## Required Error And Dependency Rule

If the calibration summary read fails:

- show a section-local unavailable state;
- keep the rest of Daily Overview usable;
- do not fall back to `signals/calibration/health`;
- do not fall back to visible calibration rows;
- do not fall back to another module's health or readiness text.

If the chosen base lacks accepted CAL-02A fields:

- keep the section explicit about the missing dependency; or
- keep the accepted DOV-01 placeholder state.

## Test Contract

Required future test coverage:

- scope label matches request scope
- horizon label matches request horizon
- measured evidence shows `latestMeasurablePriceDate`, not row `generatedAt`
- horizon-limited evidence shows `Waiting` and `nextEvaluableDate`
- missing Signal Quality evidence shows `Unavailable`
- no first-row proxy behavior
- no module-health fallback behavior
- section remains below primary candidate-review content
- no target/reward/risk/Trade Plan-first wording

## Escalation Rule

Escalate to Team 00 and do not widen this child if implementation proves it needs:

- `HomePage.tsx` or broader DOV-01 shell work on a base missing the accepted parent;
- calibration feature source edits;
- backend aggregation or route changes;
- shared UI or shared hook changes;
- schema/storage or generated types;
- package changes.
