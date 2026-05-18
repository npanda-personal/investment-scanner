# CF-W1-L3-WATCH-01 Work Packet

Date: 2026-05-18

## Work Item

Watchlist review actionability and explainable review-priority ordering.

## State

Architecture packet prepared. Not Ready for Implementation.

This is a bounded watchlist-owned vertical slice. It stays inside the watchlist backend module, watchlist frontend feature, module docs, and focused module/UI tests.

## Owner / Lane / Modules

- Architecture owner: Team 03 Architecture Factory
- Future implementation owner: Team 07 Portfolio / Watchlists / Alerts
- Lane: Lane 3
- Backend module: `watchlist-management`
- Frontend feature: `watchlist-management`

## Allowed Files After Ready Promotion

- `backend/src/modules/watchlist-management/watchlist-management.service.ts`
- `backend/src/modules/watchlist-management/watchlist-management.types.ts`
- `backend/src/modules/watchlist-management/watchlist-management.validation.ts`
- `backend/src/modules/watchlist-management/watchlist-management.md`
- `backend/tests/modules/watchlist-management/watchlist-management.service.test.ts`
- `backend/tests/modules/watchlist-management/watchlist-management.validation.test.ts`
- `frontend/src/features/watchlist-management/types.ts`
- `frontend/src/features/watchlist-management/components/WatchlistManagementPage.tsx`
- optional new focused UI smoke only if Team 04 wants frontend automation for the new table behavior: `frontend/tests/ui/watchlist-management.spec.ts`

## Current Forbidden Files

- application source or tests before Team 00 promotion
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- `backend/src/api/routes.ts`
- `frontend/src/app/routes.tsx`
- `backend/src/modules/watchlist-management/watchlist-management.repository.ts`
- `backend/src/modules/watchlist-management/watchlist-management.controller.ts`
- `backend/src/modules/watchlist-management/watchlist-management.router.ts`
- `backend/tests/modules/watchlist-management/watchlist-management.routes.test.ts`
- `backend/tests/modules/watchlist-management/watchlist-management.ownership.test.ts`
- `backend/src/modules/data-quality-engine/**`
- `backend/src/modules/portfolio-management/**`
- `backend/src/modules/portfolio-intelligence/**`
- `backend/src/modules/alerts-monitoring/**`
- shared backend utilities or shared DTOs
- shared frontend components
- package manifests
- generated files
- provider/startup/backfill/live-provider scope
- paid/cloud, telemetry, broker, or automation flows

## Required Behavior

Future implementation must:

- add additive review-actionability fields to watchlist item and watchlist detail DTOs;
- derive actionability from existing watchlist enrichment fields only;
- add additive `reviewPriorityDesc` backend sorting;
- keep existing sort options and parser fallback behavior;
- keep notes/tags editing behavior unchanged;
- show actionability on the existing watchlist detail page without changing routes or shared UI;
- avoid Data Quality readiness semantics, alerting semantics, and portfolio semantics.

## Sequencing Rule

Do not promote or implement this packet in parallel with:

- `CF-W1-L3-PORT-01B`

Reason:

- both packets need `watchlist-management.service.ts`, `watchlist-management.types.ts`, `watchlist-management.md`, and focused watchlist backend tests.

No active Today Review conflict exists. `CF-W1-L3-TREV-01` uses different module and feature files.

## QA Handoff Needed

Team 04 can start QA planning now against this packet.

Minimum scenarios:

- high-priority item with fresh signal and notable move renders first with clear reason summary;
- medium-priority item rises because of lighter signal or note/tag context;
- stale or missing signal context yields `REFRESH_EVIDENCE` without readiness or advice wording;
- background items remain sorted below explicit review candidates;
- `reviewPriorityDesc` remains deterministic across tie cases;
- existing notes/tags editing and existing watchlist CRUD flow remain intact;
- existing watchlist sort fallback remains backward-compatible for non-updated callers.

Suggested focused commands after implementation exists:

```powershell
cd backend
npm.cmd test -- watchlist-management.service.test.ts watchlist-management.validation.test.ts --runInBand
npm.cmd run build
```

```powershell
cd frontend
npm.cmd run test:ui -- watchlist-management.spec.ts --workers=1
npm.cmd run build
```

If no focused watchlist UI spec is added, Team 04 should record that exact blocker and keep frontend regression risk explicit.

## Stop Conditions

Stop and return to Team 00 / Architect if implementation requires:

- Prisma/schema/migration changes;
- repository/controller/router or route-registry changes;
- Data Quality readiness wiring or `CF-W1-L3-PORT-01B` scope in the same writer pass;
- shared UI extraction or shared backend utility changes;
- alert creation, portfolio mutation, notification, or copilot side effects;
- free-text note/tag sentiment parsing;
- direct financial-advice, target-price, or automation-authorization wording.

## Notes For Team 00

- This packet is bounded enough for Team 04 QA planning now.
- It should stay separate from `CF-W1-L3-PORT-01B`; the two packets solve different problems even though they share watchlist backend files.
- If Team 00 later promotes this packet, use a dedicated Team 07 worktree because the shared `dev` workspace is dirty and this packet has no overlap advantage from staying in the main worktree.

## Next Gate

Team 04 QA planning, then Team 00 sequencing and Ready evaluation. Team 03 does not promote it to Ready.
