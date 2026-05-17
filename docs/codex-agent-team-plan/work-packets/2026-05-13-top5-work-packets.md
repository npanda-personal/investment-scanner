# Top 5 Orchestrator Work Packets - 2026-05-13

## Sources Loaded

- `AGENTS.md`
- `docs/instructions.md`
- `docs/codex-agent-team-plan/codex-agent-team.md`
- `docs/codex-agent-team-plan/team-operating-model.md`
- `docs/codex-agent-team-plan/sdlc-operating-model.md`
- `docs/codex-agent-team-plan/active-work-board.md`
- `docs/codex-agent-team-plan/po-test-report-2026-05-13.md`
- `docs/codex-agent-team-plan/architecture-contracts/2026-05-13-top5-architecture-contracts.md`
- `docs/codex-agent-team-plan/qa-plans/2026-05-13-top5-qa-plan.md`

## Orchestrator Batch Decision

- Brief 1 and Brief 2 can move to `Ready for Implementation` immediately.
- Brief 4 can move to Lane 3 `Discovery Mode` only. It is cross-module and must not start source edits until upstream readiness/evidence contracts from Briefs 1 and 2 are stable or the Orchestrator issues a narrower implementation packet.
- Brief 3 waits behind Brief 2 because calibration guardrails depend on stable signal outcome maturity diagnostics.
- Brief 5 waits behind the current Lane 2 WIP and should not edit Today Review while Brief 1 owns Today Review readiness consumption.

## Common Guardrails

- No paid libraries, paid providers, paid AI services, paid hosted tests, broker APIs, or live-trading workflows.
- Keep language research-support only. Do not add buy/sell/execute/order-placement language.
- Keep all backend changes inside module boundaries unless this work packet explicitly reserves shared files.
- Do not edit `backend/prisma/schema.prisma`, package manifests, route registries, shared components, CI files, or generated files in this pass.
- If a developer needs an unreserved file, stop and ask the Orchestrator. The Orchestrator will decide whether to expand the reservation, route to Architect, or defer.
- Each implementation handoff must include changed files, behavior changed, tests run/skipped, live-data checks, blockers, and next gate.

## WP-2026-05-13-01 - Trusted Review Universe Readiness And Repair Path

