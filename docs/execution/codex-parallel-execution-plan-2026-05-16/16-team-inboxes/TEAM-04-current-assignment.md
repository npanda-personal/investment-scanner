# TEAM-04 Current Assignment

Date: 2026-05-18

Team: TEAM-04 - QA Factory

Prompt file: `docs/execution/codex-parallel-execution-plan-2026-05-16/15-automation-prompts/AUTO-04-qa-factory.md`

## Assignment

Prepare QA plans, focused command guidance, and validation evidence requirements. `CF-W1-L3-PORT-01A` has been promoted; executable QA for that slice begins only after Team 07 implementation handoff exists.

Current priority after Team 01 audit consumption:

1. Stand by for `CF-W1-L3-PORT-01A` QA after Team 07 implementation; use `04-qa/CF-W1-L3-PORT-01-qa-plan.md`.
2. Prepare or revise QA plans and focused test commands for `CF-W1-TP-01B`.
3. Prepare or revise QA plans and focused test commands for `CF-W1-NOTIF-02`.
4. Prepare or revise QA plans and focused test commands for `CF-W1-L3-ALERT-01`.
5. Keep `CF-W1-L3-INTEL-01` QA blocked behind accepted `CF-W1-L3-PORT-01A`.
6. Refresh QA plans for `CF-W1-MD-01`, `CF-W1-UX-02`, `CF-W1-UX-05`, `CF-W1-AUTH-01`, and `CF-W1-SUB-01` against the resolved policies; executable QA remains blocked until Team 00 promotes exact implementation handoffs.

No executable QA is authorized until the matching implementation exists. For `CF-W1-L3-PORT-01A`, Team 00 has promoted the handoff, but Team 04 must wait for Team 07's implementation outbox before running or reviewing executable QA.

## Scope

Allowed writes:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/**`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04*.md`

Forbidden without Team 00 implementation handoff:

- tests
- builds
- Playwright
- dev servers
- provider/live data calls
- Prisma commands
- application source edits

## Branch / Worktree

Use shared `dev` for docs-only QA planning. For future executable QA tied to an implementation worktree, Team 00 will name the branch/worktree in a new inbox.

## Blockers

Executable QA is blocked until implementation output exists. `CF-W1-L3-PORT-01A` is Ready for Team 07 implementation, but QA is not executable before Team 07 changes and developer validation.

Decision reconciliation:

- No open decisions remain.
- Product Owner action is not required.
- The former decision-blocked items now need QA refresh, exact file reservations, and Team 00 Ready promotion before executable QA.

## Expected Outbox

Update `17-team-outboxes/TEAM-04-qa-factory.md` with QA-plan status and blocked executable commands.
