# Team Heartbeat Protocol

Date: 2026-05-17

## Purpose

Each persistent Codex team must publish lightweight progress so Team 0 can coordinate without turning into a manual approval bottleneck.

## Heartbeat Contents

Each active team heartbeat should include:

- team id and name,
- current state: running / queued / idle / blocked / completed / relaunched,
- current assignment,
- input source,
- output target,
- current branch/worktree,
- active requirement id,
- files inspected,
- files reserved,
- files changed,
- tests or checks run,
- commit SHA if any,
- blockers,
- Decision Packets created,
- outbox artifact path,
- next assignment recommendation,
- can continue without human approval: yes/no,
- reason if no,
- next relaunch condition.

## Heartbeat Locations

Team inboxes:

```text
16-team-inboxes/
```

Team outboxes:

```text
17-team-outboxes/
```

Integration queue:

```text
18-integration-queue/
```

## States

Use active board states:

- Backlog Candidate
- Audit In Progress
- Audit Complete
- Needs Product Refinement
- Needs Architecture Contract
- Needs QA Plan
- Ready for Implementation
- Implementation In Progress
- Developer Validation
- QA Verification
- Code Review
- Architect Signoff
- PO Acceptance Packet
- Conditionally Accepted
- Committed
- Blocked
- Rejected / Rework
- Deferred

## Cadence

Heartbeats are recommended after:

- pulling work,
- reserving files,
- finishing implementation,
- running focused tests,
- hitting a true consent blocker,
- submitting to Review / Release,
- committing accepted work.

Do not require a wall-clock schedule. Codex app automations may configure cadence manually.

## Team 00 Requirement

Team 00 must update the heartbeat state after every consumed team report. A completed team should be marked either `relaunched`, `queued`, `idle`, or `blocked`; it should not disappear from the runtime pool.
