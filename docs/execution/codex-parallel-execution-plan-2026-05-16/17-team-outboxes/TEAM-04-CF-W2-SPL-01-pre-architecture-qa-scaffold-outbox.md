# TEAM-04 CF-W2-SPL-01 Pre-Architecture QA Scaffold Outbox

Date: 2026-05-26

Team: Team 04 QA Factory

Mode: docs-only QA planning in main workspace

## Assignment

Draft a docs-only QA risk and verification scaffold for the new Product Owner direction around safe research-support active and closed system-triggered signal positions.

Per instruction, no application source, tests, requirements queue docs, schema, route registries, packages, generated files, or non-Team-04 execution docs were edited.

## Files Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W2-SPL-01-signal-position-ledger-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W2-SPL-01A-signal-position-ledger-first-slice-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-SIG-01B-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-QA-01-focused-test-command-matrix.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-CF-W1-TSC-02A-TREV-HEALTH-qa-plan-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-CF-W2-BT-05-qa-plan-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-CF-W2-SIG-01A-qa-plan-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W2-SIG-01A-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W2-TSC-05-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/99-decision-inbox/DECISION-20260517-no-target-exit-invalidation-semantics.md`
- `backend/package.json`
- `frontend/package.json`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.trigger-contract.test.ts`
- `backend/tests/modules/today-trade-review/today-trade-review.service.test.ts`
- `backend/tests/modules/strategy-decision-engine/strategy-decision-engine.service.test.ts`
- `backend/tests/modules/data-quality-engine/data-quality-engine.service.test.ts`
- `backend/tests/modules/data-quality-engine/data-quality-engine.invariants.test.ts`
- `frontend/tests/ui/today-trade-review.spec.ts`
- `frontend/playwright.config.ts`

## Files Changed

- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W2-SPL-01-pre-architecture-qa-scaffold.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-CF-W2-SPL-01-pre-architecture-qa-scaffold-outbox.md`

## Result

QA scaffold prepared.

This is not an implementation-ready QA plan. It is a pre-architecture risk and verification packet for Team 00, Team 02, and Team 03.

## Coverage Added

The scaffold now records future QA expectations for:

- active-row proof rules;
- closed-row proof rules;
- current-return and closed-return data correctness;
- trust/evidence/data-quality visibility;
- wording constraints for research-support language;
- empty, error, and loading states;
- sorting, filtering, and export expectations for a table/grid workflow;
- likely focused backend, frontend, build, and language-scan commands once the source layout is known;
- reject conditions for inferred closes, target-like heuristics, and scope drift.

## Validation

No builds, tests, servers, Playwright runs, Prisma commands, or live-data checks were run.

Validation for this handoff was documentation review plus QA scaffold drafting only.

## Blockers

- Team 03 architecture split is unresolved: read-model-only versus durable ledger/storage-backed first slice.
- Team 02 requirement family is still draft and not Ready.
- Exact module boundary, route shape, and test-file names are not approved yet.
- Export behavior is not yet confirmed as in-scope.
- If the first slice reuses Today Review surfaces, wording verification must wait for the accepted post-`TSC-04A` base rather than current main.

## Next Gate

- Next owner: Team 00 Orchestrator for sequencing
- Required upstream owner: Team 03 Architecture Factory for module-boundary and truth-source decision
- Team 04 follow-up: convert this scaffold into an exact QA plan after architecture and file reservations are settled

## Team 04 Status

Ready for another docs-only QA planning or later executable verification assignment that does not overlap an active writer set.
