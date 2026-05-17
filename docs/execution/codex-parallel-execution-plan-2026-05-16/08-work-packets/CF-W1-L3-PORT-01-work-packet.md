# CF-W1-L3-PORT-01 Work Packet

Date: 2026-05-17

## Work Item

Portfolio and watchlist passive display readiness DTOs.

Parent: `CF-W1-L3-DQ-01`

## State

Architecture child packet prepared. Not Ready for Implementation.

This packet converts the accepted Lane 3 Option B policy into exact backend-only child reservations for portfolio and watchlist DTO enrichment. Team 04 QA planning and Team 00 Ready promotion are still required before source work starts.

## Owner / Lane / Modules

- Architecture owner: Team 03 Architecture Factory.
- Future implementation owner: Team 07 Portfolio / Watchlists / Alerts.
- Lane: Lane 3.
- Modules: `portfolio-management` and `watchlist-management`.

## Implementation Split

Default split:

- `CF-W1-L3-PORT-01A`: portfolio-management readiness DTOs.
- `CF-W1-L3-PORT-01B`: watchlist-management readiness DTOs.

Do not implement both in one pass unless Team 00 explicitly records a combined backend-only exception and Team 04 accepts combined focused QA scenarios.

## Allowed Files After Ready Promotion

Portfolio child slice:

- `backend/src/modules/portfolio-management/portfolio-management.service.ts`
- `backend/src/modules/portfolio-management/portfolio-management.types.ts`
- `backend/src/modules/portfolio-management/portfolio-management.md`
- `backend/tests/modules/portfolio-management/portfolio-management.service.test.ts`

Watchlist child slice:

- `backend/src/modules/watchlist-management/watchlist-management.service.ts`
- `backend/src/modules/watchlist-management/watchlist-management.types.ts`
- `backend/src/modules/watchlist-management/watchlist-management.md`
- `backend/tests/modules/watchlist-management/watchlist-management.service.test.ts`

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
- Signal Generation source
- Alerts Monitoring source
- Portfolio Intelligence source
- frontend feature files
- providers, schedulers, startup/backfill, Angel One, broker, live-provider, paid/cloud, or telemetry flows

## Required Behavior

The future implementation must:

- inject or instantiate `DataQualityEngineService` through the Data Quality public module export;
- call Data Quality latest/batch evaluation methods for portfolio holdings or watchlist items;
- attach readiness evidence to each holding or item;
- attach an aggregate readiness summary to the portfolio summary or watchlist detail;
- mark `LIMITED` as passive display only;
- mark missing, blocked, stale hard blocker, unsupported, `NOT_READY`, or `UNUSABLE` evidence as blocked/untrusted;
- preserve existing DTO fields and route behavior.

## QA Handoff Needed

Team 04 must prepare or refresh focused backend QA scenarios before this packet can be pulled. Minimum scenarios:

- READY Data Quality evaluation.
- LIMITED Data Quality evaluation.
- Missing Data Quality evaluation.
- NOT_READY or blocked tier evaluation.
- Existing backward-compatible price/signal fields.
- Public Data Quality service boundary use.

Suggested focused commands after implementation exists:

```powershell
cd backend
npm.cmd test -- portfolio-management.service.test.ts --runInBand
```

```powershell
cd backend
npm.cmd test -- watchlist-management.service.test.ts --runInBand
```

Run only the command for the child slice actually implemented unless Team 00 approves a combined pass.

## Stop Conditions

Stop and return to Team 00 / Architect if implementation requires:

- Data Quality Engine source/export changes;
- shared helper or shared DTO files;
- route registry changes;
- Prisma/schema/migration changes;
- frontend or shared UI work;
- alert event suppression;
- portfolio-intelligence scoring changes;
- provider/live-data/startup behavior;
- a new Product Owner exception for `LIMITED` action-like behavior.

## Next Gate

Team 04 QA child-plan refresh, then Team 00 may promote one child slice to `Ready for Implementation` if no shared/high-risk blockers remain.
