# Autonomous Orchestrator Cadence

Date: 2026-05-17

## Continuous Factory Wave

Runs until it completes safe work or hits a true consent blocker.

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
- next-ready queue refresh.

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

Perform QA, code review, Architect signoff, Product Owner packet, and local commit for accepted work.

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
- worktrees when parallel implementation is likely.

Parallel implementation should prefer separate worktrees or clearly reserved disjoint file sets.

