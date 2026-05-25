# CF-W2-CAL-02A Ready Promotion

Date: 2026-05-25

Owner: Team 00 - Master Orchestrator / Integration

## Work Item

`CF-W2-CAL-02A` - Signal Calibration scoped evidence-basis projection.

## Gate Verdict

Ready for bounded Team 06 implementation after Team 00 docs checkpoint and dedicated worktree creation.

## Gate Evidence

- Requirement: `10-requirements/CF-W2-CAL-02-signal-calibration-evidence-freshness-and-scope-basis-requirement.md`
- Architecture review: `03-architecture/CF-W2-CAL-02-architecture-review.md`
- Contract: `06-contracts/CF-W2-CAL-02-signal-calibration-evidence-basis-contract.md`
- Work packet: `08-work-packets/CF-W2-CAL-02-work-packet.md`
- QA plan: `04-qa/CF-W2-CAL-02-qa-plan.md`
- Team 03 architecture outbox: `17-team-outboxes/TEAM-03-architecture-factory.md`
- Team 04 QA outbox: `17-team-outboxes/TEAM-04-CF-W2-CAL-02-qa-outbox.md`
- Open decisions: none.

## Branch / Worktree

- Branch: `codex/team06-strategy-signal/CF-W2-CAL-02A`
- Worktree: `C:\work\repo\investment-scanner-worktrees\team06-CF-W2-CAL-02A`
- Required base: Team 00 docs checkpoint commit containing this Ready promotion.

## Allowed Implementation Files

- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.service.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.types.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.md`
- `backend/tests/modules/signal-calibration-engine/signal-calibration-engine.service.test.ts`
- `frontend/src/features/signal-calibration-engine/types.ts`
- `frontend/src/features/signal-calibration-engine/api/signalCalibrationEngineService.ts`
- `frontend/src/features/signal-calibration-engine/hooks/useSignalCalibrationEngine.ts`
- `frontend/src/features/signal-calibration-engine/components/SignalCalibrationEnginePage.tsx`
- `frontend/tests/ui/signal-calibration-engine.spec.ts`

Optional only if explicit HTTP payload assertions are added:

- `backend/tests/modules/signal-calibration-engine/signal-calibration-engine.routes.test.ts`

## Allowed Reporting Docs

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-06-CF-W2-CAL-02A-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W2-CAL-02A-developer-handoff.md`

## Required Behavior

- Add an additive scoped page summary for Signal Calibration using selected `region`, `assetType`, and `horizon`.
- Keep row `generatedAt` as calibration row generation time only.
- Add separate evidence-basis timing fields where truthful from existing public Signal Quality summary inputs.
- Distinguish measured, horizon-limited, and missing Signal Quality evidence basis.
- Expose `nextEvaluableDate` for horizon-limited evidence when maturity is pending.
- Fail closed when Signal Quality evidence is missing; missing evidence must not imply usable/current proof.
- Stop using first-row readiness/influence/warning/blocker proxies for page-level summary behavior.
- Keep compare/list row evidence-basis fields consistent for the same scoped/horizon evidence.
- Preserve existing calibration score math, evidence thresholds, accepted DQ semantics, route shapes, and row DTO compatibility.
- Keep all wording research-support oriented and avoid target-price, profit-target, reward/risk, `R:R`, direct advice, guaranteed outcome, or Trade Plan-first framing.

## Forbidden Scope

- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.repository.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.controller.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.router.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.validation.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.module.ts`
- `backend/src/modules/signal-calibration-engine/index.ts`
- `backend/src/api/routes.ts`
- all `backend/src/modules/signal-quality-lab/**`
- all `backend/tests/modules/signal-quality-lab/**`
- all `backend/src/modules/data-quality-engine/**`
- all `backend/src/modules/market-data-foundation/**`
- Prisma schema, migrations, generated files, or durable stored evidence-basis fields
- package manifests and lockfiles
- shared backend utilities
- shared frontend components
- `frontend/src/features/signal-calibration-engine/routes.tsx`
- `frontend/src/features/signal-calibration-engine/index.ts`
- `frontend/src/app/routes.tsx`
- provider, live, scheduler, worker, queue, startup, or backfill files
- `backend/src/server.ts`, `backend/.env.example`, `.gitignore`, root `AGENTS.md`, `docs/AGENTS.md`, and `docs/codex-agent-team-plan/**`

## Required Validation

```powershell
cd backend
npm.cmd test -- signal-calibration-engine.service.test.ts --runInBand
npm.cmd run build
```

```powershell
cd frontend
npm.cmd run build
npm.cmd run test:ui -- signal-calibration-engine.spec.ts --workers=1
```

```powershell
rg -n "target price|price target|profit target|reward/risk|R:R|buy now|sell now|must buy|must sell|guaranteed|financial advice|automated trade instruction|trade plan" backend/src/modules/signal-calibration-engine backend/tests/modules/signal-calibration-engine frontend/src/features/signal-calibration-engine frontend/tests/ui/signal-calibration-engine.spec.ts
```

## Stop Conditions

Stop and return to Team 00 if implementation needs repository/controller/router/validation/module/index edits, route-registry changes, Signal Quality source/test changes, schema/storage, generated/package/shared scope, provider/live/startup/backfill behavior, or any target/R:R/advice semantics.
