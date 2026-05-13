# Cycle 2 Risk-Fix Architecture Addendum - 2026-05-13

Mode: architecture addendum only  
Runtime started: no  
Source edits performed by this agent: none  
Owned write scope used: this file only

## Scope Reviewed

Reviewed sources:

- `docs/codex-agent-team-plan/architecture-contracts/2026-05-13-cycle2-architecture-contracts.md`
- `docs/codex-agent-team-plan/work-packets/2026-05-13-cycle2-work-packets.md`
- `docs/codex-agent-team-plan/developer-handoffs/2026-05-13-c2-wp02-signal-quality-gap-discovery.md`
- `docs/codex-agent-team-plan/developer-handoffs/2026-05-13-c2-runtime-risk-fixes.md`
- Current diffs for the risk-fix files listed in the runtime-risk handoff

This addendum decides architectural acceptability of the risk-fix slice. It is not post-QA signoff and does not replace focused backend, UI, API, or runtime evidence.

## Decision Summary

Decision: approved as an architecture addendum, with QA still required.

- C2-WP-02 Signal Quality model-version filter is an acceptable approved consumer slice.
- C2-WP-01 lane-click risk fix preserves the Market Data module boundary.
- C2-WP-04 run-level exclusion-summary risk fix preserves the Today Review module boundary.
- The reviewed risk fixes preserve the personal/local/free constraints: no paid services, hosted providers, broker APIs, order placement, live-trading workflow, scheduled background automation, or advice/execution wording were introduced.

## C2-WP-02 Signal Quality Consumer Slice

Decision: approved as a narrow downstream consumer slice for C2-WP-02.

Rationale:

- The Cycle 2 architecture contract explicitly allowed `signal-quality-lab` to filter/group by `modelVersion` after the Signal Generation audit contract was stable.
- The gap discovery correctly identified that Signal Generation exposed and filtered `modelVersion`, while Signal Quality dropped it at its own route/query/UI boundary.
- The risk-fix handoff records Orchestrator-level inclusion of this fix in Revision Mode.
- The implementation remains in Signal Quality-owned files and tests, plus Signal Quality UI tests.
- The backend change adds `modelVersion` to Signal Quality query/recalculation typing and validation, then passes the value through the existing public `SignalGenerationEngineService.signalHistory` / `signalHistoryCount` path.
- The frontend change adds a compact model-version filter and passes the selected value through existing dashboard, history, outcome, and recalculation requests.
- No Prisma/schema change, Signal Generation repository import, Strategy Framework edit, Today Review edit, Trade Plan edit, or shared route/navigation edit is required for the consumer slice.

Architecture constraint:

- Treat this as filter-only consumer behavior. Passing `modelVersion` into the existing Signal Quality recalculation path is acceptable only because it constrains existing Signal Quality-owned outcome evaluation to the selected raw-signal generation version. It must not become new Signal Generation source work, new Signal Quality persistence semantics, or a broader grouping/comparison feature without a separate work packet.

## C2-WP-01 Risk-Fix Boundary Review

Decision: acceptable.

Reviewed changed file:

- `frontend/src/features/market-data-foundation/components/MarketDataStatusPanel.tsx`

Boundary finding:

- The fix remains under the Market Data frontend feature root.
- Lane buttons now use the lane-owned bounded `nextAction.request` for region, asset type, batch size, offset, and retry queue where supplied.
- This aligns with the architecture contract requirement that repair actions are explicit, bounded, scoped to `IN / STOCK`, and Market Data-owned.
- The change does not edit Today Review, Research Hub, Trade Plan Risk Engine, Prisma schema, shared route/navigation files, or upstream/downstream modules.

Residual note:

- QA still needs runtime/API evidence that every lane request stays bounded and that readiness is refreshed before downstream review readiness changes.

## C2-WP-04 Risk-Fix Boundary Review

Decision: acceptable.

Reviewed changed files:

- `backend/src/modules/today-trade-review/today-trade-review.service.ts`
- `backend/tests/modules/today-trade-review/today-trade-review.service.test.ts`

Boundary finding:

- The fix remains within Today Review service/test ownership.
- The added run-level explainability aggregates candidate-level `SIGNAL_MATURITY` and `CALIBRATION` reason evidence into Today Review-owned snapshots.
- It does not edit Signal Quality, Signal Calibration, Strategy Framework, Trade Plan, Market Data, Prisma schema, or frontend/shared route files.
- The implementation uses Today Review's existing upstream service boundary and consumed snapshots/reasons; it does not introduce source-module private repository imports or upstream repair/generation actions.

Residual note:

- QA still needs focused evidence that missing upstream evidence remains conservative and that hard blockers continue to override positive reasons.

## Boundary And Constraint Conclusion

The risk-fix set is architecturally acceptable for QA verification. The Signal Quality model-version fix is approved as the minimal C2-WP-02 consumer slice needed to prevent mixed raw-signal model versions in Signal Quality when a user selects a model-version filter. WP-01 and WP-04 risk fixes preserve module boundaries and local/free constraints.

This addendum does not certify runtime behavior, test completeness, or product acceptance.
