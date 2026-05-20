# Team 04 CF-W1-CAL-01A QA Outbox

Date: 2026-05-19

## Work Item

`CF-W1-CAL-01A` Signal Calibration DQ readiness gate.

## State / Mode

Completed - docs-only QA planning.

## Verdict

QA-READY / READY-FOR-TEAM00-EVALUATION

QA readiness is accepted for Team 00 evaluation as one bounded backend-only `signal-calibration-engine` trust-state child. This is acceptance of the QA plan only, not executable QA evidence.

## Owner / Lane / Module

- Owner: Team 04 QA Factory
- Lane: Lane 2
- Module: `signal-calibration-engine`

## Files Changed

- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-CAL-01A-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-CF-W1-CAL-01A-qa-plan.md`

## Files Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-CAL-01A-signal-calibration-dq-readiness-gate-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-CAL-01A-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-CAL-01A-signal-calibration-dq-readiness-gate-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-CAL-01A-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-CF-W1-CAL-01A-architecture.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-CAL-01-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-CF-W1-HCTX-02-qa-plan.md`

## Scenarios Recorded

- `TRUSTED` outcome with clean latest DQ and sufficient selected-horizon evidence
- `LIMITED` outcome for low-sample evidence
- `LIMITED` outcome for non-blocking context gaps
- `DIAGNOSTIC_ONLY` outcome when latest DQ evaluation is missing
- `UNAVAILABLE` outcome when zero selected-horizon evidence exists
- mandatory `dqGateState` assertions for:
  - `PASS` with present clean DQ
  - `MISSING` with absent latest DQ evaluation
  - `BLOCKED` with explicit DQ blockers
- `UNAVAILABLE` outcome for each explicit DQ blocker:
  - `eligibleForCalibration = false`
  - `eligibleForSignals = false`
  - `NOT_READY`
  - `UNUSABLE`
  - `ILLIQUID`
- Preservation of current score math, current compatibility fields, and parked parent fields from `fd3d464` including `trustState`, `trustReasonCode`, and `trustReason`
- Sequencing requirement on parked parent `CF-W1-CAL-01` commit `fd3d464` or one Team 00-authorized combined calibration pass
- Reject-on-scope-drift for Prisma, routes, shared files, frontend, package/generated files, provider/live/startup/backfill scope, and sibling slices `CF-W1-TP-01A`, `CF-W1-TP-02`, and `CF-W1-L3-DQ-01`

## Focused Commands

Run only after Team 00 promotes the bounded child and an implementation handoff exists:

```powershell
cd backend
npm.cmd test -- signal-calibration-engine.service.test.ts --runInBand
```

```powershell
cd backend
npm.cmd run build
```

## Tests Run

None.

## Tests Skipped

- All executable checks were skipped because this assignment was docs-only QA planning and did not authorize tests, builds, services, Prisma commands, provider/live-data validation, or UI checks.

## Blockers

- Executable QA remains blocked until Team 00 promotes the exact calibration service/types/doc/test writer set.
- Executable QA remains blocked until Team 00 confirms sequencing on parked parent commit `fd3d464` or explicitly authorizes one combined calibration pass from current `dev`.
- Any widening into Prisma, routes, shared files, frontend, package/generated files, provider/live/startup/backfill scope, or sibling slices `CF-W1-TP-01A`, `CF-W1-TP-02`, or `CF-W1-L3-DQ-01` is an immediate reject condition.
- Any score-math rewrite or compatibility-field drift is an immediate reject condition.

## Ready-Promotion Recommendation

Recommend Team 00 promote `CF-W1-CAL-01A` only as a backend-only, service-local implementation packet after confirming one of these sequencing paths:

- preferred: stack on accepted parked `CF-W1-CAL-01` commit `fd3d464`;
- fallback: explicitly authorize one combined calibration replay from current `dev` that carries both parent trust-state fields and child `dqGateState` semantics in the same reserved writer set.

Do not promote if the implementation packet requests forbidden files, broader API changes, source edits in upstream/sibling modules, frontend work, provider/live/startup scope, package/generated changes, or any score-math rewrite.

## Next Gate

Team 00 Ready evaluation and sequencing for the bounded backend-only `signal-calibration-engine` child.

## Evidence Notes

Primary QA planning evidence is recorded in `04-qa/CF-W1-CAL-01A-qa-plan.md`.
