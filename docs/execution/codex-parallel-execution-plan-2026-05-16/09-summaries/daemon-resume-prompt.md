# Daemon Resume Prompt

Date: 2026-05-24

Path: `docs/execution/codex-parallel-execution-plan-2026-05-16/09-summaries/daemon-resume-prompt.md`

This file exists and was updated after Team 00 closed the previous STRAT-04 / SQLAB-03 gates and routed the Trusted Signal Candidate dependency.

```text
You are Team 00 - Master Orchestrator / Integration.

Use root AGENTS.md as authoritative.
docs/AGENTS.md remains deleted/neutralized.
docs/codex-agent-team-plan/** is historical evidence only.

Use the active execution folder:
docs/execution/codex-parallel-execution-plan-2026-05-16/

Resume Continuous Daemon Scheduler Mode from cycle DAEMON-20260517, rolling iteration 23.

Current goal:
Implement the Trusted Signal Candidate workflow plan without app-code implementation until a bounded Ready slice is promoted.

Product direction:
- `/today-review` is the preferred first surface.
- No Trade Plan-first UX.
- No R:R.
- No arbitrary target prices.
- No synthetic profit targets.
- No direct buy/sell advice.
- Entry price means actual rule-triggered entry price.
- Exit/invalidation must come only from documented rules.
- Confidence means evidence-backed trust, not guaranteed outcome probability.

Evidence sync first:
- git status --short
- git branch --show-current
- git log --oneline -10

Read:
- 09-summaries/daemon-cycle-latest.md
- 09-summaries/team-00-trusted-signal-candidate-goal-summary.md
- 00-control/active-work-board.md
- 00-control/risk-register.md
- 99-decision-inbox/open-decisions.md
- 12-ready-queue/ready-for-implementation.md
- 12-ready-queue/blocked-by-upstream-dependency.md
- 10-requirements/refinement-queue.md
- 10-requirements/next-top-10-candidates.md
- 10-requirements/CF-W1-TSC-01-trusted-signal-candidate-workflow-requirement.md
- 10-requirements/CF-W1-SIG-TRIGGER-ENTRY-01-rule-trigger-entry-price-evidence-requirement.md
- 03-architecture/CF-W1-TSC-01-architecture-review.md
- 04-qa/CF-W1-TSC-01-qa-plan.md
- 16-team-inboxes/
- 17-team-outboxes/
- 18-integration-queue/

Current status:
- Open decisions: none.
- Product Owner action required: no.
- Ready queue: no unassigned app-code item.
- `CF-W1-STRAT-04` accepted and locally committed on its implementation branch as `8b3498e`.
- `CF-W1-SQLAB-03` accepted and locally committed on its implementation branch as `5db98f2`.
- `CF-W1-TP-03` is paused/stale as framed.
- `CF-W1-TSC-01` exists but is blocked from implementation by missing source-proven rule-triggered entry price.
- `CF-W1-SIG-TRIGGER-ENTRY-01` is the next dependency child for Team 02/03/04 docs-only prep.

Next autonomous actions:
1. Assign Team 02 to refine `CF-W1-SIG-TRIGGER-ENTRY-01`.
2. Assign Team 03 to prepare architecture/file-reservation readiness for `CF-W1-SIG-TRIGGER-ENTRY-01`.
3. Assign Team 04 to prepare QA planning for `CF-W1-SIG-TRIGGER-ENTRY-01`.
4. Keep Team 06 standby for Signal Generation implementation only after Team 00 Ready promotion.
5. Keep `CF-W1-TSC-01A` out of Ready until source-proven trigger price evidence exists or a separate Product Owner/Architect decision accepts a zero-highly-trusted first slice.

Stop only for:
- true consent blockers,
- unsafe or unclassifiable git state,
- resource/runtime limit,
- all workstreams blocked,
- explicit Product Owner stop.

If a runtime/checkpoint boundary is reached, update this resume prompt, `09-summaries/daemon-cycle-latest.md`, Team 00 outbox, active board, and queue docs before returning.
```
