# CF-W3-STRAT-05 Review Findings TDD QA Plan

Date: 2026-05-29

Owner: Team 04 QA Factory

Status: No-schema hardening slice green. Schema persistence/version-history findings remain decision-gated.

## Scope

Test-first coverage for Strategy Framework review findings across Strategy Framework, Backtesting Strategy Lab, Signal Generation Engine, Strategy Decision Engine, and feature-local Strategy Framework UI.

Allowed write scope used:

- `backend/tests/modules/strategy-framework/strategy-framework.repository.test.ts`
- `backend/tests/modules/strategy-framework/strategy-framework.evaluator.test.ts`
- `backend/tests/modules/strategy-framework/strategy-framework.service.test.ts`
- `backend/tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.service.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.trigger-contract.test.ts`
- `backend/tests/modules/strategy-decision-engine/strategy-decision-engine.service.test.ts`
- `backend/tests/modules/strategy-decision-engine/strategy-decision-engine.repository.test.ts`
- `frontend/tests/ui/strategy-framework.spec.ts`
- `backend/src/modules/strategy-framework/**`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.service.ts`
- `backend/src/modules/strategy-decision-engine/**`
- `frontend/src/features/strategy-framework/**`
- `frontend/src/features/strategy-decision-engine/types.ts`
- this QA plan
- Team 04 outbox

No Prisma, route registry, package, generated, shared utility, or migration files were edited. Production changes in this slice are limited to module-owned Strategy Framework, Signal Generation, Strategy Decision, and feature-local Strategy Framework UI files.

## Regression Tests Authored

| Review finding | QA coverage |
| --- | --- |
| Strategy definition repository drops `invalidationRules` in persistence and DTO mapping. | Blocked by `DECISION-20260529-strategy-definition-invalidation-rules-persistence.md`; cannot be implemented without Prisma/schema/generated-client approval. |
| Registered backtests lack richer strategy context and under-trigger active strategies. | Backtesting test asserts a valid `TREND_MOMENTUM` registered backtest has enough sector/smart-money context to enter when price and DQ evidence are complete. |
| Signal Generation uses `marketGate: UNKNOWN` and lacks stricter context for strategy matching. | Signal Generation test asserts `BREAKOUT_CONFIRMATION` is blocked, not promoted, when market gate context is unavailable. |
| Operational exits can be mislabeled with registered exit rule evidence. | Backtesting test asserts `STOP_LOSS` trades do not attach Strategy Framework `exitReasons`. |
| Strategy rankings can mix stale persisted proof with current active strategy versions. | Strategy Framework service tests assert rankings, performance, detail, proof registry, and proof detail ignore stale persisted proof whose version does not match the active registry version. |
| Unknown market gate is too lenient. | Evaluator test asserts active entry promotion is blocked when market gate is `UNKNOWN`. |
| Thin/unknown liquidity is too lenient. | Evaluator test asserts active entry promotion is blocked when DQ liquidity is `UNKNOWN` or `THIN`. |

## Follow-Up Requirements

These findings are too broad or static/type-oriented for a focused failing Jest test in this packet and must stay as QA follow-ups until implementation scope is reserved:

- Durable invalidation-rule persistence and version-safe strategy-definition history remain Prisma/schema decisions. Runtime registry definitions are the source of truth until those decisions are approved.
- Frontend Strategy Decision display of invalidation evidence is additive type-only in this slice; a richer user-facing Strategy Decision invalidation panel remains a future UX item.
- Registry is descriptive while evaluator is hard-coded: add a static parity check or implementation-owned registry/evaluator dispatch contract. Required proof: every active registry strategy either has evaluator coverage or an explicit blocked/draft status with documented reason.
- Domain-specific strategy weaknesses: add requirement-level tests after domain contract is clarified for dual momentum relative ranks, sector leader instrument RS rank, breakout/pullback math, draft strategies remaining impossible to pass, and category type support for `RISK`, `CALIBRATION`, and `DIAGNOSTIC`.
- Advice/target wording: keep static/manual review in release gate for no target price, R:R, or direct buy/sell wording in any new strategy evidence.

## Original Red-Bar Evidence

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

## Acceptance Criteria For No-Schema Implementation

QA can move this packet out of red only when:

- the focused command above passes without weakening or deleting the new assertions;
- invalidation rules remain visible in runtime registry DTOs/UI and are carried through Strategy Decision evidence where schema permits;
- Strategy Framework rankings/proof surfaces do not expose stale persisted evidence as current active-version proof;
- active entry strategies do not promote with unknown market gate or unknown/thin liquidity unless a documented exception exists;
- registered backtests provide required market/sector/smart-money context or explicitly mark strategy context unavailable without entry promotion;
- operational exits keep operational reasons separate from Strategy Framework exit/invalidation evidence;
- Signal Generation does not promote stricter Strategy Framework matches from default `UNKNOWN` market context;
- remaining UI/static/domain follow-ups are either covered by added tests or documented as separate release blockers.

## Latest Findings TDD Delta - 2026-05-29

Status: Implemented and focused backend validation passed for the no-schema slice.

Additional executable coverage added:

- Strategy Framework `performance()`, `detail()`, `proofRegistry()`, and `proofDetail()` must ignore stale persisted proof whose `strategyVersion` does not match the current registry version.
- Direct Strategy Framework evaluation must use persisted Smart Money evidence only; `smartMoneyService.stock()` on-demand derived fallback must not be called for downstream strategy evaluation.
- Low Quality Data support filter must block `THIN` and `UNKNOWN` liquidity, not only `ILLIQUID`.
- Strategy registry `requiredInputs` must stay aligned with executable entry/exit/invalidation/noise/market-gate rule inputs.
- Signal Generation must not silently claim Strategy Framework matches when market, sector, or smart-money context is missing; missing context must remain visible as blocker/data-gap evidence.
- Strategy Decision adapter must preserve framework `invalidationRulesTriggered` evidence on the adapted decision DTO.
- Frontend Strategy Framework types and detail/evaluation surfaces must expose invalidation rule declarations and triggered invalidation evidence.
- Strategy Decision stock lookup must render framework invalidation evidence as risk review, and must not show target-price or reward-risk labels for null/deprecated compatibility fields.

Blocked or deferred findings:

- Invalidation-rule persistence/schema remains consent-gated by `DECISION-20260529-strategy-definition-invalidation-rules-persistence.md`; executable persistence tests cannot be green without a schema/Prisma decision first.
- Version-safe durable strategy-definition history remains consent-gated by `DECISION-20260529-strategy-definition-version-history.md`.
- Strategy category additions `RISK`, `CALIBRATION`, and `DIAGNOSTIC` are type-only contract work; no isolated type-test harness exists beyond backend/frontend builds, so keep as a static release-gate check unless implementation reserves a compile-time contract test.
- Domain math findings for dual momentum relative ranks, sector leader instrument RS rank, breakout/pullback formulas, and draft-strategy passability remain domain-design follow-ups requiring architecture/product acceptance criteria before executable assertions.

Latest green command run from `backend`:

```powershell
npm.cmd test -- --runTestsByPath tests/modules/strategy-framework/strategy-framework.repository.test.ts tests/modules/strategy-framework/strategy-framework.evaluator.test.ts tests/modules/strategy-framework/strategy-framework.service.test.ts tests/modules/signal-generation-engine/signal-generation-engine.service.test.ts tests/modules/signal-generation-engine/signal-generation-engine.trigger-contract.test.ts tests/modules/strategy-decision-engine/strategy-decision-engine.service.test.ts tests/modules/strategy-decision-engine/strategy-decision-engine.repository.test.ts tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.test.ts --runInBand
```

Observed result:

- 8 suites passed, 8 total.
- 127 tests passed, 127 total.

Additional validation:

- Backend build: `npm.cmd run build` from `backend` passed.
- Frontend build: `npm.cmd run build` from `frontend` passed.
- UI smoke: `npm.cmd run test:ui -- strategy-framework.spec.ts --workers=1 --output=test-results-strategy-framework` from `frontend` passed after backend health was ready, 4 tests passed.
- UI smoke: `npm.cmd run test:ui -- strategy-decision-engine.spec.ts --workers=1 --output=test-results-strategy-decision` from `frontend` passed after backend health was ready, 5 tests passed.
