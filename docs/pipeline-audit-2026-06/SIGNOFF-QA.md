# Daily-Pipeline Stability Initiative — QA Sign-off

Date: 2026-06-06
Reviewer: QA (senior, sign-off review)
Scope: commits `3a9cbf8` (P-1) → `352acd6` (P-4) — reaper, smart-money upsert, DQ napi,
pool throttle, quality-lab persist, full ledger coverage, compute-on-read → snapshot pipelines.
Method: servers DOWN — validated via `npx jest`, `npx tsc -b`, DB queries against
`investment_scanner_postgres`, and throwaway `ts-node` runners (since deleted).

---

## VERDICT: CHANGES_REQUESTED

8 of 9 validation items pass with strong evidence. **One core claim of the initiative —
FIX-G "full signal-position-ledger coverage (~658, not 39)" — is reproducibly UNMET.**
The ledger refresh runs cleanly but PATH B contributes 0 new rows: the new lifecycle-entry
path is effectively dead code because every one of its 648 intended candidates is first
claimed (and then dropped) by the pre-existing PATH A. This is a [BLOCKER]. All other fixes
are solid and I recommend they ship; only the ledger-coverage fix needs rework + re-validation.

---

## Test results (exact)

- Backend `npx jest` (full suite): **Test Suites: 1 failed, 153 passed, 154 total;
  Tests: 1 failed, 2124 passed, 2125 total** (115 s).
  - The ONLY failure is the known pre-existing
    `tests/modules/pipeline-orchestration/connected-chain.seeded.integration.test.ts`
    (`expect(calibrationBySymbol.RELIANCE).toBeTruthy()` → received `undefined`, line 228).
    Confirmed pre-existing: that file was last modified by commit `70c4aa0` (task #39),
    BEFORE the P-1..P-4 work, and none of these 7 commits touch it. Not a regression. ✔
- Targeted re-run of the new tests: `pipeline-reaper` + `smart-money-intelligence.repository`
  → **2 suites / 15 tests passed**. ✔
- Frontend `npx tsc -b`: **exit 0, no errors**. ✔
- `npx prisma migrate status`: **"Database schema is up to date!" — 48 migrations, clean.** ✔

---

## Findings

### 1. [BLOCKER] FIX-G ledger coverage NOT achieved — stuck at 39, PATH B adds 0 rows

**Claim (commit 8b4dea9):** "signal_position_ledger only had 39 of ~658 qualifying rows …
Added PATH B … Next run covers ~658."

**Evidence — it does not.** Ran the exact scheduled-stage call
(`SignalPositionLedgerService.refreshActiveRows({region:'IN', assetType:'STOCK', limit:2000,
offset:0}, {force:true, wait:true})`) via ts-node, twice:

```
LEDGER_BEFORE=39
PROGRESS={total:2032, processed:2032, succeeded:5, failed:0, skipped:2027, warnings:[], errors:[]}
LEDGER_AFTER=39
```

DB confirms: `SELECT count(*) FROM signal_position_ledger_entries` = **39** before and after
(38 rows had `updatedAt` bumped, but zero net inserts). Reproduced on a second run — identical.

**Root cause (traced with instrumentation):** PATH B's candidate filter
(`signal-position-ledger.service.ts:579-586`) selects ENTRY/ACTIVE + BULLISH + auditStatus
CURRENT + eligible signals AND excludes any already in `enrichedIds` (the PATH A set):
`&& !enrichedIds.has(signal.instrument_id)`.

I measured the funnel against live data (`repository.listLatestSignals` page of 2000 distinct
instruments):
- 648 signals pass PATH B's own gate (entryActive+bullish+current+eligible = **648**;
  auditStatus all CURRENT; dataQualityEligibility.eligible all true).
- BUT **all 648 also pass `isTrustedSourceSignal` (service.ts:239)** — they have
  `filterApplied=true`, `signalReadinessStatus=READY`, BULLISH, CURRENT, no noise blocker.
  Measured: `isTrustedSourceSignal=648 / 648`, `TRUSTED_IN_FULL_PAGE=648`.
- Therefore PATH A enriches all 648 first → `enrichedIds` contains all 648 →
  PATH B's `!enrichedIds.has(...)` excludes **every** candidate → `lifecycleEntryCandidates`
  is empty.
- PATH A then rejects them at `isTrustedEnrichedSignal` (service.ts:250) because they lack
  `strategyMatches[0].decision === 'ENTRY_CANDIDATE'` (only the legacy ~39 carry that), so
  they are counted as skipped. Net: ledger stays at 39.

