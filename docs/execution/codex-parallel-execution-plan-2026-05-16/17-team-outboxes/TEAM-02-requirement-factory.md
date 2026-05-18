# TEAM-02 Requirement Factory Outbox

Date: 2026-05-18

Mode: docs-only value-discovery and prioritization cycle. No application code, tests, Prisma, route registries, shared utilities/UI, package manifests, generated files, or Team 00 control docs changed.

## Work Item

Run the next persistent Product Owner / requirements cycle while implementation gates continue in parallel.

## Files Changed

- `10-requirements/next-top-10-candidates.md`
- `10-requirements/CF-W1-UX-01-stock-research-workbench-trust-surfaces-requirement.md`
- `17-team-outboxes/TEAM-02-requirement-factory.md`

## Files Inspected

- `AGENTS.md`
- `10-requirements/next-top-10-candidates.md`
- `10-requirements/requirements-backlog.md`
- `12-ready-queue/ready-for-implementation.md`
- `99-decision-inbox/open-decisions.md`
- `09-summaries/team-00-coordination-cycle-latest.md`
- `17-team-outboxes/TEAM-00-orchestrator-integration-outbox.md`
- `backend/src/modules/stock-research-workbench/**`
- `frontend/src/features/stock-research-workbench/**`
- `backend/src/modules/historical-context-snapshots/**`
- `frontend/src/features/historical-context-snapshots/**`
- `backend/src/modules/market-context-intelligence/**`
- `frontend/src/features/market-context-intelligence/**`
- `backend/src/modules/signal-calibration-engine/**`
- `backend/src/modules/backtesting-strategy-lab/**`
- `frontend/src/features/backtesting-strategy-lab/**`
- `backend/src/modules/watchlist-management/**`
- `frontend/src/features/watchlist-management/**`
- `backend/src/modules/portfolio-intelligence/**`
- `frontend/src/features/portfolio-intelligence/**`
- `03-architecture/CF-W1-UX-01-architecture-review.md`
- `09-summaries/CF-W1-UX-01-ux-source-mapping.md`

## Source-Backed Findings

- The current `next-top-10-candidates.md` had drifted behind the live Ready queue. It still centered items that are already promoted, pulled, accepted, or in active QA / review.
- `CF-W1-UX-01` remains the highest-value discovery item, but the meaningful next requirement is now the parent follow-on after active `CF-W1-UX-01A`: verified scope, latest trusted date, blocker provenance, and downstream widget eligibility.
- `CF-W1-HCTX-01` and `CF-W1-MCTX-01` are the next strongest trust-evidence gaps because their missing provenance flows directly into calibration and market review trust.
- `CF-W1-CAL-01` stays high, but it is best sequenced behind HCTX and MCTX because those two modules still hide the evidence chain calibration relies on.
- `CF-W1-BT-02`, `CF-W1-L3-INTEL-03`, and `CF-W1-L3-WATCH-01` remain strong user-value follow-ons because the product already exposes those workflows, but they still lack bounded review semantics.

## Re-Prioritized Top 10

1. `CF-W1-UX-01`
2. `CF-W1-HCTX-01`
3. `CF-W1-MCTX-01`
4. `CF-W1-CAL-01`
5. `CF-W1-BT-02`
6. `CF-W1-L3-INTEL-03`
7. `CF-W1-L3-WATCH-01`
8. `CF-W1-L3-ALERT-03`
9. `CF-W1-L3-INTEL-02`
10. `CF-W1-SQLAB-02`

## New / Refined Requirement Output

- Refined `CF-W1-UX-01` so the parent now explicitly tracks the post-`UX-01A` trust-evidence follow-on instead of collapsing the active frontend-only child and the later backend-proof child into one ambiguous requirement.

## Ready / Promotion Read

No item was moved to Ready.

Recommended next Team 00 promotion candidate:

- `CF-W1-AUTH-01`

Reason:

- it is the cleanest next unpulled safety / trust packet after current Team 09 work settles;
- it protects user-owned workflows across the platform;
- it does not depend on unresolved Product Owner decisions.

Promotion blockers:

- Team 09 capacity and sequencing with `CF-W1-SUB-01`.

Fallback promotion watch candidate:

- `CF-W1-L3-AUTH-03` once `CF-W1-L3-ALERT-01` clears overlapping `alerts-monitoring` reservations.

## Dependencies / Blockers

- `CF-W1-UX-01`: active `CF-W1-UX-01A` child must finish; current feature boundary still does not prove `region`, `assetType`, DQ-backed blockers, or latest trusted date.
- `CF-W1-HCTX-01`: must stay additive and backward-compatible for downstream consumers.
- `CF-W1-MCTX-01`: must clarify persisted-versus-fresh provenance and denominator quality without changing regime math.
- `CF-W1-CAL-01`: should follow HCTX / MCTX contract prep rather than race ahead of the evidence chain.
- `CF-W1-L3-INTEL-03` and `CF-W1-L3-WATCH-01`: should not widen into optimizer, rebalance, alerting, or advice features.
- `CF-W1-L3-ALERT-03`: should not overlap active `alerts-monitoring` writers.
- `CF-W1-SQLAB-02`: durable-storage child remains blocked behind a separate storage packet even if the no-schema preview child continues.

## Teams Ready To Pick Up New Tasks

- Team 03: `CF-W1-UX-01`, `CF-W1-HCTX-01`, `CF-W1-MCTX-01`, `CF-W1-CAL-01`, `CF-W1-BT-02`
- Team 08: `CF-W1-UX-01` follow-on definition after the active frontend child closes
- Team 04: QA-plan prep for HCTX, MCTX, CAL, and BT once Team 03 contracts land
- Team 07 lane teams: `CF-W1-L3-INTEL-03` and `CF-W1-L3-WATCH-01` when current alerts / portfolio lane reservations free up

## Validation

- Tests run: none
- Builds run: none
- UI checks run: none
- Live local data checks run: none
- Skipped reason: Team 02 cycle was docs-only and stayed inside the allowed write scope

## Next Gate

Keep Team 00 live implementation routing unchanged. Use the updated top 10 for the next docs-only contract / QA-prep delegation cycle.
