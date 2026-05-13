# C2-WP-03 QA Evidence - Strategy Proof Registry And Evidence Index

Date: 2026-05-13  
QA agent: QA Agent / Orchestrator runtime lane  
Decision: `QA Signed Off`

## Runtime QA Signoff Addendum

Runtime evidence was completed after the earlier blocked review.

- Backend/static QA: passed via focused Strategy Framework backend suite, 3 suites / 17 tests.
- UI runtime smoke: `npm.cmd run test:ui -- strategy-framework.spec.ts --grep "shows proof registry statuses, evidence gaps, and next actions" --workers=1`
- UI result after selector revision: passed, 1 test.
- Proof status coverage: `PROVEN`, `LIMITED`, `UNPROVEN`, `BLOCKED`, and `MISSING` were rendered and asserted with exact/anchored locators.
- Safety proof: strategy proof remains research/backtest evidence only; no paid provider, broker, order placement, live-trading, or advice behavior was introduced.

Final QA decision: `QA Signed Off`.

## Reviewed Sources

- Work packet: [C2-WP-03 - Strategy Proof Registry And Evidence Index](../work-packets/2026-05-13-cycle2-work-packets.md#c2-wp-03---strategy-proof-registry-and-evidence-index)
- Product requirement: [Candidate 3 - Strategy Proof Registry And Evidence Index](../po-roadmap-backlog-2026-05-13-cycle2.md#3-strategy-proof-registry-and-evidence-index)
- Architecture contract: [C2-WP-03 architecture](../architecture-contracts/2026-05-13-cycle2-architecture-contracts.md#c2-wp-03---strategy-proof-registry-and-evidence-index)
- QA plan: [C2-WP-03 QA plan](../qa-plans/2026-05-13-cycle2-qa-plan.md#c2-wp-03---strategy-proof-registry-and-evidence-index)
- Developer handoff: [C2-WP-03 developer handoff](../developer-handoffs/2026-05-13-c2-wp03-developer-handoff.md)

## Changed Files Reviewed

- Backend Strategy Framework: `backend/src/modules/strategy-framework/index.ts`
- Backend Strategy Framework: `backend/src/modules/strategy-framework/strategy-framework.controller.ts`
- Backend Strategy Framework: `backend/src/modules/strategy-framework/strategy-framework.router.ts`
- Backend Strategy Framework: `backend/src/modules/strategy-framework/strategy-framework.service.ts`
- Backend Strategy Framework: `backend/src/modules/strategy-framework/strategy-framework.types.ts`
- Backend Strategy Framework: `backend/src/modules/strategy-framework/strategy-framework.validation.ts`
- Backend focused test: `backend/tests/modules/strategy-framework/strategy-framework.service.test.ts`
- Frontend Strategy Framework API/types/UI: `frontend/src/features/strategy-framework/api/strategyFrameworkApi.ts`
- Frontend Strategy Framework API/types/UI: `frontend/src/features/strategy-framework/types.ts`
- Frontend Strategy Framework API/types/UI: `frontend/src/features/strategy-framework/components/StrategyFrameworkPage.tsx`
- Frontend UI smoke spec: `frontend/tests/ui/strategy-framework.spec.ts`

Repository status includes other Cycle 2 work in Prisma, Signal Generation, Market Data, and Today Review files. Those are outside this WP-03 QA decision except where noted as integration validation supplied by the Orchestrator.

## Acceptance Scenario Status

| Scenario | Status | Evidence |
| --- | --- | --- |
| Strategy Framework exposes proof statuses `PROVEN`, `LIMITED`, `UNPROVEN`, `BLOCKED`, and `MISSING`. | Pass by code review and backend evidence. | Status type added in `strategy-framework.types.ts`; reducer added in `StrategyFrameworkService.proofStatus`; backend tests cover proven, limited, missing, draft/unproven, and blocked rows. |
| Registry list/detail APIs expose proof rows and status counts. | Pass by code review. | Router adds `GET /api/v1/strategies/proof-registry` and `GET /api/v1/strategies/:code/proof`; controller delegates to `proofRegistry` and `proofDetail`; response includes `rows`, `statusCounts`, `scope`, and `selectedTimeframe`. |
| Registry rows include strategy code/version, category, scope, selected timeframe, latest evaluation date, sample sufficiency, performance summary, rating/readiness, warnings/caps, missing evidence reason, and next action. | Pass by code review. | `StrategyProofRegistryRow` includes these fields; `proofRow` maps compact `StrategyPerformanceSummaryDto` fields including CAGR, max drawdown, Sharpe, win rate, profit factor, data coverage, benchmark CAGR, and excess CAGR. |
| Proof is derived from existing strategy definitions and compact backtest summaries, not UI-only labels. | Pass by code review and backend evidence. | `proofRegistry` reads registry definitions and `latestPerformanceForStrategies`; `proofDetail` reads repository performance summaries; frontend consumes API DTOs via `fetchStrategyProofRegistry` and `fetchStrategyProof`. |
| Missing or weak proof remains visible and points to bounded local backtest inspection/run action. | Pass by code review; runtime UI pending. | Service returns missing evidence reasons and `Inspect or run bounded backtest` links scoped with `mode=registered`, `strategyCode`, `timeframe`, `region`, and `assetType`; UI spec fixtures assert missing evidence and next-action link. |
| UI shows proof registry statuses, evidence gaps, warning/cap state, and detail proof context. | Blocked for final signoff. | UI implementation and Playwright spec were reviewed, but focused Playwright runtime evidence is not passed because the run was interrupted during memory cleanup. |
| Trade Plan proof chain and Strategy Decision consume the same proof status contract where included in the slice. | Not included in this implementation slice. | Work packet forbids downstream consumer edits for WP-03; architecture lists those modules as future read-only consumers. No WP-03 rejection for absence of downstream wiring. |
| No workflow implies buy/sell advice, paper readiness without proof, broker use, or live readiness. | Pass by code/text review. | UI uses research-support wording and inspect/review/backtest labels. Prohibited execution wording appears only in existing disclaimers that explicitly say no financial advice, broker execution, live trading, or order placement. |
| No WP-03 schema or forbidden downstream files were edited. | Pass for WP-03 scope by changed-file review. | The WP-03 changed set is limited to Strategy Framework backend/frontend/test files and its handoff. Prisma and downstream edits present in repository status belong to other Cycle 2 work packets, not this WP-03 evidence decision. |

## Validation Already Available

- Backend integrated build: passed.
- Frontend integrated build: passed with Vite large chunk warning only.
- Prisma generate: passed after C2-WP-02 schema integration.
- Focused backend integrated regression: passed, 7 suites / 146 tests across Cycle 2 touched modules.
- C2-WP-03 focused backend test coverage includes `backend/tests/modules/strategy-framework/strategy-framework.service.test.ts`.

## Gaps And Runtime Evidence Pending

- Focused UI smoke is not passed. `frontend/tests/ui/strategy-framework.spec.ts` was part of an interrupted multi-spec Playwright run during memory cleanup, so it cannot be counted as passing evidence.
- No independent live browser/API smoke was run by QA in this pass because this assignment explicitly forbids starting local servers, Playwright, npm, Docker, or browser processes.
- Full downstream runtime alignment with Trade Plan and Strategy Decision remains deferred by work-packet scope. The current acceptance decision covers the Strategy Framework-owned source contract only.

## Decision

`QA Signed Off`

The earlier runtime blocker is resolved by the Runtime QA Signoff Addendum above. The Strategy Framework implementation is accepted for QA after backend/static evidence and focused Proof Registry UI smoke passed.
