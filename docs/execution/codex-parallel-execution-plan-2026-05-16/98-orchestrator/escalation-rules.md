# Escalation Rules

Date: 2026-05-17

## True Consent Blockers

Codex must stop only the affected workstream and create a Decision Packet when any true blocker occurs:

- Prisma schema or migration change needed
- backend route registry change needed
- frontend route registry change needed
- shared backend utility change needed
- shared UI change needed
- package manifest change needed
- generated/common fixture change needed
- `backend/src/server.ts` change needed
- `backend/.env.example` change needed
- `.gitignore` change needed
- root `AGENTS.md` change needed
- `docs/AGENTS.md` change needed
- `docs/codex-agent-team-plan/` change needed
- Angel One needed
- live provider call needed
- broker credentials needed
- paid service or paid data risk
- cloud deployment risk
- startup/backfill behavior needed
- UI implementation needed
- product policy ambiguity
- financial-advice/product-language ambiguity
- strategy/rule semantics ambiguity
- target-price/exit/invalidation ambiguity
- data-quality threshold ambiguity
- test failure requires forbidden scope
- QA rejects and fix exceeds scope
- Architect rejects and fix exceeds scope
- code review rejects and fix exceeds scope
- workstream cannot classify dirty state
- revert would affect committed work
- two workstreams need the same file
- memory/resource gate blocks process-heavy work
- push would require force push or a non-`dev` branch
- push scope is uncertain or includes unrelated files

## Not Consent Blockers

Codex must not stop for these routine gates when work stays inside approved boundaries:

- QA evidence needed
- code review needed
- Architect signoff needed
- Product Owner packet needed
- local commit needed
- push to `dev` when all standing push gates pass
- requirement reframing
- split into smaller bounded slice
- active board update
- risk register update
- ready queue update
- routine active execution docs
- one or two revision cycles inside approved files

These are handled by the appropriate Codex team under standing delegation.

## Decision Packet Location

Create Decision Packets under:

```text
docs/execution/codex-parallel-execution-plan-2026-05-16/99-decision-inbox/
```

File naming:

```text
DECISION-{YYYYMMDD}-{short-slug}.md
```

## Decision Packet Template

```md
# Decision Needed

One sentence describing the decision.

# Context

What Codex was trying to do.

# Affected Workstream

Workstream name, requirement id, module, lane.

# Affected Files

Exact paths.

# Evidence Inspected

Source files, tests, docs, commands, reports.

# Options

Option A:
Option B:
Option C:

# Codex Recommendation

One recommendation only.

# Risk If Approved

Concrete risk.

# Risk If Rejected

Concrete risk.

# Impact On Parallel Work

What can continue while this waits.

# Exact Consent Needed

Product Owner / Architect / QA wording.

# Safe Next Step If No Decision Yet

What Codex can continue doing without this decision.
```

## Open Decision Index

Every new Decision Packet must be added to:

```text
99-decision-inbox/open-decisions.md
```

Required columns:

- decision id
- title
- owner needed
- severity
- affected module
- status
- created date
- blocks which work
- parallel work still available
