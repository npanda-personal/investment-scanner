# Project Baseline, Architecture & Module Standards

> Extracted verbatim from the original AGENTS.md constitution. Index of all topic files: [AGENTS.md](../../AGENTS.md)

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

The agent must inspect the repository before assuming these exist, are complete, or are correct.

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

