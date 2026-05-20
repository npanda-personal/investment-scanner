# CF-W1-L3-PORT-01B QA Plan

Date: 2026-05-20

Owner: Team 04 QA Factory

## Work Item

`CF-W1-L3-PORT-01B` - watchlist-management readiness DTOs.

## QA Status

QA-READY for Team 00 Ready evaluation.

This is a backend-only focused QA plan. It does not approve implementation, source edits, Prisma/schema changes, route changes, frontend/shared work, provider work, package changes, commits, or pushes.

## Source And Base Prerequisite

Future implementation must stack on accepted `CF-W1-L3-PORT-01A` commit `f1432e6` or on a later clean `dev` only after Team 00 confirms that `dev` contains `f1432e6`.

Reason: `CF-W1-L3-PORT-01B` inherits the accepted portfolio readiness DTO semantics from `CF-W1-L3-PORT-01A`, including module-local DTO names, `displayStatus`, `actionStatus`, missing-evaluation blocking, `LIMITED` passive-only behavior, and signal-tier action eligibility.

Current planning was prepared in the shared `dev` workspace. No executable validation was run because no `PORT-01B` implementation handoff exists yet.

## Scope

Backend-only QA for additive watchlist readiness DTOs in `watchlist-management`.

Allowed implementation files after Team 00 promotion:

- `backend/src/modules/watchlist-management/watchlist-management.service.ts`
- `backend/src/modules/watchlist-management/watchlist-management.types.ts`
- `backend/src/modules/watchlist-management/watchlist-management.md`
- `backend/tests/modules/watchlist-management/watchlist-management.service.test.ts`

Forbidden for this child:

- portfolio-management source/tests
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- backend or frontend route registries
- Data Quality Engine source or public export changes
- shared backend utilities or shared DTOs
- shared frontend components
- package manifests
- generated files
- alerts-monitoring source/tests
- portfolio-intelligence source/tests
- frontend feature files
- providers, startup/backfill, paid/cloud, broker, live-provider, or telemetry flows

## Contract Inputs Reviewed

- `AGENTS.md`
- `10-requirements/CF-W1-L3-PORT-01B-watchlist-readiness-dto-requirement.md`
- `03-architecture/CF-W1-L3-PORT-01B-architecture-review.md`
- `06-contracts/CF-W1-L3-PORT-01B-watchlist-readiness-dto-contract.md`
- `08-work-packets/CF-W1-L3-PORT-01B-work-packet.md`
- `03-architecture/CF-W1-L3-PORT-01-architecture-review.md`
- `06-contracts/CF-W1-L3-PORT-01-portfolio-watchlist-readiness-dto-contract.md`
- `08-work-packets/CF-W1-L3-PORT-01-work-packet.md`
- `04-qa/CF-W1-L3-PORT-01-qa-plan.md`
- `04-qa/CF-W1-L3-PORT-01A-qa-evidence.md`
- `09-summaries/team-00-CF-W1-L3-PORT-01A-ready-promotion.md`
- `git show f1432e6:docs/execution/codex-parallel-execution-plan-2026-05-16/09-summaries/CF-W1-L3-PORT-01A-po-acceptance-packet.md`
- `git show f1432e6:docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-L3-PORT-01A-developer-handoff.md`
- `backend/src/modules/watchlist-management/watchlist-management.service.ts`
- `backend/src/modules/watchlist-management/watchlist-management.types.ts`
- `backend/tests/modules/watchlist-management/watchlist-management.service.test.ts`
- `backend/package.json`

## Required DTO Assertions

QA must prove the future implementation:

- adds `readiness: WatchlistItemReadinessDto` to every `WatchlistDashboardItemDto`;
- adds `readinessSummary: WatchlistReadinessSummaryDto` to `WatchlistDetailDto`;
- preserves existing `currentPrice`, `dailyChange`, `dailyChangePercent`, `latestSignal`, and `researchUrl` fields;
- preserves existing sorting behavior for `recentlyAdded`, `signalScoreDesc`, `dailyChangeDesc`, `dailyChangeAsc`, and `symbolAsc`;
- consumes Data Quality Engine outputs through public module exports only;
- does not import `DataQualityEngineRepository`;
- does not duplicate DQE scoring, stale thresholds, liquidity scoring, coverage scoring, unsupported-scope logic, or provider freshness logic;
- does not edit portfolio files or create any portfolio behavior in this child.

## Scenario Matrix

