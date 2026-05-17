# AGENTS.md

You are working inside my existing investment-scanner project.

This file is the root operating constitution for Codex, Codex subagents, planning mode, implementation mode, reviews, and release gates.

Keep this file durable. Do not turn it into a task log. Detailed plans, audits, work packets, QA evidence, release notes, and decision records belong under `docs/`.

---

# 1. Product Mission

Build and evolve a localhost-first, zero-incremental-cost, rule-based market intelligence application for 6–12 months of personal validation before deciding whether it is ready for B2C or B2B expansion.

The product should help me discover, validate, monitor, and review rule-based market events across:

- stocks
- ETFs
- indices
- crypto
- future asset classes only when explicitly approved

The application should answer:

- Which instruments triggered a bullish, bearish, entry, exit, risk, or invalidation event?
- At what trigger price?
- Under which strategy, rule, and version?
- For what reason?
- With what data quality status?
- What rule-based exit or invalidation condition applies?
- How did the event perform over time?
- Is the signal reliable enough after forward validation?

This is a research-support and market-intelligence application.

It must not present outputs as direct financial advice.

---

# 2. Current Project Baseline

This is an existing full-stack TypeScript modular-monolith project.

## Backend

- Node.js
- Express
- TypeScript
- Prisma

Backend modules should live under:

```text
backend/src/modules/{module-name}
```

## Frontend

- React
- Vite
- TypeScript

Frontend features should live under:

```text
frontend/src/features/{feature-name}
```

## Existing modules/features may include

Codex must inspect the repository before assuming these exist, are complete, or are correct.

Likely current modules include:

- market-data-foundation
- stock-research-workbench
- signal-generation-engine
- portfolio-management
- portfolio-intelligence
- watchlist-management
- alerts-monitoring
- market-context-intelligence
- backtesting-strategy-lab
- smart-money-intelligence
- ai-investment-copilot
- subscription-billing
- auth-identity
- notifications-delivery
- signal-quality-lab
- historical-context-snapshots
- signal-calibration-engine
- data-quality-engine
- strategy-decision-engine
- trade-plan-risk-engine

Do not invent missing modules.

Do not assume older docs are current.

Audit first.

---

# 3. Do Not Be Biased Toward Current Setup

The existing project is the starting point, not a sacred assumption.

Do not blindly preserve the current setup.

Do not blindly recommend starting fresh.

Before recommending a major refactor, migration, or fresh scaffold, Codex must produce evidence from a current-state audit.

The audit must compare:

1. Continue existing project mostly as-is
2. Refactor existing project in place
3. Create fresh scaffold and migrate useful pieces

Decision rule:

- If existing functionality is useful and can be safely modularized, refactor in place.
- If current architecture blocks correctness, testability, or parallel execution, propose a migration plan.
- If a fresh scaffold is faster and safer, prove it with evidence and preserve reusable pieces.

Major architecture changes require Product Owner approval.

---

# 4. Non-Negotiable Constraints

## Local-first and zero-incremental-cost constraints

- Local laptop development only.
- Localhost runtime only unless explicitly approved.
- No cloud deployment.
- No paid APIs.
- No paid databases.
- No paid infrastructure.
- No paid market-data providers.
- No paid AI services.
- No paid hosted testing.
- No broker integration.
- No real-money trade execution.
- No hidden dependency that creates future cost or vendor lock-in.
- No external telemetry, tracking, or remote analytics unless explicitly approved.

## Product constraints

- No arbitrary predefined target prices.
- No black-box buy/sell recommendations.
- Entry events must be based on documented rules.
- Exit events must be based on documented rules.
- Invalidation events must be based on documented rules.
- Every generated signal/trigger must be explainable.
- Every generated signal/trigger must be auditable.
- Every strategy must be versioned.
- Every data source limitation must be documented.
- Data quality status must be checked before downstream signal, strategy, alert, portfolio, or copilot workflows use market data.
- UX must be designed before meaningful UI implementation.
- Product Owner acceptance happens only after QA, code review, and release audit.
- Codex must not self-approve its own implementation.

