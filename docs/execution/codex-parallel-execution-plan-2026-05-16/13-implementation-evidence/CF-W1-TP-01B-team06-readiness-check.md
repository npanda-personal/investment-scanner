# CF-W1-TP-01B Team 06 Readiness Check

Date: 2026-05-17

Owner: Team 06 Strategy / Signal / Risk

Mode: docs-only readiness check. No application source or tests changed.

## Work Item

`CF-W1-TP-01B - Backend-only Trade Plan compatibility target isolation and Data Quality hard-block behavior`

Parent: `CF-W1-TP-01A`

## Current Result

Not Ready for Team 06 implementation.

Team 06 must not edit Trade Plan application code until the Ready queue promotes this item or an implementation handoff explicitly records:

- accepted backend-only child QA scenarios,
- exact file reservations,
- no unresolved Team 06 consent blocker,
- no conflict with existing dirty docs,
- no broader API/UI/stored-row migration.

## Evidence Inspected

- `AGENTS.md`
- `98-orchestrator/runtime-bootstrap.md`
- `98-orchestrator/standing-delegation-policy.md`
- `98-orchestrator/escalation-rules.md`
- `98-orchestrator/worktree-branch-policy.md`
- `98-orchestrator/team-heartbeat-protocol.md`
- `14-team-charters/TEAM-06-strategy-signal-risk.md`
- `15-automation-prompts/AUTO-06-strategy-signal-risk.md`
- `12-ready-queue/ready-for-implementation.md`
- `12-ready-queue/blocked-by-decision.md`
- `12-ready-queue/blocked-by-shared-file.md`
- `12-ready-queue/blocked-by-upstream-dependency.md`
- `99-decision-inbox/open-decisions.md`
- `03-architecture/CF-W1-TP-01B-architecture-review.md`
- `06-contracts/CF-W1-TP-01B-backend-compatibility-dq-hard-block-contract.md`
- `08-work-packets/CF-W1-TP-01B-work-packet.md`
- `04-qa/CF-W1-TP-01A-qa-plan.md`
- `04-qa/post-decision-child-scenario-matrix-2026-05-17.md`
- `10-requirements/CF-W1-TP-01A-trade-plan-no-target-compatibility-dq-hard-block-requirement.md`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.service.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.types.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.geometry.ts`
- `backend/tests/modules/trade-plan-risk-engine/trade-plan-risk-engine.service.test.ts`
- `backend/tests/trade-plan-risk-engine.paper-readiness.test.ts`

## Readiness Criteria Check

| Criterion | Status | Evidence |
| --- | --- | --- |
| Accepted requirement | Partial | Parent `CF-W1-TP-01A` policy is accepted; child `CF-W1-TP-01B` is prepared but not Ready. |
| Architecture contract | Prepared | `CF-W1-TP-01B` architecture review and contract exist. |
| QA plan | Not complete for implementation | QA plan and scenario matrix exist as planning evidence; work packet says Team 04 must refresh/accept the backend-only child QA plan before source work. |
| Exact file reservations | Prepared but not promoted | Work packet lists allowed files after Ready promotion, but the Ready queue still says no app-code item is Ready. |
| Source/test evidence checked | Complete for readiness | Source still has target-shaped compatibility output and partially hard-blocked DQ behavior. |
| Forbidden scope excluded | Not yet proven by handoff | Work packet excludes repository, Prisma, route, frontend, Today Review, shared, package, generated, provider, startup/backfill, live-provider, paid/cloud, and telemetry files. |
| Dirty state safe for implementation | No | Current worktree contains multiple active docs changes from other teams. Team 06 can continue docs-only, but source implementation should wait for Ready promotion and isolated worktree/branch if needed. |

## Current Source Evidence

- Trade Plan generation still accepts `targetRewardRisk`, computes a target from reward/risk geometry, and populates `result.target`.
- Current model/test language still asserts target-style wording such as default 2R target rationale.
- `UNUSABLE` coverage and `ILLIQUID` liquidity are already blockers.
- `signalReadinessStatus = NOT_READY` is still warning/watch behavior, not a hard paper-readiness block.
- `eligibleForSignals=false` is stored on the Data Quality snapshot but is not clearly enforced as a hard paper-readiness blocker in the inspected service path.
- Existing paper-readiness tests still treat target/reward geometry as readiness-relevant.

## Team 06 Go / No-Go

No-Go for implementation.

Safe Team 06 work that can continue without human approval:

- read-only Trade Plan source/test evidence refresh,
- backend-only readiness and implementation handoff review,
- Team 06 outbox/heartbeat updates,
- later focused implementation only after Ready promotion.

## Internal Subagent Findings

Architecture/readiness subagent result: No-Go.

- `CF-W1-TP-01B` contract and work packet both say not Ready.
- Ready queue still has no active application-code item.
- Upstream blocker remains Team 04 child QA refresh plus Team 00 Ready promotion.
- Future source scope must stay inside the Trade Plan files reserved by the work packet.

QA subagent result: QA gaps remain.

- No focused test proves `LIMITED` DQ is not paper-ready.
- No focused test proves `eligibleForSignals=false` blocks paper-readiness.
- No focused test proves DQ blockers for stale data, unsupported scope, scope mismatch, provider gap, or use-case tier `BLOCKED` hard-block trusted readiness.
- No focused test proves `signalReadinessStatus = NOT_READY` becomes a hard block.
- No focused test proves target compatibility isolation, including that `target = null` is not the sole blocker and target-shaped fields do not support positive readiness proof.

Reconciliation note: the QA subagent reported `backend/tests/trade-plan-risk-engine.paper-readiness.test.ts` as missing, but Team 06 verified it exists locally and is clean in git status. Treat that specific subagent note as corrected.

## Expected Future Implementation Scope

After Ready promotion, Team 06 can implement within the packet boundary:

- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.service.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.types.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.md`
- `backend/tests/modules/trade-plan-risk-engine/trade-plan-risk-engine.service.test.ts`
- `backend/tests/trade-plan-risk-engine.paper-readiness.test.ts`

Optional only if the final handoff explicitly permits it:

- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.geometry.ts`

## Tests

No tests run.

Reason: no implementation handoff exists yet, and the QA plan explicitly blocks focused Trade Plan test execution until the backend-only child implementation handoff exists.

## Blockers

- Ready queue still has no active application-code item.
- `CF-W1-TP-01B` still needs Team 04 child QA acceptance and Team 00 Ready promotion.
- Current worktree has multiple unrelated active docs changes from other teams.

## Decision Packets

None opened by Team 06.

No Team 06 true consent blocker needs a new Product Owner decision at this point. The remaining blocker is readiness sequencing, not product-policy ambiguity.
