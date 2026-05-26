# CF-W1-MD-02A Architecture Review

Date: 2026-05-26

Owner: Team 03 Architecture Factory

## Status

Proposal-only packet refreshed. Not Ready for Implementation.

`CF-W1-MD-02A` remains the docs-only child under the accepted `CF-W1-MD-02` ADR direction. This pass sharpens the consent boundary and the exact split into later children. It does not authorize Prisma/schema edits, migrations, generated artifacts, repository/service changes, Data Quality Engine handoff implementation, downstream adoption, tests, UI work, provider/live-data work, startup/backfill work, or package changes.

The storage direction decision from 2026-05-17 is still valid, but a separate Product Owner consent step is still required before any `CF-W1-MD-02B` schema/generated implementation can begin. That consent request is now tracked in `99-decision-inbox/DECISION-20260526-md-02b-schema-generated-consent.md`.

## Evidence Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-MD-02A-additive-companion-evidence-schema-packet-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/next-top-10-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/99-decision-inbox/open-decisions.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-MD-02-durable-readiness-evidence-adr.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-MD-02A-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-MD-02-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-MD-02-durable-readiness-evidence-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-MD-02A-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/99-decision-inbox/DECISION-20260517-market-data-durable-readiness-storage-adr.md`
- `backend/prisma/schema.prisma`
- `backend/src/modules/market-data-foundation/market-data-foundation.md`
- `backend/src/modules/market-data-foundation/market-data-foundation.types.ts`

## Current Source Findings

- `PriceTick` remains unique on `symbol + timestamp`.
- `LatestPrice` remains keyed by `symbol`.
- Current persisted price storage carries some provenance fields such as `region`, `source`, `ingestionTimestamp`, and `dataStatus`, but it still does not represent a contract-complete durable readiness evidence row keyed by scope, timeframe, source, and source symbol.
- Market Data read models already expose derived/read-path trust fields such as `latest_completed_eod_date`, `stored_data_through_date`, `readiness_blockers`, `readiness_warnings`, `trusted_baseline_blocker_codes`, and `uses_adjusted_close_fallback`.
- Market Data scheduled and repair flows already persist or emit run-level evidence such as `sourceFingerprint`, `changedInstrumentIds`, and `dqStageEligible`.
- Those existing run-level artifacts are useful linkage inputs, but they are not a substitute for the per-candle or per-trading-date companion durable evidence row required by the parent ADR.

## Architecture Decision

Keep `CF-W1-MD-02A` as a proposal-only packet that narrows the additive companion evidence schema boundary and nothing else.

Smallest acceptable future schema direction:

- one additive companion evidence model beside current `PriceTick` / `LatestPrice` rows;
- no destructive rewrite of existing price-row keys in the first implementation packet;
- no second append-only run-history table in this child;
- optional nullable linkage to existing run/fingerprint evidence is sufficient for the first storage slice.

This review intentionally does not approve a Prisma model name, final column types, migration SQL, or generated client output. It only makes the required proposal boundary exact and separates it from the still-open implementation consent decision.

## Minimum Natural Key

The future companion evidence record must be idempotent on this minimum natural key:

```text
instrument_id or canonical_symbol
region
asset_type
timeframe
trading_date or timestamp
source
source_symbol or provider_symbol where provider identity differs
```

Default daily-equity posture for the first schema proposal:

```text
canonical_symbol
region
asset_type
timeframe = 1d
trading_date
source
source_symbol
```

If a stable `instrument_id` is already available in implementation, prefer `instrument_id` as the primary identity field while retaining canonical symbol and source symbol for auditability.

## Minimum Durable Evidence Fields

The additive companion evidence proposal must cover, at minimum:

- canonical identity fields:
  - `instrumentId` when available
  - `canonicalSymbol`
  - `region`
  - `assetType`
  - `timeframe`
  - `tradingDate` or `timestamp`
- source/provenance fields:
  - `source`
  - `sourceSymbol`
  - `providerSymbol` when it differs materially from `sourceSymbol`
  - `sourceTimestamp` when the provider exposes it
  - `ingestedAt`
  - `batchRunId` or `sourceFingerprint`
