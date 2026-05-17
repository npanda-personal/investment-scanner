# TEAM-06 Strategy / Signal / Risk Outbox - Daemon Iteration 3

Date: 2026-05-17

Mode: read-only Trade Plan post-decision readiness pass.

Files changed:

- `17-team-outboxes/TEAM-06-strategy-signal-risk-daemon-2026-05-17-iteration-3.md`

Application source, tests, services, providers, staging, commits, and pushes: none.

## Trigger

Team 06 was relaunched after Product Owner resolved `DECISION-20260517-trade-plan-no-target-dq-hard-block` as Option B: backend-only compatibility direction.

## Current Queue Result

No Team 06 application-code item is Ready for Implementation.

`CF-W1-TP-01A` is policy-resolved but still requires Team 03/04/00 preparation before Team 06 can pull implementation:

- backend-only child packet,
- exact source/test file reservations,
- refreshed QA scenarios,
- proof that frontend, Today Review, Prisma/schema, route registry, shared utility/UI, package/generated, provider, startup/backfill, broad UI, and live-provider changes are excluded.

## Evidence Inspected

- `AGENTS.md`
- `00-control/active-work-board.md`
- `00-control/risk-register.md`
- `07-decisions/DECISION-20260517-trade-plan-no-target-dq-hard-block-resolution.md`
- `10-requirements/CF-W1-TP-01A-trade-plan-no-target-compatibility-dq-hard-block-requirement.md`
- `06-contracts/CF-W1-TP-01A-trade-plan-no-target-dq-hard-block-contract.md`
- `08-work-packets/CF-W1-TP-01A-work-packet.md`
- `04-qa/CF-W1-TP-01A-qa-plan.md`
- `03-architecture/CF-W1-TP-01A-architecture-review.md`
- `12-ready-queue/ready-for-implementation.md`
- `12-ready-queue/blocked-by-decision.md`
- `12-ready-queue/blocked-by-upstream-dependency.md`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.service.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.geometry.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.types.ts`
- `backend/tests/modules/trade-plan-risk-engine/trade-plan-risk-engine.service.test.ts`
- `backend/tests/trade-plan-risk-engine.paper-readiness.test.ts`
- Today Review and frontend Trade Plan/Today Review target-display references by read-only search.

## Key Findings

1. Trade Plan source still computes and emits target-shaped compatibility data as normal model output:
   - `targetRewardRisk` remains request input.
   - `targetPrice` is computed from reward/risk geometry.
   - trusted copy still says target is modeled at 2R or custom R.
   - `result.target` is populated on generated plans.

2. Current DQ behavior is partially hard-blocked, not fully aligned with Option B:
   - `coverageStatus = UNUSABLE` blocks the plan.
   - `liquidityStatus = ILLIQUID` blocks the plan.
   - `signalReadinessStatus = NOT_READY` sets watch/warning behavior, not a hard paper-readiness block.
   - missing DQ is converted into a missing snapshot and paper-readiness blocker later, but needs explicit focused tests for the accepted Option B policy.
   - `eligibleForSignals=false` is stored in the DQ snapshot but was not observed as a direct hard-block in the searched service path.

3. Paper-readiness classification still depends on target/reward geometry:
   - tests assert default 2R target rationale,
   - tests assert concrete target prices,
   - tests assert low reward/risk blocks readiness.

4. Compatibility risk extends outside the first backend child slice:
   - Today Review backend tests and source still use target/reward geometry.
   - frontend Trade Plan and Today Review components render target and modeled reward labels.
   - those files remain out of scope unless a separate UX/API child slice is approved.

## Team 06 Recommendation

Create a backend-only implementation child item:

`CF-W1-TP-01B - Trade Plan compatibility target isolation and DQ hard-block behavior`

Proposed implementation boundary after Team 03/04/00 readiness:

- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.service.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.geometry.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.types.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.md`
- `backend/tests/modules/trade-plan-risk-engine/trade-plan-risk-engine.service.test.ts`
- `backend/tests/trade-plan-risk-engine.paper-readiness.test.ts`

Only reserve `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.repository.ts` and repository tests if the child packet explicitly changes persisted/read compatibility behavior.

## Suggested Backend Acceptance Criteria For CF-W1-TP-01B

- Existing target-shaped output, if retained, is treated as compatibility-only and is not a basis for trusted paper-readiness.
- Trusted output language uses exit condition, invalidation condition, risk review, evidence, data quality, and reason-summary wording.
- `NOT_READY`, missing DQ, `UNUSABLE`, `ILLIQUID`, stale DQ blocker evidence, required use-case `BLOCKED`, and `eligibleForSignals=false` hard-block trusted Trade Plan paper-readiness.
- `LIMITED` remains blocked or limited-review-only.
- Focused tests prove DQ blocker states fail closed without live providers.
- Focused tests prove forbidden target/advice language is absent from trusted output paths touched by the backend slice.

## Stop Conditions

Stop Team 06 implementation if the child slice requires:

- frontend or Today Review changes,
- Prisma/schema or migration changes,
- route registry changes,
- shared backend utility or shared UI changes,
- package or generated type changes,
- provider/startup/backfill changes,
- reinterpretation/removal of stored `target` rows without separate Product Owner and Architect approval.

## Next Gate

Team 03/04/00 should convert the resolved Option B policy and this evidence into a backend-only child work packet with exact reservations and QA scenarios. Team 06 should not edit application code until that Ready promotion exists.
