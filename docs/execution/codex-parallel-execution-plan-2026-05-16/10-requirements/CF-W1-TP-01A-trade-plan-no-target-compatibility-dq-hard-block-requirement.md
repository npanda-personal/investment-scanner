# CF-W1-TP-01A - Trade Plan No-Target Compatibility And DQ Hard-Block Requirement

Date: 2026-05-17

## Status

Product policy resolved. Not Ready for Implementation.

Product Owner approved Option B on 2026-05-17. This does not authorize Trade Plan source, API, frontend, schema, or test changes until Team 03/04/00 refresh the backend-only child work packet, QA scenarios, and exact file reservations.

## Product Value

Trade Plan outputs must stay aligned with the no-arbitrary-target-price product rule. Paper-review readiness should be based on rule-based exit, invalidation, risk, and Data Quality evidence rather than implied target-price promises or fail-open readiness.

## Current Evidence

Latest inputs:

- `17-team-outboxes/TEAM-06-strategy-signal-risk-2026-05-17.md`
- `11-module-audits/audit-backtesting-trade-risk.md`
- `07-decisions/DECISION-20260517-no-target-exit-invalidation-semantics-resolution.md`

Observed gaps:

- The bounded `CF-W1-STRAT-01` Strategy Decision slice is complete, but it deliberately did not migrate Trade Plan target geometry.
- Trade Plan still requires a target object shape with `price` and `expectedReturnPercent`.
- Trade Plan still computes target price from reward/risk geometry.
- Paper readiness blocks missing target and low reward/risk.
- `NOT_READY` DQ can remain warning/watch behavior instead of a hard paper-readiness blocker.
- Today Review and Trade Plan UI may still render target price or modeled reward fields.

## Requirement Split

- `CF-W1-TP-01A`: contract requirement for no-target compatibility, DQ hard-block semantics, and API/UI migration boundaries.
- `CF-W1-TP-01B`: future Trade Plan DQ hard-block implementation after accepted contract and QA plan.
- `CF-W1-TP-02`: future Trade Plan target-geometry implementation after Product Owner, Architect, UX, and compatibility decisions.

Legacy `CF-W1-TP-01` should be treated as split and not pulled as an active implementation item.

## Resolved Decision

Resolution: `07-decisions/DECISION-20260517-trade-plan-no-target-dq-hard-block-resolution.md`

Approved policy:

- Existing target-shaped fields remain compatibility-only for now.
- Target-shaped fields must not be treated as trusted paper-readiness.
- No arbitrary predefined target-price semantics may be generated.
- Trusted output language must shift to rule-based exit, invalidation, risk-review, evidence, and reason-summary wording.
- Missing or blocked DQ states hard-block trusted Trade Plan readiness.
- `LIMITED` is blocked or limited-review-only until a later Product Owner-approved policy narrows it.
- Frontend, Today Review, Prisma/schema, route registry, shared utility, shared UI, package, generated type, provider, startup/backfill, broad UI, and live-provider changes are excluded.

## Candidate Acceptance Criteria

Future accepted implementation must satisfy all approved contract details, including:

- Trusted Trade Plan output does not present arbitrary target prices as an objective, recommendation, or promise.
- Exit and invalidation output is rule-based and includes reason summaries.
- Any temporary compatibility field is documented as non-advice and cannot be the basis for trusted readiness.
- Missing DQ, unavailable DQ, `NOT_READY`, `UNUSABLE`, stale, blocker-present, and `eligibleForSignals=false` states hard-block paper-review readiness unless a Product Owner approved exception is documented.
- `LIMITED` readiness behavior is explicitly decided and surfaced with warnings or blockers.
- API and frontend compatibility risks are listed before code work starts.
- Tests cover the approved DQ hard-block states and no-target semantics without provider or live-data dependency.
- Product language remains research-support oriented and avoids direct financial advice.

## Non-Goals

- No application source or test change in this requirement refinement pass.
- No Prisma schema, route registry, package, provider, startup, generated type, or shared utility change.
- No Strategy Decision source change; the bounded Strategy Decision slice is already complete.
- No Backtesting DQ implementation.
- No frontend implementation until UX scope and file reservations are approved.

## Future File Reservations After Approval

Likely implementation files after accepted contract, QA plan, and work packet:

- `backend/src/modules/trade-plan-risk-engine/**`
- `backend/tests/modules/trade-plan-risk-engine/**`
- `frontend/src/features/trade-plan-risk-engine/**` only after frontend scope approval
- `frontend/src/features/today-trade-review/**` only after UX/product approval

## Forbidden Without Separate Approval

- Prisma schema or migrations
- backend or frontend route registries
- shared backend utilities
- shared frontend components
- package manifests or generated files
- provider/live-data workflows
- unrelated Strategy Decision, Signal Generation, Backtesting, Portfolio, Watchlist, Alerts, or Copilot files

## Stop Conditions

- Proposed child implementation cannot stay within the approved backend-only compatibility direction or needs broader target-field migration.
- Proposed child contract contradicts approved DQ hard-block semantics or attempts to narrow `LIMITED` behavior without a later Product Owner decision.
- API compatibility requires cross-module or frontend migration beyond the reserved slice.
- Shared/high-risk file changes become necessary.
- Tests would only preserve current target-price behavior.

## Next Gate

Post-decision backend-only architecture and QA refresh. Do not move to Ready for Implementation until the child work packet reserves exact backend source/test files and confirms no broader API/UI/stored-row migration is needed.
