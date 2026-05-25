# CF-W3-MDPIPE-01B2 - Read-Only Pipeline Status API Requirement

Date: 2026-05-25

Owner: Team 00 / Team 03 / Team 05

Status: Implemented and developer-validated.

## Product Problem

Bulk operations and automated backend pipelines need a single DB-backed status read path so screens can show current progress even after navigation or page reloads.

## Acceptance Criteria

- Add one read-only status endpoint: `GET /api/v1/pipeline/status`.
- Default scope: `IN/STOCK/1d`, `pipelineKey=market-intelligence`, `limit=25`.
- Return active and latest terminal pipeline run evidence.
- Return active and latest terminal stage evidence grouped by stage key.
- Include status, timestamps, progress counts, offsets, `hasMore`, warnings/errors, cache metadata, lease metadata, and fingerprints.
- Query only local pipeline ledger tables.
- Do not mutate ledger state.
- Do not call providers, scheduler, Data Quality, signal, strategy, backtest, Research, Today Review, or other downstream services.

## Non-Goals

- No frontend UI.
- No scheduler fanout.
- No manual trigger endpoint.
- No downstream execution.
- No schema or migration changes beyond the already committed `01B1` ledger.

## Validation

- `npm.cmd test -- pipeline-orchestration --runInBand`
- `npm.cmd run build`

## Next UI Direction

`CF-W3-MDPIPE-01B3` should create an Ops-style Bulk Pipeline Dashboard for monitoring and manual trigger controls. Individual feature screens should only show compact backend pipeline progress indicators.
