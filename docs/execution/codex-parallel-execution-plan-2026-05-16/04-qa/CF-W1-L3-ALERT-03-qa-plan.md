# CF-W1-L3-ALERT-03 QA Plan

Date: 2026-05-18

Owner: Team 04 QA Factory

Status: Backend-only alert follow-through traceability QA plan prepared. Not QA-ready for Team 00 Ready evaluation yet because `CF-W1-L3-ALERT-01` is still active and `CF-W1-L3-AUTH-03` remains a parked packet against the same `alerts-monitoring` core files and focused tests.

Current status refresh: Team 03 prepared the alert follow-through architecture review, child contract, and work packet on 2026-05-18. Team 04 accepts this as planning evidence only and keeps the packet blocked from executable QA and Ready promotion until Team 00 sequences it behind the active alert-module writer set.

## Scope

Validation plan for bounded post-review follow-through recording inside `alerts-monitoring` using additive `AlertEvent.metadata.followThrough` persistence and additive `followThrough` DTO projection.

In-scope surfaces after Team 00 sequencing and Ready promotion:

- `backend/src/modules/alerts-monitoring/alerts-monitoring.service.ts`
- `backend/src/modules/alerts-monitoring/alerts-monitoring.repository.ts`
- `backend/src/modules/alerts-monitoring/alerts-monitoring.types.ts`
- `backend/src/modules/alerts-monitoring/alerts-monitoring.validation.ts`
- `backend/src/modules/alerts-monitoring/alerts-monitoring.controller.ts`
- `backend/src/modules/alerts-monitoring/alerts-monitoring.router.ts`
- `backend/src/modules/alerts-monitoring/alerts-monitoring.md`
- `backend/tests/modules/alerts-monitoring/alerts-monitoring.service.test.ts`
- optional only if implementation adds them: `backend/tests/modules/alerts-monitoring/alerts-monitoring.controller.test.ts`
- optional only if implementation adds them: `backend/tests/modules/alerts-monitoring/alerts-monitoring.repository.test.ts`

Out of scope for this first slice:

- Prisma schema or migration changes
- `backend/src/api/routes.ts`
- frontend alerts UI, shared UI, or Playwright coverage
- package manifests, generated files, providers, startup/backfill, digest/copilot behavior rewrites, or cross-module portfolio/watchlist mutation proof

This plan does not approve application source edits, test edits, builds, or services. It records the QA packet only.

## Dependencies

- `CF-W1-L3-ALERT-03` requirement, architecture review, contract, and work packet are prepared.
- Team 00 must sequence this packet after `CF-W1-L3-ALERT-01` clears the active writer set.
- Team 00 must also sequence this packet away from parked `CF-W1-L3-AUTH-03` because both packets claim the same `alerts-monitoring` service/types/doc/test surfaces.
- Existing alert event ownership behavior from `CF-W1-L3-AUTH-02` remains the baseline for non-leaking event access.

## Required QA Assertions

- Follow-through is persisted only inside `metadata.followThrough` and merges without erasing unrelated metadata keys.
- `AlertEventDto` exposes additive `followThrough` projection while preserving existing raw `metadata`.
- `markRead()`, `dismiss()`, and `markAllRead()` remain inbox-state actions only and do not auto-create follow-through.
- The dedicated follow-through update path fails closed for missing or cross-user events.
- `reviewedAt` is set on first follow-through write and `updatedAt` changes on every follow-through write.
- `FOLLOW_UP_DEFERRED` accepts both null and populated `followUpDueAt`.
- `PORTFOLIO_REVIEW_NOTED` and `WATCHLIST_REVIEW_NOTED` remain review-memory language only and do not imply downstream mutations occurred.
- Existing alert digest and copilot unread behavior remains compatible because `readAt` and `dismissedAt` semantics are unchanged.
- Stored reason text stays concise and research-support oriented, without direct financial-advice or execution wording.

## Acceptance Scenarios

