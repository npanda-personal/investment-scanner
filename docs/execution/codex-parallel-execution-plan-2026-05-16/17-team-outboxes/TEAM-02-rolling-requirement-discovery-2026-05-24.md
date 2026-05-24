# TEAM-02 Rolling Requirement Discovery - 2026-05-24

Root `AGENTS.md` intake completed first. This pass stayed docs-only and did not touch application code, Ready queue files, or queue-order source docs owned by Team 00.

## Scope Inspected

- `AGENTS.md`
- `10-requirements/next-top-10-candidates.md`
- `10-requirements/top-10-ready-candidates.md`
- `10-requirements/requirements-backlog.md`
- `00-control/active-work-board.md`
- relevant requirement, architecture, work-packet, and summary docs for `CF-W1-TSC-01A-TREV`, `CF-W1-TSC-02`, `CF-W1-BT-04`, `CF-W1-DQ-03`, and `CF-W1-CAL-01A`

## Audit Result

The queue docs still carry two material gaps relative to the latest Team 00 board state:

1. `CF-W1-BT-04` is no longer an unassigned requirement-ready item. The active board shows it already moved to Team 06 Ready/implementation on 2026-05-24.
2. The current top-10/backlog stack covers Trusted Signal Candidate adoption, active health, and backtesting proof currentness, but it does not yet capture the next user-facing review-surface gap:
   after DQ filters, calibration readiness, and backtesting proof labels exist, the investor still lacks one bounded Today Review slice that shows those supporting trust signals together.

That missing gap is direct investor/trader value and remains ahead of admin/settings/auth/subscription/notification convenience work.

## Requirement Created

Created new bounded requirement:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-TSC-03-today-review-supporting-trust-evidence-requirement.md`

## Requirement Summary

`CF-W1-TSC-03` keeps `/today-review` as the primary answer to:

- where do I look after quality filters,
- where do I look after calibration readiness,
- where do I look after backtesting proof labels.

The first child should add a compact supporting-evidence chain on Trusted Signal Candidates using accepted module-owned outputs from:

- Data Quality residual summaries;
- calibration readiness; and
- backtesting proof currentness.

It must remain additive, Today Review-owned, and non-advisory:

- no new ranking engine;
- no composite trust score;
- no Trade Plan-first framing;
- no R:R, arbitrary targets, or direct-action language.

## Recommended Queue Change For Team 00

Do not apply automatically from this outbox. Team 00 owns queue movement.

Recommended placement once Team 00 integrates the latest board state into queue docs:

1. keep `CF-W1-TSC-02` ahead of this item because it is already requirement/architecture prepared and depends on fewer newly closing gates;
2. insert `CF-W1-TSC-03` immediately after `CF-W1-TSC-02`;
3. place `CF-W1-TSC-03` ahead of `CF-W1-DQ-02` residual parent and all consent-gated storage/history proposals.

Reason:

- `TSC-03` is the next bounded user-facing review gap after Trusted Signal Candidate adoption and BT-04 progress;
- it answers a direct workflow question the current queue does not answer cleanly;
- it reuses accepted DQ/calibration/backtesting evidence instead of inventing new math;
- it stays closer to immediate investor/trader value than residual parent cleanup or durable-storage proposals.

## Dependencies And Blockers

- Hard dependency: `CF-W1-TSC-01A-TREV` must clear Team 07 rework and be accepted.
- Hard dependency for stable backtesting label reuse: `CF-W1-BT-04` should finish its Team 06 path and be accepted before Team 00 promotes this item.
- Soft dependency: `CF-W1-DQ-03` should be on the implementation base for compact DQ summaries.
- Accepted `CF-W1-CAL-01A` semantics should be reused as-is, not reinterpreted.

No new Product Owner decision is required to keep this item as a draft requirement.

## Likely Team 03 Architecture Path

Recommended Team 03 path after dependencies clear:

- one Today Review-owned additive child, likely `CF-W1-TSC-03A-TREV-SUPPORTING-EVIDENCE`;
- reserve only `today-trade-review` backend/frontend files;
- consume accepted snapshot/public-output fields from DQ, calibration, and backtesting;
- keep list/detail evidence semantics aligned;
- split the child if stable `BT-04` proof labels are not available on the required base.

## Teams Ready To Pick Up New Tasks

- Team 06: continue `CF-W1-BT-04`.
- Team 07: complete `CF-W1-TSC-01A-TREV` rework.
- Team 02: continue rolling direct-value requirement discovery.
- Team 03: queue `CF-W1-TSC-03` for architecture prep after Team 00 records accepted `TSC-01A-TREV` and `BT-04` bases.
- Team 04: prepare QA planning only after Team 03 architecture prep exists for this new item.

## Files Changed In This Pass

- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-TSC-03-today-review-supporting-trust-evidence-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-02-rolling-requirement-discovery-2026-05-24.md`

## Ready Result

No item was moved to Ready by Team 02 in this pass.
