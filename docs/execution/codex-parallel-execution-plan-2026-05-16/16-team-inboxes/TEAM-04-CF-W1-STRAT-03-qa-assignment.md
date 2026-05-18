# TEAM-04 Assignment - CF-W1-STRAT-03 QA Verification

Date: 2026-05-18

Team: Team 04 - QA Factory

Mode: QA verification in dedicated Team 06 worktree.

## Work Item

`CF-W1-STRAT-03` - Strategy Decision review provenance.

## Worktree / Branch

- Branch: `codex/team06-strategy-signal/CF-W1-STRAT-03`
- Worktree: `C:\work\repo\investment-scanner-worktrees\team06-CF-W1-STRAT-03`

## Source Input

- Main QA plan: `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-STRAT-03-qa-plan.md`
- Ready handoff: `docs/execution/codex-parallel-execution-plan-2026-05-16/12-ready-queue/ready-for-implementation.md`
- Worktree developer handoff: `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-STRAT-03-developer-handoff.md`
- Worktree Team 06 outbox: `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-06-CF-W1-STRAT-03-outbox.md`

## Allowed Writes

In the Team 06 STRAT-03 worktree only:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-STRAT-03-qa-verification.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-CF-W1-STRAT-03-qa.md`

## Required Verification

- `FRAMEWORK_BACKED` provenance on persisted framework rows.
- `LEGACY_FALLBACK` and `legacyIncludedByRequest=true` only when `includeLegacy=true` returns non-framework-backed rows.
- default legacy exclusion remains proof-safe.
- `READ_PATH_CREATED` is request-local only for lookup-miss create responses and watchlist/portfolio delegation.
- later history/list reads do not fabricate durable read-path-created provenance.
- `reasonSummary` follows blocker, warning, data gap, reason, risk-plan, fallback precedence.
- no decision math, route/query, persistence-key, schema, repository, frontend, shared-file, package, provider/live/startup/backfill, paid/cloud, broker, or telemetry widening.

## Required Commands

Run memory check before heavy commands, then:

```powershell
cd backend
npm.cmd test -- strategy-decision-engine.service.test.ts --runInBand
npm.cmd run build
```

## Output

Return `ACCEPT` or `REJECT`, with exact evidence, commands run, skipped checks, residual risks, and next gate.
