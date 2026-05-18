# CF-W1-MD-02A Architecture Review

Date: 2026-05-18

Owner: Team 03 Architecture Factory

## Status

Proposal packet ready.

`CF-W1-MD-02A` is the approval-gated schema proposal child under the accepted `CF-W1-MD-02` ADR direction. This pass does not authorize Prisma/schema edits, migrations, generated artifacts, repository/service changes, Data Quality Engine handoff implementation, downstream adoption, tests, UI work, provider/live-data work, startup/backfill work, or package changes.

## Evidence Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/16-team-inboxes/TEAM-03-current-assignment.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-MD-02A-additive-companion-evidence-schema-packet-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-MD-02-durable-market-data-readiness-evidence-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-MD-02-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-MD-02-durable-readiness-evidence-adr.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-MD-02-durable-readiness-evidence-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-MD-02-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-MD-02-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/TEAM-05-market-data-data-quality-domain-audit-2026-05-17.md`
- `backend/prisma/schema.prisma`
- `backend/src/modules/market-data-foundation/market-data-foundation.md`
- `backend/src/modules/market-data-foundation/market-data-foundation.types.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.md`
- `backend/src/modules/data-quality-engine/data-quality-engine.types.ts`

## Current Source Findings

- `PriceTick` remains unique on `symbol + timestamp`.
- `LatestPrice` remains keyed by `symbol`.
- The current storage baseline already carries some provenance fields such as `region`, `source`, `ingestionTimestamp`, and `dataStatus`, but not a contract-complete durable readiness record.
- Market Data DTOs already expose derived/read-path readiness evidence such as `latest_completed_eod_date`, `stored_data_through_date`, `readiness_blockers`, `readiness_warnings`, `trusted_baseline_blocker_codes`, and `uses_adjusted_close_fallback`.
- Data Quality evaluation DTOs still consume summarized readiness outputs and do not own durable candle-level provenance storage.

## Architecture Decision

Keep `CF-W1-MD-02A` as a proposal-only packet that narrows the additive companion evidence schema boundary and nothing else.

Smallest acceptable future schema direction:

- one additive companion evidence model beside current `PriceTick` / `LatestPrice` rows;
- no destructive rewrite of existing price-row keys in the first implementation packet;
- no second append-only run-history table in this child unless Team 00 explicitly opens a separate schema expansion later;
- nullable run or fingerprint fields on the companion row are sufficient for the minimum first proposal.

This review intentionally does not approve a Prisma model name, final column types, migration SQL, or generated client output. It only makes the required proposal boundary exact.

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

The proposal may collapse reason details into JSON or arrays only if the first implementation packet keeps the natural key idempotent and preserves durable versus derived evidence boundaries clearly.

## Exact Future Blockers

The following remain true consent blockers and are not authorized by this pass:

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- generated Prisma client and generated types
- any repository, service, provider, worker, scheduler, startup, repair, or backfill implementation under `market-data-foundation`
- any Data Quality Engine handoff implementation
- any downstream signal, strategy, backtest, trade-plan, portfolio, watchlist, alert, research-hub, copilot, or UI adoption
- route registries
- shared backend utilities
- shared UI
- package manifests
- paid/cloud, broker, telemetry, or live-provider work

If any of the above is required during this docs pass, reject the request and return it to Team 00.

## Exact Split Between MD-02A And Later Children

1. `CF-W1-MD-02A`
   - docs-only proposal packet;
   - defines minimum natural key, minimum evidence fields, additive migration posture, and durable-versus-derived claim boundary;
   - authorizes no application writer.
2. `CF-W1-MD-02B`
   - first implementation packet only after explicit schema approval;
   - owns Prisma/schema, migration, generated client/types, and `market-data-foundation` repository/service/types/doc/test changes needed to write and read the companion evidence row;
   - must not include DQE source adoption, downstream consumers, UI, startup/backfill, or provider widening.
3. `CF-W1-MD-02C`
   - DQE handoff packet only after `02B` lands;
   - owns DQE consumption of Market Data public evidence outputs and DQE fail-closed contract updates;
   - must not widen into downstream adoption.
4. `CF-W1-MD-02D`
   - downstream adoption packet only after `02C` lands;
   - owns Signal/Strategy/Backtesting/Trade Plan/Portfolio/Watchlist/Alerts/Research Hub/Copilot consumption through DQE public outputs only;
   - must not bypass DQE or reopen Market Data storage design.

## QA Planning Handoff For Team 04

Team 04 should treat `CF-W1-MD-02A` as ADR/schema-proposal review only.

Required QA checklist focus:

- the proposal stays additive and does not rewrite `PriceTick` or `LatestPrice` semantics in place;
- the natural key includes scope, timeframe, and source dimensions rather than symbol-plus-date only;
- the minimum evidence fields cover duplicate, invalid, missing, stale, suspicious-volume, adjusted-close-fallback, and provider-gap evidence;
- durable-versus-derived evidence is explicit;
- `02A` does not leak into implementation claims for `02B`, `02C`, or `02D`;
- the packet keeps DQE as evaluator and does not move readiness scoring ownership into Market Data Foundation;
- no live-provider, startup/backfill, package, route, UI, paid/cloud, broker, or telemetry scope is implied.

No executable QA command is in scope for this packet.

## Readiness Result

`CF-W1-MD-02A` is `proposal packet ready`.

It is ready for Team 04 ADR/schema-proposal QA review and Team 00 orchestration. It is not Ready for Implementation and must not be promoted as an app-code writer pass.
