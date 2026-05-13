# MD-A1 PO Acceptance - Latest Completed EOD Catch-Up Gate

Date: 2026-05-13
Mode: PO Acceptance Mode
Work item: MD-A1 Latest Completed EOD Catch-Up Gate
Decision: Accepted

## Product Requirement

The product goal is to fix missing Market Data availability before changing Signals, Strategy Decision, Today Review, or Trade Plans. The observed user-facing issue was unacceptable because the app reported that the latest completed candle was missing while provider fetches were skipped as no-new-data.

Observed case:

- Current date: 2026-05-13.
- Latest completed daily candle: 2026-05-12 before/during the IN trading session.
- Latest stored candle: 2026-05-11.
- Old behavior: sync could skip provider fetches because the current market session had no useful new daily data.

## Acceptance Review

Accepted because MD-A1 changes the data-availability behavior, not just messaging:

- Missing latest completed EOD now allows a provider catch-up fetch before open, during market hours, and after close/no-new-data sessions.
- Provider fetch is capped to the latest completed trading date, so in-progress current-day candles are not requested for EOD review workflows.
- Final-confirmed and recent-sync skips remain intact when the latest completed candle is already stored.
- No downstream module was changed to relax missing-data rules.
- No paid provider, paid service, hosted tooling, broker integration, or advice workflow was introduced.

## Evidence Reviewed

- [PO audit](../po-audits/2026-05-13-market-data-data-availability-audit.md)
- [Architect root-cause notes](../architecture-contracts/2026-05-13-market-data-availability-root-cause-notes.md)
- [MD-A1 work packet](../work-packets/2026-05-13-market-data-availability-work-packets.md#md-a1---latest-completed-eod-catch-up-gate)
- [Developer handoff](../developer-handoffs/2026-05-13-md-a1-developer-handoff.md)
- [QA evidence](../qa-evidence/2026-05-13-md-a1-qa-evidence.md)
- [Lead validation](../lead-validation/2026-05-13-md-a1-lead-validation.md)
- [Architect signoff](../architecture-signoff/2026-05-13-md-a1-architect-signoff.md)

Validation evidence:

```powershell
npm.cmd test -- market-data.service.test.ts market-data.market-session.test.ts --runInBand
```

Result:

```text
Test Suites: 2 passed, 2 total
Tests:       96 passed, 96 total
```

## Product Decision

Accepted for GitHub check-in.

Next product priority remains Market Data availability, not Cycle 3 feature backlog. The next likely packet is MD-A2 or MD-A3 depending on live repair evidence: deepen supported rows to Trusted Review Lite OHLCV depth, and/or drain provider validation so enough `IN / STOCK` rows can be price-backfilled.