- validation-window evidence:
  - `validationWindowStart`
  - `validationWindowEnd`
  - `latestCompletedTradingDateBasis` or equivalent session-basis field
- durable evidence fields:
  - `duplicateProviderRowsSkipped`
  - `invalidRowsRejected`
  - `missingCandleStatus`
  - `missingCandleReasonCode`
  - `staleCurrentnessStatus`
  - `staleCurrentnessReasonCode`
  - `suspiciousVolumeStatus`
  - `suspiciousVolumeReasonCode`
  - `adjustedCloseFallbackUsed`
  - `adjustedCloseFallbackReasonCode`
  - `providerGapStatus`
  - `providerGapReasonCode`
  - `durabilityClass` marking durable versus derived evidence
- audit fields:
  - `createdAt`
  - `updatedAt`

The proposal may collapse reason details into JSON only if the natural key remains idempotent and the durable-versus-derived boundary stays explicit.

## Exact Split Between MD-02A And Later Children

1. `CF-W1-MD-02A`
   - docs-only proposal packet;
   - defines minimum natural key, minimum evidence fields, additive migration posture, and durable-versus-derived claim boundary;
   - opens no application writer.
2. `CF-W1-MD-02B`
   - first implementation packet only after explicit Product Owner consent to open schema/generated work;
   - owns Prisma/schema, migration, generated client/types, and `market-data-foundation` repository/service/types/doc/test changes needed to write and read the companion evidence row;
   - must not include DQE adoption, downstream consumers, UI, startup/backfill, or provider widening.
3. `CF-W1-MD-02C`
   - DQE handoff packet only after `02B` lands;
   - owns DQE consumption of Market Data public evidence outputs and DQE fail-closed contract updates;
   - must not widen into downstream adoption.
4. `CF-W1-MD-02D`
   - downstream adoption packet only after `02C` lands;
   - owns Signal/Strategy/Backtesting/Trade Plan/Portfolio/Watchlist/Alerts/Research Hub/Copilot consumption through DQE public outputs only;
   - must not bypass DQE or reopen Market Data storage design.

## Consent Boundary

The following remain true consent blockers and are not authorized by this pass:

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- generated Prisma client and generated types
- `backend/src/modules/market-data-foundation/market-data-foundation.repository.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.types.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.md`
- `backend/tests/modules/market-data-foundation/market-data.repository.test.ts`
- `backend/tests/modules/market-data-foundation/market-data.service.test.ts`
- any DQE source/test files
- any downstream signal, strategy, backtest, trade-plan, portfolio, watchlist, alert, research-hub, copilot, or UI adoption
- route registries
- shared backend utilities
- shared UI
- package manifests
- paid/cloud, broker, telemetry, or live-provider work

If Team 00 wants to open the first implementation slice, it must resolve `DECISION-20260526-md-02b-schema-generated-consent` first.

## QA Planning Handoff For Team 04

Team 04 can start docs-only ADR/schema-proposal review now.

Required QA checklist focus:

- the proposal stays additive and does not rewrite `PriceTick` or `LatestPrice` semantics in place;
- the natural key includes scope, timeframe, and source dimensions rather than symbol-plus-date only;
- the minimum evidence fields cover duplicate, invalid, missing, stale, suspicious-volume, adjusted-close-fallback, and provider-gap evidence;
- durable-versus-derived evidence is explicit;
- current run-level evidence such as `sourceFingerprint` is treated only as optional linkage, not as a substitute for the companion row;
- `02A` does not leak into implementation claims for `02B`, `02C`, or `02D`;
- the packet keeps DQE as evaluator and does not move readiness scoring ownership into Market Data Foundation;
- no live-provider, startup/backfill, package, route, UI, paid/cloud, broker, or telemetry scope is implied.

No executable QA command is in scope for this packet.

## Readiness Result

`CF-W1-MD-02A` is ready for Team 04 proposal review only.

It is not Ready for Implementation and must not be promoted as an app-code writer pass. The exact blocker before implementation is explicit Product Owner consent to open `CF-W1-MD-02B` with Prisma schema, migration, and generated-client reservations.
