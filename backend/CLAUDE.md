# backend/CLAUDE.md

Express + TypeScript + Prisma modular monolith. Full standards: `docs/agents/architecture-standards.md`.

## Module anatomy (`src/modules/<name>/`)

```
<name>.controller.ts   HTTP layer only — parse/validate request, call service, shape response
<name>.service.ts      business logic — orchestrates repositories, no HTTP types
<name>.repository.ts   Prisma access only — no business logic
<name>.types.ts        module types/contracts
<name>.validation.ts   input validation schemas
index.ts               module public surface — import other modules ONLY via their index
```

Layering is one-way: controller → service → repository. No cross-layer or cross-module deep imports. Some modules add extra services (e.g. `*.crypto-service.ts`, `fno-ban.service.ts`) — same layering rules apply.

## Prisma

- Schema (`prisma/schema.prisma`) is cross-cutting-owned — a hook blocks direct edits; get explicit owner approval first.
- Sync = `npm run db:push`. NEVER `migrate dev`/`migrate reset` (shared DB has drift).
- `npx prisma generate` after every `npm install`.
- Crypto features use isolated `crypto_`-prefixed tables only.

## Lanes (30 modules)

- **Market Data / Quality**: market-data-foundation, data-quality-engine, earnings-intelligence, smart-money-intelligence, derivatives-intelligence, market-context-intelligence, snapshot-assembler, historical-context-snapshots, pipeline-orchestration
- **Strategy / Signals / Risk**: signal-generation-engine, signal-calibration-engine, signal-quality-lab, signal-position-ledger, strategy-framework, strategy-decision-engine, backtesting-strategy-lab, trade-plan-risk-engine
- **Portfolio / UX / Platform**: portfolio-management, portfolio-intelligence, watchlist-management, alerts-monitoring, notifications-delivery, research-hub, stock-research-workbench, market-intelligence, ai-investment-copilot, trade-journal, today-trade-review, auth-identity, subscription-billing

Lane ownership details: `docs/agents/team-and-lanes.md`.

## Dev & test

- Dev server: `$env:TS_NODE_TRANSPILE_ONLY='1'; npm run dev` (env var required)
- Tests: jest (`npm test`); CI = Node 20, `prisma generate` + `db push` + build + test
