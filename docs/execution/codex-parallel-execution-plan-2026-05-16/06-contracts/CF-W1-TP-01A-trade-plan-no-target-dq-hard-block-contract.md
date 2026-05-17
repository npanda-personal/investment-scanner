# CF-W1-TP-01A Trade Plan No-Target Compatibility And DQ Hard-Block Contract

Date: 2026-05-17

## Status

Product policy accepted. Implementation remains blocked.

Product Owner approved Option B on 2026-05-17. Resolution: `07-decisions/DECISION-20260517-trade-plan-no-target-dq-hard-block-resolution.md`.

Implementation still requires a backend-only child work packet, refreshed QA scenarios, exact file reservations, and proof that frontend, Today Review, Prisma/schema, route, shared, package, generated, provider, startup/backfill, broad UI, and live-provider changes are excluded.

## Contract Intent

Trade Plan Risk Engine must support research review without arbitrary target-price semantics, advice-like language, or paper-readiness claims when Data Quality is missing or blocked.

This contract is separate from completed `CF-W1-STRAT-01`, which only handled the bounded Strategy Decision compatibility slice.

## Proposed No-Target Rule

Trusted Trade Plan output should emphasize:

- entry condition,
- stop/invalidation condition,
- exit condition,
- risk review condition,
- reward/risk geometry only as a review calculation when approved,
- data quality proof,
- strategy proof,
- reason summary and blockers.

Trusted output should not present a projected price as a target, profit target, recommendation, guaranteed outcome, or direct financial advice.

## Compatibility Constraint

The current Trade Plan API and UI still expose `target` fields and target/reward displays. Removing, renaming, nulling, or reinterpreting those fields is a product/API/UI compatibility decision.

A future bounded backend slice may keep the persisted `target` JSON field as a compatibility field only if Product Owner and Architect acceptance explicitly define the allowed semantics.

## Proposed DQ Hard-Block Rule

The following states should block paper-readiness and trusted plan publication if accepted:

- missing Data Quality snapshot,
- `coverageStatus = UNUSABLE`,
- `signalReadinessStatus = NOT_READY`,
- `liquidityStatus = ILLIQUID`,
- stale price blocker present in DQ evidence,
- required use-case tier is `BLOCKED`,
- `eligibleForSignals = false` when the plan depends on signal/strategy evidence.

`LIMITED` is blocked or limited-review-only until a later Product Owner-approved policy narrows it.

## Forbidden Until Decision

Do not change:

- Trade Plan source or tests,
- Today Review source or tests,
- frontend Trade Plan or Today Review displays,
- Prisma schema or migrations,
- route registries,
- shared UI/utilities,
- package files or generated types.

Do not silently change the meaning of existing stored Trade Plan rows.

## Decision Resolution Note

The parent Decision Packet was resolved on 2026-05-17 as Option B. A future Decision Packet is needed only if implementation will:

- remove, rename, or migrate target-shaped API/stored fields,
- change `LIMITED` from blocked or limited-review-only into a broader trusted state,
- migrate Today Review or frontend copy,
- require Prisma/schema, route, shared, package, generated, provider, startup/backfill, broad UI, or live-provider changes.

## Acceptance Criteria For Future Approval

- No arbitrary target-price wording or advice language in trusted Trade Plan output.
- Data Quality hard blockers prevent paper-readiness claims.
- Existing API/UI compatibility impact is explicitly accepted or split into child slices.
- Tests prove missing/blocked DQ fails closed.
- Tests prove forbidden wording is absent from trusted outputs.

## Team 03 Relaunch Architecture Notes - 2026-05-17

Readiness result: docs-only contract remains valid, but app-code work is blocked.

Current source structure confirms Trade Plan still has target geometry and Data Quality snapshot fields. The architecture risk is not only wording; it includes API compatibility, persisted JSON interpretation, Today Review adjacency, and frontend display semantics.

Recommended decision posture:

- keep any `target` field as compatibility-only unless a separate migration removes or renames it,
- exclude compatibility target data from trusted paper-readiness,
- hard-block trusted paper-readiness on missing DQ, `coverageStatus = UNUSABLE`, `signalReadinessStatus = NOT_READY`, `liquidityStatus = ILLIQUID`, stale hard blockers, required use-case tier `BLOCKED`, and `eligibleForSignals = false`,
- treat `LIMITED` as blocked or limited-review-only until Product Owner and Architect decide otherwise,
- keep frontend and Today Review changes out of the first backend-only child slice unless explicitly reserved.

No source, test, API, UI, Prisma, route, shared, package, generated, provider, startup, or live-data files are reserved by this contract.
