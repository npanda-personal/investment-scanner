# CF-W1-TP-02 Architecture Review

Date: 2026-05-18

Owner: Team 03 Architecture Factory

## Status

Future Trade Plan semantics architecture packet prepared. Not Ready for Implementation.

This requirement is explicitly sequenced after `CF-W1-TP-01B`. It must not be treated as a replacement for the active backend-only compatibility/DQ hard-block slice.

## Evidence Inspected

- `AGENTS.md`
- `00-control/risk-register.md`
- `10-requirements/CF-W1-TP-02-trade-plan-exit-invalidation-semantics-requirement.md`
- `03-architecture/CF-W1-TP-01B-architecture-review.md`
- `06-contracts/CF-W1-TP-01B-backend-compatibility-dq-hard-block-contract.md`
- `06-contracts/CF-W1-STRAT-01-no-target-exit-invalidation-contract.md`
- `03-architecture/CF-W1-STRAT-01-architect-signoff.md`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.service.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.types.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.validation.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.geometry.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.md`
- `backend/tests/modules/trade-plan-risk-engine/trade-plan-risk-engine.service.test.ts`
- `backend/tests/trade-plan-risk-engine.paper-readiness.test.ts`

## Current Source Findings

- Trade Plan still exposes `target: Target | null` as a first-class DTO field.
- `targetRewardRisk` is accepted as a raw number with no explicit bounded validation.
- Invalidation output is still primarily `string[]` with no stable rule ids or rule version fields.
- Geometry and service behavior still rely on reward-risk target semantics for some rationale and proof wording.
- `CF-W1-TP-01B` already reserves the same module-owned files for the first backend-only compatibility pass.

## Architecture Decision

Prepare `CF-W1-TP-02` as the later semantics migration for `trade-plan-risk-engine` only.

The first future semantics packet should:

- preserve `CF-W1-TP-01B` compatibility boundaries;
- add additive structured exit and invalidation condition fields owned by Trade Plan;
- keep legacy `target` and `invalidationRules: string[]` fields for compatibility only in the first pass;
- validate `targetRewardRisk` as a finite value in the inclusive range `0.5` to `5.0`;
- replace advice-like trusted wording with modeled exit-condition and invalidation-condition wording;
- avoid repository, Prisma, Today Review, frontend, or backtesting changes in the first pass.

## Proposed Additive Output Shape

The first packet should add additive fields equivalent to:

```ts
interface TradePlanExitConditionDto {
  exitRuleId: string;
  ruleVersion: string;
  type: 'MODELED_EXIT_LEVEL' | 'REWARD_RISK_EXIT';
  triggerPrice: number | null;
  rewardRiskMultiple: number | null;
  reasonSummary: string;
  evidence: string[];
}

interface TradePlanInvalidationConditionDto {
  invalidationRuleId: string;
  ruleVersion: string;
  type: 'STOP_LOSS_CLOSE' | 'BREAKOUT_FAILURE' | 'TREND_BREAK' | 'PLAN_BLOCKED';
  triggerPrice: number | null;
  reasonSummary: string;
  evidence: string[];
}
```

The exact names may vary, but the semantics must stay additive and module-owned.

## Exact Future File Reservations

- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.service.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.types.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.validation.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.geometry.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.md`
- `backend/tests/modules/trade-plan-risk-engine/trade-plan-risk-engine.service.test.ts`
- `backend/tests/trade-plan-risk-engine.paper-readiness.test.ts`

## Forbidden Files

- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.repository.ts`
- `backend/tests/modules/trade-plan-risk-engine/trade-plan-risk-engine.repository.test.ts`
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- backend and frontend route registries
- Today Review backend/frontend files
- backtesting or strategy-decision source/tests
- shared backend utilities
- shared frontend components
- package manifests
- generated files
- frontend trade-plan files
- providers, startup/backfill, paid/cloud, broker, or telemetry flows

## Dependency And Conflict Notes

- `CF-W1-TP-02` is blocked behind acceptance of `CF-W1-TP-01B` because both packets reserve the same Trade Plan service/types/docs/tests.
- The packet can reuse `CF-W1-STRAT-01` vocabulary decisions, but it must not reopen Strategy Decision files.
- Any persisted-listing or repository durability change is future work and needs a separate child packet.

## Required QA Scenarios

Focused backend QA should prove:

- structured exit conditions exist without advice-like wording;
- structured invalidation conditions exist with stable ids and rule versions where Trade Plan owns the rule;
- `targetRewardRisk` rejects non-finite or out-of-range inputs;
- legacy `target` compatibility fields remain present but are not trusted as advice or readiness proof;
- existing DQ hard-block behavior from `CF-W1-TP-01B` is preserved.

## Readiness Result

Architecture packet prepared. Not Ready for Implementation.

The file reservations are exact, but Team 00 should keep this packet behind `CF-W1-TP-01B` and route QA prep only after the active compatibility slice is accepted.
