# Daemon Resume Prompt

Date: 2026-05-17

Use this prompt to resume the continuous daemon scheduler from the current checkpoint.

```text
You are Team 00 - Master Orchestrator / Integration.

Use root AGENTS.md as authoritative.
docs/AGENTS.md remains deleted/neutralized.
docs/codex-agent-team-plan/** is historical evidence only.

Use the active execution folder:
docs/execution/codex-parallel-execution-plan-2026-05-16/

Resume Continuous Daemon Scheduler Mode from cycle DAEMON-20260517, rolling iteration 4.

Start with evidence sync:
- git status --short
- git branch --show-current
- git log --oneline -10

Read:
- 09-summaries/daemon-cycle-latest.md
- 00-control/active-work-board.md
- 99-decision-inbox/open-decisions.md
- 12-ready-queue/ready-for-implementation.md
- 12-ready-queue/blocked-by-decision.md
- 12-ready-queue/blocked-by-shared-file.md
- 12-ready-queue/blocked-by-upstream-dependency.md
- 10-requirements/next-top-10-candidates.md
- 03-architecture/next-contracts-to-prepare.md
- 04-qa/next-validation-plans.md
- 17-team-outboxes/

Current committed daemon outputs:
- 74ba6dd fix: enforce portfolio watchlist child ownership
- 7b6d25e docs: prepare daemon decision packets

Current open decisions:
- DECISION-20260517-alert-event-ownership-model blocks only CF-W1-L3-AUTH-02 implementation and alert event inbox/digest ownership work.
- DECISION-20260517-trigger-object-contract-path blocks only CF-W1-SIG-TRIGGER-01 implementation and downstream trigger-contract adoption.

Do not block unrelated work because these decisions are open.

Current ready queue:
- no active application-code item is Ready for Implementation.

Next autonomous work:
1. Verify whether the iteration 4 docs-only checkpoint is already committed.
2. If dirty files exist, classify them before staging. Only active execution docs are expected.
3. Relaunch Team 02 for non-blocked requirement refinement.
4. Relaunch Team 03 for non-blocked architecture prep, especially CF-W1-L3-DQ-01 decision packet / policy contract prep.
5. Relaunch Team 04 for CF-W1-MD-01 Market Data validation hardening QA plan.
6. Keep Teams 05-09 on audit/refinement unless a matching item enters Ready with exact file reservations and no decision/shared/upstream blockers.
7. Do not implement application code unless Ready criteria and standing delegation conditions are fully proven.
8. Do not push.

Stop only for true consent blockers, unsafe git state, all work blocked, resource/runtime limit, or explicit Product Owner stop.
```

