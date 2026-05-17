# TEAM-03 Assignment - Post-Decision Child Contracts

Date: 2026-05-17

State: Queued

Team: Team 03 - Architecture Factory

Prompt: `docs/execution/codex-parallel-execution-plan-2026-05-16/15-automation-prompts/AUTO-03-architecture-factory.md`

## Assignment

Convert the resolved Decision Inbox policies into child architecture artifacts without touching application code.

## Input Sources

- `07-decisions/DECISION-20260517-lane3-readiness-consumer-policy-resolution.md`
- `07-decisions/DECISION-20260517-trade-plan-no-target-dq-hard-block-resolution.md`
- `07-decisions/DECISION-20260517-market-data-durable-readiness-storage-adr-resolution.md`
- `06-contracts/CF-W1-L3-DQ-01-lane3-readiness-consumer-policy-contract.md`
- `06-contracts/CF-W1-TP-01A-trade-plan-no-target-dq-hard-block-contract.md`
- `06-contracts/CF-W1-MD-02-durable-readiness-evidence-contract.md`
- `04-qa/CF-W1-L3-DQ-01-qa-plan.md`
- `04-qa/CF-W1-TP-01A-qa-plan.md`
- `04-qa/CF-W1-MD-02-qa-plan.md`
- `12-ready-queue/ready-for-implementation.md`

## Allowed Files

Active execution docs only:

- `03-architecture/**`
- `06-contracts/**`
- `08-work-packets/**`
- `16-team-inboxes/**`
- `17-team-outboxes/**`

## Forbidden Files

- application source or tests
- Prisma schema or migrations
- route registries
- shared backend utilities
- shared UI
- package manifests
- generated files
- provider, live-provider, startup, backfill, repair, Angel One, broker, paid/cloud, or UI implementation files
- root `AGENTS.md`
- `docs/AGENTS.md`
- historical `docs/codex-agent-team-plan/**`

## Expected Output

Team 03 should produce an outbox update stating:

- whether `CF-W1-L3-DQ-01` can be split into a first child implementation packet,
- whether `CF-W1-TP-01A` can be split into a backend-only implementation packet,
- whether `CF-W1-MD-02` has enough information for a formal ADR draft,
- exact proposed file reservations for any child item,
- whether any new true consent blocker appeared.

Do not move any item to Ready for Implementation. Team 00 owns Ready queue promotion.

