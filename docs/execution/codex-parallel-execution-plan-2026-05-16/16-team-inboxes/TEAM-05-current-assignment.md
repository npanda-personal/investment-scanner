# TEAM-05 Current Assignment

Date: 2026-05-18

Team: TEAM-05 - Market Data / Data Quality

Prompt file: `docs/execution/codex-parallel-execution-plan-2026-05-16/15-automation-prompts/AUTO-05-market-data-data-quality.md`

## Assignment

Pull `CF-W1-MD-01` as a narrowed, backend-only Market Data validator implementation slice.

Branch/worktree:

- Branch: `codex/team05-market-data/CF-W1-MD-01`
- Worktree: `../investment-scanner-worktrees/team05-CF-W1-MD-01`

Ready evidence:

- Requirement: `10-requirements/CF-W1-MD-01-market-data-validation-hardening-policy-requirement.md`
- Narrowed architecture contract: `06-contracts/CF-W1-MD-01-market-data-validation-hardening-contract.md`
- Work packet: `08-work-packets/CF-W1-MD-01-work-packet.md`
- QA plan: `04-qa/CF-W1-MD-01-qa-plan.md`
- Team 05 readiness inspection: `17-team-outboxes/TEAM-05-outbox.md`

Required implementation behavior:

- reject future-dated candles using validator-local, backward-compatible boundary behavior;
- reject invalid present `adjustedClose` values;
- keep negative volume invalid;
- preserve duplicate-row determinism;
- keep spike rejection opt-in and off by default;
- update module docs to record the narrowed validator-only behavior.

Explicitly deferred:

- missing `adjustedClose` fallback/incomplete evidence;
- zero/suspicious-volume warning/readiness evidence;
- repository/provider/startup plumbing for a formal latest-session boundary;
- durable readiness storage or `CF-W1-MD-02` natural-key work.

## Scope

Allowed writes:

- `backend/src/modules/market-data-foundation/market-data-foundation.validation.ts`
- `backend/tests/modules/market-data-foundation/market-data.validation.test.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-05-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-MD-01-developer-handoff.md`

Forbidden:

- Market Data repository, provider, adapter, Angel One provider, service, scheduler, worker, queue, router, controller, and types files
- Market Data readiness/storage invariant tests
- Data Quality Engine source or tests
- Prisma schema or migrations
- generated types
- providers, live providers, Angel One, startup/backfill, repair/sync jobs
- route registries, shared utilities, packages, frontend/UI

## Branch / Worktree

Use the dedicated branch/worktree above. Do not work in the shared `dev` workspace.

## Blockers

No Product Owner decision blocker remains for this narrowed child. Stop and return to Team 00 if implementation needs any forbidden file, repository/provider plumbing, warning/evidence semantics, schema, route, shared utility, package, generated, provider/live, startup/backfill, frontend, or DQE changes.

## Expected Outbox

Update `17-team-outboxes/TEAM-05-outbox.md` and create `18-integration-queue/CF-W1-MD-01-developer-handoff.md`.

Required validation target:

```powershell
cd backend
npm.cmd test -- market-data.validation.test.ts --runInBand
npm.cmd run build
```
