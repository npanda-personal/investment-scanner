# Autonomous Wave Operating Rules

Date: 2026-05-17

## Evidence Sync

Every autonomous wave starts with:

```text
git status --short
git branch --show-current
git log --oneline -10
```

The wave must record or summarize current dirty state before implementation decisions.

## Factories

Start or continue these factories every wave:

- Audit Factory
- Requirement Factory
- Architecture Factory
- QA Factory
- Implementation Factory
- Review/Release Factory

These factories are persistent teams, not substeps inside one prompt. They may run in separate Codex threads, automations, branches, or worktrees. No team should wait idle on one blocked item. If one workstream blocks, create a Decision Packet in `99-decision-inbox/`, move that workstream to the appropriate queue, and continue independent work.

## Parallel Work Rules

- Use independent team threads, automations, worktrees, or subagents for read-only audits, requirements, contracts, QA plans, independent module-local implementation, and reviews.
- Use one writer per file.
- Use one commit per accepted requirement.
- Push remains disabled unless explicitly approved.
- Prefer module-local, non-conflicting work.
- Do not choose downstream implementation that depends on unresolved upstream trust gates.
- Implementation teams pull from `12-ready-queue/` rather than waiting for human prompts.
- Team 0 integrates results and does not implement by default.

## Team Pull Model

Implementation teams may pull work when:

- the ready queue lists a matching requirement,
- the team charter covers the module/lane,
- exact files are reserved,
- branch/worktree isolation is available or unnecessary because no other team writes the same files,
- all standing delegation criteria pass.

If any criterion fails, the team must update the appropriate blocked queue or create a Decision Packet.

## Rejection And Rework

If work is rejected and uncommitted:

- preserve evidence,
- create a rework or revert plan,
- revert only if safe and limited to the current uncommitted slice,
- never revert committed work without human approval.

## Partial Requirement Handling

If a workstream partially completes a broader requirement:

- reframe into a smaller bounded slice if safe,
- track remaining gaps separately,
- do not stop the whole factory.

## Not Ready Handling

If implementation is not ready:

- do not force implementation,
- create requirements/contracts/QA plans,
- move the item to blocked or refinement queue,
- continue other independent work.

## Documentation Discipline

Active execution docs under `docs/execution/codex-parallel-execution-plan-2026-05-16/` are the operating record.

Historical docs under `docs/codex-agent-team-plan/` may be evidence only and must not be modified.
