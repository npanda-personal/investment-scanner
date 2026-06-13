# Region Isolation Architecture — "select India → everything is India"

> Goal (your requirement, verbatim intent): when a user selects a region (e.g. India),
> **every query must, by default, see only that region's data** — without each query
> author remembering to add `WHERE region = 'IN'`. Isolation must be the default, not an
> opt-in. This document is the design for that.

The current schema cannot do this. `region` is a **nullable free-text `String`** on shared
tables with no enum, no FK, no constraint, and no enforcement layer. Isolation today =
"every service remembers to filter, and spells `IN` the same way." That is not isolation;
it is a convention waiting to leak. One forgotten predicate and an India user sees US rows.

There are four real isolation strategies. They are not mutually exclusive — the
recommendation is a **layered combination**.

---

## The isolation axis is not uniform — classify tables first

A critical design point most people miss: **not every table is region-scoped.** Forcing a
region filter onto user-owned data is wrong, because a single user can hold an India stock
*and* a US stock in one portfolio.

| Class | Isolation key | Tables | Region filter? |
|---|---|---|---|
| **Region-scoped** | `regionCode` | market_data.* , intelligence.* , signals, scans, snapshots, pipeline runs | **YES — default-filtered by selected region** |
| **User-scoped (tenant=user)** | `userId` | portfolios, holdings, transactions, watchlists, alerts, journal, subscriptions, usage | NO — filtered by user; may span regions |
| **Global reference** | none | markets, asset_classes, sectors, exchanges, fx_rates, strategy_definitions, subscription_plans | NO — shared by all |
| **Global-region asset** | `regionCode='GLOBAL'` | crypto_* (crypto is borderless) | Treated as its own region |

So "select India" means: **region-scoped tables filter to `IN`; user-scoped tables still
show the user's full cross-region holdings; reference + crypto stay visible.** The UI's
"India view" of *research/scan/signals* is region-isolated; the user's *portfolio* is not
amputated. Design the isolation around the region-scoped class only.

---

## Strategy 1 — Row-Level Security (RLS) + session variable  ★ RECOMMENDED for "default isolation"

This is the only approach that makes isolation **the database default**, not an app
convention. It directly answers your requirement.

**Mechanics**
1. Add `region_code` (NOT NULL, FK → `markets`) to every region-scoped table.
2. Enable RLS and attach a policy keyed on a session variable:
   ```sql
   ALTER TABLE intelligence.signal_results ENABLE ROW LEVEL SECURITY;
   ALTER TABLE intelligence.signal_results FORCE ROW LEVEL SECURITY;

   CREATE POLICY region_isolation ON intelligence.signal_results
     USING (region_code = current_setting('app.current_region', true));
   ```
3. The app sets the region once per request/transaction:
   ```sql
   SET LOCAL app.current_region = 'IN';   -- inside the request transaction
   ```
4. From that point, **every** `SELECT/UPDATE/DELETE` on every RLS table is transparently
   filtered to `IN`. A query with no region predicate returns only India rows. A bug that
   forgets the filter is now *safe by construction* — it physically cannot see other regions.

**Prisma integration** (Prisma has no native RLS support, so wrap it):
- Use a **Prisma Client Extension** (`$extends`) or middleware that, at the start of each
  request transaction, issues `SET LOCAL app.current_region = $region` derived from the
  authenticated request context (the region the user selected).
- Run app traffic under a DB role **without** `BYPASSRLS`. Run ingestion/cross-region
  batch jobs under a separate role **with** `BYPASSRLS` (they legitimately write all regions).

**Connection-pooling caveat (must get right):**
- `SET LOCAL` is transaction-scoped — safe with PgBouncer in **transaction** pooling mode
  *if* you always wrap queries in a transaction. A plain `SET` (session-scoped) leaks across
  pooled clients and is dangerous. Use `SET LOCAL` inside an explicit transaction, every time.
- Prisma's `$transaction` + the extension is the clean place to enforce this.

**Pros:** default-deny isolation; defense-in-depth; one place to enforce; cross-region admin
still possible via BYPASSRLS role. **Cons:** RLS policies live in raw-SQL migrations (not in
`schema.prisma`); pooling discipline required; a slight planner cost (mitigated by Strategy 3).

---

## Strategy 2 — ORM-level region scoping (cheap first layer, NOT sufficient alone)

A Prisma Client Extension that **auto-injects `where: { regionCode: ctx.region }`** into every
`findMany/findFirst/count/update/delete` on models that have the column.

