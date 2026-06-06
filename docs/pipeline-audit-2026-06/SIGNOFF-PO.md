# Product-Owner Sign-Off — Daily-Pipeline Stability Initiative (ROUND 2)

**Date:** 2026-06-06
**Reviewer:** Product Owner (NSE/BSE domain)
**Scope:** Round-2 re-review of the two round-1 blockers + the data-repopulation progress, against the 10 owner requirements. Servers DOWN — validated against code/design + live Postgres (`investment_scanner_postgres`), not a browser.
**Universe baseline:** ~2,937 active CASH STOCK instruments.
**Round-1 verdict:** CHANGES_REQUESTED (2 blockers: tests uncommitted, data not repopulated).

---

## VERDICT: CHANGES_REQUESTED

Round-1 blocker #2 (data repopulation) is **substantially resolved** — the no-network, fixable-now populate is done: the position ledger went 39 → 659, data-quality latest-date coverage was restored 50 → 2,330, market-scan = 495, workbench 3 → 205, smart-money corpus is still 0-duplicate (105,360 = 105,360 distinct keys), and there are 0 stale RUNNING rows. I would not block on the data state.

I am withholding APPROVE for **one** reason — and it is the *exact same defect I blocked on in round 1*:

**Blocker #1 (uncommitted tests) is NOT resolved.** `git status --porcelain` still shows two tracked test files modified and uncommitted:
- `backend/tests/modules/portfolio-intelligence/portfolio-intelligence.service.test.ts` (+92 lines: a whole `staleness guard` describe-block)
- `backend/tests/modules/portfolio-intelligence/portfolio-intelligence-market-posture.test.ts`

These are not stale leftovers. They are **new tests covering production code that *was* committed** — the `findComputedAt` staleness-guard added to `portfolio-intelligence.repository.ts` / `.service.ts` (confirmed present in `HEAD`). So a clean checkout today ships the production staleness-guard **without** its tests. The round-1 claim that the tests were committed (commit 917c413, "commit test updates accompanying P-1..P-3") is **true for the 9 files in that commit but false for these two** — commit 917c413 does not touch either of these two files, and no later commit does either. The green-suite claim is therefore still not reproducible from a clean checkout for the portfolio-intelligence staleness behavior.

This is a code/repo-hygiene defect (the literal round-1 blocker recurring), not operational follow-up. It is a one-command fix. Commit the two files, run the suite green from clean, and this flips to APPROVE — everything else is done or is legitimate post-start operational catch-up.

---

## Round-1 Blockers — Re-verification

| # | Round-1 blocker | Claim | Round-2 finding | Status |
|---|---|---|---|---|
| 1 | Uncommitted test files | "committed" | `git status` shows **2 tracked test files still modified/uncommitted** (portfolio-intelligence service + market-posture). They add a new `staleness guard` suite for the committed `findComputedAt` prod code. No commit (917c413 or later) contains them. | **NOT RESOLVED** |
| 2 | Data not repopulated | progress claimed | Verified counts below — the fixable-now populate is done. Remaining gaps (signal_results, delivery) are network/live-run only. | **RESOLVED (no-network portion)** |

### Verified DB counts (this session)

| Table / metric | Round-1 | Round-2 (now) | Target | Verdict |
|---|---|---|---|---|
| signal_position_ledger_entries | 39 | **659** | ~660 | MET |
| data_quality_snapshots — latest date (2026-06-05) | 50 (napi-capped) | **2,330** | ~2,330 | MET (napi fix proven on DB) |
| market_scan_snapshots | 495 | **495** | populated | MET |
| research_overview_snapshots | 1 | **1** | ≥1 (single-row design) | MET |
| workbench_snapshots (distinct instruments) | 3 | **205** | full-universe (manual) | PARTIAL — climbed off seed; not full-universe, populate appears stopped (last write 13:12, flat at 205 over ~1min polling) |
| portfolio_intelligence_snapshots | 1 | **1** | lazy-materialize | as designed |
| smart_money dedup | 0 dup | **0 dup (105,360 = 105,360 distinct keys)** | 0 | MET (intact) |
| stale RUNNING (pipeline_runs / stage_runs) | 0 / 0 | **0 / 0** | 0 | MET (reaper intact) |
| signal_results — latest date (2026-06-06) | 2,044 / 2,937 (70%) | **2,044** | universe | OPERATIONAL (needs live daily run) |
| market_delivery — latest tradingDate | 2026-06-01 | **2026-06-01** (still 4-day gap) | catch up | OPERATIONAL (NSE network sync, server-up only) |

Note: data_quality 2026-06-04 still shows 50 (the historical capped day) — harmless; the *latest* date is fully restored at 2,330, which is what proves the napi fix.

---

## Per-Requirement Acceptance Table (refreshed)