In short: **PATH B can never run for the very signals it was written to cover, because PATH A
claims them via `enrichedIds` and then discards them.** The downstream PATH B logic
(`buildLifecycleTriggerContracts`, trigger eligibility, price lookup) is actually correct — I
verified in isolation that all 648 would build a valid SOURCE_PROVEN contract
(`CONTRACTS=648, GOOD_PRICE=648, dataStatus COMPLETE=648`) and 640 would resolve to a
non-terminal RISK_WARNING row (8 INVALIDATED). The bug is purely the `enrichedIds` ordering/
exclusion gate upstream — PATH B is unreachable in production.

**Repro:** stand up a ts-node runner that calls `refreshActiveRows({region:'IN',
assetType:'STOCK', limit:2000, offset:0}, {force:true, wait:true})` and count
`signal_position_ledger_entries` before/after → unchanged at 39.

**Suggested fix direction:** PATH B must be reachable for trusted-source signals that PATH A
enriches but does NOT publish (i.e. those without an `ENTRY_CANDIDATE` strategy match). Change
the PATH B exclusion from "exclude all enrichedIds" to "exclude only instruments PATH A
actually published as candidates" (e.g. exclude the PATH A `candidates`/`state.rows` set, not
the raw `enriched` set), OR fall PATH-A-rejected trusted signals through to PATH B. Then
re-run and confirm coverage approaches ~648 in the DB.

---

### 2. [PASS] FIX-B reaper — 0 leaked RUNNING runs/stage_runs; logic + tests correct

- DB: `pipeline_runs` with status RUNNING = **0** (of 914 total). `pipeline_stage_runs`
  (the actual table name; there is no `stage_runs`) RUNNING = **0** (status spread:
  SKIPPED 29521, COMPLETED 3557, PENDING 800, PARTIAL 262, FAILED 189). The one-time cleanup
  ran. ✔
- Reaper logic (`pipeline-orchestration.repository.ts reapStaleLeases`) is correct: `updateMany`
  with precise guards — only RUNNING rows with `updatedAt < cutoff` AND (lease expired OR
  null-lease + stale `startedAt`); the `updatedAt < cutoff` guard prevents touching
  recently-active rows. Concurrency-safe. ✔
- `pipeline-reaper.test.ts` passes (part of the 15 green). ✔
- Note (not blocking): 800 PENDING + 262 PARTIAL stage_runs exist. These are not "leaked
  RUNNING" leases and are out of the reaper's stated scope, but PENDING build-up may be worth
  a follow-up look.

### 3. [PASS] FIX-C smart-money dedup + 3-col unique index

- `SELECT … GROUP BY instrumentId, snapshotDate, range HAVING count(*)>1` → **0 duplicate
  groups** (table has 105,368 rows total, all unique on the key). ✔
- `\d smart_money_context_snapshots` shows
  `"smart_money_context_snapshots_snapshotDate_instrumentId_ran_key" UNIQUE, btree
  ("snapshotDate", "instrumentId", range)` — the 3-col unique index exists in the DB. ✔
- `smart-money-intelligence.repository.test.ts` (upsert test) green. ✔

### 4. [PASS] FIX-D DATA_QUALITY napi BigInt fix — full-universe persistence restored

- Ran the new raw-SQL batch read (`MarketDataFoundationRepository.listPriceWindowsForSymbolChunk`)
  via ts-node over a chunk INCLUDING the BigInt-volume stocks: result
  **`NAPI_OK total_rows=969 maxVolume=3038646084`**, rows per symbol incl. `IDEA:103,
  GTLINFRA:103` — **0 napi errors** (the float8 CAST works; 3.0B volume handled). ✔
- DB confirms full-universe persistence: latest `data_quality_snapshots` snapshotDate
  2026-06-05 has **2330 distinct instruments** (vs the broken 2026-06-04 = **50**). Both
  `IDEA` and `GTLINFRA` are present in 2026-06-05. ✔

### 5. [PASS] FIX-E/F quality-lab persist-always + pool throttle

- `pipeline-orchestration.service.ts` scheduled SIGNAL_QUALITY stage now passes
  `persistOutcomes: true` (was discarding). ✔
- `data-quality-engine.service.ts`: `DEFAULT_EVALUATION_CONCURRENCY 6→4`,
  `MAX_EVALUATION_CONCURRENCY 10→4` — now under `connection_limit=10` alongside signal-gen/
  calibration. ✔
- quality-lab dashboard GET no longer live-recomputes on DB error — returns honest `pending`
  (persisted-read). ✔

### 6. [PASS] Snapshot pipelines exist, populate, and are read persisted

