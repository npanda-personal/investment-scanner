# CF-W1-DQ-02 Data Quality Currentness Evidence Contract

Date: 2026-05-18

Owner: Team 03 Architecture Factory

## Status

Split-required contract. First child `CF-W1-DQ-02A` only is defined here. Not Ready for Implementation.

## Contract Intent

The bounded first child gives Data Quality Engine a market-session-aware currentness classifier and fail-closed blocker propagation without widening into Market Data source edits, DQE repository/read-side work, schema changes, or route changes.

Market Data Foundation remains the source of session timing. Data Quality Engine remains the owner of readiness gating.

## First-Child Boundary

Allowed implementation boundary:

- `backend/src/modules/data-quality-engine/data-quality-engine.service.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.types.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.md`
- focused DQE service/invariant tests
- consumption of existing Market Data public exports already available from `backend/src/modules/market-data-foundation/index.ts`

Forbidden in the first child:

- editing any `backend/src/modules/market-data-foundation/**` source file;
- editing `data-quality-engine.repository.ts`, controller/router/validation, or route registries;
- Prisma/schema/migration work;
- frontend work;
- generated/package/shared-utility/shared-UI changes.

If the implementation cannot stay inside that boundary, the child fails the contract and must return to Team 00 for re-splitting.

## Required Currentness Semantics

The first child must add additive DQ evaluation evidence with semantics equivalent to:

```ts
type DataQualityCurrentnessStatus = 'CURRENT' | 'STALE' | 'MISSING' | 'BLOCKED';

type DataQualityCurrentnessReasonCode =
  | 'CURRENT_COMPLETED_SESSION'
  | 'CURRENT_FINALIZATION_PENDING'
  | 'STALE_COMPLETED_SESSION_MISSED'
  | 'MISSING_LATEST_PRICE'
  | 'SESSION_EVIDENCE_UNAVAILABLE'
  | 'PROVIDER_GAP_BLOCKED';
```

Expected payload shape may be any additive DTO field set that preserves:

- status
- reasonCode
- latestObservedTradingDate
- latestCompletedTradingDate
- daysBehind
- plain-language reason

The exact type name may differ. The field semantics must not.

## Required Input Sources

The first child may use only existing inputs already available on DQE evaluation paths:

- latest observed price date from the latest price record;
- instrument region/asset scope;
- existing Market Data public session helpers;
- existing Market Data instrument evidence such as `latest_completed_eod_date`, `stored_data_through_date`, `readiness_blockers`, and `trusted_baseline_blocker_codes` when present.

The first child must not create a second market-session calendar implementation inside DQE.

## Required Mapping Rules

- Match between latest observed date and latest completed session => `CURRENT_COMPLETED_SESSION`.
- Market open or finalization grace while latest observed date still matches the latest completed session => `CURRENT_FINALIZATION_PENDING`.
- Missing latest price => `MISSING_LATEST_PRICE`.
- Latest observed date behind latest completed session => `STALE_COMPLETED_SESSION_MISSED`.
- No session evidence available for the region/scope => `SESSION_EVIDENCE_UNAVAILABLE`.
- Existing Market Data blocker evidence that implies the final candle is missing or provider-gapped => `PROVIDER_GAP_BLOCKED`.

## Fail-Closed Propagation Rules

For the first child, non-current outcomes must propagate through existing DQE strict-consumer paths:

- `STALE`, `MISSING`, and `BLOCKED` outcomes must add stable blocker/gap strings.
- `signal` and `dailyReview` use-case tiers must not remain `READY` when currentness is non-current.
- `eligibleForSignals` and `eligibleForBacktesting` must keep fail-closed behavior through existing stale/blocker semantics.
- `filterEligibleInstruments()` must continue excluding affected instruments without any caller-side session logic.
- Persisted DQ rows may continue storing only blocker/gap strings in this child; a structured currentness object is required only on service-evaluated payloads that can return it without repository widening.

## Explicit Non-Goals For The First Child

- No persisted currentness object across existing stored `DataQualityEvaluation` rows.
- No additive summary/list/diagnostics repository projection requirement.
- No route/API contract promise beyond what existing service paths can return safely.
- No durable storage claim.
- No Market Data helper/source changes.

## Parent Blocker Preserved

The full parent requirement remains blocked from single-packet Ready promotion because existing persisted DQ rows do not store session-aware currentness fields.

Any later packet that promises consistent list/summary/diagnostics exposure must explicitly reserve the DQE read side and, if durable persistence is required, request separate schema approval.

## Test Contract For Team 04

Focused backend tests for the first child must prove:

- current completed-session classification;
- current finalization-pending classification;
- stale lagging classification;
- missing latest-price classification;
- session-evidence-unavailable classification;
- provider-gap blocked classification;
- fail-closed tier/blocker propagation for stale, missing, and blocked outcomes.

Reference QA planning artifact: `04-qa/CF-W1-DQ-02A-qa-plan.md`.
