# CF-W1-UX-01B QA Plan

Date: 2026-05-26

Owner: Team 04 QA Factory

Status: QA plan prepared from the current Stock Research Workbench source, requirement, architecture review, contract, work packet, active board, ready/blocked queues, and open-decision state. This packet is `QA-PLAN READY` for Team 00 Ready evaluation only. No executable QA was run in this docs-only pass.

## QA Intent

`CF-W1-UX-01B` is the bounded backend + feature-local follow-on to accepted `CF-W1-UX-01A`. QA for this child must prove that the existing Workbench route and endpoint can expose page-owned trust evidence truthfully without faking verified scope, trusted freshness, unsupported asset coverage, or downstream widget allowance.

This is still research-support UX. The child may show limitation or blocked context, but it must not become advice, target, reward/risk, or action-authorizing UI.

## Scope

Planned validation for one bounded Stock Research Workbench backend + frontend slice only.

Architecture allowed file set is acceptable for QA as written because:

- it stays inside `stock-research-workbench` module/feature ownership;
- it does not overlap the active `CF-W2-SPL-02` route/navigation reservation;
- existing backend route, service, and validation tests already exist for the module;
- the only currently missing planned artifact is `frontend/tests/ui/stock-research-workbench.spec.ts`, which must be added in the implementation handoff or explicitly blocked.

Allowed implementation/test/doc files after Team 00 Ready promotion:

- `backend/src/modules/stock-research-workbench/stock-research-workbench.controller.ts`
- `backend/src/modules/stock-research-workbench/stock-research-workbench.service.ts`
- `backend/src/modules/stock-research-workbench/stock-research-workbench.types.ts`
- `backend/src/modules/stock-research-workbench/stock-research-workbench.validation.ts`
- `backend/src/modules/stock-research-workbench/stock-research-workbench.md`
- `backend/tests/modules/stock-research-workbench/stock-research-workbench.service.test.ts`
- `backend/tests/modules/stock-research-workbench/stock-research-workbench.validation.test.ts`
- `backend/tests/modules/stock-research-workbench/stock-research-workbench.routes.test.ts`
- `frontend/src/features/stock-research-workbench/api/stockResearchWorkbenchService.ts`
- `frontend/src/features/stock-research-workbench/types.ts`
- `frontend/src/features/stock-research-workbench/components/StockResearchWorkbenchPage.tsx`
- `frontend/tests/ui/stock-research-workbench.spec.ts`

Out of scope:

- `backend/src/api/routes.ts`
- `frontend/src/app/routes.tsx`
- `frontend/src/app/navigationMetadata.tsx`
- `frontend/src/contexts/MarketScopeContext.tsx`
- `backend/src/modules/market-data-foundation/**`
- `backend/src/modules/data-quality-engine/**`
- `backend/src/modules/signal-generation-engine/**`
- `backend/src/modules/strategy-decision-engine/**`
- `frontend/src/features/signal-generation-engine/**`
- `frontend/src/features/strategy-decision-engine/**`
- `frontend/src/shared/**`
- Prisma/schema/migrations/generated files
- package manifests and lockfiles
- active SPL route/nav files reserved by `CF-W2-SPL-02`

## Current Source Alignment

Planning evidence from current source:

- `frontend/src/features/stock-research-workbench/api/stockResearchWorkbenchService.ts` currently sends only `range`.
- `frontend/src/features/stock-research-workbench/components/StockResearchWorkbenchPage.tsx` currently renders `SignalWidget` and `StrategyDecisionWidget` directly with no page-owned trust-evidence control.
- `frontend/src/features/stock-research-workbench/types.ts` currently exposes only the legacy `trust` object and no `trust_evidence` contract.
- `backend/src/modules/stock-research-workbench/stock-research-workbench.validation.ts` currently validates only `instrumentId` and `range`.
- Existing module test coverage already includes:
  - `backend/tests/modules/stock-research-workbench/stock-research-workbench.service.test.ts`
  - `backend/tests/modules/stock-research-workbench/stock-research-workbench.validation.test.ts`
  - `backend/tests/modules/stock-research-workbench/stock-research-workbench.routes.test.ts`
- `frontend/tests/ui/stock-research-workbench.spec.ts` does not exist today, so the implementation handoff must add focused UI smoke coverage or record an explicit blocker.

