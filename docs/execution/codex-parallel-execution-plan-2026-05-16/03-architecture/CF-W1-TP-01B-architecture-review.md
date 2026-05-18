# CF-W1-TP-01B Architecture Review

Date: 2026-05-17

Owner: Team 03 Architecture Factory

## Status

Backend-only child architecture contract prepared. Not Ready for Implementation.

This child slice follows Product Owner approval of `CF-W1-TP-01A` Option B: backend-only compatibility direction.

## Evidence Inspected

- `AGENTS.md`
- `03-architecture/CF-W1-TP-01A-architecture-review.md`
- `04-qa/CF-W1-TP-01A-qa-plan.md`
- `06-contracts/CF-W1-TP-01A-trade-plan-no-target-dq-hard-block-contract.md`
- `07-decisions/DECISION-20260517-trade-plan-no-target-dq-hard-block-resolution.md`
- `08-work-packets/CF-W1-TP-01A-work-packet.md`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.service.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.types.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.geometry.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.md`
- `backend/tests/modules/trade-plan-risk-engine/trade-plan-risk-engine.service.test.ts`
- `backend/tests/trade-plan-risk-engine.paper-readiness.test.ts`

## Current Source Findings

- Trade Plan already consumes `DataQualityEngineService` and persists a Data Quality snapshot.
- `classifyPaperReadiness()` blocks `UNUSABLE` coverage and `ILLIQUID` liquidity, but current generation only warns on `signalReadinessStatus = NOT_READY`.
- `eligibleForSignals=false`, `LIMITED`, and use-case tier `BLOCKED` are not explicit paper-readiness hard blockers.
- Existing target-shaped fields are still present and current tests assert target-style wording such as `Target is modeled at 2R by default.`
- `classifyPaperReadiness()` currently blocks when `plan.target` is missing, which treats target-shaped data as part of trusted paper-readiness.
- Repository/schema changes are not required for the first compatibility slice if behavior stays within generated/read DTO classification and existing JSON snapshots.

## Architecture Decision

Prepare a backend-only child implementation contract for Trade Plan no-target compatibility and Data Quality hard blocking.

The child must:

- keep existing `target` fields for API/storage compatibility only;
- prevent target-shaped fields from being required proof for trusted paper-readiness;
- remove or replace trusted output language that presents a target price, profit target, or projected return as a recommendation;
- use research-support language around review geometry, exit condition, invalidation condition, risk review, and blocker evidence;
- hard-block trusted paper-readiness when Data Quality is missing, not ready, blocked, stale, unusable, illiquid, unsupported, or signal-ineligible.

## Exact Future File Reservations

Allowed files after Ready promotion:

- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.service.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.types.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.md`
- `backend/tests/modules/trade-plan-risk-engine/trade-plan-risk-engine.service.test.ts`
- `backend/tests/trade-plan-risk-engine.paper-readiness.test.ts`

Optional only if implementation proves geometry canonicalization must change:

- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.geometry.ts`

Forbidden unless a new Decision Packet approves broader migration:

- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.repository.ts`
- `backend/tests/modules/trade-plan-risk-engine/trade-plan-risk-engine.repository.test.ts`
- Prisma schema or migrations
- route registries
- frontend Trade Plan or Today Review files
- Today Review backend files
- shared utilities/UI
- package manifests
- generated types
- provider, scheduler, startup/backfill, Angel One, broker, live-provider, paid/cloud, or telemetry flows

## Required Behavior

Data Quality hard blockers:

- Missing Data Quality snapshot blocks trusted paper-readiness.
- `coverageStatus = UNUSABLE` blocks trusted paper-readiness.
- `signalReadinessStatus = NOT_READY` blocks trusted paper-readiness.
- `signalReadinessStatus = LIMITED` is blocked or limited-review-only; it must not be `READY_FOR_PAPER_REVIEW`.
- `liquidityStatus = ILLIQUID` blocks trusted paper-readiness.
- stale hard blocker text in DQ evidence blocks trusted paper-readiness.
- required DQ use-case tier `BLOCKED` blocks trusted paper-readiness.
- `eligibleForSignals = false` blocks trusted paper-readiness when the plan depends on signal/strategy evidence.

No-target compatibility:

- Existing `target` DTO fields remain present for compatibility.
- Target-shaped fields must be documented and tested as modeled review geometry, not a target price, profit target, recommendation, or guarantee.
- Missing `target` must not be the sole blocker for trusted paper-readiness in this compatibility direction.
- Positive readiness reasons must not depend on target-shaped fields.

## Required QA Scenarios

Team 04 should refresh the child QA plan against this backend-only packet before implementation is pulled.

Minimum focused backend scenarios:

- Missing Data Quality blocks trusted paper-readiness.
- `NOT_READY` Data Quality blocks trusted paper-readiness.
- `LIMITED` Data Quality does not become `READY_FOR_PAPER_REVIEW`.
- `eligibleForSignals=false` blocks trusted paper-readiness.
- Compatibility `target` fields are not required as trusted readiness proof.
- Trusted output/test fixtures do not use forbidden language: `price target`, `profit target`, `must buy`, `must sell`, `guaranteed`, `buy now`, `sell now`.
- Existing generation/listing compatibility remains intact.

## Readiness Result

Architecture child contract is prepared for `CF-W1-TP-01B`.

Do not move this item to `Ready for Implementation` until Team 00 promotes the exact file reservation and implementation handoff. Team 04's child QA plan already exists in `04-qa/CF-W1-TP-01B-qa-plan.md`.
