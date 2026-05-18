# CF-W1-MD-03 - Market Data Signoff Threshold Contract Requirement

Date: 2026-05-18

## Status

Audit-derived requirement draft. Not Ready for Implementation.

## Product Value

Universe signoff is the upstream trust gate for every review workflow that depends on Market Data being good enough to trust. Today the module exposes price coverage, metadata coverage, review-ready counts, and a PASS/FAIL signoff, but the active contract's `95%` price-ready and `90%` metadata-ready thresholds are not yet enforced as explicit hard downstream gates. Traders and research users should not see a review universe described as trustworthy when contract-level coverage targets remain below threshold.

## Evidence

- `11-module-audits/audit-market-data-data-quality.md` found that universe signoff still relies on provider-unknown, retry, identity, metadata, backfill, latest EOD, minimum review-ready count, and `10%` review-ready share, but does not fully encode the active `95%` price-ready / `90%` metadata-ready contract as hard signoff gates.
- `backend/src/modules/market-data-foundation/market-data-foundation.md` documents `coverage.priceCoveragePercentage`, `coverage.metadataCoveragePercentage`, and `universeSignoff`, but its current signoff definition only guarantees the review-ready minimum count/share plus blocker cleanup and trust status.
- `06-contracts/market-data-dq-readiness-contract.md` already states the intended universe-level thresholds: at least `95%` price-ready and at least `90%` required business-metadata coverage for provider-supported active in-scope `IN / STOCK` instruments.
- `11-module-audits/TEAM-05-market-data-data-quality-domain-audit-2026-05-17.md` and `17-team-outboxes/TEAM-05-outbox.md` both call out the signoff-threshold gap as remaining work.
- `04-qa/next-validation-plans.md` already names `CF-W1-MD-03` as the future validation packet for threshold contract tests after the signoff-threshold policy and implementation scope are accepted.

## Acceptance Criteria

- `universeSignoff` fails closed when provider-supported active in-scope price coverage is below `95%`, even if the minimum review-ready count/share is met.
- `universeSignoff` fails closed when provider-supported active in-scope required business-metadata coverage is below `90%`, even if price coverage and review-ready counts otherwise pass.
- Signoff reasons and blocker text explicitly distinguish price-coverage threshold failure from metadata-coverage threshold failure.
- `downstreamAllowed` remains `false` whenever either threshold is missed.
- Threshold enforcement stays scoped to the existing Market Data health/signoff contract and does not weaken per-instrument readiness gating.
- Focused tests cover pass, price-threshold fail, metadata-threshold fail, dual-threshold fail, and backward-compatible explanation output.

## Non-Goals

- No Prisma schema, migration, durable-storage, or OHLC natural-key work.
- No provider expansion, startup/backfill redesign, or scheduler behavior change.
- No route-registry, shared utility, shared UI, or frontend workflow redesign.
- No change to the existing review-ready minimum count/share policy except to add the explicit coverage-threshold gates alongside it.

## Future Candidate Files After Ready Promotion

- `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.md`
- `backend/tests/modules/market-data-foundation/market-data.service.test.ts`
- `backend/tests/modules/market-data-foundation/market-data.universe.test.ts`

## Next Gate

Team 03 architecture/contract prep for one bounded Market Data signoff-threshold slice, then Team 04 QA planning for focused threshold and explanation coverage, with later Team 05 implementation only after exact file reservations exist.
