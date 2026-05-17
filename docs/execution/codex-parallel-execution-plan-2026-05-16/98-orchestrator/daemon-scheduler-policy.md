# Daemon Scheduler Policy

Date: 2026-05-17

## Purpose

Team 00 is the runtime scheduler for the multi-team Codex factory. The scheduler treats team execution as a rolling pool, not as a one-time wave.

## Core Rules

1. Team 00 is the runtime scheduler.
2. Team 00 must treat team execution as a rolling pool, not a one-time wave.
3. A team returning a report does not end the factory cycle.
4. A team returning a report makes that team eligible for immediate reassignment.
5. A queued team must launch as soon as a runtime slot becomes available.
6. If no implementation work is ready, teams must continue audit, refinement, contract, and QA prep instead of idling.
7. Team 02 Requirement Factory must run frequently and continuously, not once per cycle.
8. Team 03 Architecture Factory must prepare contracts continuously.
9. Team 04 QA Factory must prepare validation plans continuously.
10. Teams 05-09 must pull implementation work when ready; otherwise they audit/refine their module domains.
11. Team 10 Review / Release must process integration queue items continuously.
12. Team 00 must not wait for all teams to finish before launching the next available team.
13. Team 00 must not stop after one consolidated report unless a true stop condition exists.
14. Team 00 must maintain a rolling cycle counter.
15. Team 00 must maintain a team heartbeat table.
16. Team 00 must maintain a ready-work pressure indicator.
17. Team 00 must maintain a blocked-work pressure indicator.
18. Team 00 must maintain a queue-depth view for each team.
19. Team 00 must escalate only true consent blockers to `99-decision-inbox/`.
20. Team 00 must continue independent workstreams when one workstream is blocked.

## Standing Worktree, Commit, And Push Authorization

The Product Owner has approved continuous multi-team execution with standing worktree, commit, and push authorization to `dev` under strict gates.

Team 00 may create or assign separate branches/worktrees for Teams 03-10 when work is isolated by requirement and one-writer-per-file is enforced.

Team 00 may commit and push only when `98-orchestrator/standing-delegation-policy.md` push conditions pass. Push must be a normal non-force push to `dev`; push to `main` or `master` is forbidden.

This authorization does not permit forbidden/high-risk files, live providers, paid/cloud work, unresolved product-policy decisions, or unsafe mixed-scope git state.

## Rolling Execution Algorithm

1. Evidence sync:
   - `git status --short`
   - `git branch --show-current`
   - `git log --oneline -10`

2. Load:
   - active board,
   - risk register,
   - open decisions,
   - ready queue,
   - blocked queues,
   - refinement queue,
   - team inboxes,
   - team outboxes,
   - integration queue.

3. Consume completed outboxes:
   - classify outputs,
   - update board/queues,
   - launch review/release if needed.

4. Process integration queue:
   - review accepted outputs,
   - run gates,
   - commit accepted scoped work,
   - route rejected work to revision.

5. Refresh requirements:
   - launch or relaunch Requirement Factory,
   - refine backlog/top candidates,
   - move ready work into ready queue.

6. Refresh architecture:
   - launch or relaunch Architecture Factory,
   - prepare contracts/file reservations for next candidates.

7. Refresh QA:
   - launch or relaunch QA Factory,
   - prepare validation plans for next candidates.

8. Assign implementation:
   - scan ready queue,
   - reserve files,
   - assign to matching implementation team,
   - launch team in runtime slot/worktree if available.

9. Fill open runtime slots:
   - launch queued teams,
   - relaunch finished teams with more work,
   - launch audit/refinement work if no implementation work is ready.

10. Escalate:
   - write Decision Packets only for true consent blockers,
   - do not block unrelated work.

11. Iterate:
   - repeat steps 2-10,
   - do not return a final report after one iteration,
   - return only if a daemon stop condition is hit or the Product Owner explicitly asks for a report.

## Stop Conditions

Team 00 may stop the full daemon only if:

- all workstreams are blocked by true consent blockers,
- runtime/session limit is reached,
- memory/resource gate blocks more work,
- the human Product Owner explicitly stops the daemon,
- git state becomes unsafe or unclassifiable,
- all available work is complete and no audits/refinement/prep remain,
- subagent/thread execution is unavailable and no further local planning is possible.

## Runtime Limit Checkpoint

If runtime/session limit is reached:

- do not treat it as project completion,
- checkpoint the current state,
- update the active board,
- update team outboxes,
- update `open-decisions.md`,
- write a resume prompt to `09-summaries/daemon-resume-prompt.md`,
- return the resume prompt path and current stop reason.

## Checkpoint Report Protocol

Every daemon checkpoint report must explicitly include:

- stop reason,
- whether the stop is a true consent blocker, runtime/resource limit, unsafe git state, all-work-blocked state, or explicit Product Owner stop,
- Product Owner action required: `yes` or `no`,
- open decisions path: `99-decision-inbox/open-decisions.md`,
- resume prompt path: `09-summaries/daemon-resume-prompt.md`,
- whether `daemon-resume-prompt.md` was created or updated in the checkpoint,
- current git status,
- latest relevant commits,
- setup or work-item commit SHA when applicable,
- push status when a push was attempted,
- ready queue depth,
- refinement queue depth,
- integration queue depth,
- teams active, queued, idle, and blocked,
- exact next autonomous action.

If `09-summaries/daemon-resume-prompt.md` is missing, Team 00 must create it before returning a checkpoint report. If it exists, Team 00 must refresh it with the latest cycle id, iteration, open-decision state, queue state, stop conditions, and next autonomous action.

Checkpoint reports must not imply project completion unless all available work is complete and no audit/refinement/prep remains.

## Pressure Indicators

Ready-work pressure:

- `none`: no ready implementation items.
- `low`: one docs-only or one low-risk implementation item ready.
- `medium`: two or three non-conflicting ready items.
- `high`: more ready items than runtime slots.

Blocked-work pressure:

- `none`: no blocked items.
- `low`: blocked items do not affect current top candidates.
- `medium`: blocked items affect next implementation choices.
- `high`: all implementation candidates are blocked by consent, shared-file, or upstream dependencies.

## Runtime Principle

No runtime slot should remain idle while safe audit, refinement, architecture, QA, review, or implementation work is available.
