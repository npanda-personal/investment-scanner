# CF-W1-L3-INTEL-02 QA Plan

Date: 2026-05-20

Owner: Team 04 QA Factory

## Work Item

`CF-W1-L3-INTEL-02` - portfolio intelligence review traceability.

## QA Status

QA planning prepared. Not Ready for Team 00 Ready evaluation.

This is a backend-only docs planning pass. It does not approve implementation, executable validation, route changes, Prisma/schema changes, shared DTOs/utilities, shared UI, frontend work, package changes, commits, or pushes.

## Base And Dependency Prerequisite

Future implementation must stack on accepted `CF-W1-L3-PORT-01A` commit `f1432e6` or on a later clean `dev` only after Team 00 confirms that `dev` contains `f1432e6`.

Reason: current plain `dev` still lacks the accepted passive readiness baseline that downstream portfolio-intelligence review traceability must consume. `dataStatus` alone cannot prove trusted review standing.

`CF-W1-L3-DQ-01B` is a necessary upstream trust gate for the same lane, but it is not sufficient by itself to make `CF-W1-L3-INTEL-02` Ready.

`CF-W1-L3-INTEL-01` remains a same-file writer conflict and must be combined with or strictly sequenced against this child by Team 00.

## Scope

Backend-only QA for additive review traceability in `portfolio-intelligence`.

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
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-L3-INTEL-02-portfolio-intelligence-review-traceability-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-L3-INTEL-02-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-L3-INTEL-02-portfolio-intelligence-review-traceability-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-L3-INTEL-02-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-CF-W1-L3-INTEL-02-architecture.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-L3-INTEL-01-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-L3-DQ-01B-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-L3-DQ-01B-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-L3-DQ-01B-portfolio-intelligence-reliability-gate-contract.md`
- current `portfolio-intelligence` source and test surfaces:
  - `backend/src/modules/portfolio-intelligence/portfolio-intelligence.service.ts`
  - `backend/src/modules/portfolio-intelligence/portfolio-intelligence.types.ts`
  - `backend/tests/modules/portfolio-intelligence/portfolio-intelligence.service.test.ts`
  - `backend/tests/modules/portfolio-intelligence/portfolio-intelligence.routes.test.ts`
- upstream portfolio-management shapes that must already exist on the chosen base:
  - `backend/src/modules/portfolio-management/portfolio-management.types.ts`

## Required QA Assertions

- Portfolio Intelligence exposes additive review traceability without breaking existing response fields.
- `RELIABLE` review traceability is only possible when upstream readiness is trusted through the portfolio-management boundary.
- `LIMITED` review traceability may remain visible, but review ranking, red flags, and action-like labels must not imply trusted review standing.
- `DIAGNOSTIC` is heuristic-only fallback output and must not be presented as trusted review output.
- `BLOCKED` is required for missing, blocked, stale, unsupported, scope-mismatched, or otherwise untrusted readiness evidence.
- missing readiness cannot become trusted because `dataStatus = COMPLETE`.
- traceability metadata surfaces source modules, blocker reasons, and latest trusted data date when available.
- the public response remains backward-compatible, with traceability added only as additive metadata.
- no DQE repository import, duplicate readiness mapping, or watchlist dependency is introduced.
- no direct financial advice wording or target price language is introduced.

## Scenario Matrix

| Scenario | Required evidence |
| --- | --- |
| `RELIABLE` | Top-level review traceability reports trusted review standing; source modules and latest trusted data date are present when available; existing health, review, red-flag, and action-like fields remain intact. |
| `LIMITED` | Review output remains visible, but trust claims are downgraded; review ranking and red flags do not imply trusted review standing; action-like claims are suppressed. |
| `DIAGNOSTIC` | Heuristic-only fallback is labeled diagnostic; all trust claims are false; reasons explain why trusted review standing is not available. |
| `BLOCKED` | Blockers are surfaced; all trust claims are false; missing or blocked readiness cannot be treated as trustworthy review output. |
| Missing readiness fail-closed | No readiness metadata still yields blocked or diagnostic-only output, and `dataStatus = COMPLETE` does not upgrade trust. |
| Traceability propagation | Source modules, blocker reasons, and latest trusted data date propagate into the review traceability packet where upstream evidence exists. |
| Backward compatibility | Existing fields remain present: `healthScore`, `status`, `explanation`, `scoreBreakdown`, `holdings`, `redFlags`, `reviewRanking`, `groupedSummary`, `signalOverlay`, `thresholds`, `source`, and `dataStatus`. |
| Boundary proof | The implementation stays on the public `PortfolioManagementService.summary()` boundary only and does not reach into DQE repositories, watchlist readiness, Prisma, routes, or shared DTOs. |

## Focused Automation Requirements

Run a memory check before process-heavy validation when practical:

```powershell
Get-Counter '\Memory\% Committed Bytes In Use'
```

Run from `backend` after a `CF-W1-L3-INTEL-02` implementation handoff exists:

```powershell
npm.cmd test -- portfolio-intelligence.service.test.ts --runInBand
npm.cmd run build
```

Run only if the implementation unexpectedly widens into route/controller behavior, which is not expected for this child:

```powershell
npm.cmd test -- portfolio-intelligence.routes.test.ts --runInBand
```

Inspection commands for boundary proof after implementation:

```powershell
git diff --name-only
rg -n "reviewTraceability|canTrustHealthScore|canTrustReviewRanking|canTrustRedFlags|canTrustActionSuggestions|DataQualityEngineRepository|readinessSummary|readiness\." backend/src/modules/portfolio-intelligence backend/tests/modules/portfolio-intelligence backend/src/modules/portfolio-management
```

## QA Rejection Criteria

- implementation starts from a plain `dev` base that does not contain accepted `f1432e6`;
- `CF-W1-L3-DQ-01B` is treated as sufficient by itself, without the accepted `PORT-01A` readiness baseline;
- `CF-W1-L3-INTEL-01` and `CF-W1-L3-INTEL-02` are split into parallel writers against the same `portfolio-intelligence` files;
- missing readiness is trusted because `dataStatus = COMPLETE` or because a signal exists;
- `LIMITED`, `DIAGNOSTIC`, or `BLOCKED` states still present trusted review output;
- DQE repository internals are imported or readiness mapping is duplicated;
- portfolio-management, watchlist-management, Prisma/schema/migrations, route registries, shared utilities, shared UI, package manifests, generated files, providers, live-data, startup/backfill, paid/cloud, broker, or telemetry files are touched;
- wording drifts into direct financial advice, arbitrary target prices, or trade instructions;
- traceability-only fields are dropped from the backward-compatible response shape.

## Evidence Required From Future QA Execution

- branch/worktree and base confirmation, including `f1432e6` or later clean `dev` containing it;
- exact implementation handoff under test;
- exact changed files;
- exact files inspected;
- memory check result or reason it could not be measured;
- focused service test command and result;
- backend build command and result;
- scenario results for `RELIABLE`, `LIMITED`, `DIAGNOSTIC`, `BLOCKED`, missing-readiness fail-closed, traceability propagation, backward compatibility, and boundary proof;
- skipped checks with reasons;
- risks, blockers, next gate, and Ready/Reject recommendation.

## Blockers

- No implementation handoff exists yet.
- Current `dev` still lacks the accepted `PORT-01A` baseline.
- `CF-W1-L3-INTEL-01` remains the same-file writer conflict.
- Team 00 should not evaluate Ready until the base and one-writer sequencing are both confirmed.

## Team 00 Ready Evaluation

No. Team 00 should not evaluate `CF-W1-L3-INTEL-02` for Ready yet.

After `CF-W1-L3-DQ-01B` lands, Team 00 may evaluate `CF-W1-L3-INTEL-02` only if all of the following are also true:

1. accepted `CF-W1-L3-PORT-01A` readiness semantics are present on the chosen base,
2. the `CF-W1-L3-INTEL-01` / `CF-W1-L3-INTEL-02` one-writer decision is recorded,
3. a backend-only implementation handoff exists for this child, and
4. the child remains inside the reserved `portfolio-intelligence` service/types/doc/test surface.

