# CF-W1-L3-ALERT-01 Work Packet

Date: 2026-05-17

## Work Item

Alert readiness suppression for action-like alert event creation.

Parent: `CF-W1-L3-DQ-01`

Related completed slice: `CF-W1-L3-AUTH-02`

## State

Architecture child packet prepared. Not Ready for Implementation.

Team 04 must refresh/accept the alert child QA plan, and Team 00 must promote the exact file reservation before source work starts.

## Owner / Lane / Module

- Architecture owner: Team 03 Architecture Factory.
- Future implementation owner: Team 07 Portfolio / Watchlists / Alerts.
- Lane: Lane 3.
- Module: `alerts-monitoring`.

## Allowed Files After Ready Promotion

- `backend/src/modules/alerts-monitoring/alerts-monitoring.service.ts`
- `backend/src/modules/alerts-monitoring/alerts-monitoring.types.ts`
- `backend/src/modules/alerts-monitoring/alerts-monitoring.md`
- `backend/tests/modules/alerts-monitoring/alerts-monitoring.service.test.ts`

Optional only if ownership-sensitive behavior is touched:

- `backend/tests/modules/alerts-monitoring/alerts-monitoring.ownership.test.ts`

## Current Forbidden Files

- application source or tests before Ready promotion
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- backend and frontend route registries
- shared backend utilities
- shared frontend components
- package manifests
- generated types
- Data Quality Engine source or public exports
- Portfolio Management source
- Watchlist Management source
- Portfolio Intelligence source
- frontend feature files
- notifications-delivery or copilot digest consumers
- providers, schedulers, startup/backfill, Angel One, broker, live-provider, paid/cloud, or telemetry flows

## Required Behavior

The future implementation must:

- consume `DataQualityEngineService` through the public Data Quality module export;
- suppress stock, portfolio, and watchlist alert events unless the instrument has `READY` alert readiness;
- treat `LIMITED` as blocked for alert creation;
- treat missing DQ, `NOT_READY`, blocked tier, stale hard blocker, unsupported, scope mismatch, provider gap, and `UNUSABLE` as blocked;
- add readiness suppression evidence to `AlertEvaluationResult`;
- add Data Quality evidence to created event metadata;
- preserve duplicate suppression;
- preserve parent-rule event ownership behavior from `CF-W1-L3-AUTH-02`.

## QA Handoff Needed

Team 04 should refresh `04-qa/CF-W1-L3-ALERT-01-qa-plan.md` against the accepted child contract before this packet can be pulled.

Minimum scenarios:

- READY stock price/signal alert can create an event when the rule condition matches.
- missing DQ suppresses stock alert creation.
- LIMITED suppresses stock, portfolio, and watchlist alert creation.
- NOT_READY or blocked tier suppresses stock, portfolio, and watchlist alert creation.
- created event metadata carries Data Quality evidence.
- suppression evidence appears in evaluation result.
- duplicate suppression remains intact.

Suggested focused command after implementation exists:

```powershell
cd backend
npm.cmd test -- alerts-monitoring.service.test.ts alerts-monitoring.validation.test.ts --runInBand
```

Ownership regression command only if event ownership paths are touched:

```powershell
cd backend
npm.cmd test -- alerts-monitoring.service.test.ts alerts-monitoring.ownership.test.ts alerts-monitoring.routes.test.ts --runInBand
```

## Stop Conditions

Stop and return to Team 00 / Architect if implementation requires:

- `LIMITED` alert creation;
- Data Quality Engine source/export changes;
- shared helper or shared DTO files;
- route registry changes;
- Prisma/schema/migration changes;
- frontend or shared UI work;
- notification or copilot digest changes;
- provider/live-data/startup behavior;
- alert ownership model changes;
- direct financial advice or trade-instruction language.

## Next Gate

Team 04 QA child-plan refresh, then Team 00 may promote the `alerts-monitoring` backend slice to `Ready for Implementation` if no shared/high-risk blockers remain.
