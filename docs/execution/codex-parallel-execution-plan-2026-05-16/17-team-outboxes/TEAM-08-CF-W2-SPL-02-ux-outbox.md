# TEAM-08 - CF-W2-SPL-02 Signal Position Ledger UX Outbox

Date: 2026-05-26

Owner: Team 08 - UX / Research / Copilot

State: Docs-only UX planning complete. Ready for Team 00 intake, Team 03 architecture follow-on, and Team 04 QA planning. Not ready for implementation approval yet.

## Work item

- Requirement: `CF-W2-SPL-02`
- Title: `Signal Position Ledger active positions surface`
- Lane / module family: Lane 3 UX surface with Lane 2 signal-evidence dependency
- Mode: docs-only UX planning

## UX verdict

Ship one truthful page named `Signal Position Ledger`.

Recommended first slice:

- `Active Positions` as the default tab, backed only by accepted `CF-W2-SPL-01B`
- `Closed History` as a visible placeholder-only tab

The first viewport should be an active-position review surface with:

- page title and research-support framing
- visible `region / assetType`
- compact summary strip
- tab rail
- active-position table

`Closed History` must remain deferred-proof UX only. No rows, counts, mock data, or inferred close returns are allowed in this child.

## Completed work summary

- Audited root guidance, SPL parent and child requirements, UX product rules, and Team 03 / Team 04 `CF-W2-SPL-01B` packets.
- Confirmed that the first surfaced child must stay aligned to accepted `CF-W2-SPL-01B` active-row truth only.
- Defined page naming, route-label recommendation, first viewport, table/list structure, summary-strip rules, filters/sorting rules, overflow behavior, and state handling.
- Locked `Closed History` to placeholder-only behavior with explicit deferred-proof copy.
- Documented acceptance-oriented QA checks and architecture questions for route/nav/API exposure.

## Files changed

- `docs/execution/codex-parallel-execution-plan-2026-05-16/05-ux/CF-W2-SPL-02-signal-position-ledger-active-surface-ux-plan.md` (new)
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-08-CF-W2-SPL-02-ux-outbox.md` (new)

## Files inspected

- `AGENTS.md`
- `docs/ux-ui-best-practices.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W2-SPL-01-signal-position-ledger-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W2-SPL-02-signal-position-ledger-active-surface-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W2-SPL-01A-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W2-SPL-01B-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W2-SPL-01B-active-position-read-model-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W2-SPL-01B-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/00-control/active-work-board.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/05-ux/CF-W2-DOV-01-daily-overview-dashboard-ux-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-08-CF-W2-DOV-01-ux-outbox.md`
- `frontend/src/app/routes.tsx`
- `frontend/src/app/navigationMetadata.tsx`

## Behavior changed

- No application behavior changed.
- This pass defines intended page behavior only.

## Docs changed

- Added a new `CF-W2-SPL-02` UX plan.
- Added this dedicated Team 08 UX outbox for Team 00 / Team 03 / Team 04 consumption.

## Contracts changed

- None in code or architecture contracts.
- UX expectations were documented only.

## Tests run

- None.

## Tests skipped

- Builds, typecheck, unit/integration tests, UI smoke tests, and live local validation were skipped because this was a docs-only UX planning pass with no app-code changes.

## Assumptions

- Accepted `CF-W2-SPL-01B` remains the only truthful active-row basis for this surfaced child.
- No durable closed-history source exists on the current base.
- Team 00 still controls all shared-file reservations for backend route registry, frontend routes, and navigation metadata.
- The eventual page should inherit existing market scope behavior rather than introduce a second scope system.

## Recommended first viewport

1. `Signal Position Ledger` page header
2. research-support subtitle plus current `region / assetType`
3. summary strip:
   - `Active positions`
   - `Exit-trigger compatibility`
   - `Risk warning`
   - `Return basis limited`
4. tab rail with `Active Positions` selected and `Closed History` visible
5. top of the active-position table

## Key UX conclusions

- The module should read like a current evidence ledger, not a portfolio screen.
- `Active Positions` should be the only truth-bearing tab in slice 1.
- `Closed History` should be visible now, but only as a proof-deferred placeholder.
- Company identity, entry evidence, return basis, trust status, and strategy provenance must all stay visible in the first scan.
- If summary counts beyond `totalCount` cannot be provided truthfully across scope, they should be omitted or labeled as page-local rather than guessed from one page.
- Row detail should stay absent unless Team 03 explicitly opens a detail target.

## Risks

- The mounted API may not provide truthful scope-wide summary counts beyond `totalCount`.
- Filter and sort ambitions can outgrow the accepted `CF-W2-SPL-01B` response unless Team 03 explicitly adds safe mounted-surface query semantics.
- A weak `healthState = null` presentation could look broken unless architecture and UX agree on a clear neutral label.
- Navigation placement could drift if Team 00 opens the page without a documented group decision.

## Blockers

- Team 03 must define the mounted backend route shape and whether summary aggregates are additive in this surfaced child.
- Team 00 must reserve shared writers for:
  - `backend/src/api/routes.ts`
  - `frontend/src/app/routes.tsx`
  - `frontend/src/app/navigationMetadata.tsx`
- Team 04 still needs the acceptance-oriented QA plan for active-surface plus closed-placeholder behavior only.

## Shared-file requests

- None opened by Team 08 directly.
- Team 08 is flagging the expected shared-file surface for Team 00 / Team 03 control only.

## Readiness recommendation

- Ready for Team 00 intake: Yes
- Ready for Team 03 architecture: Yes
- Ready for Team 04 QA planning: Yes
- Ready for implementation: No

Reason:

- The UX shape is now specific and honest, but route exposure, navigation placement, mounted API shape, and summary-count semantics still need architecture and sequencing control.

## Architecture questions

1. What exact backend route path should mount the active list, and does the mounted child return only the `CF-W2-SPL-01B` list payload or additive summary aggregates too?
2. Can the surfaced child provide truthful scope-wide counts for exit-trigger compatibility, risk warning, and stale/unavailable return basis?
3. Are server-side filters or search in scope now, or should the page launch with only scope, pagination, and default sort?
4. What user-facing neutral label should represent `healthState = null` with unavailable lifecycle proof?
5. Can the page stay inside existing `PageHeader`, `Tabs`, and `DataTable` patterns without a shared UI reservation?
6. Should navigation place `Signal Position Ledger` under `Daily Work` or `Decision and Proof`?
7. Should slice 1 allow any row drilldown to Research Hub or Today Review, or keep rows non-navigable until a detail child exists?

## Next gate

- Team 00 intake and sequencing
- Team 03 mounted route / nav / DTO architecture packet
- Team 04 QA plan for active-surface plus closed-placeholder behavior only

## Evidence notes

- Current accepted `CF-W2-SPL-01B` proves active-row evidence only.
- The parent and child requirements already support a visible placeholder `Closed History` tab, but only if the page stays explicit that close-proof truth is deferred.
- Current main workspace route and navigation files do not yet expose a Signal Position Ledger page, so this child remains a shared-file architecture gate before implementation.
