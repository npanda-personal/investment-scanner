# CF-W1-STRAT-01 No-Target / Exit-Invalidation Contract

Date: 2026-05-17

## Status

Approved for bounded Strategy Decision Option B-Strict implementation.

## Contract Intent

Strategy Decision outputs must support research review without arbitrary projected target prices or advice-like target language.

## Output Rules

Strategy Decision trusted output must:

- keep entry/review candidates rule-based,
- keep exit conditions rule-based,
- keep invalidation conditions rule-based,
- keep risk review evidence-based,
- use research-support language such as candidate, consider review, risk level, exit condition, invalidation condition, evidence, reason summary, and review level.

Strategy Decision trusted output must not:

- derive an arbitrary projected target such as `latestPrice * 1.15`,
- emit `Target price achieved.`,
- use fixed-percentage target rationale,
- use direct advice language,
- imply guaranteed or expected return.

## Compatibility Field Limitation

`riskPlan.targetPrice` may remain in the module-local DTO as a compatibility field for this slice. It must not contain an arbitrary projected price. It may be `null` when the Strategy Decision output uses rule-based review semantics.

If a future API or UI migration removes, renames, or replaces this field, it requires a separate Product Owner and Architect decision.

## Allowed Wording

- `Exit condition met: momentum evidence weakened.`
- `Risk review required when smart money status turns to DISTRIBUTION.`
- `Invalidation condition met: price closes below SMA50 for 2 consecutive days.`
- `Invalidation condition met: calibrated score drops below 40.`
- `Candidate requires review when market gate closes or data quality becomes NOT_READY.`
- Evidence-based reason summaries tied to SMA50 support, market gate, data quality, calibrated score, and smart-money context.

## Forbidden Wording

- `Target price achieved.`
- `profit target`
- `buy target`
- `sell target`
- `guaranteed`
- `expected return`
- `must buy`
- `must sell`
- fixed-percentage projected target rationale.

## Boundaries

This contract applies only to `strategy-decision-engine` source/tests for the first slice.

Out of scope:

- `trade-plan-risk-engine` target geometry.
- Prisma/schema changes.
- Route registry changes.
- Shared utilities/UI.
- Package/generated/common fixture changes.
- Frontend implementation.
- Angel One, live provider, broker, paid service, or startup/backfill behavior.

## Future Migration Requirements

A later Trade Plan / frontend/API migration must decide whether compatibility fields are removed, renamed, or replaced by a formal review-level/risk-condition model.
