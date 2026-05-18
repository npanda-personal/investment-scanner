# CF-W1-SIG-02 Work Packet

Date: 2026-05-18

## Work Item

Signal Generation canonical trigger-evidence compatibility.

## State

Ready candidate for one bounded backend-only child. Not yet promoted for implementation.

This packet is valid only as one single-writer `signal-generation-engine` pass. It must either stack on the accepted parked `CF-W1-SIG-TRIGGER-02A` commit `788c237` or fold those same semantics into the same reserved file set when starting from current `dev`.

## Owner / Lane / Module

- Architecture owner: Team 03 Architecture Factory
- Future implementation owner: Team 06 Strategy / Signal / Risk
- Lane: Lane 2
- Module: `signal-generation-engine`

## Exact Allowed File Reservations After Team 00 Promotion

- `backend/src/modules/signal-generation-engine/signal-generation-engine.types.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.repository.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.service.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.md`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.repository.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.service.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.trigger-contract.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-dq-enforcement.invariants.test.ts`

## Exact Forbidden Files

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- generated files
- `backend/src/api/routes.ts`
- `frontend/src/app/routes.tsx`
- `backend/src/modules/signal-generation-engine/index.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.controller.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.router.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.validation.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.module.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.config.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.routes.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.validation.test.ts`
- `backend/src/modules/strategy-framework/**`
- `backend/src/modules/strategy-decision-engine/**`
- `backend/src/modules/today-trade-review/**`
- `backend/src/modules/trade-plan-risk-engine/**`
- `backend/src/modules/alerts-monitoring/**`
- `backend/src/modules/portfolio-management/**`
- `backend/src/modules/portfolio-intelligence/**`
- `backend/src/modules/watchlist-management/**`
- `backend/src/modules/ai-investment-copilot/**`
- `backend/src/modules/market-data-foundation/**`
- `frontend/src/**`
- shared backend utilities
- shared frontend components
- package manifests
- provider/live-data integration files
- paid/cloud, broker, or telemetry files

## Required Behavior

Future implementation must:

- keep `SignalResultDto.triggerContract` as the one canonical trigger-evidence packet for current Signal Generation read surfaces;
- avoid adding a second sibling trigger packet;
- make current non-legacy rows canonically self-describing with explicit field provenance, even when some business fields remain unavailable;
- surface persisted `created_at` and `updated_at`;
- surface run `status`, `startedAt`, and `completedAt` when the linked run row resolves;
- label `trigger_timestamp` semantics as source-price-date, source-data-date, or unavailable;
- label request-local read-path generation explicitly for `latestForInstrument()` fallback-created responses;
- label `asset_class`, `region`, `strategy_id`, and `strategy_version` as compatibility-only when derived from request-local enrichment;
- keep `trigger_price`, `timeframe`, rule ids, and richer lifecycle ownership unavailable;
- preserve strict DQ trusted read/run/latest behavior;
- preserve research-support language.

## Timestamp / Provenance Decision

This work packet adopts the following decision:

- current owned persisted row timestamps require repository reads and must be exposed;
- current owned run timing/status evidence requires repository relation reads and must be exposed when available;
- source-date timing may stay the basis for `trigger_timestamp`, but only with explicit semantics;
- request-local generation must remain visible as request-local even after persistence succeeds during the request.

## Dependencies

- `CF-W1-SIG-TRIGGER-01` is already in current `dev` through ancestor commit `6ab3999`.
- Accepted parked `CF-W1-SIG-TRIGGER-02A` commit `788c237` is not clean-integrated into current `dev`; Team 00 must sequence that dependency explicitly.
- Team 04 still needs a dedicated `CF-W1-SIG-02` QA plan.

## Parallel-Safety Rule

Do not run this child in parallel with any other packet that touches:

- `signal-generation-engine.service.ts`
- `signal-generation-engine.types.ts`
- `signal-generation-engine.repository.ts`
- `signal-generation-engine.md`
- the reserved Signal Generation focused tests

This child consumes the same backend writer set as the parked `CF-W1-SIG-TRIGGER-02A` semantics. One writer only.

## QA Handoff Notes For Team 04

Team 04 should prepare focused backend QA for:

- canonical `COMPLETE` status on current non-legacy rows;
- `LEGACY_INCOMPLETE` behavior on legacy rows;
- explicit packet-origin labeling for request-local generated latest-for-instrument responses;
- explicit compatibility-only labeling for asset/region and transient strategy provenance;
- persisted row timestamp exposure;
- run audit exposure only when the run row resolves;
- explicit source-date timestamp semantics;
- preserved unavailability for trigger price, timeframe, and rule ids;
- strict DQ fail-closed regression protection.

Suggested focused command after implementation exists:

```powershell
cd backend
npm.cmd test -- signal-generation-engine.repository.test.ts signal-generation-engine.service.test.ts signal-generation-engine.trigger-contract.test.ts signal-generation-dq-enforcement.invariants.test.ts --runInBand
npm.cmd run build
```

## Stop Conditions

Stop and return to Team 00 / Architect if implementation requires:

- any Prisma/schema/migration or generated-file change;
- any route-registry, controller, router, validation, module, config, or frontend change;
- any `strategy-framework`, `strategy-decision-engine`, `today-trade-review`, `trade-plan-risk-engine`, `alerts-monitoring`, `portfolio-management`, `portfolio-intelligence`, `watchlist-management`, `ai-investment-copilot`, or `market-data-foundation` source edit;
- any shared utility/UI, package, provider/live-data, paid/cloud, broker, or telemetry work;
- any durable rule-history, rule-defined trigger-price, shared-contract, or downstream-consumer adoption scope.

## Next Gate

Team 04 QA planning, then Team 00 Ready evaluation and sequencing.

Team 03 does not self-promote implementation.
