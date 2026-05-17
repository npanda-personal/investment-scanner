# TEAM-04 Current Assignment

Date: 2026-05-18

Team: TEAM-04 - QA Factory

Prompt file: `docs/execution/codex-parallel-execution-plan-2026-05-16/15-automation-prompts/AUTO-04-qa-factory.md`

## Assignment

Prepare QA plans, focused command guidance, and validation evidence requirements. No executable QA is authorized until Team 00 promotes a bounded implementation handoff.

Current priority after Team 01 audit consumption:

1. Prepare or revise QA plans and focused test commands for `CF-W1-L3-PORT-01A`.
2. Prepare or revise QA plans and focused test commands for `CF-W1-TP-01B`.
3. Prepare or revise QA plans and focused test commands for `CF-W1-NOTIF-02`.
4. Prepare or revise QA plans and focused test commands for `CF-W1-L3-ALERT-01`.
5. Keep `CF-W1-L3-INTEL-01` QA blocked behind accepted `CF-W1-L3-PORT-01A`.
6. Keep `CF-W1-MD-01`, `CF-W1-UX-02`, `CF-W1-UX-05`, `CF-W1-AUTH-01`, and `CF-W1-SUB-01` executable QA blocked until their decisions resolve.

No executable QA is authorized. Commands are guidance only until Team 00 promotes a bounded implementation handoff.

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

Executable QA is blocked for all current candidates because no app-code item is Ready.

Decision reconciliation:

- Five decisions remain open and scoped.
- They do not block QA plan preparation for `CF-W1-L3-PORT-01A`, `CF-W1-TP-01B`, `CF-W1-NOTIF-02`, or `CF-W1-L3-ALERT-01`.

## Expected Outbox

Update `17-team-outboxes/TEAM-04-qa-factory.md` with QA-plan status and blocked executable commands.
