# CF-W1-DQ-02A QA Plan

Date: 2026-05-18

Owner: Team 04 QA Factory

Status: Data Quality Engine currentness-evidence first-child QA plan prepared. QA-ready for Team 00 Ready evaluation as one bounded backend-only `data-quality-engine` slice. Executable validation remains blocked until Team 00 promotes one exact implementation handoff for the reserved DQE service/types/doc/test files. The broader `CF-W1-DQ-02` parent remains split-required and blocked from single-packet promotion.

## Scope

Validation plan for additive market-session-aware currentness evidence and fail-closed propagation in `CF-W1-DQ-02A`.

In-scope surfaces after Team 00 Ready promotion:

- `backend/src/modules/data-quality-engine/data-quality-engine.service.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.types.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.md`
- `backend/tests/modules/data-quality-engine/data-quality-engine.service.test.ts`
- `backend/tests/modules/data-quality-engine/data-quality-engine.invariants.test.ts`

Out of scope for this first child:

- all `backend/src/modules/market-data-foundation/**` source edits, even if implementers want extra session helpers
- `backend/src/modules/data-quality-engine/data-quality-engine.repository.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.controller.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.router.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.validation.ts`
- `backend/src/modules/data-quality-engine/index.ts`
- Prisma, migrations, generated files, persisted `DataQualityEvaluation` shape changes, repository/list/summary/diagnostics read-side widening, or route/API contract work
- frontend source/tests, shared backend utilities, shared UI, package manifests, providers, startup/backfill, live-provider, paid/cloud, telemetry, broker, or historical-doc edits

This plan does not approve application source edits, tests, builds, services, or Ready movement. It records the QA packet only.

## Contract Inputs And Current Source Alignment

Primary planning inputs:

- `03-architecture/CF-W1-DQ-02-architecture-review.md`
- `06-contracts/CF-W1-DQ-02-dq-currentness-evidence-contract.md`
- `08-work-packets/CF-W1-DQ-02-work-packet.md`
- `10-requirements/CF-W1-DQ-02-dq-currentness-evidence-requirement.md`

Current DQE and Market Data source surfaces show:

- `data-quality-engine.md` still documents a simple freshness check and explicitly lists holiday/session-specific staleness as a current limitation.
- `data-quality-engine.service.test.ts` and `data-quality-engine.invariants.test.ts` already prove stale blocking through calendar-age behavior and fail-closed downstream eligibility, so the child should replace the stale heuristic without widening the module boundary.
- `market-data.market-session.test.ts` already proves `latestCompletedTradingDateForRegion()` and `shouldRunMarketDataSync()` behavior for before-open, market-open, post-close finalization, and weekend conditions.
- Team 03 architecture review confirms persisted DQ rows do not store session-aware currentness evidence, so repository/list/summary/diagnostics persistence coverage must stay out of scope for this first child.

## Required QA Assertions

- Currentness evidence is additive. Existing DQ scores, statuses, gaps, blockers, warnings, and eligibility fields remain present and unrenamed.
- Current after latest completed session is explicit:
  - latest observed trading date equals latest completed trading session
  - currentness status is `CURRENT`
  - reason code is `CURRENT_COMPLETED_SESSION` or a stable equivalent
- Current during open/finalization grace is explicit:
  - market is open or still in the post-close grace window
  - latest observed date still equals the latest completed session rather than the in-progress day
  - currentness status remains `CURRENT`
  - reason code is `CURRENT_FINALIZATION_PENDING` or a stable equivalent
  - the instrument must not be marked stale just because the current trading day is still forming or finalizing
- Stale lag is explicit:
  - latest observed trading date is behind the latest completed session
  - currentness status is `STALE`
  - reason code is `STALE_COMPLETED_SESSION_MISSED` or a stable equivalent
  - DQ outputs add stable blocker/gap language instead of relying on a raw seven-day heuristic
- Missing latest price is explicit:
  - no latest price exists
  - currentness status is `MISSING`
  - reason code is `MISSING_LATEST_PRICE` or a stable equivalent
- Session-evidence unavailable is explicit:
  - region/session timing cannot be derived from existing Market Data public helpers/evidence
  - currentness status is `BLOCKED`
  - reason code is `SESSION_EVIDENCE_UNAVAILABLE` or a stable equivalent
- Provider-gap blocked is explicit:
  - existing Market Data evidence already indicates a provider-gap or missing-final-candle blocker
  - currentness status is `BLOCKED`
  - reason code is `PROVIDER_GAP_BLOCKED` or a stable equivalent
  - DQE does not silently override the Market Data blocker
- Fail-closed propagation is preserved:
  - `STALE`, `MISSING`, and `BLOCKED` currentness outcomes add stable blocker/gap strings
  - `useCaseTiers.dailyReview` and `useCaseTiers.signal` do not stay `READY`
  - `eligibleForSignals` and `eligibleForBacktesting` stay fail-closed
  - `filterEligibleInstruments()` continues excluding affected instruments through current DQE strict paths with no caller-side session logic
- Research-support and local-first constraints remain intact:
  - no provider/startup/live execution logic is added
  - no direct advice, target-price, broker, or automation-authorization language is introduced
- The first child makes no durable-storage or repository/list/summary/diagnostics exposure claim.

## Scenario Matrix