| Scenario | Expected QA result |
| --- | --- |
| First follow-through update on owned event | Persists `outcome`, optional `reasonSummary`, nullable `followUpDueAt`, sets `reviewedAt`, sets `updatedAt`, and preserves unrelated metadata keys. |
| Repeated follow-through update on owned event | Overwrites only `metadata.followThrough`, updates `updatedAt`, preserves unrelated metadata and existing inbox timestamps. |
| Read action without follow-through update | `readAt` changes only; no `followThrough` evidence is created or implied. |
| Dismiss action without follow-through update | `dismissedAt` changes only; no `followThrough` evidence is created or implied. |
| Mark-all-read action | Bulk inbox state changes only; no follow-through evidence is created. |
| Cross-user or missing event follow-through update | Returns non-leaking not-found behavior and does not mutate the record. |
| Deferred follow-through with due date | Stores `FOLLOW_UP_DEFERRED` and round-trips populated `followUpDueAt`. |
| Deferred follow-through without due date | Stores `FOLLOW_UP_DEFERRED` with `followUpDueAt = null`. |
| Portfolio/watchlist review noted outcome | Stores bounded review-memory outcome without claiming portfolio/watchlist source mutation. |
| Existing event listing after additive change | Current event payload fields remain present; new `followThrough` field is additive and backward-compatible. |
| Existing notifications/copilot digest summaries | Unread/dismissed summaries behave the same because no inbox-state semantics changed. |

## Focused Command Guidance

Commands below are guidance only. They were not run during this docs-only QA planning task.

Baseline focused backend validation after Team 00 sequencing, Ready promotion, and implementation handoff:

```powershell
cd backend
npm.cmd test -- alerts-monitoring.service.test.ts alerts-monitoring.validation.test.ts --runInBand
```

Ownership and route regression if controller, router, or ownership-sensitive event mutation paths are touched:

```powershell
cd backend
npm.cmd test -- alerts-monitoring.service.test.ts alerts-monitoring.ownership.test.ts alerts-monitoring.routes.test.ts --runInBand
```

If implementation adds dedicated controller or repository tests for follow-through behavior:

```powershell
cd backend
npm.cmd test -- alerts-monitoring.service.test.ts alerts-monitoring.controller.test.ts alerts-monitoring.repository.test.ts --runInBand
```

Approval-gated backend build after accepted implementation, Team 00 validation approval, and memory/resource check:

```powershell
cd backend
npm.cmd run build
```

## Skipped / Forbidden Checks

Skipped in this planning pass:

- all executable tests
- backend/frontend builds
- local servers, services, provider checks, and UI smoke

Forbidden by default for this slice:

- broad backend suites such as `npm.cmd test` with no file filters
- frontend `test:ui` or alerts page UI smoke
- Prisma generate, migrate, db push, db execute, or any schema/data mutation
- route-registry edits or tests outside module-local router coverage
- notification-delivery or copilot source rewrites to prove follow-through behavior
- portfolio/watchlist mutation verification, provider/live-market checks, startup/backfill, paid/cloud, telemetry, broker, or real-money flows

## Stop Conditions

Stop QA and return to Team 00 / Architect if:

- `CF-W1-L3-ALERT-01` is still occupying the same alert-module writer scope when Ready promotion is proposed
- `CF-W1-L3-AUTH-03` is promoted in overlapping sequence against the same alert-module files
- implementation requires Prisma, migration, route-registry, shared utility/UI, package, generated, frontend, provider, or startup/backfill scope
- implementation starts inferring follow-through from read or dismiss timestamps
- implementation expands into proving actual portfolio/watchlist mutations or digest/copilot behavior rewrites
- tests cannot validate ownership or metadata merge behavior without broad suites or live services
- stored note copy uses direct financial-advice, trade-execution, target-price, or guaranteed-outcome language

## Evidence Required Later

- Exact implementation handoff with changed files limited to the approved `alerts-monitoring` packet
- Scenario results for first-write, repeated-write, read-only, dismiss-only, mark-all-read, cross-user, deferred with/without due date, and additive DTO compatibility cases
- Confirmation that unrelated metadata keys remain intact after follow-through updates
- Confirmation that unread/dismissed digest semantics stayed unchanged
- Focused command output only after approval
- Skipped checks with reason and next owner
- Explicit note that this packet was sequenced after `CF-W1-L3-ALERT-01` and away from `CF-W1-L3-AUTH-03`
