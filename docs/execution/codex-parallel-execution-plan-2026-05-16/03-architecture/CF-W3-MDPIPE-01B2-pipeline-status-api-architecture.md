# CF-W3-MDPIPE-01B2 - Pipeline Status API Architecture

Date: 2026-05-25

Architect: Team 03

Status: Accepted and implemented.

## Decision

Add a bounded backend-only read API on the existing `pipeline-orchestration` module:

`GET /api/v1/pipeline/status`

Route registry change is accepted for this slice as an additive import/registration only.

## File Reservation

Allowed:

- `backend/src/api/routes.ts`
- `backend/src/modules/pipeline-orchestration/**`
- `backend/tests/modules/pipeline-orchestration/**`
- active execution docs

Forbidden:

- Prisma schema/migrations
- `backend/src/server.ts`
- Market Data scheduler
- downstream module source/tests
- frontend files
- package manifests
- providers/live calls
- startup/backfill changes

## Contract

The response contains:

- requested scope,
- generation timestamp,
- active run,
- latest terminal run,
- per-stage active progress and latest terminal result.

The endpoint is explicitly read-only and must not acquire leases, trigger stages, call providers, or recompute downstream data.
