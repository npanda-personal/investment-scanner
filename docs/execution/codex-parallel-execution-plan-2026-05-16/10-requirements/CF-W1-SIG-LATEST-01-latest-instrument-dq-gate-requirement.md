# CF-W1-SIG-LATEST-01 Latest Instrument DQ Gate Requirement

Date: 2026-05-17

## Product Value

Instrument detail reads must not expose legacy or auto-generated trusted-looking signals without Data Quality readiness evidence.

## Scope

This requirement covers:

- `SignalGenerationEngineService.latestForInstrument()`

## Acceptance Criteria

- A persisted latest signal is returned only when it satisfies the trusted read predicate.
- Legacy persisted latest rows without DQ evidence are not returned as trusted.
- If a latest row is missing or untrusted, auto-generation uses the run-level DQ gate.
- If DQ blocks the instrument, `latestForInstrument()` returns `null`.
- Direct `generateForInstrument()` is not called from `latestForInstrument()` outside the DQ-gated run path.
- No Prisma/schema, route, shared utility, package, generated fixture, frontend, startup, Angel One, live provider, broker, paid service, or UI changes are required.

## Explicit Non-Goals

- Historical diagnostic display for untrusted latest rows.
- Route/API shape changes.
- Downstream module enforcement.

## Status

Ready for bounded module-local implementation under standing Product Owner delegation.

