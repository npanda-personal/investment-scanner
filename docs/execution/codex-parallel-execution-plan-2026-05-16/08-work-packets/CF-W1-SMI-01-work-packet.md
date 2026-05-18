# CF-W1-SMI-01 Work Packet

Date: 2026-05-18

## Work Item

Smart Money evidence freshness and partial-trust framing.

## State

Architecture packet prepared. Ready candidate after Team 04 QA planning and Team 00 sequencing.

This is a bounded backend-only `smart-money-intelligence` slice. It stays inside the Smart Money backend module, module docs, and focused module tests.

## Owner / Lane / Module

- Architecture owner: Team 03 Architecture Factory
- Future implementation owner: Team 06 Strategy / Signals / Risk
- Lane: Lane 2
- Backend module: `smart-money-intelligence`

## Allowed Files After Ready Promotion

- `backend/src/modules/smart-money-intelligence/smart-money-intelligence.service.ts`
- `backend/src/modules/smart-money-intelligence/smart-money-intelligence.types.ts`
- `backend/src/modules/smart-money-intelligence/smart-money-intelligence.md`
- `backend/tests/modules/smart-money-intelligence/smart-money-intelligence.service.test.ts`

## Current Forbidden Files

- application source or tests before Team 00 promotion
- `backend/src/modules/smart-money-intelligence/smart-money-intelligence.repository.ts`
- `backend/src/modules/smart-money-intelligence/smart-money-intelligence.controller.ts`
- `backend/src/modules/smart-money-intelligence/smart-money-intelligence.router.ts`
- `backend/src/modules/smart-money-intelligence/smart-money-intelligence.validation.ts`
- `backend/src/modules/smart-money-intelligence/smart-money-intelligence.provider.ts`
- `backend/src/modules/smart-money-intelligence/smart-money-intelligence.module.ts`
- `backend/src/modules/smart-money-intelligence/index.ts`
- `backend/tests/modules/smart-money-intelligence/smart-money-intelligence.routes.test.ts`
- `backend/tests/modules/smart-money-intelligence/smart-money-intelligence.validation.test.ts`
- `backend/src/modules/market-data-foundation/**`
- `backend/src/modules/data-quality-engine/**`
- `backend/src/api/routes.ts`
- all `frontend/src/features/smart-money-intelligence/**`
- all `frontend/tests/ui/**`
- `frontend/src/app/routes.tsx`
- shared backend utilities
- shared frontend components
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- package manifests
- generated files
- provider/live-data integration
- startup/backfill workflows
- paid/cloud, broker, or telemetry flows

## Required Behavior

Future implementation must:

- add additive Smart Money evidence metadata to existing stock/list summary payloads;
- distinguish persisted daily snapshot evidence from on-demand derived detail fallback;
- expose requested range, snapshot/data-through framing, and ownership-gap trust state;
- keep downstream-safe usage tied to `latestPersistedStock()` and `latestPersistedStocks()` only;
- preserve existing routes, query params, and current Smart Money scoring behavior;
- preserve research-support language.

## Sequencing Rule

Do not promote or implement this packet in parallel with any other future `smart-money-intelligence` source packet.

Current pass note:

- no active same-module implementation writer was visible in the provided assignment context;
- Team 00 must still preserve one writer per file if another Smart Money packet opens before this one lands.

## QA Handoff Needed

Team 04 can start QA planning now.

Minimum scenarios:

- current persisted snapshot with ownership placeholder is visible as limited trust, persisted, and current;
- stale persisted snapshot is visible as stale/limited rather than silently trusted;
- missing persisted snapshot stays a data gap on `latestPersistedStock()` and does not trigger fallback calculation;
- `stock()` fallback is explicit as on-demand derived and not downstream-safe;
- insufficient-data fallback remains unavailable and explainable;
- list ordering/ranking remains unchanged while additive evidence fields are present.

Suggested focused commands after implementation exists:

```powershell
cd backend
npm.cmd test -- smart-money-intelligence.service.test.ts --runInBand
npm.cmd run build
```

Team 04 should explicitly record that frontend Smart Money trust-surface work is deferred from this child.

## Stop Conditions

Stop and return to Team 00 / Architect if implementation requires:

- repository changes;
- schema, migration, or generated-type changes;
- route-registry edits;
- shared utility or shared UI changes;
- Market Data source changes;
- Data Quality source changes;
- provider/live-data integration;
- startup/backfill orchestration changes;
- package changes;
- frontend implementation.

## Notes For Team 00

- This packet is a genuine bounded first child. No split is required inside the narrowed slice.
- The child is intentionally backend-only even though the current Smart Money page would benefit from later trust-surface rendering.
- The clean next gate is Team 04 QA planning, followed by Team 00 Ready evaluation for one bounded Team 06 writer pass.

## Next Gate

Team 04 QA planning, then Team 00 Ready evaluation and sequencing.
