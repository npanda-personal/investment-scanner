# CF-W1-SIG-TRIGGER-01 Work Packet Draft

Date: 2026-05-17

## Work Item

Full trigger object contract completion for Signal Generation Engine and downstream consumers.

## State

Blocked after docs-only architecture and contract drafting.

Implementation has not started.

## Owner / Lane / Modules

- Owner: Team 06 Strategy / Signal / Risk implementation agent after assignment.
- Lane: Lane 2.
- Primary module: `signal-generation-engine`.
- Consumers to coordinate later: signal quality, signal calibration, strategy decision, trade plan risk, alerts, research workbench, portfolio/watchlist context, and UI.

## Dependencies

- Product Owner acceptance of trigger language and lifecycle semantics.
- Architect acceptance of persistence strategy: DTO projection, persisted JSON snapshot, or normalized trigger table.
- QA plan for required fields, legacy contract-incomplete records, DQ status, rule provenance, and API compatibility.
- Orchestrator file reservation for any source, test, Prisma, route, shared, or frontend files.

## Current Allowed Files

Docs-only prep has already produced this work packet and the related contract/readiness draft.

No implementation files are allowed yet.

## Forbidden Files Until Accepted

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- generated Prisma/client types
- `backend/src/api/routes.ts`
- `frontend/src/app/routes.tsx`
- `backend/src/shared/**`
- `frontend/src/shared/**`
- package manifests
- provider, scheduler, startup, broker, Angel One, or live-market-provider files
- broad downstream consumer files outside a later bounded slice

## Future Implementation Slice Candidates

### Slice 1 - Contract projection only

Possible only if Product Owner and Architect accept DTO projection as the first step.

Likely file reservation:

- `backend/src/modules/signal-generation-engine/signal-generation-engine.types.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.service.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.repository.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.md`
- focused signal-generation tests

Stop if a schema, route, shared type, or frontend change is needed.

### Slice 2 - Persisted contract snapshot

Possible only after schema/storage approval.

Likely additional file reservation:

- `backend/prisma/schema.prisma`
- migration files
- generated Prisma artifacts
- signal generation repository/service files
- focused migration and contract tests

This slice requires Product Owner, Architect, Orchestrator, and QA approval before source work.

### Slice 3 - Downstream consumer adoption

Split by consumer. Do not implement all consumers at once.

Potential future slices:

- alerts trigger consumption,
- strategy decision trigger consumption,
- trade plan trigger consumption,
- research/detail UI consumption,
- quality/calibration trigger evidence.

Each consumer slice needs its own file reservation and QA scope.

## Stop Conditions

Stop and return to Orchestrator/Architect if implementation requires:

- Prisma schema or migration changes without accepted ADR/decision,
- changing public route paths,
- replacing current signal API response shapes instead of additive compatibility,
- inventing rule ids, trigger prices, lifecycle states, or data quality values,
- adding arbitrary target prices,
- changing strategy meaning without versioning,
- touching shared files without reservation,
- adding paid/cloud/provider behavior.

## Future Validation Commands

Do not run during docs-only prep. Later implementation owner should run focused tests/builds after code changes.

Minimum future validation expectation:

```powershell
cd backend
npm.cmd test -- signal-generation-engine --runInBand
```

The exact command must be confirmed by QA against existing test names before execution.

## Handoff Requirements

Future implementation handoff must include:

- exact files changed and inspected,
- trigger fields added or intentionally marked unavailable,
- persistence/API compatibility decision used,
- DQ evidence mapping,
- rule and strategy provenance mapping,
- tests run and skipped,
- contract gaps for legacy rows,
- downstream consumers intentionally excluded,
- QA, code review, Architect, and Product Owner next gates.

