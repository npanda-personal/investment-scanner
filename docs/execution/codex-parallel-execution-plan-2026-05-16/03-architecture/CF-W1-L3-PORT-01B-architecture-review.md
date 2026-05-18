# CF-W1-L3-PORT-01B Architecture Review

Date: 2026-05-18

Owner: Team 03 Architecture Factory

## Status

Watchlist-only child architecture packet prepared. Not Ready for Implementation.

This child inherits the accepted parent `CF-W1-L3-PORT-01` contract and remains upstream-blocked until `CF-W1-L3-PORT-01A` is accepted.

## Evidence Inspected

- `AGENTS.md`
- `10-requirements/CF-W1-L3-PORT-01B-watchlist-readiness-dto-requirement.md`
- `03-architecture/CF-W1-L3-PORT-01-architecture-review.md`
- `06-contracts/CF-W1-L3-PORT-01-portfolio-watchlist-readiness-dto-contract.md`
- `08-work-packets/CF-W1-L3-PORT-01-work-packet.md`
- `backend/src/modules/watchlist-management/watchlist-management.service.ts`
- `backend/src/modules/watchlist-management/watchlist-management.types.ts`
- `backend/src/modules/watchlist-management/watchlist-management.md`
- `backend/tests/modules/watchlist-management/watchlist-management.service.test.ts`
- `backend/src/modules/data-quality-engine/index.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.service.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.types.ts`

## Current Source Findings

- `watchlist-management.detail()` reads the owned watchlist, lists items, enriches current price and latest signal, and returns no Data Quality readiness evidence.
- `WatchlistDashboardItemDto` has `currentPrice`, `dailyChangePercent`, `latestSignal`, and `researchUrl`, but no readiness fields.
- `WatchlistDetailDto` has no readiness summary field.
- The module already receives `userId` at the watchlist boundary; this child is about readiness DTOs, not watchlist ownership mutation rules.

## Architecture Decision

Prepare `CF-W1-L3-PORT-01B` as a watchlist-only child that reuses the parent readiness DTO contract and does not touch portfolio files.

The child must:

- consume DQE public outputs only;
- add `readiness` to each watchlist dashboard item;
- add `readinessSummary` to the watchlist detail DTO;
- preserve existing watchlist fields and sorting behavior;
- surface `LIMITED`, missing, stale, blocked, unsupported, or scope-mismatched DQ states as limited or blocked context rather than trusted readiness.

## Exact Future File Reservations

- `backend/src/modules/watchlist-management/watchlist-management.service.ts`
- `backend/src/modules/watchlist-management/watchlist-management.types.ts`
- `backend/src/modules/watchlist-management/watchlist-management.md`
- `backend/tests/modules/watchlist-management/watchlist-management.service.test.ts`

## Forbidden Files

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

## Dependency And Independence Notes

- `CF-W1-L3-PORT-01B` depends on accepted `CF-W1-L3-PORT-01A` DTO naming and mapping semantics so the watchlist child does not diverge from the established portfolio readiness contract.
- It does not require simultaneous portfolio file edits once `CF-W1-L3-PORT-01A` is accepted.
- After `CF-W1-L3-PORT-01A` acceptance, `CF-W1-L3-PORT-01B` can run independently as a watchlist-only backend slice inside the exact watchlist file reservation above.

## Required QA Scenarios

Focused backend QA should prove:

- ready DQ adds trusted watchlist readiness evidence;
- limited DQ keeps passive display only;
- missing DQ yields blocked readiness;
- stale or blocked tier evidence yields blocked readiness;
- existing current price, daily move, latest signal, and `researchUrl` fields remain backward-compatible.

## Readiness Result

Architecture packet prepared. Not Ready for Implementation.

The file reservations are exact, but Team 00 should keep this child blocked until `CF-W1-L3-PORT-01A` is accepted and the shared readiness shape is stable in accepted source.
