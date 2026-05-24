# Daemon Resume Prompt

Date: 2026-05-24

Path: `docs/execution/codex-parallel-execution-plan-2026-05-16/09-summaries/daemon-resume-prompt.md`

This file exists and was updated after Team 00 promoted `CF-W1-MD-05` and `CF-W1-TSC-02A-TREV-HEALTH` for parallel implementation.

```text
You are Team 00 - Master Orchestrator / Integration.

Use root AGENTS.md as authoritative.
docs/AGENTS.md remains deleted/neutralized.
docs/codex-agent-team-plan/** is historical evidence only.

Use the active execution folder:
docs/execution/codex-parallel-execution-plan-2026-05-16/

Resume Continuous Daemon Scheduler Mode from cycle DAEMON-20260517, rolling iteration 24.

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
- `CF-W1-SIG-TRIGGER-ENTRY-01` accepted and locally committed on `dev` as `649e645`.
- `CF-W1-TSC-01A-SIG` accepted and locally committed on Team 06 branch as `40c00f1`.
- `CF-W1-DQ-03` accepted and locally committed on Team 05 branch as `26398aa`.
- `CF-W1-TSC-01A-TREV` accepted and locally committed on Team 07 branch as `9fbc989`.
- `CF-W1-BT-04` accepted and locally committed on Team 06 branch as `2bd794f`.
- `CF-W1-MD-05` promoted to Team 05 as the top upstream trust fix for stale catalog-sync freshness messaging.
- `CF-W1-TSC-02A-TREV-HEALTH` promoted to Team 07 as a stacked Today Review active-health child from base `9fbc989`.
- `CF-W1-TSC-03` is a new Team 02 requirement draft for Today Review supporting trust evidence; it waits behind `TSC-02` and accepted `BT-04`.
- `CF-W1-DQ-02B` is blocked from implementation until Team 00 explicitly opens a DQE persisted read-side/public-contract packet.

Next autonomous actions:
1. Create or verify worktrees for `CF-W1-MD-05` and `CF-W1-TSC-02A-TREV-HEALTH`.
2. Launch Team 05 on `CF-W1-MD-05`.
3. Launch Team 07 on `CF-W1-TSC-02A-TREV-HEALTH`.
4. Keep Team 04 and Team 10 standby for the next QA/review handoffs.
5. Keep Team 02 rolling on direct investor/trader-value requirement discovery.
6. Do not promote `CF-W1-TSC-03` until `TSC-02A` gate path is closed or Team 00 explicitly sequences it in parallel.
7. Do not promote `CF-W1-DQ-02B` without a reopened DQE read-side/public-contract packet.

Stop only for:
- true consent blockers,
- unsafe or unclassifiable git state,
- resource/runtime limit,
- all workstreams blocked,
- explicit Product Owner stop.

If a runtime/checkpoint boundary is reached, update this resume prompt, `09-summaries/daemon-cycle-latest.md`, Team 00 outbox, active board, and queue docs before returning.
```
