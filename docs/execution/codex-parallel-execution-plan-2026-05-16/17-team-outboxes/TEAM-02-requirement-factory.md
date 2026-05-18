# TEAM-02 Requirement Factory Outbox

Date: 2026-05-18

Mode: docs-only value-discovery and prioritization cycle. No application code, tests, Prisma, route registries, shared utilities/UI, package manifests, generated files, or Team 00 control docs changed.

## Work Item

Run the next persistent Product Owner / requirements cycle while implementation gates continue in parallel.

## Files Changed

- `10-requirements/CF-W1-CAL-01-signal-calibration-reliability-drift-requirement.md`
- `10-requirements/next-top-10-candidates.md`
- `10-requirements/requirements-backlog.md`
- `10-requirements/refinement-queue.md`
- `10-requirements/top-10-ready-candidates.md`
- `17-team-outboxes/TEAM-02-requirement-factory.md`

## Files Inspected

- `AGENTS.md`
- `16-team-inboxes/TEAM-02-current-assignment.md`
- `10-requirements/CF-W1-CAL-01-signal-calibration-reliability-drift-requirement.md`
- `10-requirements/CF-W1-DQ-02-dq-currentness-evidence-requirement.md`
- `10-requirements/next-top-10-candidates.md`
- `10-requirements/requirements-backlog.md`
- `10-requirements/refinement-queue.md`
- `10-requirements/top-10-ready-candidates.md`
- `12-ready-queue/ready-for-implementation.md`
- `11-module-audits/TEAM-06-lane2-dq-fail-closed-audit-2026-05-17.md`
- `11-module-audits/audit-market-data-data-quality.md`
- `11-module-audits/audit-backtesting-trade-risk.md`
- `11-module-audits/audit-strategy-signal-rules.md`
- `11-module-audits/audit-ux-research-copilot.md`
- `11-module-audits/audit-portfolio-watchlist-alerts.md`
- `11-module-audits/audit-qa-test-infrastructure.md`

## Source-Backed Findings

- `CF-W1-DQ-02` is actively routed to Team 03 architecture prep, so I reverted the DQ requirement edits from this cycle and excluded it from the current discovery ranking.
- `CF-W1-CAL-01` is the clearest next unassigned direct investor/trader-value item after excluding routed DQ, backtesting, historical-context, and market-context work.
- Calibration trust-state semantics already exist, so the next requirement can stay bounded to trusted, limited, unavailable, and diagnostic-only output without inventing a new model.
- `CF-W1-SQLAB-02`, `CF-W1-STRAT-02`, `CF-W1-MD-02`, and `CF-W1-SQLAB-01` remain the next direct market-intelligence support items.
- `CF-W1-L3-INTEL-03`, `CF-W1-L3-WATCH-01`, `CF-W1-L3-INTEL-02`, and `CF-W1-L3-ALERT-03` stay below the calibration/signal/strategy/data stack.
- `CF-W1-BT-02`, `CF-W1-HCTX-01`, and `CF-W1-MCTX-01` are actively routed and stay out of the unassigned discovery ranking.

## Re-Prioritized Top 10

1. `CF-W1-CAL-01`
2. `CF-W1-SQLAB-02`
3. `CF-W1-STRAT-02`
4. `CF-W1-MD-02`
5. `CF-W1-SQLAB-01`
6. `CF-W1-UX-01`
7. `CF-W1-L3-INTEL-03`
8. `CF-W1-L3-WATCH-01`
9. `CF-W1-L3-INTEL-02`
10. `CF-W1-L3-ALERT-03`

## New / Refined Requirement Output

- Refined `CF-W1-CAL-01` to keep the child bounded to trusted, limited, unavailable, and diagnostic-only calibration states with explicit DQ gating and upstream context dependency.
- Shifted the active docs-only ranking away from routed DQ, backtesting, historical-context, and market-context items.

## Ready / Promotion Read

No item was moved to Ready.

Recommended next Team 00 promotion candidate:

- none changed in this cycle

Reason:

- Team 02 stayed docs-only and did not move any application-code item to Ready.

Recommended next Team 00 architecture / QA prep target:

- `CF-W1-CAL-01`

Reason:

- calibration is the next unassigned trust layer after the routed data-quality/context lanes;
- the requirement can stay additive and research-support oriented;
- Team 03 can prepare the bounded contract without touching active routed work.

## Dependencies / Blockers

- `CF-W1-CAL-01`: should remain bounded to existing calibration readiness and upstream evidence signals.
- `CF-W1-SQLAB-02`: durable-storage child remains blocked behind a separate storage packet even if the no-schema preview child continues.
- `CF-W1-STRAT-02`: should stay upstream of any rule-behavior change and keep DQ gate policy explicit.
- `CF-W1-MD-02`: should remain ADR-only and avoid schema/source implementation scope.
- `CF-W1-UX-01`: active `CF-W1-UX-01A` child must finish before any follow-on UX trust-surface expansion.

## Teams Ready To Pick Up New Tasks

- Team 03: `CF-W1-CAL-01`, `CF-W1-SQLAB-02`, `CF-W1-STRAT-02`, `CF-W1-MD-02`, `CF-W1-SQLAB-01`
- Team 04: QA-plan prep for `CF-W1-CAL-01`, `CF-W1-SQLAB-02`, `CF-W1-STRAT-02`, `CF-W1-MD-02`, and `CF-W1-SQLAB-01` once Team 03 contract packets land or refresh
- Team 07 lane teams: `CF-W1-L3-WATCH-01` and then `CF-W1-L3-INTEL-03` when current portfolio / alert lane reservations free up
- Team 08: `CF-W1-UX-01` follow-on definition after the active frontend child closes

## Validation

- Tests run: none
- Builds run: none
- UI checks run: none
- Live local data checks run: none
- Skipped reason: Team 02 cycle was docs-only and stayed inside the allowed write scope

## Next Gate

Keep Team 00 live implementation routing unchanged. Use the refreshed calibration/signals/strategy/market-data ordering for the next docs-only contract / QA-prep delegation cycle.