| # | Requirement | Verdict | Basis (round-2) |
|---|---|---|---|
| 1 | Audit complete pipeline ops | **MET** | AUDIT-1..4 unchanged; accurate vs. DB. |
| 2 | Pipeline loads ALL data properly | **MET (code) / operational catch-up** | DQ latest-date restored 50→2,330 on DB proves the persist/napi fix works at scale. Full signal_results + delivery catch-up needs one live run — expected operational, not a defect. |
| 3 | Check/fix pipelines that fail with error | **MET** | DQ napi crash fixed (float8 cast, ≤50 chunk), pool throttle to 4, stale-RUNNING reaper (0 rows). Verified on DB. |
| 4 | Incremental load PERSISTS every load | **MET (code)** | persist-always + idempotency keys; ledger 39→659 demonstrates PATH-B persistence now fires. |
| 5 | EVERY pipeline persists data | **MET (code)** | Ledger-coverage stages wired; snapshot tables now non-trivially populated (scan 495, workbench 205, ledger 659). |
| 6 | Screens load persisted data only | **PARTIAL** | GET-triggers-run violations removed; snapshot reads in place. Residual: portfolio-intelligence lazy-materialize (computes-then-persists on first GET after a holdings change) — and notably its *test coverage is the uncommitted file*. |
| 7 | Slow screens fixed | **MET (code)** | All 10 offenders have a snapshot path. |
| 8 | Daily = INCREMENTAL | **MET** | changedInstrumentIds delta downstream; market-wide aggregates one snapshot from persisted prices. |
| 9 | Full-universe = manual admin only | **MET** | Backfill/PIPELINE_RUN_ALL manual-only; not on scheduled paths. |
| 10 | Market-data sole external-comms; others read persisted + own incremental-persist | **MET** | Intelligence modules read persisted + persist own outputs; FII/DII/bulk-block/F&O-ban are market-data-boundary ingestion adapters. |

**Tally:** 8 MET (Req 2 now MET-on-evidence for the no-network portion) · 2 PARTIAL (6, and 2's live catch-up) · 0 NOT-MET. **One open repo-hygiene blocker (uncommitted tests) gates the verdict.**

---

## Findings (round-2)

1. **[BLOCKER] Commit the two remaining test files.** `portfolio-intelligence.service.test.ts` (+92 lines, `staleness guard` suite) and `portfolio-intelligence-market-posture.test.ts`. They test the committed `findComputedAt` staleness guard; without them a clean checkout has the prod behavior untested. This is round-1 blocker #2 still open. Commit, then run the backend suite once green from a clean tree and confirm the count. One command — flips this to APPROVE.

2. **[SHOULD] Workbench full-universe populate appears to have stopped at 205.** Up from 3 (good — proves the path works at scale), but flat at 205 distinct instruments with the last write at 13:12 (now 13:20) and no movement over a minute of polling, while a ~576 MB node process lingers. Confirm whether the manual full-universe populate finished early/errored or needs a re-kick; workbench should reach universe scale via the manual WORKBENCH_REFRESH. Not a code defect — the snapshot read/write path is proven.

3. **[SHOULD] portfolio-intelligence remains lazy-materialize** (Req 6 soft exception). Reads persisted data only (bounded latency), acceptable for v1; prefer refresh-on-mutation or in the daily chain. Flagged, not blocking.

4. **[NICE] residual PARTIAL stages** (RAW_SIGNALS, EARNINGS no-event, MARKET_PULSE while delivery stale, SECTOR_INTELLIGENCE) — prefer SKIPPED semantics for the legitimately-empty ones so PARTIAL means a real problem. MARKET_PULSE clears once delivery/index freshness catches up (operational).

5. **[NICE]** `.env MARKET_DATA_SCHEDULER_INTERVAL_MINUTES=15` is dead config (clamped to 1440); unauthenticated historical-backfill REST endpoints (manual-only) — both pre-existing, out of scope.

---

## Operational follow-up for the owner (do after the APPROVE blocker is closed — NOT gating)

These are the legitimately server-up / network-dependent steps; they are expected operational catch-up, not code work:

1. **Start the backend/scheduler server** and let the scheduled daily chain run once for a trading day. Confirm latest-date coverage ≈ universe for `signal_results` (currently 2,044 → ~2,937), and that DQ/smart-money/earnings hold at ~2,330.
2. **Run the NSE daily sync** (market-data module) to close the `market_delivery` 4-day gap (06-02..06-05) and refresh NSE_INDEX prices stale at 06-01 → clears MARKET_PULSE PARTIAL.
3. **Re-kick / finish the manual full-universe WORKBENCH_REFRESH** so `workbench_snapshots` reaches universe scale from its current 205 (Finding 2).
4. **Manual historical backfill** (admin path) for the missing trading days in `signal_results` over the last ~14d.
5. After the live run, a quick browser pass on Signals / Workbench / Research-Hub / Portfolio to confirm full-coverage rendering.

---

## Trader-trust assessment

The structural fixes are proven on the live DB now, not just asserted: dedup holds at zero duplicates, the reaper keeps RUNNING at zero, the napi fix restored latest-date DQ from 50 → 2,330, and the ledger filled 39 → 659. The day-over-day consistency story (incremental delta + persist-every-run + idempotency + dedup + reaper) is sound. The only thing standing between this and a clean APPROVE is committing two test files so the green suite is reproducible — and then the owner's operational catch-up to fill the price-derived coverage that genuinely needs a live, networked server.

**Bottom line:** Build is right and the no-network populate is done. **Commit the two test files** (round-1 blocker, still open) → APPROVE. Everything else is operational follow-up.
