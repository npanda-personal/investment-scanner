# CF-W1-L3-INTEL-01 Work Packet

Date: 2026-05-17

## Work Item

Portfolio Intelligence reliability gate.

Parent: `CF-W1-L3-DQ-01`

Upstream dependency: `CF-W1-L3-PORT-01A`

## State

Draft work packet prepared. Not Ready for Implementation.

## Owner / Lane / Module

- Future implementation owner: Team 07 Portfolio / Watchlists / Alerts.
- Lane: Lane 3.
- Module: `portfolio-intelligence`.

## Allowed Files After Ready Promotion

- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.service.ts`
- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.types.ts`
- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.md`
- `backend/tests/modules/portfolio-intelligence/portfolio-intelligence.service.test.ts`

## Current Forbidden Files

- application source or tests before Ready promotion
- `backend/src/modules/portfolio-management/**`
- `backend/src/modules/data-quality-engine/**`
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- backend and frontend route registries
- shared backend utilities
- shared frontend components
- package manifests
- generated files
- alerts-monitoring source
- frontend feature files
- providers, schedulers, startup/backfill, Angel One, broker, live-provider, paid/cloud, or telemetry flows

## Required Behavior

The future implementation must:

- consume `readinessSummary` and holding readiness metadata from Portfolio Management;
- add portfolio-intelligence reliability metadata;
- treat missing readiness metadata as blocked;
- treat `LIMITED` as diagnostic only;
- block or downgrade action-like reliability claims when readiness is not `READY`;
- preserve existing public response fields and route behavior;
- avoid duplicating Data Quality scoring logic.

## QA Handoff Needed

Use `04-qa/CF-W1-L3-INTEL-01-qa-plan.md` after upstream `CF-W1-L3-PORT-01A` is accepted and Team 00 promotes this packet.

Suggested focused command after implementation exists:

```powershell
cd backend
npm.cmd test -- portfolio-intelligence.service.test.ts --runInBand
```

## Stop Conditions

Stop and return to Team 00 / Architect if implementation requires:

- Portfolio Management source changes;
- Data Quality Engine source/export changes;
- shared helper or shared DTO files;
- route registry changes;
- Prisma/schema/migration changes;
- frontend or shared UI work;
- alert suppression;
- provider/live-data/startup behavior;
- new Product Owner policy around existing action labels.

## Next Gate

Wait for `CF-W1-L3-PORT-01A` implementation acceptance, then Team 00 may evaluate this child for Ready promotion.