## Product language constraints

Prefer research-support language:

- bullish trigger
- bearish trigger
- entry trigger
- exit trigger
- invalidation trigger
- risk warning
- candidate
- consider review
- signal quality
- reliability
- data quality
- reason summary
- strategy version
- rule version
- exit condition

Avoid:

- buy now
- sell now
- guaranteed
- profit target
- price target
- must buy
- must sell
- guaranteed return
- financial advice
- automated trade instruction

If the Product Owner says “buy signal” or “sell signal,” map internally to safer language such as “bullish entry trigger,” “bearish trigger,” or “exit trigger.”

---

# 5. Codex Startup Protocol

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
docs/AGENTS.md
docs/instructions.md
docs/architecture.md
docs/roadmap.md
docs/ux-ui-best-practices.md
docs/module-verification-register.md
docs/codex-agent-team-plan/active-work-board.md
docs/codex-agent-team-plan/blocker-register.md
docs/codex-agent-team-plan/codex-agent-team.md
docs/codex-agent-team-plan/release-checklist.md
docs/codex-agent-team-plan/sdlc-operating-model.md
docs/codex-agent-team-plan/team-operating-model.md
docs/codex-agent-team-plan/technical-debt-register.md
docs/codex-agent-team-plan/decision-record-template.md
```

Also inspect relevant files under:

```text
docs/codex-agent-team-plan/architecture-contracts/
docs/codex-agent-team-plan/architecture-signoff/
docs/codex-agent-team-plan/developer-handoffs/
docs/codex-agent-team-plan/lead-validation/
docs/codex-agent-team-plan/po-acceptance/
docs/codex-agent-team-plan/po-audits/
docs/codex-agent-team-plan/po-briefs/
docs/codex-agent-team-plan/po-roadmaps/
docs/codex-agent-team-plan/qa-evidence/
docs/codex-agent-team-plan/qa-plans/
docs/codex-agent-team-plan/ux-audits/
docs/codex-agent-team-plan/ux-roadmaps/
docs/codex-agent-team-plan/work-packets/
```

Do not assume these docs are correct just because they exist.

Audit them against the current codebase and latest Product Owner direction.

---

# 6. Product Owner Priority Rule

The latest Product Owner instruction overrides older docs when there is a conflict.

When Product Owner direction changes:

1. Pause affected downstream work.
2. Update the active work board or planning doc.
3. Return affected items to the earliest impacted gate.
4. Update product brief, acceptance criteria, architecture contract, QA plan, work packet, or decision record as needed.
5. Do not continue old implementation assumptions silently.

The Product Owner owns:

- product direction
- roadmap priority
- acceptance criteria
- investment-domain judgment
- workflow intent
- final acceptance
- whether the product feels useful and trustworthy

Codex may challenge assumptions, but final product judgment belongs to the Product Owner.

---

# 7. Codex Team Operating Model

Use a Codex-led local software factory model.

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

Individual modules should be driven by individual Codex module teams where practical.

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
codex/sprint-{n}-{module-or-lane}-{short-task}
```

Examples:

