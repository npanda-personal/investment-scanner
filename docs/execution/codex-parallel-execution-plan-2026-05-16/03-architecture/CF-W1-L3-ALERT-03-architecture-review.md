# CF-W1-L3-ALERT-03 Architecture Review

Date: 2026-05-18

Owner: Team 03 Architecture Factory

## Status

Alert follow-through traceability architecture packet prepared. Not Ready for Implementation.

The first slice is source-supported as a bounded backend-only `alerts-monitoring` packet. It can stay module-local by storing follow-through evidence inside existing `AlertEvent.metadata` JSON, without Prisma/schema changes, route-registry edits, shared utility/UI work, package changes, or provider/startup scope.

It is not parallel-safe while `CF-W1-L3-ALERT-01` remains active and `CF-W1-L3-AUTH-03` remains a parked alert-module packet, because all three slices need the same `alerts-monitoring` service/types/doc/test surfaces.

## Evidence Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-L3-ALERT-03-alert-follow-through-traceability-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/requirements-backlog.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/refinement-queue.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/12-ready-queue/ready-for-implementation.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/module-ownership-map.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/00-control/active-work-board.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/99-decision-inbox/open-decisions.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/audit-portfolio-watchlist-alerts.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-L3-ALERT-01-alert-readiness-suppression-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-L3-AUTH-03-alert-rule-target-ownership-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/07-decisions/DECISION-20260517-alert-event-ownership-model-resolution.md`
- `backend/prisma/schema.prisma`
- `backend/src/modules/alerts-monitoring/alerts-monitoring.md`
- `backend/src/modules/alerts-monitoring/alerts-monitoring.types.ts`
- `backend/src/modules/alerts-monitoring/alerts-monitoring.service.ts`
- `backend/src/modules/alerts-monitoring/alerts-monitoring.repository.ts`
- `backend/src/modules/alerts-monitoring/alerts-monitoring.controller.ts`
- `backend/src/modules/notifications-delivery/notifications-delivery.md`
- `backend/src/modules/notifications-delivery/notifications-delivery.service.ts`
- `backend/src/modules/ai-investment-copilot/ai-investment-copilot.md`
- `backend/src/modules/ai-investment-copilot/ai-investment-copilot.service.ts`
- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.md`
- `backend/tests/modules/alerts-monitoring/alerts-monitoring.service.test.ts`
- `backend/tests/modules/alerts-monitoring/alerts-monitoring.ownership.test.ts`
- `frontend/src/features/alerts-monitoring/types.ts`
- `frontend/src/features/alerts-monitoring/api/alertsMonitoringService.ts`
- `frontend/src/features/alerts-monitoring/components/AlertsMonitoringPage.tsx`

## Current Source Findings

- `AlertEvent` already has a `metadata Json` column plus existing `triggeredAt`, `readAt`, and `dismissedAt` timestamps. That is enough to persist bounded follow-through evidence without adding new tables or columns.
- `alerts-monitoring` currently distinguishes only alert creation and inbox state. `markRead()` and `dismiss()` update timestamps, but there is no dedicated post-review outcome model, note field, or follow-up timestamp path.
- `listEvents()` already returns raw metadata to callers. Additive metadata or additive DTO projection is backward-compatible if existing metadata keys are preserved.
- `notifications-delivery` and `ai-investment-copilot` consume alert events for unread/critical summaries only. They do not depend on a fixed metadata schema today, so preserving `readAt`, `dismissedAt`, `severity`, `title`, and `message` keeps the first slice isolated from those consumers.
- The current alerts UI exposes open, read, dismiss, and mark-all-read actions only. There is no reason-summary or review-note capture in the current feature, so frontend work should not be assumed in the first packet.
- `CF-W1-L3-ALERT-01` currently occupies `alerts-monitoring.service.ts`, `alerts-monitoring.types.ts`, `alerts-monitoring.md`, and focused tests in a dedicated Team 07 worktree. `CF-W1-L3-AUTH-03` is also prepared against the same alert-module core files. `CF-W1-L3-ALERT-03` cannot be run in parallel on that file set.

## Module Boundary Review

`alerts-monitoring` owns this requirement.

Reasons:

- follow-through traceability is attached to an `AlertEvent`, not to portfolio, watchlist, notification-delivery, copilot, or Today Review ownership surfaces;
- the required persistence can live inside `AlertEvent.metadata` without cross-module storage changes;
- notification, copilot, portfolio, and watchlist consumers should read bounded alert outputs later through public `alerts-monitoring` contracts instead of persisting their own review-memory copy.

The first slice should stay backend-only:

- backend owner: `backend/src/modules/alerts-monitoring`
- no Prisma/schema or route-registry change
- no shared utility or shared UI scope
- no frontend scope in the first packet

## Architecture Decision

Prepare `CF-W1-L3-ALERT-03` as a backend-only alert follow-through packet with a dedicated follow-through update path inside the existing `alerts-monitoring` module.

The first slice should:

- keep alert creation state, inbox state, and follow-through state separate;
- store follow-through evidence in `AlertEvent.metadata.followThrough`;
- expose additive normalized follow-through fields in the event DTO;
- preserve current `readAt` and `dismissedAt` semantics;
- avoid auto-inferring a follow-through outcome from `markRead()` or `dismiss()`.

Recommended additive follow-through taxonomy:

```ts
type AlertFollowThroughOutcome =
  | 'REVIEWED_NO_CHANGE'
  | 'FOLLOW_UP_DEFERRED'
  | 'PORTFOLIO_REVIEW_NOTED'
  | 'WATCHLIST_REVIEW_NOTED'
  | 'RISK_REVIEW_NOTED'
  | 'INVALIDATION_REVIEW_NOTED';