## Acceptance Matrix

| Area | Scenario | Expected acceptance result |
| --- | --- | --- |
| Scope verification | `region` and `assetType` omitted | Response returns `requested_scope` with null or omitted request values mapped to explicit `UNVERIFIED`; UI must not present scope as verified. |
| Scope verification | supported request resolves same instrument in-scope | Response returns `VERIFIED_MATCH` with visible page-owned verification reason. |
| Scope verification | supported request resolves unscoped instrument but not scoped instrument | Response returns `MISMATCH`; implementation must not collapse this into a generic not-found response when unscoped existence is already known. |
| Scope verification | unsupported request such as non-target asset scope exposed by current market-scope model | Response returns `UNSUPPORTED`; UI must show unsupported scope explicitly and must not silently fall back to `STOCK`, `ETF`, `INDEX`, or `CRYPTO`. |
| Unsupported asset fakery guard | unsupported `assetType` or `region` on page | No rendered copy or API behavior may imply the page verified an unsupported scope; unsupported scope must stay visibly unsupported. |
| Latest evidence | exactly one truthful page-owned timestamp source exists | Response returns `latest_evidence_status = AVAILABLE`, non-null timestamp, and a specific basis such as `LATEST_PRICE_TIMESTAMP`, `PRICE_HISTORY_TIMESTAMP`, `FUNDAMENTALS_TIMESTAMP`, or `CORPORATE_ACTION_TIMESTAMP`. |
| Latest evidence | multiple truthful page-owned timestamp sources exist | Response may return the max observed timestamp only with `MULTI_SOURCE_PAGE_READ_MAX_TIMESTAMP` plus a visible limitation reason that this is mixed page-read evidence, not a trusted review-through date. |
| Latest evidence | no truthful page-owned timestamp source exists | Response returns `UNAVAILABLE`, `latest_evidence_timestamp = null`, and `latest_evidence_basis = UNKNOWN`; UI must not invent a fallback date. |
| Reasons | blocker reasons present | UI shows blocker reasons clearly on the page-owned trust surface. |
| Reasons | limitation reasons present | UI shows limitation reasons clearly on the page-owned trust surface. |
| Widget state | Signal/Strategy widget status is `LIMITED` | Widget may render only with visible page-owned limitation copy nearby; no widget-internal contract change is allowed. |
| Widget state | Signal/Strategy widget status is `BLOCKED` | Widget is suppressed and a page-owned blocked reason is shown instead. |
| Widget state contract | any implementation path | Downstream widget evidence remains only `LIMITED` or `BLOCKED`; this child must not emit `ALLOWED`. |
| Copy guard | trust evidence and widget messaging | UI and backend copy remain research-support only and avoid `Buy`, `Sell`, `Target`, `Reward/Risk`, `R:R`, `Safe to trade`, `Trusted signal`, `Eligible strategy`, `Guaranteed`, `Financial advice`, and `Latest trusted data date`. |

## Required QA Assertions

- `trust_evidence.requested_scope.region` and `trust_evidence.requested_scope.assetType` reflect the actual request sent by the Workbench client.
- The Workbench client refetches when `range`, `region`, or `assetType` changes.
- Supported-scope verification uses page-owned proof and does not infer verification from instrument metadata alone.
- Unsupported requested scope is surfaced explicitly and does not silently degrade to supported coverage.
- `MISMATCH` remains distinguishable from a genuine missing instrument.
- `latest_evidence_timestamp` never appears without a truthful basis.
- `latest_evidence_basis = MULTI_SOURCE_PAGE_READ_MAX_TIMESTAMP` requires a visible limitation reason.
- `latest_evidence_status = UNAVAILABLE` keeps timestamp null and basis `UNKNOWN`.
- Blocker and limitation reasons are derived from page-owned evidence or public upstream outputs only; no Data Quality score is recreated inside Workbench.
- Workbench does not relabel `COMPLETE` as ready, safe, trusted, or verified by itself.
- The page-owned trust surface governs Signal and Strategy widget visibility.
- `LIMITED` keeps nearby limitation framing visible.
- `BLOCKED` suppresses the widget and shows the reason locally on the page.
- Existing Workbench sections, range controls, loading, error alert, and domain empty states remain readable.
- No unsupported-asset fakery appears on the page when market scope exposes non-target asset types.

