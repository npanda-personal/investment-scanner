# CF-W2-DOV-02 Architecture Review

Date: 2026-05-26

Owner: Team 03 - Architecture Factory

Mode: docs-only architecture readiness. No application source, tests, routes, Prisma/schema, generated files, package manifests, shared UI, providers, live/startup/backfill files, or historical signoff docs were modified.

## Status

`SPLIT REQUIRED`

This is not a consent blocker. The smallest honest `CF-W2-DOV-02` child is still a bounded additive Daily Overview frontend slice. The split is dependency gating: the current shared base being inspected does not contain the accepted `CF-W2-DOV-01` dashboard feature files or the accepted `CF-W2-CAL-02A` calibration evidence-basis DTO additions that this child must consume.

If Team 00 selects an implementation base that already contains accepted `CF-W2-DOV-01` and accepted `CF-W2-CAL-02A`, this child becomes a `Ready candidate after QA` without schema, route, shared UI, package, generated, provider/live, startup/backfill, or broader cross-module source edits.

## Verdict

The smallest honest child is:

- one feature-local `Calibration Evidence-Through Summary` section inside the accepted `daily-overview-dashboard` frontend feature;
- rendered below the primary Daily Overview candidate-review sections;
- driven only by calibration-owned scoped page-summary outputs from accepted `CF-W2-CAL-02A`;
- with no row proxy, no module-health fallback, and no recomputation inside Daily Overview.

Do not open implementation from the current inspected base. Open it only on a base that already includes:

- accepted `CF-W2-DOV-01` Daily Overview frontend shell; and
- accepted `CF-W2-CAL-02A` calibration evidence-basis fields on the existing calibration read path.

## Evidence Inspected

Docs:

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/16-team-inboxes/TEAM-03-current-assignment.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W2-DOV-02-daily-overview-calibration-evidence-through-summary-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W2-DOV-01-daily-overview-interactive-market-dashboard-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W2-DOV-01-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W2-DOV-01-daily-overview-dashboard-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W2-DOV-01-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W2-CAL-02-signal-calibration-evidence-basis-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/13-implementation-evidence/CF-W2-CAL-02A-ready-promotion.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/00-control/active-work-board.md`

Missing expected implementation evidence file:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/13-implementation-evidence/CF-W2-CAL-02A-implementation-evidence.md` was not present on the inspected base.

Read-only source:

- `frontend/src/app/HomePage.tsx`
- `frontend/src/features/signal-calibration-engine/types.ts`
- `frontend/src/features/signal-calibration-engine/api/signalCalibrationEngineService.ts`
- `frontend/src/features/signal-calibration-engine/hooks/useSignalCalibrationEngine.ts`
- `frontend/src/features/signal-calibration-engine/components/SignalCalibrationEnginePage.tsx`
- `frontend/tests/ui/signal-calibration-engine.spec.ts`
- search results across `frontend/src`, `backend/src`, and execution docs for:
  - `daily-overview-dashboard`
  - `Calibration Evidence-Through Summary`
  - `latestMeasurablePriceDate`
  - `nextEvaluableDate`
  - `fetchCalibrationHealth`
  - `horizonAvailability`

## Current Source Reality

- `frontend/src/app/HomePage.tsx` is still the old launch-card page on the inspected base.
- `frontend/src/features/daily-overview-dashboard/**` does not exist on the inspected base even though execution docs record accepted `CF-W2-DOV-01` in a separate implementation branch.
- The current `signal-calibration-engine` frontend still loads unscoped module health through `fetchCalibrationHealth()` and still derives page cards from visible rows.
- The current inspected `frontend/src/features/signal-calibration-engine/types.ts` does not yet expose the accepted `CF-W2-CAL-02A` evidence-basis fields such as:
  - `signalQualityGeneratedAt`
  - `latestMeasurablePriceDate`
  - `nextEvaluableDate`
  - scoped page-summary object
- The current inspected UI test for calibration still mocks `/signals/calibration/health` and does not assert accepted `CF-W2-CAL-02A` page-summary truth.

Conclusion:

- DOV-02 cannot honestly ship from the currently inspected shared base.
- DOV-02 does not need a new consent gate.
- DOV-02 needs a dependency-correct implementation base.

## Smallest Honest Child

### Ownership

`CF-W2-DOV-02` remains a Daily Overview presentation child.

It must not reopen:

- Signal Calibration computation;
- Signal Quality evidence logic;
- dashboard shell routing; or
- shared UI.

### Section placement

The summary belongs:

- below `High-Priority Review Candidates`; and
- below `Watch And Blocked`;
- above or adjacent to lower-support sections such as caveats/supporting navigation only if the accepted DOV-01 layout makes that placement cleaner.

It must not move into the first viewport anchor position ahead of candidate-review content.

### Source contract

Daily Overview may consume only calibration-owned scoped summary truth from accepted `CF-W2-CAL-02A`.

Allowed read basis:

- the existing calibration read endpoint already widened by accepted `CF-W2-CAL-02A`;
- scoped by `region`, `assetType`, and one DOV-owned `horizon`;
- using the page summary, not individual row truth and not module health.

Forbidden source shortcuts:

- `signals/calibration/health`
- `items[0]`
- first warning row
- first blocker row
- visible-row counts as substitute for evidence-through truth
- Research Hub, Today Review, or DQ fallbacks pretending to be calibration evidence basis

### Minimal UX/behavior

The section should show only:

- section title `Calibration Evidence-Through Summary`
- active scope label: `region / assetType`
- active horizon label
- one status chip derived from calibration-owned semantics only:
  - `Usable`
  - `Limited`
  - `Unavailable`
  - `Waiting`
