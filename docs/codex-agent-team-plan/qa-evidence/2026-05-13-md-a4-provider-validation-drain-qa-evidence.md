# MD-A4 Provider Validation Drain QA Evidence - 2026-05-13

Mode: `QA Verification Mode`  
Owner: Senior Fullstack Lead / Orchestrator acting as QA verifier after worker handoff  
Work item: MD-A4 - Provider Validation Drain And Retry Classification  
Status: `SIGNED OFF`

## Sources

- [MD-A4 QA plan](../qa-plans/2026-05-13-md-a4-provider-validation-drain-qa-plan.md)
- [MD-A4 product brief](../po-briefs/2026-05-13-md-a4-provider-validation-drain-product-brief.md)
- [MD-A4 architecture contract](../architecture-contracts/2026-05-13-md-a4-provider-validation-drain-contract.md)
- [MD-A4 developer handoff](../developer-handoffs/2026-05-13-md-a4-developer-handoff.md)

## Result

QA signoff: `SIGNED OFF`

MD-A4 verifies the provider-validation lane now keeps unknown, retryable, retry-blocked, manual, unsupported, supported, fallback-required, and required-history states distinct. The UI exposes those states without starting unbounded provider work.

## Automated Evidence

Backend:

```powershell
npm.cmd test -- --runTestsByPath tests/modules/market-data-foundation/market-data.service.test.ts tests/modules/market-data-foundation/market-data.repository.test.ts tests/modules/market-data-foundation/market-data.provider.test.ts --runInBand
npm.cmd run build
```

Result: `3 passed, 3 total`; `138 passed, 138 total`; backend build passed.

Frontend:

```powershell
npm.cmd run build
npm.cmd run test:ui -- market-data-foundation.spec.ts --workers=1 --output=test-results-md-a4-final
```

Result: frontend build passed; focused UI smoke passed `8/8`.

Workspace:

```powershell
git diff --check
```

Result: passed with line-ending warnings only.

## Acceptance Evidence

| Check | Evidence | Status |
| --- | --- | --- |
| Unknown-first default | `Validate unknown providers` sends `providerValidationQueue=UNKNOWN_FIRST`, bounded `batchSize=50`, `offset=0`, and `force=false`. | Pass |
| Retry lane separation | `Retry failed providers` sends `providerValidationQueue=RETRY_FAILED`, remains disabled while unknown rows remain, and uses `force=false` by default. | Pass |
| Offset-zero mutating queues | Backend repository tests assert retry/unknown mutating queues re-read from `skip=0` instead of skipping as predicates shrink. | Pass |
| Retry cooldown/manual exclusion | Repository filtering excludes manual-required rows and cooldown-blocked rows unless explicitly forced. | Pass |
| Yahoo no-candle handling | Provider/service tests assert Indian stock zero-candle Yahoo validation becomes `FREE_FALLBACK_REQUIRED` / `VALIDATION_FAILED`, not clean unsupported. | Pass |
| Durable repair state | Provider validation writes `PROVIDER_VALIDATION` repair attempts/states with classification, retry/manual state, `nextRetryAt`, and evidence JSON. | Pass |
| 15-year/listing-date diagnostics | API summary exposes required history start, listing date, latest completed EOD, stored first/last dates, stored bars, completion flag, and `requiredHistoryCoverageStatus`. | Pass |
| Strict coverage status | Test evidence keeps a row starting `2011-05-13` as `NEEDS_BACKFILL` when the required 15-year start is `2011-05-12`. | Pass |
| UI diagnostics | UI shows provider classification counts, retry diagnostics, remaining queues, provider timing, validation window, fallback source, paid-provider prohibition, samples, and coverage target. | Pass |
| Fail-closed posture | Provider blockers remain visible in repair-plan/health/readiness evidence; no downstream gate relaxation was introduced. | Pass |

## Live/Provider-Heavy Checks

No full-catalog provider validation, provider-heavy drain, or live external source run was executed. This is intentional for MD-A4 because the acceptance target is classification, bounded queue behavior, and diagnostics. MD-A5 owns the next implementation step for 15-year/listing-date OHLCV backfill and free official/public exchange-source fallback.

## Residual Risk

- MD-A4 does not itself download all 15 years of missing history. It prevents shallow/no-data provider outcomes from being accepted silently and makes the MD-A5 backfill/fallback requirement explicit.
- Official/public free source ingestion for NSE/BSE historical EOD files remains the next required implementation before downstream signals/decisions/trades can be trusted broadly.

## Next Gate

Move to Lead Validation.