| Scenario | Required evidence |
| --- | --- |
| Ready watchlist row | A row with DQE daily-review tier `READY`, signal tier `READY`, and `eligibleForSignals = true` returns `readiness.displayStatus = READY`, `readiness.actionStatus = READY`, populated DQE evidence fields, and a summary with ready count incremented. Existing price, daily move, latest signal, and `researchUrl` remain present. |
| Ready row with automation-only blocker | If DQE returns daily-review `READY`, signal tier `READY`, `eligibleForSignals = true`, and an automation-only blocker such as `AUTOMATION_BLOCKED: PHASE0_AUTOMATION_NOT_AUTHORIZED`, watchlist display/action readiness must follow accepted `PORT-01A` semantics and not be hard-blocked by duplicating DQE blocker interpretation. The blocker may remain visible in evidence. |
| Limited row | A row with DQE `LIMITED` or daily-review tier `LIMITED` returns `displayStatus = LIMITED`, `actionStatus = BLOCKED`, carries DQE reasons/warnings/blockers, increments `limitedCount`, and does not mark action workflows ready. |
| Missing DQ row | A row with no DQE evaluation returns `displayStatus = BLOCKED`, `actionStatus = BLOCKED`, `signalReadinessStatus = MISSING`, `coverageStatus = MISSING`, `liquidityStatus = MISSING`, tier statuses `MISSING`, `eligibleForSignals = false`, and a blocker containing `Missing data quality evaluation.` Price or latest signal presence must not create trusted readiness. |
| Blocked stale row | A row with stale hard blocker evidence, daily-review `BLOCKED`, signal tier `BLOCKED`, `signalReadinessStatus = NOT_READY`, `coverageStatus = UNUSABLE`, unsupported, or scope-mismatch evidence returns blocked display/action readiness and preserves blocker evidence. |
| Backward-compatible fields | Existing tests continue proving `currentPrice`, `dailyChange`, `dailyChangePercent`, `latestSignal`, and `researchUrl` are returned exactly as before, and sorting still uses existing fields without being affected by readiness metadata. |
| Readiness summary | Mixed ready, limited, blocked, and missing rows produce accurate `readyCount`, `limitedCount`, `blockedCount`, `missingEvaluationCount`, `status`, `canUseForTrustedDisplay`, and `canUseForActionWorkflows`. |
| Public DQE boundary | Static review or focused test setup proves the service imports DQE through `../data-quality-engine` public exports only and no DQE repository/source/export files are changed. |
| No portfolio edits | Implementation diff contains no `backend/src/modules/portfolio-management/**` or `backend/tests/modules/portfolio-management/**` changes. |
| Forbidden scope untouched | Diff contains no frontend, shared, route registry, Prisma/schema/migration, package, provider, generated, alerts, portfolio-intelligence, paid/cloud, broker, live-provider, or telemetry changes. |

## Focused Automation Requirements

Run memory check before process-heavy validation when practical:

```powershell
Get-Counter '\Memory\% Committed Bytes In Use'
```

Run from `backend` after a `PORT-01B` implementation handoff exists:

```powershell
npm.cmd test -- watchlist-management.service.test.ts --runInBand
```

Run backend build after focused tests:

```powershell
npm.cmd run build
```

Optional static scope review commands for QA evidence:

```powershell
git diff --name-only
Select-String -Path backend/src/modules/watchlist-management/*.ts -Pattern 'DataQualityEngineRepository|data-quality-engine.repository'
```

Do not run UI smoke tests for this child unless Team 00 expands scope to frontend. Do not run providers, startup/backfill flows, live market-data refresh, Prisma migration/push commands, broad suites, package installation, commits, or pushes as part of this QA plan.

## QA Rejection Criteria

Reject the implementation if any of the following occur:

- implementation starts from an unstacked `dev` base that does not contain accepted `f1432e6`;
- readiness fields are absent from watchlist rows or the watchlist detail summary;
- `LIMITED` is treated as action-ready;
- missing DQ is treated as trusted because price or latest signal exists;
- stale, unsupported, scope-mismatch, `NOT_READY`, `UNUSABLE`, or blocked-tier evidence is not blocked;
- watchlist code duplicates DQE scoring or hard-codes broad DQE blocker interpretation beyond the approved mapping;
- DQE repository internals are imported;
- DQE source/export files are changed;
- existing watchlist fields or sort behavior regress;
- portfolio files are edited;
- Prisma/schema/migrations, route registries, frontend/shared files, packages, generated files, providers, paid/cloud, broker, live-provider, or telemetry files are touched;
- new wording implies direct financial advice, arbitrary target prices, guaranteed outcomes, or trade instructions.

## Evidence Required From Future QA Execution

QA evidence must record:

- branch/worktree and base confirmation, including `f1432e6` or later `dev` containing it;
- exact implementation handoff under test;
- exact changed files;
- exact files inspected;
- memory check result or reason it could not be measured;
- focused watchlist test command and result;
- backend build command and result;
- scenario results for ready, ready-with-automation-only-blocker, limited, missing, stale/blocked, backward compatibility, summary counts, DQE public boundary, and no portfolio edits;
- skipped checks with reasons;
- risks, blockers, next gate, and Ready/Reject recommendation.

## Blockers

Executable QA is blocked until Team 00 promotes `CF-W1-L3-PORT-01B` to Ready for Implementation and Team 07 or another assigned implementation owner provides a backend-only handoff on `f1432e6` or later confirmed `dev` containing it.

No QA-plan blocker remains.

## Ready-Promotion Recommendation

Team 04 recommends Team 00 may promote `CF-W1-L3-PORT-01B` to Ready for Implementation once Team 00 confirms the implementation base rule: stack on accepted `f1432e6`, or use a later clean `dev` that contains `f1432e6`.
