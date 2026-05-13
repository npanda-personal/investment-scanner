# MD-A4 Lead Validation - Provider Validation Drain And Retry Classification

Date: 2026-05-13  
Mode: `Lead Validation Mode`  
Owner: Senior Fullstack Lead / Orchestrator  
Work item: MD-A4 - Provider Validation Drain And Retry Classification

## Inputs

- Product brief: [MD-A4 product brief](../po-briefs/2026-05-13-md-a4-provider-validation-drain-product-brief.md)
- Architecture contract: [MD-A4 architecture contract](../architecture-contracts/2026-05-13-md-a4-provider-validation-drain-contract.md)
- Developer handoff: [MD-A4 developer handoff](../developer-handoffs/2026-05-13-md-a4-developer-handoff.md)
- QA plan: [MD-A4 QA plan](../qa-plans/2026-05-13-md-a4-provider-validation-drain-qa-plan.md)
- QA evidence: [MD-A4 QA evidence](../qa-evidence/2026-05-13-md-a4-provider-validation-drain-qa-evidence.md)

## Validation Result

Lead validation status: `SIGNED OFF`

The implementation satisfies the Architect asks after QA signoff:

- Provider validation now uses an explicit taxonomy instead of collapsing unknown, unsupported, retryable, fallback-required, and manual cases.
- `UNKNOWN_FIRST` and `RETRY_FAILED` queues are separate and mutating queue reads use offset-zero behavior.
- Retryable provider failures write durable `PROVIDER_VALIDATION` attempts/states with `nextRetryAt`; cooldown/manual rows remain visible and are not silently retried.
- Yahoo zero-candle results for `IN / STOCK` become `FREE_FALLBACK_REQUIRED` and remain fail-closed for free source fallback instead of clean unsupported.
- Required-history evidence is machine-readable: required start date, listing date, latest completed EOD, stored history bounds, stored bars, completion flag, and coverage status.
- UI shows queue counts, retry/manual blockers, provider timing, validation window, fallback requirement, paid-provider prohibition, samples, and 15-year/listing-date coverage target.

## Evidence

- `backend`: focused market-data service/repository/provider tests passed, `3 suites / 138 tests`.
- `backend`: `npm.cmd run build` passed.
- `frontend`: `npm.cmd run build` passed.
- `frontend`: focused market-data Playwright smoke passed, `8/8`.
- `git diff --check` passed with line-ending warnings only.

## Residual Notes

MD-A4 is a classification and gate-hardening fix. It does not complete the actual 15-year/listing-date OHLCV population. MD-A5 remains required to fetch/repair full history from Yahoo where sufficient and from approved free official/public exchange sources when Yahoo is insufficient.

## Next Gate

Move to Architect Signoff.
