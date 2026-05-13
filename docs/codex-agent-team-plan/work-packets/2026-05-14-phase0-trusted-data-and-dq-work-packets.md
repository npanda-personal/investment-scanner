# Phase 0 Work Packets - Trusted Data Baseline And Data Quality Tiers

Date: 2026-05-14
Mode: Lead Work Packet Mode
Owner: Senior Fullstack Lead / Orchestrator
Branch: `dev`

## Source Artifacts

- Product brief: [Phase 0 product briefs](../po-briefs/2026-05-14-phase0-trusted-data-and-dq-product-briefs.md)
- Architecture: [Phase 0 pre-architecture](../architecture-contracts/2026-05-14-phase0-trusted-data-and-dq-prearchitecture.md)
- PO clarifications: [Phase 0 architecture clarifications](../po-acceptance/2026-05-14-phase0-architecture-clarifications.md)
- QA plan: [Phase 0 QA plan](../qa-plans/2026-05-14-phase0-trusted-data-and-dq-qa-plan.md)
- Roadmap: [Lead PO autonomous strategy roadmap](../po-roadmaps/2026-05-14-lead-po-autonomous-strategy-roadmap.md)

## Execution Rule

Do not pick parked backlog items while Phase 0 is active. Trusted data and Data Quality tiers are the release gate for later strategy, decision, trade-plan, and automation work.

Every developer must finish one assigned packet at a time, run focused validation before QA, and hand off clear evidence. If QA rejects a packet, the Orchestrator assigns the revision to an available qualified developer with a non-conflicting write scope.

## P0.1A - Market Data Trusted Baseline DTO And Residual States

Priority: 1
Lane: Data Foundation backend
State: `Ready for Implementation`
Mode: `Implementation Mode`
Primary owner: one backend developer

### Goal

Publish an additive trusted-baseline read model from Market Data Foundation so downstream consumers can stop recomputing trust from raw price/provider state.

### Reserved write scope

- `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.repository.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.types.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.validation.ts`
- focused Market Data Foundation tests under `backend/tests/modules/market-data-foundation/`

No Data Quality, frontend, strategy, signal, trade-plan, or Prisma schema files without Orchestrator approval.

### Acceptance criteria

- Market Data exposes instrument-level baseline fields for current trusted-data state, latest completed EOD, stored-through date, required-history status, listing-date status, provider/fallback state, and stable blocker codes.
- Every active scoped stock can be classified into an explicit residual state instead of a generic partial/failure bucket.
- Missing listing date cannot silently promote full backtest readiness.
- Yahoo insufficiency remains distinct from approved free/public fallback exhaustion.
- Existing review-readiness summary remains backward compatible.

### Developer validation before QA

- Run focused Market Data Foundation backend tests.
- Add or update tests for residual-state classification.
- Capture one bounded API payload sample if local services are already running and memory gate is open.
- Record skipped checks with exact reason.

### Next gate

`Ready for QA`

## P0.2A - Data Quality Use-Case Tier Contract

Priority: 2
Lane: Data Foundation / Data Quality backend
State: `Ready for Implementation after P0.1A baseline field names are stable`
Mode: `Implementation Mode`
Primary owner: one Data Quality developer

### Goal

Expose separate Data Quality readiness tiers for daily review, signal, backtest, calibration, and automation using Market Data trusted-baseline truth.

### Reserved write scope

- `backend/src/modules/data-quality-engine/data-quality-engine.service.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.repository.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.types.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.validation.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.controller.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.router.ts`
- focused Data Quality tests under `backend/tests/modules/data-quality-engine/`

Do not edit Market Data Foundation files except through an Orchestrator-approved integration handoff from P0.1A.

### Acceptance criteria

- Data Quality exposes distinct tier states for `dailyReview`, `signal`, `backtest`, `calibration`, and `automation`.
- Tier states support `READY`, `LIMITED`, and `BLOCKED`.
- Automation is always `BLOCKED` in Phase 0 with reason `PHASE0_AUTOMATION_NOT_AUTHORIZED`.
- Backtest/calibration readiness cannot be promoted from shallow history or missing listing-date confidence.
- Existing generic scores and booleans remain transitional evidence, not universal readiness claims.

### Developer validation before QA

- Run focused Data Quality backend tests.
- Add tests proving a stock can be daily-review limited while backtest/calibration remain blocked.
- Add tests proving automation is policy-blocked.
- Verify route validation still clamps bounded batch parameters.

### Next gate

`Ready for QA`

## P0.2B - Data Quality UI Tier Visibility

Priority: 3
Lane: Data Quality frontend
State: `Ready for Implementation after P0.2A response shape is stable`
Mode: `Implementation Mode`
Primary owner: one frontend developer

### Goal

Make the Data Quality UI show use-case readiness tiers and blockers without implying that one generic score authorizes every workflow.

### Reserved write scope

- `frontend/src/features/data-quality-engine/types.ts`
- `frontend/src/features/data-quality-engine/api/dataQualityEngineService.ts`
- `frontend/src/features/data-quality-engine/components/DataQualityEnginePage.tsx`
- `frontend/tests/ui/data-quality-engine.spec.ts`

Do not edit Market Data UI, Today Review, or shared design-system files in this packet.

### Acceptance criteria

- UI shows daily review, signal, backtest, calibration, and automation readiness separately.
- UI shows tier blockers in a blocker-first order.
- Automation copy stays policy-blocked and does not imply broker readiness.
- Existing summary and table remain usable while the tier contract is introduced.

### Developer validation before QA

- Run frontend build.
- Run focused UI smoke for Data Quality only, single worker.
- Capture screenshots or test evidence for tier visibility.

### Next gate

`Ready for QA`

## P0.1B - Conservative Today Review Read-Only Context

Priority: 4
Lane: Today Review consumer
State: `Ready for Architecture after P0.2A/P0.2B stabilize`
Mode: `Architecture Planning Mode`

### Goal

Let Today Review display the trusted-data and Data Quality tier context without changing candidate-generation logic in the first Phase 0 implementation slice.

### Notes

This packet is intentionally not ready for implementation yet. It requires the tier DTO to be stable and QA-signed before any Today Review changes start.

## QA Handoff Standard

QA must verify:

- Market Data remains the source of trusted-data truth.
- Data Quality does not recompute or contradict Market Data baseline.
- Different use cases can have different readiness tiers.
- Automation stays blocked.
- Runtime evidence is bounded and does not start heavy provider jobs.

## Lead Validation Standard

Lead validates after QA that:

- Architect ownership boundaries were followed.
- No shared files were edited outside the packet scope.
- No downstream gate was relaxed to improve counts.
- Developer validation evidence exists before QA evidence.

## Architect Signoff Standard

Architect signs off after post-QA Lead validation, with special attention to:

- DTO compatibility,
- additive design,
- no schema overreach,
- no paid provider or broker scope,
- no duplicate freshness/depth logic in downstream modules.
