# TEAM-08 Current Assignment

Date: 2026-05-17

Team: TEAM-08 - UX / Research / Copilot

Prompt file: `docs/execution/codex-parallel-execution-plan-2026-05-16/15-automation-prompts/AUTO-08-ux-research-copilot.md`

## Assignment

`CF-W1-UX-02` and `CF-W1-UX-05` policies are resolved, but implementation remains blocked until Copilot-only contracts, QA plans, exact file reservations, and Team 00 handoffs exist. Continue docs-only UX and trust-state refinement.

Current priority:

1. Refresh `CF-W1-UX-02` for Option B: `Local Research Copilot` / `Research Copilot`, hidden blocked narrative, Copilot-only first slice, source-supported trust fields only.
2. Keep Stock Research Workbench, shared UI, navigation, route, package, provider, Prisma, and generated-file changes out of scope.
3. Refresh `CF-W1-UX-05A` as Copilot-only copy cleanup after or together with `CF-W1-UX-02`; keep shared `StatusBadge`, Research Hub, and Market Data UI future.

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

No UX Decision Inbox item remains open. Implementation and Playwright trust-state validation are still blocked until Team 00 promotes an exact Copilot-only handoff.

## Expected Outbox

Update `17-team-outboxes/TEAM-08-outbox.md`.
