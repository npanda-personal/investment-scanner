# Worktree / Branch Policy

Date: 2026-05-17

## Purpose

Parallel implementation must be isolated. Each implementation team should use a separate branch or worktree for one accepted requirement.

## Defaults

Branch naming:

```text
codex/team05-md-dq/{requirement-id}
codex/team06-strategy-signal/{requirement-id}
codex/team07-portfolio-alerts/{requirement-id}
codex/team08-ux-copilot/{requirement-id}
codex/team09-platform/{requirement-id}
```

Worktree naming:

```text
../investment-scanner-worktrees/team05-{requirement-id}
../investment-scanner-worktrees/team06-{requirement-id}
../investment-scanner-worktrees/team07-{requirement-id}
../investment-scanner-worktrees/team08-{requirement-id}
../investment-scanner-worktrees/team09-{requirement-id}
```

## Rules

- One requirement per branch/worktree.
- One writer per file.
- No two teams may edit the same module file concurrently.
- Shared/high-risk files require Team 0 Orchestrator reservation before edits.
- Push remains disabled unless explicitly approved.
- Local commits are allowed only under the standing delegation policy.
- Rejected work remains isolated in its branch/worktree until Team 0 decides whether to preserve, revise, or safely revert.
- Orchestrator integrates accepted commits and records integration evidence.

## Shared / High-Risk Files

These require explicit Orchestrator reservation and often a Decision Packet:

- Prisma schema/migrations.
- Backend/frontend route registries.
- Shared backend utilities.
- Shared UI.
- Package manifests.
- Generated/common fixtures.
- `backend/src/server.ts`.
- `backend/.env.example`.
- `.gitignore`.
- Root `AGENTS.md`.
- `docs/AGENTS.md`.
- `docs/codex-agent-team-plan/**`.

## Conflict Handling

If two teams need the same file:

1. Stop only the affected workstreams.
2. Move one or both items to the integration queue or blocked queue.
3. Create a Decision Packet only if the conflict cannot be resolved by sequencing.
4. Continue unrelated teams.
