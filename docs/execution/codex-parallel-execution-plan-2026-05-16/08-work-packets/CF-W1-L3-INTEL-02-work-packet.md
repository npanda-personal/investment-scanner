# CF-W1-L3-INTEL-02 Work Packet

Date: 2026-05-18

## Work Item

Portfolio Intelligence review traceability.

## State

Architecture packet prepared. Not Ready for Implementation.

This child is downstream of accepted `CF-W1-L3-PORT-01A` and shares the exact `portfolio-intelligence` file set with `CF-W1-L3-INTEL-01`.

## Owner / Lane / Module

- Architecture owner: Team 03 Architecture Factory.
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
- alerts-monitoring source/tests
- watchlist-management source/tests
- frontend feature files
- providers, startup/backfill, paid/cloud, broker, or telemetry flows

## Required Behavior

Future implementation must:

- consume accepted portfolio readiness metadata from Portfolio Management;
- add review traceability metadata that distinguishes reliable, limited, diagnostic, and blocked states;
- surface source modules, blocker reasons, and latest trusted data date where available;
- preserve existing Portfolio Intelligence response fields and route behavior;
- avoid duplicating DQ scoring logic.

## QA Handoff Needed

Team 04 should prepare focused backend QA for:

- reliable review traceability;
- limited review traceability;
- diagnostic review traceability;
- blocked review traceability;
- source-module and blocker propagation;
- backward-compatible existing response fields.

Suggested focused command after implementation exists:

```powershell
cd backend
npm.cmd test -- portfolio-intelligence.service.test.ts --runInBand
```

## Stop Conditions

Stop and return to Team 00 / Architect if implementation requires:

- Portfolio Management source changes;
- DQE source/export changes;
- watchlist readiness changes;
- route or Prisma changes;
- frontend/shared UI work;
- splitting this child in parallel with `CF-W1-L3-INTEL-01`.

## Next Gate

Wait for accepted `CF-W1-L3-PORT-01A`, then Team 00 may choose either:

- one combined `CF-W1-L3-INTEL-01` plus `CF-W1-L3-INTEL-02` implementation packet, or
- a strict sequence with one writer on `portfolio-intelligence` at a time.
