# Audit: Fresh Direct-Value Gaps Beyond the Current Active Queue

Date: 2026-05-20

Mode: Read-only docs/source audit. No application source, tests, requirements, ready queue, or active board files were edited.

## Scope Inspected

- `docs/execution/codex-parallel-execution-plan-2026-05-16/00-control/active-work-board.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/00-control/team-agent-runtime-queue.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/12-ready-queue/ready-for-implementation.md`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.md`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.service.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.types.ts`
- `backend/tests/modules/signal-generation-engine/`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.md`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.types.ts`
- `backend/tests/modules/backtesting-strategy-lab/`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.md`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.service.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.types.ts`
- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.md`
- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.service.ts`
- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.types.ts`
- `backend/tests/modules/strategy-decision-engine/`

## Explicit Exclusions

I did not re-open the already active or parked direct-value workstreams named in the prompt or queue docs, including `CF-W1-HCTX-03`, `CF-W1-DQ-03`, `CF-W1-MCTX-02`, `CF-W1-STRAT-04`, `CF-W1-SQLAB-03`, `CF-W1-SIG-02`, `CF-W1-SIG-TRIGGER-02A`, `CF-W1-TP-01A`, `CF-W1-TP-01B`, `CF-W1-TP-02`, and the accepted parked branches called out in the ready queue.

I also treated the current trigger-contract lane as occupied. Any further trigger-audit or persisted-trigger work remains behind the active signal-generation implementation path and was not re-routed here.

## Top Findings

| Rank | Candidate requirement | Why it is fresh | Evidence from docs/source |
| --- | --- | --- | --- |
| 1 | `CF-W1-TP-03 - Trade Plan proof snapshot freshness labels for generated plans` | Trade Plan already stores `proofGeneratedAt`, `snapshotVersion`, and separate strategy/decision/data-quality snapshots, but the read surfaces only expose raw timestamps and blocker counts. A trader cannot tell at a glance whether a plan is current, partially refreshed, or just a historical snapshot. That is a direct trust gap distinct from the active exit/invalidation semantics work. | `trade-plan-risk-engine.service.ts:1372-1390` persists `proofGeneratedAt` and `snapshotVersion`, then returns `paperReadinessProofChain`. `trade-plan-risk-engine.types.ts` defines the proof snapshot shape but has no freshness/currentness field. `trade-plan-risk-engine.service.ts:703-909` and `:1211-1261` build blocker counts and stage summaries without any stale/current label. |
| 2 | `CF-W1-BT-04 - Backtesting run freshness and current-proof labels` | Backtesting already repairs stale PnL math and quarantines invalid aggregates, but the saved-run surface still does not tell the user whether a run is the latest proof window or just an older historical simulation. That makes a single-window backtest look more authoritative than it is, even after the existing overfit-related warnings. This is separate from the active proof-basis / overfit guardrail track. | `backtesting-strategy-lab.service.ts:52-61` returns normalized runs with no freshness label. `backtesting-strategy-lab.service.ts:707-755` repairs stale rows and marks invalid aggregates, but only with `availabilityStatus` and `calculationAudit`. `backtesting-strategy-lab.types.ts` has `availabilityStatus`, `calculationAudit`, and `generatedAt`, but no explicit current/stale proof marker. |

## What I Did Not Reopen

- I did not turn the active trigger-contract work into a new finding. The trigger/audit lane is already owned by `SIG-TRIGGER-02A` and related active work.
- I did not fold either finding into `CF-W1-STRAT-04` or `CF-W1-BT-03`. Those active tracks are about strategy evidence freshness and backtest proof-basis / overfit guardrails, not the currentness labels for Trade Plan snapshots or saved backtest runs.
- I did not promote any admin/settings/auth/subscription/notification convenience item.

## Recommended Team Handoff

1. Team 02 should draft `CF-W1-TP-03` first as a bounded direct-value requirement for Trade Plan snapshot freshness labels.
2. Team 02 should draft `CF-W1-BT-04` second as a bounded backtesting current-proof labeling requirement.
3. Team 03 should only be engaged after Team 02 confirms both can stay additive, backend-local, and free of schema/route/shared-file scope.

## Dependencies And Consent Gates

- Keep `CF-W1-TP-03` additive to the existing Trade Plan proof snapshot. Do not mix it with exit/invalidation semantics or target-removal work.
- Keep `CF-W1-BT-04` additive to the existing backtest run response. Do not mix it with walk-forward, holdout, or parameter-sensitivity implementation in the first child.
- If either follow-on later needs schema, route, shared UI, package-manifest, generated-file, provider/live-data, startup/backfill, broker, paid, or cloud changes, that becomes a separate consent gate and needs Product Owner approval.

## Parallel-Safety Notes

- These two requirement candidates are parallel-safe as docs-only drafts because they target different module boundaries.
- If either moves forward, each module should keep one writer per file and avoid mixing with the active trade-plan, strategy, or signal-trigger implementation paths.

## Product Owner Action

No immediate Product Owner decision is required to record this audit.

Product Owner approval will be required later if either candidate is promoted beyond additive local scope or starts touching consent-gated files.
