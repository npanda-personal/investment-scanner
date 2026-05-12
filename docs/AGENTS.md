You are working inside my existing full-stack TypeScript project.

# Primary Goal

Build and evolve this project as a clean modular monolith architecture where:

- Each business capability is independently organized.
- Changes in one module are unlikely to break another.
- New development happens only within modular boundaries.
- The codebase remains production-safe during changes.
- Product delivery speed stays high.
- Code ownership is clear.

# Current Tech Stack

## Backend
- Node.js
- Express
- TypeScript
- Prisma

## Frontend
- React
- Vite
- TypeScript

# Current Active Product Modules

Backend modules are located in:

backend/src/modules/{module-name}

Frontend features are located in:

frontend/src/features/{feature-name}

Current modules include:

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

# Parallel Team Operating Model

Use `docs/codex-agent-team-plan/team-operating-model.md` as the default delivery model for planning and assigning work.
Use `docs/codex-agent-team-plan/codex-agent-team.md` when work is split across multiple Codex agents.

- Product Owner owns roadmap priority, requirements, acceptance criteria, user workflow intent, and investment-domain language. The Product Owner is the market, quant, and stock-analysis domain authority and can change roadmap direction or requirements when domain judgment changes.
- Solution Architect owns architecture, API/data contracts, module boundaries, database impact, cross-module dependencies, scalability, and robustness. The Solution Architect can change solution design when needed, but must preserve the project's personal/local-first purpose and free/open-source or already-local tooling constraints.
- Senior Fullstack Lead owns integration quality, shared patterns, code review, standards, and unblock decisions. This role is not the default implementer for every feature.
- Module Fullstack Developers own complete vertical module slices: backend, frontend, tests, and module docs for their assigned lane.
- QA owns acceptance scenarios, regression coverage, live-data verification, and release readiness.

Default parallel lanes:

- Lane 1: Market Data / Data Quality
- Lane 2: Strategy / Signals / Risk
- Lane 3: Portfolio / Watchlists / Alerts / UX

When work is independent, assign it by lane and module so implementation can proceed in parallel. Shared files, cross-module contracts, route registration, Prisma schema changes, global market-scope behavior, shared UI components, auth, and subscription gates require Solution Architect or Senior Fullstack Lead review before merge.

Nothing in the roadmap, requirements, module priorities, or existing workflow assumptions is frozen. Always follow the latest Product Owner direction when it conflicts with older docs, and update the affected docs as part of the change. Do not introduce paid libraries, paid tools, paid service providers, paid market-data sources, paid AI services, paid hosted testing, or paid infrastructure. The personal/local-first and free-tool constraints are non-negotiable.

For multi-agent Codex work, the main Codex session acts as Senior Fullstack Lead / Orchestrator. It must assign disjoint write scopes, reserve files/modules to single owners, keep shared files under explicit ownership, collect agent handoffs, and integrate final changes. No two agents may edit the same file, module, test spec, migration, route registry, generated type, or shared component in the same implementation pass. Lane agents may work independently inside assigned module boundaries, but they must not edit shared route registries, shared UI, shared backend utilities, Prisma schema, package manifests, or CI files unless the orchestrator explicitly assigns those files.

Product Owner and Solution Architect agents must always run in deep-thinking decision mode. When the Codex agent runtime supports reasoning-effort settings, use high or highest available reasoning effort for those two roles. The requirement flow is Product Owner to Product Owner: PO requirement -> product brief -> Orchestrator Intake -> architecture contract -> QA verification plan -> orchestrator work packet -> lane implementation -> orchestrator integration -> QA evidence -> post-QA Lead validation -> post-QA Architect signoff after Lead validation -> PO acceptance -> GitHub check-in or revised requirement. After QA signs off, the Senior Fullstack Lead / Orchestrator must validate that Architect asks and integration expectations were met. Then the Solution Architect must sign off again that business rules, architecture contracts, solution quality, and local/free-tool constraints still hold before Product Owner verification.

