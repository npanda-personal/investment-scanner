# TEAM-02 Requirement Factory Outbox

Date: 2026-05-18

Mode: docs-only backlog refresh after an upstream Market Data durable-evidence child-packet audit. No application code, tests, Prisma, route registries, package manifests, generated files, Team 00 control docs, or Ready queue files changed.

## Work Item

Audit one under-served market-intelligence workflow, convert the evidence into a bounded requirement update, and realign queue docs to the actual 2026-05-18 active, queued, and routed state.

## Files Changed

- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-MD-02A-additive-companion-evidence-schema-packet-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-MD-02-durable-market-data-readiness-evidence-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/next-top-10-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/top-10-ready-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/requirements-backlog.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/refinement-queue.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-02-requirement-factory.md`

## Files Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/16-team-inboxes/TEAM-02-current-assignment.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-MD-02-durable-market-data-readiness-evidence-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-MD-02-durable-readiness-evidence-adr.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-MD-02-durable-readiness-evidence-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-MD-02-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-MD-02-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/TEAM-05-market-data-data-quality-domain-audit-2026-05-17.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/07-decisions/DECISION-20260517-market-data-durable-readiness-storage-adr-resolution.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/12-ready-queue/blocked-by-shared-file.md`
- `backend/src/modules/market-data-foundation/market-data-foundation.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/next-top-10-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/top-10-ready-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/requirements-backlog.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/refinement-queue.md`

## Audited Workflow

Market Data durable readiness evidence and the next bounded child after the accepted ADR draft.

## Evidence Summary

- `CF-W1-MD-02` already has an accepted ADR direction and an actual ADR draft at `03-architecture/CF-W1-MD-02-durable-readiness-evidence-adr.md`, but the requirement queue was still treating the item mostly as a broad parent.
- The ADR draft and work packet already name `CF-W1-MD-02A` as the first future child: an additive Prisma/schema proposal for companion durable evidence storage.
- `market-data-foundation.md` still documents current persistence as `PriceTick` on `symbol + timestamp` and `LatestPrice` on `symbol`, which is narrower than the target durable-evidence natural key and keeps trust claims upstream-limited.
- Team 05's audit confirms that durable provenance remains incomplete for provider symbol, source fingerprint/run id, validation window, duplicate or invalid rows, missing-candle cause, and stale-currentness basis.

## Requirement Refined This Cycle

`CF-W1-MD-02A` was added as the next bounded requirement. The child is docs-only and should define the additive schema-proposal packet boundary, minimum durable evidence fields, and blocked follow-on packets without widening into Prisma edits, repository/service work, or DQE implementation.

## Queue Delta

- `CF-W1-TP-02` remains in active Team 10 review after Team 04 QA ACCEPT and stays excluded from the next unassigned pull.
- `CF-W1-SMI-01` remains in active Team 04 QA-planning flow and stays excluded from the next unassigned pull.
- `CF-W1-RH-01` remains in active Team 03 architecture readiness and stays excluded from the next unassigned pull.
- `CF-W1-L3-TREV-02` remains queued as the next architecture candidate after `CF-W1-RH-01` and stays excluded from this cycle.
- `CF-W1-MD-02A` is now recorded as the next top unassigned requirement for Team 00 because it is upstream, bounded, and already supported by the accepted ADR draft.
- `CF-W1-MD-02` remains visible as the governing parent only; `CF-W1-MD-02B/C/D` stay blocked behind the new child and explicit schema approval.
- `CF-W1-RH-02A` remains a valid next pull, but it moves behind `CF-W1-MD-02A` in the filtered stack.

## Blockers

- `CF-W1-MD-02A`: stop if Team 03 turns the child into actual Prisma/schema work instead of a proposal-only packet.
- `CF-W1-MD-02A`: stop if the child widens into repository/service, DQE handoff, downstream adoption, startup/backfill, provider, or UI scope.
- `CF-W1-MD-02`: keep it as parent only unless the new child is accepted and explicitly sequenced into later `B/C/D` packets.

## Recommended Next Team 00 Action

Use `CF-W1-MD-02A` as the next top unassigned requirement handoff.

1. Route `CF-W1-MD-02A` to Team 03 for architecture/contract prep and Team 04 for ADR QA review.
2. Keep `CF-W1-RH-02A` and `CF-W1-SQLAB-02` next in the filtered pull stack while they remain bounded docs-only follow-ons.
3. Keep `CF-W1-RH-01` and `CF-W1-L3-TREV-02` out of this cycle's unassigned routing because they are already active or queued.

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