- New tables all exist (`to_regclass` non-null): `workbench_snapshots`,
  `market_scan_snapshots`, `research_overview_snapshots`,
  `portfolio_intelligence_snapshots`. Migrations 202606060002 / 060003 / 070001 / 070002
  present and applied. ✔
- Populated + fresh (today 2026-06-06):
  - `market_scan_snapshots` = **495 rows** across 7 scanTypes (MARKET_MAP 240, 52W_HIGH 50,
    52W_LOW 50, VOLUME_SPIKE 50, DELIVERY_SPIKE 45, MOVERS_GAINERS 30, MOVERS_LOSERS 30). ✔
  - `research_overview_snapshots` = 1 row (single-row by design), computedAt 12:12 today. ✔
  - `portfolio_intelligence_snapshots` = 1 row, computedAt 12:21 today. ✔
  - `workbench_snapshots` = 3 rows. I ran `WorkbenchRefreshService.refreshWorkbenchSnapshots`
    for RELIANCE/TCS/INFY/SBIN → `succeeded 4, failed 0`, count 3→5. Refresh path works. ✔

### 7. [PASS] Persisted-read enforcement on converted GETs (no recompute)

- `MarketContextIntelligenceService.summary()` rewritten to pure
  `repository.latestPersistedSnapshot()` — **no `run()` fallback**; `regime/sectors/breadth/
  countries` are now null-safe persisted reads. ✔
- `StockResearchWorkbenchService.getWorkbench()` reads `workbench_snapshots` only and returns
  a `WORKBENCH_NOT_YET_COMPUTED` sentinel on miss — never recomputes. Controller GET calls
  `getWorkbench`. ✔
- `marketMovers()` GET reads `marketScanSnapshot` via `readLatestScanSnapshot` only; emits an
  honest "Run MARKET_SCAN_REFRESH to populate" warning, no recompute fallback. ✔
- research-hub overview reads `researchOverviewSnapshot.findUnique` with a "not ready yet"
  empty fallback. ✔

### 8. [PASS] Migrations clean; models match tables

`prisma migrate status` clean (48 migrations, schema up to date). The four new `@@map`
models resolve to existing DB tables (verified via `to_regclass`). ✔

---

## Lower-severity observations

### 9. [NICE] Portfolio-intelligence GET does lazy one-time compute on first view

`PortfolioIntelligenceService.intelligence()` (service.ts:64-75) is a persisted-read on the
happy path, but on a cache MISS it does a one-time "lazy materialisation"
(`refreshPortfolioIntelligence` → compute + upsert) rather than returning a NOT_YET_COMPUTED
sentinel like the other screens. It's bounded (per-portfolio, once; holdings-change triggers a
refresh) and is NOT a full-universe load, so it doesn't violate the spirit of the rule — but it
is an inconsistency with the strict "screens read persisted tables only, no runtime compute"
principle and the other three converted screens. Consider aligning it to the sentinel pattern
for consistency. Non-blocking.

### 10. [NICE] PENDING stage_runs accumulation

800 PENDING + 262 PARTIAL `pipeline_stage_runs` remain. Out of the reaper's RUNNING-lease
scope and not blocking, but a growing PENDING backlog may merit a follow-up sweep policy.

---

## Regression spot-check (item 9)

The only updated/affected test behaviors were in `pipeline-orchestration.service.test.ts`
(chain wiring for MARKET_PULSE_REFRESH/STOCK_INTEREST_REFRESH) and the new reaper/upsert tests —
all legitimate behavior changes matching the documented fixes, not masked bugs. The single red
test (connected-chain seeded integration) is pre-existing and unrelated (predates these commits).

---

## Summary table

| Item | Fix | Status |
|------|-----|--------|
| 1 | Full jest + frontend tsc | PASS (2124/2125; only known red) |
| 2 | Reaper — 0 leaked RUNNING | PASS |
| 3 | Smart-money dedup + 3-col unique | PASS |
| 4 | DATA_QUALITY napi (IDEA/GTLINFRA) | PASS |
| 5 | **Ledger coverage 39 → ~658** | **BLOCKER — stuck at 39, PATH B unreachable** |
| 6 | Snapshot pipelines populate | PASS |
| 7 | Persisted-read GETs (no recompute) | PASS |
| 8 | Migrations clean | PASS |
| 9 | Regressions | none (1 pre-existing red) |

**Ship everything except FIX-G. Rework the PATH A / PATH B `enrichedIds` exclusion so PATH B is
reachable, then re-run the ledger refresh and confirm coverage approaches ~648 in the DB.**
