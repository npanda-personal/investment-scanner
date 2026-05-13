# MD-A1 QA Evidence - Latest Completed EOD Catch-Up Gate

Date: 2026-05-13
Mode: QA Verification Mode
Work item: MD-A1 Latest Completed EOD Catch-Up Gate
QA result: Signoff

## Scope Reviewed

- QA plan: `docs/codex-agent-team-plan/qa-plans/2026-05-13-market-data-availability-qa-plan.md`
- Work packet: `docs/codex-agent-team-plan/work-packets/2026-05-13-market-data-availability-work-packets.md`
- Developer handoff: `docs/codex-agent-team-plan/developer-handoffs/2026-05-13-md-a1-developer-handoff.md`
- Code/test/docs diff for Market Data service, focused tests, and docs.

No production source or test files were edited during QA. No backend/frontend local server was started.

## Changed File Scope Verification

Tracked changed files under source/test/package-relevant paths:

```text
backend/src/modules/market-data-foundation/market-data-foundation.md
backend/src/modules/market-data-foundation/market-data-foundation.service.ts
backend/tests/modules/market-data-foundation/market-data.service.test.ts
```

Additional tracked docs change observed:

```text
docs/codex-agent-team-plan/active-work-board.md
```

No downstream Signal, Strategy, Today Review, Trade Plan, frontend, Prisma schema/migration, or package/dependency files appeared in the checked source/test/package diff.

## Behavioral Evidence

Verified from service diff and focused tests:

- Missing latest completed EOD before IN market open allows provider fetch when latest stored is `2026-05-11` and latest completed is `2026-05-12`.
- Before-open provider end date is capped to `2026-05-12T23:59:59.999Z`.
- Missing latest completed EOD during IN market hours allows provider fetch and does not request the in-progress `2026-05-13` candle.
- During-hours provider end date is capped to `2026-05-12T23:59:59.999Z`.
- After IN close grace, missing completed EOD allows provider fetch through the current completed trading day, capped to `2026-05-13T23:59:59.999Z`.
- Scheduled region catch-up passes the capped provider end date into bounded instrument ingestion.
- Final-confirmed current daily candle still skips provider fetch.
- Recently synced catalog behavior still skips provider workers when no completed-candle catch-up is required.
- Weekend/no-new-data skip remains covered for the no-catch-up-needed case.

## Test Command

Command run from `backend`:

```powershell
npm.cmd test -- market-data.service.test.ts market-data.market-session.test.ts --runInBand
```

Result:

```text
> backend@1.0.0 test
> jest market-data.service.test.ts market-data.market-session.test.ts --runInBand

Test Suites: 2 passed, 2 total
Tests:       96 passed, 96 total
Snapshots:   0 total
Time:        3.765 s, estimated 6 s
Ran all test suites matching market-data.service.test.ts|market-data.market-session.test.ts.
```

## QA Decision

Signoff. MD-A1 meets the QA plan requirements:

- completed-EOD catch-up overrides before-open, market-open, and closed/no-new-data skips when the latest completed candle is missing;
- provider fetch is bounded to the latest completed trading date;
- in-progress current-day candles remain excluded for EOD catch-up;
- final-confirmed and recent-sync skip behavior remains covered;
- no downstream module source workaround was introduced.
