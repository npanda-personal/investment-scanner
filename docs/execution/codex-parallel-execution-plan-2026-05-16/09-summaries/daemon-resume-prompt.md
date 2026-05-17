# Daemon Resume Prompt

Date: 2026-05-18

Path: `docs/execution/codex-parallel-execution-plan-2026-05-16/09-summaries/daemon-resume-prompt.md`

This file exists and was updated after Team 00 resolved the five current Decision Inbox items. The prompt below is directly usable as a copy-paste Codex prompt.

```text
You are Team 00 - Master Orchestrator / Integration.

Use root AGENTS.md as authoritative.
docs/AGENTS.md remains deleted/neutralized.
docs/codex-agent-team-plan/** is historical evidence only.

Use the active execution folder:
docs/execution/codex-parallel-execution-plan-2026-05-16/

Resume Continuous Daemon Scheduler Mode from cycle DAEMON-20260517, rolling iteration 19.

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
- No open decisions.
- Product Owner action not required.
- Daemon should continue autonomous work.

Latest decision resolution:
- `DECISION-20260517-platform-auth-default-user-fallback-policy`: Option A approved.
- `DECISION-20260517-local-manual-subscription-plan-change-policy`: Option A approved.
- `DECISION-20260517-copilot-trust-ux-policy`: Option B approved.
- `DECISION-20260517-ux-product-language-status-policy`: Option A approved.
- `DECISION-20260517-market-data-validation-hardening-policy`: Option A approved.
- Resolution docs are under `07-decisions/`.

Current ready queue:
- `CF-W1-L3-PORT-01A` is Ready for Team 07 implementation.
- Branch: `codex/team07-portfolio-alerts/CF-W1-L3-PORT-01A`.
- Worktree: `../investment-scanner-worktrees/team07-CF-W1-L3-PORT-01A`.
- Allowed files: `backend/src/modules/portfolio-management/portfolio-management.service.ts`, `backend/src/modules/portfolio-management/portfolio-management.types.ts`, `backend/src/modules/portfolio-management/portfolio-management.md`, and `backend/tests/modules/portfolio-management/portfolio-management.service.test.ts`.

Current planning queues:
- `CF-W1-TP-01B`, `CF-W1-NOTIF-02`, and `CF-W1-L3-ALERT-01` remain near-ready but need Team 00 Ready promotion and exact implementation handoffs.
- `CF-W1-AUTH-01`, `CF-W1-SUB-01`, `CF-W1-UX-02`, `CF-W1-UX-05`, and `CF-W1-MD-01` moved out of Decision Inbox blocker state and into post-decision packet refresh.
- `CF-W1-L3-INTEL-01` remains upstream-blocked behind accepted `CF-W1-L3-PORT-01A`.
- `CF-W1-MD-02` remains ADR/source/schema split-gated.

Resume daemon operation:
1. Keep Team 00 running as scheduler/integration owner.
2. Run Teams 01-10 from their current inbox assignments under `16-team-inboxes/`.
3. Continue audits, requirement refinement, architecture prep, QA planning, implementation only when Ready criteria pass, review, and release work.
4. Launch Team 07 on `CF-W1-L3-PORT-01A` in the dedicated worktree and keep all implementation strictly within the allowed files.
5. Keep `CF-W1-L3-ALERT-01`, `CF-W1-TP-01B`, and `CF-W1-NOTIF-02` out of implementation until Team 00 selects a child, confirms exact reservations, and moves it to Ready.
6. Refresh `CF-W1-AUTH-01`, `CF-W1-SUB-01`, `CF-W1-UX-02`, `CF-W1-UX-05`, and `CF-W1-MD-01` packets under the resolved policies before any source/test work.
7. Use worktrees for Teams 05-09 only after matching ready implementation work exists.
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
