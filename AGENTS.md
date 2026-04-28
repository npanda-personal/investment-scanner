You are working inside my existing full-stack TypeScript project.

# Primary Goal

Refactor and evolve this project into a modular monolith architecture where:

- Each business capability is independently organized.
- Changes in one module are unlikely to break another.
- Legacy code is gradually retired.
- New development happens only in modular boundaries.
- The codebase remains production-safe during refactors.

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

# Product Domains / Modules

Examples include:

- auth
- users
- market-data-foundation
- stock-research-workbench
- scanner
- real-time scanner
- backtester
- watchlists
- smart money
- sector rotation
- macro
- portfolio
- alerts

# Core Working Model

## IMPORTANT

The project may contain legacy code from earlier architecture.

Treat legacy code as migration source only.

## Golden Rule

New code must live in modular structure.

Legacy code must not become a dependency of new modules.

If useful logic exists in legacy code:

- extract it
- copy/refactor it
- move ownership into the correct module

Do NOT keep cross-dependencies on legacy folders.

# Mandatory Tasks For Any Refactor / Feature Work

1. Analyze current folder structure first.
2. Identify all dependent files before moving code:
   - routes
   - services
   - tests
   - workers
   - queues
   - providers
   - frontend imports
   - docs
   - compatibility shims
3. Propose minimal safe changes.
4. Implement in stages.
5. Keep app working after every stage.
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
- {module}.md (documentation)
- index.ts

## Flat File Rule

Backend module files should remain flat by default.

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

1. Explicitly requested by user, OR  
2. Module has genuinely outgrown flat structure

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

## Frontend Rules

- Feature-specific UI stays inside feature folder.
- Shared UI belongs in:

frontend/src/shared/components

- Outside callers import only from feature index.ts

Never from internal paths unless explicitly required.

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

Use public service/provider exports.

Never reach into internals.

# Legacy Code Rules

Examples of likely legacy locations:

- backend/src/api/*
- backend/src/scanners/*
- backend/src/backtest/*
- frontend/src/services/*
- frontend/src/components/*
- old feature aliases
- compatibility exports

## Rules

- Do not build new features there.
- Do not add new dependencies on them.
- Migrate functionality into modules.
- Remove duplicate legacy files once callers are migrated.

# API Compatibility Rules

Preserve working external API behavior unless explicitly asked to change it.

If legacy URLs must remain:

Mount new module routers in app route registry.

Example:

backend/src/api/routes.ts

Do NOT keep old route files just to preserve URLs.

# Refactor Rules

## Prefer

- move files
- fix imports
- preserve behavior
- incremental cleanup

## Avoid

- rewriting stable logic
- giant-bang refactors
- changing behavior without reason
- mixing multiple epics in one pass

# Data / Product Rules

## Prefer MVP-first scope

Build only what delivers user value now.

## Keep future-ready but lean

Do not overengineer V2/V3 features early.

## Example

Good:

- simple signal engine
- clear stock research page
- practical portfolio insights

Bad:

- overbuilt abstractions
- premature microservices
- unused generic frameworks

# Documentation Rules

Every module should maintain its own:

{module}.md

Update docs when:

- files move
- ownership changes
- routes change
- persistence changes
- compatibility shims removed
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

After deleting duplicate files:

1. search for stale imports
2. verify deleted paths unused
3. verify builds still pass

If removing folders fails:

- verify obsolete
- retry safely

# Output Expectations For Any Task

Always provide summary:

## Structural Changes

- modules created
- files moved
- files removed

## Code Changes

- imports updated
- APIs preserved/changed
- logic reused/refactored

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

When unsure whether work belongs in an existing module or new module:

## Put in Existing Module if:

- same business capability
- same ownership boundary
- mostly extending current workflows

## Create New Module if:

- new user-facing capability
- distinct domain logic
- likely to scale independently
- should be deploy-safe from unrelated changes

# Final Principle

Optimize for:

- maintainability
- clear ownership
- safe iteration
- product delivery speed
- eventual removal of legacy code

Not for theoretical perfection.