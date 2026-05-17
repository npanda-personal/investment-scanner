# Team Inboxes

Date: 2026-05-17

## Purpose

Team inboxes are assignment surfaces for persistent Codex teams. They let Team 0 assign work without turning every handoff into a human prompt.

## Inbox Contents

Each assignment should include:

- team id,
- requirement id,
- accepted contract,
- QA plan,
- file reservations,
- stop conditions,
- branch/worktree name,
- allowed files,
- forbidden files,
- expected outputs.

## Rules

- Implementation teams may pull only assignments that also satisfy the ready queue criteria.
- Documentation-only teams may pull assigned audit, requirement, architecture, or QA tasks.
- Teams must update their outbox when work completes, blocks, or needs review.
- True consent blockers go to `99-decision-inbox/`.

## Suggested File Names

```text
TEAM-05-CF-W1-MD-01.md
TEAM-06-CF-W1-TP-01.md
TEAM-07-CF-W1-L3-ALERT-01.md
```
