# TEAM-08 - CF-W2-DOV-01 Daily Overview Dashboard UX Outbox

Date: 2026-05-26

Owner: Team 08 - UX / Research / Copilot

State: Docs-only UX planning complete. Ready for Team 00 intake and Team 03 architecture follow-on. Not ready for implementation approval yet.

## Work item

- Requirement: `CF-W2-DOV-01`
- Title: `Daily Overview Interactive Market Dashboard`
- Lane / module family: Lane 3 - Portfolio / Watchlists / Alerts / UX, with cross-system dashboard dependencies
- Mode: docs-only UX planning

## Completed work summary

- Audited the current `/` page and the main nearby summary surfaces named by the requirement.
- Authored the Daily Overview UX plan in the active execution folder.
- Mapped dashboard sections into:
  - current-data sections that can reuse existing truths
  - explicit `Coming soon` placeholders that must not be faked
- Defined interaction model, section ordering, empty/error/loading states, trust-display rules, layout guidance, implementation slice guidance, and forbidden wording/UI claims.

## Files changed

- `docs/execution/codex-parallel-execution-plan-2026-05-16/05-ux/CF-W2-DOV-01-daily-overview-dashboard-ux-plan.md` (new)
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-08-CF-W2-DOV-01-ux-outbox.md` (new)

## Files inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W2-DOV-01-daily-overview-interactive-market-dashboard-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/next-top-10-candidates.md`
- `frontend/src/app/HomePage.tsx`
- `frontend/src/features/today-trade-review/components/TodayReviewPage.tsx`
- `frontend/src/features/research-hub/components/ResearchOverviewPage.tsx`
- `frontend/src/features/pipeline-ops/components/PipelineOpsPage.tsx`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/05-ux/CF-W3-MDPIPE-01B5-01B6-pipeline-ops-control-migration-ux.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-08-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/README.md`

## Behavior changed

- No application behavior changed.
- This pass defines intended UX behavior only.

## Docs changed

- Added the new UX plan for `CF-W2-DOV-01`.
- Added this dedicated Team 08 handoff outbox for Team 00 / Team 03 / Team 04 consumption.

## Contracts changed

- None in code or architecture contracts.
- UX expectations were documented only.

## Tests run

- None.

## Tests skipped

- Builds, typecheck, unit/integration tests, UI smoke tests, and live local validation were skipped because this was a docs-only UX planning pass with no app-code changes.

## Assumptions

- The requirement's listed summary surfaces remain the authoritative current truth sources unless Team 03 finds a contract gap during architecture mapping.
- The dashboard should inherit existing market scope behavior instead of introducing a second scope system.
- The Product Owner still wants `/` to become a working dashboard, not a launch-card page.

## Key UX conclusions

- The first viewport should be dominated by scope, freshness/trust context, and daily pulse, not navigation cards.
- Daily Pulse must be the anchor section because it best answers whether the user can meaningfully review the current scope.
- Candidate, market-environment, evidence-health, and data/pipeline sections should reuse existing module truths rather than inventing a new dashboard score.
- Follow-through and outcome sections are valuable, but current truth is not mature enough; they should remain `Coming soon`.

## Risks

- Architecture may find route-load fanout too expensive if the dashboard pulls too many independent read models directly from the frontend.
- Some summaries referenced by the requirement may exist conceptually but not yet as stable public DTOs for a compact dashboard.
- Cross-module disagreement handling needs architectural care so the dashboard surfaces mixed evidence honestly without duplicating decision logic.

## Blockers

- Team 03 architecture mapping is still required before implementation can be scoped safely.
- Public dashboard composition may need a bounded adapter if current frontend API fanout is too heavy.
- Any section without stable public truth must stay placeholder-only until the owning module exposes it safely.

## Shared-file requests

- None from Team 08 in this docs-only pass.

## Readiness recommendation

- Ready for Team 00 intake: Yes
- Ready for Team 03 architecture: Yes
- Ready for implementation: No

Reason:

- The UX plan is specific enough for architecture and QA planning, but the requirement itself still says Team 03 architecture prep is required first.

## Next gate

- Team 00 intake and file-reservation sequencing
- Team 03 bounded architecture review for source-to-section mapping and adapter need
- Team 04 QA planning after Team 03 defines the first implementation slice

## Evidence notes

- Current `frontend/src/app/HomePage.tsx` is still a launch-card surface and does not satisfy the requirement intent.
- `TodayReviewPage.tsx` and `ResearchOverviewPage.tsx` already expose strong summary patterns that can anchor the dashboard UX.
- `PipelineOpsPage.tsx` confirms that data/pipeline trust should remain visible as a separate evidence lane rather than being buried inside candidate summaries.