Use an agile priority pipeline, not a waterfall roadmap-first process. At startup, the Product Owner Agent must create the first Top 5 Priority Requirements and hand them to the Orchestrator for intake immediately. The Architect pulls each item after Orchestrator intake marks it `Ready for Architecture`. While Architect, QA, Orchestrator, and lane agents move those five items through the flow, the Product Owner Agent works on the broader roadmap and next priority batch. Do not wait for all five items to be architected before starting the first item that reaches `Ready for Implementation`. No role should be idle when it can pull the next eligible item, refine the next batch, prepare verification, inspect modules, or resolve blockers.

Use `docs/codex-agent-team-plan/active-work-board.md` as the live source of truth for current Top 5 items, next priority candidates, work state, operating mode, owner, lane/module, reserved write scope, blockers, and GitHub check-in evidence. At first-run kickoff, the Orchestrator loads baseline docs and repo state, Product Owner creates Top 5 briefs, Orchestrator performs intake and moves complete items to `Ready for Architecture`, Architect starts contracts in priority order, QA starts early scenarios, developers stay in discovery until work packets and reservations exist, and the Orchestrator moves the first non-conflicting item to `Ready for Implementation` only after the work packet, QA plan, WIP check, and single-writer reservations are complete.

When Product Owner changes priority, scope, or acceptance criteria, update the active work board before downstream work continues. Items not yet in implementation return to the earliest affected gate. Items in implementation pause new edits until the Orchestrator decides whether to continue, revise, return to architecture, or cancel. Cancelled or unaccepted work must not be committed or pushed unless Product Owner explicitly accepts a scoped partial result.

Each lane developer agent has a WIP limit of one active implementation task. A developer must carry that task end to end through implementation, tests/docs updates, structured handoff, and QA/orchestrator follow-up before pulling the next implementation task. Do not split one developer across multiple active implementation items.

At every review gate, rejection reasons must be clear, specific, and assigned back to the responsible role on the same work item. A rejected implementation item remains the developer's active WIP for the next correction iteration before any new task is pulled. Clarification follows this chain: Developer -> Senior Fullstack Lead / Orchestrator -> Solution Architect -> Product Owner. The final clarification must be written back into the work packet, architecture contract, acceptance criteria, module docs, decision record, or blocker register.

Every agent handoff must be complete enough for the next role to act without guessing: work item, state, mode, owner, lane/module, exact files changed or inspected, behavior/docs/contracts changed, checks run or skipped, assumptions, risks, blockers, shared-file requests, next gate, and evidence notes. Incomplete handoffs are rejected back to the responsible role in Revision or Clarification mode.

Blockers and conflicts must be routed before lower-priority work. Developer blockers go to the Lead/Orchestrator, shared-file conflicts pause competing edits until the Orchestrator assigns one owner, architecture blockers go to Architect, product/domain blockers go to Product Owner, and unresolved blockers are recorded in `docs/codex-agent-team-plan/blocker-register.md` with owner, next action, review date, and parallel work available before the owner pulls unrelated work.

Use documented Codex-agent operating modes from `docs/codex-agent-team-plan/codex-agent-team.md`: Discovery, Product Planning, Orchestrator Intake, Architecture Planning, Implementation, QA Verification, Lead Validation, Architect Signoff, PO Acceptance, GitHub Check-In, Clarification, and Revision. Work packets and handoffs must record current mode, mode owner, allowed actions, forbidden actions, next mode, and whether clarification or revision mode is active.

No accepted requirement is considered released until the Senior Fullstack Lead / Orchestrator stages only that requirement's scoped files, commits them, pushes the commit to `origin` on the active branch, and records branch name, commit SHA, pushed remote, committed files, scoped-staging confirmation, unsafe/unaccepted-file exclusion confirmation, rollback notes, and CI status/link when available. Do not commit unrelated local changes, rejected work, unaccepted requirements, secrets, `.env` files, database dumps, or generated artifacts unless explicitly part of the accepted requirement.

When the Product Owner introduces a new module, do not assign it directly to a developer. The Product Owner Agent must define the business capability and why separate ownership may be needed as a product brief. The Orchestrator must perform intake, record the board row, and move the item to `Ready for Architecture`. The Solution Architect Agent must decide whether to create a new module or extend an existing one, assign the ownership lane, and record the architecture contract. QA must create the verification plan before implementation. The Orchestrator creates the new-module work packet, reserves backend/frontend module paths, docs, tests, route registration, and shared files, confirms WIP availability, and moves the item to `Ready for Implementation` before one available lane developer implements the first vertical slice end to end.

