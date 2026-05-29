# Multi-Team Parallel Execution Topology

Date: 2026-05-17

## Purpose

This active execution model replaces the one-thread Orchestrator wave pattern with persistent Codex teams that can run in separate Codex threads, automations, branches, or worktrees.

One Orchestrator prompt with substeps is not sufficient. The operating model expects multiple independent teams to keep auditing, refining, preparing, implementing, reviewing, and integrating in parallel.

## Core Topology

| Team | Name | Primary Role | Implements By Default |
| --- | --- | --- | --- |
| Team 0 | Orchestrator / Integration | Board, queues, file reservations, worktree policy, conflict resolution, integration queue, decision inbox, release sequencing | No |
| Team 1 | Audit Factory | Continuous read-only module audits and findings | No |
| Team 2 | Requirement Factory | Requirements, stories, acceptance criteria, non-goals, backlog candidates | No |
| Team 3 | Architecture Factory | Contracts, file reservations, shared-file risk, architecture reviews | No |
| Team 4 | QA Factory | QA plans, validation matrices, focused commands, evidence expectations | No |
| Team 5 | Market Data / Data Quality | Module-local Market Data and DQ implementation | Yes, when ready |
| Team 6 | Strategy / Signal / Risk | Module-local strategy, signal, signal quality, calibration, strategy decision, backtesting, trade plan implementation | Yes, when ready |
| Team 7 | Portfolio / Watchlists / Alerts | Module-local portfolio, watchlist, alerts implementation | Yes, when ready |
| Team 8 | UX / Research / Copilot | UX, research, copilot implementation after UX/QA approval | Yes, when ready |
| Team 9 | Platform / Auth / Subscription / Notifications | Module-local auth, subscription, notification implementation | Yes, when ready |
| Team 10 | Review / Release Factory | QA verification, code review, Architect signoff, release audit, integration readiness | No app implementation |

## Persistent Flow

1. Audit Factory continuously produces findings.
2. Requirement Factory converts findings into requirement candidates.
3. Architecture Factory prepares contracts and exact file reservations.
4. QA Factory prepares test-first plans and owns the primary test-case design.
5. Ready Queue receives only items that satisfy readiness criteria, including a QA-authored test-first plan.
6. Implementation teams add or update QA-specified tests before production code.
7. Implementation teams pull matching ready items into isolated worktrees or branches.
8. Review / Release Factory validates team outboxes.
9. Orchestrator integrates accepted work, resolves conflicts, and updates queues.
10. Human Product Owner reviews only true consent blockers in Decision Inbox.

## Team 0 - Orchestrator / Integration

Mission:

- Own active board, ready queues, blocked queues, file reservations, branch/worktree policy, conflict resolution, integration queue, release sequencing, decision inbox, and final coordination.
- Pull from team outboxes and the integration queue.
- Integrate accepted local commits or patches.
- Avoid implementation by default.
- Stop only the affected workstream for true consent blockers.

## Team 1 - Audit Factory

Mission:

- Run read-only module audits continuously.
- Produce module-audit reports under active execution docs.
- Feed Requirement Factory.
- Never implement code.

## Team 2 - Requirement Factory

Mission:

- Convert audit findings into requirements, stories, acceptance criteria, non-goals, and backlog candidates.
- Keep next-ready candidates flowing while implementation teams work.
- Create decision packets for product ambiguity.
- Never wait for implementation teams to finish.

## Team 3 - Architecture Factory

Mission:

- Prepare contracts, architecture reviews, file reservations, and shared-file risk classification.
- Keep upcoming work packets ready.
- Stop or route to Decision Inbox for shared/high-risk scope.
- Never wait for implementation teams to finish.

## Team 4 - QA Factory

Mission:

- Prepare QA plans, validation matrices, focused commands, evidence expectations, and regression criteria.
- Own test-case design before implementation starts.
- Convert accepted review findings into failing regression tests, static/type assertions, or documented non-testable manual checks.
- Review QA evidence when assigned.
- Keep upcoming requirements testable.
- Never implement application code.

## Team 5 - Market Data / Data Quality Implementation

Mission:

- Pull ready module-local work from Market Data and Data Quality queues.
- Run in its own branch/worktree.
- Implement only when readiness criteria pass.
- Avoid shared/high-risk files unless Team 0 reserves them.

## Team 6 - Strategy / Signal / Risk Implementation

Mission:

- Pull ready module-local work from Strategy, Signal, Signal Quality, Calibration, Strategy Decision, Backtesting, and Trade Plan queues.
- Run in its own branch/worktree.
- Write or update QA-specified tests before production code changes.
- Enforce Data Quality gates, no arbitrary target semantics, trigger contract, rule-based exits/invalidation, and research-support language.

## Team 7 - Portfolio / Watchlists / Alerts Implementation

Mission:

- Pull ready module-local work from Portfolio, Watchlist, and Alerts queues.
- Run in its own branch/worktree.
- Enforce auth/user ownership, DQ trust state, and no direct advice language.

## Team 8 - UX / Research / Copilot Implementation

Mission:

- Pull ready UX, research, and copilot work.
- Run in its own branch/worktree.
- Enforce UX-before-UI, deterministic cost-free copilot behavior, trust-state language, and no financial advice.

## Team 9 - Platform / Auth / Subscription / Notifications

Mission:

- Pull ready platform-local work.
- Run in its own branch/worktree.
- Keep subscription/billing local/manual unless explicitly approved.
- Do not introduce paid services.

## Team 10 - Review / Release Factory

Mission:

- Review completed implementation commits or patches.
- Run QA evidence, code review, Architect signoff, release audit, and integration readiness.
- Accept, reject, or revise under standing delegation when criteria pass.
- Update release evidence and the integration queue.

## Decision Inbox Rule

The normal human review surface is:

```text
docs/execution/codex-parallel-execution-plan-2026-05-16/99-decision-inbox/
```

Routine gates stay inside Codex teams. Human Product Owner review is required only for true consent blockers.