- Product brief: [Brief 1](../po-test-report-2026-05-13.md#brief-1---trusted-review-universe-readiness-and-repair-path)
- Architecture contract: [Item 1](../architecture-contracts/2026-05-13-top5-architecture-contracts.md#brief-1---trusted-review-universe-readiness-and-repair-path)
- QA plan: [Item 1](../qa-plans/2026-05-13-top5-qa-plan.md#brief-1---trusted-review-universe-readiness-and-repair-path)
- State: `Ready for Implementation`
- Mode: `Implementation Mode`
- Owner: Lane 1 Developer Agent
- Lane/module: Lane 1, Market Data / Data Quality
- Next gate: `Ready for QA`

### Reserved Write Scope

- `backend/src/modules/market-data-foundation/*`
- `backend/tests/modules/market-data-foundation/*`
- `frontend/src/features/market-data-foundation/*`
- `frontend/tests/ui/market-data-foundation.spec.ts`
- `backend/src/modules/data-quality-engine/*`
- `backend/tests/modules/data-quality-engine/*`
- `frontend/src/features/data-quality-engine/*`
- `frontend/tests/ui/data-quality-engine.spec.ts`
- `backend/src/modules/today-trade-review/*`
- `backend/tests/modules/today-trade-review/*`
- `frontend/src/features/today-trade-review/*`
- `frontend/tests/ui/today-trade-review.spec.ts`

### Required Implementation Outcome

- Add or extend one scoped `IN / STOCK` review-readiness summary owned by Market Data Foundation.
- Include review mode, trust status, counts, blocker categories, and one bounded next action.
- Make Today Review consume or display the same readiness state without contradicting Market Data/Data Quality.
- Keep repair actions explicit and bounded; no full-universe/provider-heavy action can run silently.
- Update module docs for changed API/DTO/workflow behavior.

### Required Verification

- Backend tests for Market Data readiness calculation and Today Review consumption.
- UI smoke coverage for Market Data/Data Quality readiness and Today Review matching mode.
- `frontend` build.
- Authenticated local-data check comparing Market Data/Data Quality readiness with Today Review.

## WP-2026-05-13-02 - Signal Outcome Maturity And Evaluable Coverage

- Product brief: [Brief 2](../po-test-report-2026-05-13.md#brief-2---signal-outcome-maturity-and-evaluable-coverage)
- Architecture contract: [Item 2](../architecture-contracts/2026-05-13-top5-architecture-contracts.md#brief-2---signal-outcome-maturity-and-evaluable-coverage)
- QA plan: [Item 2](../qa-plans/2026-05-13-top5-qa-plan.md#brief-2---signal-outcome-maturity-and-evaluable-coverage)
- State: `Ready for Implementation`
- Mode: `Implementation Mode`
- Owner: Lane 2 Developer Agent
- Lane/module: Lane 2, Strategy / Signals / Risk
- Next gate: `Ready for QA`

### Reserved Write Scope

- `backend/src/modules/signal-quality-lab/*`
- `backend/tests/modules/signal-quality-lab/*`
- `frontend/src/features/signal-quality-lab/*`
- `frontend/tests/ui/signal-quality-lab.spec.ts`

### Required Implementation Outcome

- Expose selected horizon, total signals, mature/evaluable signals, not-yet-mature signals, missing-price signals, and insufficient-future-price counts.
- Add or normalize `evidenceUsability` as `USABLE`, `LIMITED`, or `UNAVAILABLE`.
- Make zero-evaluable states explicit and actionable without displaying misleading win-rate or quality confidence.
- Keep horizon samples separate; do not mix short-horizon evidence into selected long-horizon evidence.
- Keep recalculation scoped and bounded.
- Update module docs for changed API/DTO/workflow behavior.

### Required Verification

- Backend tests for maturity buckets, horizon separation, zero-evaluable states, missing prices, and bounded recalculation.
- UI smoke coverage for Signal Quality horizon availability and zero-evaluable explanation.
- `frontend` build.
- Authenticated local-data check comparing `20D` with one shorter horizon.

## WP-2026-05-13-04D - Cross-Module Actionability Discovery

- Product brief: [Brief 4](../po-test-report-2026-05-13.md#brief-4---cross-module-actionability-consistency)
- Architecture contract: [Item 4](../architecture-contracts/2026-05-13-top5-architecture-contracts.md#brief-4---cross-module-actionability-consistency)
- QA plan: [Item 4](../qa-plans/2026-05-13-top5-qa-plan.md#brief-4---cross-module-actionability-consistency)
- State: `Architecture Ready`
- Mode: `Discovery Mode`
- Owner: Lane 3 Developer Agent
- Lane/module: Lane 3, Portfolio / Watchlists / Alerts / UX
- Next gate: Orchestrator decision for implementation packet

### Reserved Write Scope

- `docs/codex-agent-team-plan/work-packets/2026-05-13-brief4-discovery-notes.md`

### Read-Only Scope

- `backend/src/modules/research-hub/*`
- `backend/tests/modules/research-hub/*`
- `frontend/src/features/research-hub/*`
- `frontend/tests/ui/research-hub.spec.ts`
- `backend/src/modules/today-trade-review/*`
- `backend/src/modules/strategy-decision-engine/*`
- `backend/src/modules/trade-plan-risk-engine/*`

### Required Discovery Outcome

- Identify the smallest non-conflicting implementation slice for Research Hub actionability.
- Confirm which upstream public outputs can be consumed now and which must wait for Briefs 1, 2, 3, or 5.
- Propose exact file reservations for a future implementation packet.
- Do not edit source code, tests, module docs, shared files, or UI in this discovery pass.

## WP-2026-05-13-04A - Conservative Research Hub Actionability Adapter

- Product brief: [Brief 4](../po-test-report-2026-05-13.md#brief-4---cross-module-actionability-consistency)
- Architecture contract: [Item 4](../architecture-contracts/2026-05-13-top5-architecture-contracts.md#brief-4---cross-module-actionability-consistency)
- QA plan: [Item 4](../qa-plans/2026-05-13-top5-qa-plan.md#brief-4---cross-module-actionability-consistency)
- Discovery notes: [Brief 4 Discovery Notes](2026-05-13-brief4-discovery-notes.md)
- State: `Ready for Implementation`
- Mode: `Implementation Mode`
- Owner: Lane 3 Developer Agent
- Lane/module: Lane 3, Research Hub
- Next gate: `Ready for QA`

### Reserved Write Scope

- `backend/src/modules/research-hub/research-hub.types.ts`
- `backend/src/modules/research-hub/research-hub.service.ts`
- `backend/src/modules/research-hub/research-hub.md`
- `backend/tests/modules/research-hub/research-hub.service.test.ts`
- `frontend/src/features/research-hub/api/researchHubApi.ts`
- `frontend/src/features/research-hub/components/ResearchOverviewPage.tsx`
- `frontend/src/features/research-hub/index.tsx`
- `frontend/tests/ui/research-hub.spec.ts`

### Forbidden Scope

- Do not edit Today Review, Trade Plan, Strategy Decision, Signal Quality, Signal Calibration, shared frontend/backend files, route registries, Prisma schema, package manifests, or generated files.
- Do not introduce a shared enum/component. Keep the adapter Research Hub-local and additive.
- Do not mark actionability `READY` when Today Review, Trade Plan, Signal Quality, or Calibration readiness is unavailable or unstable.

### Required Implementation Outcome

- Add an additive `actionability` object to the Research Hub overview response and UI.
- Use the architecture vocabulary: `READY`, `LIMITED`, `BLOCKED`, `UNPROVEN`, `INSUFFICIENT_DATA`.
- Keep `canReviewActionableSetups = false` unless Research Hub can prove both review readiness and trade-plan readiness from stable public outputs.
- Treat missing or unavailable upstream evidence conservatively as `LIMITED` or `INSUFFICIENT_DATA`, never optimistic readiness.
- Preserve existing Research Hub behavior and keep market environment separate from actionable setup readiness.
- Update Research Hub docs for the new additive response shape and conservative semantics.

### Required Verification

- Backend Research Hub tests for reducer precedence, unavailable upstream evidence, no optimistic readiness, and research-support language.
- UI smoke for the new actionability summary.
- `frontend` build.
- Authenticated local-data check that Research Hub no longer implies actionable setups are ready solely because market environment is healthy.

## WP-2026-05-13-03A - Calibration Readiness Source Guardrails

- Product brief: [Brief 3](../po-test-report-2026-05-13.md#brief-3---calibration-readiness-and-confidence-guardrails)
- Architecture contract: [Item 3](../architecture-contracts/2026-05-13-top5-architecture-contracts.md#brief-3---calibration-readiness-and-confidence-guardrails)
- QA plan: [Item 3](../qa-plans/2026-05-13-top5-qa-plan.md#brief-3---calibration-readiness-and-confidence-guardrails)
- State: `Ready for Implementation`
- Mode: `Implementation Mode`
- Owner: Lane 2 Developer Agent
- Lane/module: Lane 2, Signal Calibration
- Next gate: `Ready for QA`

### Reserved Write Scope

- `backend/src/modules/signal-calibration-engine/*`
- `backend/tests/modules/signal-calibration-engine/*`
- `frontend/src/features/signal-calibration-engine/*`
- `frontend/tests/ui/signal-calibration-engine.spec.ts`

### Forbidden Scope

- Do not edit Signal Quality Lab files while WP-2026-05-13-02 is in QA.
- Do not edit Today Review, Strategy Decision, Research Hub, Trade Plans, Prisma schema, route registries, shared files, package manifests, generated files, or CI files.
- Do not persist new calibration readiness fields in this slice; schema changes require a separate Orchestrator/Architect packet.

### Required Implementation Outcome

- Add additive calibration readiness/evidence DTO fields on Calibration-owned responses only.
- Use Signal Quality's additive diagnostics contract if available through existing public API/service boundaries; otherwise compute source-local conservative readiness and document the limitation.
- For zero evaluated samples, set downstream influence to `NONE`, confidence tier to `INSUFFICIENT_SAMPLE`, calibration applied to false or limited as appropriate, and authoritative score to `RAW_SCORE` or `NO_SCORE`.
- Existing rows without readiness evidence must fail conservative; they cannot appear high confidence.
- Update Signal Calibration UI to show sample sufficiency, confidence tier, authoritative score, and low/zero-sample warning.
- Update module docs for the additive response shape and conservative downstream influence semantics.

### Required Verification

- Backend Signal Calibration tests for zero samples, low samples, sufficient samples, authoritative score, downstream influence, and bounded batch behavior.
- UI smoke for Signal Calibration readiness guardrails.
- `frontend` build.
- Authenticated local-data check for current `IN / STOCK` calibration state.

## WP-2026-05-13-05A - Trade Plan Proof Chain Source Funnel

- Product brief: [Brief 5](../po-test-report-2026-05-13.md#brief-5---trade-plan-paper-readiness-proof-chain)
- Architecture contract: [Item 5](../architecture-contracts/2026-05-13-top5-architecture-contracts.md#brief-5---trade-plan-paper-readiness-proof-chain)
- QA plan: [Item 5](../qa-plans/2026-05-13-top5-qa-plan.md#brief-5---trade-plan-paper-readiness-proof-chain)
- State: `Ready for Implementation`
- Mode: `Implementation Mode`
- Owner: Lane 2 Developer Agent
- Lane/module: Lane 2, Trade Plan Risk Engine
- Next gate: `Ready for QA`

### Reserved Write Scope

- `backend/src/modules/trade-plan-risk-engine/*`
- `backend/tests/modules/trade-plan-risk-engine/*`
- `backend/tests/trade-plan-risk-engine.paper-readiness.test.ts`
- `frontend/src/features/trade-plan-risk-engine/*`
- `frontend/tests/ui/trade-plan-risk-engine.spec.ts`

### Forbidden Scope

- Do not edit Today Review in this slice. Today Review consumption of paper-readiness remains a later integration packet after WP-01 clears Lead/Architect gates.
- Do not edit Research Hub, Signal Calibration, Signal Quality, Strategy Decision, shared files, Prisma schema, route registries, package manifests, generated files, or CI.
- Do not persist new normalized proof-chain stage tables in this slice.

### Required Implementation Outcome

- Add an additive `paperReadinessProofChain` object to Trade Plan-owned funnel/detail/list responses where practical.
- Include scoped generated-plan count, paper-ready count, stage counts, top blockers, and prioritized blockers.
- Keep hard blockers authoritative and ensure positive readiness reasons do not appear as current authority beside active hard blockers.
- Each top blocker should point to a resolving module/action route when the route is known.
- Batch generation remains bounded and scoped to `IN / STOCK`.
- Update Trade Plan module docs for the additive proof-chain contract and canonical blocker behavior.

### Required Verification

- Backend Trade Plan tests for proof-chain aggregation, hard-blocker precedence, prioritized blocker counts, and list/detail/funnel consistency where touched.
- UI smoke for the Trade Plan proof-chain/funnel display.
- `frontend` build.
- Authenticated local-data/API check for current no-paper-ready state and top blockers.
- Before starting process-heavy validation, check laptop memory utilization. Do not start builds/tests/browser runs when memory is at or above 95%; after a 95% gate, wait until memory is below 90%.

## Sequenced Items Not Yet Ready

### Brief 3 - Calibration Readiness And Confidence Guardrails

- Current state: `Ready for Implementation` for source guardrails slice WP-2026-05-13-03A.
- Current mode: `Implementation Mode`.
- Remaining blocker: downstream Today Review/Strategy Decision consumption waits for separate packet after source guardrails are stable.
- Next action: Lane 2 implements Calibration-owned source guardrails without touching Signal Quality files under QA.

### Brief 5 - Trade Plan Paper-Readiness Proof Chain

- Current state: `Ready for Implementation` for source funnel slice WP-2026-05-13-05A.
- Current mode: `Implementation Mode`.
- Remaining blocker: Today Review consumption remains deferred until WP-01 clears Lead/Architect gates.
- Next action: Lane 2 implements Trade Plan-owned proof-chain source funnel without touching Today Review.
