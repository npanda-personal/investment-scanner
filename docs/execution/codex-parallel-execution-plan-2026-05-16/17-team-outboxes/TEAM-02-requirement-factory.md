# TEAM-02 Requirement Factory Outbox

Date: 2026-05-18

Mode: docs-only backlog refresh after a Strategy Framework durable-history discovery cycle, a backtesting DQ characterization gap audit, and a Strategy Decision provenance gap audit. No application code, tests, Prisma, route registries, package manifests, generated files, Team 00 control docs, or Ready promotion files changed.

## Work Item

Audit one under-served market-intelligence workflow, add or refine one bounded requirement, and realign queue docs to the actual 2026-05-18 active, queued, routed, accepted, and Ready-promoted state.

## Files Changed

- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-STRAT-03-strategy-decision-review-provenance-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-STRAT-02B-strategy-definition-durable-revision-history-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-BT-01A-backtesting-dq-fail-closed-characterization-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/next-top-10-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/top-10-ready-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/requirements-backlog.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/refinement-queue.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-02-requirement-factory.md`

## Files Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/16-team-inboxes/TEAM-02-current-assignment.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/12-ready-queue/ready-for-implementation.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-STRAT-02-strategy-framework-rule-versioning-dq-gate-policy-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-STRAT-02-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-STRAT-02-strategy-framework-rule-versioning-dq-gate-policy-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-STRAT-02-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/09-summaries/CF-W1-STRAT-02A-po-acceptance-packet.md`
- `backend/src/modules/strategy-framework/strategy-framework.md`
- `backend/src/modules/strategy-framework/strategy-framework.registry.ts`
- `backend/src/modules/strategy-framework/strategy-framework.repository.ts`
- `frontend/src/features/strategy-framework/components/StrategyFrameworkPage.tsx`
- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.md`
- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.service.ts`
- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.types.ts`
- `frontend/src/features/strategy-decision-engine/components/StrategyDecisionDashboard.tsx`
- `frontend/src/features/strategy-decision-engine/components/StrategyDecisionWidget.tsx`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/next-top-10-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/top-10-ready-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/requirements-backlog.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/refinement-queue.md`

## Audited Workflow

Strategy Framework durable rule-history and persisted strategy-definition provenance after accepted `CF-W1-STRAT-02A`, plus the new backtesting DQ characterization gap and the under-served Strategy Decision provenance surface that were thin in the current candidate list.

## Evidence Summary

- `12-ready-queue/ready-for-implementation.md` shows `CF-W1-MCTX-01` was already promoted on 2026-05-18, so Team 02's prior queue docs were stale in still treating it as the next unassigned pull.
- Team 03 architecture evidence shows `CF-W1-STRAT-02A` already solved the no-schema trust-surfacing slice on branch commit `359d0a3`.
- The remaining Strategy Framework gap is durable persisted history because current persistence is still `code`-unique and repository seeding can overwrite older definition rows.
- That remaining work is bounded enough to promote from blocked parent `CF-W1-STRAT-02` into explicit child `CF-W1-STRAT-02B`.
- Backtesting still lacks a direct DQ-fail-closed characterization child in the top unassigned docs-only stack, even though the audit shows the current behavior is optional/fail-open when DQ filtering is not strict.
- Strategy Decision Engine already exposes review-candidate and risk-label outputs, but the read path can still create persisted decisions on demand and the current queue does not yet make provenance explicit enough for downstream review surfaces.

## Requirement Added This Cycle

`CF-W1-STRAT-02B` was added as the approval-gated durable-history child for Strategy Framework. It isolates version-keyed persisted definition history, rule-revision snapshots, and additive current-vs-durable history metadata without reopening accepted `CF-W1-STRAT-02A`.

`CF-W1-BT-01A` was added as the smaller backtesting characterization child. It stays test-led and descriptive so Team 00 can route a direct trust-evidence gap without forcing a simulation rewrite.

`CF-W1-STRAT-03` was added as a bounded Strategy Decision provenance child. It stays additive and decision-math-neutral so Team 00 can route a direct review-provenance gap without reopening Strategy Framework rule math.

## Queue Delta

