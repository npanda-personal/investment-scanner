# Delivery Workflow, Review Gates & Release Rules

> Extracted verbatim from the original AGENTS.md constitution. Index of all topic files: [AGENTS.md](../../AGENTS.md)

# 9. Parallel Execution Rules

Parallelism is allowed only when write scopes are isolated.

Before parallel implementation starts, the Orchestrator must record:

- work item
- owner
- lane
- module
- allowed files
- forbidden files
- shared-file requests
- dependencies
- expected handoff
- QA verification plan
- WIP status
- branch/worktree if applicable

## Safe parallel work

Usually safe in parallel:

- product briefs
- UX flow drafts
- architecture contract drafts
- module audits
- test plan creation
- module-owned tests
- module-owned docs
- read-only exploration
- isolated module implementation with no shared contract change

## Risky parallel work

Do not parallelize without explicit Orchestrator ownership:

- Prisma schema changes
- route registry changes
- shared UI component changes
- signal/trigger contract changes
- strategy/rule contract changes
- market-scope behavior changes
- auth/subscription changes
- package dependency changes
- generated type changes
- shared test fixture changes

## Single-writer rule

Each file has one writer per implementation pass.

Agents may inspect the same file, but only one agent may edit it.

Subagents may be used for read-only exploration, comparison, review, or planning.

Implementation must use clear file reservations and one writer per file.

---

# 10. Branch / Worktree Strategy

Use branches or worktrees for isolated parallel module work when practical.

Recommended branch naming:

```text
agent/sprint-{n}-{module-or-lane}-{short-task}
```

Examples:

```text
agent/sprint-0-audit-contracts
agent/sprint-1-market-data-readiness
agent/sprint-1-signal-contract
agent/sprint-1-research-workbench-ux
```

Rules:

- Do not work directly on `main` unless explicitly approved.
- Each branch/worktree should have one purpose.
- Do not mix unrelated requirements.
- Do not commit rejected work.
- Do not commit unaccepted scope.
- Do not stage unrelated local changes.
- Do not push unless Product Owner accepts the scoped requirement or explicitly asks.

If no remote exists or pushing is not desired, record local commit evidence instead of remote push evidence.

---

# 11. Required Delivery Flow

Default requirement flow:

```text
Product Owner requirement
  -> Product brief
  -> Orchestrator intake
  -> UX plan if user-facing
  -> Architecture contract
  -> QA verification plan
  -> Orchestrator work packet
  -> Lane/module implementation
  -> Developer validation
  -> QA verification
  -> Code review / Lead validation
  -> Architect signoff
  -> Product Owner acceptance
  -> Scoped commit/check-in if approved
```

No accepted requirement is considered complete without:

- scoped implementation
- tests or documented test blocker
- QA evidence
- review evidence
- docs update where needed
- known limitations
- Product Owner acceptance

---

# 12. Handoff Standard

Every handoff must include:

- work item
- state/mode
- owner
- lane/module
- exact files changed
- exact files inspected
- behavior changed
- docs changed
- contracts changed
- tests run
- tests skipped
- skipped-test reason
- assumptions
- risks
- blockers
- shared-file requests
- next gate
- evidence notes

Incomplete handoffs must be rejected back to the responsible role.

Clarification chain:

```text
Developer -> Orchestrator -> Solution Architect -> Product Owner
```

Final clarification must be written back into the relevant artifact:

- product brief
- acceptance criteria
- architecture contract
- QA plan
- work packet
- module docs
- decision record
- blocker register

---

# 30. Review Gates

## Developer self-check

Required before QA handoff:

- focused tests run
- build/typecheck run where relevant
- changed UI manually reviewed where practical
- data-bearing workflow live-validated where practical
- docs updated
- limitations recorded

## QA verification

QA checks:

- acceptance criteria
- regression coverage
- UI behavior
- API behavior
- data correctness
- local/free constraints
- skipped tests/blockers

## Code review / Lead validation

Reviewer checks:

- module boundaries
- shared-file safety
- implementation quality
- contracts honored
- tests meaningful
- no hidden paid/cloud dependency
- no arbitrary targets
- no direct financial advice
- no agent drift

## Architect signoff

Architect checks:

- architecture contract honored
- data model safe
- cross-module dependencies correct
- local/free constraints preserved
- future scalability not harmed
- no silent strategy/signal contract drift

## Product Owner acceptance

Product Owner validates:

- user intent
- workflow usefulness
- UX clarity
- trustworthiness
- acceptance criteria
- release decision

---

# 31. Release And Check-In Rules

Do not commit unrelated local changes.

Do not commit rejected work.

Do not commit unaccepted scope.

For each accepted requirement, record:

- branch name
- commit SHA if committed
- pushed remote if pushed
- files committed
- scoped-staging confirmation
- excluded unrelated files
- rollback notes
- CI status/link if available
- release checklist entry
- active board update

If GitHub remote is not available or not desired, record local commit evidence only.

A requirement is not released until:

- Product Owner accepts it
- release evidence is recorded
- active board/release checklist is updated

---

# 32. Output Expectations For Any Task

Every agent response after implementation or review must include:

## Structural changes

- modules created
- files added
- files moved
- files removed

## Code changes

- imports updated
- APIs preserved/changed
- logic added/refactored
- contracts changed

## Validation

- builds run
- tests run
- UI checks run
- live local data checks run
- skipped checks and reasons

## Risks

- unresolved risks
- blockers
- assumptions
- follow-up tasks

## Product Owner review needed

- UX review needed
- migration approval needed
- env/config approval needed
- release approval needed
- domain decision needed

---

