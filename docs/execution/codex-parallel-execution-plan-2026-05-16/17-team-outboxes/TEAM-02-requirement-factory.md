# TEAM-02 Requirement Factory Outbox

Date: 2026-05-18

Mode: docs-only backlog refresh. No application code, tests, Prisma, route registries, package manifests, generated files, Team 00 control docs, or Ready queue files changed.

## Work Item

Refresh the requirement backlog around direct investor/trader value, demote admin/settings/notification convenience work, and identify independent candidates Team 00 can route in parallel while Team 06 owns `CF-W1-SIG-TRIGGER-02A`.

## Files Changed

- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/next-top-10-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/refinement-queue.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-SQLAB-02-signal-outcome-journal-post-event-learning-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-STRAT-02-strategy-framework-rule-versioning-dq-gate-policy-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-MD-02-durable-market-data-readiness-evidence-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-TP-02-trade-plan-exit-invalidation-semantics-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-UX-01-stock-research-workbench-trust-surfaces-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-02-requirement-factory.md`

## Files Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/00-control/active-work-board.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/00-control/team-agent-runtime-queue.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/next-top-10-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/refinement-queue.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-SQLAB-02-signal-outcome-journal-post-event-learning-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-STRAT-02-strategy-framework-rule-versioning-dq-gate-policy-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-MD-02-durable-market-data-readiness-evidence-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-SIG-TRIGGER-02-persisted-trigger-auditability-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-TP-02-trade-plan-exit-invalidation-semantics-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-UX-01-stock-research-workbench-trust-surfaces-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/audit-strategy-signal-rules.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/audit-backtesting-trade-risk.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/audit-market-data-data-quality.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/audit-ux-research-copilot.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/12-ready-queue/README.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-02-requirement-factory.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/99-decision-inbox/open-decisions.md`
- `backend/src/modules/signal-quality-lab/**`
- `backend/src/modules/strategy-framework/**`
- `backend/src/modules/market-data-foundation/**`
- `backend/src/modules/signal-generation-engine/**`
- `backend/src/modules/trade-plan-risk-engine/**`
- `backend/src/modules/stock-research-workbench/**`

## Top Parallel Candidates

These are the highest-value independent docs-only candidates Team 00 can route now without waiting for Team 06 implementation files from `CF-W1-SIG-TRIGGER-02A`:

1. `CF-W1-SQLAB-02`
2. `CF-W1-STRAT-02`
3. `CF-W1-TP-02`
4. `CF-W1-MD-02`
5. `CF-W1-UX-01`

## Current Ranking Decision

Updated top-10 order:

1. `CF-W1-SQLAB-02`
2. `CF-W1-STRAT-02`
3. `CF-W1-TP-02`
4. `CF-W1-MD-02`
5. `CF-W1-UX-01`
6. `CF-W1-SIG-TRIGGER-02`
7. `CF-W1-L3-INTEL-03`
8. `CF-W1-L3-WATCH-01`
9. `CF-W1-L3-INTEL-02`
10. `CF-W1-L3-ALERT-03`

`CF-W1-SIG-TRIGGER-02` remains high user value, but it is not an immediate parallel-dispatch candidate because Team 06 currently owns the same module through `CF-W1-SIG-TRIGGER-02A`.

## Blockers

- `CF-W1-SQLAB-02`: keep the current `CF-W1-SQLAB-02A` preview child separate; durable storage must stay explicitly split.
- `CF-W1-STRAT-02`: stop and split if durable rule revision requires schema, generated types, or shared contracts.
- `CF-W1-TP-02`: do not merge it with the already accepted `CF-W1-TP-01B` compatibility slice.
- `CF-W1-MD-02`: ADR-only; no source, Prisma, provider, scheduler, or startup implementation is approved.
- `CF-W1-UX-01`: do not reopen `CF-W1-UX-01A`; backend trust proof must use public upstream outputs only.
- `CF-W1-SIG-TRIGGER-02`: same-module follow-on should wait until Team 06 finishes `CF-W1-SIG-TRIGGER-02A` and Team 00 can verify the next reservation.

## Recommended Next Team 00 Action

Launch parallel docs-only prep in this order:

1. Team 03 + Team 04 on `CF-W1-SQLAB-02`
2. Team 03 + Team 04 on `CF-W1-STRAT-02`
3. Team 03 + Team 04 on `CF-W1-TP-02`
4. Team 03, with Team 04 ADR QA checklist support, on `CF-W1-MD-02`

Hold `CF-W1-SIG-TRIGGER-02` behind the active `CF-W1-SIG-TRIGGER-02A` implementation outcome.

## Validation

- Tests run: none
- Builds run: none
- UI checks run: none
- Live local data checks run: none
- Skipped reason: Team 02 stayed inside docs-only backlog/refinement scope

## Notes

- No delegated Product Owner acceptance/support gate was routed to Team 02 in this cycle.
- No acceptance ambiguity was identified from the inspected requirement queue; if Team 00 routes a specific acceptance-support packet later, it should preempt further discovery work.
- No item was moved to Ready.
- No application files were reserved or modified.
- No commit was created.
