# MD-A4 PO Acceptance - Provider Validation Drain And Retry Classification

Date: 2026-05-13  
Mode: `PO Acceptance Mode`  
Work item: MD-A4 - Provider Validation Drain And Retry Classification  
Decision: `Accepted`

## Product Requirement

The product problem was that too many `IN / STOCK` instruments were stuck in generic unknown or failed provider states. That blocked useful price backfill and made it unclear whether a stock needed a retry, manual symbol repair, exclusion, or a free-source fallback.

MD-A4 acceptance requires provider validation to make the next action explicit while preserving the larger product goal: every active stock needs 15 years of daily OHLCV, or listing-date-to-latest completed EOD when the listing is younger.

## Acceptance Review

Accepted.

Product acceptance reasons:

- Unknown provider rows and retry-failed rows now have separate actions and queue evidence.
- Retry cooldown, manual repair, unsupported, supported, and fallback-required outcomes stay visible.
- Yahoo no-candle/no-history for Indian stocks is no longer accepted as clean unsupported. It becomes `FREE_FALLBACK_REQUIRED`, keeping the product focused on obtaining data from approved free sources.
- The UI explicitly shows the 15-year/listing-date history target, validation window, latest completed EOD, stored history bounds, and coverage status.
- Strict coverage behavior is preserved: a row missing even the required first daily candle remains `NEEDS_BACKFILL`.
- QA, Lead, and Architect signed off.

## Evidence Reviewed

- [MD-A4 product brief](../po-briefs/2026-05-13-md-a4-provider-validation-drain-product-brief.md)
- [MD-A4 architecture contract](../architecture-contracts/2026-05-13-md-a4-provider-validation-drain-contract.md)
- [MD-A4 QA evidence](../qa-evidence/2026-05-13-md-a4-provider-validation-drain-qa-evidence.md)
- [MD-A4 Lead validation](../lead-validation/2026-05-13-md-a4-lead-validation.md)
- [MD-A4 Architect signoff](../architecture-signoff/2026-05-13-md-a4-architect-signoff.md)

Validation evidence:

```text
Backend focused tests passed: 3 suites / 138 tests.
Backend build passed.
Frontend build passed.
Frontend focused UI smoke passed: 8/8 tests.
git diff --check passed with line-ending warnings only.
```

## Residual Product Notes

MD-A4 is accepted as the provider-classification gate. It does not complete the actual 15-year historical-data population. MD-A5 is the next required Market Data implementation: obtain/repair 15 years of daily OHLCV or listing-date-to-latest completed EOD using Yahoo where sufficient and approved official/public free exchange files where Yahoo is insufficient. Paid providers remain forbidden.

## Product Decision

Accepted for GitHub check-in.

No rejection owner applies because this packet is accepted.
