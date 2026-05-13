# Associate UX Data/Operations Audit - 2026-05-14

Status: Complete for audit artifact creation. No production code was changed.
Scope: Market Data Foundation, Data Quality Engine, batch operations, progress/status feedback, long-running jobs, error visibility, performance expectations, and operational trust.

## Executive Summary

The current data-operations experience is technically rich but operationally hard to scan. The UI exposes the right data in most places, but it spreads trust, signoff, readiness, repair queues, batch progress, and raw diagnostics across too many containers. That makes it difficult for an operator to answer the questions that matter first:

1. Is downstream work allowed right now?
2. What is blocking it?
3. Which bounded action should I run next?
4. Did the last run actually move the trust state forward?

The main UX opportunity is to reduce ambiguity, not add more data. The Market Data Foundation and Data Quality screens already surface strong backend contracts. The screens need a stricter reading order, sharper status semantics, and better separation between summary, repair, and deep diagnostics.

## Evidence Anchors

- Market Data Foundation page shell, catalog/import tabs, sync banner, and data-health handoff: [frontend/src/features/market-data-foundation/components/MarketDataFoundationPage.tsx](../../../frontend/src/features/market-data-foundation/components/MarketDataFoundationPage.tsx)
- Market Data trust/signoff, review readiness, repair workbench, operational repair run, and blockers: [frontend/src/features/market-data-foundation/components/MarketDataStatusPanel.tsx](../../../frontend/src/features/market-data-foundation/components/MarketDataStatusPanel.tsx)
- Data Quality Engine page shell, batch progress, summary cards, filters, table, and diagnostics drawer: [frontend/src/features/data-quality-engine/components/DataQualityEnginePage.tsx](../../../frontend/src/features/data-quality-engine/components/DataQualityEnginePage.tsx)
- Shared batch progress pattern: [frontend/src/shared/components/BatchProgressBar.tsx](../../../frontend/src/shared/components/BatchProgressBar.tsx)
- Shared page header and filter/table primitives: [frontend/src/shared/components/PageHeader.tsx](../../../frontend/src/shared/components/PageHeader.tsx), [frontend/src/shared/components/FilterBar.tsx](../../../frontend/src/shared/components/FilterBar.tsx), [frontend/src/shared/components/DataTable.tsx](../../../frontend/src/shared/components/DataTable.tsx)
- Contract guidance: [docs/ux-ui-best-practices.md](../../../docs/ux-ui-best-practices.md)
- Data Quality module contract: [backend/src/modules/data-quality-engine/data-quality-engine.md](../../../backend/src/modules/data-quality-engine/data-quality-engine.md)
- Market Data invariants: [docs/module-verification-register.md](../../../docs/module-verification-register.md)

## Current Problems

### 1. Market Data trust is split across too many visible surfaces

The Market Data status panel shows:

- Universe Health
- Universe Signoff
- Review Readiness Summary
- Trusted Review Universe
- Trusted Universe Repair Workbench
- Operational Repair Run
- Universe Repair Workflow
- Stock Missing Data Diagnostics
- Top Readiness Blockers

Each of these is valid, but together they make the page read like a technical dump rather than an operational control surface. The user must reconcile trust status, signoff status, review readiness, lane recommendations, lane buttons, and run history manually.

Relevant code:
- [MarketDataStatusPanel.tsx](../../../../frontend/src/features/market-data-foundation/components/MarketDataStatusPanel.tsx) around lines 493, 527, 573, 612, 660, 733, 1017, 1280.

### 2. Success styling can still be misread as final trust

The UI does attempt to distinguish trust, signoff, and run state, but the page still makes it easy to misread a completed run as a green light. The acceptance condition is stricter than the current visual emphasis:

- run completed
- no further run needed
- final trust is OK
- universe signoff passes

That logic exists in code, but the visual hierarchy does not force the operator to notice the negative cases first.

Relevant code:
- [MarketDataStatusPanel.tsx](../../../../frontend/src/features/market-data-foundation/components/MarketDataStatusPanel.tsx) lines 118 to 128, 776 to 830.

### 3. Repair runs are information-dense but not decision-dense

The operational repair run card shows before/after evidence, action chips, blockers, and warnings. It does not clearly answer:

- What changed on this run?
- What remains blocked?
- Do I need another run?
- Is this a partial drain, a manual-required stop, or a true finish?

The same issue shows up in the lane workbench. The lanes are useful, but the visual system does not strongly differentiate recommended next action, queue size, and last run evidence.

Relevant code:
- [MarketDataStatusPanel.tsx](../../../../frontend/src/features/market-data-foundation/components/MarketDataStatusPanel.tsx) lines 660 to 772, 776 to 830, 845 to 1017.

### 4. The catalog table is too inventory-heavy for default scanning

The catalog grid includes identity, provider support, data health, and status fields that are useful, but the default column set still feels closer to an admin inventory list than an operator decision table. The drawer then repeats much of the same identity and provider data.

The default grid should emphasize the fields that drive action:

- symbol
- company
- provider support
- data health
- latest update
- quick action

The rest belongs in the drawer.

Relevant code:
- [MarketDataFoundationPage.tsx](../../../../frontend/src/features/market-data-foundation/components/MarketDataFoundationPage.tsx) lines 602 to 657 and 1163 onward.

### 5. Import/backfill controls do not fully explain why a path is blocked

The import tab is functional, but the user still has to infer the operational model from a mix of chips and alerts:

- configured URL
- manual CSV
- internal seed
- URL configured yes/no
- source source-type
- manual CSV required

This is correct information, but the control panel should explain the import mode, supported source, and the reason for disabled actions more directly.

