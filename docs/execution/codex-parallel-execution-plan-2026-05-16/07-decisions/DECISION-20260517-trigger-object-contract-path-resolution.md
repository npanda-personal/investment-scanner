# DECISION-20260517 Trigger Object Contract Path Resolution

Date: 2026-05-17

## Decision

Product Owner approved Option A for `CF-W1-SIG-TRIGGER-01`.

Implement a first bounded Signal Generation trigger object DTO projection only.

## Approved Semantics

- The first slice may add optional module-local `trigger` or `triggerContract` fields derived from existing signal records.
- Missing fields must be explicitly marked unavailable, legacy-incomplete, or contract-incomplete.
- The projection must not invent rule versions, trigger prices, lifecycle states, Data Quality evidence, strategy versions, timestamps, source data, or audit evidence when current records cannot prove them.
- Existing route paths and downstream consumers must remain compatible.

## Explicitly Not Approved

- Prisma schema or migration changes.
- Route registry changes.
- Shared utility changes.
- Frontend/UI changes.
- Package changes.
- Provider, paid/cloud, startup/backfill changes.
- Downstream consumer changes.
- Persisted trigger snapshots or normalized trigger tables.

## Implementation Boundary

Allowed first bounded backend implementation may touch only accepted `signal-generation-engine` module files and focused signal-generation tests after readiness is proven.

## Remaining Limitations

- This does not complete long-term trigger persistence.
- This does not migrate downstream consumers.
- Legacy records can remain contract-incomplete.
- Future persisted snapshot or normalized trigger model requires a separate Product Owner and Architect decision.

