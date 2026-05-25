# CF-W3-MDPIPE-01B5 / CF-W3-MDPIPE-01B6 - Pipeline Ops Control Migration UX Plan

Date: 2026-05-25

Owner: Team 08 - UX / Research / Copilot

Status: UX plan ready for Team 00 / Team 03 / Team 04 consumption. Control removal remains blocked on `CF-W3-MDPIPE-01B4` command API approval.

## Scope and guardrails

- This plan uses only the current read-only pipeline status surface:
  - `GET /api/v1/pipeline/status`
  - `PipelineStatusSnapshot`
  - `PipelineStatusRun`
  - `PipelineStatusStageGroup`
  - `PipelineStatusStage`
- This plan assumes the new command API is still planned, not approved.
- This plan does not define new backend fields, new stage keys, or new route behavior.
- The Pipeline Ops dashboard remains the Monitoring and Ops home for bulk pipeline work.

## User goal

Give the user one reliable place to monitor and later trigger approved bulk pipeline work, while keeping feature pages focused on research and review. Feature pages should still tell the user whether backend freshness is running, finished, partial, failed, blocked, skipped, or missing for the current scope.

## User journey

1. The user lands on a feature page such as Market Data, Data Quality, Signals, or Today Review.
2. A compact pipeline strip near the page header shows the current scope and the latest backend stage status for that page.
3. If the user needs detail, the strip routes them to `/pipeline-ops`.
4. On `/pipeline-ops`, the user sees the durable stage table, counts, warnings/errors, timestamps, and later any approved command controls.
5. After navigating back, the feature page strip rehydrates from the status API and shows the same active or latest stage state for the current scope.

## Information hierarchy

### `/pipeline-ops`

1. Page header and scope context
2. Global run strip (`activeRun`, `lastRun`, `generatedAt`)
3. Stage table with row-level progress, counts, warnings/errors, and source-page links
4. Manual trigger controls only after command API approval

### Feature pages

1. Page header and core research/workflow actions
2. Compact pipeline strip for the page's mapped stage
3. Page-owned domain content
4. Residual non-pipeline tools that are not being migrated in this slice

The strip is secondary on feature pages. It informs freshness and progress, but it does not replace the main page content.

## Primary and secondary data shown

### Compact strip primary data

- current scope (`region`, `assetType`)
- stage status
- processed vs total count when present
- last started/completed/updated time
- `dataThroughDate` when present
- warning count
- error count
- deep link to `/pipeline-ops`

### Compact strip secondary data

- stage label mapped from the existing stage catalog
- success/partial/fail/skip counts when space allows
- short no-run or no-active-run copy

## Page hierarchy and placement map

The table below separates confirmed current bulk-control pages from catalog-linked indicator targets. Placement assumes the compact strip sits directly under the page header unless noted otherwise.

| Stage key | Route | Current source state | Compact strip placement | Migration rule |
| --- | --- | --- | --- | --- |
| `MARKET_DATA` | `/market-data-foundation` | Confirmed top-level `Sync Catalog` control plus large local progress alert. Also has other local maintenance and instrument-level sync actions. | Below `PageHeader`, above tabs and scope note. | Migrate only the top-level pipeline control/progress to Pipeline Ops after B4. Keep instrument sync, import/backfill, repair, and ingestion tools local until separately approved. |
| `DATA_QUALITY` | `/data-quality` | Confirmed `Evaluate Scope` button and local `BatchProgressBar`. | Below `PageHeader`, above scope explainer. | Replace local bulk trigger/progress with read-only strip plus Pipeline Ops link after B4. |
| `RAW_SIGNALS` | `/signals` | Confirmed `Run Signals` button and local `BatchProgressBar`. | Below `PageHeader`, above the run-options panel. | Replace local bulk trigger/progress after B4. Keep filters, tabs, and latest run audit on page. |
| `SIGNAL_CALIBRATION` | `/signals/calibration` | Confirmed `Run Calibration` button and local `BatchProgressBar`. | Below `PageHeader`, above warnings/blockers and summary cards. | Replace local bulk trigger/progress after B4. Keep horizon/filter controls local. |
| `CONTEXT_SNAPSHOTS` | `/context-snapshots` | Confirmed manual `Generate Snapshot` section plus lookup tool. | Below `PageHeader`, above coverage cards. | Replace only snapshot-generation bulk control after B4. Keep lookup tool local. |
| `SIGNAL_QUALITY` | `/signals/quality` | Confirmed `Refresh Diagnostics` button and local `BatchProgressBar`. | Below `PageHeader`, above page alerts. | Replace local diagnostics-refresh control/progress after B4. |
| `TODAY_REVIEW` | `/today-review` | Confirmed `Run Today's Review` header action and no-run CTA. | Below `PageHeader`, before no-run alert or run panels. | Replace local run CTA and local progress entry points after B4. The page still renders the published review content. |
| `MARKET_CONTEXT` | `/market-context` | Stage is catalog-linked; no current local bulk control was audited in this pass. | Below page header. | Add indicator only when the page already consumes the status API. No control migration defined in B5. |
| `SMART_MONEY` | `/smart-money` | Stage is catalog-linked; no current local bulk control was audited in this pass. | Below page header. | Add indicator only. No control migration defined in B5. |
| `STRATEGY_DECISION` | `/strategy` | Stage is catalog-linked; no current local bulk control was audited in this pass. | Below page header. | Add indicator only. No control migration defined in B5. |
| `BACKTEST_PROOF` | `/backtests` | Confirmed local backtest-run actions, but those are user-configured analysis actions, not proven pipeline commands. | Below `PageHeader`, above backtest forms/tabs. | Add indicator only for proof-refresh status. Do not remove ad hoc backtest execution controls in B5. |
| `RESEARCH_PROJECTION` | `/research` | Stage is catalog-linked; no current local bulk control was audited in this pass. | Below page header. | Add indicator only. No control migration defined in B5. |

