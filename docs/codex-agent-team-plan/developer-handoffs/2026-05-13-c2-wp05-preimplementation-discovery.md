# C2-WP-05 Preimplementation Discovery - Research Thesis And Evidence Checklist

Date: 2026-05-13
Mode: Developer Discovery only
Work item: C2-WP-05 - Research Thesis And Evidence Checklist
Owned write scope for this pass: this file only

## Discovery Status

Discovery is complete enough for implementation prep. Source implementation remains blocked until the C2-WP-02 Prisma schema/runtime proof clears or the Orchestrator explicitly assigns one coordinated schema owner to batch C2-WP-02 and C2-WP-05 schema changes.

No source code, tests, runtime processes, local servers, npm, Playwright, Docker, browser sessions, Prisma commands, active board, QA plan, architecture contract, or blocker register files were changed in this pass.

## Inputs Reviewed

- Product brief: `docs/codex-agent-team-plan/po-roadmap-backlog-2026-05-13-cycle2.md#5-research-thesis-and-evidence-checklist`
- Architecture contract: `docs/codex-agent-team-plan/architecture-contracts/2026-05-13-cycle2-architecture-contracts.md#c2-wp-05---research-thesis-and-evidence-checklist`
- QA plan: `docs/codex-agent-team-plan/qa-plans/2026-05-13-cycle2-qa-plan.md#c2-wp-05---research-thesis-and-evidence-checklist`
- Work packet: `docs/codex-agent-team-plan/work-packets/2026-05-13-cycle2-work-packets.md#c2-wp-05---research-thesis-and-evidence-checklist`
- Active board row: C2-WP-05 is `Blocked` in `Clarification Mode`; future scope is `stock-research-workbench` plus Prisma schema after the schema slot clears.
- Existing discovery: `docs/codex-agent-team-plan/work-packets/2026-05-13-candidate5-research-thesis-discovery.md`
- Schema/blocker context: C2-WP-02 owns the current schema slot and remains blocked on runtime UI/API/migration evidence.
- Current module layout under `backend/src/modules/stock-research-workbench`, `backend/tests/modules/stock-research-workbench`, and `frontend/src/features/stock-research-workbench`.

## Product And Contract Read

C2-WP-05 adds private, authenticated, stock-centered research thesis notes. The user must be able to record:

- bull case
- bear case or counter-evidence
- invalidation
- catalyst
- evidence checklist
- status
- review date
- source references or snapshots to readiness/proof states

Allowed statuses are `WATCH`, `ACTIVE_RESEARCH`, `INVALIDATED`, `DEFERRED`, and `ARCHIVED`.

The feature must remain research documentation only. It must not introduce buy/sell/execute language, broker/order flows, generic external notes, AI-generated thesis content, hosted storage, collaborative notes, or transaction advice.

## Current Repo Shape

Backend Stock Research Workbench already exists:

- `backend/src/modules/stock-research-workbench/index.ts`
- `backend/src/modules/stock-research-workbench/stock-research-workbench.module.ts`
- `backend/src/modules/stock-research-workbench/stock-research-workbench.router.ts`
- `backend/src/modules/stock-research-workbench/stock-research-workbench.controller.ts`
- `backend/src/modules/stock-research-workbench/stock-research-workbench.service.ts`
- `backend/src/modules/stock-research-workbench/stock-research-workbench.types.ts`
- `backend/src/modules/stock-research-workbench/stock-research-workbench.validation.ts`
- `backend/src/modules/stock-research-workbench/stock-research-workbench.md`

Existing backend routes are mounted through `backend/src/api/routes.ts` at `/api/v1`, with Stock Research Workbench registered before Research Hub. Current stock research routes are read-only and include:

- `GET /api/v1/research/stocks/:instrumentId/overview`
- `GET /api/v1/research/stocks/:instrumentId/performance`
- `GET /api/v1/research/stocks/:instrumentId/peers`
- `GET /api/v1/research/stocks/:instrumentId/relative-strength`
- `GET /api/v1/research/stocks/:instrumentId/workbench`

Frontend Stock Research Workbench already exists:

- `frontend/src/features/stock-research-workbench/index.ts`
- `frontend/src/features/stock-research-workbench/routes.tsx`
- `frontend/src/features/stock-research-workbench/types.ts`
- `frontend/src/features/stock-research-workbench/api/stockResearchWorkbenchService.ts`
- `frontend/src/features/stock-research-workbench/components/StockResearchWorkbenchPage.tsx`

