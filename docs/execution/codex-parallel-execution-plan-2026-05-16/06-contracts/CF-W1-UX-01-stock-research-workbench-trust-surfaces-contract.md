# CF-W1-UX-01 - Stock Research Workbench Trust Surfaces Contract

Date: 2026-05-18

Owner: Team 03 Architecture Factory

## Status

First bounded child contract prepared.

Parent `CF-W1-UX-01` remains not Ready for Implementation. This contract covers only the conservative frontend-only child.

## Contract Intent

Stock Research Workbench must stop looking more trusted than the current source can prove.

The first child should add page-level trust framing from existing workbench response fields and current market scope context only. It must make limitations explicit without inventing Data Quality readiness, verified scope, or downstream Signal / Strategy eligibility.

## Ownership

The first bounded child is owned by `frontend/src/features/stock-research-workbench`.

Out of scope for this contract:

- backend workbench DTO changes;
- Signal Generation Engine source;
- Strategy Decision Engine source;
- shared UI component changes;
- route, navigation, package, Prisma, generated, provider, or telemetry scope.

## Required Source Boundary

Implementation must stay inside:

- `frontend/src/features/stock-research-workbench/components/StockResearchWorkbenchPage.tsx`
- `frontend/src/features/stock-research-workbench/types.ts`
- `frontend/tests/ui/stock-research-workbench.spec.ts`

Implementation must derive trust framing only from:

- existing `ResearchWorkbenchResponse` fields already returned by the page fetch;
- current `useMarketScope()` values for requested `region` and `assetType`.

## Required Trust Surface Shape

The exact type name may differ, but the semantics must stay stable:

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

## Required Mapping Rules

- `MISSING` or `ERROR` source status maps to `BLOCKED_CONTEXT`.
- `PARTIAL` or `DELAYED` source status maps to `LIMITED_CONTEXT`.
- `COMPLETE` source status still maps to `LIMITED_CONTEXT` in this first child because:
  - DQ readiness is not exposed;
  - backend scope verification is not exposed;
  - downstream widget eligibility is not exposed.
- missing `last_updated_timestamp` must produce a visible limitation or blocker reason; do not synthesize a trusted date.
- `requestedScope` may be shown only as user-selected scope. It must not be described as backend-verified scope.
- downstream panels may be shown only as unverified research context when the page is not blocked.
- blocked page state may suppress downstream panels entirely.

## Required Research-Support Copy Contract

Allowed framing:

- `Research context`
- `Limited context`
- `Blocked context`
- `Scope not verified on this page`
- `Additional context; downstream eligibility not verified`
- `Latest evidence timestamp`

Avoid:

- `Trusted`
- `Ready`
- `Buy`
- `Sell`
- `Safe to trade`
- `Eligible signal`
- `Eligible decision`
- `Latest trusted data date`

The first child may show a raw evidence timestamp. It must not rename that timestamp to a trusted-date claim.

## Compatibility Rule

- Preserve the existing backend API payload shape.
- Preserve existing workbench sections, range controls, navigation, and feature routing.
- Keep Signal and Strategy widgets as separate feature consumers. This contract allows only page-level framing or suppression around them.

## Forbidden Behavior

- Do not infer Data Quality readiness from market-data status.
- Do not infer scope match from `country`, `exchange`, or instrument metadata.
- Do not infer downstream widget eligibility from presence of widget data.
- Do not modify `SignalWidget`, `StrategyDecisionWidget`, or shared status badge components.
- Do not introduce advisory or certainty language.

## Stop Conditions

Stop and return to Team 00 / Architect if implementation needs:

- backend DTO fields beyond current workbench response;
- verified `region` / `assetType` handling across the API boundary;
- DQ-backed readiness or blocker evidence;
- widget-internal prop changes or cross-feature source edits;
- shared UI banner, shared badge, route, or navigation changes.

Those needs belong to a later backend or cross-feature child, not this first slice.

## Test Contract

Focused UI coverage must later prove:

- `COMPLETE` response still shows limited context because trust proof is incomplete;
- `PARTIAL` and `DELAYED` responses show warning reasons;
- `MISSING` and `ERROR` responses show blocked context and suppress downstream widgets;
- current requested scope is visible and marked unverified;
- no direct-advice or certainty language appears on the page.