| Scenario | Expected QA assertion after implementation |
| --- | --- |
| Latest observed date matches latest completed session | Evaluation exposes additive currentness evidence with `CURRENT` plus `CURRENT_COMPLETED_SESSION`, `daysBehind = 0`, and no stale blocker. |
| Market open or post-close grace while latest observed date matches latest completed session | Evaluation remains `CURRENT`, surfaces `CURRENT_FINALIZATION_PENDING`, and does not claim the in-progress day is missing or stale. |
| Latest observed date lags latest completed session | Evaluation exposes `STALE` plus `STALE_COMPLETED_SESSION_MISSED`, includes lag details such as completed date and days behind, and adds stable stale blocker/gap strings. |
| Latest price record is absent | Evaluation exposes `MISSING` plus `MISSING_LATEST_PRICE`, adds fail-closed blockers, and does not leave signal/backtest eligibility ready. |
| Region/session evidence cannot be derived | Evaluation exposes `BLOCKED` plus `SESSION_EVIDENCE_UNAVAILABLE`, adds fail-closed blockers, and does not silently fall back to the old seven-day heuristic. |
| Existing Market Data evidence shows provider-gap or missing-final-candle blocker | Evaluation exposes `BLOCKED` plus `PROVIDER_GAP_BLOCKED`, preserves the upstream blocker path, and does not reclassify the row as current. |
| Strict DQ tiers consume stale currentness | `dailyReview`, `signal`, `backtest`, and `calibration` remain non-ready/blocked per current DQE fail-closed semantics; automation remains blocked. |
| `filterEligibleInstruments()` sees stale, missing, or blocked rows | Returned eligible IDs exclude those instruments without any consumer-side market-session logic. |
| Existing DQ payload consumers read current fields | Existing DQ score/status/gap/blocker consumers remain backward-compatible because currentness fields are additive only. |
| Implementation attempts repository/list/summary/diagnostics persistence coverage | QA rejects because the first child is service-local only and the parent remains blocked. |
| Implementation edits Market Data Foundation, DQE repository/controller/router/validation/index, schema, generated files, routes, shared utilities/UI, package manifests, frontend, or provider/startup/live flows | QA rejects exactly and returns the packet to Team 00 / Architect for re-splitting. |

## Focused Command Guidance

Commands below are guidance only. They were not run during this docs-only QA planning task.

Future focused validation after Team 00 Ready promotion and implementation handoff:

```powershell
cd backend
npm.cmd test -- data-quality-engine.service.test.ts data-quality-engine.invariants.test.ts --runInBand
```

Optional read-only reassurance on existing Market Data public session helpers, only if Team 00 explicitly wants helper-regression evidence without widening the child scope:

```powershell
cd backend
npm.cmd test -- market-data.market-session.test.ts --runInBand
```

Approval-gated backend build after accepted implementation and memory/resource checks:

```powershell
cd backend
npm.cmd run build
```

## Skipped / Forbidden Checks

Skipped in this planning pass:

- all executable tests
- backend/frontend builds
- local servers, services, provider checks, and UI smoke

Forbidden by default for this slice:

- any Market Data Foundation source/test edit used as a backdoor to complete DQ currentness
- repository/controller/router/validation/index widening inside DQE
- Prisma generate, migrate, db push, db execute, or any schema/data mutation
- frontend, shared utility, shared UI, package, generated-file, or route-registry changes
- provider/live-market, startup/backfill, paid/cloud, telemetry, broker, or broad backend suites

## Exact Reject Conditions

Reject the packet immediately and return it to Team 00 / Architect if implementation edits:

- any `backend/src/modules/market-data-foundation/**` source file
- `backend/src/modules/data-quality-engine/data-quality-engine.repository.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.controller.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.router.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.validation.ts`
- `backend/src/modules/data-quality-engine/index.ts`
- `backend/prisma/schema.prisma` or any migration file
- generated files, backend/frontend route registries, shared backend utilities, shared UI, or package manifests
- any frontend file
- any provider, startup, backfill, or live-flow code path

These are not soft warnings. They are first-child rejection conditions.

## Stop Conditions

Stop QA and return to Team 00 / Architect if:

- implementation cannot express currentness using existing Market Data public session exports and current instrument evidence
- implementation needs durable currentness storage, repository reconstruction changes, or list/summary/diagnostics exposure promises
- implementation duplicates market-session calendar logic inside DQE instead of consuming Market Data public timing logic
- implementation preserves the old calendar-age heuristic as the effective currentness gate for the new scenarios
- implementation hides or weakens current fail-closed blocker/tier behavior for stale, missing, or blocked outcomes

## Evidence Required Later

- Exact implementation handoff limited to the reserved DQE service/types/doc/test files only
- Scenario evidence for current completed-session, current finalization-pending, stale lag, missing latest price, session-evidence unavailable, and provider-gap blocked cases
- Scenario evidence that `readinessBlockers`, `dataGaps`, `useCaseTiers`, and `filterEligibleInstruments()` stay fail-closed for non-current outcomes
- Focused DQE service/invariant test output only after approval
- Optional Market Data session-helper regression output only if explicitly requested as read-only reassurance
- Backend build output only after approval
- Explicit note that repository/list/summary/diagnostics persistence coverage remained out of scope and that the broader parent stayed blocked
