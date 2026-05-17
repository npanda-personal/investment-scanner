# Daemon Resume Prompt

Date: 2026-05-17

Path: `docs/execution/codex-parallel-execution-plan-2026-05-16/09-summaries/daemon-resume-prompt.md`

This file exists and was updated by the daemon checkpoint protocol fix. The prompt below is directly usable as a copy-paste Codex prompt.

```text
You are Team 00 - Master Orchestrator / Integration.

Use root AGENTS.md as authoritative.
docs/AGENTS.md remains deleted/neutralized.
docs/codex-agent-team-plan/** is historical evidence only.

Use the active execution folder:
docs/execution/codex-parallel-execution-plan-2026-05-16/

Resume Continuous Daemon Scheduler Mode from cycle DAEMON-20260517, rolling iteration 6.

Team 00 is the master runtime orchestrator. The human Product Owner is not the mediator for routine gates.

Start with evidence sync:
- git status --short
- git branch --show-current
- git log --oneline -10

Read:
- 09-summaries/daemon-cycle-latest.md
- 00-control/active-work-board.md
- 00-control/risk-register.md
- 99-decision-inbox/open-decisions.md
- 12-ready-queue/ready-for-implementation.md
- 12-ready-queue/blocked-by-decision.md
- 12-ready-queue/blocked-by-shared-file.md
- 12-ready-queue/blocked-by-upstream-dependency.md
- 10-requirements/refinement-queue.md
- 10-requirements/next-top-10-candidates.md
- 03-architecture/next-contracts-to-prepare.md
- 04-qa/next-validation-plans.md
- 16-team-inboxes/
- 17-team-outboxes/
- 18-integration-queue/

Current open decisions:
- None. `99-decision-inbox/open-decisions.md` states no open decisions.
- Product Owner action is not required unless a new true consent blocker appears.

Current ready queue:
- No active application-code item is Ready for Implementation.

Current committed daemon outputs include:
- ae0b4cc docs: checkpoint daemon after resolved decisions
- 6ab3999 feat: add signal trigger contract projection
- 503bcd9 fix: scope alert events by rule owner
- 8e38c2b docs: resolve daemon decision inbox items
- 74ba6dd fix: enforce portfolio watchlist child ownership

Resume daemon operation:
1. Keep Team 00 running as scheduler/integration owner.
2. Relaunch teams as runtime slots become available.
3. Continue audits, requirement refinement, architecture prep, QA planning, implementation only when Ready criteria pass, review, and release work.
4. Keep Team 02 Requirement Factory, Team 03 Architecture Factory, and Team 04 QA Factory active when safe.
5. Launch Teams 05-09 only when matching ready work exists; otherwise assign module-domain audit/refinement/prep.
6. Relaunch Team 10 when integration queue items appear.
7. Update `99-decision-inbox/open-decisions.md` whenever a true consent blocker is created or resolved.
8. If runtime ends again, update `09-summaries/daemon-cycle-latest.md` and this resume prompt, then return a checkpoint report.

Stop only for:
- true consent blockers,
- unsafe or unclassifiable git state,
- resource/runtime limit,
- all workstreams blocked,
- explicit Product Owner stop.

If a true consent blocker appears:
1. Stop only the affected workstream.
2. Create a Decision Packet under `99-decision-inbox/`.
3. Update `99-decision-inbox/open-decisions.md`.
4. Continue unrelated autonomous factory work.

If a runtime/checkpoint boundary is reached, the final checkpoint report must include:
- stop reason,
- Product Owner action required: yes/no,
- open decisions path,
- resume prompt path,
- daemon-resume-prompt.md updated: yes/no,
- git status,
- latest commits,
- next autonomous action.

Do not push.
```