Existing UI route:

- `/research/stocks/:id`

Existing backend tests:

- `backend/tests/modules/stock-research-workbench/stock-research-workbench.routes.test.ts`
- `backend/tests/modules/stock-research-workbench/stock-research-workbench.service.test.ts`
- `backend/tests/modules/stock-research-workbench/stock-research-workbench.validation.test.ts`

There is no current `ResearchThesis` model in `backend/prisma/schema.prisma`.

## Candidate Later Files To Change

Backend module files:

- `backend/src/modules/stock-research-workbench/stock-research-workbench.types.ts`
- `backend/src/modules/stock-research-workbench/stock-research-workbench.validation.ts`
- `backend/src/modules/stock-research-workbench/stock-research-workbench.service.ts`
- `backend/src/modules/stock-research-workbench/stock-research-workbench.controller.ts`
- `backend/src/modules/stock-research-workbench/stock-research-workbench.router.ts`
- `backend/src/modules/stock-research-workbench/stock-research-workbench.md`
- Optional if the module follows stronger persistence separation later: `backend/src/modules/stock-research-workbench/stock-research-workbench.repository.ts`

Backend route registration:

- `backend/src/api/routes.ts` should not need changes if thesis routes are added to the existing Stock Research Workbench router, because that router is already mounted at `/api/v1`.

Frontend feature files:

- `frontend/src/features/stock-research-workbench/types.ts`
- `frontend/src/features/stock-research-workbench/api/stockResearchWorkbenchService.ts`
- `frontend/src/features/stock-research-workbench/components/StockResearchWorkbenchPage.tsx`
- Recommended new component for scope control: `frontend/src/features/stock-research-workbench/components/ResearchThesisPanel.tsx`

Frontend route registration:

- `frontend/src/features/stock-research-workbench/routes.tsx` can remain unchanged for the first vertical slice if the thesis panel lives inside `/research/stocks/:id`.
- `frontend/src/app/routes.tsx` should not need changes for the first slice because Stock Research Workbench routes are already registered.
- `frontend/src/app/NavigationLayout.tsx` should not be changed in the first slice.

Backend tests:

- `backend/tests/modules/stock-research-workbench/stock-research-workbench.routes.test.ts`
- `backend/tests/modules/stock-research-workbench/stock-research-workbench.service.test.ts`
- `backend/tests/modules/stock-research-workbench/stock-research-workbench.validation.test.ts`
- Recommended new focused ownership test: `backend/tests/modules/stock-research-workbench/stock-research-workbench.ownership.test.ts`

Frontend/UI tests:

- Recommended new Playwright spec: `frontend/tests/ui/stock-research-workbench.spec.ts`
- Existing `frontend/tests/ui/research-hub.spec.ts` should be used only if a later packet adds Research Hub thesis links.

