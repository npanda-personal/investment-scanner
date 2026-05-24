# CF-W3-MDPIPE-01A PO Acceptance Packet

Date: 2026-05-25

Owner: Team 00 - Delegated Product Owner Acceptance

Status: ACCEPTED UNDER STANDING DELEGATION

## Product Intent

Reduce `IN/STOCK` latest-candle load latency by making the scheduled Market Data path attempt one official NSE EOD bulk file before falling back to per-symbol provider ingestion.

This is the first bounded slice of the broader incremental automated data-load and intelligence-pipeline redesign.

## Accepted Behavior

- Scheduled `IN/STOCK` latest-candle sync attempts official NSE EOD bulk first.
- Official rows are parsed once and matched to stale active instruments using canonical, provider, source, and display symbol aliases.
- Official rows are stored under canonical local symbols through existing idempotent historical-price storage.
- The scheduled sync summary includes additive `officialEodBulk` evidence: source name, URL, file, trading date, fingerprint, row counts, matched count, storage counts, fallback reason, and warnings.
- Per-symbol provider ingestion remains fallback when official bulk is disabled, unavailable, unsupported, partial, no-match, non-NSE, BSE, or ambiguous.
- Cross-exchange safety is enforced: BSE / `.BO` / non-NSE / ambiguous tasks cannot consume NSE official rows through bare-symbol aliases.

## Gate Evidence

- Requirement: `10-requirements/CF-W3-MDPIPE-01-incremental-market-data-pipeline-requirement.md`
- Architecture: `03-architecture/CF-W3-MDPIPE-01-incremental-market-data-pipeline-architecture.md`
- Ready promotion: `13-implementation-evidence/CF-W3-MDPIPE-01A-ready-promotion.md`
- QA plan: `04-qa/CF-W3-MDPIPE-01A-MDF-OFFICIAL-EOD-qa-plan.md`
- QA verification: `04-qa/CF-W3-MDPIPE-01A-qa-verification.md`
- Developer handoff: `18-integration-queue/CF-W3-MDPIPE-01A-developer-handoff.md`
- Review rejection and rework routing: `18-integration-queue/CF-W3-MDPIPE-01A-review-rejection.md`
- Architect signoff: `03-architecture/CF-W3-MDPIPE-01A-architect-signoff.md`

## Validation

Passed:

```powershell
cd backend
npm.cmd test -- market-data.service.test.ts market-data.repository.test.ts market-data.scheduler.test.ts --runInBand
npm.cmd run build
```

Additional checks:

```powershell
rg -n "target price|price target|profit target|reward/risk|R:R|buy now|sell now|must buy|must sell|guaranteed|financial advice" backend/src/modules/market-data-foundation backend/tests/modules/market-data-foundation
git diff --check
```

Results:

- Focused backend tests passed: 3 suites, 196 tests.
- Backend build passed.
- Phrase scan found no matches.
- `git diff --check` passed with normal CRLF warnings only.
- Team 10 re-review also ran Market Data service/repository tests: 2 suites, 189 tests passed.

## Acceptance Decision

Accepted under standing delegation.

No human Product Owner action is required because:

- no Product Owner decision is open;
- implementation stayed inside the approved Market Data Foundation module-local boundary;
- QA, code review, and Architect Signoff accepted after the cross-exchange rework;
- no schema, route, shared utility/UI, package, generated, frontend, downstream module, startup/backfill expansion, live-provider, paid/cloud, broker, telemetry, or credential scope was introduced.

## Follow-Up

- Open a separate durable `PipelineRun` / `PipelineStageRun` packet before implementing the cross-module automated pipeline ledger.
- Open a separate Data Quality stage packet before wiring DQ after Market Data.
- Open separate bounded downstream stage packets for raw signals, calibration, context, smart money, strategies, backtests, Research, and Today Review.
- Track per-instrument sync-state unification as a later architecture item.
