---
name: stack-up
description: Check that the default dev stack (Docker Postgres, backend 3000, frontend 5173) is running and start whatever is down. Use at task start when work needs a running stack, or whenever stack state is uncertain. Never restarts or stops already-running services.
---

# Stack Up

Bring the default dev stack to a known-good state. **Never stop or restart anything that is already running** — only start what is down.

## Checks (run all three, in this order)

1. **Docker / Postgres**: `docker compose ps` — the `postgres` service (TimescaleDB, host port 5432) must be `running`. Redis (`cache` profile) and pgAdmin (`tools` profile) are opt-in; report their state but do NOT start them unless the task needs them.
2. **Backend (3000)**: `Invoke-RestMethod http://localhost:3000/health` — expect `{ status: 'ok', timestamp: ... }`.
3. **Frontend (5173)**: `Invoke-WebRequest http://localhost:5173 -UseBasicParsing` — expect HTTP 200.

## Starting what's down

- Docker: `docker compose up -d` (from repo root). Wait for postgres healthcheck, re-verify with `docker compose ps`.
- Backend: from `backend/`, run in background: `$env:TS_NODE_TRANSPILE_ONLY='1'; npm run dev` — the env var is REQUIRED. If deps look freshly installed, run `npx prisma generate` first. Re-poll `/health` until it responds (give it ~20s).
- Frontend: from `frontend/`, run in background: `npm run dev`. Re-poll 5173.

Backend must start after Postgres is up. Any process you start here counts as a *default* service — leave it running at the end of the session (standing owner instruction). Extra instances you spawn on other ports (5181–5183 etc.) are yours to clean up later.

## Output

A status table: service | port | state before | action taken | state after. If something failed to start, show the actual error output (check recent terminal output / `docker compose logs --tail 20 postgres`), don't guess.