Every Codex agent must load and follow the relevant guideline sources before making decisions, implementing, verifying, or signing off. Baseline sources are `docs/AGENTS.md`, `docs/instructions.md`, `docs/codex-agent-team-plan/team-operating-model.md`, `docs/codex-agent-team-plan/codex-agent-team.md`, and `docs/codex-agent-team-plan/sdlc-operating-model.md`. Role and task-specific sources include `docs/architecture.md`, `docs/roadmap.md`, `docs/ux-ui-best-practices.md`, `docs/module-verification-register.md`, and relevant module `{module}.md` files. Work packets must list guidelines loaded, and handoffs must call out skipped guidelines, conflicts, or unresolved ambiguity. Use `docs/codex-agent-team-plan/decision-record-template.md` for material decisions, `docs/codex-agent-team-plan/release-checklist.md` for release candidates, `docs/codex-agent-team-plan/technical-debt-register.md` for known debt, `docs/codex-agent-team-plan/blocker-register.md` for blockers, and `docs/codex-agent-team-plan/retrospective-template.md` after Top 5 batches or major release candidates.

# Important Current State

Legacy code has already been cleaned up and removed.

Do NOT assume legacy folders still exist.

Do NOT create compatibility shims for removed legacy code unless explicitly requested.

This project now uses modular architecture as the primary source of truth.

# Golden Rule

All new code must live in modular structure.

Prefer extending an existing module when ownership clearly belongs there.

Create a new module only when the capability deserves separate ownership.

# Mandatory Tasks For Any Feature / Refactor

1. Analyze current folder structure first.
2. Understand existing module ownership.
3. Reuse public exports from active modules when appropriate.
4. Keep changes small, safe, and staged.
5. Preserve working behavior unless explicitly changing it.
6. Run build/tests/typecheck when available.
7. Summarize all changes.

# Mandatory Module Hardening Sequence

When a task asks to harden, polish, audit, verify, or continue work on a module, use this sequence by default so the product owner does not need to repeat it every time:

1. Read `docs/AGENTS.md`, `docs/architecture.md`, relevant module `{module}.md` files, and applicable docs under `docs/`.
2. Audit the current backend, frontend, data model, API contracts, tests, docs, and browser-visible behavior before editing.
3. Identify concrete correctness, completeness, performance, batching, scope, UX, and data-flow issues. Fix only verified issues unless the user explicitly asks for broader design work.
4. Write or update backend semantic tests for changed calculations, filtering, persistence, batching, idempotency, and data-shape behavior.
5. Write or update module-owned UI tests under `frontend/tests/ui` for changed user-visible workflows. Do not rely on heading-only checks.
6. Implement the smallest safe backend/frontend changes inside module boundaries, using public exports for cross-module consumption.
7. Run the relevant backend test suite, frontend UI test suite, backend build, and frontend build when practical.
8. Manually verify changed UI and data-flow behavior in the browser, especially for authenticated routes and real local data correctness.
9. If a regression cannot be fully automated yet, update `frontend/tests/regression-todo.md` with the repeatable manual steps and record evidence in the task summary.
10. Update module docs and shared docs when routes, response shapes, workflow rules, batching behavior, UX conventions, or architectural lessons change.

Do not claim a module is verified only because the page loads. Verification must include data correctness, scope correctness, batch behavior, visible empty/error states, and the connection to upstream/downstream modules where applicable.

For every data-bearing module UI/API change, perform an authenticated live-data validation pass after the automated tests. This is mandatory even when UI tests use mocked responses. The pass must check the real local API/browser data for:

- scoped totals and row counts,
- critical field completeness for the workflow being changed,
- filter/preset accuracy, including zero-result presets,
- obvious stale or legacy rows that make the UI misleading,
- upstream/downstream handoff assumptions.

Record the result in the task summary. If the live data fails the expected invariant, either fix the data-flow issue in the same task or explicitly report the remaining blocker. Do not treat "columns are visible" as data correctness.

# Global Market Scope

The application uses a global market region/asset context to filter data across all modules.

