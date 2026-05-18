# TEAM-02 Requirement Factory Outbox

Date: 2026-05-18

Mode: docs-only value-discovery and prioritization cycle. No application code, tests, Prisma, route registries, shared utilities/UI, package manifests, generated files, or Team 00 control docs changed.

## Work Item

Run the next recurring Product Owner / requirement discovery-refinement cycle inside the allowed write scope only.

## Files Changed

- `10-requirements/next-top-10-candidates.md`
- `10-requirements/CF-W1-TP-02-trade-plan-exit-invalidation-semantics-requirement.md`
- `10-requirements/CF-W1-SIG-TRIGGER-02-persisted-trigger-auditability-requirement.md`
- `17-team-outboxes/TEAM-02-requirement-factory.md`

## Files Inspected

- `AGENTS.md`
- `10-requirements/next-top-10-candidates.md`
- `12-ready-queue/ready-for-implementation.md`
- `00-control/active-work-board.md`
- `99-decision-inbox/open-decisions.md`
- `17-team-outboxes/TEAM-02-requirement-factory.md`
- `10-requirements/requirements-backlog.md`
- `10-requirements/refinement-queue.md`
- `10-requirements/CF-W1-SQLAB-02-signal-outcome-journal-post-event-learning-requirement.md`
- `10-requirements/CF-W1-STRAT-02-strategy-framework-rule-versioning-dq-gate-policy-requirement.md`
- `10-requirements/CF-W1-MD-02-durable-market-data-readiness-evidence-requirement.md`
- `10-requirements/CF-W1-TP-01B-trade-plan-backend-dq-hard-block-requirement.md`
- `10-requirements/CF-W1-TP-02-trade-plan-exit-invalidation-semantics-requirement.md`
- `10-requirements/CF-W1-UX-01-stock-research-workbench-trust-surfaces-requirement.md`
- `10-requirements/CF-W1-SIG-TRIGGER-01-full-trigger-object-contract-requirement.md`
- `11-module-audits/audit-strategy-signal-rules.md`
- `11-module-audits/audit-backtesting-trade-risk.md`
- `11-module-audits/audit-ux-research-copilot.md`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.md`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.md`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.md`
- `backend/src/modules/strategy-framework/strategy-framework.md`
- `backend/src/modules/market-data-foundation/market-data-foundation.md`
- `backend/src/modules/market-context-intelligence/market-context-intelligence.md`
- `backend/src/modules/today-trade-review/today-trade-review.md`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.md`

## Source-Backed Findings

- `CF-W1-CAL-01` and `CF-W1-SQLAB-01` were still ranked in the prior top-10 discovery file even though the current Ready queue already shows them promoted and assigned. They were removed from the unassigned discovery ranking.
- The strongest direct user-value unassigned items are still in the signal/strategy/market-data/trade-plan trust stack, not in platform or notification convenience work.
- `CF-W1-SQLAB-02` remains a high-value next docs-only item because the active no-schema preview child proves the workflow, but the durable post-preview path is still undefined.
- `CF-W1-STRAT-02` remains upstream to signal credibility, backtest interpretation, and trade-plan review because rule provenance and DQ-gate trust are still not explicit enough.
- `CF-W1-MD-02` remains the largest upstream market-data trust gap, but it stays ADR-only until schema/source approval is explicitly separated.
- The current `signal-generation-engine` docs and audit trail show that `CF-W1-SIG-TRIGGER-01` only delivered an optional bounded projection. The remaining signal-auditability gap is clear enough to create a follow-on candidate: `CF-W1-SIG-TRIGGER-02`.
- `trade-plan-risk-engine` still documents target/reward geometry and a future exit-review flow gap, so `CF-W1-TP-02` deserves a clearer, higher-value position than Lane 3 convenience items.

## Re-Prioritized Top 10

1. `CF-W1-SQLAB-02`
2. `CF-W1-STRAT-02`
3. `CF-W1-MD-02`
4. `CF-W1-SIG-TRIGGER-02`
5. `CF-W1-TP-02`
6. `CF-W1-UX-01`
7. `CF-W1-L3-INTEL-03`
8. `CF-W1-L3-WATCH-01`
9. `CF-W1-L3-INTEL-02`
10. `CF-W1-L3-ALERT-03`

## New / Refined Requirement Output

- Created `CF-W1-SIG-TRIGGER-02` to capture the remaining persisted trigger-auditability gap after the completed optional projection slice.
- Refined `CF-W1-TP-02` so the next trade-plan semantics slice is clearly about explicit exit/invalidation review logic, not just generic target cleanup.
- Rewrote `next-top-10-candidates.md` to align with the current Ready queue, keep active investor-value branch-gate items visible, and remove stale unassigned ranking entries.

## Blockers

- `CF-W1-SQLAB-02`: keep sequenced behind the active `CF-W1-SQLAB-02A` preview child; durable storage still needs a separate later packet.
- `CF-W1-STRAT-02`: must stay bounded to provenance and DQ policy exposure; do not widen into rule-behavior rewrites or schema work without Architecture direction.
- `CF-W1-MD-02`: ADR-only; schema, source, and generated-type work remain blocked.
- `CF-W1-SIG-TRIGGER-02`: stop and split if the path requires schema, shared trigger contracts, or downstream consumer adoption in the same slice.
- `CF-W1-TP-02`: must stay separate from active `CF-W1-TP-01B`; do not mix compatibility hard-block work with broader route/UI/schema migration.
- `CF-W1-UX-01`: parent follow-on still depends on source-supported trust fields after the active frontend child finishes.

## Ready / Promotion Read

No item was moved to Ready.

No low-value admin/notification/platform item was elevated above market-intelligence work in this cycle.

## Next 3 Candidates Team 00 Should Evaluate

1. `CF-W1-SQLAB-02`
2. `CF-W1-STRAT-02`
3. `CF-W1-MD-02`

## Validation

- Tests run: none
- Builds run: none
- UI checks run: none
- Live local data checks run: none
- Skipped reason: Team 02 cycle was docs-only and stayed inside the allowed write scope

## Next Gate

Keep Team 00 live implementation routing unchanged. Use the refreshed ordering for the next docs-only contract / QA-prep delegation cycle, with the new signal-auditability and refined trade-plan semantics candidates available behind the top three unassigned items.
