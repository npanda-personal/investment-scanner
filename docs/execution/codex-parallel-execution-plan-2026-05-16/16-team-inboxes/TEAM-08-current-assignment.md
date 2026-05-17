# TEAM-08 Current Assignment

Date: 2026-05-17

Team: TEAM-08 - UX / Research / Copilot

Prompt file: `docs/execution/codex-parallel-execution-plan-2026-05-16/15-automation-prompts/AUTO-08-ux-research-copilot.md`

## Assignment

`CF-W1-UX-02` implementation is blocked by open Product/UX/Architect decision. Continue docs-only UX and trust-state refinement.

Current priority:

1. Refine trust-state UX questions for `DECISION-20260517-copilot-trust-ux-policy`.
2. Keep first implementation slice Copilot-only unless the decision approves broader Stock Research/shared UI scope.
3. Continue `CF-W1-UX-05` copy/status inventory as docs-only work.

## Scope

Allowed writes:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-UX*.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-QA-UI*.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-UX*.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-UX*.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-08*.md`

Forbidden:

- frontend or backend Copilot source/tests
- Stock Research source/tests
- shared UI
- navigation or route files
- Playwright tests
- application builds or dev servers

## Branch / Worktree

Use shared `dev` for docs-only UX prep. If `CF-W1-UX-02` is later promoted, use `codex/team08-ux-copilot/CF-W1-UX-02` and `../investment-scanner-worktrees/team08-CF-W1-UX-02`.

## Blockers

`DECISION-20260517-copilot-trust-ux-policy` blocks implementation and Playwright trust-state validation.

## Expected Outbox

Update `17-team-outboxes/TEAM-08-outbox.md`.
