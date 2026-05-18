# CF-W1-UX-01 QA Plan

Date: 2026-05-18

Owner: Team 04 QA Factory

Status: QA plan prepared for the narrowed `CF-W1-UX-01A` first child only. QA-ready for Team 00 Ready evaluation as one bounded frontend-only `stock-research-workbench` trust-framing slice, pending Team 08 or the Team 00-assigned Lane 3 frontend owner accepting the exact file reservation set.

Current status refresh: Team 04 completed a docs-only QA planning pass against the active execution folder and current source evidence. No builds, tests, servers, Playwright runs, or browser checks were run in this pass.

## Scope

Validation plan for conservative Stock Research Workbench trust framing derived from current page evidence only:

- existing `ResearchWorkbenchResponse` trust fields already returned to the page;
- current requested scope from `useMarketScope()` only;
- feature-local page framing, labels, suppression behavior, and focused UI smoke coverage.

In-scope surfaces after Team 00 sequencing, Ready promotion, and implementation handoff:

- `frontend/src/features/stock-research-workbench/components/StockResearchWorkbenchPage.tsx`
- `frontend/src/features/stock-research-workbench/types.ts`
- `frontend/tests/ui/stock-research-workbench.spec.ts`

Out of scope for this first child:

- all backend `stock-research-workbench` source/tests
- `frontend/src/features/stock-research-workbench/api/stockResearchWorkbenchService.ts`
- `frontend/src/features/signal-generation-engine/**`
- `frontend/src/features/strategy-decision-engine/**`
- `frontend/src/shared/**`
- route registries, navigation metadata, package manifests, generated files, Prisma, providers, startup flows, or historical docs

This plan does not approve implementation, test execution, builds, or UI smoke. It records the QA packet only.

## Current Source Evidence

- `frontend/src/features/stock-research-workbench/components/StockResearchWorkbenchPage.tsx` currently renders source, timestamp, and status chips, but no page-level trust surface, scope-verification notice, or downstream trust framing.
- The page renders `SignalWidget` and `StrategyDecisionWidget` directly and therefore currently needs page-owned labeling or suppression behavior rather than widget-internal edits.
- Loading behavior is currently a centered `CircularProgress`; error behavior is a page-level error `Alert`; section-level empty states already exist for chart, fundamentals, valuation context, peers, and corporate actions.
- `frontend/src/features/stock-research-workbench/types.ts` exposes only the existing workbench response shape, including `trust.source`, `trust.last_updated_timestamp`, and `trust.data_status`.
- `frontend/tests/ui/stock-research-workbench.spec.ts` does not exist today, so the eventual implementation must add focused module-owned UI smoke coverage or record a blocker.

## Dependencies

- `CF-W1-UX-01` requirement, architecture review, contract, and work packet prepared on 2026-05-18.
- Team 00 must keep this packet bounded to the frontend-only child described by Team 03.
- Team 08 or the Team 00-assigned Lane 3 frontend owner must accept the exact reservation set before implementation.
- `CF-W1-L3-DQ-01` remains the downstream readiness-consumer baseline, but this child must not claim DQ-backed readiness because the current source does not expose that proof.

## Required QA Assertions

- Trust framing is derived only from existing `ResearchWorkbenchResponse` fields plus the currently selected scope from `useMarketScope()`.
- The page does not invent DQ readiness, verified scope match, downstream eligibility, latest trusted data date, or blocker provenance that current source cannot prove.
- `COMPLETE` market-data status still maps to limited research context, not trusted or ready context.
- `PARTIAL` and `DELAYED` map to limited context with visible warning reasons.
- `MISSING` and `ERROR` map to blocked context with visible blocker reasons.
- Missing `last_updated_timestamp` produces a visible limitation or blocker reason and does not synthesize a trusted date.
- Requested `region` and `assetType` are shown only as user-selected scope with explicit unverified-scope wording.
- Downstream `SignalWidget` and `StrategyDecisionWidget` remain page-owned unverified research context when not blocked, and are suppressed when blocked.
- Existing page sections, range controls, dialogs, and navigation behavior are preserved.
- No shared UI, route, or navigation changes are introduced.
- User-facing copy remains research-support only and avoids advice-like, certainty-like, or action-authorizing wording.

## Acceptance Scenarios

