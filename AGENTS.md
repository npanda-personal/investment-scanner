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
- Alert/status badges should use existing MUI `Chip` severity colors unless a shared design-system component is introduced later.
- Market context dashboards should use compact cards, `Chip` status labels, and concise takeaway lists rather than large tables.
- Backtesting dashboards should use compact metric cards, bounded trade tables, and chart views that summarize historical simulations without exposing raw config JSON as the primary UI.
- Smart money dashboards must clearly separate real price-volume signals from unavailable insider/institutional placeholders and should use status chips plus concise explanations.
- Copilot summaries must be deterministic and cost-free by default, show source modules and data gaps, and include the research-support disclaimer instead of direct financial advice.
- Subscription gates must stay centralized in `subscription-billing`; feature modules may call the public service but must not duplicate plan-limit logic.
- Authenticated user context is provided by `auth-identity` through `requireAuth`; user-owned modules must filter by current user and may read legacy `userId = null` rows during migration.
- Notification delivery should remain free/local-friendly by default. Use notification preferences and delivery records from `notifications-delivery`; paid/external delivery providers must be optional, env-driven, and disabled unless explicitly configured.
- Signal Quality Lab owns historical signal outcome measurement and quality dashboards. It must not change Signal Generation Engine scoring logic; consume signal results through public exports and calculate outcomes from Market Data Foundation price data.
- These integrations must not import backend repositories or frontend feature internals directly.

# Final Principle

Optimize for:

- maintainability
- clear ownership
- safe iteration
- product delivery speed
- understandable code
- scalable modular growth

Not theoretical perfection.
