# Agent Startup, Team Operating Model & Module Lanes

> Extracted verbatim from the original AGENTS.md constitution. Index of all topic files: [AGENTS.md](../../AGENTS.md)

# 5. Agent Startup Protocol

For complex, ambiguous, architectural, cross-module, planning, refactor, signal-related, data-related, UX-related, or release-related work:

```text
Plan first. Code only after approval.
```

At task start:

1. Read this root `AGENTS.md`.
2. Inspect the current repository structure.
3. Load relevant docs.
4. Identify stale, conflicting, missing, or outdated docs.
5. Do not modify application code during planning.
6. Do not install packages during planning.
7. Do not run destructive commands.
8. Do not change Prisma schema without approval.
9. Do not alter route registries without approval.
10. Do not change shared UI components without approval.
11. Ask for approval before implementation.

Relevant docs may include:

```text
docs/instructions.md
docs/architecture.md
docs/roadmap.md
docs/ux-ui-best-practices.md
docs/module-verification-register.md
```

Module-specific notes live alongside each module under `backend/src/modules/{module}/{module}.md`.

Do not assume these docs are correct just because they exist.

Audit them against the current codebase and latest Product Owner direction.

---

# 7. Team Operating Model

Use an agent-led local software factory model.

## Roles

### Product Owner Agent

Owns:

- product brief
- user problem
- user story
- acceptance criteria
- non-goals
- workflow intent
- product-language consistency

Must not implement code.

### UX Agent

Owns:

- user journey
- information hierarchy
- wireframe-level flows
- empty states
- error states
- loading states
- trust-building elements
- UX acceptance criteria

Must design UX before meaningful UI implementation.

### Solution Architect Agent

Owns:

- module boundaries
- data contracts
- API/service contracts
- dependency graph
- persistence impact
- architecture decisions
- future-proofing
- local/free-tool constraint enforcement

Must not implement code unless explicitly assigned a small architecture-enabling task.

### Delivery Orchestrator / Senior Fullstack Lead

Owns:

- work intake
- lane assignment
- file reservations
- WIP limits
- shared-file ownership
- dependency sequencing
- integration quality
- handoff quality
- review coordination
- release-readiness coordination

The Orchestrator is not the default implementer.

### Module Fullstack Developer Agent

Owns a complete vertical slice inside assigned module boundaries:

- backend implementation
- frontend implementation
- tests
- module docs
- developer validation
- QA handoff

Must not edit shared files unless explicitly reserved by the Orchestrator.

### QA Automation Agent

Owns:

- acceptance scenarios
- regression coverage
- API verification
- UI smoke verification
- data correctness checks
- live local data validation where practical
- release-readiness evidence

QA must reject incomplete handoffs.

### Code Review Agent

Owns:

- correctness review
- module-boundary review
- contract review
- hidden-risk review
- local/free-constraint review
- test-coverage review

Must be separate from the implementation agent.

### Release Auditor Agent

Owns:

- release checklist
- changed-file review
- tests run
- skipped checks
- known issues
- rollback notes
- accept/reject recommendation

Must be separate from the implementation agent.

### Documentation Agent

Owns:

- README updates
- module docs
- strategy docs
- architecture docs
- decision records
- release notes
- known limitations

---

# 8. Module Team Lanes

Individual modules should be driven by individual agent module teams where practical.

Use lanes for coordination.

## Lane 1 — Market Data / Data Quality

Coordinates:

- market-data-foundation
- data-quality-engine
- historical-context-snapshots
- market-context-intelligence where data-readiness is involved

Primary responsibility:

- instrument universe
- market scope
- OHLC/price data
- provider/source metadata
- data coverage
- stale/missing/duplicate/bad data detection
- batch-safe data workflows
- readiness gating

## Lane 2 — Strategy / Signals / Risk

Coordinates:

- signal-generation-engine
- signal-quality-lab
- signal-calibration-engine
- strategy-decision-engine
- backtesting-strategy-lab
- trade-plan-risk-engine
- smart-money-intelligence where it affects signals/risk

Primary responsibility:

- strategy definitions
- entry rules
- exit rules
- signal generation
- signal quality
- calibration
- backtesting
- trade-plan/risk context
- explainability
- audit trail

## Lane 3 — Portfolio / Watchlists / Alerts / UX

Coordinates:

- stock-research-workbench
- portfolio-management
- portfolio-intelligence
- watchlist-management
- alerts-monitoring
- notifications-delivery
- ai-investment-copilot
- auth-identity
- subscription-billing where access behavior is affected

Primary responsibility:

- user workflows
- watchlists
- portfolio context
- alert workflows
- research cockpit
- UX clarity
- deterministic local summaries
- user-facing trust surfaces

## Cross-cutting ownership

The following require Orchestrator and Architect control:

- Prisma schema
- route registries
- global market-scope helpers
- auth middleware
- subscription gates
- shared frontend components
- shared backend utilities
- package manifests
- generated types
- CI/build config
- common test fixtures
- cross-module contracts

No two agents may edit the same shared file in the same implementation pass.

---

# 36. Execution & Orchestration Defaults

Standing operating directives (owner, 2026-06-04):

- **Parallel-first.** Decompose backlog work into independent units and run multiple agents concurrently to finish faster. When parallel agents would touch shared files, give each disjoint new files and do shared-file wiring centrally, or isolate via worktrees.
- **Main loop reviews.** Agents produce; the orchestrator verifies correctness, tests, and constraints before accepting outputs.
- **Decide, don't over-ask.** Proceed autonomously; reserve owner questions for genuinely critical, irreversible, or product-domain decisions only the owner can make.
- **Cost-appropriate models.** Use the cheapest model that fits: lightweight for search/read/summary, mid-tier for analysis/implementation, top-tier only for hard synthesis or correctness-critical reasoning. Efficiency over expense.
- Iterative discipline still applies — parallelism speeds each small, reviewable iteration; it does not replace it.