- `CF-W1-MCTX-01` was removed from Team 02's unassigned pull ranking because the current Ready queue already shows it promoted and assigned to Team 05 on 2026-05-18.
- `CF-W1-STRAT-02` is now treated as blocked parent lineage only, not as a direct next pull.
- `CF-W1-STRAT-02B` is now the next top unassigned docs-only requirement for Team 00 routing.
- `CF-W1-BT-01A` now sits immediately behind `CF-W1-STRAT-02B` as the next direct investor/trader-value unassigned pull.
- `CF-W1-SQLAB-02` stays behind `CF-W1-BT-01A`, but remains sequenced behind active `CF-W1-SQLAB-02A`.
- `CF-W1-STRAT-03` now sits immediately behind `CF-W1-SQLAB-02` as the next under-served review-provenance candidate.
- `CF-W1-MD-02` remains next in the filtered stack after the strategy/outcome tranche as parent-only ADR follow-on while `CF-W1-MD-02A` stays active.
- `CF-W1-RH-02A`, `CF-W1-MD-03`, `CF-W1-RH-01`, `CF-W1-L3-TREV-02`, `CF-W1-SMI-01`, and accepted/parked branch work remain excluded from the immediate unassigned pull.

## Blockers

- `CF-W1-STRAT-02B` is approval-gated because it likely needs Prisma/schema, generated artifacts, repository mapping, and focused service/repository tests in one writer set.
- Stop if Team 00 or downstream routing tries to reopen `CF-W1-STRAT-02A` instead of the durable-history child.
- Stop if the child widens into evaluator math, proof-status rewrites, route changes, shared UI, or duplicate DQ logic.

## Recommended Next Team 00 Action

1. Route `CF-W1-STRAT-02B` to Team 03 for an approval-gated architecture packet focused on version-keyed persisted Strategy Framework history.
2. Keep `CF-W1-BT-01A` second in the filtered pull stack for backtesting DQ characterization after the strategy provenance gap.
3. Keep `CF-W1-SQLAB-02` third for post-preview follow-up after `CF-W1-SQLAB-02A`.
4. Treat `CF-W1-STRAT-03` as the next new review-provenance requirement once the current Team 03 tranche is acknowledged.

## Validation

- Tests run: none
- Builds run: none
- UI checks run: none
- Live local data checks run: none
- Skipped reason: Team 02 stayed inside docs-only backlog/refinement scope

## Notes

- No delegated Product Owner acceptance/support gate was routed to Team 02 in this cycle.
- No item was moved to Ready by Team 02.
- No application files were reserved or modified.
- No commit was created.

## 2026-05-18 Direct-Value Stack Refresh

This is the current Team 02 read on the unassigned direct investor/trader-value stack after rechecking the live queue against the post-`613959f` state.

- `CF-W1-STRAT-02B` remains the top unassigned docs-only requirement and should stay the first Team 00 routing candidate.
- `CF-W1-BT-01A` remains the next unassigned direct-value item, but Team 03 should prep it only after `CF-W1-STRAT-02B` is routed.
- `CF-W1-SQLAB-02` remains third in the stack and stays sequenced behind active `CF-W1-SQLAB-02A`.
- `CF-W1-STRAT-03` is the next under-served review-provenance candidate after `SQLAB-02`.
- `CF-W1-MD-02` remains the next upstream parent after `BT-01A`, `SQLAB-02`, and `STRAT-03`.
- `CF-W1-CAL-01` is not part of the unassigned stack; it is already accepted/committed and stays excluded from this discovery pass.

Blockers that still hold the ordering:

- `CF-W1-STRAT-02B` is approval-gated and likely needs schema/generated/repository impact in one writer set.
- `CF-W1-BT-01A` is deliberately characterization-only and should stay ahead of any larger backtesting rewrite.
- `CF-W1-SQLAB-02` remains sequenced behind active `CF-W1-SQLAB-02A`.
- `CF-W1-STRAT-03` is bounded to strategy-decision-engine provenance and should stay additive and decision-math-neutral.
- `CF-W1-MD-02` remains parent-only until the active child split finishes.

Team 03 should prep `BT-01A` next only in the sense that it is the next direct-value prep candidate after `STRAT-02B`; it should not jump ahead of `STRAT-02B`.