## Focused Commands

Commands below are required later after Team 00 Ready promotion and bounded implementation handoff. They were not run in this planning pass.

Focused backend tests:

```powershell
cd backend
npm.cmd test -- stock-research-workbench.service.test.ts stock-research-workbench.validation.test.ts stock-research-workbench.routes.test.ts --runInBand
```

Backend build:

```powershell
cd backend
npm.cmd run build
```

Frontend build:

```powershell
cd frontend
npm.cmd run build
```

Focused UI smoke expectation:

```powershell
cd frontend
npm.cmd run test:ui -- stock-research-workbench.spec.ts --workers=1
```

Required language guard:

```powershell
rg -n -i "buy|sell|target|price target|profit target|reward/risk|risk:reward|R:R|safe to trade|trusted signal|eligible strategy|guaranteed|financial advice|latest trusted data date" backend/src/modules/stock-research-workbench backend/tests/modules/stock-research-workbench frontend/src/features/stock-research-workbench frontend/tests/ui/stock-research-workbench.spec.ts
```

UI smoke must prove at least these outcomes with controlled fixtures or mocks:

- verified scope match visible
- unverified scope visible
- unsupported scope visible
- scope mismatch visible
- evidence timestamp available with basis
- evidence unavailable with null timestamp and `UNKNOWN` basis
- blocker and limitation reasons visible
- limited widget state visible with nearby reason
- blocked widget suppressed with page-owned reason visible

## Exact Rejection Conditions

Reject the future implementation handoff if any of the following occurs:

- any file outside the Team 03 allowed reservation set is changed
- any SPL route/navigation file, shared UI file, shared context file, Market Data file, Signal file, or Strategy file is changed
- `frontend/tests/ui/stock-research-workbench.spec.ts` is still missing after UI behavior changes and no explicit blocker is recorded
- the Workbench endpoint or page silently treats unsupported scope as supported
- `MISMATCH` is hidden behind a generic `404` despite provable unscoped instrument existence
- `latest_evidence_timestamp` is synthesized without a truthful page-owned basis
- mixed-source max timestamp is shown without limitation copy
- blocker or limitation reasons are absent when the contract requires them
- `LIMITED` widget rendering appears without nearby page-owned reason
- `BLOCKED` widget still renders
- any response or UI path emits widget status `ALLOWED`
- copy introduces advice-like, target-like, reward/risk, guarantee, or action-authorizing wording
- the child widens into DQ scoring logic, widget internals, route/nav changes, or unsupported-asset fallback behavior

## Evidence Required Later

- exact changed-file list proving the reservation stayed bounded
- focused backend test output proving scope verification mapping, timestamp mapping, reason projection, and widget status projection
- focused frontend build output
- focused Workbench Playwright output proving visible trust evidence and blocked-widget suppression
- explicit note that unsupported scope remains visible unsupported
- explicit note that no widget-internal edit was used to satisfy blocked/limited behavior
- explicit note that research-support language was preserved

## Tests Run

- none

## Tests Skipped

- `cd backend && npm.cmd test -- stock-research-workbench.service.test.ts stock-research-workbench.validation.test.ts stock-research-workbench.routes.test.ts --runInBand`
- `cd backend && npm.cmd run build`
- `cd frontend && npm.cmd run build`
- `cd frontend && npm.cmd run test:ui -- stock-research-workbench.spec.ts --workers=1`
- language-guard `rg` scan

## Skipped-Test Reason

Docs-only QA planning pass. No implementation handoff exists yet, and the assignment explicitly prohibited application-code edits and did not require test execution.

## Ready Recommendation

Verdict: `QA-PLAN READY`

Team 00 may promote `CF-W1-UX-01B` after recording the exact Team 03 reservation set unchanged.

Reservations Team 00 should record at promotion time:

- keep the allowed file set exactly as documented by Team 03
- keep all shared/high-risk files forbidden
- keep all active `CF-W2-SPL-02` route/nav files outside this packet
- require the new `frontend/tests/ui/stock-research-workbench.spec.ts` in the implementation handoff, or require an explicit UI-test blocker with risk and next owner