| Scenario | Expected QA result |
| --- | --- |
| `trust.data_status = COMPLETE` with timestamp present | Page shows limited research context, not trusted or ready wording; raw evidence timestamp may appear as evidence only; downstream panels remain visible only as unverified context. |
| `trust.data_status = PARTIAL` | Page shows limited context with explicit warning reason tied to partial evidence; downstream panels remain visible only as unverified context. |
| `trust.data_status = DELAYED` | Page shows limited context with explicit stale/delayed evidence warning; downstream panels remain visible only as unverified context. |
| `trust.data_status = MISSING` | Page shows blocked context; downstream Signal and Strategy panels are suppressed; no trusted/reliable phrasing appears. |
| `trust.data_status = ERROR` | Page shows blocked context; downstream Signal and Strategy panels are suppressed; no trusted/reliable phrasing appears. |
| Timestamp absent in a non-blocked status | Page shows a limitation reason that evidence timestamp is unavailable and does not relabel any field as latest trusted data date. |
| Scope shown from current market scope | Visible `region` and `assetType` are presented as requested scope only with explicit unverified-scope wording. |
| Existing page load | Loading state remains specific and readable; trust framing does not replace or hide the current loading spinner. |
| Existing request failure or missing payload | Current page-level error alert remains visible and readable; trust framing does not mask the failure with misleading partial-trust language. |
| Existing chart empty state | `No price history available.` remains visible and readable when chart data is empty. |
| Existing fundamentals empty state | `No fundamentals available.` remains visible and readable when fundamentals are absent. |
| Existing valuation empty state | Existing valuation-context explanation remains visible when both fundamentals and peers are missing. |
| Existing peers empty state | `No peers available from the current instrument universe.` remains visible and readable. |
| Existing corporate-actions empty state | `No corporate actions available.` remains visible and readable. |
| Copy-safety regression guard | No `Trusted`, `Ready`, `Buy`, `Sell`, `Safe to trade`, `Eligible signal`, `Eligible decision`, `profit target`, or similar wording appears. |

## Focused Command Guidance

Commands below are guidance only. They were not run during this docs-only QA planning task.

Required frontend build after Team 00 sequencing, Ready promotion, implementation handoff, and memory/resource check:

```powershell
cd frontend
npm.cmd run build
```

Required focused UI smoke after the implementation adds the reserved spec:

```powershell
cd frontend
npm.cmd run test:ui -- stock-research-workbench.spec.ts --workers=1
```

Backend checks for this bounded child:

- none expected
- if implementation requires any backend build, backend test, DTO, endpoint, or API-boundary change, stop and return to Team 00 / Architect because the child has widened out of scope

Current UI spec gap note:

- `frontend/tests/ui/stock-research-workbench.spec.ts` does not exist today.
- If the implementation changes the page UI, Team 04 expects a new focused feature-local Playwright spec.
- If the implementation handoff does not include that spec, QA should reject the packet or record an explicit UI-test blocker with risk and next owner.

## Skipped / Forbidden Checks

Skipped in this planning pass:

- all executable tests
- frontend build
- Playwright or browser verification
- local servers and services

Forbidden by default for this first child:

- backend tests or backend builds for the bounded frontend-only slice
- broad Playwright runs across unrelated specs
- shared UI regression work outside the feature-owned page
- route, navigation, package, Prisma, generated-file, provider, or startup validation
- live market-data, DQ, signal-generation, or strategy-decision verification outside page-owned framing

## Stop Conditions

Stop QA and return to Team 00 / Architect if:

- implementation needs backend DTO or endpoint changes
- implementation needs verified `region` / `assetType` handling across the API boundary
- implementation introduces new proof fields such as DQ readiness, blocker provenance, latest trusted data date, or downstream eligibility
- implementation edits `SignalWidget`, `StrategyDecisionWidget`, or any shared component
- implementation edits route registries or navigation metadata
- implementation requires shared UI banners, shared badges, or shared copy primitives to make the page coherent
- implementation introduces advice-like, certainty-like, or action-authorizing wording

## Evidence Required Later

- Exact implementation handoff limited to the approved frontend-only reservation set
- Focused frontend build result
- Focused `stock-research-workbench.spec.ts` UI smoke result
- Scenario evidence for `COMPLETE`, `PARTIAL`, `DELAYED`, `MISSING`, `ERROR`, missing timestamp, and visible requested-scope framing cases
- Confirmation that existing loading, error, and domain empty states remain readable
- Confirmation that downstream widget behavior is page-owned framing/suppression only, with no widget-internal edits
- Confirmation that no backend/API/shared-file widening occurred
- Skipped checks, if any, with exact blocker, risk, and next owner

## QA Readiness Verdict

`CF-W1-UX-01A` is QA-plan ready for Team 00 Ready evaluation as one bounded frontend-only Stock Research Workbench trust-framing child.

Remaining blockers before executable QA:

- Team 00 Ready promotion and exact file reservation handoff
- Team 08 or the Team 00-assigned Lane 3 frontend owner accepting the reservation set
- addition of the focused `frontend/tests/ui/stock-research-workbench.spec.ts` file during implementation, or an explicit blocker recorded if UI smoke cannot yet be added
