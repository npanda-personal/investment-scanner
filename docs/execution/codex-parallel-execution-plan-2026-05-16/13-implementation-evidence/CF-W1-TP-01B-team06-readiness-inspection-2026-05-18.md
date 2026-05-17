# CF-W1-TP-01B Team 06 Readiness Inspection

Date: 2026-05-18

Owner: TEAM-06 - Strategy / Signal / Risk

Mode: docs-only readiness inspection. No application source or tests changed.

## Assignment

Inspect whether `CF-W1-TP-01B` can become module-local implementation-ready after Team 01 audit consumption and Team 03/04 prep.

## Result

Team 06 result: Ready-candidate, but not Ready for Implementation until Team 00 promotes it and copies the exact implementation handoff into a Team 06 inbox.

From Team 06's module perspective, the prepared requirement, architecture review, contract, work packet, and QA plan are aligned enough for a bounded backend-only implementation handoff. No new Product Owner decision is needed if implementation stays inside the prepared compatibility/DQ hard-block scope.

## Evidence Sync

- Branch: `dev`
- Ready queue: no active application-code item is Ready for Implementation.
- Team 06 inbox: source/test edits remain forbidden until Team 00 promotion.
- Dirty worktree at inspection start: unrelated Team 02/Team 09 docs changes only.

## Prepared Artifacts Checked

- `10-requirements/CF-W1-TP-01B-trade-plan-backend-dq-hard-block-requirement.md`
- `03-architecture/CF-W1-TP-01B-architecture-review.md`
- `06-contracts/CF-W1-TP-01B-backend-compatibility-dq-hard-block-contract.md`
- `08-work-packets/CF-W1-TP-01B-work-packet.md`
- `04-qa/CF-W1-TP-01B-qa-plan.md`
- `13-implementation-evidence/CF-W1-TP-01B-team06-readiness-check.md`
- `17-team-outboxes/TEAM-03-architecture-factory.md`
- `17-team-outboxes/TEAM-04-qa-factory.md`
- `12-ready-queue/ready-for-implementation.md`
- `12-ready-queue/blocked-by-upstream-dependency.md`

## Current Source Evidence

Read-only inspection confirmed the implementation gap still matches the prepared child packet:

- `classifyPaperReadiness()` still blocks when `plan.target` is missing.
- Data Quality proof classification checks latest price, price history, coverage, liquidity, and stale blockers only.
- `PaperReadinessDataQualityProof` does not yet include `signalReadinessStatus`, `eligibleForSignals`, or required use-case tier evidence.
- `generatePlan()` still treats `signalReadinessStatus = NOT_READY` as warning/watch behavior instead of a hard paper-readiness block.
- `toDataQualitySnapshot()` stores `signalReadinessStatus` and `eligibleForSignals`, so the implementation can use existing Trade Plan-owned snapshot data without changing Data Quality Engine.
- Existing tests still assert target-rationale copy such as `Target is modeled at 2R by default.`

## Readiness Criteria

| Criterion | Team 06 assessment |
| --- | --- |
| Accepted policy basis | Pass: parent `CF-W1-TP-01A` Option B is resolved. |
| Child requirement | Prepared: requirement exists and is scoped backend-only. Team 00 still needs to promote it. |
| Architecture contract | Pass for handoff: backend-only architecture review and contract exist with exact reservations. |
| QA plan | Pass for handoff: dedicated `CF-W1-TP-01B` QA plan exists and matches the contract scenarios. |
| Exact file reservations | Pass for handoff: service/types/docs and two focused test files are listed; geometry is optional only with Architect note. |
| Shared/high-risk boundaries | Pass if handoff repeats exclusions: no Prisma, routes, repository, frontend, Today Review, shared utilities/UI, packages, generated files, providers, startup/backfill, live provider, paid/cloud, or telemetry. |
| Source evidence | Pass: current gaps align with packet and appear module-local. |
| Implementation authorization | Fail until Team 00: Ready queue remains closed and Team 06 inbox forbids source/test edits. |

## Required Implementation Handoff Content

Team 00 can make this actionable for Team 06 by issuing a new implementation inbox that includes:

- active requirement id: `CF-W1-TP-01B`;
- branch/worktree: `codex/team06-strategy-signal/CF-W1-TP-01B` and `../investment-scanner-worktrees/team06-CF-W1-TP-01B`;
- allowed files:
  - `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.service.ts`
  - `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.types.ts`
  - `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.md`
  - `backend/tests/modules/trade-plan-risk-engine/trade-plan-risk-engine.service.test.ts`
  - `backend/tests/trade-plan-risk-engine.paper-readiness.test.ts`
- optional file only with Architect note:
  - `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.geometry.ts`
- forbidden files copied from the work packet;
- focused test command from the QA plan;
- explicit confirmation that repository, Prisma, route, frontend, Today Review, shared, package, generated, provider, startup/backfill, live-provider, paid/cloud, and telemetry files remain out of scope.

## Team 06 Implementation Notes For Later

When promoted, Team 06 should keep the slice narrow:

- extend Trade Plan-owned paper-readiness proof input to include DQ snapshot fields already present on `DataQualitySnapshot`;
- hard-block or non-ready `NOT_READY`, `LIMITED`, `eligibleForSignals=false`, stale blocker, missing DQ, `UNUSABLE`, `ILLIQUID`, and supported provider/scope blocker evidence where represented;
- stop requiring `target` as trusted readiness proof;
- preserve target-shaped fields for compatibility unless a separate Product/Architect decision changes the API/storage contract;
- replace trusted output/test language that frames target-shaped fields as target price, profit target, recommendation, guarantee, or direct instruction.

## Tests

Tests not run.

Reason: docs-only readiness inspection; current Team 06 inbox forbids source/test edits and implementation validation until Ready promotion.

## Decisions

No Decision Packet opened.

No new true consent blocker was found. A Decision Packet is only needed if future implementation attempts to remove/rename target-shaped API or stored fields, change repository/schema/route/frontend/shared files, or treat `LIMITED` as paper-ready.

## Recommendation

Team 06 recommends Team 00 evaluate `CF-W1-TP-01B` for Ready promotion as the next Lane 2 implementation candidate once current dirty docs state is reconciled.
