# TEAM-04 QA Outbox - CF-W2-DOV-02

Date: 2026-05-26

Team: Team 04 - QA Factory

Mode: Docs-only QA planning in shared workspace

## Work Item

`CF-W2-DOV-02` - Daily Overview calibration evidence-through summary.

## Verdict

`QA-PLAN READY AFTER DEPENDENCY-BASE VERIFICATION`

Team 04 completed docs-only QA planning for the bounded Daily Overview calibration summary child.

This is not Ready for implementation from the current plain `dev` base. Team 00 must first verify that the chosen implementation base already includes:

- accepted `CF-W2-DOV-01` commit `a371e2f`
- accepted `CF-W2-CAL-02A` commit `1be7d1a`

No executable QA was run and no application source was modified.

## Files Changed

- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W2-DOV-02-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-CF-W2-DOV-02-qa-plan-outbox.md`

## Files Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/16-team-inboxes/TEAM-04-current-assignment.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W2-DOV-02-daily-overview-calibration-evidence-through-summary-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W2-DOV-02-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W2-DOV-02-daily-overview-calibration-evidence-summary-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W2-DOV-02-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-CF-W2-DOV-02-architecture-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/13-implementation-evidence/CF-W2-CAL-02A-ready-promotion.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/13-implementation-evidence/CF-W2-DOV-01-ready-promotion.md`
- `frontend/src/features/signal-calibration-engine/types.ts`
- `frontend/src/features/signal-calibration-engine/api/signalCalibrationEngineService.ts`
- `frontend/src/features/signal-calibration-engine/hooks/useSignalCalibrationEngine.ts`
- `frontend/src/features/signal-calibration-engine/components/SignalCalibrationEnginePage.tsx`
- `frontend/tests/ui/signal-calibration-engine.spec.ts`
- repo file search for `frontend/src/features/daily-overview-dashboard/**`
- `git rev-parse --verify a371e2f`
- `git rev-parse --verify 1be7d1a`

## Dependency-Base Checks For Team 00

Team 00 must verify all of the following before promoting any implementation handoff:

1. `git merge-base --is-ancestor a371e2f HEAD`
2. `git merge-base --is-ancestor 1be7d1a HEAD`
3. `frontend/src/features/daily-overview-dashboard/**` already exists on the chosen base
4. the chosen base does not require `frontend/src/app/HomePage.tsx`
5. accepted CAL-02A evidence-basis fields already exist on the calibration consumer path used by DOV:
   - `signalQualityGeneratedAt`
   - `latestMeasurablePriceDate`
   - `nextEvaluableDate`
   - scoped readiness/evidence semantics compatible with the DOV-02 contract

If any dependency-base check fails, Team 00 must reject the base and return the item for dependency correction instead of widening DOV-02.

## Key QA Accept / Reject Focus

Future implementation must prove:

- summary consumes only accepted CAL-02A scoped page-summary truth
- no `/signals/calibration/health` fallback
- no first-row, warning-row, blocker-row, or count proxy logic
- scope and horizon labels remain explicit
- evidence-through basis stays separate from row generation time
- waiting/unavailable states are visible and truthful
- missing accepted CAL-02A evidence fails closed
- panel stays below primary Daily Overview candidate-review content
- no `HomePage.tsx`, backend, route registry, shared UI/hooks, calibration source/test, schema/storage, package/generated, or provider/live/startup/backfill drift
- no advice, target, reward/risk, broker/execution, or Trade Plan-first language

Reject immediately if any of those conditions are violated.

## Recommended Commands

Recommend, but do not run in this planning pass:

```powershell
cd frontend
npm.cmd run build
```

```powershell
cd frontend
npm.cmd run test:ui -- daily-overview-dashboard.spec.ts --workers=1
```

```powershell
rg -n "buy now|sell now|must buy|must sell|target price|price target|profit target|reward/risk|R:R|trade plan|best trade|broker|execute order|place order|guaranteed|financial advice" frontend/src/features/daily-overview-dashboard frontend/tests/ui/daily-overview-dashboard.spec.ts
```

## Tests Run

- none

## Tests Skipped

- `cd frontend; npm.cmd run build`
- `cd frontend; npm.cmd run test:ui -- daily-overview-dashboard.spec.ts --workers=1`
- focused language guard over `frontend/src/features/daily-overview-dashboard` and `frontend/tests/ui/daily-overview-dashboard.spec.ts`

## Skipped-Test Reason

- docs-only QA planning pass; assignment explicitly forbids tests, builds, services, providers, Prisma commands, UI smoke, and live data

## Blockers

- No Team 04 planning blocker remains.
- Executable QA remains blocked until Team 00 verifies a dependency-correct base and promotes one exact bounded frontend-only implementation handoff.
- Current plain `dev` base is insufficient because `frontend/src/features/daily-overview-dashboard/**` is still absent in the shared workspace.

## Next Gate

Team 00 dependency-base verification first.

After that, and only after that, Team 00 may evaluate whether to promote a bounded DOV-02 implementation handoff.
