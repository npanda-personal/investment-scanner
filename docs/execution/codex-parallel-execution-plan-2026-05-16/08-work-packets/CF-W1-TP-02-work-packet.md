# CF-W1-TP-02 Work Packet

Date: 2026-05-18

## Work Item

Trade Plan exit and invalidation semantics without target-like advice.

## State

Future semantics packet refreshed. Not Ready for Implementation.

This packet is no longer blocked by pending `CF-W1-TP-01B` acceptance. `CF-W1-TP-01B` is accepted and locally committed as `8ff22fd`. The next gate is Team 04 QA planning, not another architecture prerequisite loop.

## Owner / Lane / Module

- Architecture owner: Team 03 Architecture Factory.
- Future implementation owner: Team 06 Strategy / Signal / Risk.
- Lane: Lane 2.
- Module: `trade-plan-risk-engine`.

## Allowed Files After Ready Promotion

- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.service.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.types.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.validation.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.geometry.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.md`
- `backend/tests/modules/trade-plan-risk-engine/trade-plan-risk-engine.service.test.ts`
- `backend/tests/trade-plan-risk-engine.paper-readiness.test.ts`

## Current Forbidden Files

- application source or tests before Team 00 promotion
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

## Required Behavior

Future implementation must:

- preserve accepted `CF-W1-TP-01B` DQ hard-block behavior;
- add structured exit conditions and structured invalidation conditions;
- keep legacy `target` and `invalidationRules` fields as compatibility-only in the first pass;
- reject `targetRewardRisk` values outside `0.5` to `5.0`;
- replace advice-like target semantics in trusted output with modeled exit/invalidation semantics;
- preserve existing route paths and avoid repository/schema migration.

## One-Writer Constraint

- Reserve the Trade Plan service/types/validation/geometry/doc/test set to one writer.
- Do not run `CF-W1-TP-02` in parallel with any other `trade-plan-risk-engine` source packet.

## QA Handoff Needed

Team 04 can now prepare focused backend QA for:

- structured exit-condition output;
- structured invalidation-condition output;
- stable rule ids and versions where Trade Plan owns the rule;
- validation rejection for out-of-range `targetRewardRisk`;
- preserved `CF-W1-TP-01B` DQ blocker behavior;
- absence of target/advice wording in trusted output.

Suggested focused command after implementation exists:

```powershell
cd backend
npm.cmd test -- trade-plan-risk-engine.service.test.ts trade-plan-risk-engine.paper-readiness.test.ts --runInBand
```

## Stop Conditions

Stop and return to Team 00 / Architect if implementation requires:

- repository or persisted-listing changes;
- Prisma/schema/migration changes;
- Today Review or frontend changes;
- Strategy Decision/backtesting file edits;
- shared utility/UI changes;
- expanding the packet beyond module-owned Trade Plan semantics.

## Parallel With Active Team 06 Work

- This docs-only refresh is safe in parallel with active Team 06 `CF-W1-SIG-TRIGGER-02A`.
- A future `TP-02` source pass has no file overlap with `signal-generation-engine`, but Team 00 should not assign another Team 06 implementation pass until the active Team 06 handoff closes.

## Next Gate

Route `CF-W1-TP-02` to Team 04 QA planning now.

After QA planning exists, Team 00 can decide whether to keep it queued behind higher-priority Lane 2 work or evaluate it for a later Ready promotion.
