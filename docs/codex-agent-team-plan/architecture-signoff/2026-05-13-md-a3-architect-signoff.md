# MD-A3 Architect Signoff - Deep Price Backfill For Supported Shallow Rows

Date: 2026-05-13  
Role: MD-A3 Architect Signoff Agent  
Decision: `SIGNED OFF`

## Reviewed Inputs

- Product brief: `docs/codex-agent-team-plan/po-briefs/2026-05-13-md-a3-deep-price-backfill-product-brief.md`
- Architecture contract: `docs/codex-agent-team-plan/architecture-contracts/2026-05-13-md-a3-deep-price-backfill-contract.md`
- QA evidence: `docs/codex-agent-team-plan/qa-evidence/2026-05-13-md-a3-deep-price-backfill-qa-evidence.md`
- Lead validation: `docs/codex-agent-team-plan/lead-validation/2026-05-13-md-a3-lead-validation.md`
- Market Data missing-data architecture audit: `docs/codex-agent-team-plan/architecture-contracts/2026-05-13-market-data-missing-data-architecture-audit.md`
- Source inspection scope:
  - `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
  - `backend/src/modules/market-data-foundation/market-data-foundation.types.ts`
  - `backend/src/modules/market-data-foundation/market-data-foundation.provider.ts`
  - `frontend/src/features/market-data-foundation/api/marketDataFoundationService.ts`
  - `frontend/src/features/market-data-foundation/components/MarketDataStatusPanel.tsx`
  - `frontend/src/features/market-data-foundation/types.ts`

## Architecture Gate Findings

The MD-A3 implementation matches the selected architecture: harden the existing bounded `BACKFILL_PRICES` lane instead of adding another subsystem.

- Local-first: passed. The implementation reuses the module-local service, repository, and provider path. No hosted worker, hosted database, paid queue, or paid provider was introduced.
- No paid tools/providers/services: passed. The implementation uses the existing Yahoo-backed provider abstraction and existing local test/build tooling.
- Bounded work: passed. The visible and API paths remain batch-driven. The live check used `batchSize=1`, returned promptly, and reported `hasMore=true` for the remaining queue.
- Auto-deep policy: passed. Rows below 252 bars are deep-backfilled from a 15-year lookback anchored to the latest completed EOD without requiring user `fullReload`.
- Incremental policy: passed. Stale rows with sufficient depth use an overlap-based incremental catch-up plan.
- Completed-EOD cap: passed. The service exposes `latestCompletedEodDate` and `targetEndDate` and does not hide the target session.
- Diagnostics: passed. Machine-readable fields support UI progress, QA evidence, and later automated acceptance checks.
- Zero-row honesty: passed. Zero usable provider rows are not counted as successful repairs, and the price backfill path avoids reclassifying supported rows as unsupported on a single empty fetch.
- Adjusted-close honesty: passed. Provider mapping no longer fills missing adjusted close from close, so downstream coverage can distinguish real adjusted-close data from fallback or missing data.
- Downstream fail-closed posture: passed. The implementation improves upstream data availability without relaxing Today Review, Data Quality, Signals, Strategy Decision, or Trade Plan gates.

## Residual Architecture Risks

These do not block MD-A3, but they remain active Market Data root-cause work:

- Scope-level freshness can still hide per-instrument stale or missing EOD data before individual repair is reached.
- Provider calls still need timeout, retry taxonomy, and slow-call diagnostics for long provider latency.
- Legacy `/stocks/sync-all` remains available and should be retired or guarded because it can bypass the bounded run model.
- Global symbol identity can still collapse NSE/BSE or cross-region symbols in future work if not fixed at the repository/API boundary.
- Holiday/session accuracy remains a dependency for correct completed-EOD decisions.

## Signoff Decision

`SIGNED OFF`

MD-A3 satisfies the architecture contract for supported shallow row deep backfill, completed-EOD capping, diagnostics, adjusted-close honesty, and local-first/no-paid-service constraints. Move to PO acceptance with the residual Market Data gaps preserved as next-priority work, not hidden inside MD-A3 acceptance.
