# CF-W1-STRAT-01 - No-Target / Exit-Invalidation Requirement

Date: 2026-05-17

## Status

Blocked by Product Owner and Architect decision.

Decision packet:

- `99-decision-inbox/DECISION-20260517-no-target-exit-invalidation-semantics.md`

## Product Value

Strategy Decision outputs must avoid arbitrary target-price language and must stay framed as research-support evidence. Users should see rule-based exit conditions, invalidation conditions, risk review levels, and evidence summaries rather than implied price promises.

## Current Evidence

- `strategy-decision-engine.service.ts` currently emits `riskPlan.targetPrice` based on a fixed 15% expectation.
- The same output includes `Target price achieved.` as an exit rule.
- The same rationale mentions a target based on a fixed momentum expectation.
- `strategy-decision-engine.types.ts` exposes `riskPlan.targetPrice` in the DTO contract.
- `trade-plan-risk-engine` has separate target geometry and must not be changed as a side effect of this Strategy Decision requirement.

## Candidate Acceptance Criteria

- Trusted Strategy Decision outputs do not introduce arbitrary target-price guidance.
- Exit rules use event/rule/evidence language rather than target-achieved language.
- Invalidation rules remain explicit and rule-based.
- Any compatibility field is clearly documented as non-advice and temporary.
- No Prisma schema, route registry, shared utility, shared UI, package, generated type, startup, provider, Angel One, live provider, or UI change is required for the first slice.
- Trade Plan target-semantics changes remain separate unless explicitly approved.

## Allowed Future Files After Decision

- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.service.ts`
- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.types.ts`
- `backend/tests/modules/strategy-decision-engine/**`

## Forbidden Without Separate Approval

- Prisma schema or migrations.
- Route registries.
- Shared backend utilities.
- Shared UI.
- Package manifests.
- Generated/common fixtures.
- Frontend UI implementation.
- `trade-plan-risk-engine` source unless the Product Owner and Architect approve the broader scope.

## Stop Conditions

- Product semantics for replacement output remain ambiguous.
- DTO/API compatibility needs broader consumer review.
- Trade Plan source changes become required.
- Shared/high-risk file changes are needed.
- Tests would only freeze unsafe target-price behavior.

## Recommendation

Proceed only after the decision packet is resolved. Codex recommends a bounded Strategy Decision compatibility slice first, then a separate Trade Plan target-semantics migration.
