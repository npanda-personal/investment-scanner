# TEAM-06 Assignment - CF-W1-SIG-02

Date: 2026-05-18

Team: Team 06 - Strategy / Signal / Risk

State: Ready for Implementation after Team 00 sequencing approval

## Assignment

Implement `CF-W1-SIG-02` - Signal Generation canonical trigger evidence compatibility.

This is a stacked implementation on the accepted parked `CF-W1-SIG-TRIGGER-02A` branch. You are not alone in the codebase; do not revert accepted `SIG-TRIGGER-02A` edits and do not work in the shared `dev` worktree.

## Branch / Worktree

- Base branch: `codex/team06-strategy-signal/CF-W1-SIG-TRIGGER-02A`
- Base commit: `788c237`
- New branch: `codex/team06-strategy-signal/CF-W1-SIG-02`
- Worktree: `C:\work\repo\investment-scanner-worktrees\team06-CF-W1-SIG-02`

## Source Evidence

- Requirement: `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-SIG-02-canonical-trigger-evidence-compatibility-requirement.md`
- Architecture review: `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-SIG-02-architecture-review.md`
- Contract: `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-SIG-02-canonical-trigger-evidence-compatibility-contract.md`
- Work packet: `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-SIG-02-work-packet.md`
- QA plan: `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-SIG-02-qa-plan.md`
- Prior stacked dependency acceptance: `CF-W1-SIG-TRIGGER-02A` commit `788c237`

## Allowed Files

You may edit only:

- `backend/src/modules/signal-generation-engine/signal-generation-engine.types.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.repository.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.service.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.md`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.repository.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.service.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.trigger-contract.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-dq-enforcement.invariants.test.ts`

Allowed reporting docs:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-06-CF-W1-SIG-02-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-SIG-02-developer-handoff.md`

## Forbidden Files

Do not edit:

- Prisma schema or migrations
- generated files
- backend or frontend route registries
- `backend/src/modules/signal-generation-engine/index.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.controller.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.router.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.validation.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.module.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.config.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.routes.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.validation.test.ts`
- all frontend files
- Strategy Framework, Strategy Decision, Today Review, Trade Plan, Alerts, Portfolio, Watchlist, Copilot, Market Data, shared backend utility, shared UI, package, provider/live-data, startup/backfill, paid/cloud, broker, telemetry, or credential files

## Required Behavior

- Keep `SignalResultDto.triggerContract` as the single canonical trigger packet.
- Do not add a sibling canonical trigger packet.
- Make current non-legacy rows self-describing with explicit field provenance and packet-origin semantics.
- Surface persisted `created_at` and `updated_at` from current owned Signal Result evidence.
- Surface linked generation-run `status`, `startedAt`, and `completedAt` only when repository-backed run evidence exists.
- Label `trigger_timestamp` semantics as source-price-date, source-data-date, or unavailable.
- Label `latestForInstrument()` fallback-created responses as request-local generation.
- Keep `asset_class`, `region`, `strategy_id`, and `strategy_version` compatibility-only where derived from request-local enrichment or transient strategy matches.
- Keep `trigger_price`, `timeframe`, rule ids, and richer lifecycle state unavailable.
- Preserve strict DQ trusted read/run/latest behavior.
- Preserve research-support language and avoid advice, targets, guarantees, broker, automation, paid/cloud, or provider wording.

## Required Validation

Check memory/resource safety if practical, then run:

```powershell
cd backend
npm.cmd test -- signal-generation-engine.repository.test.ts signal-generation-engine.service.test.ts signal-generation-engine.trigger-contract.test.ts signal-generation-dq-enforcement.invariants.test.ts --runInBand
npm.cmd run build
```

If a command cannot run, record the exact blocker, skipped command, risk, and next owner.

## Stop Conditions

Stop and return to Team 00 if implementation requires any forbidden file, schema/generated/route/shared/package/frontend/provider/startup/live-provider scope, downstream consumer adoption, changing DQ fail-closed behavior, fabricating missing trigger fields, or modifying accepted `SIG-TRIGGER-02A` behavior outside this stacked Signal Generation file reservation.

## Expected Handoff

Update the Team 06 outbox and developer handoff with:

- exact branch/worktree/base commit;
- files changed and inspected;
- behavior changed;
- tests/builds run and results;
- skipped checks and reasons;
- forbidden files confirmed untouched;
- residual risks and blockers;
- whether Team 04 QA can proceed.
