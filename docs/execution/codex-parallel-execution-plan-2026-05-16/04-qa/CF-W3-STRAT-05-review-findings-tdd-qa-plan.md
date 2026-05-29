# CF-W3-STRAT-05 Review Findings TDD QA Plan

Date: 2026-05-29

Owner: Team 04 QA Factory

Status: QA-owned red-bar regression tests authored. Production source not modified.

## Scope

Test-first coverage for Strategy Framework review findings across Strategy Framework, Backtesting Strategy Lab, and Signal Generation Engine.

Allowed write scope used:

- `backend/tests/modules/strategy-framework/strategy-framework.repository.test.ts`
- `backend/tests/modules/strategy-framework/strategy-framework.evaluator.test.ts`
- `backend/tests/modules/strategy-framework/strategy-framework.service.test.ts`
- `backend/tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.service.test.ts`
- this QA plan
- Team 04 outbox

No production source, Prisma, route registry, package, generated, or frontend source files were edited.

## Regression Tests Authored

| Review finding | QA coverage |
| --- | --- |
| Strategy definition repository drops `invalidationRules` in persistence and DTO mapping. | Repository tests assert `upsertDefinitions()` writes `invalidationRules` into create/update payloads and `listDefinitions()` maps persisted invalidation rules back into DTOs. |
| Registered backtests lack richer strategy context and under-trigger active strategies. | Backtesting test asserts a valid `TREND_MOMENTUM` registered backtest has enough sector/smart-money context to enter when price and DQ evidence are complete. Current code returns `false`. |
| Signal Generation uses `marketGate: UNKNOWN` and lacks stricter context for strategy matching. | Signal Generation test asserts `BREAKOUT_CONFIRMATION` is blocked, not promoted, when market gate context is unavailable. Current code promotes an `ENTRY_CANDIDATE`. |
| Operational exits can be mislabeled with registered exit rule evidence. | Backtesting test asserts `STOP_LOSS` trades do not attach Strategy Framework `exitReasons`. Current code attaches `PRICE_BELOW_SMA50` evidence. |
| Strategy rankings can mix stale persisted proof with current active strategy versions. | Strategy Framework service test asserts rankings do not surface stale persisted `strategyVersion: 1.0.0` when registry version is `1.1.0`. Current code returns the stale row. |
| Unknown market gate is too lenient. | Evaluator test asserts active entry promotion is blocked when market gate is `UNKNOWN`. Current code emits `ENTRY_CANDIDATE`. |
| Thin/unknown liquidity is too lenient. | Evaluator test asserts active entry promotion is blocked when DQ liquidity is `UNKNOWN`. Current code emits `ENTRY_CANDIDATE`. |

## Follow-Up Requirements

These findings are too broad or static/type-oriented for a focused failing Jest test in this packet and must stay as QA follow-ups until implementation scope is reserved:

- Frontend types/UI stale for invalidation rules: add/update feature-local UI smoke or type/static check after frontend implementation is authorized. Required proof: invalidation rules render on Strategy Framework detail/proof surfaces and are not dropped by frontend types.
- Registry is descriptive while evaluator is hard-coded: add a static parity check or implementation-owned registry/evaluator dispatch contract. Required proof: every active registry strategy either has evaluator coverage or an explicit blocked/draft status with documented reason.
- Domain-specific strategy weaknesses: add requirement-level tests after domain contract is clarified for dual momentum relative ranks, sector leader instrument RS rank, breakout/pullback math, draft strategies remaining impossible to pass, and category type support for `RISK`, `CALIBRATION`, and `DIAGNOSTIC`.
- Advice/target wording: keep static/manual review in release gate for no target price, R:R, or direct buy/sell wording in any new strategy evidence.

## Red-Bar Evidence

Focused command run from `backend`:

```powershell
npm.cmd test -- --runTestsByPath tests/modules/strategy-framework/strategy-framework.repository.test.ts tests/modules/strategy-framework/strategy-framework.evaluator.test.ts tests/modules/strategy-framework/strategy-framework.service.test.ts tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.test.ts tests/modules/signal-generation-engine/signal-generation-engine.service.test.ts --runInBand
```

Observed result:

- 5 suites failed, 5 total.
- 8 tests failed, 75 passed, 83 total.

Expected failing assertions:

- `strategy-framework.repository.test.ts`: invalidation rules absent from persistence payload and DTO mapping.
- `strategy-framework.evaluator.test.ts`: `UNKNOWN` market gate and `UNKNOWN` liquidity still promote `ENTRY_CANDIDATE`.
- `strategy-framework.service.test.ts`: stale ranking proof returns `strategyVersion: 1.0.0` instead of registry `1.1.0`.
- `backtesting-strategy-lab.service.test.ts`: registered trend entry under-triggers; stop-loss trade carries `PRICE_BELOW_SMA50` exit evidence.
- `signal-generation-engine.service.test.ts`: breakout match is promoted despite unavailable market gate context.

## Acceptance Criteria For Implementation

QA can move this packet out of red only when:

- the focused command above passes without weakening or deleting the new assertions;
- invalidation rules persist and round-trip through repository DTOs;
- Strategy Framework rankings/proof surfaces do not expose stale persisted evidence as current active-version proof;
- active entry strategies do not promote with unknown market gate or unknown/thin liquidity unless a documented exception exists;
- registered backtests provide required market/sector/smart-money context or explicitly mark strategy context unavailable without entry promotion;
- operational exits keep operational reasons separate from Strategy Framework exit/invalidation evidence;
- Signal Generation does not promote stricter Strategy Framework matches from default `UNKNOWN` market context;
- remaining UI/static/domain follow-ups are either covered by added tests or documented as separate release blockers.
