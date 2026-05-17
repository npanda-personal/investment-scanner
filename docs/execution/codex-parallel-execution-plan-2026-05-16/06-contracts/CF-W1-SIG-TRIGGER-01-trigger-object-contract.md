# CF-W1-SIG-TRIGGER-01 Trigger Object Contract

Date: 2026-05-17

## Status

Accepted for the first bounded Signal Generation DTO projection slice.

Product Owner resolved `DECISION-20260517-trigger-object-contract-path` as Option A: implement an optional module-local trigger object DTO projection only.

This contract does not approve Prisma/schema/migration, route registry, shared utility/type, frontend/UI, package, provider, paid/cloud, startup/backfill, downstream consumer, or persisted trigger-storage changes.

## Contract Intent

Signal Generation Engine may expose an additive `TriggerObjectV1` compatibility projection derived only from current signal records and available enrichment context. Missing or unproven fields must be explicitly marked unavailable, legacy-incomplete, or contract-incomplete.

## Accepted Projection Rule

- Add an optional module-local `triggerContract` field to `SignalResultDto`.
- Preserve all existing Signal Result DTO fields.
- Derive projection values only from current signal records and existing enrichment context.
- Mark missing evidence in `unavailable_fields` and `incomplete_reasons`.
- Mark legacy rows with incomplete current audit evidence as `LEGACY_INCOMPLETE`.
- Mark non-legacy rows with missing required fields as `CONTRACT_INCOMPLETE`.

## Do Not Invent

The projection must not invent:

- rule versions,
- trigger prices,
- lifecycle states,
- Data Quality evidence,
- strategy versions,
- timestamps,
- source data,
- audit evidence.

## Allowed Projection Fields

The bounded DTO projection may include:

- contract version and status,
- signal id where present,
- instrument id and symbol,
- asset class and region when available from context,
- strategy id/version when a strategy match is attached,
- trigger type derived from current signal direction,
- reason summary from the signal explanation,
- passed and failed condition summaries from current signal factors,
- Data Quality readiness status only when already attached,
- audit status, generation run id, model version, and ruleset version when already present,
- explicit unavailable/incomplete markers.

## Out Of Scope

- Persisted trigger snapshots.
- Normalized trigger tables.
- Route changes.
- Shared type generation.
- Frontend/UI consumption.
- Downstream consumer adoption.
- Complete root trigger contract for fields current records cannot prove.

## Acceptance Criteria

- Optional projection is additive and module-local.
- Legacy/incomplete states are explicit.
- Missing trigger price, lifecycle status, rule IDs, timeframe, persistence timestamps, and DQ snapshots are not invented.
- Existing Signal Generation DQ behavior does not regress.
- No forbidden file class is changed.