- latest measurable evidence date when present
- `Waiting for maturity` wording when the selected horizon is horizon-limited and `nextEvaluableDate` exists
- concise calibration-owned reason summary
- drillthrough link to `/signals/calibration`

The section should not show:

- per-symbol rows
- a synthetic score
- percentages invented by Daily Overview
- target/reward/risk framing
- Trade Plan-first framing
- module-health copy

### Horizon choice

To keep the child bounded, use one feature-local horizon input for this section only.

Recommended rule:

- default to the calibration module default horizon when the accepted response exposes it through the chosen read path;
- otherwise default to `20D`;
- keep the horizon selector local to the summary section, not dashboard-global.

This avoids reopening broader dashboard filtering while still making the displayed horizon truthful and user-visible.

## Architecture Recommendation

`split required`

Reason:

- there is no evidence that the current inspected shared base already contains the accepted DOV-01 feature shell and accepted CAL-02A consumer fields;
- without those prerequisites, opening implementation would either widen scope into DOV-01 shell creation or silently re-invent CAL-02A truth.

This is not a consent blocker because the bounded child itself stays:

- frontend-only;
- feature-local to Daily Overview; and
- additive to an accepted calibration-owned public contract.

## Exact Future File Reservation

Open this child only on a base that already contains accepted `CF-W2-DOV-01` and accepted `CF-W2-CAL-02A`.

Allowed writer set for the bounded child:

- `frontend/src/features/daily-overview-dashboard/types.ts`
- `frontend/src/features/daily-overview-dashboard/api/dailyOverviewDashboardApi.ts`
- `frontend/src/features/daily-overview-dashboard/hooks/useDailyOverviewDashboard.ts`
- `frontend/src/features/daily-overview-dashboard/components/DailyOverviewDashboardPage.tsx`
- `frontend/src/features/daily-overview-dashboard/components/CalibrationEvidenceSummaryPanel.tsx`
- `frontend/tests/ui/daily-overview-dashboard.spec.ts`

Optional only if the accepted DOV-01 implementation parked the current placeholder in a feature-local reusable placeholder file:

- `frontend/src/features/daily-overview-dashboard/components/ComingSoonPanel.tsx`

Forbidden writer scope:

- `frontend/src/app/HomePage.tsx`
- `frontend/src/app/routes.tsx`
- `frontend/src/app/navigationMetadata.tsx`
- `frontend/src/shared/**`
- `frontend/src/contexts/**`
- all `frontend/src/features/signal-calibration-engine/**`
- all `frontend/tests/ui/signal-calibration-engine.spec.ts`
- all `backend/src/**`
- all `backend/tests/**`
- Prisma/schema/migrations/generated files
- package manifests and lockfiles
- provider/live/startup/backfill/scheduler/worker/queue files
- route registries
- root `AGENTS.md`
- `docs/AGENTS.md`
- `docs/codex-agent-team-plan/**`

If the accepted DOV-01 implementation is not yet present on the chosen base and implementation would need `HomePage.tsx` or initial feature creation, stop and route that as DOV-01 base integration first, not DOV-02.

## QA Handoff Notes

Team 04 should verify:

- scope label uses current `region / assetType`
- horizon label is explicit and matches the request sent to calibration
- evidence-through date is sourced from calibration-owned evidence-basis metadata, not row `generatedAt`
- `Waiting` appears only for horizon-limited evidence with truthful maturity wording
- `Unavailable` appears when calibration-owned evidence basis is missing and does not degrade to a fake usable state
- the section does not use first-row proxy logic anywhere
- the section does not use `signals/calibration/health` as fallback truth
- drillthrough routes to the calibration page without promising synced dashboard-to-module state beyond current scope/horizon labels
- if accepted CAL-02A fields are absent on the chosen base, the UI stays explicit about the missing dependency or remains placeholder-only
- placeholder truthfulness remains intact for any still-unavailable calibration summary on bases missing the accepted dependency

Required future validation once Team 00 promotes implementation:

```text
cd frontend
npm.cmd run build
npm.cmd run test:ui -- daily-overview-dashboard.spec.ts --workers=1
```

Recommended UI smoke assertions:

- summary renders below primary candidate-review content
- no target/reward/risk/Trade Plan-first wording
- no counts or status inferred from hidden/first calibration rows
- no module-health fallback when scoped calibration summary fetch fails
- domain-specific waiting/unavailable state copy is visible

## Stop Conditions

Stop and return to Team 00 if honest implementation requires:

- schema/storage changes
- backend route or route-registry widening
- shared UI or shared hook edits
- signal-calibration-engine source/test edits
- package or generated-file changes
- provider/live/startup/backfill behavior
- `HomePage.tsx` or broader DOV-01 shell construction on a base that does not already contain the accepted parent

Any of those means this is no longer the bounded additive child prepared here.

## Risks And Assumptions

Risks:

- execution docs record accepted DOV-01 and CAL-02A commits, but the currently inspected base does not contain their source changes;
- a future implementer could be tempted to backfill the gap with calibration health or row-proxy logic;
- a dashboard-local horizon default can drift if not labeled clearly.

Assumptions:

- Team 00 can choose an implementation base that already includes accepted `a371e2f` and `1be7d1a`;
- accepted `CF-W2-CAL-02A` exposes a scoped page summary on the existing calibration read path, as recorded in its contract and ready-promotion packet;
- the accepted DOV-01 layout already contains a placeholder location below primary review content.

## Next Gate

1. Team 04 QA planning for the bounded DOV-02 child.
2. Team 00 dependency-base check:
   - accepted `CF-W2-DOV-01` present on chosen base
   - accepted `CF-W2-CAL-02A` present on chosen base
3. Only then can Team 00 promote this child for frontend implementation.
