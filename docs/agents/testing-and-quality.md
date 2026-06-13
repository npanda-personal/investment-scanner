# Testing, Performance & Refactor Rules

> Extracted verbatim from the original AGENTS.md constitution. Index of all topic files: [AGENTS.md](../../AGENTS.md)

# 25. Testing Rules

After changes, run what exists and what is relevant:

- backend build
- frontend build
- typecheck
- unit tests
- integration tests
- focused module tests
- UI smoke tests
- regression tests
- live local data validation where applicable

If tests do not exist, add focused tests near changed logic when practical.

Do not claim a workflow is verified only because a page loads.

Verification must include, where applicable:

- data correctness
- scope correctness
- batch behavior
- visible empty states
- visible error states
- upstream/downstream handoff behavior
- authenticated route behavior
- user-owned data filtering
- performance/progress behavior

## UI smoke tests

Frontend module changes affecting navigation, page loading, filters, batch controls, tables, progress states, or user-visible workflows must update and run Playwright smoke tests when practical.

UI tests should live under:

```text
frontend/tests/ui
```

Shared helpers should live under:

```text
frontend/tests/ui/support
```

UI tests must not stop at heading checks.

If UI testing is blocked, record:

- exact blocker
- skipped command
- risk
- next owner

For data-bearing pages, a passing UI smoke test must prove one of these outcomes:

- expected scoped data is visible, or
- a domain-specific empty state explains why data is absent and what action refreshes or fixes it.

---

# 26. Performance And Laptop Safety

Performance is product correctness.

Any module audit, hardening pass, or bug fix must identify:

- slow API calls
- slow button-triggered workflows
- long synchronous request paths
- missing progress indicators
- unbounded bulk operations
- frontend hangs
- backend calls that hold open too long

If a user action can take more than a few seconds, make it:

- fast
- bounded
- visibly progressing
- resumable
- cancellable/retryable where practical

or record a blocker with concrete follow-up owner.

Before starting local servers, builds, browser tests, Docker services, process-heavy workflows, or new agent workers, check laptop memory utilization where possible.

Rules:

- Do not start new heavy work if memory utilization is at or above 95%.
- Wait until memory drops below 90% before starting more heavy work.
- If memory cannot be measured reliably, treat process-heavy starts as blocked unless Product Owner permits continuing.
- Run only one Playwright invocation at a time unless isolated users, ports, DBs, and artifacts are explicitly planned.

---

# 27. Refactor Rules

Prefer:

- incremental refactors
- moving files into clearer ownership
- simplifying imports
- preserving behavior
- improving tests
- documenting ownership
- extracting contracts before implementation

Avoid:

- giant-bang rewrites
- rewriting stable logic without evidence
- mixing multiple epics
- changing data model and UI in the same unreviewed pass
- creating compatibility shims for removed legacy code unless explicitly requested

When deleting code:

1. search for stale imports
2. verify builds pass
3. verify routes still work
4. update docs
5. record removed behavior

---