## Explicit non-goal mapping

These pages/tools are not part of `CF-W3-MDPIPE-01B5/01B6` unless a later stage and command contract is approved:

- `Trade Plans` page `Generate Plans` action
- per-instrument Market Data sync
- Market Data import/backfill/repair utilities
- Historical Context lookup
- ad hoc backtest execution
- any page or command that is not represented by the current pipeline status catalog

## State model for the compact strip

The strip should use only current stage/run fields from the read-only API.

### Running / pending

- Show `PENDING` or `RUNNING` status clearly.
- Show processed vs total when `totalCount > 0`.
- Use indeterminate progress when total is not known.
- Surface `warnings.length` and `errors.length`.
- Primary action: `View Pipeline Ops`.

### Completed

- Show `COMPLETED`.
- Show latest completed time and `dataThroughDate` when present.
- Show success/partial/fail/skip counts in compact form.
- Keep styling calm; this is freshness evidence, not celebratory feedback.

### Partial

- Show `PARTIAL` as a distinct warning state.
- Lead with processed/total and partial/fail counts.
- Show that results may be incomplete for the current scope.
- Primary action: `View Pipeline Ops` for detail.

### Failed

- Show `FAILED` as a distinct error state.
- Show latest attempted time plus error count.
- Do not show restart controls on the feature page.
- Primary action: `View Pipeline Ops`.

### Blocked

- Show `BLOCKED` distinctly from `FAILED`.
- Do not imply a system error; the strip should read as a precondition or policy stop.
- Show warning/error counts if present and route to Pipeline Ops for detail.

### Skipped

- Show `SKIPPED` as low-emphasis informational state.
- Keep the page usable.
- Offer the Pipeline Ops deep link without suggesting a retry path on the feature page.

## Stale and no-run states

### No run evidence

Use this when the scope has no `activeRun`, no `lastRun`, and no stage evidence.

- Copy should be explicit: no pipeline run evidence yet for this scope.
- Show no progress percentage.
- Keep the page content accessible.

### Stale / out-of-date

The current status API does not provide an explicit stale flag or freshness threshold. Because of that:

- do not invent a global stale calculation from pipeline status alone;
- on pages that already own a trusted freshness concept, the local freshness message may remain alongside the compact strip;
- on pages without a proven freshness rule, use `Last run` or `No recent run evidence` wording instead of a computed stale badge.

This keeps the strip honest until Product/Architecture define a shared stale policy.

## Navigation and rehydration expectations

- The compact strip must reload on mount, on manual page refresh, and when `region` or `assetType` changes.
- Leaving a page and returning must show durable active/latest progress from the status API, not reset to zero because local component state was lost.
- Feature-page strip and Pipeline Ops row for the same stage should agree within the normal polling window.
- The strip must not call providers, trigger pipeline work, or infer progress from page-local batch state.
- If the user changes scope, the strip must swap to the new scope and must not show old-scope counts as current.

## Manual trigger visibility rules

### Before `CF-W3-MDPIPE-01B4` approval

- Feature pages: no manual trigger buttons inside the compact strip.
- Pipeline Ops dashboard: disabled trigger affordance or pending-approval message is acceptable.
- Existing page-local bulk controls stay in place until the command API exists and the source page is explicitly migrated.

### After `CF-W3-MDPIPE-01B4` approval

- Manual trigger controls live only on `/pipeline-ops`.
- Feature pages keep read-only compact status plus deep link.
- Only approved stage keys appear as triggerable commands.
- No feature page should regain a full-width local bulk control once migration is complete.

