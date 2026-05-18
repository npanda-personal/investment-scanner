# TEAM-02 Requirement Factory Outbox

Date: 2026-05-18

Mode: docs-only value-discovery and prioritization cycle. No application code, tests, Prisma, route registries, shared utilities/UI, package manifests, generated files, or Team 00 control docs changed.

## Work Item

Run the next persistent Product Owner / requirements cycle while implementation gates continue in parallel.

## Files Changed

- `10-requirements/next-top-10-candidates.md`
- `10-requirements/requirements-backlog.md`
- `10-requirements/refinement-queue.md`
- `10-requirements/top-10-ready-candidates.md`
- `10-requirements/CF-W1-DQ-02-dq-currentness-evidence-requirement.md`
- `17-team-outboxes/TEAM-02-requirement-factory.md`

## Files Inspected

- `AGENTS.md`
- `10-requirements/next-top-10-candidates.md`
- `10-requirements/requirements-backlog.md`
- `12-ready-queue/ready-for-implementation.md`
- `10-requirements/refinement-queue.md`
- `10-requirements/top-10-ready-candidates.md`
- `10-requirements/CF-W1-DQ-02-dq-currentness-evidence-requirement.md`
- `16-team-inboxes/TEAM-09-current-assignment.md`
- `11-module-audits/audit-market-data-data-quality.md`
- `11-module-audits/audit-backtesting-trade-risk.md`

## Source-Backed Findings

- The queue needed to move away from auth/sub promotion-watch work because Team 09 has already pulled combined `CF-W1-AUTH-SUB-01` into a separate implementation worktree.
- `CF-W1-BT-02` is still the cleanest next Team 00 architecture/QA prep target because the product already exposes the relevant diagnostics and only the canonical review-disposition layer remains unclear.
- `CF-W1-HCTX-01` and `CF-W1-MCTX-01` remain the strongest upstream trust-evidence gaps because their missing provenance flows directly into calibration and market review trust.
- `CF-W1-CAL-01` stays high, but it is best sequenced behind HCTX and MCTX because those two modules still hide the evidence chain calibration relies on.
- `CF-W1-DQ-02` now has a sharper session-aware currentness focus so downstream trust surfaces can fail closed instead of treating calendar age as freshness.
- `CF-W1-TP-01B` and `CF-W1-MD-02` remain high-value upstream support items, but both stay out of Ready movement and implementation routing in this docs-only cycle.
- `CF-W1-L3-WATCH-01` and `CF-W1-L3-INTEL-03` remain useful but stay lower than the market-intelligence trust stack unless correctness or user-data safety changes the ordering.

## Re-Prioritized Top 10

1. `CF-W1-BT-02`
2. `CF-W1-HCTX-01`
3. `CF-W1-MCTX-01`
4. `CF-W1-CAL-01`
5. `CF-W1-SQLAB-02`
6. `CF-W1-STRAT-02`
7. `CF-W1-DQ-02`
8. `CF-W1-TP-01B`
9. `CF-W1-MD-02`
10. `CF-W1-UX-01`

## New / Refined Requirement Output

- Refined `CF-W1-HCTX-01` with an explicit backend-first additive lookup-provenance slice.
- Refined `CF-W1-MCTX-01` with persisted-versus-fresh regime provenance and denominator clarity.
- Refined `CF-W1-CAL-01` so the first child stays on trust-state semantics and is explicitly sequenced behind HCTX/MCTX.
- Refined `CF-W1-BT-02` to a narrower canonical review-disposition requirement and flagged the need to refresh existing Team 03/04 packets to that scope.
- Refined `CF-W1-DQ-02` to make session-aware currentness explicit so downstream consumers can distinguish latest-session freshness from calendar-age heuristics.

## Ready / Promotion Read

No item was moved to Ready.

Recommended next Team 00 promotion candidate:

- none changed in this cycle

Reason:

- Team 09 is already implementing combined `CF-W1-AUTH-SUB-01` in a separate worktree;
- this cycle was intentionally about docs-only next-lane discovery, not changing Team 00's live Ready routing.

Recommended next Team 00 architecture / QA prep target:

- `CF-W1-BT-02`

Reason:

- the module already exposes the relevant diagnostics in source and UI;
- the remaining gap is bounded to one canonical review-disposition label and reason summary;
- Team 03 / Team 04 packets exist already and only need scope refresh instead of fresh discovery.

## Dependencies / Blockers

- `CF-W1-UX-01`: active `CF-W1-UX-01A` child must finish; current feature boundary still does not prove `region`, `assetType`, DQ-backed blockers, or latest trusted date.
- `CF-W1-BT-02`: existing Team 03 / Team 04 packet must be refreshed to match the narrower canonical-label requirement before Team 00 evaluates prep completeness.
- `CF-W1-HCTX-01`: must stay additive and backward-compatible for downstream consumers.
- `CF-W1-MCTX-01`: must clarify persisted-versus-fresh provenance and denominator quality without changing regime math.
- `CF-W1-CAL-01`: should follow HCTX / MCTX contract prep rather than race ahead of the evidence chain.
- `CF-W1-L3-WATCH-01`: should not widen into alerting, recommendation language, or shared-component scope.
- `CF-W1-L3-INTEL-03`: should not widen into optimizer, rebalance, or advice-like action semantics.
- `CF-W1-L3-ALERT-03`: should not overlap active `alerts-monitoring` writers and should stay behind `CF-W1-L3-ALERT-01` / `CF-W1-L3-AUTH-03` lane contention.
- `CF-W1-SQLAB-02`: durable-storage child remains blocked behind a separate storage packet even if the no-schema preview child continues.

## Teams Ready To Pick Up New Tasks

- Team 03: `CF-W1-BT-02`, `CF-W1-HCTX-01`, `CF-W1-MCTX-01`, `CF-W1-CAL-01`, `CF-W1-SQLAB-02`, `CF-W1-STRAT-02`, `CF-W1-DQ-02`, `CF-W1-MD-02`
- Team 04: QA-plan prep for `CF-W1-BT-02`, HCTX, MCTX, CAL, SQLAB-02, STRAT-02, DQ-02, and MD-02 once Team 03 contract packets land or refresh
- Team 07 lane teams: `CF-W1-L3-WATCH-01` and then `CF-W1-L3-INTEL-03` when current portfolio / alert lane reservations free up
- Team 08: `CF-W1-UX-01` follow-on definition after the active frontend child closes

## Validation

- Tests run: none
- Builds run: none
- UI checks run: none
- Live local data checks run: none
- Skipped reason: Team 02 cycle was docs-only and stayed inside the allowed write scope

## Next Gate

Keep Team 00 live implementation routing unchanged. Use the refreshed backtesting/context/calibration/signal-quality/strategy/DQ/market-data ordering for the next docs-only contract / QA-prep delegation cycle while Team 09 continues `CF-W1-AUTH-SUB-01` in its separate worktree.
