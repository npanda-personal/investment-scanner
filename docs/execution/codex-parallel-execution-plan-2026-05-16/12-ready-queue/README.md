# Ready Queue Pull Model

Date: 2026-05-17

## Purpose

The ready queue is the implementation pull surface. Implementation teams should pull work from here instead of waiting for manual Product Owner prompts.

The ready queue is live. Teams may pull matching ready work without waiting for human approval when standing delegation criteria pass.

## Ready For Implementation Criteria

An item is Ready only when all are true:

- requirement exists,
- acceptance criteria exist,
- architecture review exists when needed,
- QA plan exists,
- exact file reservations exist,
- no shared-file conflict exists,
- no missing Product Owner decision exists,
- no missing Architect decision exists,
- no missing QA decision exists,
- no forbidden dependency exists,
- current source/test evidence was inspected,
- stop conditions are known,
- branch/worktree or single-writer plan is clear.

## Pull Rules

- Team 5 pulls Market Data/Data Quality items.
- Team 6 pulls Strategy/Signal/Risk items.
- Team 7 pulls Portfolio/Watchlist/Alerts items.
- Team 8 pulls UX/Research/Copilot items.
- Team 9 pulls Platform/Auth/Subscription/Notifications items.
- Team 10 pulls completed outbox items for review/release.

## Conflict Prevention

Team 0 owns file reservations and confirms one writer per file. If two teams need the same file, one item is moved out of Ready or queued behind the other.

When new work becomes ready, the relevant team is added to the runtime queue immediately.

If the ready queue is empty, teams do not idle. They produce requirements, contracts, QA plans, audits, or blocked-queue cleanup.

## Blocked Items

If a ready item develops a blocker:

- remove it from Ready,
- move it to `blocked-by-decision.md`, `blocked-by-shared-file.md`, or `blocked-by-upstream-dependency.md`,
- create a Decision Packet when a true consent blocker exists,
- continue unrelated ready work.

## Partial Completion

If a team completes only a safe subset:

- reframe it as a smaller requirement,
- preserve limitations,
- track remaining gaps separately,
- submit the bounded slice to Review / Release.