## Migration sequencing

### Phase 0 - current shipped state

- `/pipeline-ops` exists as read-only dashboard.
- feature pages still own existing bulk controls and local progress UI.
- manual triggers are disabled pending command API approval.

### Phase 1 - `CF-W3-MDPIPE-01B4`

- finalize command API architecture, allowed command matrix, safety rules, and QA plan;
- keep feature pages unchanged during command-API approval.

### Phase 2 - `CF-W3-MDPIPE-01B6` first

- add compact read-only strips to the confirmed bulk-control pages first:
  - Market Data
  - Data Quality
  - Signals
  - Signal Calibration
  - Signal Quality
  - Context Snapshots
  - Today Review
- keep old page-local buttons during this overlap period so the user learns the new Ops location without losing capability.

### Phase 3 - `CF-W3-MDPIPE-01B5` removal pass

- remove only the page-local controls that map to approved pipeline commands;
- replace local batch progress bars/alerts with the compact strip;
- keep non-pipeline or page-specific tools local.

### Phase 4 - catalog-linked indicator expansion

- add strips to Market Context, Smart Money, Strategy, Backtests, and Research once their pages are reserved and the stage/status mapping is confirmed in implementation.

## Empty, error, and loading states

### Loading

- compact strip uses a quiet skeleton or placeholder row near the top of the page;
- avoid large page-blocking spinners when the main page data already loaded.

### Empty / no evidence

- show one sentence for the current scope;
- keep `View Pipeline Ops` available because the dashboard may still help explain missing evidence.

### Error

- if the status API call fails, show a small inline error on the strip and keep page content available;
- do not replace the page's main domain error handling with pipeline-status errors.

## Trust-building elements

- scope chip always visible on the strip
- status label uses the real backend stage status, not a friendlier invented label
- time labels use `startedAt`, `completedAt`, `updatedAt`, and `dataThroughDate` only when present
- progress counts are backend-derived, not frontend-estimated
- feature-page strip always offers a path to the full Pipeline Ops evidence view

## Accessibility and basic usability

- status chip text must remain readable without color alone;
- progress label must include text counts, not only a bar;
- link target to `/pipeline-ops` should have a clear accessible name such as `View Pipeline Ops details`;
- compact strip must collapse cleanly on mobile into stacked rows without truncating status/count text;
- the strip must stay keyboard reachable and appear before dense data tables in tab order;
- error, partial, blocked, and no-run states should use explicit words, not icon-only messaging.

## Acceptance criteria

- Pipeline Ops remains the only intended home for bulk pipeline command controls after B4/B5 migration.
- Confirmed feature pages receive a compact read-only stage strip that uses only status API fields.
- The strip supports `PENDING`, `RUNNING`, `COMPLETED`, `PARTIAL`, `FAILED`, `BLOCKED`, and `SKIPPED` distinctly.
- No-run evidence is explicit and scope-aware.
- Navigation away from a page and back rehydrates stage status from the backend ledger.
- Feature pages do not invent stale thresholds from status data alone.
- Non-pipeline local tools are not removed by accident during the migration.

## QA scenarios to prepare

1. Start or simulate a running stage, open its feature page, navigate to `/pipeline-ops`, then return. Status stays consistent.
2. Visit a scope with no run evidence. Strip shows no-evidence copy and does not show fake progress.
3. Visit a stage with `PARTIAL`. Strip shows warning treatment and routes to Pipeline Ops details.
4. Visit a stage with `FAILED` or `BLOCKED`. Strip stays readable and does not expose page-local retry controls.
5. Confirm `Market Data` top-level sync is removed only after the dashboard command is approved, while instrument-level sync remains local.
6. Confirm `Backtests` keeps user-configured run actions even after the proof-refresh strip lands.
7. Change `region` or `assetType`. Strip rehydrates for the new scope and drops old-scope values.

## Explicit non-goals

- no backend contract expansion in this UX plan
- no new stale algorithm
- no feature-page manual trigger buttons after migration
- no migration of tools that are not in the current pipeline stage catalog
- no broad route, navigation, shared-component, or package work
- no assumption that trade-plan generation, ad hoc backtests, or per-instrument sync already belong to Pipeline Ops

## Ready / blocked note

Ready:

- Team 03 can use this doc to shape B4 command visibility rules and B5/B6 file reservations.
- Team 04 can derive focused UX QA around rehydration, no-run, partial/fail states, and removal safety.

Blocked:

- local bulk-control removal is blocked until `CF-W3-MDPIPE-01B4` defines the command API and approved operation matrix;
- any migration for pages/tools outside the current pipeline stage catalog remains blocked until a later architecture packet adds them explicitly.
