# CF-W1-UX-01 - Stock Research Workbench Trust Surfaces Requirement

Date: 2026-05-18

## Status

Audit-derived requirement draft. Not Ready for Implementation.

## Product Value

Stock Research Workbench is a direct investor/trader research surface. It already combines price history, performance, peer context, and downstream signal/strategy widgets, so a thin trust layer can make the whole page feel more actionable than the evidence supports. Users need a bounded trust surface that explains readiness blockers, scope, latest trusted data date, and whether downstream signal/decision panels are safe to treat as research-only context versus blocked or limited context.

## Evidence

- `11-module-audits/audit-ux-research-copilot.md` found that Stock Research Workbench shows source, timestamp, and status chips, but does not explain readiness blockers, stale or missing evidence, scope mismatch, or downstream eligibility.
- `backend/src/modules/stock-research-workbench/stock-research-workbench.service.ts` returns only `trust.source`, `trust.last_updated_timestamp`, and `trust.data_status`; it does not expose readiness status, blocker reasons, latest trusted date, or widget eligibility.
- `frontend/src/features/stock-research-workbench/api/stockResearchWorkbenchService.ts` sends only `range`, not `region` or `assetType`, so scope proof is not explicit at the feature boundary.
- `frontend/src/features/stock-research-workbench/components/StockResearchWorkbenchPage.tsx` renders `SignalWidget` and `StrategyDecisionWidget` directly beside the core research overview without a page-level trust gate or reason summary.

## Dependencies

- Accepted Lane 3 display-vs-action policy in `CF-W1-L3-DQ-01`.
- Copilot trust-language policy in `CF-W1-UX-02` and copy-policy sequencing in `CF-W1-UX-05`.
- Currentness/readiness evidence must consume public upstream outputs and must not duplicate Data Quality or Market Data trust scoring.

## Acceptance Criteria

- A bounded workbench trust contract defines additive, feature-local trust fields for scope, latest trusted data date or data-through date, readiness state, blocker reasons, and downstream eligibility.
- The page can explain why research is trusted, limited, or blocked without using advisory language.
- Signal and strategy panels are labeled or gated consistently with the approved research-support policy when readiness is limited or blocked.
- Scope changes and refetch expectations are explicit so cross-region or cross-asset ambiguity is not hidden.
- Focused backend/frontend/UI tests later cover trusted, limited, blocked, stale, and missing-scope scenarios.

## Non-Goals

- No signal-generation, strategy-decision, alert, or watchlist logic rewrite.
- No shared UI, navigation, route registry, Prisma, package, provider, paid/cloud, broker, or telemetry work in the first child.
- No new external AI, recommendation, optimizer, or portfolio-action workflow.

## Next Gate

Product refinement is complete enough for Team 03/08 architecture and UX contract prep. The first implementation child should stay bounded to stock-research-workbench files and approved UI smoke coverage only after Team 00 records exact file reservations.
