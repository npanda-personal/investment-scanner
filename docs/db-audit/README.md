# Database / ER Audit — investment-scanner

Read-only architectural audit of the Prisma/Postgres schema (`backend/prisma/schema.prisma`,
71 tables). Nothing in the schema or app code was changed.

## Contents

| File | What it is |
|---|---|
| [`er-current.svg`](er-current.svg) | **Complete** current ERD — all 71 tables, every enforced FK (solid) and every string/soft join with no DB foreign key (dotted, labelled `(soft)`). |
| [`er-proposed.svg`](er-proposed.svg) | Target ERD — schema-per-domain, unified `Instrument` hub, `Market` as the region-isolation axis, enums/FKs enforced, dropped/merged tables removed. |
| [`er-current.mmd`](er-current.mmd) / [`er-proposed.mmd`](er-proposed.mmd) | Editable Mermaid source for both diagrams (re-render instructions below). |
| [`region-isolation.md`](region-isolation.md) | **Deep dive** on "select India → every query sees only India" — RLS + session var, partitioning, schema/DB-per-region, Prisma wiring, migration path. |

> The SVGs are large (every table + relationship). Open in a browser and zoom; they are
> vector, so they stay sharp at any zoom level.

---

## How the two diagrams differ (the headline)

**Current:** `Stock` is an overloaded god-hub wired to ~20 tables; `CryptoAsset` is a parallel
partial clone; `region`/`assetType` are unconstrained free-text strings; a surprising number
of edges are **dotted** — string joins with no enforced foreign key (`price_ticks`,
`latest_prices`, `signal_calibration_results`, `trade_plan_results`, `data_quality_snapshots`,
`user_subscriptions.planCode`, the crypto price tables, …). Integrity lives in app code by
convention.

**Proposed:** one `Instrument` hub (stock + crypto), a `reference` schema
(`markets`/`asset_classes`/`exchanges`/`sectors`) with enums + FKs, **`Market` as a first-class
hub that every region-scoped table FKs into**, all soft joins promoted to real FKs, `Float`
money → `Decimal`, volume tables partitioned, and the dead/duplicate crypto tables dropped.

---

## Modularity model (your "keep it as modular as possible")

Two orthogonal axes, both enforced by the database, not by convention:

1. **Domain modularity → Postgres schema-per-domain.** `reference`, `market_data`,
   `intelligence`, `trading`, `identity`, `ops`, `crypto`. Each maps 1:1 to a NestJS module.
   Migrations, grants, and backups can be reasoned about per domain instead of one 71-table
   `public` blob with one fragile migration lineage.
2. **Region modularity → `region_code` everywhere + RLS + partitioning.** See below.

---

## Region isolation (your "select India → only India data, by default")

Short version (full reasoning in [`region-isolation.md`](region-isolation.md)):

- Classify tables first — **not everything is region-scoped.** Region-scoped (market data,
  intelligence, signals, scans) isolate by `region_code`; user-owned (portfolios, watchlists,
  alerts) isolate by `userId` and may legitimately span regions; reference + crypto are global.
- **Default isolation is enforced by Postgres Row-Level Security keyed to a session variable.**
  The app runs `SET LOCAL app.current_region = 'IN'` once per request; from there *every*
  region-scoped read/write is transparently filtered to India — a forgotten `WHERE region=`
  can no longer leak other regions' rows.
- **`LIST` partitioning by region** on the hot tables (`price_bars`, `daily_instrument_snapshot`,
  `signal_results`) keeps each region's working set + indexes physically small ("smaller data
  context per region") and makes "drop a region" instant.
- A Prisma client extension auto-injects the region filter as an ergonomic first layer; RLS is
  the guarantee underneath it. Ingestion/cross-region jobs use a separate `BYPASSRLS` role.
- Escalate to **schema-per-region or database-per-region** only for data-residency law or
  independent per-region scaling.

---

## Re-rendering the SVGs

Mermaid CLI was installed locally under `backend/node_modules` (dev-only; `package.json` was
restored to HEAD so nothing is tracked). To regenerate after editing the `.mmd` files:

```bash
cd backend
node node_modules/@mermaid-js/mermaid-cli/src/cli.js \
  -i ../docs/db-audit/er-current.mmd  -o ../docs/db-audit/er-current.svg  -b white
node node_modules/@mermaid-js/mermaid-cli/src/cli.js \
  -i ../docs/db-audit/er-proposed.mmd -o ../docs/db-audit/er-proposed.svg -b white
```

(Or paste the `.mmd` contents into https://mermaid.live to render without local tooling.)

---

## Issue summary (full detail was delivered in the audit response)

P0 — three competing schema files (`prisma/schema/` folder + `schema.combined.prisma` diverge
from canonical `schema.prisma`, and `prismaSchemaFolder` is enabled → generation footgun);
`price_ticks`/`latest_prices` keys omit region; `Float` for money; region/assetType
unconstrained free text.
P1 — `stockId` vs `instrumentId` naming split; unenforced soft FKs; pervasive denormalization;
cuid PK + no partitioning/retention on the highest-volume tables; one physical schema for all
domains; crypto copy-paste with ~5 reserved-but-unwired clones; no enums/CHECKs.
P2 — index sprawl, `String[]` vs `Json` array inconsistency, duplicated eligibility truth,
reinvented temporal columns.
