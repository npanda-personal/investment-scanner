# CF-W1-TP-02 Architecture Review

Date: 2026-05-18

Owner: Team 03 Architecture Factory

## Status

Future Trade Plan semantics packet refreshed. Not Ready for Implementation.

`CF-W1-TP-01B` is no longer a pending acceptance prerequisite. It is accepted and locally committed on the Team 06 branch as `8ff22fd`. That clears the stale prerequisite wording in older `TP-02` docs, but it does not make `TP-02` Ready. The next valid gate is Team 04 QA planning for the bounded semantics packet.

## Evidence Inspected

- `AGENTS.md`
- `10-requirements/CF-W1-TP-02-trade-plan-exit-invalidation-semantics-requirement.md`
- `10-requirements/next-top-10-candidates.md`
- `00-control/active-work-board.md`
- `00-control/team-agent-runtime-queue.md`
- `09-summaries/team-00-pause-resume-checkpoint.md`
- `03-architecture/CF-W1-TP-01B-architecture-review.md`
- `06-contracts/CF-W1-TP-01B-backend-compatibility-dq-hard-block-contract.md`
- `18-integration-queue/CF-W1-TP-01B-team10-review-release.md`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.service.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.types.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.validation.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.geometry.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.md`
- `backend/tests/modules/trade-plan-risk-engine/trade-plan-risk-engine.service.test.ts`
- `backend/tests/trade-plan-risk-engine.paper-readiness.test.ts`

## Current Source Findings

- Trade Plan still exposes `target: Target | null` as a first-class DTO field.
- `targetRewardRisk` is still accepted as a raw number with no explicit bounded validation.
- Invalidation output is still primarily `string[]` with no stable rule ids or rule version fields.
- Geometry and service behavior still rely on reward-risk target semantics for some rationale and proof wording.
- The accepted `CF-W1-TP-01B` branch evidence proves the compatibility/DQ hard-block child can remain isolated to the same module-owned file set and does not require schema, repository, frontend, or route changes.

## Architecture Decision

Keep `CF-W1-TP-02` as the later semantics migration for `trade-plan-risk-engine` only.

The first future semantics packet should:

- preserve accepted `CF-W1-TP-01B` DQ hard-block behavior;
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

## Exact Allowed Files

- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.service.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.types.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.validation.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.geometry.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.md`
- `backend/tests/modules/trade-plan-risk-engine/trade-plan-risk-engine.service.test.ts`
- `backend/tests/trade-plan-risk-engine.paper-readiness.test.ts`

## Exact Forbidden Files

- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.repository.ts`
- `backend/tests/modules/trade-plan-risk-engine/trade-plan-risk-engine.repository.test.ts`
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- backend and frontend route registries
- Today Review backend/frontend files
- frontend Trade Plan files
- Strategy Decision or backtesting source/tests
- shared backend utilities
- shared frontend components
- package manifests
- generated files
- providers, startup/backfill, paid/cloud, broker, or telemetry flows

## One-Writer Constraint

- Team 00 must reserve the full Trade Plan service/types/validation/geometry/doc/test set to one writer in any future implementation pass.
- `CF-W1-TP-02` must not run in parallel with any other `trade-plan-risk-engine` source packet.

## Dependencies

- The stale prerequisite is cleared: `CF-W1-TP-01B` is accepted branch-locally as `8ff22fd`.
- `CF-W1-TP-02` still depends on Team 04 QA planning before any Team 00 Ready evaluation.
- The packet can reuse `CF-W1-STRAT-01` vocabulary decisions, but it must not reopen Strategy Decision files.
- Any persisted-listing or repository durability change is future work and needs a separate child packet.

## QA Handoff Needs

Team 04 can now plan focused backend QA for:

- structured exit conditions without advice-like wording;
- structured invalidation conditions with stable ids and rule versions where Trade Plan owns the rule;
- validation rejection for non-finite or out-of-range `targetRewardRisk`;
- preserved `CF-W1-TP-01B` DQ blocker behavior;
- legacy `target` compatibility fields remaining present but not trusted as advice or readiness proof.

## Parallel With Active Team 06 Work

- This docs-only refresh can run in parallel with active Team 06 `CF-W1-SIG-TRIGGER-02A` work because the write scope is limited to docs and the active Team 06 work is in `signal-generation-engine`.
- A future `TP-02` source implementation would not overlap file-wise with `signal-generation-engine`, but Team 00 should not assign a second Team 06 implementation pass until the active Team 06 handoff closes.

## Ready Recommendation

- Architecture packet: prepared and current after `TP-01B` acceptance.
- Next gate: Team 04 QA planning can start now.
- Not Ready for Implementation: Team 00 still needs QA evidence, exact sequencing, and an explicit Team 06 handoff before any promotion.
