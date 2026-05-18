# CF-W1-UX-01 - Stock Research Workbench Trust Surfaces Requirement

Date: 2026-05-18

## Status

Parent requirement. The narrowed frontend-only child `CF-W1-UX-01A` is already promoted and in active implementation / QA flow elsewhere. This parent remains open because the source still does not prove verified scope, latest trusted data date, blocker provenance, or downstream widget eligibility. Not Ready for Implementation.

## Product Value

Stock Research Workbench is a direct investor/trader research surface. It already combines price history, performance, peer context, and downstream signal/strategy widgets, so a thin trust layer can make the whole page feel more actionable than the evidence supports.

The active `CF-W1-UX-01A` child only fixes the presentation risk by adding conservative limitation framing from current frontend evidence. The remaining product-value gap is the real trust-evidence follow-on: users still need verified scope, latest trusted data date or data-through date, blocker provenance, and bounded downstream widget eligibility before the page can act as a trustworthy research cockpit instead of a visually safer but still limited context surface.

## Evidence

- `11-module-audits/audit-ux-research-copilot.md` found that Stock Research Workbench shows source, timestamp, and status chips, but does not explain readiness blockers, stale or missing evidence, scope mismatch, or downstream eligibility.
- `backend/src/modules/stock-research-workbench/stock-research-workbench.service.ts` returns only `trust.source`, `trust.last_updated_timestamp`, and `trust.data_status`; it does not expose readiness status, blocker reasons, latest trusted date, or widget eligibility.
- `frontend/src/features/stock-research-workbench/api/stockResearchWorkbenchService.ts` sends only `range`, not `region` or `assetType`, so scope proof is not explicit at the feature boundary.
- `frontend/src/features/stock-research-workbench/components/StockResearchWorkbenchPage.tsx` renders `SignalWidget` and `StrategyDecisionWidget` directly beside the core research overview without a page-level trust gate or reason summary.
- `09-summaries/CF-W1-UX-01-ux-source-mapping.md` confirms the current source can support a frontend-only limitation child, but explicitly holds verified scope, latest trusted data date, DQ-backed blocker reasons, and downstream eligibility for a later backend or cross-feature child.

## Dependencies

- Accepted Lane 3 display-vs-action policy in `CF-W1-L3-DQ-01`.
- The active `CF-W1-UX-01A` child should finish first so the page no longer overclaims from current frontend evidence.
- Copilot trust-language policy in `CF-W1-UX-02` and copy-policy sequencing in `CF-W1-UX-05`.
- Currentness/readiness evidence must consume public upstream outputs and must not duplicate Data Quality or Market Data trust scoring.

## Acceptance Criteria

- A bounded follow-on contract defines additive workbench trust fields for verified scope, latest trusted data date or data-through date, readiness state, blocker reasons, and downstream eligibility.
- The page can explain why research is trusted, limited, or blocked without using advisory language.
- Signal and strategy panels are labeled or gated consistently with the approved research-support policy when readiness is limited or blocked.
- Scope changes and refetch expectations are explicit so cross-region or cross-asset ambiguity is not hidden.
- Focused backend/frontend/UI tests later cover trusted, limited, blocked, stale, and missing-scope scenarios.

## Non-Goals

- No signal-generation, strategy-decision, alert, or watchlist logic rewrite.
- No shared UI, navigation, route registry, Prisma, package, provider, paid/cloud, broker, or telemetry work in the first child.
- No new external AI, recommendation, optimizer, or portfolio-action workflow.

## Likely Owner Team

- Team 03 for the backend trust-evidence child contract and reservation plan.
- Team 08 for feature-level UX/source mapping and later implementation inside `stock-research-workbench`.
- Team 04 for QA planning, including focused UI smoke expectations once a bounded child exists.

## Expected Architecture / QA Gate

- Keep `CF-W1-UX-01A` as the already accepted frontend-only framing child and do not reopen that scope.
- Architecture should define a backend trust-evidence child that is additive to current workbench outputs and uses public upstream readiness outputs only.
- QA should prepare trusted, limited, blocked, stale, and scope-mismatch scenarios before any Team 08 handoff.

## Likely File Ownership Risk

Risk: Medium.

The clean child can stay inside `stock-research-workbench` backend/frontend files plus UI smoke coverage, but risk rises quickly if the child needs shared UI, widget internals, route changes, or fabricated readiness fields.

## Parallel With `CF-W1-SIG-TRIGGER-02A`

Yes for docs-only architecture and QA prep.

This work is in Stock Research Workbench and Team 08's later implementation lane, not in the active Team 06 Signal Generation worktree.

## Next Gate

For the parent follow-on, product refinement is complete enough for Team 03 and Team 08 to prepare the backend trust-evidence child after the active frontend-only child closes. That follow-on must stay bounded to stock-research-workbench-owned files plus approved UI smoke coverage; it must stop if it needs shared UI, widget internals, route changes, or fabricated trust proof.
