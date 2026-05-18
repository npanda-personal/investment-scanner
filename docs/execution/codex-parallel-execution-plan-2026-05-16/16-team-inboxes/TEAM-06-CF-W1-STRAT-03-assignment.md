# TEAM-06 Assignment - CF-W1-STRAT-03

Date: 2026-05-18

Team: Team 06 - Strategy / Signal / Risk

Mode: bounded backend-only implementation in dedicated worktree.

## Work Item

`CF-W1-STRAT-03` - Strategy Decision review provenance.

## Branch / Worktree

- Branch: `codex/team06-strategy-signal/CF-W1-STRAT-03`
- Worktree: `C:\work\repo\investment-scanner-worktrees\team06-CF-W1-STRAT-03`

## Gate Evidence

- Requirement: `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-STRAT-03-strategy-decision-review-provenance-requirement.md`
- Architecture review: `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-STRAT-03-architecture-review.md`
- Contract: `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-STRAT-03-strategy-decision-review-provenance-contract.md`
- Work packet: `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-STRAT-03-work-packet.md`
- QA plan: `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-STRAT-03-qa-plan.md`
- Ready handoff: `docs/execution/codex-parallel-execution-plan-2026-05-16/12-ready-queue/ready-for-implementation.md`

## Allowed Files

- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.service.ts`
- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.types.ts`
- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.md`
- `backend/tests/modules/strategy-decision-engine/strategy-decision-engine.service.test.ts`

Allowed branch-local evidence docs:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-06-CF-W1-STRAT-03-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-STRAT-03-developer-handoff.md`

## Forbidden Files

- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.repository.ts`
- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.controller.ts`
- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.router.ts`
- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.validation.ts`
- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.module.ts`
- `backend/src/modules/strategy-decision-engine/index.ts`
- `backend/tests/modules/strategy-decision-engine/strategy-decision-engine.repository.test.ts`
- Prisma schema or migrations
- generated files
- backend or frontend route registries
- frontend `strategy-decision-engine` files
- shared backend utilities or shared DTOs
- shared frontend components
- package manifests
- upstream/downstream source in Strategy Framework, Signal Generation, Calibration, Data Quality Engine, Smart Money, Market Context, Research Hub, or Trade Plan
- provider, live-data, startup/backfill, paid/cloud, broker, telemetry, or credentials

## Required Behavior

- Add additive provenance metadata for:
  - `FRAMEWORK_BACKED`
  - `LEGACY_FALLBACK`
  - request-local `READ_PATH_CREATED`
- Keep `READ_PATH_CREATED` honest as request-local provenance on the response that creates a row, not durable replayable stored origin for later history/list reads.
- Set `legacyIncludedByRequest=true` only when the caller explicitly used `includeLegacy=true` and the returned row is non-framework-backed.
- Preserve proof-safe default legacy exclusion.
- Add top-level `reasonSummary` using this precedence:
  1. first blocker
  2. first warning
  3. first data gap
  4. first reason
  5. existing `riskPlan.reasonSummary`
  6. neutral research-support fallback
- Preserve current decision math, query behavior, route behavior, persistence keys, candidate-date defaults, and existing DTO fields.

## Required Validation

Run memory check before process-heavy commands, then:

```powershell
cd backend
npm.cmd test -- strategy-decision-engine.service.test.ts --runInBand
npm.cmd run build
```

## Stop Conditions

Stop and return to Team 00 if implementation requires repository/controller/router/validation/module/index edits, schema/generated/route/shared/package/frontend/provider/startup/live changes, durable stored read-path provenance, decision math changes, query/route changes, persistence-key changes, or downstream consumer adoption.

## Output

Write the Team 06 outbox and developer handoff with exact changed files, inspected files, behavior changed, validation evidence, skipped checks, forbidden files confirmed untouched, risks, and next gate.
