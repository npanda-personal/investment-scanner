# CF-W1-TP-02 QA Plan

Date: 2026-05-18

Owner: Team 04 QA Factory

Status: Trade Plan exit/invalidation semantics QA plan prepared. The packet remains Not Ready for Implementation. Team 00 must handle sequencing and readiness evaluation after this QA plan.

Current status refresh: `CF-W1-TP-01B` is accepted and locally committed as `8ff22fd`, so `CF-W1-TP-02` is no longer blocked by pending `TP-01B` acceptance. The current gate is this QA plan only. This artifact does not move the packet to Ready.

## Scope

Focused backend QA planning for additive Trade Plan exit/invalidation semantics inside `trade-plan-risk-engine`.

In scope after a future Team 00 Ready promotion:

- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.service.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.types.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.validation.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.geometry.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.md`
- `backend/tests/modules/trade-plan-risk-engine/trade-plan-risk-engine.service.test.ts`
- `backend/tests/trade-plan-risk-engine.paper-readiness.test.ts`

Out of scope for this first semantics child:

- Prisma schema, migrations, generated files, repository changes, or persisted storage redesign
- backend/frontend route registries
- Today Review backend/frontend files
- frontend Trade Plan files or UI smoke
- Strategy Decision or backtesting source/tests
- shared backend utilities or shared frontend components
- package manifests
- provider/live-data, startup/backfill, paid/cloud, broker, or telemetry scope

## Contract Inputs And Current Source Alignment

Primary planning inputs:

- `10-requirements/CF-W1-TP-02-trade-plan-exit-invalidation-semantics-requirement.md`
- `03-architecture/CF-W1-TP-02-architecture-review.md`
- `06-contracts/CF-W1-TP-02-exit-invalidation-semantics-contract.md`
- `08-work-packets/CF-W1-TP-02-work-packet.md`
- `17-team-outboxes/TEAM-03-architecture-factory.md`
- `04-qa/CF-W1-TP-01B-qa-plan.md`

Current source/tests still show the exact semantics gap this child must cover:

- `TradePlanResultDto` still exposes `target: Target | null` and `invalidationRules: string[]` as the only structured target/invalidation surfaces.
- No `exitConditions` or `invalidationConditions` fields exist yet.
- `parseGenerateRequest()` accepts `targetRewardRisk` as any numeric value and does not reject non-finite or out-of-range inputs.
- `generatePlan()` still makes `target` first-class output, still emits `Target is modeled at 2R by default.`, and still builds invalidation output as strings.
- `classifyPaperReadiness()` still blocks on missing `target` and missing `invalidationRules`, so QA must make sure the semantics child updates trusted readiness logic rather than merely adding parallel fields.
- Existing tests still assert target-first wording and do not yet cover additive structured exit/invalidation semantics or bounded `targetRewardRisk` validation.

## Required QA Assertions

- Trusted output includes additive `exitConditions` and `invalidationConditions` arrays with stable module-owned rule ids, rule versions, reason summaries, and evidence arrays where Trade Plan owns the logic.
- Trusted output uses modeled exit-condition and invalidation-condition language rather than target-price advice.
- Legacy compatibility fields `target` and `invalidationRules` may remain in the first pass, but they are compatibility-only and not trusted readiness proof.
- Missing or null legacy `target` must not be the sole blocker when additive exit semantics are present and the non-target readiness contract otherwise passes.
- `targetRewardRisk` validation rejects:
  - non-finite values,
  - values below `0.5`,
  - values above `5.0`.
- Boundary values `0.5`, `2.0`, and `5.0` remain accepted.
- Accepted `CF-W1-TP-01B` DQ hard-block behavior does not regress:
  - missing DQ proof does not become ready,
  - `coverageStatus = UNUSABLE` remains blocked,
  - `signalReadinessStatus = NOT_READY` remains not ready,
  - `signalReadinessStatus = LIMITED` does not become `READY_FOR_PAPER_REVIEW`,
  - `liquidityStatus = ILLIQUID` remains blocked,
  - `eligibleForSignals = false` still blocks trusted readiness when the plan depends on signal/strategy evidence.
- Product language stays research-support safe:
  - allow wording such as `exit condition`, `invalidation condition`, `risk warning`, `candidate`, `consider review`, `modeled exit level`, `reward/risk exit`
  - reject `price target`, `profit target`, `buy now`, `sell now`, `must buy`, `must sell`, `guaranteed`, and similar advice language
- QA must reject any implementation that widens beyond the reserved Trade Plan file set or reaches into forbidden integration surfaces.

## Scenario Matrix

| Scenario | Expected QA assertion after implementation |
| --- | --- |
| Additive exit semantics present | `exitConditions` exists, is non-empty for valid modeled plans, and each item exposes stable rule id, rule version, type, reason summary, and evidence. |
| Additive invalidation semantics present | `invalidationConditions` exists, is non-empty for valid modeled plans, and each item exposes stable rule id, rule version, type, reason summary, and evidence. |
| Legacy compatibility preserved | `target` and `invalidationRules` may remain present, but tests and docs treat them as compatibility-only output rather than trusted advice or readiness proof. |
| Missing legacy target with additive exit semantics | If `exitConditions` prove modeled exit semantics, paper-readiness does not fail solely because `target` is null or absent. |
| Legacy invalidation strings retained | `invalidationRules` may remain for compatibility, but trusted assertions use structured `invalidationConditions` rather than string parsing. |
| Reward/risk lower bound | `targetRewardRisk = 0.5` is accepted and produces bounded modeled exit geometry without validation failure. |
| Reward/risk default/common case | `targetRewardRisk = 2.0` remains accepted and produces modeled exit-condition semantics without target-advice framing. |
| Reward/risk upper bound | `targetRewardRisk = 5.0` is accepted and remains finite/explicitly modeled. |
| Reward/risk below range | `targetRewardRisk < 0.5` is rejected at validation boundary. |
| Reward/risk above range | `targetRewardRisk > 5.0` is rejected at validation boundary. |
| Reward/risk non-finite | `Infinity`, `-Infinity`, and `NaN` are rejected at validation boundary. |
| DQ missing | Missing DQ snapshot/proof remains blocked or insufficient; additive exit semantics do not bypass DQ fail-closed behavior. |
| `UNUSABLE` coverage | `coverageStatus = UNUSABLE` remains blocked. |
| `NOT_READY` signal readiness | `signalReadinessStatus = NOT_READY` remains not ready. |
| `LIMITED` signal readiness | `LIMITED` does not become `READY_FOR_PAPER_REVIEW`; limited-review wording stays non-ready. |
| `eligibleForSignals = false` | Trusted readiness remains blocked when signal/strategy proof is ineligible. |
| Product-language scan | Trusted output/docs/tests do not contain forbidden advice or target wording. |
| Scope widening attempt | Any Prisma/schema, repository, route, shared-file, frontend, Today Review, backtesting, package, generated, provider/live-data, paid/cloud, or broker edit is rejected. |

## Compatibility Expectations

- `target` remains allowed only as a compatibility field in the first semantics child.
- `target` must not be described as a price target, profit target, guarantee, or recommendation.
- `invalidationRules: string[]` remains allowed only as compatibility output in the first semantics child.
- Trusted tests should assert structured `exitConditions` and `invalidationConditions` first, with legacy `target` and `invalidationRules` treated as preserved compatibility fields only.
- `paperReadinessReasons` and `paperReadinessBlockers` must not cite legacy target-shaped fields as trusted readiness proof once additive exit/invalidation semantics exist.

## Focused Command Guidance

Commands below are guidance only. They were not run during this docs-only QA planning pass.

Focused backend tests expected after a bounded implementation handoff:

```powershell
cd backend
npm.cmd test -- trade-plan-risk-engine.service.test.ts trade-plan-risk-engine.paper-readiness.test.ts --runInBand
```

Recommended backend build after implementation and resource checks:

```powershell
cd backend
npm.cmd run build
```

Recommended product-language scan after implementation:

```powershell
rg -n "price target|profit target|buy now|sell now|must buy|must sell|guaranteed" backend/src/modules/trade-plan-risk-engine backend/tests/modules/trade-plan-risk-engine backend/tests/trade-plan-risk-engine.paper-readiness.test.ts
```

Repository tests are not part of the first child because repository edits are forbidden. If repository changes appear, QA should reject scope rather than expand the command set.

## Exact Reject Conditions

Reject the packet immediately and return it to Team 00 / Architect if implementation edits:

- `backend/prisma/schema.prisma`
- any file under `backend/prisma/migrations/**`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.repository.ts`
- `backend/tests/modules/trade-plan-risk-engine/trade-plan-risk-engine.repository.test.ts`
- `backend/src/api/routes.ts`
- `frontend/src/app/routes.tsx`
- any `frontend/src/**` file
- any Today Review backend/frontend file
- any Strategy Decision or backtesting source/test file
- any shared backend utility or shared frontend component
- any package manifest
- any generated file
- any provider/live-data, startup/backfill, paid/cloud, telemetry, or broker path

These are first-child reject conditions, not soft warnings.

## Parallel Sequencing Note

- This docs-only QA planning packet is safe in parallel with active `CF-W1-SIG-TRIGGER-02A` review/signoff because the write scopes do not overlap.
- A future `CF-W1-TP-02` source implementation also does not overlap file-wise with `signal-generation-engine`, but Team 00 should still sequence Team 06 capacity deliberately and should not treat this as permission to open multiple concurrent Team 06 implementation passes without an explicit handoff plan.

## Stop Conditions

Stop QA and return to Team 00 / Architect if:

- implementation needs repository, Prisma, route, frontend, Today Review, Strategy Decision, or backtesting edits to complete the first semantics child
- additive fields are added but trusted readiness logic still hard-depends on legacy `target`
- compatibility fields are presented as trusted guidance instead of modeled semantics
- validation is deferred from the request boundary to a later runtime failure path
- DQ hard-block behavior from `TP-01B` is weakened to make more plans appear ready

## Evidence Required Later

- Exact implementation handoff limited to the reserved Trade Plan service/types/validation/geometry/doc/test files only
- Focused evidence for additive `exitConditions` and `invalidationConditions`
- Compatibility evidence for retained `target` and `invalidationRules`
- Validation evidence for `targetRewardRisk` boundaries and non-finite rejection
- Regression evidence for `TP-01B` DQ fail-closed behavior
- Product-language scan result or equivalent explicit assertions
- Explicit note that repository/schema/routes/frontend/Today Review/backtesting/shared/provider/live-data scope stayed out of the packet
