# CF-W2-SPL-02 - Signal Position Ledger Active Positions Surface Requirement

Date: 2026-05-26

Owner: Team 02 - Product / Requirement Factory

Status: New follow-up child requirement draft. Not Ready for Implementation. Architecture-needed shared-file surface after accepted `CF-W2-SPL-01B`.

Parent: `CF-W2-SPL-01 - Signal Position Ledger`

Depends on accepted child:

- `CF-W2-SPL-01B - Signal Position Ledger active positions read model`
- local commit verified: `ca31d79 feat: add signal position ledger read model`

## Product Goal

Expose the first truthful user-facing Signal Position Ledger surface so an investor/trader can review current system-picked active signal positions from the accepted `CF-W2-SPL-01B` read model without mixing in broker execution, Trade Plan framing, or fabricated closed-history proof.

This child should let the user answer:

- which active signal positions currently exist for the selected market scope;
- which stock/company each row belongs to;
- when the entry trigger happened;
- at what entry trigger price it was proven;
- why the entry trigger was accepted;
- what the current return is from entry to the latest trusted price date when that basis is trustworthy; and
- whether the row currently carries an exit-triggered or risk-warning compatibility state.

Closed history is not proven by the accepted backend child and must stay explicitly deferred.

## Verified Current-State Basis

Current main-workspace evidence inspected for this requirement:

- `backend/src/api/routes.ts` does not currently mount a Signal Position Ledger router.
- `frontend/src/app/routes.tsx` does not currently register a Signal Position Ledger page.
- `frontend/src/app/navigationMetadata.tsx` has no Signal Position Ledger navigation item.
- no `backend/src/modules/signal-position-ledger/**` or `frontend/src/features/signal-position-ledger/**` path exists in the current main workspace.

Implication:

- the next user-visible SPL child is not a module-local follow-up only;
- it requires Team 00 sequencing plus Team 03 shared-file architecture control before implementation starts.

## Recommendation For The First Surfaced Slice

Recommended surface shape:

1. expose `Active Positions` backed by accepted `CF-W2-SPL-01B`;
2. include a `Closed History` tab as placeholder-only;
3. do not expose a closed-history endpoint, rows, counts, or mock data in this child.

Why this is the honest recommendation:

- active rows already have an accepted read-model path;
- the user expects active and closed system-picked positions to live in one future module;
- a clearly labeled placeholder tab sets truthful expectation without pretending durable close proof already exists;
- once the page and route are opened, the incremental UI cost of one placeholder tab is smaller than reopening the feature later just to explain the missing history.

If Team 00 wants the absolute narrowest possible shared-file pass, an active-only single-view page is still acceptable. Team 02 recommends the placeholder `Closed History` tab because it stays honest and clearer for the user.

## User Goal

Review current system-picked signal positions in one dedicated module without confusing them with portfolio holdings, broker positions, or Trade Plan outputs.

## User Journey

1. Open `Signal Position Ledger` from first-class app navigation.
2. Land on `Active Positions`.
3. Review active rows sorted by newest entry trigger first.
4. See entry date, entry price, reason, latest trusted price date, current return, and current compatibility state without opening Today Review or Raw Signals first.
5. Switch to `Closed History` and immediately see that the surface is intentionally deferred until durable close proof exists.

## Information Hierarchy

1. Page title and trust framing
2. Market scope context
3. `Active Positions` tab with active-row list and summary counts
4. `Closed History` placeholder tab
5. Empty/error/loading states that explain missing or deferred truth

## Required Tabs And Sections

### 1. Page header

Must show:

- `Signal Position Ledger`
- research-support framing that this is system-picked signal-position evidence, not broker execution
- current market scope context using the app's existing scope behavior

Must not show:

- portfolio valuation
- capital allocation
- realized profit
- target price
- reward/risk
- direct buy/sell wording

### 2. `Active Positions` tab

Backed only by the accepted `CF-W2-SPL-01B` active-row read model.

Required summary strip:

- total active rows in current scope
- count of rows with `EXIT_TRIGGERED` compatibility state
- count of rows with `RISK_WARNING` compatibility state
- count of rows whose current return is `STALE` or `UNAVAILABLE`

Required row fields:

- stock/company name
- symbol
- region
- asset type
- entry trigger timestamp or date
- entry trigger price
- entry reason summary
- latest trusted price date
- current return percent or explicit stale/unavailable label
- health compatibility state when present
- data-quality or trust label
- strategy identifier/code
- strategy version

Required behavior:

- sort newest entry trigger first by default
- preserve pagination semantics from the accepted backend child
- use current market scope so region/asset-type changes refetch the data
- keep rows active-only; do not show close date, close price, or close return

### 3. `Closed History` tab

This tab is placeholder-only in this child.

It must:

- render no closed-history table rows;
- call no closed-history API;
- show no mock counts, sample data, or fabricated close labels;
- explain that closed history needs durable close proof and is deferred to a later child.

Recommended placeholder message:

`Closed history is not shown yet because durable close date, close price, and close reason proof are not available on the current source path.`

## Primary Data Shown

- accepted `CF-W2-SPL-01B` active rows
- scope-aware pagination metadata
- active-row trust and compatibility status

## Secondary Data Shown

- summary counts derived from the active rows already returned for the current view
- placeholder explanation for closed history

## Empty States

### Active tab empty state

Must explain that no active signal positions are available for the current `region` and `assetType`.

