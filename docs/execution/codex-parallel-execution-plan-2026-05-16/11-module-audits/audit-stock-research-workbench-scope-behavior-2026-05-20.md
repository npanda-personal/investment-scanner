# Audit: Stock Research Workbench Scope Behavior

Date: 2026-05-20

Mode: Read-only docs/source audit. No application source, tests, requirements, ready-queue, architecture, QA, or active-board files were edited.

## Workflow Audited

Stock Research Workbench instrument detail scope behavior for `/research/stocks/:id`.

This is a direct investor/trader research workflow, but it is not one of the current top-five fresh requirement candidates.

## Why This Audit Was Run

The older UX audit flagged a possible scope-behavior gap (`CF-W1-UX-03`) for research and copilot summaries. Team 02 needed to verify whether Stock Research Workbench still justifies a fresh bounded requirement behind the current top five, or whether that gap is already covered by an existing open requirement.

## Files Inspected

- `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/audit-ux-research-copilot.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-UX-01-stock-research-workbench-trust-surfaces-requirement.md`
- `frontend/src/features/stock-research-workbench/api/stockResearchWorkbenchService.ts`
- `frontend/src/features/stock-research-workbench/components/StockResearchWorkbenchPage.tsx`
- `backend/src/modules/stock-research-workbench/stock-research-workbench.controller.ts`
- `backend/src/modules/stock-research-workbench/stock-research-workbench.service.ts`
- `backend/src/modules/stock-research-workbench/stock-research-workbench.md`

## Evidence

- The older UX audit explicitly listed `CF-W1-UX-03` as a candidate for market-scope refresh and clear behavior in research and copilot summaries, but it did not prove that this needed a separate requirement from the existing Workbench trust parent. `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/audit-ux-research-copilot.md:32`
- The open Workbench parent already captures the same scope-proof gap: the frontend service sends only `range`, not `region` or `assetType`, and the page still needs explicit scope-change and refetch semantics. `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-UX-01-stock-research-workbench-trust-surfaces-requirement.md:19` and `:35`
- The current frontend API client confirms that the workbench request only sends `range`. `frontend/src/features/stock-research-workbench/api/stockResearchWorkbenchService.ts:6-12`
- The page component loads by `instrumentId` plus `range` and does not subscribe to `useMarketScope()` or display an explicit active scope label. `frontend/src/features/stock-research-workbench/components/StockResearchWorkbenchPage.tsx:52-75`
- The backend controller and service also work from `instrumentId` plus `range`; no `region` or `assetType` query parameters are accepted or echoed in the current workbench contract. `backend/src/modules/stock-research-workbench/stock-research-workbench.controller.ts:10-20` and `backend/src/modules/stock-research-workbench/stock-research-workbench.service.ts:8-61`
- The module doc claims trust metadata visibility is done, but the same doc does not define explicit scope-proof or scope-refresh behavior for the Workbench route. `backend/src/modules/stock-research-workbench/stock-research-workbench.md:84-95`

## Finding

There is a real under-served scope-behavior gap in Stock Research Workbench, but it is not a fresh requirement candidate.

It is already part of the open `CF-W1-UX-01` parent requirement. Creating a new `CF-W1-UX-03` or equivalent child now would duplicate the same evidence, fragment Team 03/08 follow-on planning, and likely reopen shared trust-surface questions that the existing parent already owns.

## Queue Decision

Do not create a new requirement ID in this pass.

Keep the queue unchanged and treat Workbench scope behavior as existing parent follow-on scope under `CF-W1-UX-01`, behind the current top-five direct-value stack:

1. `CF-W1-HCTX-03`
2. `CF-W1-DQ-03`
3. `CF-W1-MCTX-02`
4. `CF-W1-STRAT-04`
5. `CF-W1-SQLAB-03`

## Why It Stays Behind The Top Five

- It is useful, but it is still a trust-surface refinement on an existing research page rather than an upstream market-data, DQ, context, strategy, or signal-quality trust gap.
- The current top five are cleaner module-local direct-value packets with active Team 03/04 preparation already underway for the first three.
- A Workbench scope child would likely touch frontend feature behavior plus backend contract semantics and may also need downstream widget-eligibility alignment, so it is not the next safest bounded slice.

## Consent / Blocker Notes

- No consent gate is opened in this pass.
- If a future Workbench child needs route changes, shared UI, shared widget internals, or fabricated trust fields, it should stop and return to Team 00 / Team 03 for consent-boundary review.

## Product Owner Action

No Product Owner action is required for this audit result.

The queue can stand as-is.
