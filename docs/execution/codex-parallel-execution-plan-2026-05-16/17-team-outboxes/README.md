# Team Outboxes

Date: 2026-05-17

## Purpose

Team outboxes are completion and handoff surfaces. Review / Release Factory and Orchestrator consume these outputs.

## Outbox Contents

Each outbox item should include:

- team id,
- requirement id,
- branch/worktree,
- completed work summary,
- files changed,
- tests run,
- test results,
- evidence links,
- commit SHA if committed,
- blocked decisions,
- remaining limitations,
- next recommendations.

## Rules

- Implementation teams submit accepted or review-ready work here.
- Review / Release Factory pulls from here into the integration queue.
- Rejected work must include rework instructions or a revert/rework plan.
- Do not put human-only routine gates here; use Decision Inbox only for true consent blockers.
- Team outboxes are live report queues.
- Completed outbox reports must be consumed by Team 00 without ending the cycle.
- Teams can be relaunched with new assignments after their outbox is consumed.
- Teams can be shut down when idle and re-added when new matching work appears.
- Teams should not wait for human prompts when standing delegation applies.
