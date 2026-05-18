# TEAM-02 Requirement Factory Outbox

Date: 2026-05-19

Mode: docs-only requirement discovery after rechecking root `AGENTS.md`, the live runtime queue, ready/blocked queues, next-top-10 candidates, backlog/refinement queues, current module audits, and current backtesting source docs. No application code, tests, Prisma, route registries, package manifests, generated files, Team 00 control docs, Ready queue files, architecture docs, or QA docs changed.

## 2026-05-19 Backtesting Proof-Basis Discovery

## Work Item

Pick a new under-served direct investor/trader-value workflow that is not already active, routed, sequencing-only, or consent-blocked, then add one bounded requirement and refresh Team 02 ranking docs to match the live queue state.

## Files Changed

- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-BT-03-backtesting-proof-basis-overfit-guardrail-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/next-top-10-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/requirements-backlog.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/refinement-queue.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-02-requirement-factory.md`

## Files Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/00-control/team-agent-runtime-queue.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/12-ready-queue/ready-for-implementation.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/12-ready-queue/blocked-by-upstream-dependency.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/12-ready-queue/blocked-by-decision.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/next-top-10-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/requirements-backlog.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/refinement-queue.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/audit-backtesting-trade-risk.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/audit-strategy-signal-rules.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/audit-market-data-data-quality.md`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.md`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.types.ts`
- `frontend/src/features/backtesting-strategy-lab/components/BacktestingStrategyLabPage.tsx`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-BT-02-backtesting-outcome-review-traceability-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-BT-01A-backtesting-dq-fail-closed-characterization-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/00-control/risk-register.md`

## Audited Workflow

Backtesting proof-basis and overfit guardrails: making it explicit when a historical run is single-window-only, sample-limited, and missing broader validation evidence even if the raw run metrics look strong.

## Evidence Summary

- `audit-backtesting-trade-risk.md` already records that overfit controls are diagnostic only and that the module has no walk-forward, holdout, parameter-sensitivity, or minimum-proof gate.
- `backtesting-strategy-lab.md` explicitly says the module does not own walk-forward optimization, Monte Carlo, or advanced quant research.
- Current service/UI evidence already exposes trade-count warnings, benchmark gaps, drawdown warnings, weak-exit warnings, availability, data coverage, and realism warnings, but not one explicit proof-basis summary.
- `CF-W1-BT-02` already covers canonical review disposition and `CF-W1-BT-01A` already covers DQ characterization, so the remaining gap is distinct rather than duplicate.
- The live queue makes `CF-W1-STRAT-03`, `CF-W1-BT-01A`, `CF-W1-RH-01`, `CF-W1-L3-TREV-02`, and `CF-W1-SQLAB-02A` routed, active, or sequencing-controlled rather than fresh Team 02 discovery openings.

## Requirement Added

Added `CF-W1-BT-03-backtesting-proof-basis-overfit-guardrail-requirement.md`.

Bounded scope:

- explicit single-window-only proof framing;
- explicit absence of holdout, walk-forward, and parameter-sensitivity evidence;
- explicit weak-sample proof warnings;
- additive list/detail proof summary later;
- no advanced validation engine, schema, route, shared UI, or simulation rewrite in the first child.

## Queue Delta

- `CF-W1-BT-03` is now the top fresh Team 02 discovery item.
- `CF-W1-STRAT-03` is demoted from "next Team 02 discovery item" because it is already routed to Team 03 architecture in the live runtime queue.
- `CF-W1-BT-01A` is demoted from "next Team 02 discovery item" because it is already in QA.
- `CF-W1-RH-01` and `CF-W1-L3-TREV-02` remain strong Team 00 parallel-safe candidates, but as Ready-evaluation/routing work rather than new requirement discovery.
- `CF-W1-SQLAB-02A` remains sequencing-only after `CF-W1-SQLAB-01`.

## Team 00 Parallel-Safe Candidates

1. `CF-W1-BT-03`
   - route to Team 03 for architecture/contract/work-packet prep;
   - then Team 04 for QA planning.
2. `CF-W1-RH-01`
   - keep as Team 00 Ready evaluation; no duplicate Team 03/04 prep.
3. `CF-W1-L3-TREV-02`
   - keep as Team 00 Ready evaluation when Today Review writer sequencing is safe.
4. `CF-W1-SQLAB-02A`
   - keep as sequencing-only after `CF-W1-SQLAB-01`.

## Blockers / Guardrails

- Do not reopen `CF-W1-BT-02`; the new gap is proof-basis framing, not list/detail review disposition.
- Do not reopen `CF-W1-BT-01A`; that slice is already in gate flow and covers DQ characterization, not proof-basis semantics.
- Stop if `BT-03` widens into walk-forward engines, holdout engines, parameter-sweep tooling, schema changes, shared UI changes, or simulation-math rewrites.
- `CF-W1-STRAT-02B1` remains explicit consent-blocked and should not be substituted in as the next fresh Team 02 discovery item.

## Routing Recommendation

- Team 03 routing recommended: yes, for new `CF-W1-BT-03` prep.
- Team 04 routing recommended: yes, immediately after Team 03 packet completion.
- Team 03/04 rerouting not recommended for `CF-W1-RH-01`, `CF-W1-L3-TREV-02`, or `CF-W1-SQLAB-02A`; those already have prep and now need Team 00 sequencing or Ready evaluation instead.

## Validation

- Tests run: none
- Builds run: none
- UI checks run: none
- Live local data checks run: none
- Skipped reason: Team 02 stayed inside docs-only requirement/ranking scope

Mode: docs-only ranking refresh after rechecking the live runtime queue, Ready queue, blocked queues, and recent Team 00 / Team 03 / Team 04 / Team 06 outboxes. No application code, tests, Prisma, route registries, package manifests, generated files, Team 00 control docs, Ready queue files, or architecture / QA docs changed.

## 2026-05-18 Ranking Refresh - Post-BT-01A / STRAT-02B State

## Work Item

Refresh the next direct-value ranking so Team 00 does not keep pulling from a stale unassigned stack after `CF-W1-BT-01A` promotion, `CF-W1-STRAT-02B` proposal completion, and Team 03 / Team 04 prep completion for `CF-W1-RH-01`, `CF-W1-L3-TREV-02`, and `CF-W1-SQLAB-02A`.

## Files Changed

- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/next-top-10-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-02-requirement-factory.md`

