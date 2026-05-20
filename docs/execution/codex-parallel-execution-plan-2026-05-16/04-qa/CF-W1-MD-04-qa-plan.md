# CF-W1-MD-04 QA Plan

Date: 2026-05-19

Owner: Team 04 QA Factory

Status: Backend-only child QA plan prepared. Executable validation remains blocked until Team 00 promotes the exact `market-data-foundation` service/types/doc/test reservation and an implementation handoff exists.

## Scope

Backend-only QA planning for the bounded first child of `CF-W1-MD-04` Market Data per-instrument freshness and sync provenance.

This plan covers:

- per-instrument freshness evidence with stable `CURRENT`, `STALE`, `MISSING`, and `UNKNOWN` semantics;
- paired `latestCompletedTradingDate`, `latestStoredTradingDate`, and lag-days evidence;
- explicit region-current/instrument-stale mismatch evidence;
- stable sync provenance for `NO_NEW_DATA_SKIP`, `NO_OP_STORAGE`, `ROWS_STORED`, and catch-up paths;
- the rule that catalog-row updated timestamp remains secondary evidence only;
- guardrails that keep Data Quality Engine readiness ownership separate from Market Data freshness evidence.

This plan excludes repository, controller, router, validation, Prisma/schema/migration, generated files, backend/frontend route registries, frontend adoption, provider, scheduler, worker, queue, shared utility, shared UI, package, and downstream consumer scope. It also excludes builds/tests/services during this planning pass, live providers, startup/backfill redesign, paid/cloud services, broker flows, commits, and pushes.

## Contract Inputs

- `10-requirements/CF-W1-MD-04-market-data-per-instrument-freshness-sync-provenance-requirement.md`
- `03-architecture/CF-W1-MD-04-architecture-review.md`
- `06-contracts/CF-W1-MD-04-market-data-per-instrument-freshness-sync-provenance-contract.md`
- `08-work-packets/CF-W1-MD-04-work-packet.md`
- `17-team-outboxes/TEAM-03-CF-W1-MD-04-architecture.md`

## Required QA Assertions

- Per-instrument freshness evidence exposes stable `CURRENT`, `STALE`, `MISSING`, and `UNKNOWN` status values without relying on free-form warning text.
- Each freshness result exposes `latestCompletedTradingDate` and `latestStoredTradingDate` together, plus `lagDays` or equivalent age basis.
- `CURRENT` means the instrument's own latest stored trading date is current against the latest completed trading date.
- `STALE` means stored data exists but lags the latest completed trading date.
- `MISSING` means no stored trading date exists for the instrument.
- `UNKNOWN` means latest completed trading date cannot be derived for the scope.
- Region-level currentness cannot hide stale or missing instruments in the same scope.
- Region-current/instrument-stale mismatch is exposed as machine-safe summary evidence, not warning text alone.
- Sync provenance distinguishes:
  - `NO_NEW_DATA_SKIP`
  - `NO_OP_STORAGE`
  - `ROWS_STORED`
  - `CATCH_UP_ELIGIBLE`
  - `CATCH_UP_STORED`
- Catch-up provenance may remain request-local where the current response owns that evidence, but it must not be fabricated on later reads without source support.
- Catalog-row updated timestamp stays secondary evidence only and must not be used as `latestStoredTradingDate`, `data-through`, or freshness proof.
- No new DQE-style readiness or eligibility scoring is introduced by this packet. Reject any new freshness/sync DTO fields that reframe the packet as `READY`, `LIMITED`, `BLOCKED`, `NOT_READY`, or consumer eligibility logic.
- Existing route paths, query params, repository behavior, provider behavior, scheduler behavior, and stale-selection semantics remain unchanged.
- Any widening into repository/controller/router/validation/schema/route/frontend/provider/scheduler/shared/package/generated scope is a QA reject condition for this first child.

## Scenario Matrix

