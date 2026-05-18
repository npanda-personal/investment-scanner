# CF-W1-L3-WATCH-01 Architecture Review

Date: 2026-05-18

Owner: Team 03 Architecture Factory

## Status

Watchlist review-actionability architecture packet prepared. Not Ready for Implementation.

The first slice is source-supported as a bounded watchlist-owned vertical packet. It can stay inside the `watchlist-management` backend module, the `watchlist-management` frontend feature, module docs, and focused module/UI tests without Prisma/schema changes, route-registry edits, shared utility/UI work, package changes, generated-file changes, provider/startup scope, or paid/cloud scope.

It is not parallel-safe with the future `CF-W1-L3-PORT-01B` watchlist readiness DTO child, because both packets need the same `watchlist-management` backend service/types/doc/test surfaces.

## Evidence Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-L3-WATCH-01-watchlist-review-actionability-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/requirements-backlog.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/refinement-queue.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/12-ready-queue/ready-for-implementation.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/module-ownership-map.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/00-control/active-work-board.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/99-decision-inbox/open-decisions.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/audit-portfolio-watchlist-alerts.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-L3-PORT-01B-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-L3-PORT-01-portfolio-watchlist-readiness-dto-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-L3-PORT-01B-work-packet.md`
- `backend/src/modules/watchlist-management/watchlist-management.md`
- `backend/src/modules/watchlist-management/watchlist-management.service.ts`
- `backend/src/modules/watchlist-management/watchlist-management.types.ts`
- `backend/src/modules/watchlist-management/watchlist-management.validation.ts`
- `backend/src/modules/watchlist-management/watchlist-management.repository.ts`
- `backend/tests/modules/watchlist-management/watchlist-management.service.test.ts`
- `backend/tests/modules/watchlist-management/watchlist-management.validation.test.ts`
- `frontend/src/features/watchlist-management/types.ts`
- `frontend/src/features/watchlist-management/api/watchlistManagementService.ts`
- `frontend/src/features/watchlist-management/hooks/useWatchlistManagement.ts`
- `frontend/src/features/watchlist-management/components/WatchlistManagementPage.tsx`
- `frontend/src/features/watchlist-management/routes.tsx`
- `frontend/tests/ui/today-trade-review.spec.ts`

## Current Source Findings

- `watchlist-management.detail()` already owns the watchlist review table response. It enriches each item with price, daily move, latest signal, notes, and tags, then applies deterministic backend sorting before the frontend renders the table.
- `WatchlistDashboardItemDto` and `WatchlistDetailDto` currently expose no explicit review-priority or reason-summary fields.
- `WatchlistManagementPage.tsx` already renders a sortable table with a dedicated sort selector, notes/tags editing, and enough local UI space to add a review-priority column and reason summary without touching shared UI components.
- The current sort contract is module-local and extensible through `WatchlistSortOption` plus `parseSortOption()`. Adding one additive sort key is lower risk than creating a new endpoint.
- Existing item inputs already contain the only user-authored context this slice needs: note presence and tag presence. No text classification or note parsing is required for the first packet.
- The first packet can derive actionability from existing response fields on read. No new persisted fields, repository writes, or provider calls are required.

## Module Boundary Review

`watchlist-management` owns this requirement.

Reasons:

- the workflow is specific to ordering and explaining watchlist review work, not to portfolio holdings, alerts, notification delivery, or Data Quality readiness;
- the needed evidence already exists inside watchlist enrichment fields owned by `watchlist-management`;
- the frontend surface already lives entirely under the watchlist feature and can consume additive module-local DTO fields without shared UI changes.

This packet must stay distinct from `CF-W1-L3-PORT-01B`.

`CF-W1-L3-PORT-01B` is a Data Quality readiness DTO child:

- consumes `DataQualityEngineService` public outputs;
- adds readiness metadata and readiness summary;
- remains backend-only.

`CF-W1-L3-WATCH-01` is an actionability child:

- must not consume or imply Data Quality readiness;
- derives review priority only from existing watchlist enrichment fields;
- needs the watchlist frontend detail surface to make the behavior visible and useful.

## Architecture Decision

Prepare `CF-W1-L3-WATCH-01` as a module-local watchlist vertical slice with additive review-actionability DTO fields plus one additive backend sort option.

Recommended additive taxonomy:

```ts
type WatchlistReviewPriority =
  | 'HIGH_REVIEW_PRIORITY'
  | 'MEDIUM_REVIEW_PRIORITY'
  | 'REFRESH_EVIDENCE'
  | 'BACKGROUND';
```

Recommended additive per-item shape:

