# C2-WP-02 Signal Quality Model-Version Gap Discovery

Date: 2026-05-13  
Mode: static discovery only  
Owned write scope used: this handoff file only  
Runtime started: no

## Discovery Decision

The model-version filter/group acceptance gap is real in Signal Quality. It is not already satisfied elsewhere.

Signal Generation now has the needed upstream contract: `modelVersion` is parsed on signal queries, applied in repository filtering, persisted on signal rows, used in latest-run audit lookup, and exposed in DTOs. However, Signal Quality does not expose that filter through its own query parser, backend query type, or UI filters, so a Signal Quality dashboard/history request cannot currently select one raw-signal model version and prove that incompatible generations are excluded.

Because the C2-WP-02 work packet explicitly excludes Signal Quality implementation unless Orchestrator approves a separate read-only consumer slice, the source fix should be treated as a scoped Signal Quality follow-up or an approved consumer-slice expansion, not as silent C2-WP-02 source work.

## Static Evidence

- QA evidence flags the gap directly: `docs/codex-agent-team-plan/qa-evidence/2026-05-13-c2-wp02-qa-evidence.md` says Signal Quality displays model version in history rows but does not expose `modelVersion` filtering/grouping.
- Architecture contract allows the downstream consumer slice: `docs/codex-agent-team-plan/architecture-contracts/2026-05-13-cycle2-architecture-contracts.md` says `signal-quality-lab` may filter/group by model version and that Signal Quality must not mix model versions when a model-version filter is selected.
- Work packet scope boundary: `docs/codex-agent-team-plan/work-packets/2026-05-13-cycle2-work-packets.md` excludes Signal Quality implementation unless separately approved.

Signal Generation side:

- `backend/src/modules/signal-generation-engine/signal-generation-engine.validation.ts` parses `modelVersion` in `parseSignalQuery`.
- `backend/src/modules/signal-generation-engine/signal-generation-engine.repository.ts` applies `modelVersion: query.modelVersion` in `buildWhere`.
- `backend/src/modules/signal-generation-engine/signal-generation-engine.repository.ts` uses that `buildWhere` from `signalHistory` and `signalHistoryCount`.
- `backend/src/modules/signal-generation-engine/signal-generation-engine.repository.ts` filters latest run audit by `{ region, assetType, modelVersion }`.
- `frontend/src/features/signal-generation-engine/components/SignalTable.tsx` and `SignalsDashboardPage.tsx` display model/ruleset/source audit fields.

Signal Quality side:

- `backend/src/modules/signal-quality-lab/signal-quality-lab.types.ts` `QualityQuery` has no `modelVersion`.
- `backend/src/modules/signal-quality-lab/signal-quality-lab.validation.ts` `parseQualityQuery` drops any incoming `modelVersion`.
- All Signal Quality controllers call `parseQualityQuery`, so API callers cannot currently get `modelVersion` through the Signal Quality route boundary.
- `backend/src/modules/signal-quality-lab/signal-quality-lab.service.ts` already passes `QualityQuery` to `SignalGenerationEngineService.signalHistory`; this would be enough for filtering once `modelVersion` survives parsing and typing.
- `frontend/src/features/signal-quality-lab/types.ts` `QualityFilters` has no `modelVersion`.
- `frontend/src/features/signal-quality-lab/components/SignalQualityLabPage.tsx` has filters for readiness, coverage, liquidity, and data-quality booleans only. It displays `item.modelVersion` in instrument history, but it does not let the user select one.
- `frontend/src/features/signal-quality-lab/hooks/useSignalQualityLab.ts` reload dependencies enumerate individual filters and would need a `filters.modelVersion` dependency if a filter is added.

## Required Ownership If Implemented Now

Source ownership needed:

- `backend/src/modules/signal-quality-lab/signal-quality-lab.types.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.validation.ts`
- `frontend/src/features/signal-quality-lab/types.ts`
- `frontend/src/features/signal-quality-lab/hooks/useSignalQualityLab.ts`
- `frontend/src/features/signal-quality-lab/components/SignalQualityLabPage.tsx`

