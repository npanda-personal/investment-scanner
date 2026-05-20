# CF-W1-L3-WATCH-01 Watchlist Review Actionability Contract

Date: 2026-05-18

Owner: Team 03 Architecture Factory

## Status

Watchlist review-actionability contract refreshed after accepted `CF-W1-L3-PORT-01B` evidence. READY-CANDIDATE for Team 00 sequencing only on base `a2edfb6` or later clean `dev` containing `a2edfb6`.

## Contract Intent

Watchlist Management must expose a bounded, explainable review-priority layer on the watchlist detail surface so the user can see which tracked ideas deserve review first and why.

This contract is research-support only. It must not imply readiness trust, alerts, trade execution, or direct financial advice.

## Ownership

`watchlist-management` owns this behavior.

This contract is intentionally separate from `CF-W1-L3-PORT-01B`.

- `CF-W1-L3-PORT-01B` owns Data Quality readiness DTOs.
- `CF-W1-L3-WATCH-01` owns review actionability derived from existing watchlist enrichment fields.

The first slice must not consume `DataQualityEngineService`, portfolio holdings, alert state, or notification state. When implemented on top of accepted `PORT-01B`, it must preserve `readiness` and `readinessSummary` fields but must not treat readiness status as a review-priority input.

## Required Additive DTO Fields

Additive watchlist item contract:

```ts
type WatchlistReviewPriority =
  | 'HIGH_REVIEW_PRIORITY'
  | 'MEDIUM_REVIEW_PRIORITY'
  | 'REFRESH_EVIDENCE'
  | 'BACKGROUND';

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

Add to `WatchlistDashboardItemDto`:

- `reviewActionability: WatchlistReviewActionabilityDto`

Additive watchlist-level summary:

```ts
interface WatchlistReviewActionabilitySummaryDto {
  defaultSort: 'reviewPriorityDesc';
  highPriorityCount: number;
  mediumPriorityCount: number;
  refreshEvidenceCount: number;
  backgroundCount: number;
}
```

Add to `WatchlistDetailDto`:

- `reviewActionabilitySummary: WatchlistReviewActionabilitySummaryDto`

Existing fields must remain present, including:

- `currentPrice`
- `dailyChange`
- `dailyChangePercent`
- `latestSignal`
- `researchUrl`
- `notes`
- `tags`

## Required Sort Contract

Extend `WatchlistSortOption` additively with:

```ts
'reviewPriorityDesc'
```

Required rules:

- `reviewPriorityDesc` sorts by review priority using a deterministic tie-break sequence;
- existing sort options remain valid and backward-compatible;
- unknown sort values still fall back to `recentlyAdded`.

Recommended tie-break sequence:

1. review-priority weight
2. `latestSignal.score` descending
3. absolute `dailyChangePercent` descending
4. `latestSignal.generatedAt` descending
5. `createdAt` descending

## Required Mapping Rules

Use only existing watchlist enrichment fields:

- `latestSignal.score`
- `latestSignal.direction`
- `latestSignal.generatedAt`
- `dailyChangePercent`
- note presence
- tag presence

Required first-pass freshness rules:

- signal is `FRESH_SIGNAL` when generated within the last 7 days;
- signal is `AGING_SIGNAL` when generated 8-14 days ago;
- signal is `MISSING_SIGNAL` when absent or older than 14 days.

Required first-pass priority rules:

- `HIGH_REVIEW_PRIORITY` when a fresh signal has a strong score, or when a notable daily move combines with fresh/non-neutral signal context;
- `MEDIUM_REVIEW_PRIORITY` when fresh signal context, note/tag context, or a moderate daily move suggests the item should stay near the next review pass;
- `REFRESH_EVIDENCE` when signal context is missing or stale and the watchlist item no longer has enough recent evidence to justify higher placement;
- `BACKGROUND` when no stronger or refresh-needed condition applies.

The exact thresholds may be implemented as module-local constants, but the behavior must stay deterministic and explainable.

## Reason Summary Rules

`reasonSummary` must be assembled from the triggered reason codes and must stay concise plain text.

Required behavior:

- summarize the top 2-3 reasons only;
- stay research-support oriented;
- do not include recommendation, advice, or execution wording;
- do not claim trust/readiness or automation authorization.

Allowed examples:

- `Fresh bullish signal, large daily move, and saved tags.`
- `Signal context is stale; refresh evidence before the next review pass.`

Forbidden examples:

- `Buy now`
- `Sell now`
- `High conviction trade`
- `Ready to execute`
- `Guaranteed setup`

## UI Contract

The first slice must surface actionability on the existing watchlist detail page only.

Required UI behavior:

- add a review-priority column or equivalent table field;
- show the priority badge and reason summary for each row;
- keep notes/tags editing unchanged;
- keep current watchlist creation, deletion, and item editing flows unchanged;
- prefer `reviewPriorityDesc` as the page's initial local sort selection once the field exists.

The first slice must not introduce new pages, shared UI components, or route changes.

## Backward Compatibility Rules

- keep `GET /watchlists/:id` route path unchanged;
- keep existing response fields and CRUD behavior unchanged;
- keep existing sort options available;
- keep `recentlyAdded` as the parser fallback for callers that do not send the new sort option.

## Forbidden Behavior

- do not consume `DataQualityEngineService`
- do not add readiness fields or readiness summaries in this packet
- do not change Prisma schema or migrations
- do not change route registries
- do not add a new endpoint
- do not edit shared frontend components or shared backend utilities
- do not parse note/tag sentiment or use hidden classification heuristics
- do not create alerts, portfolio actions, or notification side effects
- do not use advice-like, target-price, or automation wording

## Exact Future File Reservations

Allowed files after Team 00 promotion, after using base `a2edfb6` or later clean `dev` containing `a2edfb6`, and after the watchlist writer set is clear:

- `backend/src/modules/watchlist-management/watchlist-management.service.ts`
- `backend/src/modules/watchlist-management/watchlist-management.types.ts`
- `backend/src/modules/watchlist-management/watchlist-management.validation.ts`
- `backend/src/modules/watchlist-management/watchlist-management.md`
- `backend/tests/modules/watchlist-management/watchlist-management.service.test.ts`
- `backend/tests/modules/watchlist-management/watchlist-management.validation.test.ts`
- `frontend/src/features/watchlist-management/types.ts`
- `frontend/src/features/watchlist-management/components/WatchlistManagementPage.tsx`
- optional new focused UI smoke: `frontend/tests/ui/watchlist-management.spec.ts`

Forbidden base/scope:

- current unstacked `dev` while it lacks accepted `a2edfb6`
- Research Hub source/UI files or current unrelated dirty Research Hub changes
- Prisma/schema/migrations, route registries, shared UI/backend utilities, package manifests, generated files, providers/live/startup/backfill, paid/cloud, telemetry, broker, portfolio, alerts, notifications, or Data Quality Engine source changes

## Test Contract

Focused tests must prove:

- high-priority mapping from fresh, strong signal evidence;
- medium-priority mapping from lighter signal or user-context evidence;
- refresh-evidence mapping from stale or missing signal context;
- deterministic `reviewPriorityDesc` ordering across ties;
- backward-compatible existing watchlist fields and existing sort fallback behavior;
- frontend watchlist detail surface renders actionability without regressing notes/tags editing.
