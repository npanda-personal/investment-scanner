# CF-W1-SIG-TRIGGER-ENTRY-01 - Rule Trigger Entry Price Evidence Requirement

Date: 2026-05-24

Owner: Team 02 - Product / Requirement Factory

Status: Accepted - Pending Scoped Local Commit

## Product Goal

Trusted Signal Candidates cannot be useful without the actual rule-triggered entry price. The app must not substitute entry zones, reference prices, Trade Plan geometry, target prices, or R:R fields for the rule-trigger price.

This child requirement closes the upstream evidence gap that blocks `CF-W1-TSC-01`.

## Required Evidence

A trusted trigger evidence packet should expose, only when source-proven:

- symbol or instrument identity;
- strategy id and strategy version;
- trigger type;
- rule-triggered entry price;
- trigger timestamp;
- entry rule id or rule name/version where available;
- reason summary;
- Data Quality readiness or blocker state;
- source/evidence provenance for the trigger price.

If any field is not source-proven, the output must mark it unavailable or incomplete. Do not invent missing values.

## Acceptance Criteria

- A downstream Today Review candidate can distinguish source-proven trigger price from reference prices or zones.
- Missing trigger price blocks `Highly Trusted` candidate classification.
- Trigger timestamp and rule provenance are exposed only when source-proven.
- Data Quality readiness remains required for any high-trust downstream classification.
- No output introduces arbitrary targets, R:R, synthetic profit targets, direct buy/sell advice, or trade instructions.
- Existing Signal Generation behavior remains backward-compatible where practical.

## Non-Goals

- No Prisma schema or migration change in this requirement without a separate Decision Packet.
- No route registry change.
- No shared backend utility or shared UI change.
- No package or generated-file change.
- No provider/live-data, startup/backfill, broker, paid/cloud, or telemetry work.
- No downstream Today Review implementation in this child.

## Next Gate

Team 03 inspected current Signal Generation source and confirmed a bounded no-schema/no-route/no-shared-file child can expose additive compatibility trigger-price evidence from local stored price rows and Strategy Framework rule evidence.

Team 04 prepared QA checks for source provenance, missing-field downgrade behavior, Data Quality gating, and product-language safety.

Team 00 implemented the bounded Signal Generation child on `dev` in the approved Signal Generation source/doc/test scope.

Implementation evidence:

- `backend/src/modules/signal-generation-engine/signal-generation-engine.types.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.service.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.md`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.trigger-contract.test.ts`

Validation:

- `cd backend && npm.cmd test -- signal-generation-engine.trigger-contract.test.ts signal-generation-engine.service.test.ts signal-generation-dq-enforcement.invariants.test.ts --runInBand`
- `cd backend && npm.cmd run build`

This implementation passed QA Verification, Code Review, Architect Signoff, and delegated PO acceptance. Team 00 must keep `CF-W1-TSC-01A` out of Ready until the scoped local commit is created and a downstream Today Review/Trusted Signal Candidate child is promoted with exact file reservations.
