# CF-W1-L3-AUTH-03 Work Packet

Date: 2026-05-17

## Work Item

Alert rule target ownership validation for portfolio and watchlist rule references.

## State

Focused work packet prepared. Not Ready for Implementation.

## Owner / Lane / Module

- Future implementation owner: Team 07 Portfolio / Watchlists / Alerts.
- Lane: Lane 3.
- Module: `alerts-monitoring`.

## Allowed Files After Ready Promotion

- `backend/src/modules/alerts-monitoring/alerts-monitoring.service.ts`
- `backend/src/modules/alerts-monitoring/alerts-monitoring.repository.ts`
- `backend/src/modules/alerts-monitoring/alerts-monitoring.types.ts`
- `backend/src/modules/alerts-monitoring/alerts-monitoring.md`
- `backend/tests/modules/alerts-monitoring/alerts-monitoring.service.test.ts`
- `backend/tests/modules/alerts-monitoring/alerts-monitoring.ownership.test.ts`

## Current Forbidden Files

- application source or tests before Ready promotion
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- backend and frontend route registries
- shared backend utilities
- shared frontend components
- package manifests
- generated files
- auth-identity source
- portfolio-management source/tests
- watchlist-management source/tests
- notifications-delivery or copilot digest consumers
- frontend feature files
- providers, schedulers, startup/backfill, Angel One, broker, live-provider, paid/cloud, or telemetry flows

## Required Behavior

The future implementation must:

- validate portfolio rule targets through current-user public portfolio service reads;
- validate watchlist rule targets through current-user public watchlist service reads;
- revalidate effective targets during update after merging existing rule and update payload;
- preserve existing rule/event response compatibility;
- preserve parent-rule event ownership from `CF-W1-L3-AUTH-02`;
- ensure evaluation uses the rule owner for portfolio/watchlist lookups.

## QA Handoff Needed

Use `04-qa/CF-W1-L3-AUTH-03-qa-plan.md` after Team 00 promotes this packet.

Suggested focused command after implementation exists:

```powershell
cd backend
npm.cmd test -- alerts-monitoring.service.test.ts alerts-monitoring.ownership.test.ts --runInBand
```

## Stop Conditions

Stop and return to Team 00 / Architect if implementation requires:

- Prisma/schema/migration changes;
- route registry or auth middleware changes;
- shared utility or shared DTO files;
- frontend, notification, or copilot changes;
- Data Quality readiness suppression;
- new Product Owner policy for legacy null-owner resources;
- broader platform `default-user` policy decisions.

## Next Gate

Do not promote in parallel with `CF-W1-L3-ALERT-01`. Both slices share the same `alerts-monitoring` service/types/doc/test files.

Team 00 Ready promotion with exact reservations.
