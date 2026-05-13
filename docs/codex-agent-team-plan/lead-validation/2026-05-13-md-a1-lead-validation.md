# MD-A1 Lead Validation - Latest Completed EOD Catch-Up Gate

Date: 2026-05-13
Mode: Lead Validation Mode
Work item: MD-A1 Latest Completed EOD Catch-Up Gate
Result: Lead validated after QA

## Inputs Reviewed

- [PO market data audit](../po-audits/2026-05-13-market-data-data-availability-audit.md)
- [Architect root-cause notes](../architecture-contracts/2026-05-13-market-data-availability-root-cause-notes.md)
- [MD-A1 work packet](../work-packets/2026-05-13-market-data-availability-work-packets.md#md-a1---latest-completed-eod-catch-up-gate)
- [MD-A1 QA plan](../qa-plans/2026-05-13-market-data-availability-qa-plan.md#md-a1---latest-completed-eod-catch-up-gate)
- [Developer handoff](../developer-handoffs/2026-05-13-md-a1-developer-handoff.md)
- [QA evidence](../qa-evidence/2026-05-13-md-a1-qa-evidence.md)
- Code and test diff for Market Data Foundation.

## Architect Ask Validation

Architect ask: stop treating a no-useful-current-session state as a reason to skip all provider fetches when the latest completed EOD candle is missing.

Validation:

- `evaluateSyncFreshnessGate` now computes the latest completed trading date and compares it to the latest stored trading date before applying final-confirmed, cooldown, and market-session skip gates.
- When the latest completed candle is missing, the gate returns `shouldSkip=false` and carries a provider end-date cap.
- `ingestSymbol` and `syncScheduledRegion` use that cap as the effective provider end date.
- Catch-up is bounded to completed EOD and does not request the current in-progress trading day during market hours.

## Integration And Scope Validation

- Changed source is limited to Market Data Foundation service/docs plus focused Market Data tests.
- No downstream Signal, Signal Quality, Calibration, Strategy Decision, Today Review, Trade Plan, frontend, Prisma schema, migration, package, or dependency files changed.
- The fix preserves source ownership: Market Data Foundation remains responsible for data availability and downstream modules stay conservative.
- No paid provider, hosted service, broker, or advice workflow was introduced.

## Evidence

QA independently signed off with:

```powershell
npm.cmd test -- market-data.service.test.ts market-data.market-session.test.ts --runInBand
```

Orchestrator re-ran the same focused command from `backend`:

```text
Test Suites: 2 passed, 2 total
Tests:       96 passed, 96 total
```

## Risks Left For Later Packets

- No live provider repair run was executed in MD-A1.
- Deep/shallow history repair remains MD-A2.
- Provider validation drain remains MD-A3.
- Holiday/session accuracy remains MD-A5.
- Per-instrument gaps beyond region-level latest date remain covered by later repair/backfill flows.

## Lead Decision

Approved for post-QA Architect signoff. MD-A1 meets the Architect's stated ask and improves actual data availability behavior instead of changing downstream missing-data messages.
