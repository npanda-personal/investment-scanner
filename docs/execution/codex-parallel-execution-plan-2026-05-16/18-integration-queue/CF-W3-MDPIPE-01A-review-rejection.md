# CF-W3-MDPIPE-01A Review Rejection

Date: 2026-05-25
Work item: `CF-W3-MDPIPE-01A-MDF-OFFICIAL-EOD`
Gate: Team 10 Code Review
State: `Rejected / Rework`

## Finding

The official NSE bulk EOD matcher can match bare NSE symbols into non-NSE `IN/STOCK` instruments when stale sync tasks do not carry exchange-safe gating.

Example risk:

- A BSE-local instrument such as `RELIANCE.BO` may have `sourceSymbol` or `displaySymbol` equal to `RELIANCE`.
- The official NSE bhavdata row for `RELIANCE` could match that alias.
- The official path would then persist NSE source data under the canonical BSE-local symbol.

## Required Rework

- Add optional exchange identity to `StockSyncTask`.
- Include exchange in active and stale stock sync task repository queries.
- Official NSE bulk matching must require explicit NSE / `.NS` evidence.
- BSE / `.BO` / non-NSE / ambiguous no-exchange tasks must skip official NSE matching and fall back to the existing per-symbol provider path.
- Add focused negative service coverage proving a BSE-like `RELIANCE.BO` task does not official-match the NSE `RELIANCE` row.
- Add repository coverage for exchange projection.

## Scope

Allowed files remain the Market Data Foundation service/repository/types/docs/tests reserved for `CF-W3-MDPIPE-01A`.

No Prisma/schema, route registry, shared utility/UI, package/generated, frontend, downstream module, startup/backfill, live-provider, or durable pipeline ledger work is approved by this rework.

## Routing

- Team 05 rework agent: `019e5c2e-69b9-7621-8170-f3d14594d916` completed and closed.
- Next gate after rework: Team 04 QA rerun.
- Then: Team 10 re-review, Team 03 Architect re-signoff, delegated PO acceptance, scoped staging, and local commit if accepted.
