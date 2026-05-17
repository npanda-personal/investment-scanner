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

Resume Continuous Daemon Scheduler Mode from cycle DAEMON-20260517, rolling iteration 10.

Team 00 is the master runtime orchestrator. The human Product Owner is not the mediator for routine gates.

Standing authorization is active for separate team branches/worktrees, local commits, and scoped push to `dev` when all gates in `98-orchestrator/standing-delegation-policy.md` pass. Never force push and never push to `main` or `master`.

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
- `DECISION-20260517-lane3-readiness-consumer-policy`
- `DECISION-20260517-trade-plan-no-target-dq-hard-block`
- `DECISION-20260517-market-data-durable-readiness-storage-adr`
- Product Owner action is required for those affected workstreams. All unrelated autonomous work continues.

Current ready queue:
- No active application-code item is Ready for Implementation.

Current planning queues:
- Team 02 refreshed requirement priorities and kept app-code Ready at zero.
- Team 03 completed architecture prep for `CF-W1-L3-DQ-01`, `CF-W1-TP-01A`, and `CF-W1-MD-02`.
- Team 04 refreshed QA plans for `CF-W1-MD-01`, `CF-W1-L3-ALERT-01`, `CF-W1-UX-02`, and status for Team 03 items.
- Team 00 opened three Decision Packets for true consent blockers.

Current committed daemon outputs include:
- 1e882cd docs: authorize continuous codex factory execution
- 1a0c91b docs: checkpoint daemon requirement and qa prep
- ae0b4cc docs: checkpoint daemon after resolved decisions
- f75808f docs: fix daemon checkpoint resume protocol
- e2036dd docs: refresh daemon planning queues
- 6ab3999 feat: add signal trigger contract projection
- 503bcd9 fix: scope alert events by rule owner
- 8e38c2b docs: resolve daemon decision inbox items
- 74ba6dd fix: enforce portfolio watchlist child ownership

Resume daemon operation:
1. Keep Team 00 running as scheduler/integration owner.
2. Relaunch teams as runtime slots become available.
3. Continue audits, requirement refinement, architecture prep, QA planning, implementation only when Ready criteria pass, review, and release work.
4. Keep `CF-W1-L3-DQ-01`, `CF-W1-TP-01A`, and `CF-W1-MD-02` out of implementation until their Decision Inbox items are resolved.
5. Relaunch Team 02/03/04 only for non-blocked refinement or after decisions change the backlog/contracts/QA plans.
6. Launch Teams 05-09 only when matching ready work exists; otherwise assign module-domain audit/refinement/prep.
7. Relaunch Team 10 when integration queue items appear.
8. Update `99-decision-inbox/open-decisions.md` whenever a true consent blocker is created or resolved.
9. If an accepted scoped commit is created on `dev` and push gates pass, push normally to `dev`.
10. If runtime ends again, update `09-summaries/daemon-cycle-latest.md` and this resume prompt, then return a checkpoint report.

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
- push status,
- next autonomous action.
```
