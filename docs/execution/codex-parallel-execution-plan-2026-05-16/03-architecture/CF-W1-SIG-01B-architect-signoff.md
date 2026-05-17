# CF-W1-SIG-01B Architect Signoff

Date: 2026-05-17

## Scope

Signal Generation read-path trust filtering and persisted DQ trust classification derived from existing signal-row evidence.

## Architecture Boundary Verification

| Boundary | Result |
| --- | --- |
| Module-local to Signal Generation | Pass |
| Uses existing persisted DQ evidence | Pass |
| No Prisma/schema/migration change | Pass |
| No route registry change | Pass |
| No shared utility/UI change | Pass |
| No package/generated fixture change | Pass |
| No Angel One/live provider/broker/paid/cloud risk | Pass |
| No startup/backfill/UI implementation | Pass |

## Contract Alignment

The active Market Data / Data Quality readiness contract requires signal read paths to preserve and respect DQ evidence before treating outputs as trusted. `CF-W1-SIG-01B` aligns by excluding persisted signal rows unless they carry current, DQ-filtered, READY, eligible evidence.

## Remaining Architecture Gaps

- `latestForInstrument()` auto-generation and read behavior remain open under `CF-W1-SIG-LATEST-01`.
- Downstream modules remain blocked until their own consumer contracts and tests pass.
- Historical/untrusted diagnostic display remains out of scope.

## Architect Decision

Accept `CF-W1-SIG-01B`.

