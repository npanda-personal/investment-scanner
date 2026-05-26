# CF-W2-SPL-02 - Signal Position Ledger Active Surface UX Plan

Date: 2026-05-26

Owner: Team 08 - UX / Research / Copilot

Status: Docs-only UX plan complete. Ready for Team 00 intake, Team 03 architecture follow-on, and Team 04 QA planning. Not implementation approval.

## UX Verdict

`CF-W2-SPL-02` should launch as one truthful page named `Signal Position Ledger` with two tabs:

1. `Active Positions`
2. `Closed History`

The first viewport should be a dense active-position review surface, not a portfolio page and not a trade-execution page.

The first slice should expose only the accepted `CF-W2-SPL-01B` active-row truth. `Closed History` should be visible as a placeholder-only tab so the user understands that lifecycle history belongs here later, but the product must not invent close proof before a separate durable close-proof child exists.

## Product Direction Applied

- Use `Signal Position Ledger` as the page and navigation label.
- Keep research-support wording only.
- Show active/open system-picked signal positions now.
- Show `Closed History` as placeholder-only now.
- Do not imply broker execution, real holdings, realized P/L, targets, reward/risk, or Trade Plan ownership.
- Keep stock/company identity, entry evidence, reason summary, current return basis, and trust status visible in the first scan.

## Source Truth Guardrails For Slice 1

This UX plan assumes the mounted surface can use only the accepted `CF-W2-SPL-01B` active-row semantics:

- `companyName`
- `symbol`
- `region`
- `assetType`
- `triggerType`
- `entryTriggerTimestamp`
- `entryTriggerPrice`
- `entryReasonSummary`
- `strategyId`
- `strategyVersion`
- `entryRuleId`
- `latestTrustedPriceDate`
- `latestTrustedPrice`
- `currentReturnPercent`
- `currentReturnStatus`
- `currentDataQualityStatus`
- `healthState`
- `lifecycleEvidenceStatus`
- `trustEvidenceStatus`

The page must not require or display:

- close date
- close price
- close reason
- closed return
- durable `ACTIVE` or `CLOSED` lifecycle truth
- inferred close status from price movement

## Page Naming And Route Recommendation

Recommended user-facing page title:

- `Signal Position Ledger`

Recommended tab labels:

- `Active Positions`
- `Closed History`

Recommended frontend route path:

- `/signal-position-ledger`

Recommended navigation label:

- `Signal Position Ledger`

Recommended navigation placement:

- first choice: `Daily Work`, after `Today Review`
- fallback if Team 00 prefers evidence grouping: `Decision and Proof`

Do not use:

- `Active Trades`
- `Open Trades`
- `Closed Trades`
- `Trade Ledger`

## Primary User Goal

Review currently active system-picked signal positions for the selected market scope, understand the entry basis and current return basis, and quickly see whether any row already carries exit-trigger or risk-warning compatibility.

## Primary User Journey

1. Open `Signal Position Ledger` from first-class navigation.
2. Land on `Active Positions`.
3. Confirm current `region / assetType` context.
4. Scan summary counts and the first page of active rows.
5. Sort or filter only within truthful supported controls.
6. Identify rows with:
   - newest entry triggers,
   - `EXIT_TRIGGERED` compatibility,
   - `RISK_WARNING` compatibility,
   - stale or unavailable return basis.
7. Switch to `Closed History`.
8. Immediately see a deferred-proof placeholder instead of fake history.

## Information Hierarchy

1. Page header with research-support framing and current scope context
2. Active-position summary strip
3. Tab rail
4. `Active Positions` table or mobile list
5. `Closed History` placeholder explanation
6. Empty, loading, and error states

## First Viewport

### Desktop

The first viewport should show:

- `PageHeader`
- compact research-support subtitle
- current `region / assetType`
- active-position summary strip
- tab rail with `Active Positions` selected
- top of the active-position table

At least the first 5-7 active rows should be partially visible on a common laptop viewport.

### Mobile

Stack in this order:

1. page header
2. scope context
3. summary strip
4. tab rail
5. active-position list cards or compact stacked rows

### First-Viewport Rules

- The first viewport must answer "what is currently active?" before any deferred-history explanation.
- `Closed History` must be visible in the tab rail, but its placeholder body does not need to share the first viewport when `Active Positions` is selected.
- No portfolio valuation, no cash/account framing, and no Trade Plan geometry should appear in the first viewport.

## Header Expectations

Must show:

- page title `Signal Position Ledger`
- short subtitle such as `System-picked signal-position evidence for the current market scope`
- current `region / assetType`
- optional refresh action if the page pattern already supports read refresh

Must not show:

