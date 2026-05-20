# CF-W1-L3-WATCH-01 QA Plan

Date: 2026-05-20

Owner: Team 04 QA Factory

## Result

QA-READY for planning.

Ready-promotion recommendation: conditional NOT-READY for implementation until Team 00 confirms the implementation base is either accepted `CF-W1-L3-PORT-01B` commit `a2edfb6` or a later clean `dev` where `a2edfb6` is an ancestor.

Current workspace evidence:

- Branch check: `## dev...origin/dev [ahead 140]`.
- Base check command: `git merge-base --is-ancestor a2edfb6 HEAD`.
- Base check result in this workspace: `a2edfb6 is NOT ancestor of HEAD`.
- Accepted PORT-01B baseline inspected: `a2edfb616b8c0c8fe55afb6b723457bd07700c42`, branch `codex/team07-portfolio-alerts/CF-W1-L3-PORT-01B`, subject `feat: add watchlist readiness dto evidence`, date `2026-05-20 00:37:11 +0200`.

## Scope Under Test

`CF-W1-L3-WATCH-01` is a bounded watchlist-management frontend/backend slice that adds explainable review actionability to the existing watchlist detail surface.

Allowed implementation scope after Ready promotion:

- `backend/src/modules/watchlist-management/watchlist-management.service.ts`
- `backend/src/modules/watchlist-management/watchlist-management.types.ts`
- `backend/src/modules/watchlist-management/watchlist-management.validation.ts`
- `backend/src/modules/watchlist-management/watchlist-management.md`
- `backend/tests/modules/watchlist-management/watchlist-management.service.test.ts`
- `backend/tests/modules/watchlist-management/watchlist-management.validation.test.ts`
- `frontend/src/features/watchlist-management/types.ts`
- `frontend/src/features/watchlist-management/components/WatchlistManagementPage.tsx`
- Optional focused UI smoke: `frontend/tests/ui/watchlist-management.spec.ts`

Forbidden scope:

- Prisma schema or migrations
- backend or frontend route registries
- watchlist repository, controller, router, route tests, or ownership tests
- Data Quality Engine source or scoring logic
- portfolio, alerts, notifications, copilot, provider, startup, backfill, live-provider, paid/cloud, telemetry, or broker scope
- shared backend utilities, shared frontend components, generated files, or package manifests
- unrelated Research Hub source or UI files

