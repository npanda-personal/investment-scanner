# CF-W1-L3-PORT-01B Work Packet

Date: 2026-05-18

## Work Item

Watchlist-only readiness DTO child under `CF-W1-L3-PORT-01`.

## State

Child architecture packet refreshed. READY-CANDIDATE for Team 00 sequencing.

Team 00 confirmed `CF-W1-L3-PORT-01A` is stable and accepted on branch `codex/team07-portfolio-alerts/CF-W1-L3-PORT-01A` at commit `f1432e6`, with delegated Product Owner acceptance recorded in `09-summaries/CF-W1-L3-PORT-01A-po-acceptance-packet.md`.

This child is now bounded enough for Team 00 Ready evaluation. Current `dev` does not contain `f1432e6`, so implementation should stack on `f1432e6` unless Team 00 first confirms a later clean `dev` contains `f1432e6`.

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
- starting from an unstacked `dev` base that omits accepted `CF-W1-L3-PORT-01A` commit `f1432e6`.

## Next Gate

Team 00 Ready evaluation as an independent watchlist-only slice. If promoted before `f1432e6` is integrated into `dev`, create the implementation branch/worktree from `f1432e6`; otherwise use the later clean `dev` containing `f1432e6`.
