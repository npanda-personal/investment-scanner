# Autonomous Orchestrator Cadence

Date: 2026-05-17

## Continuous Factory Wave

Runs until it completes safe work, reaches a runtime/session checkpoint, or hits a true consent blocker.

Expected activities:

- evidence sync,
- audit continuation,
- requirement refinement,
- architecture contract prep,
- QA plan prep,
- safe implementation pull,
- focused validation,
- review/signoff/acceptance packet,
- exact scoped local commit,
- exact scoped push to `dev` when standing push gates pass,
- next-ready queue refresh.

This is not a single sequential thread. A continuous wave can include several team automations running at the same time and reporting through inboxes, outboxes, and the integration queue.

A continuous wave is not the same as the daemon. The daemon keeps cycling after one wave report. Team 00 should write periodic checkpoints to `09-summaries/daemon-cycle-latest.md` instead of returning final reports when no stop condition exists.

## Recommended Team Cadences

These are recommended patterns, not mandatory wall-clock schedules:

- Team 0 Orchestrator / Integration: frequent heartbeat; monitor outboxes, integration queue, ready queue, and decision inbox.
- Team 1 Audit Factory: recurring read-only audits by module lane.
- Team 2 Requirement Factory: recurring backlog refinement and next-top-10 refresh.
- Team 3 Architecture Factory: contract and file-reservation prep for near-ready items.
- Team 4 QA Factory: QA-plan and validation-command prep for near-ready items.
- Teams 5-9 Implementation: continuous pull when the ready queue has matching safe work.
- Team 10 Review / Release: continuous review of team outboxes and integration queue.
- Human Product Owner: review only `99-decision-inbox/` unless explicitly requesting another review surface.

## Daemon Cadence

Recommended daemon rhythm:

- Team 00: frequent scheduler loop over queues, outboxes, integration queue, and decision inbox.
- Team 02: relaunch whenever new audits arrive, stale backlog is detected, or next-ready candidates are exhausted.
- Team 03: relaunch whenever top candidates lack current contracts or file reservations.
- Team 04: relaunch whenever top candidates lack focused validation plans.
- Teams 05-09: pull implementation when ready work exists; otherwise audit/refine module domains.
- Team 10: relaunch whenever integration queue or review-ready outboxes are non-empty.

Do not specify mandatory wall-clock timing. Codex app automations may configure cadence manually.

## Daily Or Recurring Automation

Refresh:

- ready queue,
- blocked queues,
- open decisions,
- risk register,
- active board,
- next requirements,
- next contracts,
- next QA plans.

## Implementation Wave

Execute up to three non-conflicting ready items.

Each item must have:

- current source/test inspection,
- ready work packet,
- acceptance criteria,
- exact file reservation,
- QA plan,
- architecture review when needed,
- no true consent blocker.

## Review Wave

Perform QA, code review, Architect signoff, Product Owner packet, local commit, and scoped push to `dev` for accepted work when standing push gates pass.

Codex handles these gates internally when the standing delegation conditions pass.

## Decision Review

The human Product Owner reviews only files in:

```text
99-decision-inbox/
```

Accepted or resolved decisions may be mirrored in `99-decision-outbox/`.

## Codex App Automation Note

Future Codex app automations should use:

- this active execution folder,
- the standing delegation policy,
- the escalation rules,
- the multi-team topology,
- team charters,
- team automation prompts,
- worktrees when parallel implementation is likely.

Parallel implementation should prefer separate worktrees or clearly reserved disjoint file sets.
