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
4. **Merge to dev and delete the worktree (MANDATORY — NON-NEGOTIABLE for worktree sessions)** — an open worktree is NEVER allowed to coexist with a "done" task. **Merge and delete are ONE atomic step: never run a merge into `dev` without immediately removing that worktree in the same breath — a merged-but-undeleted tree is forbidden, not even momentarily at done.** To finish: commit the branch → merge it into `dev` → `ExitWorktree` with removal so the tree is deleted. After this, `git worktree list` must show NO entry under `.claude/worktrees/` for this session.

   **Do this autonomously — NEVER ask for approval to merge or delete.** Being assigned a QA-green task already authorizes its merge. A local merge into `dev` is an internal completion step — it is NOT an outward/publish action, NOT destructive, and NOT an owner decision, so the "confirm consequential actions" instinct does not apply. Do not end a turn with "should I merge?", "say the word and I'll merge", or by presenting the merge as a choice — that over-asking is the exact failure this step exists to prevent. Just perform it. (Only touch worktrees from THIS session — never merge or delete another session's worktree.)

   **The ONLY reasons to stop short of merging:** (a) QA is still red, (b) an unresolved merge conflict you cannot safely resolve, or (c) the change is explicitly gated on human design sign-off agreed *before* the work (e.g. a `schema.prisma` / data-migration change). In those cases the task is **pending, not done** — leave the worktree open and report the *specific* blocker. "I wanted to check before merging" is NOT a blocker. There is no "done with an open worktree" state; zero tolerance at done.
5. **Done Report** — final message must contain:
   - What changed (files + one-line why each, or grouped pattern)
   - QA table from step 1 (real command results)
   - Proof the change works (test output, endpoint response, or refreshed-snapshot evidence — not "should work")
   - Anything skipped, with the reason
   - Items pending (in-scope but unfinished, with blocker)
   - Backlog candidates: next-priority items discovered during the work but out of scope — the owner prioritizes these

A task is **not done** until steps 3 and 4 are satisfied — the session's isolated servers are confirmed stopped AND the worktree has been merged to `dev` and deleted (zero open worktrees from this session). These are hard gates, not optional housekeeping. "Done" with an open worktree is not a valid state.

If the session made *no* source changes (docs/config only) and ran no isolated servers / no worktree, steps 1–4 reduce to whatever validates the actual change (e.g. JSON parses, links resolve) — say so explicitly.
