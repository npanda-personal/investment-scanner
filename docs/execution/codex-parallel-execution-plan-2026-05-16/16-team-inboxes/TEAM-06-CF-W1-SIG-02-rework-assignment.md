# TEAM-06 Assignment - CF-W1-SIG-02 Rework

Date: 2026-05-19

Team: Team 06 - Strategy / Signal / Risk

Work item: `CF-W1-SIG-02` canonical trigger evidence compatibility

Mode: bounded rework after Team 10 rejection

## Worktree / Branch

- Worktree: `C:\work\repo\investment-scanner-worktrees\team06-CF-W1-SIG-02`
- Branch: `codex/team06-strategy-signal/CF-W1-SIG-02`
- Base dependency: accepted parked `CF-W1-SIG-TRIGGER-02A` commit `788c237`

## Read First

- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-SIG-02-code-review-rejection.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-SIG-02-developer-handoff.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-SIG-02-qa-verification.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-SIG-02-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-SIG-02-canonical-trigger-evidence-compatibility-contract.md`

If the SIG-02 worktree lacks main execution docs, read them from `C:\work\repo\investment-scanner`.

## Required Fixes

1. Current non-legacy rows must not become `CONTRACT_INCOMPLETE` only because intentionally unavailable compatibility fields are unavailable.

   Keep target price, timeframe, rule IDs, lifecycle, and other unsupported fields explicit as unavailable/deferred, but classify current rows with supported canonical evidence as contract-compatible under the approved SIG-02 compatibility rules.

2. Expand `triggerContract` provenance metadata so the packet is self-describing for currently supported fields.

   At minimum, classify provenance for supported signal id, instrument id, symbol, reason summary, passed conditions, failed conditions, data quality status, and persisted run/timestamp evidence where present. Do not invent evidence that current source cannot prove.

## Allowed Source/Test Files

- `backend/src/modules/signal-generation-engine/signal-generation-engine.service.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.types.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.md`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.service.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.trigger-contract.test.ts`

## Allowed Evidence Docs In Worktree

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-06-CF-W1-SIG-02-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-SIG-02-developer-handoff.md`

## Forbidden Scope

- Prisma schema or migrations
- generated files or generated types
- backend or frontend route registries
- shared backend utilities or shared frontend components
- package manifests
- frontend source or UI tests
- providers, live provider calls, startup/backfill, broker, paid/cloud, or telemetry scope
- changing signal math, strategy semantics, DQ scoring ownership, or persisted trigger storage
- editing inherited `TEAM-06-outbox.md` or `CF-W1-SIG-TRIGGER-02A-developer-handoff.md`; these may show line-ending-only dirt and must stay out of the SIG-02 commit

## Required Validation

Run memory check before heavy commands.

Then run:

```powershell
cd backend
npm.cmd test -- signal-generation-engine.repository.test.ts signal-generation-engine.service.test.ts signal-generation-engine.trigger-contract.test.ts signal-generation-dq-enforcement.invariants.test.ts --runInBand
npm.cmd run build
```

## Handoff

Return a developer handoff with:

- exact files changed;
- what fixed Team 10 finding 1;
- what fixed Team 10 finding 2;
- tests/build run and results;
- skipped checks and reasons;
- risks and deferred fields;
- confirmation no forbidden files were touched.

Next gate after Team 06 handoff: Team 04 QA re-verification.
