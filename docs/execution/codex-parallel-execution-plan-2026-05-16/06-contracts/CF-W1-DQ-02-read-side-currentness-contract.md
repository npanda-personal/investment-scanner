# CF-W1-DQ-02 Read-Side Currentness Contract

Date: 2026-05-25

Owner: Team 03 Architecture Factory

## Status

Ready candidate after QA.

## Contract Intent

Provide one truthful DQE currentness story across persisted read surfaces without adding durable currentness storage.

This contract replaces the residual "blocked unless schema" posture with a narrower rule:

- use read-time reconstruction by default;
- keep Market Data Foundation as owner of session timing and upstream evidence;
- keep Data Quality Engine as owner of readiness gating and currentness exposure on DQE reads;
- fail closed when current evidence is missing, blocked, or contradictory.

## In-Scope Read Surfaces

- `summary()`
- `list()`
- `diagnostics()` when a persisted row already exists
- `getLatestEvaluationForInstrument()`
- `getEvaluationsForInstruments()`

The same read-side reconstruction basis must drive all five surfaces.

## Allowed Implementation Boundary

- `backend/src/modules/data-quality-engine/data-quality-engine.repository.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.service.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.types.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.md`
- `backend/tests/modules/data-quality-engine/data-quality-engine.repository.test.ts`
- `backend/tests/modules/data-quality-engine/data-quality-engine.service.test.ts`
- `backend/tests/modules/data-quality-engine/data-quality-engine.invariants.test.ts`

## Forbidden Implementation Boundary

- DQE controller/router/validation/module/index files
- backend/frontend route registries
- all `market-data-foundation` source/tests/docs
- Prisma schema and migrations
- generated files
- package manifests
- shared backend utilities
- provider, scheduler, worker, queue, startup, or backfill files
- all frontend files/tests

If implementation cannot stay inside this boundary, stop and escalate.

## Required Semantics

The read-side contract must distinguish, at minimum:

- `CURRENT_COMPLETED_SESSION`
- `CURRENT_FINALIZATION_PENDING`
- `STALE_COMPLETED_SESSION_MISSED`
- `MISSING_LATEST_PRICE`
- `SESSION_EVIDENCE_UNAVAILABLE`
- `PROVIDER_GAP_BLOCKED`
- `CONTRADICTORY_EVIDENCE`

Equivalent naming is acceptable only if the same meanings remain explicit and stable.

## Required Additive Fields

Every reconstructed read result that exposes currentness must carry:

- `status`
- `reasonCode`
- `latestObservedTradingDate`
- `latestCompletedTradingDate`
- `reasonSummary`

If one of the dates is unavailable, the output must say so explicitly rather than implying freshness.

## Required Input Sources

Use current authoritative evidence only from sources already available on current `dev`:

- persisted DQ read rows
- instrument scope / identity
- existing Market Data public session helpers
- existing Market Data public read evidence where available, including:
  - `latest_price_date`
  - `expected_latest_trading_date`
  - `readiness_blockers`
  - `trusted_baseline_blocker_codes`
  - `latest_completed_eod_date`
  - `stored_data_through_date`

Do not create a second session calendar implementation inside DQE.

## Summary Contract Rule

`summary()` must not count stale/currentness states from string matching alone.

Summary counts and any currentness breakdowns must be derived from the same per-row reconstruction basis used by:

- `list()`
- `diagnostics()`
- latest-evaluation helper reads

## Fail-Closed Contract Rule

If current evidence is:

- unavailable
- blocked by provider-gap or missing-final-candle evidence
- contradictory across authoritative inputs

then the DQE currentness output must remain unavailable or blocked. It must not imply that the instrument is current.

Existing DQ eligibility behavior must remain fail-closed.

## Test Contract

Focused backend tests must prove:

- cross-surface parity for the same instrument/evidence on `summary`, `list`, `diagnostics`, and latest-helper reads;
- current completed session mapping;
- current finalization pending mapping;
- stale missed completed session mapping;
- missing latest price mapping;
- session evidence unavailable mapping;
- provider-gap blocked mapping;
- contradictory evidence mapping;
- fail-closed propagation through current helper consumers and `filterEligibleInstruments()`.

## Controller / Route Test Decision

Controller/route response tests are not required in this child.

Rationale:

- no route files are authorized;
- controller logic is a thin pass-through;
- the contract risk sits in DQE repository/service reconstruction, not in route registration.

## Escalation Rule

Escalate to Team 00 for a Decision Packet and do not keep Ready reservations if implementation proves that truthful reconstruction requires:

- durable stored currentness fields;
- Market Data source writer scope;
- route/controller widening;
- package/generated/shared scope.
