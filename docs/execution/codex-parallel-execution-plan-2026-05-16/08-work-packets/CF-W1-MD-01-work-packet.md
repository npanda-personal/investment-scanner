# CF-W1-MD-01 Work Packet

Date: 2026-05-18

Owner: Team 03 Architecture Factory

State: Narrowed post-decision validation-only packet prepared after Team 05 readiness inspection. Not Ready for Implementation.

## Work Item

Market Data Foundation reject-only historical-price validation hardening under Option A.

## Allowed Files After Ready Promotion

- `backend/src/modules/market-data-foundation/market-data-foundation.validation.ts`
- `backend/tests/modules/market-data-foundation/market-data.validation.test.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.md`

## Forbidden Files

- Market Data repository source/tests unless a new packet reserves them
- `backend/src/modules/market-data-foundation/market-data-foundation.provider.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.exchange-eod-adapter.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.angel-one-provider.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.scheduler.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.worker.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.queue.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.router.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.controller.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.types.ts`
- `backend/tests/modules/market-data-foundation/market-data-readiness-evidence.invariants.test.ts`
- `backend/tests/modules/market-data-foundation/market-data-storage-readiness.invariants.test.ts`
- Data Quality Engine source/tests
- Prisma schema or migrations
- generated files
- route registries
- shared backend utilities
- package manifests
- providers, schedulers, startup/backfill, repair/sync/import jobs, Angel One, broker, live-provider, paid/cloud, telemetry
- frontend or shared UI files
- durable readiness storage under `CF-W1-MD-02`

## Required Implementation

- Add future-date rejection with a backward-compatible optional boundary input or validator-local default behavior only.
- Add accepted `adjustedClose` validation when `adjustedClose` is present.
- Keep negative volume invalid.
- Preserve duplicate and opt-in spike behavior.
- Update module docs with narrowed validation limitations, non-goals, and deferred evidence work.

## Explicitly Deferred From This Child

- missing `adjustedClose` fallback/incomplete evidence;
- zero-volume or suspicious-volume warning/readiness evidence;
- suspicious-volume thresholds or warning reason strings;
- repository/provider/startup/backfill plumbing for a system-wide latest-session boundary;
- readiness/storage invariant tests under `CF-W1-MD-02`.

## Suggested Focused Commands After Implementation

```powershell
cd backend
npm.cmd test -- market-data.validation.test.ts --runInBand
```

## Stop Conditions

Stop and return to Team 00 / Architect if implementation requires repository, durable storage, Prisma, generated, provider, startup/backfill, shared utility, package, route, frontend, Angel One, live provider, paid/cloud, telemetry, broker, Data Quality Engine scope, readiness/storage invariant tests, or a validator-owned warning/evidence channel.

## Next Gate

Team 04 QA-plan narrowing, then Team 00 Ready promotion with exact validation-only handoff.