- capital allocation
- realized profit
- target price
- stop loss
- reward/risk
- broker or execution wording

## Tab Behavior

### Active Positions

- Default selected tab.
- Uses the mounted `CF-W2-SPL-01B` active list only.
- Supports pagination.
- Supports the default newest-entry ordering.

### Closed History

- Always visible as a tab in this child.
- No count badge.
- No loading spinner.
- No empty table shell.
- No mock rows.
- No inferred close labels.
- No closed-history API call.

Recommended placeholder body:

`Closed history is not shown yet because durable close date, close price, and close reason proof are not available on the current source path.`

Secondary helper line:

`This tab stays reserved for a later child that adds reusable close-proof truth.`

## Active Positions Surface

### Summary Strip

Recommended summary tiles:

1. `Active positions`
2. `Exit-trigger compatibility`
3. `Risk warning`
4. `Return basis limited`

Count semantics:

- `Active positions` should use scoped `totalCount`.
- The other three counts should be scope-wide only if the mounted API exposes truthful aggregate counts.
- If the mounted API does not expose truthful scope-wide aggregates, the UI must either:
  - label them as `This page`, or
  - omit them in slice 1.

Do not show guessed scope-wide counts derived from one paginated page.

### Desktop Table Columns

Recommended desktop columns:

1. `Company`
   - primary: company name
   - secondary: symbol
2. `Scope`
   - region
   - asset type
3. `Entry trigger`
   - entry trigger date or timestamp
   - entry trigger price
4. `Reason summary`
5. `Latest price basis`
   - latest trusted price
   - latest trusted price date
6. `Return from entry`
   - current return percent, or `STALE` / `UNAVAILABLE`
7. `Current state`
   - `EXIT_TRIGGERED`, `RISK_WARNING`, or neutral no-compatibility label
8. `Trust`
   - current data-quality status
   - trust evidence status
9. `Strategy`
   - strategy id or code
   - strategy version

### Mobile List Fields

Recommended mobile row stack:

1. company name + symbol
2. entry trigger date and entry price
3. return from entry
4. current state
5. reason summary
6. latest price basis
7. strategy id/version
8. trust labels

The mobile version must not hide symbol or return status behind an accordion by default.

### Row Behavior

- Rows should highlight on hover/focus only.
- Rows should not imply a detail route in slice 1 unless Team 03 explicitly opens one.
- If no row detail route exists, do not make the full row clickable.
- If an explicit drill action is later approved, it should be a dedicated action cell or explicit link, not whole-row navigation.

## Filters, Sorting, And Pagination

### Required Slice-1 Controls

- global market scope from existing app header
- pagination controls
- default sort: newest entry trigger first

### Recommended Additional Controls Only If Architecture Supports Them Safely

- search by company or symbol
- `Current state` filter:
  - `All`
  - `Exit-trigger compatibility`
  - `Risk warning`
  - `No compatibility`
- `Return basis` filter:
  - `All`
  - `Current`
  - `Stale`
  - `Unavailable`
- `Trigger type` filter:
  - `Bullish entry`
  - `Bearish trigger`
- `Strategy` filter

### Sorting Rules

Must ship:

- newest entry trigger first

Optional only if stable backend semantics exist:

- oldest entry trigger first
- highest return first
- lowest return first
- company A-Z

Do not add page-local client sorting over a single paginated slice if it makes the overall result order misleading.

### Pagination Rules

- Preserve `limit`, `offset`, `nextOffset`, and `hasMore` semantics from the mounted active API.
- Filter or sort changes must reset pagination to page 1.
- Summary counts must remain consistent with the selected truthful aggregation scope.

## Hover, Truncation, And Overflow Behavior

- `Reason summary` should truncate in the table after one line with full text on hover or keyboard focus.
- Company name may truncate, but symbol must remain visible.
- Numeric fields should not wrap.
- Status labels must not force row height explosions on laptop-width layouts.
- Table overflow must stay inside the table container, not the page shell.
- Summary tiles and tab labels must wrap cleanly rather than causing page-level horizontal overflow.

## Empty States

### Active Positions Empty

Use a domain-specific empty state such as:

`No active signal positions are available for the current market scope.`

Support line:

`Change region or asset type, or return later after new signal-position evidence is published.`

Do not say:

- `No trades`
- `No holdings`
- `No positions closed`

### Closed History Placeholder

This is not an empty state. It is a deferred-proof placeholder.

The message must explain that closed history is intentionally withheld until durable close proof exists.

## Loading States

### Active Positions

- Show a visible loading shell for summary strip and table/list rows.
- Keep column headers or list structure visible so the page does not flash between layouts.

### Closed History

