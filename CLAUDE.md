# CLAUDE.md

Research-support market intelligence app (localhost-first, zero-incremental-cost). **Language rule:** research-support wording only — "bullish/entry/exit/invalidation trigger", "candidate", "signal quality"; NEVER "buy now", "price target", "guaranteed", or advice wording.

## Ports & Services

| Service | Port | Notes |
|---|---|---|
| Backend (Express) | 3000 | health: `GET http://localhost:3000/health` |
| Frontend (Vite) | 5173 | default dev instance |
| FE UX variants | 5181–5183 | via `.claude/launch.json` (userfacing/admin/ux) |
| Postgres + TimescaleDB | 5432 | docker; db `investment_scanner`, user `scanner` |
| Redis | 6379 | docker, profile `cache` (opt-in) |
| pgAdmin | 5050 | docker, profile `tools` (opt-in) |

## Commands (Windows / PowerShell)

- Backend dev: `cd backend; $env:TS_NODE_TRANSPILE_ONLY='1'; npm run dev` — the env var is REQUIRED (god-file type debt makes type-checked ts-node unusable)
- After any backend `npm install`: `npx prisma generate`
- Frontend dev: `cd frontend; npm run dev`
- Docker: `docker compose up -d` (add `--profile cache` / `--profile tools` for redis/pgadmin)
- Backend tests: `cd backend; npm test` — single test: `npx jest path\to\file.test.ts -t "name"`
- Frontend UI tests (QA standard, auth-state reuse): `cd frontend; npx playwright test --config playwright.qa.config.ts` — single spec: append the spec path. Run one spec file per invocation (chunked-run convention).
- Typecheck: `npx tsc --noEmit` (run in both `backend/` and `frontend/`)
- Frontend lint: `cd frontend; npm run lint`

## Hard Constraints

- Markets: NSE/BSE (India) + approved free sources only — Yahoo for prices, SEC for US filings; **not Stooq**. Zero paid services of any kind.
- No broker integration, no real-money execution, no cloud deployment.
- Trader-facing pages are **persisted-read**: render from DB/snapshots; explicit refresh actions only, never live fetch on page load.
- Full constitution: [AGENTS.md](AGENTS.md) (index) → `docs/agents/` topic files.

## Landmines

- **NEVER run `prisma migrate dev` or `prisma migrate reset`** — the shared DB has drift; schema sync is `npm run db:push` only. (Enforced by deny rules + hook.)
- `backend/prisma/schema.prisma` is cross-cutting-owned — edits require explicit owner approval (a hook blocks them).
- Snapshot-baked text does NOT change when code changes — run `/refresh-snapshots` (pipeline commands) before judging whether a fix surfaced.
- Keep default FE (5173) / BE (3000) / Docker UP: start them if down, never shut them down or restart them. Kill only extra processes YOU spawned.
- The working tree carries unstaged changes from PARALLEL agents. NEVER `git reset --hard`, `git checkout -- <path>`, `git restore`, or stash files you didn't change in this session. (Deny rules enforce the destructive forms.)

## Working Agreement

- Plan first for multi-file changes; respect module boundaries (one module = controller/service/repository/types/validation/index).
- Flag out-of-scope findings as separate tasks — do not fix inline.
- **Done has two tiers.** *Always:* typecheck + tests green + shown proof (real command output / endpoint response) — this is the **developer self-check**. *For substantial changes* (multi-file · schema/data-mutation · cross-cutting/shared file · new module · downstream-affecting): **ALSO** an independent **code-review pass** (`code-reviewer` agent — separate from the implementer) **and** a **QA pass** (`qa-verifier`), with review + QA evidence in the Done Report. Self tsc/jest is the self-check, **NOT** review or QA — don't let momentum or satisfying the Stop hook substitute for the gates. (`docs/agents/delivery-workflow.md`: completion requires *review evidence* AND *QA evidence*.)
- Subagent models: haiku/sonnet for mechanical sweeps and searches; opus for design, review, synthesis.

## Token Efficiency (usage-data driven, 2026-06)

- Subagent routing: use **Explore** for searches/lookups/broad code reads; use the named role agents (`.claude/agents/`) for role work — they pin cost-appropriate models. Spawn `general-purpose` only when the task genuinely needs full tools; never as the default for a search.
- Keep main-loop context lean: delegate bulky multi-file reads to subagents and have them return conclusions, not file dumps. Read narrow line ranges of large files instead of whole files.
- Session-management MCP (`ccd_session`) and browser-preview results stay in context all session — use them sparingly, and after a heavy MCP/preview/exploration phase, remind the owner to `/compact` (or `/clear` when switching to an unrelated task).

## Code Structure

- Organize by responsibility and coupling, not size: a cohesive file beats a small file that mixes concerns.
- One responsibility per file — a file should have one reason to change. Splitting is triggered by mixed concerns (data models + business logic + I/O in one place), not by aesthetics.
- **Hard backstop (hook-enforced): source files max 500 lines.** Files already over the limit are shrink-only — new code goes in a new cohesive file in the same module (existing pattern: `fno-ban.service.ts`, `*.crypto-service.ts`). Owner-approved exceptions only.
- Placement: before adding code to an existing file, check whether it belongs there. A function lives with whatever it's most tightly coupled to.
- Propose before restructuring: if a task requires extracting or reorganizing existing code, surface an extraction plan and get confirmation before moving anything — never refactor silently as a side effect of a feature task. Restructuring explicitly included in an already-approved plan counts as confirmed.
- Flag crowding early: if a new feature doesn't fit cleanly in its natural home, say so before adding it rather than wedging it in.
- No speculative abstraction: build for current usage. Extract a shared abstraction only once there are two or three real uses — no factories, interfaces, or layers for single-caller code.
- Explicit dependencies over shared state: pass dependencies in rather than reaching into globals/singletons, so modules stay independently testable.

## Pre-Work Protocol (before first edit)

Read the matching topic file BEFORE touching that area:

| Touching… | Read first |
|---|---|
| signals / strategy modules | `docs/agents/signals-and-strategy.md` |
| market data / ingestion / data quality | `docs/agents/data-and-market-policy.md` |
| UI pages / components | `docs/agents/ux-standards.md` + `frontend/CLAUDE.md` |
| module structure / new module | `docs/agents/architecture-standards.md` |
| tests / QA | `docs/agents/testing-and-quality.md` |
| release / commit gates / handoffs | `docs/agents/delivery-workflow.md` |
| scope / priority / product language | `docs/agents/mission-and-constraints.md` |
| copilot / auth / subscription / notifications | `docs/agents/domain-rules.md` |

If the work needs a running stack, run `/stack-up` first.

## Post-Work Protocol (before declaring done)

After ANY source-code change, run `/wrap-up`: scoped QA pass → snapshot re-materialization if snapshot-producing code changed → clean up spawned processes → Done Report with proof. A Stop hook enforces this once per work session — satisfy it or state explicitly why it doesn't apply.

## Doc Index

- `docs/agents/` — the constitution topic files (see Pre-Work table; full list in [AGENTS.md](AGENTS.md))
- `docs/architecture.md` — architecture deep-dive
- `docs/roadmap.md` — product roadmap
- `docs/instructions.md` — hard-constraints quick sheet
- `docs/ux-ui-best-practices.md` — UX/UI conventions

(`.mcp.json` deliberately absent — no project-scoped MCP servers needed.)
