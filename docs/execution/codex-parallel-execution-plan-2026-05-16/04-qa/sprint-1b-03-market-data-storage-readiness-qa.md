# Sprint 1B-03 Market Data Storage Readiness QA

Date: 2026-05-17

Status: QA evidence for Sprint 1B Autonomous Wave 2.

## 1. QA Scope

QA reviewed only:
- `backend/tests/modules/market-data-foundation/market-data-storage-readiness.invariants.test.ts`
- Active Wave 2 execution evidence.

Approved scope:
- Backend-only test file.
- Mocked/local data only.
- No source-code changes.
- No existing-test changes.
- No live providers.
- No Angel One.
- No startup/backfill.
- No UI.
- No shared/high-risk files.

## 2. Files Inspected

- `backend/tests/modules/market-data-foundation/market-data-storage-readiness.invariants.test.ts`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/market-data-dq-readiness-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/09-summaries/sprint-1b-wave1-market-data-storage-audit.md`

## 3. Files Changed By QA

QA created only this evidence file:
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/sprint-1b-03-market-data-storage-readiness-qa.md`

QA did not modify application source, existing tests, Prisma schema, route registries, shared utilities, shared UI, package manifests, frontend files, startup files, root `AGENTS.md`, deleted `docs/AGENTS.md`, or historical `docs/codex-agent-team-plan/**`.

## 4. Git Status Before QA Evidence

Observed before QA evidence creation:

```text
?? backend/tests/modules/market-data-foundation/market-data-storage-readiness.invariants.test.ts
```

This matched the approved Workstream A file.

## 5. Forbidden Dependency Check

Search of the new test file for forbidden or risky dependency indicators found only the explicit exclusion assertion in the final test name.

The test file does not call:
- Angel One.
- Live providers.
- Broker APIs.
- Paid APIs.
- External services.
- Startup schedulers.
- Frontend or UI code.

The repository is instantiated with mocked Prisma behavior. No database, provider, scheduler, server, or UI path is executed.

## 6. Test Command Run

Initial sandboxed run:

```text
cd backend
npm test -- market-data-storage-readiness.invariants.test.ts
```

Initial result:
- Failed with Jest worker `spawn EPERM`, consistent with sandbox process-spawn behavior.
- No test assertion failure was reported.

Developer rerun of the same focused command outside the sandbox:

```text
cd backend
npm test -- market-data-storage-readiness.invariants.test.ts
```

Result:

```text
Test Suites: 1 passed, 1 total
Tests:       7 passed, 7 total
Snapshots:   0 total
```

QA rerun of the same focused command outside the sandbox:

```text
cd backend
npm test -- market-data-storage-readiness.invariants.test.ts
```

Result:

```text
Test Suites: 1 passed, 1 total
Tests:       7 passed, 7 total
Snapshots:   0 total
```

The command printed a dotenv message reporting zero injected env values. No secrets were printed.

No broader tests were run.

## 7. Coverage Table

| Approved invariant | QA result | Evidence |
| --- | --- | --- |
| Provider/source provenance where exposed | Covered | Stored rows preserve `source`, `region`, `exchange`, `dataStatus`, normalized timestamp, and latest-price upsert evidence. |
| Duplicate candle handling | Covered | Duplicate same-day rows are reduced before storage and included in skipped/warning counts. |
| Invalid OHLC handling | Covered | Invalid OHLC rows are skipped before storage and warnings preserve validation reasons. |
| Zero/suspicious volume handling | Partially covered | Zero-volume rows are stored as visible evidence while readiness remains blocked. Separate suspicious-volume thresholds remain future work. |
| Stale/missing latest candle evidence | Covered | Repository readiness stats feed stale and missing-latest readiness blockers. |
| Retry-cooldown or skipped/fallback classification | Partially covered | Skipped invalid/duplicate storage rows are characterized. Retry-cooldown and fallback-required persistence are not exposed by current repository behavior. |
| Manual-required/unsupported evidence | Covered | Unsupported provider status and missing provider symbol remain not review-ready. |
| Natural-key/idempotency behavior | Covered | Current symbol/date behavior is characterized: no-op identical candle, changed candle update through `symbol_timestamp`, and bulk insert duplicate skip. |
| No Angel/live/startup/UI dependency | Covered | Test uses mocked repository behavior and local validation/readiness functions only. |

## 8. Invariants Not Fully Provable Without Source Changes

Not fully provable in this test-only slice:
- Database-level uniqueness.
- Instrument-aware natural key including instrument id, region, asset class, timeframe, date, and source.
- Durable source run id, batch id, source fingerprint, provider symbol, and validation window storage.
- Retry-cooldown and fallback-required persistence.
- Suspicious-volume threshold policy beyond zero-volume evidence.
- Missing-candle cause classification.
- Downstream module enforcement.

## 9. QA Decision

QA decision: accept.

Rationale:
- Focused test passed.
- The implementation stayed in one approved backend test file.
- No forbidden files or behaviors were introduced.
- The evidence does not claim downstream enforcement or full contract compliance.
