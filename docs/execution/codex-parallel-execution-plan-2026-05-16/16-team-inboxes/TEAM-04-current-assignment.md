# TEAM-04 Current Assignment

Date: 2026-05-17

Team: TEAM-04 - QA Factory

Prompt file: `docs/execution/codex-parallel-execution-plan-2026-05-16/15-automation-prompts/AUTO-04-qa-factory.md`

## Assignment

Prepare QA plans, focused command guidance, and validation evidence requirements. No executable QA is authorized until Team 00 promotes a bounded implementation handoff.

Current priority:

1. Accept or revise child QA readiness for `CF-W1-L3-PORT-01`, `CF-W1-L3-ALERT-01`, `CF-W1-TP-01B`, and `CF-W1-NOTIF-02`.
2. Keep `CF-W1-MD-02` validation as ADR QA only.
3. Keep `CF-W1-MD-01`, `CF-W1-UX-02`, `CF-W1-AUTH-01`, and `CF-W1-SUB-01` executable QA blocked until their decisions resolve.

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

## Expected Outbox

Update `17-team-outboxes/TEAM-04-qa-factory.md` with QA-plan status and blocked executable commands.
