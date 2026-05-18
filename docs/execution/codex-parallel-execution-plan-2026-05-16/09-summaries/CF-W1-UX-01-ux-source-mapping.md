# CF-W1-UX-01 UX Source Mapping

Date: 2026-05-18

Owner: Team 08 - UX / Research / Copilot

Mode: docs-only source mapping. No application code, tests, routes, packages, shared UI, or backend contracts were changed.

## Verdict

The narrowed frontend-only child is source-supported for limitation framing only.

It is safe to promote after Team 04 provides the focused UI QA plan, as long as Team 00 promotes only the bounded frontend child and does not ask the page to claim verified readiness, trusted scope, or downstream eligibility.

The backend trust-evidence child is still required later if Product Owner wants true readiness semantics, blocker provenance from upstream modules, verified scope, or latest trusted data date.

## Sources Read

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-UX-01-stock-research-workbench-trust-surfaces-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-UX-01-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-UX-01-stock-research-workbench-trust-surfaces-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-UX-01-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/audit-ux-research-copilot.md`
- `frontend/src/features/stock-research-workbench/components/StockResearchWorkbenchPage.tsx`
- `frontend/src/features/stock-research-workbench/types.ts`
- `frontend/src/features/stock-research-workbench/api/stockResearchWorkbenchService.ts`
- `frontend/src/contexts/MarketScopeContext.tsx`

## Current Source-Supported Evidence

Current Workbench source can prove only the following user-facing evidence without backend changes:

1. Page fetch identity:
   - workbench fetch is keyed by `instrumentId` and `range` only
   - evidence: `frontend/src/features/stock-research-workbench/api/stockResearchWorkbenchService.ts:6-13`
2. Current page-level trust fields already present in the response:
   - `trust.source`
   - `trust.last_updated_timestamp`
   - `trust.data_status`
   - evidence: `frontend/src/features/stock-research-workbench/types.ts:42-46`
3. Additional raw evidence fields already present in the response:
   - `overview.source`
   - `overview.last_updated_timestamp`
   - `overview.data_status`
   - `chart.source`
   - `chart.last_updated_timestamp`
   - `chart.data_status`
   - `fundamentals.data_status` and `fundamentals.last_updated_timestamp` when fundamentals exist
   - `relative_strength.data_status` when present
   - peer presence or absence
   - corporate action presence or absence plus each row `source`, `last_updated_timestamp`, `data_status`
   - evidence: `frontend/src/features/stock-research-workbench/types.ts:10-46`, `frontend/src/features/stock-research-workbench/components/StockResearchWorkbenchPage.tsx:101-311`
4. Current UI already exposes:
   - source strings
   - raw timestamps
   - status chips
   - empty states for missing chart, fundamentals, peers, valuation context, and corporate actions
   - evidence: `frontend/src/features/stock-research-workbench/components/StockResearchWorkbenchPage.tsx:127-130`, `181-311`, `316-330`
5. Current UI currently renders downstream Signal and Strategy widgets directly from `instrumentId`
   - no page-owned trust gate or page-owned eligibility prop exists
   - evidence: `frontend/src/features/stock-research-workbench/components/StockResearchWorkbenchPage.tsx:172-179`
6. Current app infrastructure already supports user-selected market scope in frontend state:
   - `useMarketScope()` exposes `scope.region` and `scope.assetType`
   - these values are stored under `market_scope`
   - evidence: `frontend/src/contexts/MarketScopeContext.tsx:7-10`, `19-26`, `64-69`

## What Current Source Cannot Prove

Current Workbench source cannot prove the following without backend changes:

- verified backend scope match for `region` or `assetType`
- that the workbench fetch consumed `region` or `assetType`
- Data Quality readiness
- upstream blocker provenance
- latest trusted data date
- trusted data-through date
- downstream Signal eligibility
- downstream Strategy eligibility
- signal quality or decision reliability
- that `COMPLETE` means ready for review beyond limited research context

Evidence:

- fetch sends only `range`, not `region` or `assetType`: `frontend/src/features/stock-research-workbench/api/stockResearchWorkbenchService.ts:10-12`
- workbench response trust object contains only `source`, `last_updated_timestamp`, and `data_status`: `frontend/src/features/stock-research-workbench/types.ts:42-46`
- page renders downstream widgets without any page-level trust state or eligibility contract: `frontend/src/features/stock-research-workbench/components/StockResearchWorkbenchPage.tsx:172-179`

## Safe First-Child Mapping

The first frontend-only child may safely derive:

- `requestedScope.region` and `requestedScope.assetType` from `useMarketScope()` as requested scope only
- `scopeVerification = UNVERIFIED_AT_FEATURE_BOUNDARY`
- `latestEvidenceTimestamp` from existing raw timestamp fields only
- `evidenceSource` from existing response source fields only
- `marketDataStatus` from existing response status fields only
- `state = BLOCKED_CONTEXT` when status is `MISSING` or `ERROR`
- `state = LIMITED_CONTEXT` when status is `PARTIAL`, `DELAYED`, or `COMPLETE`
- limitation or blocker reasons based on missing timestamp, missing data status, and missing scope verification
- `signalWidget` / `strategyDecisionWidget = UNVERIFIED_CONTEXT_ONLY` when not blocked
- `signalWidget` / `strategyDecisionWidget = HIDDEN_BLOCKED` when blocked

This matches the Team 03 architecture review, contract, and work packet boundaries.

## Allowed User-Facing Copy In The First Frontend-Only Child

Allowed because current source can support them conservatively:

- `Research context`
- `Limited context`
- `Blocked context`
- `Scope not verified on this page`
- `Requested scope`
- `Latest evidence timestamp`
- `Additional context; downstream eligibility not verified`
- `Signal context not verified on this page`
- `Strategy context not verified on this page`
- `Unavailable because current source evidence is missing`

These statements are safe because they describe current UI evidence boundaries rather than backend readiness.

## Forbidden Overclaims In The First Frontend-Only Child

Forbidden because current source cannot prove them:

- `Trusted`
- `Ready`
- `Verified`
- `Scope verified`
- `Latest trusted data date`
- `Safe to trade`
- `Eligible signal`
- `Eligible decision`
- `Reliable`
- `Data quality passed`
- `Research ready`
- `Approved`
- any copy that implies Signal or Strategy panels are validated for action

Also forbidden:

- inferring readiness from `overview.country`, `overview.exchange`, or instrument metadata
- inferring downstream eligibility from widget presence
- inferring Data Quality from raw market-data status

## Reservation Review

Team 03 proposed reservation:

- `frontend/src/features/stock-research-workbench/components/StockResearchWorkbenchPage.tsx`
- `frontend/src/features/stock-research-workbench/types.ts`
- `frontend/tests/ui/stock-research-workbench.spec.ts`

Team 08 verdict: confirm.

Reason:

- the page component owns the page-level trust framing and downstream suppression wrapper
- feature-local types can hold the additive trust-surface mapping without backend DTO change
- there is no existing `frontend/tests/ui/stock-research-workbench.spec.ts`; current related UI coverage found was `frontend/tests/ui/research-hub.spec.ts`
- `frontend/src/features/stock-research-workbench/api/stockResearchWorkbenchService.ts` should remain outside the first-child writer set because the current UX contract depends on keeping scope unverified at the feature boundary

## Promotion Recommendation To Team 00

Promote the narrowed frontend-only child after Team 04 publishes the focused UI QA plan.

Do not hold this child for the backend trust-evidence follow-up, because the frontend-only child reduces presentational overclaim risk now without fabricating new trust semantics.

Hold only these later asks for the backend or cross-feature child:

- verified scope across the API boundary
- DQ-backed readiness and blocker reasons
- latest trusted data date
- widget-level downstream eligibility proof
- any change inside Signal, Strategy, shared UI, or route scope

## Blockers

- Team 04 QA plan is still required before Ready promotion.
- Shared workspace is dirty in an unrelated file: `backend/tests/modules/alerts-monitoring/alerts-monitoring.ownership.test.ts`.
- Product Owner should expect the first child to remain visibly limited even when source status is `COMPLETE`.

## Teams Ready For Follow-On

- Team 00: ready to promote the bounded frontend-only child once Team 04 publishes QA coverage and one writer is assigned
- Team 03: no further architecture change required for the first child unless Team 00 expands scope
- Team 04: next owner for focused UI QA plan
- Lane 3 frontend implementer: can take the confirmed reservation set after Team 00 promotion
- backend trust-evidence teams: not required for the first child, but needed later for full readiness semantics