| Scenario | Input condition | Expected QA result |
| --- | --- | --- |
| Instrument current | Instrument latest stored trading date equals or exceeds latest completed trading date | Freshness status is `CURRENT`; paired dates are present; lag-days basis resolves to current/zero-equivalent. |
| Instrument stale | Instrument has stored data but latest stored trading date is older than latest completed trading date | Freshness status is `STALE`; paired dates are present; lag-days basis is positive; stale reason is stable and machine-safe. |
| Instrument missing | Instrument has no stored trading date | Freshness status is `MISSING`; latest stored trading date is null; latest completed trading date remains visible when known. |
| Freshness unknown | Latest completed trading date cannot be derived for the scope | Freshness status is `UNKNOWN`; unknown reason is stable; packet does not invent currentness. |
| Region current, instrument stale | Region-level latest stored trading date is current while one instrument remains stale or missing | Catalog/run response exposes explicit mismatch summary with stable mismatch reason plus stale instrument count; instrument evidence still shows `STALE` or `MISSING`. |
| No new data skip | Sync response skips provider fetch because no new data is eligible | Provenance exposes `NO_NEW_DATA_SKIP`; `noNewData=true`; skip reason evidence remains present. |
| No-op storage | Provider fetch happens but inserts and updates are zero while `rowsNoOp > 0` | Provenance exposes `NO_OP_STORAGE`; packet does not mislabel the result as stored data. |
| Rows stored | Provider fetch happens and rows are inserted or updated | Provenance exposes `ROWS_STORED`; storage counts remain consistent with the summary. |
| Catch-up eligible | Latest completed EOD was missing before the request and freshness gate allows catch-up | Provenance exposes `CATCH_UP_ELIGIBLE` on the initiating response or equivalent request-local evidence. |
| Catch-up stored | Catch-up path inserts or updates rows | Provenance exposes `CATCH_UP_STORED`; packet does not collapse catch-up into generic success only. |
| Secondary timestamp rule | Catalog-row updated timestamp is newer than instrument data-through date | Timestamp remains secondary evidence only; freshness and data-through still rely on instrument trading-date evidence. |
| No DQE duplication | New Market Data evidence adds freshness/provenance fields | Packet stays source-evidence-only; no new DQE-style `READY`/`LIMITED`/`BLOCKED`/eligibility labels are introduced as freshness outcomes. |
| Scope drift | Implementation touches repository, controller, router, validation, schema, routes, frontend, provider, scheduler, shared, package, or generated files | QA rejects or returns the packet to Team 00 / Architect for a new child. |

## Focused Command Guidance

Run only after the bounded backend-only child implementation exists:

```powershell
cd backend
npm.cmd test -- tests/modules/market-data-foundation/market-data.service.test.ts --runInBand
```

Run backend build after the focused test passes:

```powershell
cd backend
npm.cmd run build
```

Optional targeted scan after implementation to confirm the new freshness/provenance layer did not add DQE-style labels:

```powershell
rg -n "READY|LIMITED|BLOCKED|NOT_READY|eligibleForSignals|signalReadinessStatus" backend/src/modules/market-data-foundation/market-data-foundation.service.ts backend/src/modules/market-data-foundation/market-data-foundation.types.ts backend/tests/modules/market-data-foundation/market-data.service.test.ts
```

## QA Rejection Criteria

- Instrument freshness is still inferred from region-level currentness or warning strings alone.
- Region-current/instrument-stale mismatch is not exposed as stable summary evidence.
- `latestCompletedTradingDate`, `latestStoredTradingDate`, or lag-days basis is missing from freshness evidence.
- Catalog-row updated timestamp is promoted to primary freshness proof or used as `latestStoredTradingDate`.
- `NO_NEW_DATA_SKIP`, `NO_OP_STORAGE`, `ROWS_STORED`, or catch-up paths cannot be distinguished.
- Market Data introduces DQE-style readiness tiers, downstream eligibility scoring, or consumer-specific usability claims.
- Existing route/query/repository/provider/scheduler behavior changes in this child.
- Implementation touches repository/controller/router/validation/schema/route/frontend/provider/scheduler/shared/package/generated scope.
- Validation would require live providers, startup/backfill redesign, Prisma mutation, broad suites, UI smoke, or downstream consumer wiring.

## Evidence Required Later

- Exact implementation handoff with changed files limited to the approved service/types/doc/service-test set.
- Scenario results for `CURRENT`, `STALE`, `MISSING`, `UNKNOWN`, region-current/instrument-stale mismatch, `NO_NEW_DATA_SKIP`, `NO_OP_STORAGE`, `ROWS_STORED`, and catch-up provenance.
- Focused test command output for `backend/tests/modules/market-data-foundation/market-data.service.test.ts`.
- Backend build output.
- Confirmation that catalog-row updated timestamp remained secondary evidence only.
- Confirmation that no new DQE-style readiness or eligibility scoring was introduced.
- Confirmation that no forbidden files or commands were used.
- Skipped checks, blockers, and next owner.