```

Recommended additive shape:

```ts
interface AlertFollowThroughDto {
  outcome: AlertFollowThroughOutcome;
  reasonSummary: string | null;
  reviewedAt: string;
  followUpDueAt: string | null;
  updatedAt: string;
}
```

Recommended behavior:

- `markRead()` marks inbox-read state only.
- `dismiss()` marks inbox-dismiss state only.
- follow-through is written only through a dedicated follow-through update action.
- read or dismiss without a follow-through update must never be reported as a user decision beyond inbox handling.
- `PORTFOLIO_REVIEW_NOTED` or `WATCHLIST_REVIEW_NOTED` records a user-noted follow-up only. It must not claim that a portfolio/watchlist mutation actually happened in this slice.

## Module-Local API Direction

The cleanest first packet is an additive module-local endpoint such as:

`PATCH /alerts/events/:id/follow-through`

Why this is preferred:

- it preserves current read/dismiss behavior instead of overloading those actions with extra meaning;
- it allows a concise reason summary and optional due date without route-registry changes;
- it keeps the first slice inside `alerts-monitoring.controller.ts`, `alerts-monitoring.router.ts`, `alerts-monitoring.validation.ts`, `alerts-monitoring.service.ts`, and `alerts-monitoring.repository.ts`.

This is a module-router addition, not a route-registry change.

## Exact Future File Reservations

Allowed files after Team 00 promotion and after the active alert-module writer clears:

- `backend/src/modules/alerts-monitoring/alerts-monitoring.service.ts`
- `backend/src/modules/alerts-monitoring/alerts-monitoring.repository.ts`
- `backend/src/modules/alerts-monitoring/alerts-monitoring.types.ts`
- `backend/src/modules/alerts-monitoring/alerts-monitoring.validation.ts`
- `backend/src/modules/alerts-monitoring/alerts-monitoring.controller.ts`
- `backend/src/modules/alerts-monitoring/alerts-monitoring.router.ts`
- `backend/src/modules/alerts-monitoring/alerts-monitoring.md`
- `backend/tests/modules/alerts-monitoring/alerts-monitoring.service.test.ts`
- optional new focused controller coverage only if the dedicated follow-through endpoint is added: `backend/tests/modules/alerts-monitoring/alerts-monitoring.controller.test.ts`
- optional new focused repository coverage only if metadata merge/update logic becomes non-trivial: `backend/tests/modules/alerts-monitoring/alerts-monitoring.repository.test.ts`

## Forbidden Files

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- `backend/src/api/routes.ts`
- `frontend/src/app/routes.tsx`
- shared backend utilities or shared DTOs
- shared frontend components
- package manifests
- generated files
- `backend/src/modules/portfolio-management/**`
- `backend/src/modules/watchlist-management/**`
- `backend/src/modules/portfolio-intelligence/**`
- `backend/src/modules/notifications-delivery/**`
- `backend/src/modules/ai-investment-copilot/**`
- `frontend/src/features/alerts-monitoring/**`
- provider/startup/backfill/live-provider scope
- paid/cloud, telemetry, broker, or automation flows

## Dependency And Conflict Notes

- No current Product Owner decision blocker exists.
- No Today Review file overlap exists. `CF-W1-L3-TREV-01` is independent.
- This packet must not run in parallel with `CF-W1-L3-ALERT-01`.
- This packet should not be promoted in parallel with `CF-W1-L3-AUTH-03`, because both slices require the same `alerts-monitoring` core files and tests.
- If Product Owner later wants follow-through to prove an actual downstream portfolio/watchlist mutation, risk-plan creation, or notification/copilot surfacing, that is a separate cross-module child and is out of scope here.

## Required QA Scenarios

Team 04 can start QA planning from this packet.

Minimum focused backend scenarios:

- updating follow-through on an owned event persists additive review evidence without erasing existing metadata keys;
- read/dismiss actions do not auto-create follow-through evidence;
- follow-through outcome and reason summary round-trip through event DTOs;
- follow-through update fails closed for cross-user or missing events without leaking ownership;
- follow-through can coexist with prior `readAt` or `dismissedAt` timestamps;
- `PORTFOLIO_REVIEW_NOTED` and `WATCHLIST_REVIEW_NOTED` do not assert actual portfolio/watchlist mutation;
- notification and copilot alert-digest behavior remains backward-compatible because unread/dismissed semantics are unchanged.

## Readiness Result

Architecture packet prepared.

Result:

- first slice can be module-local and bounded;
- first slice should be backend-only;
- no Prisma/schema, route-registry, shared utility/UI, package, generated, provider/startup, live-provider, paid/cloud, telemetry, or broker scope is required;
- implementation is not Ready yet because Team 04 QA planning is still missing and Team 00 must sequence it behind the active alert-module writer set.