```ts
const regionScoped = prisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, args, query }) {
        if (REGION_SCOPED_MODELS.has(model) && ctx.region) {
          args.where = { ...args.where, regionCode: ctx.region };
        }
        return query(args);
      },
    },
  },
});
```

**Pros:** pure TypeScript, no DB migration, immediate. **Cons:** it is a *convenience*, not a
*guarantee* — raw SQL, `$queryRaw`, a missed model in the set, or a future direct connection
bypasses it. Use it as the ergonomic default **on top of** RLS, never instead of it.

---

## Strategy 3 — LIST partitioning by region (performance isolation)

Physically split the hot tables so a region's queries never touch other regions' pages.

```sql
CREATE TABLE market_data.price_bars (...) PARTITION BY LIST (region_code);
CREATE TABLE market_data.price_bars_in PARTITION OF market_data.price_bars FOR VALUES IN ('IN');
CREATE TABLE market_data.price_bars_us PARTITION OF market_data.price_bars FOR VALUES IN ('US');
-- sub-partition the big ones by RANGE(trading_date) for retention
```

Apply to the volume tables: `price_bars`, `daily_instrument_snapshot`, `signal_results`,
`signal_outcomes`, `market_scan_snapshots`.

**Pros:** partition pruning keeps each region's working set + indexes small (the literal
"keep the data context smaller per region" you asked for); dropping a region = `DROP TABLE
partition` (instant) instead of a giant `DELETE`; pairs perfectly with RLS (RLS provides the
predicate, partitioning makes it cheap). **Cons:** the partition key must be in the PK/unique
constraints; partition DDL is hand-authored raw SQL (never `prisma migrate dev` here).

---

## Strategy 4 — Schema-per-region or Database-per-region (hard isolation)

- **Schema-per-region:** `in.signal_results`, `us.signal_results`; app sets
  `search_path = in, shared`. Strong separation, easy per-region backup/drop. Cons: table ×
  region explosion, per-schema migrations, cross-region analytics harder, Prisma multi-schema
  is limited and doesn't do per-request `search_path` cleanly.
- **Database-per-region:** strongest isolation, independent scaling/backups, and — important
  for you — **data-residency compliance** (India's data-localization expectations for market
  data; keeping IN data in an India region/instance). Cons: cross-region features need
  app-level federation; connection routing; highest ops cost.

**When to escalate to Strategy 4:** only if (a) a regulator requires physical residency, or
(b) one region's volume needs independent scaling. Otherwise RLS + partitioning gives 90% of
the benefit at 10% of the ops cost.

---

## Recommended layered design

```
┌─────────────────────────────────────────────────────────────────────┐
│ App request: user selects region "IN"                                 │
│   → auth/context carries region                                        │
│   → request opens a tx and runs  SET LOCAL app.current_region = 'IN'   │
├─────────────────────────────────────────────────────────────────────┤
│ Layer 1  Prisma extension auto-injects where:{regionCode} (ergonomics) │
│ Layer 2  Postgres RLS policy enforces region_code = current GUC (GUARD)│  ← default isolation
│ Layer 3  LIST partition by region prunes to the IN partition (PERF)    │
│ Layer 4  region_code is NOT NULL + FK→markets (INTEGRITY)              │
└─────────────────────────────────────────────────────────────────────┘
Ingestion / cross-region jobs run under a BYPASSRLS role.
crypto_* lives in region 'GLOBAL'. User-owned tables scope by userId, not region.
```

**Net effect:** selecting India sets one session variable; from there the database itself
guarantees every region-scoped read and write only sees India — no per-query discipline,
no leak surface, and India's working set/indexes stay physically small.

---

## Migration path (high-level; all raw SQL on the drifted shared DB — never `prisma migrate dev`)

1. Create `markets` reference table; backfill from distinct `region` values; add CHECK to
   reject anything not in `markets`.
2. Add `region_code` NOT NULL + FK to each region-scoped table (backfill from existing
   `region`/`scopeRegion`, or via join to `stocks` for `signal_results` which lacks the column).
3. Introduce the Prisma extension (Layer 1) — immediate, low-risk ergonomic win.
4. Enable RLS + policies table-by-table behind a feature flag; verify with a non-BYPASSRLS
   test role that cross-region rows are invisible.
5. Convert the volume tables to LIST-partitioned by region (hand-authored: create partitioned
   parent, attach/migrate data, swap). Sub-partition `price_bars`/`daily_instrument_snapshot`
   by date for retention.
6. Split `BYPASSRLS` ingestion role from app role; route batch jobs to it.

Sequence 1–3 are safe and incremental. 4–6 are the heavier lifts and each deserves its own
controlled migration + rollback plan.
