# CF-W1-MD-01 Work Packet

Date: 2026-05-18

Owner: Team 03 Architecture Factory

State: Post-decision validation-only packet prepared. Not Ready for Implementation.

## Work Item

Market Data Foundation historical-price validation hardening under Option A.

## Allowed Files After Ready Promotion

- `backend/src/modules/market-data-foundation/market-data-foundation.validation.ts`
- `backend/tests/modules/market-data-foundation/market-data.validation.test.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.md`

## Forbidden Files

- Market Data repository source/tests unless a new packet reserves them
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

- Add future-date validation with an explicit evaluation-date/latest-session boundary.
- Add accepted `adjustedClose` validation.
- Represent missing `adjustedClose` as fallback/incomplete evidence without claiming trusted completeness.
- Keep negative volume invalid and handle zero/suspicious volume per Option A.
- Preserve duplicate and opt-in spike behavior.
- Update module docs with validation limitations and non-goals.

## Suggested Focused Commands After Implementation

```powershell
cd backend
npm.cmd test -- market-data.validation.test.ts --runInBand
```

If readiness evidence or repository behavior is separately reserved:

```powershell
cd backend
npm.cmd test -- market-data.validation.test.ts market-data-readiness-evidence.invariants.test.ts market-data.repository.test.ts --runInBand
```

## Stop Conditions

Stop and return to Team 00 / Architect if implementation requires repository, durable storage, Prisma, generated, provider, startup/backfill, shared utility, package, route, frontend, Angel One, live provider, paid/cloud, telemetry, broker, or Data Quality Engine scope.

## Next Gate

Team 05/Team 04 review, then Team 00 Ready promotion with exact validation-only handoff.
