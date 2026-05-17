# CF-W1-SIG-TRIGGER-01 Work Packet

Date: 2026-05-17

## Work Item

First bounded Signal Generation trigger object DTO projection.

## State

Accepted for implementation under Product Owner Option A and standing delegation.

## Owner / Lane / Modules

- Owner: Team 06 Strategy / Signal / Risk implementation.
- Lane: Lane 2.
- Primary module: `signal-generation-engine`.

## Approved Files

- `backend/src/modules/signal-generation-engine/signal-generation-engine.types.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.service.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.md`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.service.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.trigger-contract.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.validation.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-dq-enforcement.invariants.test.ts`

## Implementation Tasks

- Add optional `triggerContract` DTO projection without replacing existing response fields.
- Derive only from current signal records and enrichment context.
- Mark missing fields as unavailable with explicit reasons.
- Mark legacy rows as `LEGACY_INCOMPLETE`.
- Mark incomplete non-legacy rows as `CONTRACT_INCOMPLETE`.
- Preserve existing Signal Generation DQ/read-path behavior.
- Document projection limitations.

## Forbidden Files

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- generated Prisma/client types
- backend or frontend route registries
- shared backend/frontend utilities or UI
- frontend files
- package manifests
- downstream consumer files
- provider, scheduler, startup, broker, Angel One, paid/cloud, or live-market-provider files

## Stop Conditions

Stop if implementation requires:
- Prisma schema or migration changes,
- changing public route paths,
- replacing current signal API response shapes instead of additive compatibility,
- inventing rule ids, trigger prices, lifecycle states, timestamps, DQ values, or audit evidence,
- adding arbitrary target prices,
- touching shared files without reservation,
- touching downstream consumers,
- adding paid/cloud/provider behavior.

## Validation Command

```powershell
cd backend
npm.cmd test -- signal-generation-engine.service.test.ts signal-generation-engine.trigger-contract.test.ts signal-generation-engine.validation.test.ts signal-generation-dq-enforcement.invariants.test.ts --runInBand
```

## Handoff Requirements

- Exact files changed and inspected.
- Trigger fields added or intentionally marked unavailable.
- Persistence/API compatibility decision used.
- Tests run and skipped.
- Contract gaps for legacy rows.
- Downstream consumers intentionally excluded.
- QA, code review, Architect, and Product Owner acceptance packets.
