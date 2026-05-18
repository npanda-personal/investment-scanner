# TEAM-02 Requirement Factory Outbox

Date: 2026-05-18

Mode: docs-only backlog refresh after a Research Hub delta-traceability workflow audit. No application code, tests, Prisma, route registries, package manifests, generated files, Team 00 control docs, or Ready queue files changed.

## Work Item

Audit one under-served market-intelligence workflow, convert the evidence into a bounded requirement update, and realign queue docs to the actual 2026-05-18 active, queued, and routed state.

## Files Changed

- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-RH-02-research-hub-what-changed-traceability-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-RH-02A-research-hub-what-changed-fail-closed-basis-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-L3-TREV-02-today-review-candidate-snapshot-provenance-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/next-top-10-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/top-10-ready-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/requirements-backlog.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/refinement-queue.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-02-requirement-factory.md`

## Files Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/16-team-inboxes/TEAM-02-current-assignment.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-RH-01-research-hub-actionability-evidence-wiring-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-RH-02-research-hub-what-changed-traceability-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/next-top-10-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/top-10-ready-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/requirements-backlog.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/refinement-queue.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/audit-ux-research-copilot.md`
- `backend/src/modules/research-hub/research-hub.service.ts`
- `backend/src/modules/research-hub/research-hub.types.ts`
- `backend/src/modules/research-hub/research-hub.md`
- `frontend/src/features/research-hub/components/ResearchOverviewPage.tsx`

## Audited Workflow

Research Hub what-changed delta traceability and fail-closed review-history semantics.

## Evidence Summary

- `research-hub.service.ts` explicitly marks `whatChanged` as simulated for MVP and populates `newTradeCandidates` from the current `tradeCandidates` list instead of from a prior comparison basis.
- `ResearchOverviewPage.tsx` renders `NEW REVIEW CANDIDATES` and the fallback copy `No new review candidates since the last evaluation`, which overclaims temporal evidence when no basis exists.
- `research-hub.types.ts` already contains a bounded `ResearchWhatChanged` container, so the gap is comparison-basis semantics rather than missing layout or route plumbing.
- `research-hub.md` still treats `What Changed` as a core mandate, which raises user-trust risk if the module keeps simulated delta language.

## Requirement Refined This Cycle

`CF-W1-RH-02A` was added as the next bounded requirement. The child should expose comparison-basis status, compared-against timing when auditable, and explicit unavailable-basis fallback semantics without widening into storage/schema work.

## Queue Delta

- `CF-W1-TP-02` is now in active Team 10 review after Team 04 QA ACCEPT and is excluded from the next unassigned pull.
- `CF-W1-SMI-01` is now in active Team 04 QA-planning flow and is excluded from the next unassigned pull.
- `CF-W1-RH-01` is now in active Team 03 architecture readiness and is excluded from the next unassigned pull.
- `CF-W1-L3-TREV-02` is already queued as the next architecture candidate after `CF-W1-RH-01` and is excluded from this cycle.
- `CF-W1-RH-02A` is now recorded as the next top unassigned requirement for Team 00.
- `CF-W1-RH-02` remains as the parent only; future true-delta history work should split later if the bounded child exposes a storage gap.

## Blockers

- `CF-W1-RH-02A`: stop and split if Team 03 cannot identify a safe existing comparison basis and the child would need new durable overview storage.
- `CF-W1-RH-02A`: keep it separate from `CF-W1-RH-01` actionability evidence wiring; this child removes false-delta claims rather than widening Research Hub trust dimensions.
- `CF-W1-RH-02`: keep it as parent only unless the bounded child proves a separate true-delta history/storage requirement is necessary.

## Recommended Next Team 00 Action

Use `CF-W1-RH-02A` as the next top unassigned requirement handoff.

1. Route `CF-W1-RH-02A` to Team 03 for architecture/contract prep and Team 04 for QA-plan prep.
2. Keep `CF-W1-SQLAB-02` and `CF-W1-STRAT-02` next in the filtered pull stack while they remain parent/sequenced items.
3. Keep `CF-W1-RH-01` and `CF-W1-L3-TREV-02` out of this cycle's unassigned routing because they are already active or queued.

## Validation

- Tests run: none
- Builds run: none
- UI checks run: none
- Live local data checks run: none
- Skipped reason: Team 02 stayed inside docs-only backlog/refinement scope

## Notes

- No delegated Product Owner acceptance/support gate was routed to Team 02 in this cycle.
- No item was moved to Ready.
- No application files were reserved or modified.
- No commit was created.