```text
codex/sprint-0-audit-contracts
codex/sprint-1-market-data-readiness
codex/sprint-1-signal-contract
codex/sprint-1-research-workbench-ux
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

# 13. Architecture Principles

Use a modular monolith.

Optimize for:

- maintainability
- clear ownership
- safe iteration
- product delivery speed
- understandable code
- scalable modular growth

Do not optimize for theoretical perfection.

## Backend layering

```text
controller -> service -> repository -> Prisma
```

Rules:

- Controllers call Services.
- Services call Repositories.
- Repositories call Prisma.
- Modules must not import another module’s repository directly.
- Use public exports only.

Backend public exports:

```text
backend/src/modules/{module-name}/index.ts
```

Frontend public exports:

```text
frontend/src/features/{feature-name}/index.ts
```

Route registration:

```text
backend/src/api/routes.ts
frontend/src/app/routes.tsx
```

Do not edit route registries without Orchestrator reservation.

---

# 14. Backend Module Standard

All backend modules belong in:

```text
backend/src/modules/{module-name}
```

Default flat structure:

```text
{module}.module.ts
{module}.router.ts
{module}.controller.ts
{module}.service.ts
{module}.repository.ts
{module}.validation.ts
{module}.types.ts
{module}.provider.ts        optional
{module}.worker.ts          optional
{module}.queue.ts           optional
{module}.md
index.ts
```

Do not create nested folders such as:

```text
routes/
services/
repositories/
validation/
types/
providers/
workers/
queue/
```

unless:

1. Product Owner explicitly requests it, or
2. the module clearly outgrows the flat structure, and
3. the exception is documented.

---

# 15. Frontend Feature Standard

All frontend features belong in:

```text
frontend/src/features/{feature-name}
```

Default structure:

```text
api/
components/
hooks/
types.ts
routes.tsx
index.ts
```

Rules:

- Feature-specific UI stays inside the feature folder.
- Shared UI belongs in `frontend/src/shared/components`.
- Outside callers should import from feature `index.ts` where practical.
- Avoid deep imports into another feature’s internals.
- Follow `docs/ux-ui-best-practices.md` where present.
- UX must be documented before meaningful UI implementation.

---

# 16. UX Before UI

For meaningful user-facing work, Codex must define UX before implementing UI.

Required UX planning fields:

- user goal
- user journey
- information hierarchy
- primary data shown
- secondary data shown
- empty states
- error states
- loading/progress states
- trust-building elements
- accessibility/basic usability concerns
- acceptance criteria
- QA scenarios

Important UX surfaces:

- Today’s Triggers
- Bullish Entry Triggers
- Bearish / Exit Triggers
- Signal / Trigger Detail Page
- Active Trigger Monitor
- Exit / Invalidation Center
- Strategy Library
- Data Quality Dashboard
- Journal / Review Workflow
- Watchlist Context
- Portfolio Context
- Market Context
- Backtesting Summary
- Research Workbench

UI must not invent fields that are not defined in contracts.

---

# 17. Signal / Trigger Object Contract

Every generated signal/trigger must include at minimum:

```text
signal_id or trigger_id
symbol or instrument_id
asset_class
region
strategy_id
strategy_version
signal_type or trigger_type
trigger_price
trigger_timestamp
timeframe
entry_rule_id where applicable
exit_rule_id where applicable
invalidation_rule_id where applicable
reason_summary
passed_conditions
failed_conditions
data_quality_status
status
created_at
updated_at
```

Preferred additional fields:

```text
indicator_values_used
source_data_timestamp
scan_run_id
signal_quality_score
calibration_version
risk_level
journal_status
portfolio_context_status
watchlist_context_status
```

Allowed lifecycle states:

```text
detected
validated
published
active
watching
warning
exit_triggered
closed
invalidated
expired
archived
```

Do not create a trigger without:

- rule name
- rule version
- trigger price
- reason summary
- data quality status
- auditability path

No arbitrary target prices.

---

# 18. Strategy / Rule Requirements

Every strategy must document:

- strategy name
- strategy version
- category
- supported asset classes
- supported regions if limited
- timeframe
- entry rules
- exit rules
- invalidation rules
- required indicators
- required market data
- required data quality status
- known weaknesses
- test coverage
- validation notes
- whether it is experimental, active, deprecated, or draft

Strategy categories:

```text
ENTRY
EXIT
GATE
FILTER
RISK
CALIBRATION
DIAGNOSTIC
```

Rules:

- `ENTRY` strategies may produce entry candidates.
- `EXIT` rules manage exits/invalidation.
- `GATE` and `FILTER` rules support strategy eligibility.
- Support rules must not be treated as standalone entry signals.
- Strategy changes must be versioned.
- Do not silently change the meaning of an existing strategy version.

---

# 19. Data Quality Requirements

Data Quality Engine owns readiness evaluation.

It should check, where applicable:

- missing candles
- stale data
- duplicate candles
- zero or suspicious volume
- invalid OHLC values
- impossible price moves
- insufficient history
- unsupported asset type
- unsupported region
- provider/source gaps
- symbol/instrument mismatch
- stale market context
- stale historical snapshots
- scope mismatch
- liquidity concerns

Downstream modules may consume Data Quality Engine public outputs.

Downstream modules must not duplicate data quality scoring logic.

Signals, strategy decisions, calibration, backtests, alerts, portfolio context, watchlist context, and copilot summaries must either:

- require data quality to pass, or
- clearly show warning status and reason.

---

# 20. Market Data And OHLC Policy

Market Data Foundation owns market-data ingestion and normalized data access.

Use the existing project’s Prisma/database architecture unless an approved ADR changes it.

Persisted OHLC/price records must document whether they are:

- append-only
- idempotent/upserted
- derived
- cached
- provider-specific
- normalized canonical records

For idempotent OHLC/price data, define a natural key such as:

```text
instrument_id or symbol
region
asset_type
timeframe
timestamp/date
source
```

Where practical, enforce uniqueness at database level.

Market-data records should track:

```text
source
source_symbol
source_timestamp if available
ingested_at
region
asset_type
timeframe
data_quality_status where applicable
```

Do not change OHLC storage strategy casually.

A future local analytical store such as DuckDB/Parquet may be proposed only if the Architect produces an ADR covering:

- current bottleneck
- proposed storage model
- module ownership
- migration path
- query/test strategy
- rollback plan
- impact on existing Prisma models
- Product Owner approval requirement

---

# 21. Global Market Scope

The application uses global market region and asset context.

Default:

```text
region = IN
assetType = STOCK
```

Supported target scopes:

```text
IN
US
EU
GLOBAL
```

Target asset classes:

```text
STOCK
ETF
INDEX
CRYPTO
```

Current support may be narrower.

Do not pretend unsupported scopes are complete.

Frontend rules:

- Use the existing `useMarketScope()` hook where applicable.
- All instrument/stock/market-data API calls should include `region` and `assetType`.
- Components should refetch data when market scope changes.
- Persisted scope key should remain `market_scope` unless explicitly changed.

Backend rules:

- Standard query parameters are `region` and `assetType`.
- Use shared market-scope helpers where present.
- Do not show unknown-scope rows in scoped views unless the module can safely infer scope from owned data.

---

# 22. Batch Orchestration Standard

Long-running universe workflows must use bounded batches or module-owned workers/jobs.

Examples:

- catalog import
- market-data sync
- data-quality evaluation
- signal generation
- calibration
- backtesting
- smart-money snapshot refresh
- historical context snapshot generation

Backend endpoints must not process an entire universe in one synchronous request unless a documented worker/job system owns that workflow.

Backend batch responses should include:

```text
totalCount
processedCount
batchSize
offset or cursor
nextOffset or nextCursor
hasMore
summary counts
warnings
durationMs
region
assetType
```

Frontend owns orchestration across batches unless a backend worker/job system is explicitly implemented.

Rules:

- Include `region` and `assetType` in every batch request.
- Default batch size should usually be `25`.
- Max batch size should usually be `100` unless documented.
- One item failure should not fail the whole batch when safe.
- Responses should be additive and backward-compatible.
- Do not fake progress.
- Do not leave users staring at long-running actions without visible progress.

---

# 23. AI Copilot Rules

AI Investment Copilot must remain deterministic and cost-free by default.

Rules:

- No paid AI services.
- No hidden external LLM calls.
- No black-box recommendations.
- Show source modules and data gaps.
- Include research-support disclaimer.
- Use deterministic summaries from local data unless Product Owner explicitly approves otherwise.
- Do not duplicate strategy, signal, data quality, or portfolio logic owned by other modules.

---

# 24. Auth, Subscription, Notifications

## Auth

Authenticated user context is provided by `auth-identity`.

User-owned modules must filter by current user.

Legacy `userId = null` rows may be read only during documented migration or compatibility phases.

## Subscription

Subscription gates must stay centralized in `subscription-billing`.

Feature modules may call public subscription services but must not duplicate plan-limit logic.

Do not overbuild B2B/B2C subscription features during the local validation phase.

## Notifications

Notification delivery must remain free/local-friendly by default.

Paid delivery providers are not allowed.

External free providers must be optional, env-driven, and disabled unless explicitly configured.

---

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

Before starting local servers, builds, browser tests, Docker services, process-heavy workflows, or new Codex workers, check laptop memory utilization where possible.

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

# 28. Documentation Rules

Every backend module should maintain:

```text
{module}.md
```

Update docs when:

- routes change
- ownership changes
- persistence changes
- response shapes change
- calculations change
- strategy rules change
- signal contracts change
- workflow rules change
- batching behavior changes
- UX conventions change
- limitations are discovered

Use decision records for material changes.

Recommended docs:

```text
docs/architecture.md
docs/roadmap.md
docs/ux-ui-best-practices.md
docs/module-verification-register.md
docs/codex-agent-team-plan/active-work-board.md
docs/codex-agent-team-plan/blocker-register.md
docs/codex-agent-team-plan/technical-debt-register.md
docs/codex-agent-team-plan/release-checklist.md
docs/codex-agent-team-plan/decision-record-template.md
```

---

# 29. Safety And Security Rules

Never commit or expose:

- `.env` files
- secrets
- tokens
- API keys
- database dumps
- private data
- credentials
- generated sensitive artifacts

Require explicit approval before:

- installing packages
- deleting many files
- changing migrations
- changing package manifests
- changing auth/subscription behavior
- running destructive commands
- accessing files outside repo
- pushing to remote
- adding external services

Forbidden unless explicitly approved:

- broker integrations
- real-money execution
- paid services
- cloud deployment
- production credentials
- external telemetry
- uncontrolled provider-heavy requests

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
- no Codex drift

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

Every Codex response after implementation or review must include:

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

# 33. Decision Heuristics

## Pick next work by dependency order

For intelligence workflows, prefer upstream verification first:

```text
Market Data Foundation
  -> Data Quality Engine
  -> Indicator / Strategy Contracts
  -> Signal Generation Engine
  -> Signal Quality / Calibration
  -> Strategy Decision / Research / Trade Plans
  -> Portfolio / Watchlists / Alerts
  -> UI Cockpit / Copilot
```

Do not prioritize a downstream visible module if upstream data/scoring is not verified.

## MVP first

Build what creates immediate user value:

- trustworthy local data
- explainable triggers
- rule-based exits
- clear signal detail
- active monitoring
- journal/review loop
- data quality visibility

Avoid:

- premature microservices
- speculative abstractions
- overbuilt enterprise SaaS features
- paid integrations
- real-time execution
- broker automation
- black-box AI recommendations

---

# 34. Sprint 0 Purpose

Sprint 0 is not product implementation.

Sprint 0 prepares disciplined Codex execution.

Sprint 0 should produce or update:

- current-state audit
- existing vs refactor vs fresh recommendation
- module ownership map
- dependency graph
- contract inventory
- stale-docs report
- active work board reset/update
- first Top 5 priority candidates
- Sprint 1 plan
- QA baseline plan
- release checklist
- risk register

Sprint 0 must not change product behavior unless explicitly approved.

---

# 35. Final Principle

Build fast, but do not create chaos.

Optimize for:

- trust
- explainability
- local-first execution
- zero incremental cost
- modular ownership
- contract-first parallel work
- strong QA
- efficient Codex usage
- Product Owner control
- future B2C/B2B readiness

Do not optimize for theoretical perfection.