- **Default Region**: India (IN)
- **Supported Regions**: IN, US, EU, GLOBAL
- **Asset Scope**: STOCK (currently), scalable for ETF, CRYPTO, etc.

## Frontend Usage

- Use the `useMarketScope()` hook to access the current `scope`.
- All instrument/stock API calls should include `region: scope.region` and `assetType: scope.assetType`.
- Components should refetch data when `scope.region` or `scope.assetType` changes.
- Persisted in `localStorage` under `market_scope`.

## Backend Implementation

- Standardized query parameters: `region`, `assetType`.
- Use the shared helpers `resolveMarketRegionFilter(region)` and `resolveRelatedMarketRegionFilter(region)` from `backend/src/shared/utils/market-scope.ts` in repositories to map global region codes to database-specific filters (country, exchange, etc.).
- Market context snapshots are stored per region to ensure accurate breadth and regime analysis.

# Backend Module Standard

All backend modules belong in:

backend/src/modules/{module-name}

## Default Flat File Structure

- {module}.module.ts
- {module}.router.ts
- {module}.controller.ts
- {module}.service.ts
- {module}.repository.ts
- {module}.validation.ts
- {module}.types.ts
- {module}.provider.ts (optional)
- {module}.worker.ts (optional)
- {module}.queue.ts (optional)
- {module}.md
- index.ts

## Flat File Rule

Backend modules should remain flat by default.

Do NOT create nested folders like:

- routes/
- services/
- repositories/
- validation/
- types/
- providers/
- workers/
- queue/

Unless:

1. Explicitly requested, OR
2. Module has clearly outgrown flat structure

If exception is made:

- document it clearly

# Frontend Feature Standard

All frontend features belong in:

frontend/src/features/{feature-name}

## Default Structure

- api/
- components/
- hooks/
- types.ts
- routes.tsx
- index.ts

# Frontend Rules

- Feature-specific UI stays inside the feature folder.
- Shared UI belongs in:

frontend/src/shared/components

- Outside callers should import from feature index.ts when practical.

Avoid deep imports into another feature’s internal files.

- Follow reusable UX/UI guidance in `docs/ux-ui-best-practices.md` for table-heavy screens, filters, batch workflows, responsive layouts, and diagnostic states.

# Architecture Rules

## Layering

- Controllers call Services
- Services call Repositories
- Repositories call Prisma

## Forbidden

Modules must NOT import another module’s repository directly.

## Cross-Module Access

Use only public exports:

- backend/src/modules/{module-name}/index.ts
- frontend/src/features/{feature-name}/index.ts

Public module indexes should stay side-effect-light where practical. If a barrel import triggers router/service construction cycles, document the limitation and prefer a small public contract/evaluator export cleanup before forcing downstream modules through a fragile barrel.

# Ownership Rules

Each module owns its own:

- business logic
- routes
- DTOs
- validation
- providers
- workers
- queues
- tests
- docs

If another module needs functionality:

Use public services/providers/exports only.

Never reach into internals.

# API Rules

Preserve working API behavior unless explicitly asked to change it.

Register backend routes centrally in:

backend/src/api/routes.ts

Register frontend routes centrally in:

frontend/src/app/routes.tsx

# Product Development Rules

## MVP First

Build what creates immediate user value first.

Avoid premature V2/V3 complexity.

## Good Examples

- clear stock research workflows
- understandable signal engine
- practical portfolio insights
- simple watchlist workflows
- fast user feedback loops

## Avoid

- overbuilt abstractions
- premature microservices
- speculative frameworks
- unnecessary complexity

# Refactor Rules

## Prefer

- move files
- simplify code
- improve ownership boundaries
- fix imports
- preserve behavior
- incremental cleanup

## Avoid

- rewriting stable logic without reason
- giant-bang refactors
- mixing multiple epics in one pass

# Documentation Rules

Every backend module should maintain:

{module}.md

Update docs when:

- routes change
- ownership changes
- persistence changes
- response shapes change
- calculations change
- limitations discovered

# Testing Rules

After changes, run what exists:

- build
- typecheck
- unit tests
- integration tests
- UI smoke tests for changed frontend flows when configured

If tests do not exist:

- add focused tests near changed logic when practical