```ts
type WatchlistReviewReasonCode =
  | 'FRESH_SIGNAL'
  | 'AGING_SIGNAL'
  | 'MISSING_SIGNAL'
  | 'LARGE_DAILY_MOVE'
  | 'NOTES_PRESENT'
  | 'TAGS_PRESENT'
  | 'HIGH_SIGNAL_SCORE'
  | 'NON_NEUTRAL_SIGNAL';

interface WatchlistReviewActionabilityDto {
  priority: WatchlistReviewPriority;
  reasonSummary: string;
  reasonCodes: WatchlistReviewReasonCode[];
  signalGeneratedAt: string | null;
  signalAgeDays: number | null;
  usesNotes: boolean;
  usesTags: boolean;
}
```

Recommended additive watchlist-level summary:

```ts
interface WatchlistReviewActionabilitySummaryDto {
  defaultSort: 'reviewPriorityDesc';
  highPriorityCount: number;
  mediumPriorityCount: number;
  refreshEvidenceCount: number;
  backgroundCount: number;
}
```

Required mapping rules for the first slice:

- use existing fields only: `latestSignal.score`, `latestSignal.direction`, `latestSignal.generatedAt`, `dailyChangePercent`, note presence, and tag presence;
- treat note and tag presence as user context signals only; do not infer sentiment or parse free text;
- treat signal freshness deterministically from `generatedAt`;
- keep the ordering explainable and stable by applying a fixed tie-break sequence.

Recommended first-pass ordering:

1. `priority` weight
2. `latestSignal.score` descending
3. absolute `dailyChangePercent` descending
4. `latestSignal.generatedAt` descending
5. `createdAt` descending

Recommended additive backend sort key:

```ts
'reviewPriorityDesc'
```

Recommended UI behavior:

- the watchlist detail page defaults its local sort state to `reviewPriorityDesc`;
- existing sort options remain available;
- the table adds a review-priority column with badge + reason summary text;
- notes/tags editing remains unchanged.

The backend parser may keep `recentlyAdded` as the fallback sort for backward compatibility when callers omit or send an unknown sort.

## Exact Future File Reservations

Allowed files after Team 00 promotion and after any conflicting watchlist writer clears:

- `backend/src/modules/watchlist-management/watchlist-management.service.ts`
- `backend/src/modules/watchlist-management/watchlist-management.types.ts`
- `backend/src/modules/watchlist-management/watchlist-management.validation.ts`
- `backend/src/modules/watchlist-management/watchlist-management.md`
- `backend/tests/modules/watchlist-management/watchlist-management.service.test.ts`
- `backend/tests/modules/watchlist-management/watchlist-management.validation.test.ts`
- `frontend/src/features/watchlist-management/types.ts`
- `frontend/src/features/watchlist-management/components/WatchlistManagementPage.tsx`
- optional new focused UI smoke only if Team 04 wants automation coverage for the new table behavior: `frontend/tests/ui/watchlist-management.spec.ts`

## Forbidden Files

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
- `backend/src/modules/notifications-delivery/**`
- shared backend utilities or shared DTOs
- shared frontend components
- package manifests
- generated files
- provider/startup/backfill/live-provider scope
- paid/cloud, telemetry, broker, or automation flows

## Dependency And Conflict Notes

- No current Product Owner decision blocker exists.
- No active Today Review conflict exists. `CF-W1-L3-TREV-01` uses `today-trade-review` files and can proceed independently in its own worktree.
- This packet must not be promoted or implemented in parallel with `CF-W1-L3-PORT-01B`, because both slices reserve `watchlist-management.service.ts`, `watchlist-management.types.ts`, `watchlist-management.md`, and focused watchlist tests.
- This packet should not be folded into `CF-W1-L3-PORT-01B`. Readiness DTOs and review actionability are different contracts and should stay independently reviewable.
- If implementation later needs persisted actionability, alert creation, portfolio linkage, readiness gating, or shared UI extraction, that is a separate child packet and out of scope here.

## Required QA Scenarios

Team 04 can start QA planning from this packet.

Minimum focused scenarios:

- fresh high-score signal plus notable daily move yields high review priority with additive reason summary;
- note/tag context can raise an item into medium review priority without advice-like wording;
- stale or missing signal context yields `REFRESH_EVIDENCE`, not trusted readiness or alert-like behavior;
- background items remain visible but sort below explicit review candidates;
- `reviewPriorityDesc` ordering stays deterministic across ties;
- existing current price, daily move, latest signal, research link, notes, and tags remain backward-compatible;
- the watchlist page shows the new review-priority field without changing notes/tags editing behavior;
- no readiness, alert, or portfolio semantics leak into actionability labels.

## Readiness Result

Architecture packet prepared.

Result:

- first slice can stay module-local and bounded;
- first slice should be a watchlist-owned vertical slice, not a readiness DTO child;
- no Prisma/schema, route-registry, shared utility/UI, package, generated, provider/startup, live-provider, paid/cloud, telemetry, or broker scope is required;
- Team 04 QA planning can start now;
- app-code readiness still depends on Team 00 sequencing because `CF-W1-L3-PORT-01B` is a direct one-writer-per-file conflict on the watchlist backend surfaces.
