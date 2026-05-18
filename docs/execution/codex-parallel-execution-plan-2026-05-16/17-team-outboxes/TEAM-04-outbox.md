# TEAM-04 Outbox

Date: 2026-05-18

Team: TEAM-04 - QA Factory

State: Docs-only QA planning completed for `CF-W1-UX-01A`

## Assignment

Prepare focused QA planning for the narrowed `CF-W1-UX-01` first child: frontend-only Stock Research Workbench trust framing from existing page evidence.

## Files Changed

- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-UX-01-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-outbox.md`

## Files Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-UX-01-stock-research-workbench-trust-surfaces-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-UX-01-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-UX-01-stock-research-workbench-trust-surfaces-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-UX-01-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/audit-ux-research-copilot.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/16-team-inboxes/TEAM-04-current-assignment.md`
- `frontend/src/features/stock-research-workbench/components/StockResearchWorkbenchPage.tsx`
- `frontend/src/features/stock-research-workbench/types.ts`
- `frontend/tests/ui/README.md`
- `frontend/package.json`
- `frontend/tests/ui/stock-research-workbench.spec.ts` presence check

## Result

- Prepared `CF-W1-UX-01-qa-plan.md` as a bounded frontend-only QA plan for `stock-research-workbench`.
- Locked the QA packet to existing-source-only trust framing and current requested scope evidence.
- Recorded assertions against invented DQ readiness, invented trusted labels, invented proof fields, advice-like wording, shared UI drift, route drift, navigation drift, and cross-feature widget edits.
- Recorded empty, error, and loading-state expectations from the current page behavior.
- Recorded exact stop conditions for backend DTO/endpoint changes, Signal/Strategy widget edits, shared-component edits, or new proof-field requirements.
- Recorded focused future commands as frontend-only:
  - `cd frontend && npm.cmd run build`
  - `cd frontend && npm.cmd run test:ui -- stock-research-workbench.spec.ts --workers=1`

## QA Readiness Verdict

`CF-W1-UX-01A` is QA-plan ready for Team 00 Ready evaluation as one bounded frontend-only Stock Research Workbench trust-framing child.

## Blockers

- Executable QA remains blocked until Team 00 promotes the bounded child and assigns the exact reservation set.
- Team 08 or the Team 00-assigned Lane 3 frontend owner must accept the page/types/UI-spec reservation set.
- `frontend/tests/ui/stock-research-workbench.spec.ts` does not exist yet; the eventual implementation must add it or hand off an explicit UI-smoke blocker.
- Any implementation pressure toward backend DTO/endpoint changes, SignalWidget/StrategyDecisionWidget edits, shared components, or new proof fields invalidates this child and must return to Team 00 / Architect.

## Tests Run

None.

This was a docs-only QA planning pass. No builds, UI smoke tests, browser checks, local servers, or application source/test edits were run.

## Next Gate

- Team 00: evaluate `CF-W1-UX-01A` for Ready promotion as the bounded frontend-only child only.
- Team 08 or Team 00-assigned Lane 3 frontend owner: accept the reservation set and implement within the defined stop lines.
- Team 04: execute the focused frontend build and module-owned UI smoke only after implementation handoff exists.

## Teams Ready To Pick Up New Tasks

- Team 04 is clear to take the next docs-only QA planning packet until a new executable QA handoff is promoted.
- Team 00 can route the narrowed `CF-W1-UX-01A` child for Ready evaluation.
- Team 08 or the assigned Lane 3 frontend owner can review the bounded implementation reservation set.