## Evidence Read

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-L3-WATCH-01-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-L3-WATCH-01-watchlist-review-actionability-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-L3-WATCH-01-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-L3-WATCH-01-watchlist-review-actionability-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/refinement-queue.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/requirements-backlog.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/12-ready-queue/ready-for-implementation.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-02-requirement-factory.md`
- `git show a2edfb6:docs/execution/codex-parallel-execution-plan-2026-05-16/09-summaries/CF-W1-L3-PORT-01B-po-acceptance-packet.md`
- `git show a2edfb6:docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-00-CF-W1-L3-PORT-01B-delegated-po-acceptance.md`
- `git show a2edfb6:backend/src/modules/watchlist-management/watchlist-management.types.ts`
- `git show a2edfb6:backend/src/modules/watchlist-management/watchlist-management.service.ts`

## Acceptance Criteria

QA must accept only if all criteria pass:

- Watchlist detail rows expose additive `reviewActionability` with `priority`, `reasonSummary`, `reasonCodes`, `signalGeneratedAt`, `signalAgeDays`, `usesNotes`, and `usesTags`.
- Watchlist detail response exposes additive `reviewActionabilitySummary` with `defaultSort: 'reviewPriorityDesc'` and counts for high, medium, refresh, and background priorities.
- `HIGH_REVIEW_PRIORITY`, `MEDIUM_REVIEW_PRIORITY`, `REFRESH_EVIDENCE`, and `BACKGROUND` mapping is deterministic and explainable.
- Signal freshness mapping is deterministic: fresh within 7 days, aging at 8-14 days, missing when absent or older than 14 days.
- `reviewPriorityDesc` ordering is deterministic with the contract tie-break sequence: priority weight, signal score descending, absolute daily change percent descending, signal generated timestamp descending, created timestamp descending.
- Unknown or omitted sort values still fall back to `recentlyAdded`.
- Accepted PORT-01B `readiness` on rows and `readinessSummary` on detail responses remain present and backward-compatible.
- DQ readiness is not used as review-priority evidence and is not referenced as a reason code or reason-summary basis.
- Existing current price, daily change, daily change percent, latest signal, research link, notes, tags, CRUD behavior, and existing sort options remain backward-compatible.
- Watchlist detail UI renders priority badge or equivalent field plus reason summary for each row.
- Notes/tags editing behavior is preserved.
- Product language stays research-support oriented and avoids advice, target-price, alert, portfolio-action, automation, or execution semantics.
- Implementation stays inside allowed files and does not widen into forbidden broad UI/shared/routes/schema/package/provider/live/startup scope.

## Required Mapping Scenarios

### High Review Priority

Prepare rows where existing enrichment fields show:

- fresh signal generated within 7 days;
- strong signal score, or notable daily move with fresh/non-neutral signal context;
- optional non-neutral direction.

Expected:

- `reviewActionability.priority` is `HIGH_REVIEW_PRIORITY`;
- reason codes include the applicable evidence such as `FRESH_SIGNAL`, `HIGH_SIGNAL_SCORE`, `LARGE_DAILY_MOVE`, or `NON_NEUTRAL_SIGNAL`;
- reason summary is concise, plain text, and does not mention buy/sell, targets, alerts, or readiness trust;
- high-priority rows sort above medium, refresh, and background rows under `reviewPriorityDesc`.

### Medium Review Priority

Prepare rows where existing enrichment fields show:

- lighter fresh or aging signal evidence, or
- note presence, tag presence, or moderate daily move.

Expected:

- `reviewActionability.priority` is `MEDIUM_REVIEW_PRIORITY`;
- `usesNotes` and `usesTags` reflect presence only and do not parse sentiment;
- reason codes may include `NOTES_PRESENT` or `TAGS_PRESENT`;
- reason summary frames the row as a review candidate, not a recommendation.

### Refresh Evidence

Prepare rows where signal evidence is missing or stale:

- no latest signal; or
- signal generated more than 14 days ago.

Expected:

- `reviewActionability.priority` is `REFRESH_EVIDENCE`;
- reason code includes `MISSING_SIGNAL` when absent or stale beyond the contract threshold;
- reason summary asks for refreshed evidence before review;
- no DQ readiness status, blocker, or warning is used to justify this priority.

### Background

Prepare rows with no stronger signal, move, note, tag, or refresh condition.

Expected:

- `reviewActionability.priority` is `BACKGROUND`;
- item remains visible;
- item sorts below explicit review candidates under `reviewPriorityDesc`;
- reason summary remains neutral and does not imply readiness or action.

## Backend Verification Plan

Focused service tests must cover:

- high priority mapping from fresh strong signal and notable daily move;
- medium priority mapping from note/tag presence and lighter signal evidence;
- refresh evidence mapping from missing or stale signal evidence;
- background mapping for neutral rows;
- deterministic `reviewPriorityDesc` ordering, including tie cases;
- unknown sort fallback to `recentlyAdded`;
- preservation of existing sort options: `signalScoreDesc`, `dailyChangeDesc`, `dailyChangeAsc`, and `symbolAsc`;
- preservation of PORT-01B row `readiness` and detail `readinessSummary`;
- proof that review actionability does not read `readiness`, `readinessSummary`, Data Quality Engine statuses, DQ blockers, or DQ warnings as priority evidence.

Focused validation tests must cover:

- `reviewPriorityDesc` parses as a valid sort option;
- invalid sort still parses to `recentlyAdded`;
- existing validation behavior remains unchanged.

Suggested commands after implementation:

```powershell
cd backend
npm.cmd test -- watchlist-management.service.test.ts watchlist-management.validation.test.ts --runInBand
npm.cmd run build
```

## Frontend Verification Plan

Focused UI or component verification must cover:

- watchlist detail table renders the review-priority field for each row;
- priority label and reason summary are visible and fit the existing table layout;
- initial local sort prefers `reviewPriorityDesc` once the field exists;
- existing sort selector still offers previous sort options;
- notes/tags editing still works and preserves saved note/tag values;
- existing watchlist creation, deletion, and item editing flows are not changed;
- empty/loading/error states remain coherent for the detail page.

Suggested command after implementation if a focused UI smoke is added:

```powershell
cd frontend
npm.cmd run test:ui -- watchlist-management.spec.ts --workers=1
npm.cmd run build
```

If no focused UI smoke is added, QA must record the exact blocker and residual risk because this is a user-visible frontend/backend slice.

## Boundary And Regression Scans

Run these checks after implementation:

```powershell
git diff --name-only
```

Expected changed application paths must be limited to the allowed watchlist files plus optional `frontend/tests/ui/watchlist-management.spec.ts` and docs/evidence.

```powershell
rg -n "DataQualityEngineService|readinessSummary|readiness\\.|signalReadinessStatus|coverageStatus|liquidityStatus|readinessBlockers|warnings" backend/src/modules/watchlist-management frontend/src/features/watchlist-management
```

Expected:

- PORT-01B readiness code may remain in watchlist service/types.
- WATCH-01 review-priority calculation must not consume readiness fields or DQ statuses as actionability evidence.

```powershell
rg -n "buy now|sell now|must buy|must sell|guaranteed|profit target|price target|target price|ready to execute|high conviction trade|automated trade|alert created|portfolio action" backend/src/modules/watchlist-management frontend/src/features/watchlist-management backend/tests/modules/watchlist-management frontend/tests/ui
```

Expected: no forbidden direct-advice, target, alert, portfolio-action, or execution wording in scoped implementation and tests, except inside explicit negative assertions.

## Stop Conditions

Reject QA handoff and return to Team 00 / Team 03 if implementation:

- starts from current unstacked `dev` without proving `a2edfb6` is included;
- removes or changes PORT-01B `readiness` or `readinessSummary`;
- uses DQ readiness as review-priority evidence;
- changes Prisma, migrations, route registries, package manifests, generated files, shared UI, shared utilities, providers, startup, live data, backfill, alerts, notifications, portfolio modules, or Data Quality Engine source;
- parses note/tag sentiment or uses hidden text classification;
- introduces advice, target-price, alert, portfolio-action, automation, or execution semantics;
- changes watchlist CRUD, notes/tags editing, route paths, or existing response fields outside additive DTO fields.

## Commands And Evidence Required In QA Handoff

The implementation QA handoff must include:

- base evidence: `git merge-base --is-ancestor a2edfb6 HEAD` passes, or branch/worktree is directly based on `a2edfb6`;
- changed-file list proving allowed scope only;
- focused backend watchlist service and validation test results;
- backend build result;
- frontend build result for frontend changes;
- focused UI smoke result proving rendered review priority and notes/tags editing preservation, or explicit skipped-test blocker and risk;
- boundary scan result for no forbidden files;
- scan result proving no forbidden advice/target/alert/portfolio wording;
- explicit note that DQ readiness was preserved but not used as review-priority evidence;
- explicit note that no broad UI/shared/routes/schema/package/provider/live/startup scope was introduced.

## Blockers

- Current main workspace `dev` does not contain accepted PORT-01B commit `a2edfb6` by ancestry check. Team 00 must either route WATCH-01 from `a2edfb6` directly or first integrate `a2edfb6` into a clean `dev` and confirm ancestry.
- The current workspace is dirty with unrelated Research Hub source/UI changes and many active docs. Implementation must use Team 00 file reservations and must not reuse unrelated dirty work.

## QA Recommendation

Team 04 recommends keeping `CF-W1-L3-WATCH-01` as QA-planned and Ready-evaluable, but not implementation-ready from the current main workspace state.

Promote only after Team 00 records:

- safe base evidence from `a2edfb6` or later clean `dev` containing it;
- exact watchlist file reservations;
- no active watchlist writer conflict;
- Team 07 implementation handoff limited to the allowed bounded frontend/backend watchlist slice.
