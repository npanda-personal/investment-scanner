# CF-W1-UX-01B - Stock Research Workbench Trust Evidence Contract Requirement

Date: 2026-05-26

Owner: Team 02 - Product / Requirement Factory

Status: New bounded child requirement draft. Not Ready for Implementation. This is the current recommended no-schema/no-shared-file follow-on after active `CF-W2-SPL-02`.

Parent: `CF-W1-UX-01 - Stock Research Workbench Trust Surfaces Requirement`

Depends on accepted child:

- `CF-W1-UX-01A - Workbench trust framing`
- local accepted branch commit recorded in control docs: `246d5a3 feat: add workbench trust framing`

## Product Goal

Turn Stock Research Workbench from a conservative but still partly unproven context page into a more trustworthy research surface by adding explicit page-level trust evidence on the existing Workbench route.

The user should be able to answer:

- which market scope was requested for this page;
- whether the page can verify that scope on the current backend path;
- what the latest trusted workbench evidence date or timestamp is;
- which blocker reasons or limitations make the page less trustworthy;
- whether downstream Signal and Strategy widgets are allowed, limited, or blocked on the current page evidence basis.

This remains a research-support workflow. It must not become a buy/sell, target-price, reward/risk, or portfolio-action surface.

## Verified Current-State Basis

Current source evidence shows a bounded follow-on is still needed:

- existing frontend route already exists at `frontend/src/features/stock-research-workbench/routes.tsx`
- existing backend module already exists at `backend/src/modules/stock-research-workbench/**`
- existing frontend feature already exists at `frontend/src/features/stock-research-workbench/**`
- `frontend/src/features/stock-research-workbench/api/stockResearchWorkbenchService.ts` sends only `range`; it does not send `region` or `assetType`
- `backend/src/modules/stock-research-workbench/stock-research-workbench.types.ts` exposes `trust.source`, `trust.last_updated_timestamp`, and `trust.data_status`, but no verified scope, latest trusted data date, blocker reasons, or downstream widget eligibility fields
- `backend/src/modules/stock-research-workbench/stock-research-workbench.service.ts` builds the response from Market Data Foundation reads, but it does not project page-level trust evidence beyond the simple `trust` object
- `frontend/src/features/stock-research-workbench/components/StockResearchWorkbenchPage.tsx` renders `SignalWidget` and `StrategyDecisionWidget` directly, with no page-owned eligibility or blocker explanation

Implication:

- this is not a route-registry or navigation problem;
- it can stay inside the existing Workbench backend module and frontend feature if kept bounded;
- it should not require Prisma/schema, package, shared UI, or shared-file consent.

## Bounded Requirement

Define one additive Stock Research Workbench trust-evidence child on the existing Workbench endpoint and page.

The first child should focus on:

- explicit requested scope on the existing Workbench read path;
- verified scope status or explicit unverified/mismatch/unsupported status from the backend path;
- latest trusted evidence date or timestamp for the page, or an explicit missing-basis state when the backend cannot prove one;
- compact blocker or limitation reasons using public upstream outputs only;
- explicit downstream widget eligibility states for Signal and Strategy panels on the Workbench page;
- additive page-level UI support for those fields on the existing Workbench route;
- no new global score and no reinvention of Data Quality scoring.

## Required Evidence Fields

The child should add a bounded page-level trust-evidence object or equivalent additive fields that can truthfully answer:

- requested `region`
- requested `assetType`
- scope verification status
- latest trusted evidence date or timestamp
- latest trusted evidence basis or explicit unknown basis
- blocker reasons
- signal widget eligibility status plus reason
- strategy widget eligibility status plus reason

If the current backend path cannot prove one of these fields, it must return an explicit unavailable or unverified state rather than a synthetic fallback.

## Guardrails

- Use public upstream outputs only; do not duplicate Data Quality scoring logic in Workbench.
- Do not infer verified scope from instrument metadata alone.
- Do not infer downstream eligibility from widget presence alone.
- Do not infer trusted freshness from any single raw timestamp if the page-level evidence basis is mixed or unknown.
- Do not relabel `COMPLETE` market-data status as "ready", "safe", or "trusted" without a truthful page-owned basis.
- Do not reopen `CF-W1-UX-01A`; that child already handled conservative presentation framing and remains separate.

## Acceptance Criteria

- The existing Workbench route remains the owning page; no new route or navigation item is introduced.
- The existing Workbench API path additively carries requested scope and scope-verification truth, or explicit unverified/mismatch/unsupported states.
- The response additively carries latest trusted evidence date or timestamp, or an explicit missing-basis state.
- The response additively carries blocker or limitation reasons without duplicating DQ scoring.
- The response additively carries bounded widget eligibility states for the Signal and Strategy panels.
- The frontend Workbench page shows scope status, evidence timing/basis, blocker reasons, and widget eligibility additively on the existing page.
- Signal and Strategy widgets are not silently treated as actionable just because they render on the page.
- No route-registry, navigation metadata, shared UI, Prisma/schema, migration, package-manifest, or generated-file change is required in the first child.
- Focused tests later cover verified scope, unverified scope, scope mismatch, latest evidence present, latest evidence unavailable, blocker-visible, and widget-limited or widget-blocked scenarios.

## Non-Goals

- No new page
- No route-registry change
- No navigation change
- No shared UI refactor
- No Prisma/schema or migration work
- No package manifest change
- No generated-file change
- No widget-internal strategy or signal logic rewrite
- No new recommendation score
- No buy/sell, target-price, reward/risk, or portfolio-action semantics

## Future Candidate Files After Ready Promotion

- `backend/src/modules/stock-research-workbench/stock-research-workbench.validation.ts`
- `backend/src/modules/stock-research-workbench/stock-research-workbench.types.ts`
- `backend/src/modules/stock-research-workbench/stock-research-workbench.service.ts`
- `backend/src/modules/stock-research-workbench/stock-research-workbench.controller.ts`
- `backend/src/modules/stock-research-workbench/stock-research-workbench.md`
- `frontend/src/features/stock-research-workbench/api/stockResearchWorkbenchService.ts`
- `frontend/src/features/stock-research-workbench/types.ts`
- `frontend/src/features/stock-research-workbench/components/StockResearchWorkbenchPage.tsx`
- `frontend/tests/ui/stock-research-workbench.spec.ts`

## Likely Team 03 Architecture Questions

1. Can the existing Workbench endpoint safely accept `region` and `assetType` without widening beyond the module boundary?
2. Which upstream public outputs can truthfully support page-level blocker reasons and widget eligibility without duplicating DQ scoring?
3. What is the narrowest truthful definition of latest trusted page evidence date or timestamp on the current source path?
4. Can widget eligibility stay page-local and additive, or does any part of it widen into Signal/Strategy module contracts that should be deferred?

## Verdict

`Architecture-next`

Why:

- direct investor/trader research value is clear;
- the slice can stay on the existing route and endpoint;
- no schema/storage or shared-file consent is required if Team 03 keeps it module-local;
- it is a better next non-consent packet than another Signal Position Ledger child because current ledger truth is already represented by active `CF-W2-SPL-02`.

## Next Gate

1. Team 03 architecture packet for a module-local Workbench trust-evidence child.
2. Team 04 QA plan for verified scope, evidence timing, blocker visibility, and widget eligibility truth.
3. Team 00 routing only after Team 03 confirms the slice stays inside Workbench-owned files and does not widen into shared UI or cross-module contract drift.
