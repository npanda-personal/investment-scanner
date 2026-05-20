# TEAM-06 Assignment - CF-W1-SIG-02 Request-Local Provenance Rework

Date: 2026-05-19

Team: Team 06 - Strategy / Signal / Risk

Work item: `CF-W1-SIG-02` canonical trigger evidence compatibility

Mode: bounded rework after Team 10 re-review reject

## Worktree / Branch

- Worktree: `C:\work\repo\investment-scanner-worktrees\team06-CF-W1-SIG-02`
- Branch: `codex/team06-strategy-signal/CF-W1-SIG-02`

## Blocking Finding

Team 10 accepted the persisted-read current-row `COMPLETE` behavior but rejected request-local run evidence consistency.

The remaining issue:

- `latestForInstrument()` can inject fallback request-local `generation_run` evidence.
- `withTriggerAuditOverrides()` and `withGenerationRunEvidence()` rewrite `audit.generation_run` and packet origin.
- They do not also update `audit.field_provenance` or `audit.persisted_fields`.
- Result: the same packet can expose run timing/status as present while classifying `generation_run_status`, `generation_run_started_at`, and `generation_run_completed_at` as unavailable.

## Required Fix

When request-local generation-run evidence is injected, keep canonical metadata internally consistent:

- update `audit.field_provenance` for request-local run status/timestamps to the appropriate request-local provenance state;
- update `audit.persisted_fields` so request-local run evidence is not mislabeled as persisted;
- preserve the distinction between repository-backed persisted run evidence and request-local fallback evidence;
- add focused test assertions for request-local `run()` / fallback `latestForInstrument()` paths.

## Allowed Files

- `backend/src/modules/signal-generation-engine/signal-generation-engine.service.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.types.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.md`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.service.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.trigger-contract.test.ts`

Allowed branch-local evidence docs:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-06-CF-W1-SIG-02-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-SIG-02-developer-handoff.md`

## Forbidden Scope

- Prisma schema or migrations
- generated files or generated types
- backend/frontend route registries
- shared backend utilities or shared frontend components
- package manifests
- frontend source/tests
- providers, live provider calls, startup/backfill, broker, paid/cloud, telemetry
- signal math, strategy semantics, DQ scoring ownership, persisted trigger storage
- inherited `TEAM-06-outbox.md` or `CF-W1-SIG-TRIGGER-02A-developer-handoff.md`

## Required Validation

Run memory check before heavy commands.

Then run:

```powershell
cd backend
npm.cmd test -- signal-generation-engine.repository.test.ts signal-generation-engine.service.test.ts signal-generation-engine.trigger-contract.test.ts signal-generation-dq-enforcement.invariants.test.ts --runInBand
npm.cmd run build
```

## Handoff

Return the exact code/test/doc changes and show how request-local run evidence now agrees with field provenance and persisted-field metadata.

Next gate: Team 04 QA re-verification with explicit request-local assertions.