Relevant code:
- [MarketDataFoundationPage.tsx](../../../../frontend/src/features/market-data-foundation/components/MarketDataFoundationPage.tsx) lines 907 to 1001.

### 6. Data Quality Engine is structured, but the reading order is still generic

The Data Quality page already does several things right:

- scoped evaluation controls are visible
- batch progress is shown
- review readiness summary is exposed
- filters are compact
- diagnostics are in a drawer

But the page still mixes summary cards, review-readiness context, tabs, filters, the table, and the diagnostics drawer without a clear operator-first hierarchy. The result is functional but not decisive.

Relevant code:
- [DataQualityEnginePage.tsx](../../../../frontend/src/features/data-quality-engine/components/DataQualityEnginePage.tsx) lines 233 to 460.

### 7. Shared batch progress is too generic for operational work

`BatchProgressBar` is reusable, but its current presentation is minimal: a single label, a single progress bar, and a comma-separated count line. That is not enough for long-running jobs where operators need to distinguish:

- processed
- evaluated
- skipped
- failed
- out of scope
- not yet evaluable

The component needs stronger state separation if it is going to stay shared.

Relevant code:
- [BatchProgressBar.tsx](../../../../frontend/src/shared/components/BatchProgressBar.tsx)

## Proposed Data-Operations UX

### 1. Make Market Data Foundation a three-band control page

Band 1: Trust gate

- Show one explicit downstream gate.
- Make the gate state read as "allowed" or "blocked", not just "healthy" or "partial".
- Show the minimum counts and blocker families in the same container.
- Place the next bounded action directly beside the gate.

Band 2: Repair control

- Show repair workbench lanes as bounded queues.
- Each lane should show queue size, eligible count, retry/manual counts, batch size, and the most recent run evidence.
- Recommended lane should be visually dominant.
- Disabled action buttons must say why they are disabled.

Band 3: Diagnostics and inventory

- Show the catalog table and deep diagnostics after the operational controls.
- Keep identity, provider details, and raw blocker evidence in drawers or secondary panels.

### 2. Convert trust/signoff into one readable operator story

The page should answer in sequence:

1. Is the universe trusted?
2. Is downstream allowed?
3. What exact blocker families remain?
4. What is the next action?

Trust, signoff, and review readiness should remain separate concepts in the data model, but the UI should present them as one ordered narrative rather than three equally weighted cards.

### 3. Make repair runs evidence-first

The repair run summary should always show:

- start state
- end state
- changed counts
- remaining blockers
- whether another run is needed
- final trust and signoff outcome

When the run is partial, blocked, or manual-required, the treatment should be warning/error, not success-adjacent.

### 4. Make the catalog table a scan table, not a dossier

Default columns should favor scan and decision:

- symbol
- company
- provider support
- data health
- latest update
- quick actions

Move provider symbol, raw identity, detailed metadata, and all secondary diagnostics into the drawer.

### 5. Make Data Quality read as a workflow, not a dashboard

The page should use a strict order:

1. scope and action
2. batch progress
3. readiness summary
4. view tabs
5. filters
6. table
7. diagnostics drawer

The top of the page should always tell the user whether the scope is ready, blocked, or limited before they scan the table.

### 6. Upgrade shared batch progress semantics

The shared progress component should support:

- determinate and indeterminate states
- explicit total when known
- separate count buckets for each operational meaning
- a terminal completion state that is visually distinct from in-flight progress
- an error state that does not look like success

## Acceptance Criteria

### Market Data Foundation

- A user can tell whether downstream workflows are allowed without opening a drawer.
- The page shows trust, signoff, and next bounded action in one place.
- Partial, blocked, and manual-required states are not styled as success.
- The repair workbench shows queue size, batch size, and latest run evidence for every lane.
- The operational repair run shows before/after evidence and clearly states whether another run is required.
- The catalog table defaults to scan-friendly columns and moves secondary identity details into the drawer.

### Data Quality Engine

- The page makes scoped evaluation the primary action.
- Batch progress shows processed, evaluated, skipped, failed, and warnings counts in a readable way.
- The review-readiness summary is visible before the table.
- Filters reset pagination to the first page.
- Empty states name the active filters and explain the zero-result condition.
- The diagnostics drawer contains deep detail without cluttering the table.

### Shared Components

- `BatchProgressBar` can represent long-running operations without collapsing all counts into one line of text.
- Progress components can express terminal success, partial completion, and errors with different visual weight.
- Shared filter and table patterns preserve global market scope while supporting local reset behavior.

## Risks

- The backend already uses fine-grained trust and repair semantics. If the UI compresses them again, the operator will lose the distinction the system is trying to provide.
- These screens are intentionally count-heavy. Over-simplifying them would hide the operational truth.
- Long-running jobs can appear frozen if progress is not tied to batch and queue semantics the user understands.
- The current catalog and repair surfaces are already used by multiple flows. Tightening the hierarchy must not remove access to deep diagnostics.
- Shared progress changes will affect more than Market Data and Data Quality, so the component contract must remain consistent across modules.

## Priority Order

1. Rebuild the Market Data trust/signoff header into one gate-first summary.
2. Rework the operational repair run and workbench into queue-first evidence panels.
3. Reduce catalog table density and push secondary identity data into the drawer.
4. Reorder the Data Quality page around batch progress and readiness before the table.
5. Strengthen the shared batch progress component so long jobs read as operational work, not generic loading.

## Handoff Note

This audit is complete as a document-only deliverable. The next implementation owner should use this artifact as the UX contract for any follow-up screen work on Market Data Foundation, Data Quality Engine, or shared batch/progress components.