- Render the placeholder immediately.
- Do not show skeleton rows or spinner-only treatment.

## Error States

### Active Positions Error

Recommended primary message:

`Active signal-position data could not be loaded for the current market scope.`

Support line should mention the active `region / assetType` and offer retry.

The error state must not:

- fall back to fabricated rows
- recycle stale closed-history copy
- hide the current scope context

### Closed History

No API-backed error state exists in this child because the tab is placeholder-only.

## Trust-Building Elements

The page should visibly reinforce:

- this is research-support evidence
- entry price and entry date are source-backed
- latest price basis has an explicit date
- return may be stale or unavailable
- strategy version remains visible
- current state is compatibility-only, not durable lifecycle truth
- closed history is intentionally deferred until proof exists

Recommended copy patterns:

- `Return basis stale`
- `Return unavailable`
- `Exit-trigger compatibility`
- `Risk warning`
- `Lifecycle proof deferred`

Avoid:

- `Active trade`
- `Open trade`
- `Winning trade`
- `Losing trade`
- `Realized`
- `Profit`

## Accessibility And Basic Usability

- Tab labels must be keyboard reachable and announced clearly.
- State and trust labels must not rely on color alone.
- Truncated reason summaries must expose the full value on hover and focus.
- Table headers must stay plain and scannable.
- Mobile layout must preserve company, entry, and return visibility without horizontal page overflow.

## Route And Navigation Expectations

Required for the eventual surfaced child:

- first-class route registration
- first-class navigation discoverability
- no dependence on a home-page launch card

Recommended navigation behavior:

- route path `/signal-position-ledger`
- nav label `Signal Position Ledger`
- active-state matching on `/signal-position-ledger` and any later nested detail path if one is later approved

Out of scope for this UX plan:

- row-detail route design
- home page card exposure
- shared navigation redesign

## Acceptance Criteria For Downstream Teams

- The page title and navigation label are `Signal Position Ledger`.
- The default view is `Active Positions`.
- `Closed History` is present as a visible tab.
- `Closed History` renders no rows, no mock counts, and no mock returns.
- `Closed History` calls no API in this child.
- The active surface shows company, symbol, scope, entry date, entry price, reason summary, latest price basis, return from entry, current compatibility state, trust labels, and strategy provenance.
- The page keeps research-support language only.
- The page does not show close-only fields or durable lifecycle claims.
- Pagination and scope behavior remain aligned to the mounted `CF-W2-SPL-01B` semantics.
- Any summary count beyond `totalCount` is either truthfully scope-wide from the backend or explicitly labeled as page-local.

## QA Scenarios

1. Navigation opens `Signal Position Ledger` as a first-class page.
2. The first viewport shows the page header, scope context, summary strip, tab rail, and active-position list/table.
3. `Active Positions` is the default selected tab.
4. Active rows show company, symbol, entry date, entry price, reason summary, latest price basis, return status, current state, trust labels, and strategy provenance.
5. The default order is newest entry trigger first.
6. Market scope changes refetch the active list and update visible scope context.
7. Active-position loading state renders visible skeleton structure, not a blank page.
8. Active-position empty state names the current market scope and does not use trade or holdings language.
9. Active-position error state names the current market scope and does not render fake data.
10. `Closed History` shows only the deferred-proof placeholder text.
11. `Closed History` shows no rows, no counts, no mock data, and no loading table.
12. `Closed History` triggers no API request in this child.
13. `Reason summary` truncates cleanly and exposes full text on hover/focus.
14. State and trust labels remain readable without relying on color alone.
15. No user-visible copy introduces buy/sell, active trade, open trade, profit target, reward/risk, realized P/L, or broker language.

## Architecture Questions Raised By This UX Plan

1. What is the exact mounted backend route path for the active list, and should the mounted response stay identical to `CF-W2-SPL-01B` or add page-safe summary aggregates?
2. Can Team 03 provide truthful scope-wide counts for `EXIT_TRIGGERED`, `RISK_WARNING`, and `STALE / UNAVAILABLE` return basis, or should slice 1 omit those counts beyond `totalCount`?
3. Should the page ship with only default sorting and pagination, or is server-side filtering/search in scope for the mounted child?
4. What is the approved UI label for rows where `healthState = null` and `lifecycleEvidenceStatus = UNAVAILABLE` so the page stays honest without looking broken?
5. Can the page rely on existing feature-local use of shared `PageHeader`, `Tabs`, and `DataTable` patterns without a new shared UI reservation?
6. Which navigation group should own the page: `Daily Work` or `Decision and Proof`?
7. Is a row-level drill target allowed in slice 1, and if so, should it link to Research Hub, Today Review, or remain absent until a dedicated detail child exists?
