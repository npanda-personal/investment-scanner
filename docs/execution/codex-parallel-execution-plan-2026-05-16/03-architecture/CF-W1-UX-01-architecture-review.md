# CF-W1-UX-01 Architecture Review

Date: 2026-05-18

Owner: Team 03 Architecture Factory

## Status

Parent `CF-W1-UX-01` is not Ready for Implementation.

One bounded first child is architecture-ready for future Ready review:

- frontend-only Stock Research Workbench trust framing based on current source-supported evidence;
- no backend DTO expansion in the first child;
- no shared UI, navigation, route, package, schema, generated, provider, Signal, or Strategy scope.

## Evidence Inspected

- `AGENTS.md`
- `10-requirements/CF-W1-UX-01-stock-research-workbench-trust-surfaces-requirement.md`
- `10-requirements/CF-W1-UX-02-copilot-trust-ux-requirement.md`
- `10-requirements/CF-W1-HCTX-01-historical-context-explainability-requirement.md`
- `10-requirements/CF-W1-MCTX-01-market-context-regime-evidence-requirement.md`
- `11-module-audits/audit-ux-research-copilot.md`
- `06-contracts/CF-W1-L3-DQ-01-lane3-readiness-consumer-policy-contract.md`
- `06-contracts/CF-W1-UX-02-copilot-trust-ux-contract.md`
- `08-work-packets/CF-W1-UX-02-work-packet.md`
- `backend/src/modules/stock-research-workbench/stock-research-workbench.md`
- `backend/src/modules/stock-research-workbench/stock-research-workbench.types.ts`
- `backend/src/modules/stock-research-workbench/stock-research-workbench.service.ts`
- `backend/src/modules/stock-research-workbench/stock-research-workbench.controller.ts`
- `backend/src/modules/stock-research-workbench/stock-research-workbench.validation.ts`
- `backend/src/modules/stock-research-workbench/stock-research-workbench.router.ts`
- `backend/tests/modules/stock-research-workbench/stock-research-workbench.service.test.ts`
- `backend/tests/modules/stock-research-workbench/stock-research-workbench.routes.test.ts`
- `backend/tests/modules/stock-research-workbench/stock-research-workbench.validation.test.ts`
- `frontend/src/features/stock-research-workbench/api/stockResearchWorkbenchService.ts`
- `frontend/src/features/stock-research-workbench/types.ts`
- `frontend/src/features/stock-research-workbench/components/StockResearchWorkbenchPage.tsx`
- `frontend/src/features/signal-generation-engine/components/SignalWidget.tsx`
- `frontend/src/features/strategy-decision-engine/components/StrategyDecisionWidget.tsx`

## Current Source Findings

- `stock-research-workbench.service.ts` returns only market-data-style trust fields at page level: `source`, `last_updated_timestamp`, and `data_status`.
- The workbench contract does not expose Data Quality readiness, blocker reasons, stale-policy reasons, verified scope, latest trusted data date, or downstream widget eligibility.
- `stock-research-workbench.controller.ts` and `stock-research-workbench.validation.ts` accept `instrumentId` and `range` only. `region` and `assetType` are not passed through the feature boundary.
- `StockResearchWorkbenchPage.tsx` does not use `useMarketScope()`. The page therefore shows no current scope context and no explicit scope-verification limitation.
- The page renders `SignalWidget` and `StrategyDecisionWidget` directly. Those widgets accept only `instrumentId`; they do not expose a page-owned trust-state prop or a caller-provided gating contract.
- `StrategyDecisionWidget.tsx` already depends on shared UI and separate feature APIs. That makes widget-level trust behavior a cross-feature concern and not a safe first child for this requirement.

## Module Boundary Review

The safe first child belongs to the Stock Research Workbench frontend feature only.

Reasons:

- current source-supported trust evidence already reaches the page through the existing workbench response;
- the page can add explicit limitation framing without changing backend, route, shared UI, or downstream feature contracts;
- true readiness, blocker, and downstream-eligibility semantics depend on upstream Data Quality and separate Signal / Strategy consumers, which are outside the first child boundary.

The following stay out of scope for the first child:

- `backend/src/modules/stock-research-workbench/**`
- `frontend/src/features/signal-generation-engine/**`
- `frontend/src/features/strategy-decision-engine/**`
- `frontend/src/shared/**`
- backend or frontend route registries

## Architecture Decision

Prepare `CF-W1-UX-01` first as a conservative frontend-only child that makes current limitations explicit instead of inventing trust proof.

