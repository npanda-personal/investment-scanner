# CF-W1-SIG-TRIGGER-02 Work Packet

Date: 2026-05-18

## Work Item

`CF-W1-SIG-TRIGGER-02A` first child only: persisted Signal Generation trigger audit surfacing and provenance labeling.

## State

Split required. First child prepared for QA planning only. Not Ready for Implementation.

This work packet does not authorize the full parent requirement. It covers only the smallest `signal-generation-engine` slice that can be implemented without schema work, shared-contract work, Strategy Framework edits, or downstream consumer changes.

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

## Exact Forbidden File Reservations For This Child

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- generated Prisma/types files
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

## Required First-Child Behavior

Future implementation must:

- surface existing persisted `SignalResult.createdAt` and `SignalResult.updatedAt` inside additive trigger audit metadata;
- surface existing run `status`, `startedAt`, and `completedAt` metadata when `generationRunId` resolves to a run row;
- label trigger field provenance so persisted evidence is distinguishable from compatibility-only transient enrichment;
- label `trigger_timestamp` semantics explicitly when populated from `sourcePriceDate` or `sourceDataDate`;
- keep research-support language and preserve DQ fail-closed behavior;
- keep `trigger_price`, rule ids, timeframe, and any still-unproven lifecycle semantics unavailable rather than invented.

Optional lifecycle rule:

- populate `lifecycle_status` only if the implementation can honestly map the module-owned row to `detected` and nothing richer;
- otherwise keep `lifecycle_status` unavailable.

## Explicit Parent Blocker

Stop treating the full parent as one Ready packet.

The full requirement still needs later approval-gated work if Team 00 wants:

- durable strategy/rule provenance rather than compatibility-only transient strategy matches;
- rule-defined trigger price;
- richer lifecycle ownership;
- downstream consumer adoption in Strategy Decision, Today Review, Trade Plan, Alerts, Portfolio, Watchlists, or Copilot;
- schema/shared contract changes.

## QA Planning Handoff For Team 04

Executable verification for the first child should stay focused on:

- persisted `created_at` and `updated_at` exposure for current rows;
- additive run audit metadata for run-linked rows;
- explicit `trigger_timestamp` semantics;
- compatibility-only marking for transient strategy-match provenance;
- continued unavailability for `trigger_price`, rule ids, timeframe, and any unproven lifecycle state;
- legacy row handling;
- no regression to strict DQ trusted read/run/latest behavior.

Suggested focused command after implementation exists:

```powershell
cd backend
npm.cmd test -- signal-generation-engine.repository.test.ts signal-generation-engine.service.test.ts signal-generation-engine.trigger-contract.test.ts signal-generation-dq-enforcement.invariants.test.ts --runInBand
```

## Stop Conditions

Stop and return to Team 00 / Architect if implementation requires:

- any Prisma/schema/migration or generated-file change;
- any route-registry, controller, router, validation, or frontend change;
- any Strategy Framework, Strategy Decision, Today Review, Trade Plan, Alerts, Portfolio, Watchlists, Copilot, or Market Data source edit;
- any shared utility/UI, package, provider/live-data, paid/cloud, broker, or telemetry work;
- any attempt to claim durable rule provenance or rule-defined trigger price from evidence the module does not persist.

## Next Gate

Team 04 focused QA planning for the bounded first child, then Team 00 sequencing.
