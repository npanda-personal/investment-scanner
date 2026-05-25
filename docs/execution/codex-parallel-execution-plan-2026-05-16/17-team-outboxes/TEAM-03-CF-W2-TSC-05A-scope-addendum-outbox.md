# TEAM-03 Outbox - CF-W2-TSC-05A Scope Addendum

Date: 2026-05-25

## Work Item

`CF-W2-TSC-05A-TREV-RANKING-ELIGIBILITY-REFRAME`

## State / Mode

Docs-only architecture/process addendum completed.

## Owner

Team 03 - Architecture Factory

## Lane / Module

- Lane: Lane 3
- Module: `today-trade-review`

## Exact Files Changed

- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W2-TSC-05A-repository-scope-addendum.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-CF-W2-TSC-05A-scope-addendum-outbox.md`

## Exact Files Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/13-implementation-evidence/CF-W2-TSC-05A-ready-promotion.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W2-TSC-05-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W2-TSC-05-today-review-no-target-ranking-eligibility-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W2-TSC-05-work-packet.md`
- `C:\work\repo\investment-scanner-worktrees\team07-CF-W2-TSC-05A\docs\execution\codex-parallel-execution-plan-2026-05-16\04-qa\CF-W2-TSC-05A-qa-reverification.md`
- `backend/src/modules/today-trade-review/today-trade-review.repository.ts`
- `backend/src/modules/today-trade-review/today-trade-review.controller.ts`
- `backend/src/modules/today-trade-review/today-trade-review.types.ts`
- `backend/src/modules/today-trade-review/today-trade-review.service.ts`
- `backend/tests/modules/today-trade-review/today-trade-review.service.test.ts`
- `backend/tests/modules/today-trade-review/today-trade-review.controller.test.ts`

## Behavior Changed

No application behavior changed.

Architecture/process verdict added:

- repository inclusion is required to enforce already-approved no-target/no-trade-plan semantics on persisted Today Review reads;
- this is a routine module-local scope correction, not a Product Owner blocker;
- Team 00 can route bounded Team 07 rework if the reservation is expanded only to the Today Review repository and one focused repository-read test file.

## Docs Changed

- new architecture addendum capturing verdict, amended allowed/forbidden scope, QA expectations, and Team 00 routing guidance
- this Team 03 outbox handoff

## Contracts Changed

No contract file edited in this pass.

Architectural interpretation clarified:

- prior `CF-W2-TSC-05A` reservation was too narrow for persisted read-path enforcement;
- repository fallback semantics are part of the same Today Review module contract surface and must be covered by the child reservation.

## Tests Run

None. Docs-only architecture pass.

## Tests Skipped

- backend tests
- frontend build
- UI smoke

Reason: no application code changes were made in this Team 03 scope-addendum pass.

## Assumptions

- Team 04 rejection evidence is authoritative for the persisted read-path failure described.
- Repository fallback correction can be completed without route/schema/shared/upstream changes.
- A focused repository-hydration test file is the smallest credible validation addition.

## Risks

- if repository correction exposes a need to rename shared Today Review response fields beyond the reserved module surface, Team 00 must stop and return the item for a new architecture split
- if Team 07 rework updates only repository code without persisted-read coverage, Team 04 is likely to reject again

## Blockers

No new Product Owner blocker.

Active implementation blocker remains:

- current Team 07 reservation is insufficient because it excludes `backend/src/modules/today-trade-review/today-trade-review.repository.ts`

## Shared-File Requests

Requested bounded reservation amendment for the next Team 07 pass:

- add `backend/src/modules/today-trade-review/today-trade-review.repository.ts`
- add `backend/tests/modules/today-trade-review/today-trade-review.repository.test.ts`

Keep all controller/router/schema/shared/package/upstream files forbidden.

## Next Gate

Team 00 scope correction and bounded Team 07 rework routing, followed by Team 04 re-verification.

## Evidence Notes

Primary read-path evidence:

- repository persisted DTO hydration still rebuilds explainability
- fallback reason classification still maps trade/reward/stop wording to `TRADE_PLAN_PROOF_CHAIN`
- fallback ranking breakdown still emits `rankingComponents.tradePlan`
- controller read endpoints delegate through the service to that repository hydration path

Reference addendum:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W2-TSC-05A-repository-scope-addendum.md`
