# Runtime Bootstrap

Date: 2026-05-17

## Purpose

This file is the bootstrap contract for continuous multi-team Codex factory execution.

Team 00 is the Master Orchestrator / Integration runtime. This ChatGPT thread is not the routine approval surface. The human Product Owner is consulted only through `99-decision-inbox/` when a true consent blocker exists.

## Startup Sequence

Every runtime start or resume begins with:

```text
git status --short
git branch --show-current
git log --oneline -10
```

Then Team 00 loads:

- `00-control/active-work-board.md`
- `00-control/risk-register.md`
- `09-summaries/daemon-cycle-latest.md`
- `09-summaries/daemon-resume-prompt.md`
- `10-requirements/`
- `12-ready-queue/`
- `16-team-inboxes/`
- `17-team-outboxes/`
- `18-integration-queue/`
- `99-decision-inbox/open-decisions.md`

## Standing Runtime Authorization

The Product Owner has approved standing authorization for:

- Teams 01-10 as independent Codex workstreams or automations where supported.
- Separate branches or worktrees for implementation teams.
- Module-local implementation when Ready criteria and standing delegation conditions pass.
- Focused tests or builds required by the work packet.
- QA evidence, code review, Architect signoff, Product Owner packets, local commits, and scoped push to `dev` when all gates pass.

This authorization does not bypass root `AGENTS.md`, active execution docs, current git state, or true consent blockers.

## Push Gate

Push to `dev` is allowed only when:

- the work item is accepted under standing delegation,
- the commit is scoped to one accepted requirement or one docs-only factory update,
- staged files exactly match the approved scope,
- `git diff --cached --name-status` has been checked,
- no forbidden files, secrets, `.env`, database dumps, logs, generated artifacts, or unrelated files are staged,
- required focused tests or builds passed,
- QA, code review, and Architect gates passed where required,
- Product Owner packet records delegated acceptance where required,
- `git status --short` is clean after commit before push,
- the current branch is `dev`,
- the push is a normal non-force push to `dev`,
- no unresolved open decision affects the work item.

No force push, no push to `main`, and no push to `master` are allowed.

## Current Resume Priority

After this bootstrap update, Team 00 should resume daemon operation from:

```text
09-summaries/daemon-resume-prompt.md
```

Priority assignments:

1. Relaunch Team 03 for `CF-W1-L3-DQ-01`, `CF-W1-TP-01A`, and `CF-W1-MD-02`.
2. Keep Team 02 Requirement Factory running.
3. Keep Team 04 QA Factory running.
4. Let Teams 05-09 pull matching ready work only when Ready criteria pass.
5. If no implementation item is ready, continue audits, refinement, contracts, QA plans, and queue cleanup.

## Stop Conditions

Team 00 stops the full runtime only for:

- true consent blocker,
- unsafe or unclassifiable git state,
- resource/runtime limit,
- all workstreams blocked,
- explicit Product Owner stop.

Routine gates must be handled internally under standing delegation.
