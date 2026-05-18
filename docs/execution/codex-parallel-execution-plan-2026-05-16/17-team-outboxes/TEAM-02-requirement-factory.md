# TEAM-02 Requirement Factory Outbox

Date: 2026-05-18

Mode: docs-only backlog refresh after a Today Review candidate-provenance workflow audit. No application code, tests, Prisma, route registries, package manifests, generated files, Team 00 control docs, or Ready queue files changed.

## Work Item

Audit one under-served market-intelligence workflow, convert the evidence into a bounded requirement update, and realign queue docs to the actual 2026-05-18 active, queued, and routed state.

## Files Changed

- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/refinement-queue.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/next-top-10-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/top-10-ready-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/requirements-backlog.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-RH-01-research-hub-actionability-evidence-wiring-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-L3-TREV-02-today-review-candidate-snapshot-provenance-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-02-requirement-factory.md`

## Files Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/00-control/active-work-board.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/00-control/team-agent-runtime-queue.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/next-top-10-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/refinement-queue.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/audit-market-data-data-quality.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/audit-ux-research-copilot.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/12-ready-queue/ready-for-implementation.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-architecture-factory.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-06-strategy-signal-risk-2026-05-17.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-02-requirement-factory.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/99-decision-inbox/open-decisions.md`
- `backend/src/modules/research-hub/research-hub.service.ts`
- `backend/src/modules/research-hub/research-hub.types.ts`
- `frontend/src/features/research-hub/components/ResearchOverviewPage.tsx`
- `backend/src/modules/today-trade-review/today-trade-review.md`
- `backend/src/modules/today-trade-review/today-trade-review.types.ts`
- `frontend/src/features/today-trade-review/components/TodayReviewCandidateDetailPage.tsx`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-L3-TREV-02-today-review-candidate-snapshot-provenance-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-RH-02-research-hub-what-changed-traceability-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/requirements-backlog.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/refinement-queue.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/next-top-10-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/top-10-ready-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/00-control/team-agent-runtime-queue.md`

## Audited Workflow

Today Review candidate snapshot provenance and downstream research reviewability.

## Evidence Summary

- `today-trade-review.types.ts` stores multiple upstream snapshots per candidate, but most remain generic records and are not surfaced as explicit provenance in the detail view.
- The same types file already includes `TodayReviewCandidateExplainability` with `sourceModule` and optional `evidenceDate`, plus snapshot publication timestamps such as `createdAt`, `updatedAt`, and `TodayReviewSourceSnapshot.generatedAt`.
- `TodayReviewCandidateDetailPage.tsx` still renders broad `Available / Unavailable` support fields rather than a source-dated provenance chain, so the trust gap is directly visible to users.
- `research-hub.service.ts` and `ResearchOverviewPage.tsx` still leave `CF-W1-RH-02` relevant as the immediate follow-on because `whatChanged` is simulated from current-state data.

## Requirement Refined This Cycle

`CF-W1-L3-TREV-02` was refined as the next bounded requirement. The child should expose candidate-level source-module provenance, owned evidence timing, and compatibility-only fallback labels without recomputing upstream evidence or widening into Trade Plan semantics cleanup.

## Queue Delta

- `CF-W1-TP-02` is now active Team 06 implementation and is excluded from the next unassigned pull.
- `CF-W1-SMI-01` is now active Team 03 architecture prep and is excluded from the next unassigned pull.
- `CF-W1-RH-01` is queued behind `CF-W1-SMI-01` and is excluded from the next unassigned pull.
- `CF-W1-SQLAB-02`, `CF-W1-STRAT-02`, and `CF-W1-MD-02` remain high-value parent items but stay sequenced or blocked for new bounded routing.
- `CF-W1-L3-TREV-02` is now recorded as the next top unassigned requirement for Team 00.
- `CF-W1-RH-02` is the next follow-on discovery item behind `CF-W1-L3-TREV-02`.

## Blockers

- `CF-W1-L3-TREV-02`: stop if candidate provenance requires upstream recomputation, schema changes, or cross-module snapshot normalization instead of owned stored fields.
- `CF-W1-RH-02`: stop and split if real delta traceability requires new durable overview storage.
- `CF-W1-L3-TREV-02`: keep it separate from `CF-W1-L3-TREV-01` run-level publication evidence and from `CF-W1-TP-02` target-language cleanup.

## Recommended Next Team 00 Action

Use `CF-W1-L3-TREV-02` as the next top unassigned requirement handoff.

1. Route `CF-W1-L3-TREV-02` to Team 03 for architecture/contract prep and Team 04 for QA-plan prep.
2. Keep `CF-W1-RH-02` next and keep `CF-W1-RH-01` in the queued-after-`CF-W1-SMI-01` slot already assigned by Team 00.
3. Leave `CF-W1-SQLAB-02`, `CF-W1-STRAT-02`, and `CF-W1-MD-02` visible as high-value parent items, but do not present them as the next unassigned pull while they remain sequenced or blocked.

## Validation

- Tests run: none
- Builds run: none
- UI checks run: none
- Live local data checks run: none
- Skipped reason: Team 02 stayed inside docs-only backlog/refinement scope

## Notes

- No delegated Product Owner acceptance/support gate was routed to Team 02 in this cycle.
- No acceptance ambiguity was identified from the inspected requirement queue; if Team 00 routes a specific acceptance-support packet later, it should preempt further discovery work.
- No item was moved to Ready.
- No application files were reserved or modified.
- No commit was created.
