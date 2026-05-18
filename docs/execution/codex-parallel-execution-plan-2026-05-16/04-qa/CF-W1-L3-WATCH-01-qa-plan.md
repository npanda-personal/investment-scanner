# CF-W1-L3-WATCH-01 QA Plan

Date: 2026-05-18

Owner: Team 04 QA Factory

Status: Watchlist review actionability QA plan prepared. QA-ready for Team 00 Ready evaluation as one bounded watchlist-owned vertical slice, but Team 00 must not promote or implement it in parallel with `CF-W1-L3-PORT-01B` because both packets reserve the same `watchlist-management` backend service/types/doc/test surfaces.

Current status refresh: Team 03 prepared the requirement, architecture review, child contract, and work packet on 2026-05-18. Team 04 accepts this as planning evidence only. No tests, builds, servers, UI smoke, or source/test edits were run in this pass.

## Scope

Validation plan for additive watchlist review actionability inside `watchlist-management` using:

- additive `reviewActionability` on `WatchlistDashboardItemDto`
- additive `reviewActionabilitySummary` on `WatchlistDetailDto`
- additive `reviewPriorityDesc` sort behavior
- existing watchlist detail UI only

In-scope surfaces after Team 00 sequencing, Ready promotion, and implementation handoff:

- `backend/src/modules/watchlist-management/watchlist-management.service.ts`
- `backend/src/modules/watchlist-management/watchlist-management.types.ts`
- `backend/src/modules/watchlist-management/watchlist-management.validation.ts`
- `backend/src/modules/watchlist-management/watchlist-management.md`
- `backend/tests/modules/watchlist-management/watchlist-management.service.test.ts`
- `backend/tests/modules/watchlist-management/watchlist-management.validation.test.ts`
- `frontend/src/features/watchlist-management/types.ts`
- `frontend/src/features/watchlist-management/components/WatchlistManagementPage.tsx`
- optional only if implementation adds it: `frontend/tests/ui/watchlist-management.spec.ts`

Out of scope for this first slice:

- Prisma schema or migration changes
- `backend/src/api/routes.ts`
- `frontend/src/app/routes.tsx`
- `backend/src/modules/watchlist-management/watchlist-management.repository.ts`
- `backend/src/modules/watchlist-management/watchlist-management.controller.ts`
- `backend/src/modules/watchlist-management/watchlist-management.router.ts`
- `backend/tests/modules/watchlist-management/watchlist-management.routes.test.ts`
- `backend/tests/modules/watchlist-management/watchlist-management.ownership.test.ts`
- shared UI, shared backend utilities, package manifests, generated files, providers, startup/backfill, alerts, portfolio, readiness DTO work, or cross-module DQ wiring

This plan does not approve application source edits, test edits, builds, or services. It records the QA packet only.

## Dependencies

- `CF-W1-L3-WATCH-01` requirement, architecture review, contract, and work packet are prepared.
- Team 00 must keep this packet separate from `CF-W1-L3-PORT-01B`.
- Team 00 must not promote or implement this packet in parallel with `CF-W1-L3-PORT-01B` because both packets claim `watchlist-management.service.ts`, `watchlist-management.types.ts`, `watchlist-management.md`, and focused watchlist backend tests.
- Existing watchlist ownership behavior from `CF-W1-L3-AUTH-01` remains the baseline and must not regress even though ownership-specific files are not reserved for this slice.
- Existing route shape and watchlist CRUD behavior remain the baseline and must not regress.

## Required QA Assertions

- Review actionability is derived only from existing watchlist enrichment fields: `latestSignal.score`, `latestSignal.direction`, `latestSignal.generatedAt`, `dailyChangePercent`, note presence, and tag presence.
- `reviewActionability.priority`, `reasonSummary`, `reasonCodes`, `signalGeneratedAt`, `signalAgeDays`, `usesNotes`, and `usesTags` are additive and backward-compatible.
- `reviewActionabilitySummary` is additive and counts high, medium, refresh-evidence, and background items accurately.
- `reviewPriorityDesc` ordering is deterministic and follows the contract tie-break order.
- Unknown or omitted sort values still fall back to `recentlyAdded`.
- Existing watchlist detail fields remain present: `currentPrice`, `dailyChange`, `dailyChangePercent`, `latestSignal`, `researchUrl`, `notes`, and `tags`.
- Missing or stale signal context maps to `REFRESH_EVIDENCE` only and does not imply Data Quality readiness, alerts, portfolio action, or trusted execution state.
- Notes and tags influence review priority only as bounded user context signals; no free-text sentiment parsing or hidden classification is introduced.
- Reason summaries stay concise, explainable, and research-support oriented, with no direct financial-advice or automation wording.
- The watchlist detail page shows the new actionability field while preserving notes/tags editing behavior and the existing add/remove flows.

## Acceptance Scenarios