Frontend module changes that affect shared navigation, page loading, filters, batch controls, tables, progress states, or user-visible module workflows MUST update and run the Playwright smoke suite in `frontend/tests/ui` when practical. These tests must not stop at page headings. They must assert the actual user-visible behavior touched by the change: primary controls, important filters/tabs, table columns, progress/disabled states, route targets, clear empty states, and any specific regression fixed in the change.

UI smoke testing is mandatory for UI-facing changes unless there is a clear blocker, such as missing browser binaries, unavailable local services, or test-account setup failure. If blocked, document the blocker in the final response and still run build/unit tests. Do not silently substitute backend tests for UI verification.

The UI smoke suite must stay local-first and free/open-source. Use Playwright locally; do not add paid hosted browser testing, paid visual regression services, or paid monitoring tools.

UI tests must be organized like the application modules. Keep feature/module scenarios in separate files under `frontend/tests/ui`, such as `market-data-foundation.spec.ts` or `research-hub.spec.ts`, and place shared login fixtures, route helpers, and common assertions in `frontend/tests/ui/support`. Avoid growing a single catch-all smoke spec; test ownership should mirror source ownership so regressions are easy to find and maintain.

Authenticated UI smoke tests that share the local test user should run deterministically. Prefer one Playwright worker unless the suite is explicitly redesigned around isolated users/storage state per worker. Keep protected-route navigation/auth setup in shared UI test helpers so module specs stay focused on module behavior.

For data-bearing pages, a passing UI smoke test must prove one of these outcomes:

- expected scoped data is visible, or
- a domain-specific empty state explains why data is absent and what action refreshes or fixes it.

Generic "page loaded" checks and generic `No records found` empty states are not sufficient for module-hardening work.

Mandatory UI-facing workflow:

1. Write or update UI tests for the affected user workflow first.
2. Execute the UI tests and use failures to expose real UI/API issues.
3. Implement the fix.
4. Run the relevant backend test suite for backend/API changes.
5. Run the UI test suite again as the final verification.

Do not claim UI behavior is verified until the UI suite has passed after the fix.

Bulk data-load and calculation workflows, such as catalog imports, market-data sync, data-quality evaluation, signal generation, and smart-money snapshot refresh, must be manually verified in the browser when the change affects their visible behavior. Do not run destructive, very large, provider-heavy, or long-running bulk operations inside the regular UI smoke suite. Instead, cover their controls, disabled/progress/summary states, request parameters, empty states, and non-bulk interactions in Playwright, then record the manual browser verification for the real bulk run.

# Safety Rules

Make small, safe changes in stages.

After deleting code:

1. search for stale imports
2. verify builds still pass
3. verify routes still work
4. verify docs still reflect reality

# Output Expectations For Any Task

Always provide summary:

## Structural Changes

- modules created
- files added
- files moved
- files removed

## Code Changes

- imports updated
- APIs preserved/changed
- logic added/refactored

## Validation

- builds run
- tests run
- unresolved risks

## Manual Review Needed

- migrations
- env vars
- production risks
- follow-up cleanup

# Decision Heuristics

## Pick Next Work By Dependency Order

When multiple modules need hardening, prefer least-dependent upstream modules first. For intelligence workflows, validate the chain in order:

Market Data Foundation -> Data Quality Engine -> Signal Generation Engine -> Signal Quality/Calibration -> Strategy Decision/Research/Trade Plans.

Do not prioritize a downstream module just because it is more visible if it depends on upstream data or scoring that has not been verified yet.

## Extend Existing Module If:

- same business capability
- same ownership boundary
- same user workflow
- minimal new domain complexity

## Create New Module If:

- new user-facing capability
- distinct business ownership
- likely to scale independently
- should release safely without affecting other modules

# Current Shared Infrastructure

Approved shared roots:

Backend:
- backend/src/db
- backend/src/shared
- backend/src/config

Frontend:
- frontend/src/shared
- frontend/src/app

# Current Cross-Module UI Patterns

