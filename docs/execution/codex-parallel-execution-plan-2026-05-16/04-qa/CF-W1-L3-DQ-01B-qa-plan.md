# CF-W1-L3-DQ-01B QA Plan

Date: 2026-05-20

Owner: Team 04 QA Factory

## Work Item

`CF-W1-L3-DQ-01B` - portfolio intelligence reliability gate.

## QA Status

QA planning prepared. Not Ready for Team 00 Ready evaluation.

This is a backend-only docs planning pass. It does not approve implementation, executable validation, route changes, Prisma/schema changes, shared-file changes, frontend work, package changes, commits, or pushes.

## Source And Base Prerequisite

Future implementation must stack on accepted `CF-W1-L3-PORT-01A` commit `f1432e6` or on a later clean `dev` only after Team 00 confirms that `dev` contains `f1432e6`.

Reason: current plain `dev` still lacks the accepted passive readiness baseline that downstream portfolio-intelligence gating must consume. `dataStatus` alone cannot prove trust.

`CF-W1-L3-DQ-01A` remains the hard contract prerequisite for this child.

## Scope

Backend-only QA for additive reliability gating in `portfolio-intelligence`.

Allowed implementation files after Team 00 promotion:

- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.service.ts`
- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.types.ts`
- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.md`
- `backend/tests/modules/portfolio-intelligence/portfolio-intelligence.service.test.ts`

Forbidden for this child:

- `backend/src/modules/portfolio-management/**`
- `backend/src/modules/watchlist-management/**`
- `backend/src/modules/data-quality-engine/**`
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- backend or frontend route registries
- shared backend utilities or shared DTO files
- shared frontend components
- package manifests
- generated files
- all `frontend/src/features/portfolio-intelligence/**`
- all `frontend/tests/ui/**`
- alerts-monitoring and notifications-delivery source/tests
- provider, live-data, startup, backfill, paid/cloud, broker, or telemetry scope

## Contract Inputs Reviewed

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-L3-DQ-01B-portfolio-intelligence-reliability-gate-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-L3-DQ-01B-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-L3-DQ-01B-portfolio-intelligence-reliability-gate-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-L3-DQ-01B-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-CF-W1-L3-DQ-01B-architecture.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-L3-DQ-01A-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-L3-DQ-01A-lane-3-passive-readiness-dto-contract.md`
- current `portfolio-intelligence` source and test surface:
  - `backend/src/modules/portfolio-intelligence/portfolio-intelligence.service.ts`
  - `backend/src/modules/portfolio-intelligence/portfolio-intelligence.types.ts`
  - `backend/tests/modules/portfolio-intelligence/portfolio-intelligence.service.test.ts`
  - `backend/tests/modules/portfolio-intelligence/portfolio-intelligence.routes.test.ts`

## Required QA Assertions

- `reliability.status` is `RELIABLE` only when readiness evidence is trusted through `PortfolioManagementService.summary()`.
- `LIMITED` may remain visible, but it must not claim trusted actionability.
- `DIAGNOSTIC` is heuristic-only fallback output, not trusted readiness.
- `BLOCKED` is required for missing, blocked, stale, unsupported, scope-mismatched, `NOT_READY`, or `UNUSABLE` readiness evidence.
- missing readiness cannot become trusted because `dataStatus = COMPLETE`.
- `canTrustActionSuggestions` is false whenever `reliability.status` is not `RELIABLE`.
- trusted-claim suppression also applies to health, review ranking, and red-flag trust claims when readiness is not trusted.
- existing response fields remain backward-compatible, with `reliability` added as an additive field only.
- no DQE repository import, duplicate readiness mapping, or watchlist dependency is introduced.

## Scenario Matrix

| Scenario | Required evidence |
| --- | --- |
| READY | `reliability.status = RELIABLE`; `canTrustHealthScore`, `canTrustReviewRanking`, `canTrustRedFlags`, and `canTrustActionSuggestions` are true; existing health, review, red-flag, and action-like output remains trusted. |
| LIMITED | `reliability.status = LIMITED`; the response may stay visible, but health, review, red-flag, and action-like trust claims are downgraded; `canTrustActionSuggestions = false`. |
| DIAGNOSTIC | `reliability.status = DIAGNOSTIC`; output is heuristic-only, all trust claims are false, and reasons explain the missing or non-trusted readiness evidence. |
| BLOCKED | `reliability.status = BLOCKED`; blockers are present, all trust claims are false, and blocked/stale/unsupported/scope-mismatch/`NOT_READY`/`UNUSABLE` evidence does not produce trusted review output. |
| Missing readiness fail-closed | No readiness metadata still yields blocked or diagnostic-only output, and `dataStatus = COMPLETE` does not upgrade trust. |
| Trusted-claim suppression | Any non-`RELIABLE` state keeps action-like claims suppressed and prevents health/review/red-flag output from being presented as trusted. |
| Backward compatibility | Existing fields remain present: `healthScore`, `status`, `explanation`, `scoreBreakdown`, `holdings`, `redFlags`, `reviewRanking`, `groupedSummary`, `signalOverlay`, `thresholds`, `source`, and `dataStatus`. |
| Boundary proof | The implementation stays on the public `PortfolioManagementService.summary()` boundary only and does not reach into DQE repositories, watchlist readiness, Prisma, routes, or shared DTOs. |

## Focused Automation Requirements

Run a memory check before process-heavy validation when practical:

```powershell
Get-Counter '\Memory\% Committed Bytes In Use'
```

Run from `backend` after a `CF-W1-L3-DQ-01B` implementation handoff exists:

```powershell
npm.cmd test -- portfolio-intelligence.service.test.ts --runInBand
```

Run backend build after focused tests:

```powershell
npm.cmd run build
```

Route tests are not part of this child unless Team 00 widens the scope into controller or router work.

## QA Rejection Criteria

- implementation starts from a plain `dev` base that does not contain accepted `f1432e6`;
- readiness is treated as trusted without accepted passive readiness evidence;
- missing readiness is trusted because `dataStatus = COMPLETE` or because a signal exists;
- `LIMITED`, `DIAGNOSTIC`, or `BLOCKED` states still present trusted action-like claims;
- DQE repository internals are imported or readiness mapping is duplicated;
- portfolio-management, watchlist-management, Prisma/schema/migrations, route registries, shared utilities, shared UI, package manifests, generated files, providers, live-data, startup/backfill, paid/cloud, broker, or telemetry files are touched;
- wording drifts into direct financial advice, arbitrary target prices, or trade instructions;
- `INTEL-02` traceability-only fields are pulled into this child.

## Evidence Required From Future QA Execution

- branch/worktree and base confirmation, including `f1432e6` or later clean `dev` containing it;
- exact implementation handoff under test;
- exact changed files;
- exact files inspected;
- memory check result or reason it could not be measured;
- focused service test command and result;
- backend build command and result;
- scenario results for `RELIABLE`, `LIMITED`, `DIAGNOSTIC`, `BLOCKED`, missing-readiness fail-closed, trusted-claim suppression, backward compatibility, and boundary proof;
- skipped checks with reasons;
- risks, blockers, next gate, and Ready/Reject recommendation.

## Blockers

- No implementation handoff exists yet.
- Current `dev` still lacks the accepted `PORT-01A` baseline.
- Executable QA is blocked until Team 00 confirms the implementation base and a backend-only implementation handoff exists.

## Team 00 Ready Evaluation

No. Team 00 should not evaluate `CF-W1-L3-DQ-01B` for Ready yet.

Once the base is confirmed and the implementation handoff exists, Team 00 can evaluate this child with the QA plan above.
