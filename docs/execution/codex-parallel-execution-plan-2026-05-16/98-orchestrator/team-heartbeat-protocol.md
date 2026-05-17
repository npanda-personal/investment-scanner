# Team Heartbeat Protocol

Date: 2026-05-17

## Purpose

Each persistent Codex team must publish lightweight progress so Team 0 can coordinate without turning into a manual approval bottleneck.

## Heartbeat Contents

Each active team heartbeat should include:

- team id and name,
- current branch/worktree,
- active requirement id,
- state,
- files reserved,
- files changed,
- tests or checks run,
- blockers,
- Decision Packets created,
- outbox artifact path,
- next intended action.

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