- Signal cards may open feature-owned action dialogs through public frontend exports, such as Portfolio Management and Watchlist Management.
- Signal cards may open Alerts & Monitoring rule dialogs through public frontend exports.
- Stock Research Workbench may expose action buttons that consume public frontend feature exports, such as adding an instrument to a watchlist.
- Crowded operational screens should split major jobs into tabs or sidebars, keep the main table focused on scan-friendly columns, and move lower-frequency metadata or provider diagnostics into a detail drawer or detail page.
- Main filter bars should stay compact and use preset chips for common workflows. Advanced or diagnostic filters should be hidden behind advanced controls, saved views, or presets unless they are part of the page's primary job.
- Alert/status badges should use existing MUI `Chip` severity colors unless a shared design-system component is introduced later.
- Shared table-heavy UX should use `frontend/src/shared/components/DataTable` for pagination, sorting, loading, error, and empty states where practical.
- Shared page chrome should use `frontend/src/shared/components/PageHeader` for aligned titles, subtitles, back navigation, badges, and right-aligned actions.
- Shared entity lookup UX should use searchable selectors from `frontend/src/shared/components`, starting with `InstrumentSearchSelect`, instead of asking users to type raw IDs.
- Unified stock/entity pages should prefer tabs for related views; `/stocks/:id` is the canonical stock workspace route and compatibility routes may render or redirect into it.
- Related modes or sections on a page should use tabs, sidebars, or searchable selectors rather than rows of navigation buttons; expensive tabs should lazy-load or stay manual when practical.
- Market context dashboards should use compact cards, `Chip` status labels, and concise takeaway lists rather than large tables.
- Backtesting dashboards should use compact metric cards, bounded trade tables, and chart views that summarize historical simulations without exposing raw config JSON as the primary UI.
- Smart money dashboards must clearly separate real price-volume signals from unavailable insider/institutional placeholders and should use status chips plus concise explanations.
- Copilot summaries must be deterministic and cost-free by default, show source modules and data gaps, and include the research-support disclaimer instead of direct financial advice.
- Subscription gates must stay centralized in `subscription-billing`; feature modules may call the public service but must not duplicate plan-limit logic.
- Authenticated user context is provided by `auth-identity` through `requireAuth`; user-owned modules must filter by current user and may read legacy `userId = null` rows during migration.
- Notification delivery must remain free/local-friendly by default. Use notification preferences and delivery records from `notifications-delivery`; paid delivery providers are not allowed. Any external free provider must be optional, env-driven, and disabled unless explicitly configured.
- Signal Quality Lab owns historical signal outcome measurement and quality dashboards. It must not change Signal Generation Engine scoring logic; consume signal results through public exports and calculate outcomes from Market Data Foundation price data.
- Historical Context Snapshots owns point-in-time persistence of market context, sector/country strength, smart-money context, and data-quality readiness. Current calculations remain owned by their source modules; snapshots enable historical grouping and lookup.
- Signal Calibration Engine owns explainable calibrated score/confidence outputs and model-version metadata. It must preserve raw Signal Generation Engine scores and persist calibration separately.
- Data Quality Engine owns data coverage, liquidity, and signal-readiness evaluations. It consumes Market Data Foundation through public exports and should expose batch-safe evaluation flows for downstream modules.
- Long-running universe workflows should expose `batchSize` plus `offset`/cursor progress metadata and let the frontend orchestrate bounded batches with one coordinated parallel-processing strategy, refresh visible data after completion, and keep action buttons in a disabled loading state until complete.
- Downstream modules may consume Data Quality Engine public filtering helpers to skip or warn on low-readiness instruments, but they must not duplicate readiness, coverage, or liquidity scoring logic.
- Persisted stock-data models must document whether they are append-only or idempotent/upserted. Idempotent models need a clear natural key, date/timestamp normalization where relevant, repository-level upsert/skip behavior, and database uniqueness where practical.
- Persisted historical result lists, such as backtests, strategy decisions, signals, calibration, and research snapshots, must respect the active `region` and `assetType` when those query parameters are supplied. Records with missing/unknown scope should not be shown in scoped views unless the module can safely infer the scope from owned data.
- These integrations must not import backend repositories or frontend feature internals directly.

# Batch Orchestration Standard

