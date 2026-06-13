---
name: refresh-snapshots
description: Re-materialize persisted snapshots via the pipeline command API so code fixes actually surface in trader-facing pages. Use after changing any snapshot-producing code (snapshot-assembler, earnings/market/sector/stock-interest intelligence, market scans), or when verifying a fix that "doesn't show up".
---

# Refresh Snapshots

Trader-facing pages are persisted-read: they render **snapshot-baked text/values**. Changing the code that generates them does NOT change what users see until the snapshot is re-materialized. This skill triggers that re-materialization.

## API

All refreshes go through the pipeline orchestration module (backend must be up — run `/stack-up` first if needed):

- Catalog of available commands: `GET http://localhost:3000/api/v1/pipeline/commands/catalog`
- Execute: `POST http://localhost:3000/api/v1/pipeline/commands` with JSON body `{ "command": "<NAME>", ...params }`
- Status: `GET http://localhost:3000/api/v1/pipeline/status`

Known commands (check the catalog if unsure — it is the source of truth):

| Command | Refreshes | Params |
|---|---|---|
| `MARKET_PULSE_REFRESH` | market pulse snapshot | `region?`, `assetType?`, `timeframe?` |
| `SECTOR_INTELLIGENCE_REFRESH` | sector intelligence | `region?`, `assetType?` |
| `EARNINGS_INTELLIGENCE_REFRESH` | earnings intelligence | `symbol?` or `region`/`assetType` |
| `STOCK_INTEREST_REFRESH` | stock interest snapshots | `symbol?` or `region`/`assetType` |
| `MARKET_SCAN_REFRESH` | market scan snapshots | `symbol?` or `region`/`assetType` |

## Procedure

1. Pick the command(s) matching the code you changed. Scope as narrowly as possible (single `symbol` when verifying a fix) — full-universe refreshes are heavy; this is a laptop.
2. POST the command; poll `GET /api/v1/pipeline/status` until it completes.
3. **Prove it worked**: re-fetch the affected read endpoint (or snapshot row) and confirm the generated/updated timestamp advanced AND the changed text/value actually reflects the code fix.

## Output

Per command: command + params → pipeline result → before/after evidence (timestamp and the changed field).
