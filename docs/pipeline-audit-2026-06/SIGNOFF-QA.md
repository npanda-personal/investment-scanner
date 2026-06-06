# Daily-Pipeline Stability Initiative — QA Sign-off (ROUND 2)

Date: 2026-06-06
Reviewer: QA (senior, sign-off review)
Scope (round 2): commit `41423fb` "fix(pipeline P-5): address Architecture+QA+PO sign-off blockers"
— re-verification of my round-1 BLOCKER (FIX-G ledger coverage) plus full regression re-gate.
Method: servers DOWN — validated via `npx jest`, `npx tsc -b`, `prisma migrate status`, and
live DB queries against `investment_scanner_postgres`.

Round-1 verdict was CHANGES_REQUESTED with a single blocker (ledger stuck at 39 / PATH B
unreachable). This round verifies that blocker is resolved and confirms no regression.

---

## VERDICT: APPROVE

The round-1 blocker is resolved with strong live evidence (ledger 39 → 659). The full
regression gate is clean: the only red is the known pre-existing connected-chain integration
test, which is NOT a blocker. All P-5 changes (reaper PENDING-reap, market-scan transaction,
smart-money concurrency cap, portfolio staleness guard, MARKET_SCAN_REFRESH chain wiring) have
green module suites. Frontend tsc clean. Prisma migrations clean. No remaining [BLOCKER].

---

## Round-1 BLOCKER — RESOLVED

**FIX-G: signal-position-ledger PATH B unreachable (was stuck at 39).**

- Live DB evidence: `SELECT count(*) FROM signal_position_ledger_entries` → **659**
  (was 39 in round 1; claim was ~660). Confirmed twice, stable.
- Guard fix verified correct in
  `backend/src/modules/signal-position-ledger/signal-position-ledger.service.ts`:
  - PATH A candidate collection was moved ABOVE the PATH B filter, so PATH-A-published
    instruments are known before PATH B eligibility is decided (lines 564–583).
  - The old over-broad guard `!enrichedIds.has(...)` (which excluded the FULL enriched set —
    the bug, since PATH A enriches all trusted signals but only PUBLISHES the ENTRY_CANDIDATE
    subset) is replaced by `!pathAPublishedIds.has(...)` where `pathAPublishedIds` is built
    from `candidates` (instruments PATH A actually pushed) — line 598, used at line 609.
  - ENTRY/ACTIVE-lifecycle BULLISH signals that PATH A enriched-but-discarded (no
    ENTRY_CANDIDATE match) are now eligible for PATH B, covering the full lifecycle universe.
- **No double-persist**: PATH A and PATH B both append to the SAME `candidates` array;
  a single downstream `loadRowSnapshots` + persist loop (lines 628+) processes the union.
  Overlap is prevented by `pathAPublishedIds` (excludes PATH A's published set) AND
  `ledgerInstruments` (excludes rows already in `state.rows`/`state.closedRows`). PATH B
  cannot re-add an instrument PATH A already claimed.
- **New test passes**: `signal-position-ledger.service.test.ts` — green (see below).

---

## Test results (exact)

- Backend `npx jest` (full suite): **Test Suites: 1 failed, 153 passed, 154 total;
  Tests: 1 failed, 2129 passed, 2130 total** (64 s).
  - The ONLY failure is the known pre-existing
    `tests/modules/pipeline-orchestration/connected-chain.seeded.integration.test.ts`
    (TREND_MOMENTUM TRADE_CANDIDATE assertion, line 247 → received false; plus an afterAll
    hook timeout in the same suite). This is a seeded-corpus integration test sensitive to the
    v3 scoring corpus and is explicitly NOT a blocker per the sign-off charter. No other red.
- P-5 affected module suites (targeted run): `signal-position-ledger`, `pipeline-reaper`,
  `smart-money-intelligence`, `portfolio-intelligence`, `portfolio-management`,
  `market-data-foundation` → **34 suites, 746 tests, all pass.**
- New/updated ledger + orchestration tests by name:
  `signal-position-ledger.service.test` + `pipeline-orchestration.service.test` →
  **2 suites, 72 tests, all pass.**
- Frontend `npx tsc -b`: **clean (exit 0).**
- `npx prisma migrate status`: **clean** — "48 migrations found … Database schema is up to date!"

---

## P-5 spot-checks (all green)

- **Reaper PENDING-reap (new)**: `pipeline-reaper.test.ts` green within the targeted run.
  Reaper now reaps stale PENDING runs/stage_runs (not just RUNNING) at the corrected 20-min
  threshold.
- **Market-scan $transaction (delete+insert atomic)**: `market-data-foundation` suite green;
  no torn/empty-read window.
- **Smart-money concurrency=4**: `smart-money-intelligence` suite green; per-instrument fan-out
  bounded (was unbounded ~100).
- **Portfolio staleness guard**: `portfolio-intelligence` + `portfolio-management` suites green;
  refresh-on-mutation hook + `updatedAt > computedAt` recompute path covered.
- **MARKET_SCAN_REFRESH wired into chain (stage 18, terminal)**: `pipeline-orchestration.service.test`
  green.

---

## Snapshot populate progress (operational, not a code gate)

- `market_scan_snapshots`: **495** (~target).
- `research_overview_snapshots`: **1** (single-row persisted read, >= 1 as expected).
- `workbench_snapshots`: **205** (well past the round-1 floor of 3; the background
  full-universe populate has progressed far). Read twice, steady at 205 — the populate may
  have completed or be between batches. Completion of this populate is operational and NOT a
  code blocker per the charter.

---

## Remaining items

- None at [BLOCKER] severity.
- Pre-existing red: `connected-chain.seeded.integration.test.ts` — carried over, tracked,
  explicitly not a sign-off blocker.
- Operational: in-progress workbench full-universe populate finishing — not a code blocker.

---

## Sign-off

Round-1 blocker resolved with live DB + code + test evidence. Regression gate clean apart from
the known pre-existing integration red. **VERDICT: APPROVE.**
