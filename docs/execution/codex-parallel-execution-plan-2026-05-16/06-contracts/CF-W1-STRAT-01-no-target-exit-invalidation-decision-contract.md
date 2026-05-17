# CF-W1-STRAT-01 No-Target / Exit-Invalidation Decision Contract

Date: 2026-05-17

## Contract Status

Draft only. Blocked by:

- `99-decision-inbox/DECISION-20260517-no-target-exit-invalidation-semantics.md`

## Contract Intent

Replace arbitrary target-price semantics in Strategy Decision outputs with research-support language:

- exit condition,
- invalidation condition,
- risk condition,
- review level,
- evidence,
- reason summary.

## Current Contract Conflict

Current Strategy Decision output includes:

- `riskPlan.targetPrice`,
- `Target price achieved.`,
- a fixed percentage target rationale.

This conflicts with the approved no-arbitrary-target product direction but cannot be corrected safely until Product Owner and Architect decide whether the first slice preserves compatibility fields or changes the DTO shape.

## Draft Output Rules

If a compatibility slice is approved:

- The implementation may keep the existing `riskPlan.targetPrice` TypeScript field only as a compatibility artifact.
- User-facing text must not describe it as a target price or expected return.
- Exit rules must describe rule/evidence events, not price promises.
- Invalidation rules must remain explicit.
- The output must not imply financial advice, target achievement, or guaranteed upside.

If a DTO-breaking slice is approved:

- `targetPrice` must be replaced by a new non-advice model approved by Product Owner and Architect.
- Downstream consumers must be inspected before implementation.

## Boundaries

Allowed for first implementation after decision:

- `strategy-decision-engine` source/tests only.

Not allowed without a separate decision:

- Prisma/schema/migrations.
- Routes.
- Shared utilities or shared UI.
- Package or generated/common fixture changes.
- Frontend implementation.
- Trade Plan source changes.

## Open Architecture Questions

- Should a compatibility field remain temporarily, or should DTO shape change now?
- Should `TradePlanPreview.riskPlan.targetPrice` be deprecated, renamed, or replaced?
- Which downstream consumers currently assume target-price semantics?
- Should Trade Plan target geometry be handled in a separate requirement?

## Architect Recommendation

Keep the first source slice module-local to Strategy Decision and compatibility-preserving unless the Product Owner explicitly approves a broader API migration.