Recommended first child semantics:

```ts
type WorkbenchTrustSurfaceState = 'LIMITED_CONTEXT' | 'BLOCKED_CONTEXT';

type DownstreamPanelState = 'UNVERIFIED_CONTEXT_ONLY' | 'HIDDEN_BLOCKED';

interface WorkbenchTrustSurface {
  requestedScope: {
    region: string;
    assetType: string;
  } | null;
  scopeVerification: 'UNVERIFIED_AT_FEATURE_BOUNDARY';
  latestEvidenceTimestamp: string | null;
  evidenceSource: string | null;
  marketDataStatus: string;
  state: WorkbenchTrustSurfaceState;
  blockerReasons: string[];
  warningReasons: string[];
  downstreamPanels: {
    signalWidget: DownstreamPanelState;
    strategyDecisionWidget: DownstreamPanelState;
  };
}
```

Required conservative mapping:

- `MISSING` or `ERROR` market-data status: `BLOCKED_CONTEXT`.
- `PARTIAL` or `DELAYED` market-data status: `LIMITED_CONTEXT`.
- `COMPLETE` market-data status: still `LIMITED_CONTEXT` in the first child, because DQ readiness, verified scope, and downstream widget eligibility are not exposed by current source.
- missing timestamp: add explicit limitation or blocker reason; do not synthesize a trusted date.
- downstream widgets may appear only as unverified research context unless the page is blocked.

This first child must never claim:

- `READY`
- `TRUSTED`
- verified scope match
- DQ-backed eligibility
- strategy/signal reliability

## Why Backend Expansion Is Deferred

Backend changes are not approved for the first child because the current backend cannot prove the fields the requirement ultimately wants:

- verified `region` / `assetType` scope handling;
- Data Quality readiness state;
- blocker provenance aligned to Lane 3 consumer policy;
- latest trusted data date rather than a raw source timestamp;
- downstream eligibility for Signal and Strategy widgets.

If implementation needs any of those, it must stop and return for a later backend child rather than inferring them in UI.

## Exact Future File Reservations For The First Child

- `frontend/src/features/stock-research-workbench/components/StockResearchWorkbenchPage.tsx`
- `frontend/src/features/stock-research-workbench/types.ts`
- `frontend/tests/ui/stock-research-workbench.spec.ts`

## Forbidden Files For The First Child

- `backend/src/modules/stock-research-workbench/**`
- `backend/tests/modules/stock-research-workbench/**`
- `frontend/src/features/stock-research-workbench/api/stockResearchWorkbenchService.ts`
- `frontend/src/features/signal-generation-engine/**`
- `frontend/src/features/strategy-decision-engine/**`
- `frontend/src/shared/**`
- `frontend/src/app/routes.tsx`
- `frontend/src/app/navigationMetadata.tsx`
- `backend/src/api/routes.ts`
- `backend/prisma/**`
- package manifests
- generated files
- `docs/AGENTS.md`
- `docs/codex-agent-team-plan/**`
- active implementation or gate docs for `CF-W1-DQ-02A` and `CF-W1-STRAT-02A`

## Dependency And Conflict Notes

- Full `CF-W1-UX-01` trust/readiness semantics depend on accepted upstream DQ-backed consumer evidence, not on workbench-local inference.
- Scope proof remains unverified until the feature boundary and backend contract actually carry and honor `region` and `assetType`.
- Signal and Strategy widgets remain separate owners. The first child may label or suppress them only from the Stock Research Workbench page; it must not edit their internals.
- This first child conflicts with any active writer on `StockResearchWorkbenchPage.tsx`, `frontend/src/features/stock-research-workbench/types.ts`, or a new `frontend/tests/ui/stock-research-workbench.spec.ts`.

## Required QA Scenarios

Focused UI QA must later prove:

- `COMPLETE` source status still renders limited research context, not trusted context;
- `PARTIAL` and `DELAYED` show visible limitation reasons;
- `MISSING` and `ERROR` show blocked context and suppress downstream widgets;
- current `region` and `assetType` are visible with explicit unverified-scope wording;
- no direct-advice or action-like trust copy is introduced;
- domain empty/error states remain specific and readable.

## Readiness Result

`CF-W1-UX-01` parent is not Ready for Implementation.

The narrowed frontend-only child is bounded enough for future Ready evaluation after:

- Team 04 prepares the focused UI QA plan;
- Team 08 or the assigned Lane 3 frontend owner accepts the exact reservation set;
- Team 00 promotes the child as the only active writer on the reserved files.
