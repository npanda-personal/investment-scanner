# CF-W1-TP-02 Exit And Invalidation Semantics Contract

Date: 2026-05-18

Owner: Team 03 Architecture Factory

## Status

Future Trade Plan semantics contract refreshed. Not Ready for Implementation.

Sequencing prerequisite status: `CF-W1-TP-01B` is accepted and locally committed as `8ff22fd`. `TP-02` is no longer blocked by pending acceptance, but it still needs Team 04 QA planning and Team 00 sequencing.

## Contract Intent

Trade Plan output must describe modeled exit and invalidation semantics without reverting to target-price advice.

This first contract is backend-only and additive. It preserves existing compatibility fields while adding structured semantics owned by `trade-plan-risk-engine`.

## Required Output Rules

Trusted Trade Plan output must:

- use modeled exit-condition language, not price-target advice;
- use modeled invalidation-condition language with explicit reason evidence;
- expose stable rule ids and rule versions where Trade Plan owns the logic;
- preserve DQ blocker semantics from accepted `CF-W1-TP-01B`.

Trusted Trade Plan output must not:

- describe `target.price` as a profit target, recommendation, or guarantee;
- use `buy now`, `sell now`, `profit target`, `price target`, `guaranteed`, `must buy`, or `must sell`;
- make paper-readiness depend on a target-shaped compatibility field.

## Additive Type Contract

The first implementation packet should add additive fields equivalent to:

```ts
exitConditions: TradePlanExitConditionDto[];
invalidationConditions: TradePlanInvalidationConditionDto[];
```

Legacy compatibility fields may remain:

- `target`
- `invalidationRules`

But they must be treated as compatibility output only.

## Validation Contract

`targetRewardRisk` remains a model input, but it is constrained:

- must be finite;
- must be greater than or equal to `0.5`;
- must be less than or equal to `5.0`;
- out-of-range or non-finite values are rejected at the validation boundary.

## Trade Plan-Owned Rule Identity

Where Trade Plan owns the model logic, stable ids should be module-owned rather than borrowed from strategy/backtest modules. Example categories:

- reward-risk exit
- stop-loss close invalidation
- breakout failure invalidation
- trend-break invalidation
- blocked-plan invalidation

The exact ids are module-local implementation detail, but they must be stable inside the packet and surfaced in tests.

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
- frontend/API migration files
- backtesting strategy trade records
- Strategy Decision files
- shared utilities/UI
- package manifests
- generated files

## One-Writer Constraint

- Reserve the Trade Plan service/types/validation/geometry/doc/test set to one writer.
- Do not run `CF-W1-TP-02` in parallel with any other `trade-plan-risk-engine` source packet.
- This docs-only contract refresh can run in parallel with active Team 06 `CF-W1-SIG-TRIGGER-02A`.

## Test Contract

Team 04 can now plan focused backend tests that prove:

- structured exit and invalidation conditions are present;
- rule ids and rule versions are populated where the module owns them;
- out-of-range `targetRewardRisk` is rejected;
- trusted output avoids forbidden target/advice wording;
- accepted `CF-W1-TP-01B` DQ blocker semantics remain intact.
