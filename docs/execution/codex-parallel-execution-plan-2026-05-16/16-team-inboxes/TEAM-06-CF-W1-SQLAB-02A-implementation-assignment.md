# Team 06 Assignment - CF-W1-SQLAB-02A

Date: 2026-05-20

Team: Team 06 - Strategy / Signal / Risk

Work item: `CF-W1-SQLAB-02A` Signal Outcome Journal Derived Preview

Status: Ready for bounded implementation

## Branch / Worktree

- Branch: `codex/team06-strategy-signal/CF-W1-SQLAB-02A`
- Worktree: `C:\work\repo\investment-scanner-worktrees\team06-CF-W1-SQLAB-02A`
- Base: accepted `CF-W1-SQLAB-01` commit `1a41d95 feat: add signal quality outcome confidence`

## Reason For Assignment

`CF-W1-SQLAB-02A` is the next independent direct investor/trader-value slice after Team 00 verified that `BT-03`, `CAL-01A`, `TP-01A`, and `DQ-02A` are already accepted and locally committed parked branches.

This child adds a no-schema, derived-not-persisted journal preview to the existing Signal Quality Lab outcome workflow. Durable journal storage remains blocked and out of scope.

## Allowed Files

- `backend/src/modules/signal-quality-lab/signal-quality-lab.service.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.types.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.md`
- `backend/tests/modules/signal-quality-lab/signal-quality-lab.service.test.ts`
- `frontend/src/features/signal-quality-lab/types.ts`
- `frontend/src/features/signal-quality-lab/components/SignalQualityLabPage.tsx`
- `frontend/tests/ui/signal-quality-lab.spec.ts`

Allowed branch-local evidence docs:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-06-CF-W1-SQLAB-02A-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-SQLAB-02A-developer-handoff.md`

## Forbidden Files

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.repository.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.controller.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.router.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.validation.ts`
- `backend/tests/modules/signal-quality-lab/signal-quality-lab.routes.test.ts`
- `backend/tests/modules/signal-quality-lab/signal-quality-lab.validation.test.ts`
- `backend/src/modules/signal-generation-engine/**`
- `backend/src/modules/signal-calibration-engine/**`
- `backend/src/modules/today-trade-review/**`
- `frontend/src/features/signal-quality-lab/api/signalQualityLabService.ts`
- backend or frontend route registries
- shared backend utilities
- shared frontend components
- package manifests
- generated files
- provider/live-market, startup/backfill, paid/cloud, broker, telemetry, or credential files

## Required Behavior

- Add additive `DERIVED_NOT_PERSISTED` journal-preview metadata only.
- Map measured aligned outcomes to favorable follow-through.
- Map measured contradicted outcomes to adverse follow-through.
- Map effectively flat measured outcomes to flat follow-through.
- Preserve pending-future-data and missing-price-history states.
- Keep existing signal-history/outcome fields backward-compatible.
- Render the preview only inside the existing Signal Quality Lab page/spec surface.
- Visible copy must be research-support language and must explicitly avoid durable-save, advice, target-price, guaranteed-outcome, broker, or automation wording.

## Required Validation

```powershell
cd backend
npm.cmd test -- signal-quality-lab.service.test.ts --runInBand
```

```powershell
cd frontend
npm.cmd run test:ui -- signal-quality-lab.spec.ts --workers=1
```

Run backend/frontend build only if the implementation or Team 00 gate later requires it.

## Next Gate

Team 04 QA verification after Team 06 developer handoff.

