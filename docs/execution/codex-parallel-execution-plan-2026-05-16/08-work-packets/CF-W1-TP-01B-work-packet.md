# CF-W1-TP-01B Work Packet

Date: 2026-05-17

## Work Item

Backend-only Trade Plan no-target compatibility and Data Quality hard-block implementation.

Parent: `CF-W1-TP-01A`

## State

Architecture child packet prepared. Not Ready for Implementation.

Team 04's backend-only child QA plan already exists. Team 00 must still promote the exact file reservation and implementation handoff before source work starts.

## Owner / Lane / Module

- Architecture owner: Team 03 Architecture Factory.
- Future implementation owner: Team 06 Strategy / Signal / Risk, unless Team 00 assigns a Trade Plan specialist.
- Lane: Lane 2.
- Module: `trade-plan-risk-engine`.

## Allowed Files After Ready Promotion

- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.service.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.types.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.md`
- `backend/tests/modules/trade-plan-risk-engine/trade-plan-risk-engine.service.test.ts`
- `backend/tests/trade-plan-risk-engine.paper-readiness.test.ts`

Optional only if implementation proves geometry canonicalization must change:

- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.geometry.ts`

## Current Forbidden Files

- application source or tests before Ready promotion
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.repository.ts`
- `backend/tests/modules/trade-plan-risk-engine/trade-plan-risk-engine.repository.test.ts`
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- backend and frontend route registries
- Today Review backend/frontend files
- frontend Trade Plan files
- shared backend utilities
- shared frontend components
- package manifests
- generated types
- providers, schedulers, startup/backfill, Angel One, broker, live-provider, paid/cloud, or telemetry flows

## Required Behavior

The future implementation must:

- preserve existing target-shaped fields as compatibility-only;
- prevent target-shaped fields from being required trusted paper-readiness proof;
- remove/avoid trusted target-price, profit-target, guarantee, buy-now, sell-now, must-buy, or must-sell wording;
- hard-block or keep non-ready when DQ is missing, `UNUSABLE`, `NOT_READY`, `LIMITED`, `ILLIQUID`, stale, blocked, unsupported, scope-mismatched, provider-gapped, or signal-ineligible;
- preserve existing route/API compatibility outside the additive backend behavior.

## QA Handoff Needed

Use the prepared Team 04 child plan in `04-qa/CF-W1-TP-01B-qa-plan.md` after Team 00 promotes this packet.

Minimum scenarios:

- missing DQ blocks paper readiness;
- `NOT_READY` DQ blocks paper readiness;
- `LIMITED` DQ is not paper-ready;
- `eligibleForSignals=false` blocks paper readiness;
- `UNUSABLE` and `ILLIQUID` remain blocked;
- missing target does not by itself block paper readiness;
- forbidden target/advice language is absent from model rules and trusted output.

Suggested focused command after implementation exists:

```powershell
cd backend
npm.cmd test -- trade-plan-risk-engine.service.test.ts trade-plan-risk-engine.paper-readiness.test.ts --runInBand
```

Repository test command only if Team 00 separately approves repository behavior changes:

```powershell
cd backend
npm.cmd test -- trade-plan-risk-engine.repository.test.ts --runInBand
```

## Stop Conditions

Stop and return to Team 00 / Architect if implementation requires:

- removing, renaming, or migrating target-shaped API/stored fields;
- Prisma/schema/migration changes;
- repository behavior changes not separately reserved;
- frontend or Today Review changes;
- shared utility/UI changes;
- route registry changes;
- provider/live-data/startup behavior;
- a Product Owner exception that treats `LIMITED` as paper-ready;
- direct financial advice or target-price language.

## Next Gate

Team 00 may promote the backend-only Trade Plan slice to `Ready for Implementation` if the exact reservation and implementation handoff are copied without scope expansion.