- Backend endpoints must process bounded batches, not an entire universe, unless an explicit backend worker/job system owns that workflow.
- Backend batch responses must return `totalCount`, `processedCount`, `batchSize`, `offset`/`cursor`, `nextOffset`/`nextCursor`, `hasMore`, count summaries, `warnings`, and `durationMs`.
- Frontend owns orchestration across batches unless a backend worker/job system is explicitly implemented.
- Frontend must continue until `hasMore=false` for user-triggered "run all" actions.
- When using parallel processing, use a single coordinated strategy for the workflow: define module-owned worker/request-pool config, keep provider-facing throttles server-owned, avoid exposing raw concurrency controls to normal users, and ensure backend and frontend parallelism do not multiply into uncontrolled provider or database pressure.
- `region` and `assetType` must be passed to every batch request.
- Batch size defaults should be safe, usually `25`.
- Batch size max should usually be `100` unless documented by the owning module.
- One item failure should not fail the entire batch when safe; increment the failed count and continue.
- Backend response fields must be additive and backward-compatible.
- All future modules must follow this standard.

Example request:

```json
{
  "batchSize": 25,
  "offset": 0,
  "region": "IN",
  "assetType": "STOCK"
}
```

Example response:

```json
{
  "processedCount": 25,
  "totalCount": 503,
  "nextOffset": 25,
  "hasMore": true
}
```

# Batch Progress UI Standard

- Every user-triggered batch operation must show progress.
- Frontend must not fire one batch and stop when backend returns `hasMore=true`.
- Use backend `processedCount`, `totalCount`, `nextOffset`, and `hasMore` to drive progress.
- Use a determinate progress bar when `totalCount` is known.
- Use indeterminate progress only before `totalCount` is known.
- Disable run buttons while running.
- Show spinner/loading state in the action button.
- Prevent duplicate concurrent runs.
- Show a final summary.
- Show errors and partial completion.
- Show warning count and details where practical.
- Keep progress counters semantically separate: missing prerequisites, skipped records, failed records, no-ops, and not-yet-evaluable records must not be merged into one misleading skipped/unevaluated number.
- Display and send `region` and `assetType` on every batch request.
- Do not fake progress.
- Do not process an entire universe in one backend request just to simplify progress.
- Future modules must follow this pattern.

# Responsive Filter And Batch Action Layout Standard

- Filter bars and batch action panels must stay inside the page content container at every supported viewport width.
- Filters should wrap using a responsive flex/grid layout with sensible minimum widths; table horizontal scrolling is acceptable only for the table itself, not for the filter or action controls.
- Refresh, Reset, Import, Sync, Backfill, and similar action buttons must remain visible and clickable, wrapping below filters when needed instead of overflowing or being clipped.
- Long-running action panels should keep controls, status chips, warnings, and progress messages in the same visual container so users can understand what is running and why.
- Shared table-heavy screens should prefer the shared `FilterBar` and `DataTable` components where practical, and feature-owned custom filter/action bars should follow the same wrapping and progress behavior.

# Product Language Standard

The following terminology MUST be used for specific modules:

- Signal Generation: use "bullish", "bearish", "triggered".
- Signal Reliability: use "noise", "overextended", "reliable".
- Strategy Decision: use "candidate", "consider review", "risk level". Avoid financial advice terms like "buy" or "sell".

# Final Principle

Optimize for:

- maintainability
- clear ownership
- safe iteration
- product delivery speed
- understandable code
- scalable modular growth

Not theoretical perfection.

## Strategy Framework Ownership

- Strategy Framework owns reusable strategy definitions, versions, typed rule declarations, deterministic evaluators, performance summaries, ratings, and future automation eligibility flags.
- Signal Generation, Strategy Decision, Backtesting, Alerts, and future automation modules should consume Strategy Framework through public exports/APIs instead of duplicating strategy rules.
- Consumers must respect Strategy Framework categories. `ENTRY` strategies can be evaluated as entry/review candidates and registered backtests; `EXIT`, `GATE`, and `FILTER` definitions need module-specific semantics and must not be treated as standalone entry backtests just because they are active.
- Strategy Framework UI/API surfaces must make category and status boundaries explicit. Only active `ENTRY` strategies may expose enabled standalone registered-backtest actions; support rules and drafts should stay visible for diagnostics with disabled/explained backtest actions.
- Strategy Framework is research support only and must not enable live trading, broker execution, order placement, or autonomous real-money automation.
