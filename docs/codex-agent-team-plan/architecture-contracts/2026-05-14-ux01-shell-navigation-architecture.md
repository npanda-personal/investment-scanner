# UX-01 Shell Navigation Architecture Contract

Date: 2026-05-14
Mode: Architecture Planning Mode
Work item: UX-01 shell, route context, labels, and home launch targets
Owner lane: Frontend UX / Navigation
Status: Architecture contract complete. Runtime implementation not started.

## 1. Objective

Deliver UX-01 as a bounded shell/navigation slice that improves orientation and workflow launch quality without changing backend behavior.

Required UX-01 outcomes:

1. Workflow-first nav grouping and labels.
2. Route-family-aware shell title on deep routes.
3. Corrected labels (`Today Review` encoding fix, `Research Command Center` consistency).
4. Home launch cards aligned to primary workflows.
5. Predictable deep-route back targets.

## 2. In Scope vs Out of Scope

In scope:

- Shell nav group metadata and rendering.
- Top bar active title resolution using route-family metadata.
- Route metadata contract for canonical route, aliases, and back target.
- Home page launch target corrections and card set reduction to primary workflows.
- Back-flow normalization for known detail pages touched by UX-01.

Out of scope:

- Backend API/module changes.
- Feature-level content redesign for UX-02/03/04.
- New strategy/data logic.
- Broad visual-system refactor.
- Any runtime changes outside explicitly listed frontend files.

## 3. Route Metadata and Back-Flow Contract

## 3.1 Canonical Workspace Families

Define shell families (used by nav, title, and back-flow):

1. `daily-work`
2. `foundation`
3. `signal-chain`
4. `decision-proof`
5. `portfolio-ops`
6. `account-support`

Each navigable workspace entry must declare:

- `id`
- `label`
- `family`
- `canonicalPath`
- `matchPrefixes` (for deep-route title resolution)
- optional `aliases` (redirect-capable legacy paths)
- optional `defaultBackTarget` (for detail pages)

## 3.2 Required Canonical/Alias Policy in UX-01

- `/market-data-foundation/:id` remains canonical stock data detail.
- `/stocks/:id` remains alias-compatible; title/back-flow must resolve to Market Data Foundation family.
- `/research/stocks/:id` remains research stock detail; title/back-flow must resolve to Research Command Center family.
- `/today-review/candidates/:candidateId` resolves to Today Review family with back target `/today-review`.
- `/trade-plans/:instrumentId` resolves to Trade Plans family with back target `/trade-plans`.

No alias removal in UX-01; preserve bookmark compatibility.

## 3.3 Shell Title Resolution Rule

Replace exact-path-only title behavior with family/prefix matching:

1. If route matches an exact nav item path, use its label.
2. Else if pathname starts with any configured `matchPrefixes`, use that workspace label.
3. Else fallback to `Investment Scanner`.

This prevents deep-route fallback to generic app name.

## 3.4 Back-Flow Rule

Detail pages in UX-01 scope must follow one policy:

- Use `PageHeader` `backTo`/`backLabel` or equivalent shared behavior that returns to workspace canonical parent.
- Avoid ad hoc back buttons with conflicting destinations for the same workspace.

## 4. UX-01 Frontend Write Scope (Implementation Reservation)

Primary files:

- `frontend/src/app/NavigationLayout.tsx`
- `frontend/src/app/HomePage.tsx`
- `frontend/src/app/routes.tsx` (only if alias redirect wiring/title metadata hookup is required)
- `frontend/src/shared/components/PageHeader.tsx` (only additive support needed for standardized back behavior)
- `frontend/src/features/today-trade-review/components/TodayReviewCandidateDetailPage.tsx`
- `frontend/src/features/trade-plan-risk-engine/components/TradePlanDetail.tsx`
- `frontend/src/features/stock-research-workbench/components/StockResearchWorkbenchPage.tsx`
- `frontend/src/features/research-hub/components/ResearchOverviewPage.tsx` (label/link consistency only)

Secondary route files (only if metadata or alias handling needs local updates):

- `frontend/src/features/market-data-foundation/routes.tsx`
- `frontend/src/features/stock-research-workbench/routes.tsx`
- `frontend/src/features/today-trade-review/routes.tsx`
- `frontend/src/features/research-hub/index.tsx`
- `frontend/src/features/trade-plan-risk-engine/routes.tsx`

## 5. Conflict Boundaries

Hard boundaries for UX-01 implementation:

1. Do not edit backend (`backend/**`), Prisma, or API contracts.
2. Do not rewrite feature business logic.
3. Do not implement UX-02/UX-03 gate redesign in this packet.
4. Do not remove route aliases; only normalize label/title/back-flow behavior.
5. Keep edits limited to shell/navigation/home/detail navigation surfaces.

Coordination boundary:

- If another lane is simultaneously changing one scoped file, UX-01 owner must perform minimal merge-safe edits and avoid unrelated refactors.

## 6. Acceptance Criteria (Architecture Contract)

UX-01 is accepted when all are true:

1. Left nav groups reflect workflow-first families and approved labels.
2. `Today Review` label encoding defect is removed in nav/title/back labels.
3. `Research Command Center` naming is consistent across nav and page context.
4. Deep routes under today review, stock detail, research stock detail, and trade plan detail preserve workspace title context.
5. Home page exposes primary launch targets: Today Review, Research Command Center, Market Data Foundation, Trade Plans, Portfolios.
6. Home cards point to intended task routes (no known misdirects like Stock Research -> Market Data card mismatch).
7. Detail back targets return to correct parent workspace for scoped routes.
8. Browser back/forward remains functional across scoped drilldowns.

## 7. Implementation Sequence (for downstream dev owner)

1. Introduce centralized nav/route metadata in shell.
2. Switch title resolution to prefix-family matching.
3. Rework nav groups/labels from metadata.
4. Correct home launch cards/targets.
5. Normalize scoped detail page back targets and labels.
6. Run UX-01 QA plan and capture evidence.

## 8. Dependencies / Blockers

External dependencies: none for UX-01 architecture.
Known blocker status: none at planning stage.

## 9. Readiness Verdict

UX-01 architecture planning is complete and bounded.
UX-01 can move to **Ready for Implementation** with one frontend owner and the paired QA plan.