Likely test ownership:

- `backend/tests/modules/signal-quality-lab/signal-quality-lab.validation.test.ts`
- `backend/tests/modules/signal-quality-lab/signal-quality-lab.service.test.ts`
- `backend/tests/modules/signal-quality-lab/signal-quality-lab.routes.test.ts`
- `frontend/tests/ui/signal-quality-lab.spec.ts`

Optional documentation ownership:

- `backend/src/modules/signal-quality-lab/signal-quality-lab.md`

No Prisma/schema ownership is required for the minimal filter because `SignalResult.modelVersion` already exists and Signal Generation repository filtering already supports it.

## Conflict Risk

Risk: moderate.

The current worktree has broad C2 changes, but static `git status` did not show Signal Quality source files as modified. The main risk is ownership overlap: Signal Quality is a downstream module and is referenced by Calibration. Adding an optional query field is backwards compatible, but changing dashboard grouping semantics or adding a new group table could affect calibration expectations if shared service methods are reused.

The lowest-conflict implementation is a filter-only slice first. A separate "group by model version" comparison view can follow after filter acceptance if Product/QA require grouped comparison, because filtering alone prevents mixed generations when selected.

## Proposed Minimal Fix

Backend:

1. Add `modelVersion?: string` to `QualityQuery`.
2. Parse `query.modelVersion` in `parseQualityQuery` with conservative trimming and version validation matching the Signal Generation convention.
3. Ensure no service rewrite is needed for dashboard/history/outcomes because `SignalQualityLabService` already passes the parsed query into `SignalGenerationEngineService.signalHistory`.
4. If the Recalculate action should honor the selected model filter, also add `modelVersion?: string` to `QualityRecalculateRequest`, parse it in `parseQualityRecalculateRequest`, and pass it to `signalHistory` / `signalHistoryCount` inside `recalculate`.

Frontend:

1. Add `modelVersion?: string` to `QualityFilters`.
2. Add a compact "Model version" filter control to the existing `FilterBar`; start with blank "All" plus `signal-engine-v1` or a free-text field if no model-version catalog endpoint exists.
3. Add the active filter label.
4. Add `filters.modelVersion` to `useSignalQualityLab` reload dependencies.
5. Pass the selected model version through instrument history/outcomes and recalculate requests if recalculate is included.

## Validation Plan

Static/unit validation after implementation:

- Backend validation test proves `parseQualityQuery({ modelVersion: "signal-engine-v1" })` preserves the value and rejects/omits empty or invalid values.
- Backend service test with a mocked `SignalGenerationEngineService` proves dashboard, summary, history, outcomes, and count-delta paths call `signalHistory` / `signalHistoryCount` with the selected `modelVersion`.
- Route test proves `GET /signals/quality/dashboard?...&modelVersion=signal-engine-v1` reaches the service with that model version.
- Frontend UI test intercepts dashboard/history requests after selecting a model version and asserts `modelVersion=signal-engine-v1` appears in query params and the active filter label is visible.

Runtime validation when Orchestrator allows processes:

- API smoke: compare `GET /api/v1/signals/quality/dashboard?horizon=20D&region=IN&assetType=STOCK` with `GET /api/v1/signals/quality/dashboard?horizon=20D&region=IN&assetType=STOCK&modelVersion=signal-engine-v1`.
- UI smoke: open Signal Quality, select the model-version filter, confirm performance and instrument-history requests carry the selected model version.
- Regression: run focused Signal Quality backend tests and the focused Signal Quality UI spec.

## Next Developer Action

Ask Orchestrator to assign a Signal Quality read-only consumer slice. If approved, implement the filter-only fix above first. If Orchestrator keeps C2-WP-02 scoped to Signal Generation, leave this as a follow-up acceptance item and do not block Signal Generation source acceptance on Signal Quality UI/API work beyond documenting the boundary.