It should not imply:

- missing portfolio holdings
- broker inactivity
- closed-history success

### Closed History placeholder state

Must explain that closed-history truth is deferred, not simply empty.

## Error States

If the active endpoint fails or the mounted route is unavailable, the page must show a domain-specific error explaining that active signal-position data could not be loaded for the selected scope.

The error state must not fall back to fake rows or cached placeholder returns.

## Loading States

- Active tab shows a visible loading state while the accepted active-row endpoint is loading.
- Closed History tab does not show a fake loading table; it can render the placeholder immediately.

## Trust-Building Elements

- explicit research-support wording
- visible trigger reason summary
- visible strategy version
- visible latest trusted price date
- visible stale/unavailable return status when price basis is weak
- explicit placeholder-only closed-history framing

## Accessibility And Basic Usability

- tab labels must be keyboard reachable
- table or list columns must remain readable on laptop-width layouts
- state and trust labels must not rely on color alone
- long reason summaries should truncate cleanly in list view without hiding the symbol/company identity

## Backend/API Exposure Required In This Child

This child must surface the accepted active read model through a mounted backend route so the frontend can consume it.

Required backend behavior:

- mount the accepted Signal Position Ledger router in the backend route registry;
- expose the accepted active list response shape for scope-aware reads;
- keep query parameters aligned to current scope conventions, including `region` and `assetType`;
- preserve pagination parameters and response semantics from `CF-W2-SPL-01B`;
- do not add any closed-history endpoint in this child.

## Frontend/UI Exposure Required In This Child

This child must add a dedicated frontend feature/page for Signal Position Ledger and register it in app routing.

Required frontend behavior:

- dedicated Signal Position Ledger page
- first-class route registration
- first-class navigation discoverability
- `Active Positions` tab using the mounted active API
- `Closed History` placeholder-only tab

Optional only if Team 00 explicitly reserves it in the same pass:

- home-page launch-card entry

## Team 00 / Architect-Controlled Shared-File Needs

Implementation must not start until Team 00 and Team 03 reserve the shared-file surface.

Minimum shared-file control required:

- backend route registry: `backend/src/api/routes.ts`
- frontend app route registry: `frontend/src/app/routes.tsx`
- frontend navigation metadata: `frontend/src/app/navigationMetadata.tsx`

Potential additional shared-file request only if discoverability is widened further:

- `frontend/src/app/HomePage.tsx`

Module-local feature files expected after reservation:

- `frontend/src/features/signal-position-ledger/**`

Do not assume shared UI component changes are pre-approved.

## Explicit Separation Of Truth

### Active positions backed now

This child may surface only active rows that come from the accepted `CF-W2-SPL-01B` read model and its accepted active-row semantics.

### Closed history deferred now

This child must not claim any of the following:

- durable close date
- durable close price
- durable close reason
- closed return from entry to close
- reusable closed lifecycle history

Those remain deferred until a later durable lifecycle/close-proof child exists.

### Later durable close-proof child

Any real closed-history delivery will require a separate child requirement and may require additional architecture or consent-gated storage work. This child does not open that path.

## Acceptance Criteria

- A dedicated Signal Position Ledger page is reachable from first-class app navigation.
- The surfaced active view is backed by accepted `CF-W2-SPL-01B` active-row data only.
- The active view shows stock/company name, symbol, entry date, entry price, reason summary, latest trusted price date, current return percent or explicit unavailable status, compatibility state, strategy identifier/code, and strategy version.
- Active rows remain scoped by `region` and `assetType` and refetch when the app's market scope changes.
- The default active ordering is newest entry first.
- The page includes a `Closed History` tab, but that tab is placeholder-only in this child.
- The `Closed History` tab calls no endpoint and shows no mock or fabricated close data.
- The page visibly explains that closed history is deferred until durable close proof exists.
- No API, page section, or tab introduces broker execution, portfolio holdings, realized P/L, target price, reward/risk, Trade Plan-first framing, or direct buy/sell wording.
- No acceptance criterion widens into Prisma/schema, migrations, generated files, package manifests, closed-history storage, or shared UI changes.

## Non-Goals

- No closed-history API
- No close date/price/reason rows
- No durable lifecycle storage
- No Prisma/schema/migration/generated-file work
- No package manifest changes
- No shared UI refactor
- No portfolio/broker/accounting semantics
- No Trade Plan target or reward/risk semantics

## Dependency Summary

- `CF-W2-SPL-01B` must be available on the working implementation base before this child starts.
- Team 00 must reserve backend and frontend shared-file writers.
- Team 08 UX should refine the page-level UX and empty/error/loading behavior before meaningful UI implementation.
- Team 03 must define the mounted route/API contract and shared-file boundaries before implementation.

## Verdict

`Architecture-needed`

Why:

- no true schema/storage consent blocker exists if this child stays active-surface plus closed-placeholder only;
- the blocker is shared-file route/API/UI exposure, not durable lifecycle consent;
- real closed history remains a separate later consent-sensitive follow-on.

## Next Gate

1. Team 08 UX plan for the surfaced page behavior.
2. Team 03 architecture packet for mounted backend route, frontend route/nav reservations, and exact feature boundary.
3. Team 04 QA plan for active-surface plus closed-placeholder behavior only.
4. Team 00 sequencing after the accepted `ca31d79` backend read-model dependency is on the working base.
