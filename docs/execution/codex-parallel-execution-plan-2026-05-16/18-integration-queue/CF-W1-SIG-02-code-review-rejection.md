# CF-W1-SIG-02 Code Review Rejection

Date: 2026-05-19

Owner: Team 10 - Review / Release

Recorded by: Team 00 - Master Orchestrator / Integration

## Status

REJECT.

`CF-W1-SIG-02` is not accepted for Architect Signoff or commit. It must return to Team 06 for bounded implementation and focused test correction.

## Review Context

Worktree:

- `C:\work\repo\investment-scanner-worktrees\team06-CF-W1-SIG-02`

Branch:

- `codex/team06-strategy-signal/CF-W1-SIG-02`

Base dependency:

- accepted parked `CF-W1-SIG-TRIGGER-02A` commit `788c237`

Team 10 could not write the review artifacts into the external worktree because the environment approval gate rejected escalated external-worktree writes. Team 00 records the review outcome here so routing can continue.

## Blocking Findings

1. Current non-legacy rows still resolve to `CONTRACT_INCOMPLETE`.

   The service still derives contract status from intentionally unavailable fields in `backend/src/modules/signal-generation-engine/signal-generation-engine.service.ts`. The focused test locks that behavior in `backend/tests/modules/signal-generation-engine/signal-generation-engine.trigger-contract.test.ts`.

   This contradicts the `CF-W1-SIG-02` architecture/contract rule that current non-legacy rows must not become incomplete merely because target-price, timeframe, rule-id, or lifecycle fields are unavailable in this compatibility slice.

2. `triggerContract` provenance is only partially classified.

   The contract requires explicit proven treatment for currently supported fields such as signal id, instrument id, symbol, reason summary, passed conditions, failed conditions, data quality status, and run evidence where present. The implementation provenance metadata covers only a subset, so the canonical packet is not yet self-describing enough for review acceptance.

## Non-Blocking Notes

- Scope discipline was otherwise acceptable: the diff stayed inside reserved `signal-generation-engine` source/test/module-doc files.
- `SignalResultDto.triggerContract` remained the only additive packet.
- No forbidden schema, route, shared, frontend, package, provider/live, broker, paid/cloud, or telemetry scope was observed by Team 10.
- Team 04 QA had passed focused tests and backend build, but Team 10 found the test oracle itself preserved the incorrect incomplete-status behavior.

## Next Gate

1. Team 06 rework in the existing SIG-02 worktree.
2. Team 04 QA re-verification.
3. Team 10 re-review.
4. Team 03 Architect Signoff only after review ACCEPT.

Product Owner action required: no.
