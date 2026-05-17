# DECISION-20260517 No-Target / Exit-Invalidation Semantics Resolution

Date: 2026-05-17

## Decision

Product Owner approved Option B-Strict.

This authorizes a bounded Strategy Decision compatibility slice only.

## Approved Policy

- No arbitrary predefined target prices.
- Trusted Strategy Decision output must not derive projected targets such as `latestPrice * 1.15`.
- Entry/review candidates must be rule-based.
- Exit conditions must be rule-based.
- Invalidation conditions must be rule-based.
- Risk review must be evidence-based.
- User-facing wording must avoid financial-advice language.
- Compatibility fields may remain only when needed to avoid schema, route, shared type, or UI changes.

## Compatibility Rule

The current Strategy Decision DTO may preserve the `riskPlan.targetPrice` field only as compatibility data. The field must not carry an arbitrary projected target value or advice-like target semantics.

If current module-local types can represent the field as `null`, `undefined`, omitted, or another compatibility-safe value without schema, route, shared, package, generated, frontend, or Trade Plan changes, the implementation may use that representation.

## Approved Boundaries

Allowed implementation files:

- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.service.ts`
- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.types.ts`
- `backend/tests/modules/strategy-decision-engine/**`

Not approved:

- Prisma schema or migrations.
- Backend or frontend route registries.
- Shared backend utilities.
- Shared UI.
- Package manifests.
- Generated/common fixtures.
- Frontend/UI implementation.
- `trade-plan-risk-engine` source or tests.
- Angel One, live providers, broker credentials, paid services, startup/backfill, or push.

## Non-Goal

This decision does not complete the broader Trade Plan target migration. Trade Plan target geometry remains blocked for a separate contract and implementation wave.

## Follow-On Status

`DECISION-20260517-no-target-exit-invalidation-semantics` is resolved for the bounded Strategy Decision Option B-Strict slice. Follow-on Trade Plan target migration remains a separate blocked/future item.
