# Team 00 Ready Promotion - CF-W1-TP-02

Date: 2026-05-18

Owner: Team 00 - Master Orchestrator / Integration

## Result

`CF-W1-TP-02` is promoted for bounded Team 06 implementation as a dependent Trade Plan branch.

This is not an independent `dev`-based branch because `CF-W1-TP-01B` is accepted branch-locally as `8ff22fd` and is not yet an ancestor of `dev`. `TP-02` must preserve the accepted `TP-01B` DQ hard-block behavior, so Team 00 will base the `TP-02` implementation branch on `codex/team06-strategy-signal/CF-W1-TP-01B`.

## Gate Evidence

- Requirement: `10-requirements/CF-W1-TP-02-trade-plan-exit-invalidation-semantics-requirement.md`
- Architecture review: `03-architecture/CF-W1-TP-02-architecture-review.md`
- Contract: `06-contracts/CF-W1-TP-02-exit-invalidation-semantics-contract.md`
- Work packet: `08-work-packets/CF-W1-TP-02-work-packet.md`
- QA plan: `04-qa/CF-W1-TP-02-qa-plan.md`
- Open decisions: none.
- Upstream dependency: `CF-W1-TP-01B` accepted as branch commit `8ff22fd`.

## Branch / Worktree

- Base branch: `codex/team06-strategy-signal/CF-W1-TP-01B`
- New branch: `codex/team06-strategy-signal/CF-W1-TP-02`
- Worktree: `../investment-scanner-worktrees/team06-CF-W1-TP-02`

## Allowed Files

- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.service.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.types.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.validation.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.geometry.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.md`
- `backend/tests/modules/trade-plan-risk-engine/trade-plan-risk-engine.service.test.ts`
- `backend/tests/trade-plan-risk-engine.paper-readiness.test.ts`

Allowed branch-local evidence docs:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-06-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-TP-02-developer-handoff.md`

## Forbidden Files

- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.repository.ts`
- `backend/tests/modules/trade-plan-risk-engine/trade-plan-risk-engine.repository.test.ts`
- Prisma schema or migrations
- generated files
- backend or frontend route registries
- Today Review backend/frontend files
- frontend Trade Plan files
- Strategy Decision or backtesting source/tests
- shared backend utilities
- shared frontend components
- package manifests
- provider/live-data, startup/backfill, paid/cloud, broker, or telemetry scope

## Required Behavior

- Preserve accepted `CF-W1-TP-01B` DQ hard-block behavior.
- Add additive structured `exitConditions` and `invalidationConditions`.
- Keep legacy `target` and `invalidationRules` compatibility fields without treating them as trusted readiness proof.
- Reject non-finite `targetRewardRisk` and values outside the inclusive `0.5` to `5.0` range.
- Replace advice-like target wording in trusted output with modeled exit/invalidation language.
- Preserve route paths and avoid repository/schema migration.

## Focused Validation

```powershell
cd backend
npm.cmd test -- trade-plan-risk-engine.service.test.ts trade-plan-risk-engine.paper-readiness.test.ts --runInBand
npm.cmd run build
```

## Stop Conditions

Stop and return to Team 00 if implementation requires repository, Prisma, route, frontend, Today Review, Strategy Decision, backtesting, shared utility/UI, package, generated, provider/live-data, startup/backfill, paid/cloud, broker, or telemetry scope.

## Teams Ready To Pick Up New Tasks

- Team 06: implement `CF-W1-TP-02` in the dependent Team 06 worktree.
- Team 04: QA after Team 06 developer handoff.
- Team 10: review after QA ACCEPT.
- Team 03: Architect Signoff after Team 10 ACCEPT.
