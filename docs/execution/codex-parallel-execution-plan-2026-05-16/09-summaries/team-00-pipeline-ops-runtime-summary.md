# Team 00 Pipeline Ops Runtime Summary

Date: 2026-05-25

## Latest Runtime Update - Pipeline Automation First

User direction: finish pipeline automation before returning to backlog work.

Current implementation state:

- Market Data price backfill now mirrors active and terminal progress into the durable pipeline ledger as `MARKET_DATA`.
- Scheduled Market Data -> scheduled Data Quality remains the first downstream fanout path.
- Scheduled Data Quality now fans out to a ledgered `RAW_SIGNALS` stage only when scheduled DQ completes with `COMPLETED`.
- Scheduled `RAW_SIGNALS` uses explicit changed instrument ids from the upstream scheduler pass and does not run a region-wide signal scan.
- Scheduled `RAW_SIGNALS` now fans out to a ledgered `SIGNAL_CALIBRATION` stage only when Raw Signals completes with `COMPLETED`.
- Scheduled `SIGNAL_CALIBRATION` uses explicit changed instrument ids and latest persisted raw-signal rows only; missing raw rows are counted as skipped evidence.
- Manual Pipeline Ops commands remain unchanged: `DATA_QUALITY_EVALUATE_SCOPE` is still the only executable command; `RAW_SIGNALS_GENERATE_SCOPE` and `SIGNAL_CALIBRATION_REFRESH_SCOPE` remain deferred.

Boundaries preserved:

- No Prisma/schema/migration/generated changes.
- No route registry, controller, router, validation, frontend, package, provider/live, broker, cloud, or telemetry changes.
- No Signal Quality, Strategy Decision, Backtesting, Trade Plan, Research, or Today Review fanout in this slice.
- No target price, R:R, reward/risk, direct advice, or Trade Plan-first language added.

Validation completed:

```powershell
cd backend
npm.cmd test -- pipeline-orchestration.service.test.ts signal-generation-engine.service.test.ts signal-generation-dq-enforcement.invariants.test.ts --runInBand
npm.cmd test -- pipeline-orchestration.service.test.ts signal-calibration-engine.service.test.ts --runInBand
npm.cmd test -- market-data.scheduler.test.ts data-quality-engine.service.test.ts pipeline-orchestration.validation.test.ts pipeline-orchestration.controller.test.ts pipeline-orchestration.routes.test.ts --runInBand
npm.cmd test -- pipeline-orchestration.service.test.ts market-data.scheduler.test.ts market-data.service.test.ts market-data.routes.test.ts data-quality-engine.service.test.ts signal-generation-engine.service.test.ts --runInBand
npm.cmd test -- pipeline-orchestration.service.test.ts market-data.scheduler.test.ts market-data.service.test.ts market-data.routes.test.ts data-quality-engine.service.test.ts signal-generation-engine.service.test.ts signal-calibration-engine.service.test.ts --runInBand
npm.cmd run build
git diff --check
```

Next pipeline automation priority:

1. Finish validation for the scheduled `DATA_QUALITY -> RAW_SIGNALS -> SIGNAL_CALIBRATION` chain and commit the scoped pipeline automation changes.
2. Then continue one stage at a time: context snapshots, market context/sector rotation, signal quality, smart money, strategy decisions, bounded backtest proof, Research projection, Today Review projection.
3. Do not wire Trade Plan/R:R/target-shaped stages; reframe any compatibility path into Trusted Signal Candidate health only.

## Current Direction

The dedicated `/pipeline-ops` page is the Bulk Pipeline Dashboard for Monitoring and OPS.

Individual feature pages should show compact backend pipeline progress/status only, with a link back to `/pipeline-ops` for detailed evidence and approved manual triggers.

## Current Gate State

- `CF-W3-MDPIPE-01B6` is in `Rejected / Rework` after Team 10 review.
- Team 10's rejection is bounded to the Data Quality compact strip state model and UI coverage.
- `NO_RUN_EVIDENCE` must only appear after a successful loaded pipeline snapshot has no `DATA_QUALITY` stage row.
- Initial loading and pipeline-status fetch errors must not render as no-run evidence.
- `CF-W3-MDPIPE-01C` remains active with Team 05 in a disjoint backend-only write scope.

## Active / Ready Teams

- Team 08: ready for `CF-W3-MDPIPE-01B6` bounded rework.
- Team 05: active on `CF-W3-MDPIPE-01C` backend scheduled Data Quality stage.
- Team 04: ready for QA rerun after Team 08 handoff, and for 01C QA after Team 05 handoff.
- Team 10: ready for re-review after Team 04 acceptance.
- Team 03: ready for Architect Signoff after Team 10 acceptance.

## Next Orchestrator Action

Spawn Team 08 for B6 rework while Team 05 continues 01C. Keep file ownership separated:

- Team 08 owns only Data Quality frontend indicator files and B6 evidence docs.
- Team 05 owns only backend Market Data / Pipeline Orchestration / Data Quality scheduled-stage files and 01C evidence docs.