Prisma/schema files, only after schema ownership is assigned:

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/*`
- Generated Prisma client artifacts only if the accepted implementation workflow requires them.

## Schema Needs

Required model: `ResearchThesis`.

Recommended fields:

- `id String @id @default(cuid())`
- `userId String`
- `user AppUser @relation(fields: [userId], references: [id], onDelete: Cascade)` or another Architect-approved delete behavior
- `instrumentId String`
- `stock Stock @relation(fields: [instrumentId], references: [id], onDelete: Restrict)` or `SetNull` only if `instrumentId` becomes optional
- `symbol String`
- `companyName String?`
- `region String`
- `assetType String`
- `title String`
- `status String`
- `bullCase String`
- `bearCase String`
- `invalidation String`
- `catalyst String`
- `evidenceChecklist Json`
- `linkedSources Json`
- `reviewDate DateTime?`
- `createdAt DateTime @default(now())`
- `updatedAt DateTime @updatedAt`

Recommended indexes:

- `@@index([userId, status, updatedAt])`
- `@@index([userId, instrumentId, status])`
- `@@index([region, assetType, status])`

Optional uniqueness choice:

- If the first slice enforces one active thesis per user/instrument, add a service-level rule because Prisma/Postgres partial unique indexes for "non-ARCHIVED only" are more migration-sensitive. Avoid over-modeling this until PO/Architect confirms versioning needs.
- If multiple historical theses per instrument are allowed, do not add a unique key in v1; rely on list filtering and status.

Relation updates likely required:

- Add `researchTheses ResearchThesis[]` to `AppUser`.
- Add `researchTheses ResearchThesis[]` to `Stock`.

Delete behavior recommendation:

- Do not delete theses when transient upstream evidence changes.
- User deletion can cascade or be set by Product/Architect policy.
- Stock deletion should avoid accidental thesis loss; prefer `Restrict` if instruments are durable, or snapshot-only fields plus nullable relation if instrument deletion is expected.

## API Route Prep

Architecture contract endpoints:

- `GET /api/v1/research/theses?region=IN&assetType=STOCK&status=ACTIVE_RESEARCH&instrumentId=...`
- `POST /api/v1/research/theses`
- `GET /api/v1/research/theses/:id`
- `PATCH /api/v1/research/theses/:id`
- `DELETE /api/v1/research/theses/:id` or status archive
- Optional: `GET /api/v1/research/stocks/:instrumentId/theses`

Recommended first-slice route set:

- `GET /api/v1/research/theses`
- `POST /api/v1/research/theses`
- `GET /api/v1/research/theses/:id`
- `PATCH /api/v1/research/theses/:id`
- `PATCH /api/v1/research/theses/:id/archive`
- `GET /api/v1/research/stocks/:instrumentId/theses`

Implementation notes:

- Add routes to `stock-research-workbench.router.ts` as `/research/theses...` and `/research/stocks/:instrumentId/theses`.
- Apply `requireAuth` only to thesis routes so existing read-only stock workbench routes remain behavior-compatible.
- Use the local auth pattern from Watchlist, Alerts, Backtesting, and Portfolio modules: controller derives `(req as any).user?.id || 'default-user'`, while routes requiring privacy should use `requireAuth`.
- Service/repository queries must always include `userId` for detail, update, archive, and list operations.
- Archive is safer than hard delete for the first slice because QA expects evidence not to disappear unexpectedly unless the contract defines hard delete.

## DTO And Validation Prep

DTO shape should mirror the architecture contract:

- `ResearchThesisStatus = "WATCH" | "ACTIVE_RESEARCH" | "INVALIDATED" | "DEFERRED" | "ARCHIVED"`
- `EvidenceChecklistItem.code` values:
  - `DATA_READINESS`
  - `SIGNAL_QUALITY`
  - `CALIBRATION_READINESS`
  - `STRATEGY_PROOF`
  - `TODAY_REVIEW_BUCKET`
  - `TRADE_PLAN_PAPER_READINESS`
  - `COUNTER_EVIDENCE_REVIEWED`
  - `INVALIDATION_DEFINED`
- `EvidenceChecklistItem.state` values:
  - `PASS`
  - `LIMITED`
  - `BLOCKED`
  - `UNPROVEN`
  - `INSUFFICIENT_DATA`
  - `NOT_CHECKED`

Validation should cover:

- authenticated user required at route level
- valid `instrumentId`
- valid `status`
- non-empty `title`, `bullCase`, `bearCase`, `invalidation`, and `evidenceChecklist`
- optional but bounded `catalyst`
- local text length limits for title and thesis fields
- checklist item code/state allowlists
- linked source module/type allowlists
- `reviewDate` must parse as a date or be null
- missing upstream references must remain `NOT_CHECKED`, `INSUFFICIENT_DATA`, `UNPROVEN`, or `LIMITED`; never silently promote to ready.

## UI Route And Component Prep

First UI route:

- Keep `/research/stocks/:id`.

Recommended first UI surface:

- Add `ResearchThesisPanel` inside `StockResearchWorkbenchPage`.
- Fetch theses for the current instrument through `stockResearchWorkbenchService.ts`.
- Support list, create, edit, save, archive, status change, and review date.
- Keep the first slice stock-local; do not add Research Hub, Today Review, Watchlist, Portfolio, or global navigation links yet.

Expected controls:

- title input
- status segmented control or select
- bull case text area
- bear case/counter-evidence text area
- invalidation text area
- catalyst text area
- review date field
- checklist rows with state controls and notes
- save/archive buttons with research-only wording

UI wording constraints:

- Use "research", "thesis", "watch", "deferred", "invalidated", "archived", "evidence", and "review".
- Avoid "buy", "sell", "execute", "trade now", "recommended", "actionable", or broker/order wording.
- Missing source evidence should be visible as unavailable, unproven, not checked, limited, or insufficient data.

## Test Plan Prep

Backend focused tests:

- Route registration includes thesis endpoints and applies auth middleware to thesis routes.
- Validation rejects missing bull case, bear case, invalidation, invalid status, invalid checklist state/code, invalid linked source type, and overlong text.
- Service creates a thesis with instrument symbol/company/region/asset snapshots.
- List filters by authenticated `userId`, `status`, `instrumentId`, `region`, and `assetType`.
- Detail returns only the current user's thesis.
- Patch updates editable fields and keeps ownership isolation.
- Archive sets `status = ARCHIVED` instead of hard deleting in the first slice.
- User B cannot read, update, or archive User A's thesis.
- Missing source refs are preserved as unavailable/not checked rather than converted to ready.

Frontend/UI checks:

- Authenticated user can open `/research/stocks/:id`.
- Thesis panel renders on the stock research page.
- Required field validation is visible.
- User can create, edit, and archive a thesis.
- Checklist rows include the contract evidence categories.
- Saved details show status and review date.
- Archived/invalidated states do not show advice or execution wording.

Regression checks:

- Existing read-only stock workbench endpoints still respond without requiring thesis auth changes.
- Existing stock research page sections still render: overview, chart, performance, fundamentals, valuation, peers, relative strength, corporate actions.
- No navigation/app route changes are needed in v1.

## Conflict Risks

- Schema conflict: C2-WP-02 owns the active Prisma schema slot. C2-WP-05 must not edit schema until C2-WP-02 schema/runtime proof clears or Orchestrator batches schema under one owner.
- Route-family ambiguity: Stock Research Workbench and Research Hub both use `/research`. Keep thesis routes in the existing Stock Research Workbench router mounted at `/api/v1`; do not edit `backend/src/api/routes.ts` unless Orchestrator explicitly reserves shared routing.
- Auth behavior: Existing stock workbench read endpoints are not auth-protected. Add `requireAuth` only around thesis endpoints to avoid changing public read behavior.
- Cross-module scope creep: Do not edit `research-hub`, `today-trade-review`, `watchlist-management`, `portfolio-management`, `trade-plan-risk-engine`, shared navigation, or shared route files in the first slice.
- Evidence semantics: Checklist references must not trigger generation, repair, backtests, trade plans, or external fetches. Store snapshots/source refs only.
- Ownership privacy: Thesis notes are private/local to the authenticated user; do not use nullable legacy-owner visibility for new thesis records unless Architect explicitly approves it.
- UI language: Avoid any wording that turns a thesis into recommendation or execution guidance.

## Smallest Vertical Slice

The smallest useful slice after schema clearance:

1. Add `ResearchThesis` schema with `AppUser` and `Stock` relations, JSON checklist/source refs, status, review date, and indexes.
2. Add authenticated thesis CRUD/archive methods inside Stock Research Workbench.
3. Add validation and ownership checks.
4. Add stock-local thesis panel on `/research/stocks/:id`.
5. Add focused backend tests for validation, CRUD/archive, list/detail filters, and User A/User B isolation.
6. Add one UI spec for create/edit/archive/checklist visibility if runtime lane is available.

This slice should not add Research Hub badges, Today Review links, Watchlist thesis columns, Portfolio overlays, Trade Plan coupling, AI generation, external storage, or app navigation changes.

## Work Available Once C2-WP-02 Clears

When C2-WP-02 schema/runtime proof is accepted or one schema owner is assigned:

- Schema owner can add the `ResearchThesis` model, migration, and Prisma generation evidence.
- Stock Research backend owner can add DTOs, validation, service/repository logic, controller methods, routes, and module docs.
- Frontend owner can add the stock-local thesis API client, types, and `ResearchThesisPanel`.
- QA can run focused Stock Research backend tests and UI smoke without upstream repair, signal generation, backtest, Today Review, or Trade Plan runs.

Do not start source implementation until:

- C2-WP-02 schema work is complete or explicitly batched.
- The active board row moves out of `Blocked`.
- A fresh work packet confirms schema ownership and reserved write scope.

## Discovery Conclusion

C2-WP-05 should extend `stock-research-workbench` for the first implementation slice. The module already owns stock-local research UX and `/api/v1/research/stocks/:instrumentId/*` routes, so no new module is needed for v1. The only hard blocker is Prisma schema coordination with C2-WP-02. After that clears, the implementation can be a narrow authenticated CRUD/archive thesis panel with JSON evidence checklist and strict ownership tests.
