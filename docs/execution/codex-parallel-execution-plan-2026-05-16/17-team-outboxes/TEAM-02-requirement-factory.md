# TEAM-02 Requirement Factory Outbox

Date: 2026-05-18

Mode: docs-only backlog refresh after a Market Data signoff-threshold audit. No application code, tests, Prisma, route registries, package manifests, generated files, Team 00 control docs, or Ready queue files changed.

## Work Item

Audit one under-served market-intelligence workflow, convert the evidence into a bounded requirement update, and realign queue docs to the actual 2026-05-18 active, queued, and routed state.

## Files Changed

- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-MD-03-market-data-signoff-threshold-contract-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/next-top-10-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/top-10-ready-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/requirements-backlog.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/refinement-queue.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-02-requirement-factory.md`

## Files Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/16-team-inboxes/TEAM-02-current-assignment.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/audit-market-data-data-quality.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/TEAM-05-market-data-data-quality-domain-audit-2026-05-17.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/market-data-dq-readiness-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/next-validation-plans.md`
- `backend/src/modules/market-data-foundation/market-data-foundation.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/next-top-10-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/top-10-ready-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/requirements-backlog.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/refinement-queue.md`

## Audited Workflow

Market Data signoff threshold enforcement for review-universe trust.

## Evidence Summary

- `audit-market-data-data-quality.md` and `TEAM-05-market-data-data-quality-domain-audit-2026-05-17.md` both identify the same gap: universe signoff does not fully encode the active `95%` price-ready / `90%` metadata-ready contract as hard gates.
- `market-data-foundation.md` already exposes `coverage.priceCoveragePercentage`, `coverage.metadataCoveragePercentage`, and `universeSignoff`, so the missing behavior is a bounded signoff-trust problem rather than a new product surface.
- `06-contracts/market-data-dq-readiness-contract.md` already records the threshold values, so this is contract enforcement work, not a new Product Owner decision.
- `04-qa/next-validation-plans.md` already names `CF-W1-MD-03` as the future threshold-test packet, which means current docs supported turning it into an explicit requirement.

## Requirement Added This Cycle

`CF-W1-MD-03` was added as a bounded high-user-value requirement for Market Data signoff threshold enforcement. The slice stays inside signoff logic, explanation output, and focused tests. It must not widen into schema/storage ADR work, provider redesign, route changes, or frontend scope.

## Queue Delta

- `CF-W1-MD-02A` is active Team 03 architecture prep and is now removed from the unassigned pull stack.
- `CF-W1-TP-02` remains in active implementation/review follow-up and stays excluded from the next unassigned pull.
- `CF-W1-SMI-01` remains in active Team 06 implementation and stays excluded from the next unassigned pull.
- `CF-W1-RH-01` remains routed to Team 04 QA planning and stays excluded from the next unassigned pull.
- `CF-W1-L3-TREV-02` remains queued for Team 04 QA planning and stays excluded from this cycle.
- `CF-W1-MD-03` is now recorded as the next top unassigned requirement for Team 00 because it is upstream, bounded, and already supported by audit and contract evidence.
- `CF-W1-RH-02A` remains a valid next pull, but it now sits behind `CF-W1-MD-03` in the filtered stack.

## Blockers

- `CF-W1-MD-03`: stop if Team 03 widens the packet into Prisma/schema/storage ADR work, provider/startup redesign, shared-file changes, or frontend/UI scope.
- `CF-W1-MD-03`: stop if the slice tries to redefine the whole universe-state model instead of enforcing and explaining the existing `95%` / `90%` contract thresholds.
- `CF-W1-MD-02A` remains active and should not be reopened by Team 02 unless Team 00 routes a rejection back to requirements.

## Recommended Next Team 00 Action

Use `CF-W1-MD-03` as the next top unassigned requirement handoff.

1. Route `CF-W1-MD-03` to Team 03 for architecture/contract prep and Team 04 for focused QA-plan prep.
2. Keep `CF-W1-RH-02A` and `CF-W1-SQLAB-02` next in the filtered pull stack while they remain bounded docs-only follow-ons.
3. Keep `CF-W1-MD-02A`, `CF-W1-RH-01`, and `CF-W1-L3-TREV-02` out of this cycle's unassigned routing because they are already active or queued.

## Validation

- Tests run: none
- Builds run: none
- UI checks run: none
- Live local data checks run: none
- Skipped reason: Team 02 stayed inside docs-only backlog/refinement scope

## Notes

- No delegated Product Owner acceptance/support gate was routed to Team 02 in this cycle.
- No item was moved to Ready.
- No application files were reserved or modified.
- No commit was created.
