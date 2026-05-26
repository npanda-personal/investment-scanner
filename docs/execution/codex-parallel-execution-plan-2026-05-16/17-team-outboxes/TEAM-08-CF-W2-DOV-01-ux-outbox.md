# TEAM-08 - CF-W2-DOV-01 Daily Overview Dashboard UX Outbox

Date: 2026-05-26

Owner: Team 08 - UX / Research / Copilot

State: Docs-only investor/trader-first UX reframe complete. Ready for Team 00 intake and Team 03 architecture follow-on. Not ready for implementation approval yet.

## Work item

- Requirement: `CF-W2-DOV-01`
- Title: `Daily Overview Interactive Market Dashboard`
- Lane / module family: Lane 3 - Portfolio / Watchlists / Alerts / UX, with cross-system dashboard dependencies
- Mode: docs-only UX planning

## Completed work summary

- Re-audited the current DOV requirement, architecture note, and prior Team 08 UX handoff after Product Owner reframe.
- Replaced the prior admin-leaning UX plan with an investor/trader-first dashboard plan.
- Defined the first viewport around:
  - `Market Pulse`
  - `High-Priority Review Candidates`
  - `Market Movers`
  - `Institutional Flow`
  - `Watch And Blocked`
  - compact `Evidence Caveats`
- Locked `Market Movers` to `Coming soon - Market Movers` for slice 1 unless architecture finds a truthful stored-data source.
- Locked `Institutional Flow` to `Coming soon - FII/DII Activity` for slice 1 unless architecture finds a truthful local source.
- Moved admin/diagnostic surfaces to compact caveats and supporting navigation instead of first-viewport identity.
- Updated acceptance criteria, QA scenarios, copy rules, and architecture questions for the new layout direction.

## Files changed

- `docs/execution/codex-parallel-execution-plan-2026-05-16/05-ux/CF-W2-DOV-01-daily-overview-dashboard-ux-plan.md` (replaced / reframed)
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-08-CF-W2-DOV-01-ux-outbox.md` (updated)

## Files inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W2-DOV-01-daily-overview-interactive-market-dashboard-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W2-DOV-01-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/05-ux/CF-W2-DOV-01-daily-overview-dashboard-ux-plan.md` (prior version)
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W2-DOV-01-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-08-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/README.md`

## Behavior changed

- No application behavior changed.
- This pass defines intended UX behavior only.

## Docs changed

- Replaced the old DOV UX plan with the investor/trader-first reframe.
- Updated this dedicated Team 08 handoff outbox for Team 00 / Team 03 / Team 04 consumption.

## Contracts changed

- None in code or architecture contracts.
- UX expectations were documented only.

## Tests run

- None.

## Tests skipped

- Builds, typecheck, unit/integration tests, UI smoke tests, and live local validation were skipped because this was a docs-only UX planning pass with no app-code changes.

## Assumptions

- Today Review and Research Hub remain the primary truthful source for review candidates in slice 1.
- No truthful market-wide movers source exists on the current base unless Team 03 finds one during architecture refresh.
- No truthful local FII/DII source exists on the current base unless Team 03 finds one during architecture refresh.
- The dashboard should inherit existing market scope behavior instead of introducing a second scope system.
- The Product Owner still wants `/` to become a working dashboard, not a launch-card page.

## Key UX conclusions

- The first viewport should read like a daily market briefing, not an operations console.
- `Market Pulse` and `High-Priority Review Candidates` are the first-viewport anchors.
- `Market Movers` and `Institutional Flow` should still be present in the first viewport, but as explicit `Coming soon` placeholders in slice 1.
- `Watch And Blocked` belongs in the main overview because it prevents false confidence.
- `Evidence Caveats` must stay compact and secondary.
- Admin/diagnostic content should move below the main briefing slices or into supporting navigation.

## Risks

- Architecture may find that the current `Market Pulse` sources do not support a clean investor-facing headline without overclaiming asset-type precision.
- Architecture may find route-load fanout too expensive if the dashboard pulls too many independent read models directly from the frontend.
- Some summaries referenced by the reframe may exist conceptually but not yet as stable public DTOs for a compact dashboard.
- Cross-module disagreement handling still needs architectural care so the dashboard surfaces mixed evidence honestly without duplicating decision logic.

## Blockers

- Team 03 architecture mapping is still required before implementation can be scoped safely against the new first-viewport layout.
- Public dashboard composition may need a bounded adapter if current frontend API fanout is too heavy.
- `Market Movers` and `Institutional Flow` must stay placeholder-only unless architecture proves a truthful current source.
- Any section without stable public truth must stay placeholder-only until the owning module exposes it safely.

## Shared-file requests

- None from Team 08 in this docs-only pass.

## Readiness recommendation

- Ready for Team 00 intake: Yes
- Ready for Team 03 architecture: Yes
- Ready for implementation: No

Reason:

- The UX plan is specific enough for architecture and QA planning, but Team 03 still needs to confirm whether the new first-viewport composition is source-safe and whether any current source can truthfully graduate `Market Movers` or `Institutional Flow` from placeholder state.

## Next gate

- Team 00 intake and file-reservation sequencing
- Team 03 bounded architecture review for source-to-section mapping and adapter need
- Team 04 QA planning after Team 03 defines the first implementation slice

## Evidence notes

- The prior Team 08 plan still led with a pulse/trust-first structure that was too close to an admin-style dashboard.
- The requirement and Team 03 architecture note now both point to an investor/trader-first reframe.
- Current source truth still supports candidates and caveats better than market-wide movers or FII/DII.
