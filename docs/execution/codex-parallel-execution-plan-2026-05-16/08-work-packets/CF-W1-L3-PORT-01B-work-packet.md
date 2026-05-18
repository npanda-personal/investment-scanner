# CF-W1-L3-PORT-01B Work Packet

Date: 2026-05-18

## Work Item

Watchlist-only readiness DTO child under `CF-W1-L3-PORT-01`.

## State

Child architecture packet prepared. Not Ready for Implementation.

This child is user-valuable, but it stays blocked until `CF-W1-L3-PORT-01A` is accepted so watchlist readiness reuses an accepted portfolio readiness shape.

## Owner / Lane / Module

- Architecture owner: Team 03 Architecture Factory.
- Future implementation owner: Team 07 Portfolio / Watchlists / Alerts.
- Lane: Lane 3.
- Module: `watchlist-management`.

## Allowed Files After Ready Promotion

- `backend/src/modules/watchlist-management/watchlist-management.service.ts`
- `backend/src/modules/watchlist-management/watchlist-management.types.ts`
- `backend/src/modules/watchlist-management/watchlist-management.md`
- `backend/tests/modules/watchlist-management/watchlist-management.service.test.ts`

## Current Forbidden Files

- application source or tests before Team 00 promotion
- portfolio-management source/tests
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- backend and frontend route registries
- Data Quality Engine source or public export changes
- shared backend utilities
- shared frontend components
- package manifests
- generated files
- alerts-monitoring source/tests
- portfolio-intelligence source/tests
- frontend feature files
- providers, startup/backfill, paid/cloud, broker, or telemetry flows

## Required Behavior

Future implementation must:

- read DQ evaluations through public DQ service boundaries only;
- attach readiness evidence to each watchlist row;
- attach an aggregate readiness summary to watchlist detail;
- keep `LIMITED` passive only and keep blocked/missing/stale/unsupported states untrusted;
- preserve existing current price, daily move, latest signal, `researchUrl`, and sort behavior.

## QA Handoff Needed

Team 04 should prepare focused backend QA for:

- ready watchlist rows;
- limited watchlist rows;
- missing DQ rows;
- blocked or stale rows;
- backward-compatible existing watchlist fields.

Suggested focused command after implementation exists:

```powershell
cd backend
npm.cmd test -- watchlist-management.service.test.ts --runInBand
```

## Stop Conditions

Stop and return to Team 00 / Architect if implementation requires:

- portfolio file edits;
- DQ source/export changes;
- route or Prisma changes;
- frontend/shared UI work;
- alerts or portfolio-intelligence behavior changes;
- promoting before `CF-W1-L3-PORT-01A` acceptance.

## Next Gate

Wait for accepted `CF-W1-L3-PORT-01A`, then route to Team 04 QA prep and Team 00 Ready evaluation as an independent watchlist-only slice.
