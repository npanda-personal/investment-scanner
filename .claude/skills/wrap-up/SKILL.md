---
name: wrap-up
description: The Post-Work Protocol - run after any source-code change, before declaring work done (the Stop hook enforces this). Scoped QA pass, snapshot re-materialization when relevant, cleanup of spawned processes, and a Done Report with proof.
---

# Wrap Up (Post-Work Protocol)

Run this after source-code changes, before ending the turn. It satisfies the `.claude/.pending-wrapup` Stop-hook gate.

## Steps

1. **Scoped QA pass, looped until clean** — follow `/qa-pass`, scoping jest/playwright to the modules actually touched (`git status` tells you). Full gates for cross-cutting changes. If any gate fails: fix the issue, re-run the failed gates, and repeat until QA passes with NO new issues. "Done" exists only after a fully clean pass — never report done with known red gates.
2. **Snapshot re-materialization (conditional)** — if anything snapshot-producing changed (snapshot-assembler, earnings/sector/market/stock-interest intelligence, market scans, signal text generation), follow `/refresh-snapshots` for a narrow scope (one symbol) and prove the fix surfaces. Skip with a stated reason if nothing snapshot-related changed.
3. **Shut down the session's isolated servers (MANDATORY)** — if this session ran a dedicated FE/BE for a worktree (offset ports, e.g. BE 3001+, FE 5174+), stop them now by port:
   `Get-NetTCPConnection -LocalPort <port> -State Listen | %{ Stop-Process -Id $_.OwningProcess -Force }`
   Also kill any other process you spawned (temp servers, leftover playwright `headless_shell`/`ms-playwright`, orphaned `jest-worker`). **NEVER stop** the shared backend 3000, frontend 5173, or Docker — those stay up. Verify with a process/port check and SHOW the output proving your spawned processes are gone — "I cleaned up" without proof does not count.
4. **Merge to dev and delete the worktree (MANDATORY — NON-NEGOTIABLE for worktree sessions)** — an open worktree is NEVER allowed to coexist with a "done" task. **Merge and delete are ONE atomic step: never run a merge into `dev` without immediately removing that worktree in the same breath — a merged-but-undeleted tree is forbidden, not even momentarily at done.** To finish: commit the branch → merge it into `dev` → `ExitWorktree` with removal so the tree is deleted. After this, `git worktree list` must show NO entry under `.claude/worktrees/` for this session. **If the work cannot be merged (QA still red, blocked, owner review pending), the task is NOT done** — leave the worktree open, but report the task as *pending* (not done) with the blocker. There is no "done with an open worktree" state. Open worktrees create mess; zero tolerance at done.
5. **Done Report** — final message must contain:
   - What changed (files + one-line why each, or grouped pattern)
   - QA table from step 1 (real command results)
   - Proof the change works (test output, endpoint response, or refreshed-snapshot evidence — not "should work")
   - Anything skipped, with the reason
   - Items pending (in-scope but unfinished, with blocker)
   - Backlog candidates: next-priority items discovered during the work but out of scope — the owner prioritizes these

A task is **not done** until steps 3 and 4 are satisfied — the session's isolated servers are confirmed stopped AND the worktree has been merged to `dev` and deleted (zero open worktrees from this session). These are hard gates, not optional housekeeping. "Done" with an open worktree is not a valid state.

If the session made *no* source changes (docs/config only) and ran no isolated servers / no worktree, steps 1–4 reduce to whatever validates the actual change (e.g. JSON parses, links resolve) — say so explicitly.
