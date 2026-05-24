# TEAM-02 Rolling Requirement Discovery - Next - 2026-05-24

Root `AGENTS.md` intake completed first. This pass stayed docs-only and did not touch application code, queue-control files, source, tests, route registries, schemas, packages, or generated artifacts.

## Scope Inspected

- `AGENTS.md`
- `10-requirements/next-top-10-candidates.md`
- `10-requirements/top-10-ready-candidates.md`
- `10-requirements/requirements-backlog.md`
- `10-requirements/CF-W1-TSC-03-today-review-supporting-trust-evidence-requirement.md`
- `10-requirements/CF-W1-BT-04-backtesting-run-freshness-and-current-proof-labels-requirement.md`
- `10-requirements/CF-W1-CAL-01A-signal-calibration-dq-readiness-gate-requirement.md`
- `10-requirements/CF-W1-SQLAB-02A-signal-outcome-journal-derived-preview-requirement.md`
- `10-requirements/CF-W1-SQLAB-02B-signal-outcome-journal-durable-learning-memory-requirement.md`
- `10-requirements/CF-W1-STRAT-02B-strategy-definition-durable-revision-history-requirement.md`
- `11-module-audits/audit-fresh-direct-value-gaps-2026-05-20.md`
- `11-module-audits/audit-backtesting-proof-basis-2026-05-20.md`
- `11-module-audits/audit-strategy-signal-rules.md`
- `17-team-outboxes/TEAM-06-CF-W1-BT-04-outbox.md`
- `17-team-outboxes/TEAM-03-CF-W1-BT-04-signoff-outbox.md`
- `17-team-outboxes/TEAM-10-CF-W1-BT-04-review-outbox.md`

## Audit Result

Given current Team 00 context:

- `CF-W1-MD-05` is already in implementation with Team 05.
- `CF-W1-TSC-02A-TREV-HEALTH` is already in implementation with Team 07.
- `CF-W1-TSC-03` already exists and should go to Team 03 architecture prep.
- `CF-W1-BT-04` has already moved through implementation, QA, review, and architect signoff evidence, so it is no longer the next fresh Team 02 discovery target.

The next distinct direct-value gap that stays inside the user's stated preference stack is the post-event research-memory gap in `signal-quality-lab`, not the blocked `DQ-02` residual parent and not admin/auth/settings convenience.

## Requirement Refined

Refined:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-SQLAB-02B-signal-outcome-journal-durable-learning-memory-requirement.md`

## Requirement Summary

`CF-W1-SQLAB-02B` is the next bounded gap after the front-of-loop trust work:

- `MD-05` fixes freshness truth;
- `TSC-02A` covers active health;
- `TSC-03` will show DQ, calibration, and backtesting support in Today Review;
- `SQLAB-02B` closes the back-of-loop memory gap by preserving what a signal actually did later.

This requirement is distinct from `TSC-03`:

- `TSC-03` answers where to look now.
- `SQLAB-02B` answers what durable learning remains later.

The refined brief keeps scope bounded to one `signal-quality-lab` owned durable learning row per measured signal-result and selected horizon, with idempotent update semantics and research-support language only.

## Recommended Priority Placement

Recommend Team 00 place `CF-W1-SQLAB-02B`:

1. behind `CF-W1-MD-05`
2. behind `CF-W1-TSC-02A-TREV-HEALTH`
3. behind `CF-W1-TSC-03`
4. ahead of `CF-W1-DQ-02` residual parent for fresh requirement discovery and Team 03 prep, because `DQ-02` still lacks an honest bounded child while `SQLAB-02B` now has a clear approval-gated packet
5. ahead of `CF-W1-STRAT-02B` because durable signal-outcome memory is closer to repeated investor/trader review value than persisted strategy revision lineage

This is still approval-gated and should not be moved to Ready without deliberate storage consent.

## Blockers / Decisions

- Team 00 must decide whether to deliberately open a storage consent lane for `signal-quality-lab` after `TSC-03` architecture prep starts.
- Team 03 must treat this as a storage packet from the start: Prisma/schema, repository, generated-artifact impact, idempotent natural key, and strict module ownership.
- If Team 00 does not want to open storage consent yet, keep `SQLAB-02B` as the next explicit parked direct-value proposal rather than falling back to the blocked `DQ-02` residual parent.

## Recommended Team 03 Path

- Prepare an approval-gated architecture packet for one module-owned durable learning-memory row per signal-result plus horizon.
- Keep first-child ownership inside `signal-quality-lab`.
- Refuse cross-module journal reuse, Today Review persistence reuse, editable notes scope, and shared research-memory abstractions in the first packet.

## Teams Ready To Pick Up New Tasks

- Team 03: ready for approval-gated architecture prep on `CF-W1-SQLAB-02B` if Team 00 opens storage consent after `TSC-03` placement.
- Team 04: ready for QA-plan prep after Team 03 produces the storage packet.
- Team 02: ready to continue rolling discovery after Team 00 decides whether to open `SQLAB-02B` or keep it parked.

## Files Changed In This Pass

- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-SQLAB-02B-signal-outcome-journal-durable-learning-memory-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-02-rolling-requirement-discovery-next-2026-05-24.md`

## Ready Result

No item was moved to Ready by Team 02 in this pass.