| Scenario | Expected QA result |
| --- | --- |
| Fresh high-score non-neutral signal with notable daily move | Item maps to `HIGH_REVIEW_PRIORITY`, appears near the top under `reviewPriorityDesc`, and reason summary cites fresh signal plus move-based evidence without advice wording. |
| Fresh but lighter signal evidence | Item maps to `MEDIUM_REVIEW_PRIORITY` when the score or move is weaker than the high-priority threshold but still merits the next review pass. |
| Note and/or tag context without strong signal evidence | Item can rise to `MEDIUM_REVIEW_PRIORITY`; `usesNotes` and `usesTags` round-trip correctly; no note/tag text parsing is implied. |
| Missing signal | Item maps to `REFRESH_EVIDENCE`, includes `MISSING_SIGNAL`, and does not claim readiness, alert eligibility, or conviction. |
| Aging signal from 8-14 days | Item includes `AGING_SIGNAL`; priority remains deterministic per mapping rules and reason summary explains aging evidence. |
| Stale signal older than 14 days | Item maps to `REFRESH_EVIDENCE`, reason summary tells the user to refresh evidence before the next review pass, and no stronger trust wording appears. |
| Background item with weak or absent actionability cues | Item maps to `BACKGROUND`, remains visible, and sorts below explicit review candidates. |
| Tie case across multiple items | `reviewPriorityDesc` preserves deterministic order using priority weight, signal score, absolute daily change percent, signal timestamp, then `createdAt`. |
| Existing sort fallback | Invalid or unknown sort input still resolves to `recentlyAdded`; existing sort options continue to work. |
| Existing detail payload compatibility | Existing watchlist item fields and watchlist CRUD flows still behave as before while the new actionability fields are additive. |
| Watchlist detail UI render | Watchlist table shows review-priority label/badge and reason summary without breaking notes/tags save, item removal, pagination, or research link behavior. |
| Forbidden semantics guard | No readiness summary, DQ wording, portfolio mutation wording, alert wording, target-price wording, or direct advice wording leaks into labels or reason summaries. |

## Focused Command Guidance

Commands below are guidance only. They were not run during this docs-only QA planning task.

Baseline focused backend validation after Team 00 sequencing, Ready promotion, and implementation handoff:

```powershell
cd backend
npm.cmd test -- watchlist-management.service.test.ts watchlist-management.validation.test.ts --runInBand
```

Approval-gated backend build after accepted implementation, Team 00 validation approval, and memory/resource check:

```powershell
cd backend
npm.cmd run build
```

Approval-gated frontend build after accepted implementation, Team 00 validation approval, and memory/resource check:

```powershell
cd frontend
npm.cmd run build
```

Optional focused watchlist UI smoke only if the implementation adds `frontend/tests/ui/watchlist-management.spec.ts`:

```powershell
cd frontend
npm.cmd run test:ui -- watchlist-management.spec.ts --workers=1
```

Current watchlist UI spec gap note:

- `frontend/tests/ui/watchlist-management.spec.ts` does not exist today.
- If the eventual implementation changes only backend behavior, Team 04 can keep UI smoke out of scope.
- If the eventual implementation changes the watchlist detail UI, Team 04 expects either a new focused watchlist Playwright spec or an explicit blocker recorded in the implementation handoff.

## Skipped / Forbidden Checks

Skipped in this planning pass:

- all executable tests
- backend/frontend builds
- local servers, services, provider checks, and UI smoke

Forbidden by default for this slice:

- broad backend suites such as `npm.cmd test` with no file filters
- Playwright runs for unrelated specs
- Prisma generate, migrate, db push, db execute, or any schema/data mutation
- route-registry edits or tests outside module-local watchlist behavior
- ownership/routes regression unless Team 00 widens the reservation
- readiness DTO verification mixed with `CF-W1-L3-PORT-01B`
- Data Quality Engine source rewrites, alert workflows, portfolio workflows, provider/live-market checks, startup/backfill, paid/cloud, telemetry, broker, or real-money flows

## Stop Conditions

Stop QA and return to Team 00 / Architect if:

- Team 00 attempts to promote `CF-W1-L3-WATCH-01` in parallel with `CF-W1-L3-PORT-01B`
- implementation requires Prisma, migration, route-registry, repository/controller/router, shared utility/UI, package, generated, Data Quality, alert, portfolio, or provider scope
- implementation adds readiness semantics, alert semantics, or portfolio action semantics to actionability labels or summaries
- implementation starts parsing note or tag text content instead of checking bounded presence
- implementation changes existing watchlist CRUD, ownership, or route behavior outside the reserved files
- UI changes land without a focused validation path and without an explicit blocker note for the missing watchlist Playwright spec
- tests cannot validate the ranking behavior without broad suites or live services
- copy introduces direct financial-advice, target-price, guaranteed-outcome, or automation-authorization language

## Evidence Required Later

- Exact implementation handoff with changed files limited to the approved watchlist packet
- Explicit Team 00 sequencing note that `CF-W1-L3-WATCH-01` is not running in parallel with `CF-W1-L3-PORT-01B`
- Scenario results for high, medium, refresh-evidence, background, tie-break ordering, sort fallback, additive DTO compatibility, and UI render/edit preservation cases
- Confirmation that no readiness, alert, portfolio, or note-parsing semantics were introduced
- Focused command output only after approval
- If UI changed: focused watchlist UI smoke evidence, or a recorded blocker with risk and next owner
- Skipped checks with reason and next owner
