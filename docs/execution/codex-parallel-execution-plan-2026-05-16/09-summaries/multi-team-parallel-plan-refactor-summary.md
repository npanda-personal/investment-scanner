# Multi-Team Parallel Plan Refactor Summary

Date: 2026-05-17

## What Changed

The active execution plan now defines a multi-team Codex operating model with persistent team charters, reusable automation prompts, team inboxes/outboxes, an integration queue, worktree/branch policy, and heartbeat protocol.

New operating folders:

- `14-team-charters/`
- `15-automation-prompts/`
- `16-team-inboxes/`
- `17-team-outboxes/`
- `18-integration-queue/`

## Why The Old Model Was Insufficient

The prior model still behaved like a single Orchestrator wave with substeps. That created false parallelism: audits, requirements, architecture, QA, implementation, review, and integration could still bottleneck on one thread and one context window.

The new model separates durable responsibilities across persistent Codex teams so work can continue while another team is blocked.

## How The New Team Model Works

- Team 0 coordinates and integrates.
- Team 1 audits continuously.
- Team 2 refines requirements continuously.
- Team 3 prepares architecture contracts and file reservations.
- Team 4 prepares QA plans and validation matrices.
- Teams 5-9 pull ready implementation items in isolated branches/worktrees.
- Team 10 reviews, signs off, audits release readiness, and feeds the integration queue.

## How To Start Automations Or Threads

1. Open the relevant prompt under `15-automation-prompts/`.
2. Start a separate Codex thread or Codex app automation for that team.
3. Point it at this active execution folder.
4. For implementation teams, create or use the branch/worktree named by `98-orchestrator/worktree-branch-policy.md`.
5. Give the team a scoped inbox item under `16-team-inboxes/`, or let it pull a matching ready item from `12-ready-queue/`.

## How Decisions Flow

Routine gates stay inside Codex teams:

- readiness checks,
- QA evidence,
- code review,
- Architect signoff,
- PO packets,
- queue updates,
- local commits.

True consent blockers go to:

- `99-decision-inbox/`
- `99-decision-inbox/open-decisions.md`

The human Product Owner normally reviews only the Decision Inbox.

## How Implementation Teams Pull Work

Implementation teams pull only when:

- the item is in `12-ready-queue/ready-for-implementation.md`,
- requirement and acceptance criteria exist,
- architecture and QA plans exist when needed,
- exact file reservations exist,
- no missing Product Owner, Architect, or QA decision exists,
- current source/test evidence was inspected,
- no forbidden dependency exists,
- branch/worktree isolation or one-writer safety is clear.

## How Review / Release Validates Work

Team 10 pulls from `17-team-outboxes/` and `18-integration-queue/`, verifies evidence, runs approved focused checks when assigned, accepts/rejects/revises under standing delegation, and records integration readiness.

## Human Product Owner Interaction

The human Product Owner should review:

- `99-decision-inbox/open-decisions.md`
- individual Decision Packets listed there.

The Product Owner should not be used as a router for routine QA, review, signoff, local commits, or bounded reframing.

## Next Recommended Step

Launch the first independent automations:

1. Team 0 Orchestrator / Integration.
2. Team 1 Audit Factory.
3. Team 2 Requirement Factory.
4. Team 3 Architecture Factory.
5. Team 4 QA Factory.
6. Team 6 Strategy / Signal / Risk only if the ready queue has a matching safe item.

If no implementation item is ready, Teams 1-4 should continue preparing work while Team 0 keeps the queues current.