## Files Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/next-top-10-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-STRAT-03-strategy-decision-review-provenance-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-SQLAB-02-signal-outcome-journal-post-event-learning-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-RH-01-research-hub-actionability-evidence-wiring-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-L3-TREV-02-today-review-candidate-snapshot-provenance-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/12-ready-queue/ready-for-implementation.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/12-ready-queue/blocked-by-decision.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/12-ready-queue/blocked-by-shared-file.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/12-ready-queue/blocked-by-upstream-dependency.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/00-control/team-agent-runtime-queue.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-00-orchestrator-integration-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-architecture-factory.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-qa-factory.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-06-outbox.md`

## Result

- Refreshed `next-top-10-candidates.md` to match the actual 2026-05-18 runtime state rather than the earlier stale unassigned stack.
- Removed `CF-W1-BT-01A` from the unassigned stack because it is already promoted and active in Team 06.
- Removed `CF-W1-STRAT-02B` from the unassigned stack because Team 03 completed the proposal packet and Team 04 accepted the proposal QA review; the actionable future opening is consent-gated child `CF-W1-STRAT-02B1`, not the parent packet itself.
- Reclassified `CF-W1-SQLAB-02A`, `CF-W1-RH-01`, and `CF-W1-L3-TREV-02` as Team 00 sequencing / Ready-evaluation items rather than fresh Team 02 discovery gaps.
- Promoted `CF-W1-STRAT-03` to the top unassigned direct-value requirement because it is still unassigned, additive, reviewability-focused, and likely backend-local in the first child.

## Team 02 Dispatch Read

- Next unassigned direct-value requirement: `CF-W1-STRAT-03`
- Best current Team 00 parallel-safe routing candidates:
  1. `CF-W1-STRAT-03` to Team 03 architecture prep, then Team 04 QA planning
  2. `CF-W1-RH-01` to Team 00 Ready evaluation
  3. `CF-W1-L3-TREV-02` to Team 00 Ready evaluation when Today Review writer sequencing is safe
  4. `CF-W1-SQLAB-02A` as a Team 00 sequencing decision after `CF-W1-SQLAB-01`

## Blockers / Guardrails

- `CF-W1-STRAT-02B1` remains blocked until Team 00 intentionally opens an explicit schema / migration / generated / repository consent gate.
- `CF-W1-RH-01` and `CF-W1-RH-02A` still must not run in parallel because they share Research Hub backend files.
- `CF-W1-L3-TREV-02` still must not run in parallel with `CF-W1-L3-TREV-01`.
- `CF-W1-SQLAB-02A` still must not be promoted or implemented in parallel with `CF-W1-SQLAB-01`.

## Validation

- Tests run: none
- Builds run: none
- UI checks run: none
- Live local data checks run: none
- Skipped reason: Team 02 stayed inside docs-only requirement ranking scope

## Routing Note

- Route to Team 03 / Team 04 now: `CF-W1-STRAT-03`
- Do not route back to Team 03 / Team 04 for duplicate prep: `CF-W1-RH-01`, `CF-W1-L3-TREV-02`, `CF-W1-SQLAB-02A`

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
