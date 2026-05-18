# TEAM-04 Assignment - CF-W1-SIG-02 QA Planning

Date: 2026-05-18

Team: Team 04 - QA Factory

State: Docs-only QA planning assignment

## Assignment

Prepare the QA plan for `CF-W1-SIG-02` canonical trigger evidence compatibility.

Do not implement application code. Do not edit tests or source. This is a QA readiness pass only.

## Source Evidence

- Requirement: `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-SIG-02-canonical-trigger-evidence-compatibility-requirement.md`
- Architecture review: `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-SIG-02-architecture-review.md`
- Contract: `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-SIG-02-canonical-trigger-evidence-compatibility-contract.md`
- Work packet: `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-SIG-02-work-packet.md`
- Team 03 outbox: `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-CF-W1-SIG-02-architecture.md`

## Required QA Plan Coverage

Cover these acceptance and regression areas:

- canonical `SignalResultDto.triggerContract` remains the single canonical trigger packet;
- current non-legacy persisted rows can be classified as `COMPLETE` only when provenance and timestamp evidence are explicit;
- legacy or compatibility-only rows remain clearly incomplete and do not overclaim;
- `latestForInstrument()` request-local generation is labeled as request-local, not durable persisted trigger evidence;
- persisted `created_at` and `updated_at` are surfaced when available;
- linked generation-run timing/status is surfaced only when repository-backed evidence exists;
- `asset_class`, `region`, `strategy_id`, and `strategy_version` remain compatibility-only for this child;
- trigger timestamp source-date semantics are explicit;
- unavailable lifecycle, rule-id, trigger-price, and timeframe fields stay unavailable rather than invented;
- strict Data Quality fail-closed behavior from existing Signal Generation coverage remains preserved.

## Sequencing Constraint

`CF-W1-SIG-02` must not be promoted directly on current `dev` without Team 00 sequencing approval.

Implementation must either:

- stack on accepted parked `CF-W1-SIG-TRIGGER-02A` commit `788c237`, or
- reserve and reconcile the same Signal Generation file set in a single pass.

## Allowed Files

You may edit only:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-SIG-02-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/next-validation-plans.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-CF-W1-SIG-02-qa.md`

If needed, you may update:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-qa-factory.md`

## Forbidden Files

Do not edit application source, tests, Prisma/schema/migrations/generated files, route registries, shared utilities, shared UI, package manifests, provider/live/startup/backfill files, frontend files, or historical `docs/codex-agent-team-plan/**`.

## Expected Output

Create the QA plan and outbox. State whether the item is QA-plan ready, and restate that implementation is sequencing-controlled by Team 00.

Next gate: Team 00 Ready evaluation after QA planning.
