# DECISION-20260525 - DQ RS1 Currentness Summary Parity

Date: 2026-05-25

Owner: Team 00 - Master Orchestrator / Integration

## Status

Open.

## Affected Workstream

- `CF-W1-DQ-02-RS1` only.

Unrelated active workstreams may continue.

## Decision Needed

`CF-W1-DQ-02-RS1` cannot continue under its current requirement/contract shape.

Team 10 rejected the implementation after QA acceptance. Team 03 reviewed the rejection and concluded there is no bounded DQE-only implementation that can satisfy all current RS1 goals at once:

- bounded `summary()` with no full-scope row loading;
- reconstructed summary `currentnessCounts`;
- parity with reconstructed row/detail/helper currentness;
- no per-row Market Data fanout in summary or bulk helper consumers.

## Evidence

- Team 10 code review rejection:
  - `C:\work\repo\investment-scanner-worktrees\team05-CF-W1-DQ-02-RS1\docs\execution\codex-parallel-execution-plan-2026-05-16\13-implementation-evidence\CF-W1-DQ-02-RS1-code-review.md`
- Team 03 architecture correction:
  - `03-architecture/CF-W1-DQ-02-RS1-code-review-resolution-addendum.md`
  - `17-team-outboxes/TEAM-03-CF-W1-DQ-02-RS1-review-resolution-outbox.md`

## Problem

The current RS1 packet asks Data Quality Engine to reconstruct currentness across summary, list, diagnostics, and latest-helper reads.

Row/detail/helper reconstruction needs Market Data evidence that is not stored on DQE evaluation rows:

- latest price date
- expected latest trading date
- latest completed EOD date
- stored data-through date
- readiness blockers
- trusted-baseline blocker codes

The current public Market Data surface does not expose this as a bounded bulk evidence contract. DQE can either:

- keep `summary()` bounded using repository aggregates over persisted DQE rows, but then summary cannot truthfully claim reconstructed parity; or
- reconstruct parity by scanning/fanning out over instruments, which violates the bounded-performance goal and may require forbidden cross-module scope.

## Option A - Reduce RS1 Scope

Approve a narrower no-schema child:

- Keep `summary()` bounded and do not expose reconstructed `currentnessCounts` in RS1.
- Limit reconstructed currentness to bounded per-row/list/detail reads where request size is already bounded.
- Remove bulk-helper parity from this first child.
- Treat full summary/helper parity as a future requirement requiring a proper bulk evidence contract.
- Update requirement, architecture, QA, ready promotion, and Team 05 handoff before any further implementation.

Impact:

- Faster recovery.
- Preserves no-schema/no-route/no-Market-Data-writer boundary.
- Leaves a known limitation: summary cannot tell the same reconstructed currentness story as row/detail reads yet.

## Option B - Preserve Full Parity Goal

Do not continue RS1 as a DQE-only child.

Instead, queue a new architecture path first:

- Market Data bulk evidence API/read model, or
- approved durable Market Data evidence storage plus DQE handoff.

Impact:

- More correct long-term foundation.
- Requires new architecture/QA packets and likely broader consent if schema/storage/Market Data source/API changes are involved.
- RS1 remains blocked until the upstream evidence capability exists.

## Recommendation

Team 03 recommends stopping the current RS1 packet and choosing explicitly between Option A and Option B.

Team 00 recommendation for product momentum:

- Choose Option A only if a near-term UI/API partial currentness improvement is more valuable than full parity.
- Choose Option B if the goal is durable, trustworthy currentness evidence for summaries and downstream bulk consumers.

Given the user's recent priority on scalable pipelines and trusted evidence, Option B is the stronger long-term direction, but it should not be hidden inside RS1.

## Forbidden Until Resolved

Do not continue Team 05 implementation for `CF-W1-DQ-02-RS1`.

Do not re-run QA on the current RS1 packet.

Do not widen into:

- Market Data source files
- Prisma schema or migrations
- route registries
- shared backend utilities
- generated files
- package manifests
- provider/live/startup/backfill behavior

without a new approved packet.

## Unaffected Work

The following workstreams are not blocked by this decision:

- `CF-W2-CAL-02A`
- `CF-W2-TSC-05A`
- docs-only backlog/requirement hygiene
- code review/signoff for unrelated QA-accepted items

## Required Resolution Format

Product Owner must choose:

- Option A: reduce RS1 scope; or
- Option B: preserve full parity and open upstream bulk/durable evidence work first.
