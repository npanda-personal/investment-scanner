# TEAM-04 Outbox

Date: 2026-05-24

Team: TEAM-04 - QA Factory

State: Docs-only QA planning completed for `CF-W1-TSC-01A`

## Assignment

Create a focused QA plan for `CF-W1-TSC-01A` using Team 03's split architecture:

- Child 1: Team 06 Signal Generation strategy-aware `latestForInstrument` bridge.
- Child 2: Team 07 Today Review Trusted Signal Candidate adoption after the bridge is accepted.

## Files Changed

- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-TSC-01A-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-outbox.md`

## Files Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-TSC-01A-today-review-trusted-signal-candidate-adoption-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-TSC-01A-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-TSC-01A-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-TSC-01-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-qa-factory.md`

## Result

- Added `04-qa/CF-W1-TSC-01A-qa-plan.md`.
- Covered Team 06 bridge assertions for backward compatibility, strategy-aware source-proven trigger evidence, fail-closed downgrade cases, and no route/schema/provider/target/R:R drift.
- Covered Team 07 adoption assertions for Today Review strategy-context passing, JSON snapshot evidence projection, Trusted Signal Candidate grouping, blocked/missing evidence visibility, table regression behavior, and product-language safety.
- Recorded exact focused commands:
  - Team 06: `npm.cmd test -- signal-generation-engine.service.test.ts signal-generation-engine.trigger-contract.test.ts --runInBand`; `npm.cmd run build`
  - Team 07: `npm.cmd test -- today-trade-review.service.test.ts --runInBand`; backend build; frontend build; `npm.cmd run test:ui -- today-trade-review.spec.ts --workers=1`
- Recorded advisory product-language scans for forbidden `R:R`, target, synthetic reward, advice-like, and Trade Plan-primary wording.

## QA Readiness Verdict

- `CF-W1-TSC-01A-SIG`: QA-plan ready for Team 00 Ready evaluation as the first executable child.
- `CF-W1-TSC-01A-TREV`: QA-plan prepared but not Ready for implementation until the Team 06 bridge is accepted and Team 00 confirms the implementation base and exact file reservations.

## Blockers

- Executable QA remains blocked until implementation handoffs exist.
- Team 07 source implementation must not start until the Team 06 bridge is accepted.
- Any need for Prisma/schema, route registry, controllers/routers/validation, repositories, shared utilities/UI, package manifests, generated files, provider/live/startup/backfill, broad UI/navigation, Trade Plan source, or durable trigger persistence returns the work to Team 00 / Architect.

## Tests Run

None.

This was a docs-only QA planning pass. No builds, tests, UI smoke, browser checks, local servers, providers, Prisma commands, staging, commits, or pushes were run.

## Next Gate

- Team 00: evaluate `CF-W1-TSC-01A-SIG` for Ready promotion with Team 06 reservations only.
- Team 06: implement the bounded Signal Generation bridge only after Team 00 promotion.
- Team 04: execute the Team 06 focused QA commands after a developer handoff exists.
- Team 00: hold `CF-W1-TSC-01A-TREV` until the Team 06 bridge is accepted.

## Teams Ready To Pick Up New Tasks

- Team 00 can promote `CF-W1-TSC-01A-SIG` if no file conflicts or dirty-state blockers remain.
- Team 06 can pick up `CF-W1-TSC-01A-SIG` after Team 00 promotion.
- Team 03 can keep rolling architecture prep on the next high-value candidate while Team 06 works.
- Team 02 can continue PO/requirements refinement on `CF-W1-DQ-03` or the next investor-value item while implementation proceeds.
