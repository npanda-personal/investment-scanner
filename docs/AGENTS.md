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

# Important Current State

Legacy code has already been cleaned up and removed.

Do NOT assume legacy folders still exist.

Do NOT create compatibility shims for removed legacy code unless explicitly requested.

This project now uses modular architecture as the primary source of truth. :contentReference[oaicite:0]{index=0}

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

If tests do not exist:

- add focused tests near changed logic when practical

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
- Notification delivery should remain free/local-friendly by default. Use notification preferences and delivery records from `notifications-delivery`; paid/external delivery providers must be optional, env-driven, and disabled unless explicitly configured.
- Signal Quality Lab owns historical signal outcome measurement and quality dashboards. It must not change Signal Generation Engine scoring logic; consume signal results through public exports and calculate outcomes from Market Data Foundation price data.
- Historical Context Snapshots owns point-in-time persistence of market context, sector/country strength, smart-money context, and data-quality readiness. Current calculations remain owned by their source modules; snapshots enable historical grouping and lookup.
- Signal Calibration Engine owns explainable calibrated score/confidence outputs and model-version metadata. It must preserve raw Signal Generation Engine scores and persist calibration separately.
- Data Quality Engine owns data coverage, liquidity, and signal-readiness evaluations. It consumes Market Data Foundation through public exports and should expose batch-safe evaluation flows for downstream modules.
- Long-running universe workflows should expose `batchSize` plus `offset`/cursor progress metadata and let the frontend orchestrate bounded batches with one coordinated parallel-processing strategy, refresh visible data after completion, and keep action buttons in a disabled loading state until complete.
- Downstream modules may consume Data Quality Engine public filtering helpers to skip or warn on low-readiness instruments, but they must not duplicate readiness, coverage, or liquidity scoring logic.
- Persisted stock-data models must document whether they are append-only or idempotent/upserted. Idempotent models need a clear natural key, date/timestamp normalization where relevant, repository-level upsert/skip behavior, and database uniqueness where practical.
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
- Strategy Framework is research support only and must not enable live trading, broker execution, order placement, or autonomous real-money automation.
