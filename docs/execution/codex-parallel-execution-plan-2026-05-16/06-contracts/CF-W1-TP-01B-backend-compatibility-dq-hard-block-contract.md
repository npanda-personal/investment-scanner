# CF-W1-TP-01B Backend Compatibility And DQ Hard-Block Contract

Date: 2026-05-17

Owner: Team 03 Architecture Factory

## Status

Backend-only child contract prepared. Not Ready for Implementation.

Parent requirement: `CF-W1-TP-01A`

Product Owner decision: `07-decisions/DECISION-20260517-trade-plan-no-target-dq-hard-block-resolution.md`

## Contract Intent

Trade Plan Risk Engine must keep existing target-shaped fields compatible while preventing them from acting as trusted paper-readiness proof or advice-like target-price output.

It must also fail closed when Data Quality is missing or blocked.

## Backend-Only Scope

Allowed behavior changes are limited to Trade Plan backend service/types/docs and focused tests.

Not approved:

- frontend display changes;
- Today Review changes;
- Prisma/schema/migration changes;
- route changes;
- shared utility/UI changes;
- package or generated type changes;
- provider/live-data/startup/backfill changes.

## Target Compatibility Rule

Existing `target` fields may remain present for API/storage compatibility:

- `target.price`
- `target.expectedReturnPercent`
- `target.method`
- `target.quality`
- `target.rationale`

But trusted readiness must not treat these as:

- arbitrary predefined target price;
- profit target;
- predicted return;
- direct recommendation;
- guarantee;
- buy/sell instruction.

Implementation must ensure:

- missing `target` is not the sole paper-readiness blocker;
- positive paper-readiness reasons do not cite target-shaped fields;
- rationale/copy describes modeled review geometry or risk multiple only;
- forbidden product language is absent from trusted Trade Plan outputs and tests.

## Data Quality Hard-Block Rule

Trusted paper-readiness must be blocked by:

- missing Data Quality snapshot;
- `coverageStatus = UNUSABLE`;
- `signalReadinessStatus = NOT_READY`;
- `signalReadinessStatus = LIMITED` unless a later Product Owner policy narrows limited-review behavior;
- `liquidityStatus = ILLIQUID`;
- stale hard blocker in DQ evidence;
- required use-case tier `BLOCKED`;
- `eligibleForSignals = false` when the plan depends on signal/strategy evidence;
- unsupported/scope-mismatch/provider-gap blockers when represented in DQ evidence.

Allowed non-ready statuses:

- `BLOCKED`;
- `INSUFFICIENT_DATA`;
- `WATCH_ONLY` only for accepted limited-review cases, never as paper-ready.

## Type Contract

The child may extend backend-only proof types to carry DQ fields already available from Data Quality snapshots:

- `signalReadinessStatus`
- `eligibleForSignals`
- optional required use-case tier status/reasons

No Data Quality Engine source or public export change is approved.

## File Reservations

Allowed files after Ready promotion:

- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.service.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.types.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.md`
- `backend/tests/modules/trade-plan-risk-engine/trade-plan-risk-engine.service.test.ts`
- `backend/tests/trade-plan-risk-engine.paper-readiness.test.ts`

Optional only with Architect note in the implementation handoff:

- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.geometry.ts`

Forbidden:

- repository source/tests unless a new packet accepts persisted-row behavior changes;
- Prisma/schema/migrations;
- backend/frontend route registries;
- Today Review source/tests;
- frontend source/tests;
- shared utilities/UI;
- package manifests;
- generated types;
- providers, startup/backfill, Angel One, broker, paid/cloud, telemetry, or live-provider flows.

## Test Contract

Focused backend tests must prove:

- missing DQ is not paper-ready;
- `NOT_READY` DQ is not paper-ready;
- `LIMITED` DQ is not paper-ready unless explicitly represented as limited-review-only;
- `eligibleForSignals=false` is not paper-ready;
- `UNUSABLE` and `ILLIQUID` remain blocked;
- missing target compatibility does not by itself block readiness;
- forbidden target/advice language is absent from trusted outputs/model rules.
