# Decision Inbox

This folder contains only true consent blockers that require human Product Owner, Architect, or QA decision.

Codex must not use this folder for routine gates such as QA evidence, code review, Architect signoff, Product Owner acceptance packets, local commits, active board updates, or bounded requirement reframing.

In the multi-team model, this is the only normal human-review surface. Team automations should continue independent work while a decision waits here.

When Codex creates a Decision Packet, it must also update `open-decisions.md`.

Decision Packet naming:

```text
DECISION-{YYYYMMDD}-{short-slug}.md
```

Resolved decisions should stay as historical evidence. `open-decisions.md` is the current decision index.
