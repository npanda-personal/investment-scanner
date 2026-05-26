# TEAM-04 CF-W2-SPL-01A QA Plan Outbox

Date: 2026-05-26

Team: Team 04 QA Factory

Mode: docs-only QA planning in main workspace

## Assignment

Align Team 04's Signal Position Ledger QA scaffold to finalized Team 02 requirement docs and produce a `CF-W2-SPL-01A` QA plan if enough information exists, otherwise state the missing gate.

No application source, tests, schema, route registries, package manifests, generated files, requirements queue docs, or non-Team-04 execution docs were edited.

## Files Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W2-SPL-01-signal-position-ledger-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W2-SPL-01A-signal-position-ledger-first-slice-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W2-SPL-01-pre-architecture-qa-scaffold.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W2-SIG-01A-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-SIG-01B-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-QA-01-focused-test-command-matrix.md`
- `backend/package.json`
- `frontend/package.json`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.trigger-contract.test.ts`
- `backend/tests/modules/today-trade-review/today-trade-review.service.test.ts`
- `backend/tests/modules/strategy-decision-engine/strategy-decision-engine.service.test.ts`
- `backend/tests/modules/data-quality-engine/data-quality-engine.service.test.ts`
- `backend/tests/modules/data-quality-engine/data-quality-engine.invariants.test.ts`
- `frontend/tests/ui/today-trade-review.spec.ts`

## Files Changed

- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W2-SPL-01-pre-architecture-qa-scaffold.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W2-SPL-01A-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-CF-W2-SPL-01A-qa-plan-outbox.md`

## Result

Requirement alignment completed.

Team 04 produced a `CF-W2-SPL-01A` QA plan, but it is explicitly blocked and not Ready because the requirement still carries the missing architecture gate.

## Missing Gate

The missing gate is:

- Team 03 architecture review and child-splitting recommendation for `CF-W2-SPL-01A`, including the decision on read-model-only versus durable ledger/storage-first.

Without that gate, Team 04 cannot finalize exact executable QA because the first slice may still split into active-only first, active-plus-closed read model, or durable closed-history storage work.

## QA Coverage Recorded

The blocked QA plan now records:

- requirement-aligned active-row and closed-row acceptance checks;
- current-return and closed-return correctness expectations;
- trust/evidence/data-quality visibility expectations;
- empty, error, loading, sorting, filtering, and export expectations;
- research-support wording guardrails;
- likely focused command families once file reservations are known;
- rejection conditions for inferred closes, target-like heuristics, and scope drift.

## Validation

No builds, tests, servers, Playwright runs, Prisma commands, or live-data checks were run.

Validation for this handoff was documentation review and QA planning only.

## Next Gate

- Next owner: Team 03 Architecture Factory
- Sequencing owner: Team 00 Orchestrator
- Team 04 next action: convert blocked QA plan into exact implementation QA after Team 03 resolves the architecture split and Team 00 records reservations
