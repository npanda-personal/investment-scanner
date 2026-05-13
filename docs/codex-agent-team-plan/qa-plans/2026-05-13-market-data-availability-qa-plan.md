# Market Data Availability QA Plan - 2026-05-13

## Scope

QA validates Market Data data-availability fixes. The goal is to prove the system can create or refresh usable market data, not merely improve missing-data messages.

## MD-A1 - Latest Completed EOD Catch-Up Gate

Mode: `QA Verification Mode`
Source packet: [MD-A1](../work-packets/2026-05-13-market-data-availability-work-packets.md#md-a1---latest-completed-eod-catch-up-gate)

### Required Evidence

- Backend focused tests for Market Data freshness/session behavior.
- Proof that missing latest completed EOD overrides no-useful-current-session skips.
- Proof that in-progress current-day candles are still not fetched for EOD review workflows.
- Proof that final-confirmed current candles and recently synced current data still skip.
- Proof that no downstream module source changed in this packet.

### Minimum Test Cases

1. Before IN market open:
   - latest completed trading date is prior trading day.
   - latest stored trading date is older.
   - expected result: provider fetch is allowed and capped to the latest completed date.
2. During IN market hours with in-progress daily candles disabled:
   - latest completed trading date is prior trading day.
   - latest stored trading date is older.
   - expected result: provider fetch is allowed for completed-date catch-up and does not request today's in-progress candle.
3. After IN market closed and no useful current-session sync remains:
   - latest completed trading date is current trading day.
   - latest stored trading date is older.
   - expected result: provider fetch is allowed for the completed date.
4. Final confirmed:
   - latest stored trading date equals trading date and sync state is `FINAL_CONFIRMED`.
   - expected result: provider fetch is skipped.
5. Recent synced current data:
   - latest stored trading date is current enough and last check is within cooldown.
   - expected result: provider fetch is skipped.

### Commands

Preferred backend command:

```powershell
npm test -- market-data.service.test.ts market-data.market-session.test.ts --runInBand
```

If the preferred command is not available, QA records the closest passing/failing market-data command and why the preferred command could not run.

### Rejection Criteria

- Provider fetch remains skipped when the latest completed candle is missing.
- Catch-up fetch can include an in-progress daily candle.
- Final-confirmed or current recent-sync behavior regresses.
- Implementation changes downstream modules to relax missing-data gates.
- Handoff lacks exact command evidence.
