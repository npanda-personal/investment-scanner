# UX-01 Shell Navigation QA Plan

Date: 2026-05-14
Mode: Architecture Planning Mode
Work item: UX-01 shell/navigation QA planning
Status: QA plan complete. Awaiting UX-01 implementation.

## 1. Scope

Validate UX-01 only:

- shell nav labels/groups,
- route-family title context,
- home launch target correctness,
- deep-route back-flow behavior,
- alias/canonical compatibility for scoped routes.

Out of scope:

- backend semantic/data validation,
- UX-02/03/04 behavior changes,
- non-navigation feature redesign.

## 2. Source Contracts

- `docs/codex-agent-team-plan/ux-roadmaps/2026-05-14-ux-associate-synthesis-and-po-review.md`
- `docs/codex-agent-team-plan/ux-audits/2026-05-14-associate-ux-navigation-ia-audit.md`
- `docs/codex-agent-team-plan/architecture-contracts/2026-05-14-ux01-shell-navigation-architecture.md`

## 3. Acceptance Verification Matrix

1. Nav group/label validation
   - Confirm group headers map to workflow-first families.
   - Confirm labels include `Today Review` and `Research Command Center`.
   - Confirm no broken character encoding in navigation labels.

2. Route-family shell title validation
   - Open each deep route and verify top bar title resolves to parent workspace:
     - `/today-review/candidates/:candidateId` -> Today Review
     - `/market-data-foundation/:id` -> Market Data Foundation
     - `/stocks/:id` -> Market Data Foundation
     - `/research/stocks/:id` -> Research Command Center
     - `/trade-plans/:instrumentId` -> Trade Plans

3. Home launch target validation
   - Verify home includes only intended primary workflow launches:
     - Today Review
     - Research Command Center
     - Market Data Foundation
     - Trade Plans
     - Portfolios
   - Verify each card button lands on the expected canonical route.

4. Back-flow validation
   - From each scoped detail page, use back action and verify parent route destination.
   - Confirm labels on back controls match destination context.

5. Browser history validation
   - Traverse Today Review -> candidate detail -> research stock/detail -> trade plan.
   - Use browser back/forward and verify no dead ends, title mismatches, or wrong workspace landing.

6. Alias compatibility validation
   - Open legacy alias URLs (`/stocks/:id`) and verify they remain navigable and context-correct.
   - Confirm no 404/regression for existing bookmarks in scoped families.

## 4. Test Surfaces and File-Focused QA

UI smoke/e2e focus:

- `frontend/tests/ui/today-trade-review.spec.ts`
- `frontend/tests/ui/navigation-layout.spec.ts` (create/extend if missing)
- `frontend/tests/ui/market-data-foundation.spec.ts`
- `frontend/tests/ui/research-hub.spec.ts` (create/extend if missing)
- `frontend/tests/ui/trade-plan-risk-engine.spec.ts`
- `frontend/tests/ui/homepage.spec.ts` (create/extend if missing)

Manual verification pages:

- `/`
- `/today-review`
- `/today-review/candidates/<known-id>`
- `/market-data-foundation`
- `/market-data-foundation/<known-id>`
- `/stocks/<known-id>`
- `/research`
- `/research/stocks/<known-id>`
- `/trade-plans`
- `/trade-plans/<known-id>`

## 5. Regression Watchlist

1. Active nav highlight behavior for nested routes.
2. Drawer collapse/expand correctness after metadata-driven groups.
3. Mobile drawer parity with desktop nav labels.
4. `PageHeader` back button behavior consistency.
5. Existing route objects still mount correctly under `NavigationLayout`.

## 6. Evidence Required for Signoff

1. Screenshot set:
   - Updated nav groups and labels.
   - Top bar titles on each scoped deep route.
   - Home launch surface with corrected cards.
2. Short route-trace log:
   - route opened,
   - observed title,
   - observed back destination.
3. Automated test run summary for scoped UI specs.
4. Defect list (if any), with severity and owning file.

## 7. Exit Criteria

QA passes UX-01 when:

1. All acceptance matrix checks pass.
2. No high-severity navigation regressions remain.
3. Alias compatibility is preserved for scoped legacy paths.
4. No out-of-scope UX changes are bundled.

## 8. Blockers

Current blockers: none at planning stage.
Expected blocker type during implementation: missing stable fixture IDs for deep-route manual checks; if encountered, record fixture source and use deterministic local IDs.

## 9. Handoff Status

QA planning complete; execution blocked on implementation delivery and test evidence.
