# MD-A4 Architect Signoff - Provider Validation Drain And Retry Classification

Date: 2026-05-13  
Mode: `Architect Signoff Mode`  
Owner: Solution Architect Agent / Orchestrator validation  
Work item: MD-A4 - Provider Validation Drain And Retry Classification  
Decision: `SIGNED OFF`

## Reviewed Inputs

- [MD-A4 product brief](../po-briefs/2026-05-13-md-a4-provider-validation-drain-product-brief.md)
- [MD-A4 architecture contract](../architecture-contracts/2026-05-13-md-a4-provider-validation-drain-contract.md)
- [MD-A4 QA evidence](../qa-evidence/2026-05-13-md-a4-provider-validation-drain-qa-evidence.md)
- [MD-A4 Lead validation](../lead-validation/2026-05-13-md-a4-lead-validation.md)
- Source scope: market-data provider, repository, service, types, focused backend tests, market-data UI panel/types, and focused UI smoke.

## Architecture Gate Findings

- Local-first constraint: passed. No hosted worker, paid queue, paid API, broker API, hosted database, or paid provider was introduced.
- No-paid-provider constraint: passed. Yahoo insufficiency is not accepted as final for `IN / STOCK`; it is surfaced as `FREE_FALLBACK_REQUIRED` for approved free official/public fallback work.
- Existing module boundary: passed. Changes stay inside `market-data-foundation` backend/frontend module and focused tests.
- Durable state model: passed. The implementation reuses existing repair attempt/state tables and adds `PROVIDER_VALIDATION` as a typed repair category.
- Queue safety: passed. Unknown validation and retry validation are separate, bounded, and offset-zero for mutating queues.
- Data trust posture: passed. Provider classification does not relax downstream readiness; incomplete 15-year/listing-date history remains visible as `NEEDS_BACKFILL` or `FALLBACK_REQUIRED`.
- UI contract: passed. Frontend fields are optional/diagnostic and do not require a schema/API version break.

## Residual Architecture Risks

- MD-A5 must implement actual 15-year/listing-date daily OHLCV population and approved free-source fallback ingestion.
- Listing-date repair remains important because missing listing dates force the stricter 15-year target and should not be hidden.
- Full provider drain must remain bounded/batched; no UI action should trigger unbounded full-catalog validation.

## Signoff Decision

`SIGNED OFF`

MD-A4 satisfies the architecture contract and preserves the product constraint that missing market data must be solved through trustworthy free data availability, not hidden behind validation wording.

## Next Gate

Move to PO Acceptance.
