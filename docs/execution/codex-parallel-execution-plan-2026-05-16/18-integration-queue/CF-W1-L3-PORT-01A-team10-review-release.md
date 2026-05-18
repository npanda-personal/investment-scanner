# CF-W1-L3-PORT-01A - Team 10 Review / Release Gate

Date: 2026-05-18

Reviewer: TEAM-10 - Review / Release

Reviewed branch: `codex/team07-portfolio-alerts/CF-W1-L3-PORT-01A`

Reviewed worktree: `../investment-scanner-worktrees/team07-CF-W1-L3-PORT-01A`

## Decision

Rejected for release acceptance pending Team 07 revision.

## Release-Blocking Finding

`backend/src/modules/portfolio-management/portfolio-management.service.ts:213` to `:216` treats any `evaluation.readinessBlockers` entry as a portfolio display hard block.

Current Data Quality output can contain blockers that are not portfolio display blockers. In particular, `backend/src/modules/data-quality-engine/data-quality-engine.service.ts:501` always keeps automation blocked for phase 0, and `:513` includes `automation` when tier reasons are folded into readiness blockers.

Data Quality tests define daily-review and signal as allowed to be `READY` while automation is `BLOCKED`:

- `backend/tests/modules/data-quality-engine/data-quality-engine.service.test.ts:72` to `:78`
- `backend/tests/modules/data-quality-engine/data-quality-engine.invariants.test.ts:99` to `:103`

The current portfolio mapper can therefore mark otherwise READY portfolio display evidence as `BLOCKED`, which violates the `CF-W1-L3-PORT-01A` contract.

## Required Revision

- Do not use the full `readinessBlockers` array as a portfolio display hard-block predicate.
- Keep display blocking tied to portfolio-relevant hard blockers: `coverageStatus = UNUSABLE`, `signalReadinessStatus = NOT_READY`, daily-review tier `BLOCKED`, and known stale/unsupported/scope-mismatch blockers.
- Keep action readiness tied to signal tier `READY` and `eligibleForSignals = true`.
- Add a portfolio service test with DQE-like READY daily-review/signal tiers plus `AUTOMATION_BLOCKED: PHASE0_AUTOMATION_NOT_AUTHORIZED`, proving portfolio display/action readiness is not blocked solely by automation.

## Scope Review

Allowed app files touched:

- `backend/src/modules/portfolio-management/portfolio-management.service.ts`
- `backend/src/modules/portfolio-management/portfolio-management.types.ts`
- `backend/src/modules/portfolio-management/portfolio-management.md`
- `backend/tests/modules/portfolio-management/portfolio-management.service.test.ts`

Forbidden source files were not touched in the Team 07 implementation diff reviewed by Team 10.

## Validation Run

Memory check: 77.04% used.

Command:

```powershell
npm.cmd test -- portfolio-management.service.test.ts --runInBand
```

Result: pass, 1 suite, 7 tests.

The green focused suite is not sufficient for acceptance because it does not model Data Quality's automation-blocked READY tier output.

Team 04 also recorded a focused QA pass for the same handoff. That QA result is superseded for release acceptance by this Team 10 code-review rejection.

## Next Gate

Team 07 revises within the existing file reservation. Team 04 reruns focused QA after revision, then Team 10 performs release re-review.
