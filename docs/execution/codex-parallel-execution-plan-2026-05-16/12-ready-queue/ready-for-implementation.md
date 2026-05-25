# Ready For Implementation

Date: 2026-05-18

## Current Ready Queue

No available application-code item is currently waiting unassigned in Ready.

2026-05-25 Team 00 Ready promotion - `CF-W2-TSC-04A-TREV-CANDIDATE-LANGUAGE`:

- `CF-W2-TSC-04A` is promoted and assigned to Team 07.
- Current gate state: Team 07 implementation complete; Team 04 QA Verification active.
- Purpose: remove target/reward, reward/risk, paper-review, and Trade Plan-first wording from touched Today Review trusted-candidate list/detail/doc/spec surfaces without changing ranking, grouping, promotion, confidence, eligibility, reward/risk thresholds, or Lite target generation.
- Branch: `codex/team07-portfolio-alerts/CF-W2-TSC-04A-TREV-CANDIDATE-LANGUAGE`.
- Worktree: `C:\work\repo\investment-scanner-worktrees\team07-CF-W2-TSC-04A`.
- Required base: accepted `CF-W1-TSC-03A-TREV-SUPPORTING-EVIDENCE` commit `09bbf9b`.
- Gate evidence:
  - Requirement: `10-requirements/CF-W2-TSC-04-today-review-no-target-candidate-language-cleanup-requirement.md`
  - Architecture review: `03-architecture/CF-W2-TSC-04-architecture-review.md`
  - Contract: `06-contracts/CF-W2-TSC-04-today-review-no-target-candidate-language-cleanup-contract.md`
  - Work packet: `08-work-packets/CF-W2-TSC-04-work-packet.md`
  - QA plan: `04-qa/CF-W2-TSC-04A-today-review-no-target-candidate-language-qa-plan.md`
  - Ready promotion: `13-implementation-evidence/CF-W2-TSC-04A-ready-promotion.md`
  - Open decisions: none.
- Allowed implementation files:
  - `backend/src/modules/today-trade-review/today-trade-review.types.ts`
  - `backend/src/modules/today-trade-review/today-trade-review.service.ts`
  - `backend/src/modules/today-trade-review/today-trade-review.md`
  - `backend/tests/modules/today-trade-review/today-trade-review.service.test.ts`
  - `frontend/src/features/today-trade-review/types.ts`
  - `frontend/src/features/today-trade-review/components/TodayReviewPage.tsx`
  - `frontend/src/features/today-trade-review/components/TodayReviewCandidateDetailPage.tsx`
  - `frontend/tests/ui/today-trade-review.spec.ts`
- Allowed reporting docs:
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-07-CF-W2-TSC-04A-outbox.md`
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W2-TSC-04A-developer-handoff.md`
- Forbidden scope:
  - Today Review repository/controller/router/validation/module/index files
  - backend/frontend route registries
  - `frontend/src/features/today-trade-review/api/**`
  - `frontend/src/features/today-trade-review/hooks/**`
  - `frontend/src/features/today-trade-review/routes.tsx`
  - Prisma schema, migrations, generated files
  - package manifests
  - shared backend utilities or shared frontend components
  - upstream/downstream module source/tests outside the reserved Today Review file set
  - `backend/src/modules/trade-plan-risk-engine/**`
  - `backend/src/modules/strategy-decision-engine/**`
  - `backend/src/modules/signal-generation-engine/**`
  - `backend/src/modules/data-quality-engine/**`
  - `backend/src/modules/signal-calibration-engine/**`
  - `backend/src/modules/backtesting-strategy-lab/**`
  - `frontend/src/features/data-quality-engine/**`
  - `frontend/src/features/pipeline-ops/**`
  - provider/live-data, startup/backfill, paid/cloud, broker, telemetry, or credentials
- Required validation:

```powershell
git merge-base --is-ancestor 09bbf9b HEAD
cd backend
npm.cmd test -- today-trade-review.service.test.ts --runInBand
npm.cmd run build
```

```powershell
cd frontend
npm.cmd run build
npm.cmd run test:ui -- today-trade-review.spec.ts --workers=1
```

```powershell
rg -n "R:R|reward/risk|target / reward|target/reward|modeled reward|paper review|trade-plan geometry|Trade-plan proof-chain|profit target|buy now|sell now|must buy|must sell|financial advice" backend/src/modules/today-trade-review backend/tests/modules/today-trade-review frontend/src/features/today-trade-review frontend/tests/ui/today-trade-review.spec.ts
```

2026-05-25 Team 00 Ready promotion - `CF-W3-MDPIPE-01B5-DQ-CONTROL-REMOVAL`:

- `CF-W3-MDPIPE-01B5` is promoted and assigned to Team 08.
- Current gate state: Accepted through implementation, QA verification, Code Review, Architect Signoff, delegated Product Owner acceptance, and scoped local commit `3f850d1 feat: remove data quality local evaluate controls`.
- Purpose: remove page-local Data Quality bulk controls now that `/pipeline-ops` owns the approved Data Quality manual command and `/data-quality` has the accepted compact pipeline status strip.
- Branch recommendation: `codex/w3-mdpipe-01b5-dq-control-removal`.
- Worktree recommendation: `C:\work\repo\investment-scanner-worktrees\team08-CF-W3-MDPIPE-01B5`.
- Gate evidence:
  - Requirement: `10-requirements/CF-W3-MDPIPE-01B3-bulk-pipeline-ops-dashboard-requirement.md`
  - UX plan: `05-ux/CF-W3-MDPIPE-01B5-01B6-pipeline-ops-control-migration-ux.md`
  - Architecture: `03-architecture/CF-W3-MDPIPE-01B5-data-quality-first-child-control-removal-architecture.md`
  - Contract: `06-contracts/CF-W3-MDPIPE-01B5-data-quality-page-control-removal-contract.md`
  - Work packet: `08-work-packets/CF-W3-MDPIPE-01B5-data-quality-first-child-work-packet.md`
  - QA plan: `04-qa/CF-W3-MDPIPE-01B5-data-quality-control-removal-qa-plan.md`
  - Ready promotion: `13-implementation-evidence/CF-W3-MDPIPE-01B5-ready-promotion.md`
  - Developer handoff: `18-integration-queue/CF-W3-MDPIPE-01B5-developer-handoff.md`
  - QA verification: `04-qa/CF-W3-MDPIPE-01B5-qa-verification.md`
  - Code review: `13-implementation-evidence/CF-W3-MDPIPE-01B5-code-review.md`
  - Architect signoff: `03-architecture/CF-W3-MDPIPE-01B5-architect-signoff.md`
  - PO acceptance packet: `09-summaries/CF-W3-MDPIPE-01B5-po-acceptance-packet.md`
  - Dependency: `CF-W3-MDPIPE-01B4` accepted and committed as `8d45ddc`.
  - Dependency: `CF-W3-MDPIPE-01B6` accepted and committed as `fb57cb0`.
  - Open decisions: none.
- Allowed implementation files:
  - `frontend/src/features/data-quality-engine/components/DataQualityEnginePage.tsx`
  - `frontend/tests/ui/data-quality-engine.spec.ts`
  - active execution docs listed in the Team 08 inbox
- Forbidden scope:
  - `frontend/src/features/data-quality-engine/components/DataQualityPipelineStatusStrip.tsx`
  - `frontend/src/features/pipeline-ops/**`
  - frontend app route/navigation files
  - shared UI/hooks/theme/context files
  - all other frontend feature pages and tests
  - all backend files/tests
  - Prisma, migrations, generated files, package manifests, provider/live, scheduler/startup, root `AGENTS.md`, `docs/AGENTS.md`, and `docs/codex-agent-team-plan/**`
- Required validation:

```powershell
cd frontend
npm.cmd run build
npm.cmd run test:ui -- pipeline-ops.spec.ts data-quality-engine.spec.ts --workers=1
```

2026-05-25 Team 00 Ready promotion - `CF-W3-MDPIPE-01C-DQ-SCHEDULED-STAGE`:

- `CF-W3-MDPIPE-01C` is promoted and assigned to Team 05.
- Current gate state: Accepted through implementation, QA verification, Code Review, Architect Signoff, delegated Product Owner acceptance, and scoped local commit `da66fa4 feat: add scheduled data quality stage`.
- Purpose: automatically trigger a ledgered Data Quality stage from the existing Market Data scheduler using only the changed instrument set from the current scheduled Market Data pass.
- Branch recommendation: `codex/w3-mdpipe-01c-data-quality-scheduled-stage`.
- Worktree recommendation: `C:\work\repo\investment-scanner-worktrees\team05-CF-W3-MDPIPE-01C`.
- Gate evidence:
  - Requirement: `10-requirements/CF-W3-MDPIPE-01-incremental-market-data-pipeline-requirement.md`
  - Architecture: `03-architecture/CF-W3-MDPIPE-01C-data-quality-scheduled-stage-architecture.md`
  - Contract: `06-contracts/CF-W3-MDPIPE-01C-data-quality-scheduled-stage-contract.md`
  - Work packet: `08-work-packets/CF-W3-MDPIPE-01C-work-packet.md`
  - QA plan: `04-qa/CF-W3-MDPIPE-01C-data-quality-scheduled-stage-qa-plan.md`
  - Ready promotion: `13-implementation-evidence/CF-W3-MDPIPE-01C-ready-promotion.md`
  - Open decisions: none.
- Allowed implementation files:
  - `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
  - `backend/src/modules/market-data-foundation/market-data-foundation.scheduler.ts`
  - `backend/src/modules/market-data-foundation/market-data-foundation.types.ts`
  - `backend/src/modules/market-data-foundation/market-data-foundation.md`
  - `backend/src/modules/pipeline-orchestration/pipeline-orchestration.types.ts`
  - `backend/src/modules/pipeline-orchestration/pipeline-orchestration.service.ts`
  - `backend/src/modules/pipeline-orchestration/pipeline-orchestration.md`
  - `backend/src/modules/pipeline-orchestration/index.ts` only if scheduled-stage exports are required
  - `backend/src/modules/data-quality-engine/data-quality-engine.types.ts`
  - `backend/src/modules/data-quality-engine/data-quality-engine.service.ts`
  - `backend/src/modules/data-quality-engine/data-quality-engine.md`
  - `backend/src/modules/data-quality-engine/index.ts` only if scheduled-stage exports are required
  - `backend/tests/modules/market-data-foundation/market-data.scheduler.test.ts`
  - `backend/tests/modules/market-data-foundation/market-data.service.test.ts`
  - `backend/tests/modules/pipeline-orchestration/pipeline-orchestration.service.test.ts`
  - `backend/tests/modules/data-quality-engine/data-quality-engine.service.test.ts`
  - active execution docs listed in the Team 05 inbox
- Forbidden scope:
  - `backend/src/server.ts`
  - route registries
  - Prisma/schema/migrations/generated files
  - package manifests and lockfiles
  - all frontend files/tests
  - provider/live calls
  - startup DQ fanout
  - full-universe DQ rescans from empty changed sets
  - downstream module fanout
  - shared backend utilities or shared UI
- Required validation:

```powershell
cd backend
npm.cmd test -- market-data.scheduler.test.ts market-data.service.test.ts pipeline-orchestration.service.test.ts data-quality-engine.service.test.ts --runInBand
npm.cmd run build
npm.cmd test -- pipeline-orchestration.validation.test.ts pipeline-orchestration.controller.test.ts pipeline-orchestration.routes.test.ts pipeline-orchestration.service.test.ts --runInBand
npm.cmd run build
```

2026-05-25 Team 00 Ready promotion - `CF-W3-MDPIPE-01B6-DQ-COMPACT-PIPELINE-INDICATOR`:

- `CF-W3-MDPIPE-01B6` is promoted and assigned to Team 08.
- Current gate state: Accepted through implementation, QA rerun, Code Review, Architect Signoff, delegated Product Owner acceptance, and scoped local commit `fb57cb0 feat: add data quality pipeline status strip`.
- Purpose: add a compact durable backend pipeline progress indicator on `/data-quality` while leaving full bulk operation controls centralized in the Bulk Pipeline Dashboard for Monitoring and OPS.
- Branch recommendation: `codex/w3-mdpipe-01b6-dq-compact-indicator`.
- Worktree recommendation: `C:\work\repo\investment-scanner-worktrees\team08-CF-W3-MDPIPE-01B6`.
- Gate evidence:
  - Requirement: `10-requirements/CF-W3-MDPIPE-01B3-bulk-pipeline-ops-dashboard-requirement.md`
  - Architecture: `03-architecture/CF-W3-MDPIPE-01B5-01B6-control-migration-progress-indicators-architecture.md`
  - Contract: `06-contracts/CF-W3-MDPIPE-01B6-compact-progress-indicator-contract.md`
  - Work packet: `08-work-packets/CF-W3-MDPIPE-01B6-first-compact-indicator-work-packet.md`
  - QA plan: `04-qa/CF-W3-MDPIPE-01B5-01B6-control-migration-progress-indicators-qa-plan.md`
  - Ready promotion: `13-implementation-evidence/CF-W3-MDPIPE-01B6-ready-promotion.md`
  - Dependency: `CF-W3-MDPIPE-01B4` accepted and committed as `8d45ddc`.
  - Open decisions: none.
- Allowed implementation files:
  - `frontend/src/features/data-quality-engine/components/DataQualityEnginePage.tsx`
  - `frontend/src/features/data-quality-engine/components/DataQualityPipelineStatusStrip.tsx` (new)
  - `frontend/tests/ui/data-quality-engine.spec.ts`
  - active execution docs listed in the Team 08 inbox
- Forbidden scope:
  - all backend source/tests
  - `frontend/src/features/pipeline-ops/**`
  - frontend app route/navigation files
  - shared UI/hooks/theme/context files
  - all other feature pages and tests
  - Prisma, migrations, generated files, package manifests, provider/live, scheduler/startup, root `AGENTS.md`, `docs/AGENTS.md`, and `docs/codex-agent-team-plan/**`
- Required validation:

```powershell
cd frontend
npm.cmd run build
npm.cmd run test:ui -- pipeline-ops.spec.ts data-quality-engine.spec.ts --workers=1
```

2026-05-25 Team 00 Ready promotion - `CF-W3-MDPIPE-01B4-PIPELINE-COMMAND-API`:

- `CF-W3-MDPIPE-01B4` is promoted as the first bounded Pipeline Ops command slice.
- Current gate state: accepted through implementation, QA rerun, Code Review, Architect Signoff, delegated Product Owner acceptance, and scoped local commit `8d45ddc feat: add pipeline command api`.
- Purpose: enable only `DATA_QUALITY_EVALUATE_SCOPE` from Pipeline Ops while keeping all other commands disabled/deferred/forbidden.
- Branch recommendation: `codex/w3-mdpipe-01b4-pipeline-command-api`.
- Worktree recommendation: `C:\work\repo\investment-scanner-worktrees\team05-CF-W3-MDPIPE-01B4`.
- Gate evidence:
  - Requirement: `10-requirements/CF-W3-MDPIPE-01B4-command-api-manual-trigger-safety-requirement.md`
  - Architecture: `03-architecture/CF-W3-MDPIPE-01B4-pipeline-command-api-architecture.md`
  - Contract: `06-contracts/CF-W3-MDPIPE-01B4-pipeline-command-api-contract.md`
  - Work packet: `08-work-packets/CF-W3-MDPIPE-01B4-work-packet.md`
  - QA plan: `04-qa/CF-W3-MDPIPE-01B4-command-api-qa-plan.md`
  - Open decisions: none.
- Allowed implementation files:
  - `backend/src/modules/pipeline-orchestration/pipeline-orchestration.types.ts`
  - `backend/src/modules/pipeline-orchestration/pipeline-orchestration.validation.ts`
  - `backend/src/modules/pipeline-orchestration/pipeline-orchestration.service.ts`
  - `backend/src/modules/pipeline-orchestration/pipeline-orchestration.controller.ts`
  - `backend/src/modules/pipeline-orchestration/pipeline-orchestration.router.ts`
  - `backend/src/modules/pipeline-orchestration/pipeline-orchestration.module.ts` only if dependency injection is required
  - `backend/src/modules/pipeline-orchestration/index.ts` only if public command exports are required
  - `backend/src/modules/pipeline-orchestration/pipeline-orchestration.md`
  - `backend/tests/modules/pipeline-orchestration/pipeline-orchestration.validation.test.ts`
  - `backend/tests/modules/pipeline-orchestration/pipeline-orchestration.service.test.ts`
  - `backend/tests/modules/pipeline-orchestration/pipeline-orchestration.controller.test.ts`
  - `backend/tests/modules/pipeline-orchestration/pipeline-orchestration.routes.test.ts`
  - `frontend/src/features/pipeline-ops/types.ts`
  - `frontend/src/features/pipeline-ops/api/pipelineOpsService.ts`
  - `frontend/src/features/pipeline-ops/hooks/usePipelineStatus.ts` only if command-trigger refresh requires it
  - `frontend/src/features/pipeline-ops/components/PipelineOpsPage.tsx`
  - `frontend/src/features/pipeline-ops/components/PipelineOpsTable.tsx`
  - `frontend/tests/ui/pipeline-ops.spec.ts`
- Forbidden scope:
  - `backend/src/api/routes.ts`
  - `backend/src/server.ts`
  - Prisma schema, migrations, generated files, package manifests, lockfiles
  - Market Data and Data Quality source/tests
  - all downstream module source/tests outside `pipeline-orchestration`
  - frontend app route/navigation files
  - existing feature pages outside `pipeline-ops`
  - shared frontend components and shared backend utilities
  - auth/subscription source
  - scheduler/startup/backfill files
  - provider/live data behavior, cloud, telemetry, broker, credentials
- Required validation:

```powershell
cd backend
npm.cmd test -- pipeline-orchestration.validation.test.ts pipeline-orchestration.service.test.ts pipeline-orchestration.controller.test.ts pipeline-orchestration.routes.test.ts --runInBand
npm.cmd run build
```

```powershell
cd frontend
npm.cmd run build
npm.cmd run test:ui -- pipeline-ops.spec.ts --workers=1
```

2026-05-25 Team 00 implementation - `CF-W3-MDPIPE-01B3-S1-PIPELINE-OPS-DASHBOARD`:

- `CF-W3-MDPIPE-01B3-S1` was promoted and implemented as the first frontend-only Bulk Pipeline Monitoring and Ops dashboard after Team 03 architecture and Team 08 UX mapping.
- Current gate state: developer validation passed; scoped commit pending.
- Purpose: centralize durable pipeline monitoring on `/pipeline-ops` so users can see backend pipeline status/progress after navigation and avoid scattered bulk-operation controls.
- Gate evidence:
  - Requirement: `10-requirements/CF-W3-MDPIPE-01B3-bulk-pipeline-ops-dashboard-requirement.md`
  - Architecture: `03-architecture/CF-W3-MDPIPE-01B3-S1-pipeline-ops-dashboard-architecture.md`
  - QA plan/evidence: `04-qa/CF-W3-MDPIPE-01B3-S1-pipeline-ops-dashboard-qa-plan.md`
  - Implementation evidence: `13-implementation-evidence/CF-W3-MDPIPE-01B3-S1-pipeline-ops-dashboard-evidence.md`
- Allowed implementation files used:
  - `frontend/src/features/pipeline-ops/**`
  - `frontend/src/app/routes.tsx`
  - `frontend/src/app/navigationMetadata.tsx`
  - `frontend/tests/ui/pipeline-ops.spec.ts`
  - active execution docs
- Forbidden scope preserved:
  - no backend source/tests
  - no Prisma schema/migration
  - no package manifests
  - no shared UI edits
  - no existing feature-page control removal
  - no provider/live, startup/backfill, scheduler fanout, or manual command execution
- Validation passed:

```powershell
cd frontend
npm.cmd run build
npm.cmd run test:ui -- pipeline-ops.spec.ts --workers=1
```

2026-05-25 Team 00 implementation - `CF-W3-MDPIPE-01B2-PIPELINE-STATUS-API`:

- `CF-W3-MDPIPE-01B2` was promoted and implemented as the read-only pipeline status API after Team 03 architecture acceptance and Team 04 QA planning.
- Current gate state: developer validation passed; scoped commit pending.
- Purpose: expose active/latest pipeline run and stage progress from durable ledger rows so UI can rehydrate progress after navigation without triggering providers or recomputation.
- Gate evidence:
  - Requirement: `10-requirements/CF-W3-MDPIPE-01B2-pipeline-status-api-requirement.md`
  - Architecture: `03-architecture/CF-W3-MDPIPE-01B2-pipeline-status-api-architecture.md`
  - QA plan/evidence: `04-qa/CF-W3-MDPIPE-01B2-pipeline-status-api-qa-plan.md`
  - Implementation evidence: `13-implementation-evidence/CF-W3-MDPIPE-01B2-implementation-evidence.md`
- Allowed implementation files used:
  - `backend/src/api/routes.ts`
  - `backend/src/modules/pipeline-orchestration/**`
  - `backend/tests/modules/pipeline-orchestration/**`
  - active execution docs
- Forbidden scope preserved:
  - no Prisma schema/migration
  - no `backend/src/server.ts`
  - no Market Data scheduler edits
  - no downstream module source/tests
  - no frontend files
  - no package manifests
  - no provider/live, startup/backfill, or fanout changes
- Validation passed:

```powershell
cd backend
npm.cmd test -- pipeline-orchestration --runInBand
npm.cmd run build
```

2026-05-25 Team 00 implementation - `CF-W3-MDPIPE-01B1-DURABLE-PIPELINE-LEDGER-FOUNDATION`:

- `CF-W3-MDPIPE-01B1` was promoted and implemented as the durable pipeline ledger foundation after Product Owner direction and Team 03 architecture acceptance.
- Current gate state: developer validation passed; scoped commit pending.
- Purpose: persist pipeline run/stage status, mid-run progress, leases, idempotency keys, cache metadata, and fingerprints so automated pipelines and UI progress can survive navigation and later run incrementally.
- Gate evidence:
  - Requirement: `10-requirements/CF-W3-MDPIPE-01B1-durable-pipeline-ledger-requirement.md`
  - Architecture: `03-architecture/CF-W3-MDPIPE-01B1-durable-pipeline-ledger-architecture.md`
  - QA plan/evidence: `04-qa/CF-W3-MDPIPE-01B1-durable-pipeline-ledger-qa-plan.md`
  - Implementation evidence: `13-implementation-evidence/CF-W3-MDPIPE-01B1-implementation-evidence.md`
  - Handoff: `18-integration-queue/CF-W3-MDPIPE-01B1-developer-handoff.md`
- Allowed implementation files used:
  - `backend/prisma/schema.prisma`
  - `backend/prisma/migrations/202605250001_pipeline_orchestration_ledger/migration.sql`
  - `backend/src/modules/pipeline-orchestration/**`
  - `backend/tests/modules/pipeline-orchestration/**`
  - active execution docs
- Forbidden scope preserved:
  - no `backend/src/server.ts`
  - no `backend/src/api/routes.ts`
  - no Market Data scheduler edits
  - no downstream module source/tests
  - no frontend files
  - no package manifests
  - no provider/live, startup/backfill, or broad fanout changes
- Validation passed:

```powershell
cd backend
npx.cmd prisma generate
npm.cmd test -- pipeline-orchestration --runInBand
npm.cmd run build
```

2026-05-25 Team 00 Ready promotion - `CF-W3-MDPIPE-01A-MDF-OFFICIAL-EOD`:

- `CF-W3-MDPIPE-01A-MDF-OFFICIAL-EOD` is promoted and assigned to Team 05 as the first bounded Market Data Foundation implementation slice for the incremental data-load redesign.
- Current gate state: accepted through Team 04 QA rerun, Team 10 re-review, Team 03 Architect re-signoff, Team 00 delegated PO acceptance, and scoped local commit `b0c1ab7 feat: add official eod bulk market data sync`.
- Purpose: replace the current broad-universe latest-candle dependence on per-symbol provider calls with one official NSE EOD bulk-file attempt for scheduled `IN/STOCK` latest-candle catch-up.
- Parallel-safety decision: no other active writer owns Market Data Foundation files in this shared workspace; Team 00 has assigned one Team 05 worker for this reservation.
- Branch/worktree: shared `dev` workspace for this hot-path fix, with one writer and strict staged-scope checks before any commit.
- Gate evidence:
  - Requirement: `10-requirements/CF-W3-MDPIPE-01-incremental-market-data-pipeline-requirement.md`
  - Architecture: `03-architecture/CF-W3-MDPIPE-01-incremental-market-data-pipeline-architecture.md`
  - QA plan: `04-qa/CF-W3-MDPIPE-01A-MDF-OFFICIAL-EOD-qa-plan.md`
  - Ready promotion: `13-implementation-evidence/CF-W3-MDPIPE-01A-ready-promotion.md`
  - Open decisions: none.
- Allowed implementation files:
  - `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
  - `backend/src/modules/market-data-foundation/market-data-foundation.repository.ts`
  - `backend/src/modules/market-data-foundation/market-data-foundation.types.ts`
  - `backend/src/modules/market-data-foundation/market-data-foundation.md`
  - `backend/tests/modules/market-data-foundation/market-data.service.test.ts`
  - `backend/tests/modules/market-data-foundation/market-data.repository.test.ts`
  - `backend/tests/modules/market-data-foundation/market-data.scheduler.test.ts`
- Allowed reporting docs:
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-05-CF-W3-MDPIPE-01A-outbox.md`
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W3-MDPIPE-01A-developer-handoff.md`
- Forbidden scope:
  - Prisma schema or migrations
  - backend/frontend route registries
  - shared backend utilities or shared UI
  - package manifests
  - generated files
  - frontend source/tests
  - downstream module source/tests
  - provider credentials, live provider execution, startup/backfill expansion, paid/cloud, broker, telemetry, or durable pipeline ledger
- Required validation:

```powershell
cd backend
npm.cmd test -- market-data.service.test.ts market-data.repository.test.ts market-data.scheduler.test.ts --runInBand
npm.cmd run build
```

- Stop if implementation requires any forbidden file, durable source-file cache schema, new route, new package, broad downstream orchestration, live provider execution, or startup/backfill behavior changes beyond the existing scheduler path.
- Rework completed: official NSE bulk matching requires explicit NSE / `.NS` evidence and skips BSE / `.BO` / ambiguous instruments to fallback.

2026-05-24 Team 00 closure update:

- `CF-W1-TSC-03A-TREV-SUPPORTING-EVIDENCE` completed all gates and was locally committed on its Team 07 branch as `09bbf9b feat: add today review supporting trust evidence`.
- `CF-W2-BT-05` completed all gates and was locally committed on its Team 06 branch as `f645d0b feat: add backtesting rule evidence projection`.
- No unassigned Ready implementation item is waiting after those closures.
- Next Today Review work (`CF-W2-TSC-04`, `CF-W2-TSC-05`) remains planning/architecture prep until Team 00 promotes a bounded Ready slice.

2026-05-24 Team 00 Ready promotion - `CF-W2-BT-05`:

- `CF-W2-BT-05` is promoted and assigned to Team 06 as a bounded backend-only Backtesting Strategy Lab implementation slice.
- Purpose: add documented-rule exit / invalidation supporting evidence separated from optional take-profit simulation assumptions.
- Parallel-safety decision: safe to run while Team 07 owns Today Review `TSC-03A`, because the writer set is isolated to Backtesting Strategy Lab backend files.
- Branch recommendation: `codex/team06-strategy-signal/CF-W2-BT-05`.
- Worktree recommendation: `C:\work\repo\investment-scanner-worktrees\team06-CF-W2-BT-05`.
- Required base: accepted `CF-W1-BT-04` commit `2bd794f feat: add backtesting proof freshness labels`, not plain `dev`.
- Gate evidence:
  - Requirement: `10-requirements/CF-W2-BT-05-backtesting-rule-exit-invalidation-evidence-requirement.md`
  - Architecture review: `03-architecture/CF-W2-BT-05-architecture-review.md`
  - Contract: `06-contracts/CF-W2-BT-05-backtesting-rule-exit-invalidation-evidence-contract.md`
  - Work packet: `08-work-packets/CF-W2-BT-05-work-packet.md`
  - QA plan: `04-qa/CF-W2-BT-05-qa-plan.md`
  - Open decisions: none.
- Allowed implementation files:
  - `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.ts`
  - `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.types.ts`
  - `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.md`
  - `backend/tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.test.ts`
- Allowed reporting docs:
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-06-CF-W2-BT-05-outbox.md`
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W2-BT-05-developer-handoff.md`
- Forbidden scope:
  - Backtesting repository/controller/router/validation/module/index files
  - backtesting route/validation tests outside the focused service test
  - Strategy Framework, Signal Quality Lab, Strategy Decision Engine, Trade Plan Risk Engine, Market Data, Today Review, or other upstream/downstream source/tests
  - all frontend files and frontend tests
  - Prisma schema or migrations
  - backend or frontend route registries
  - shared backend utilities or shared frontend components
  - package manifests
  - generated files
  - provider/live-data, startup/backfill, paid/cloud, broker, telemetry, or credential files
  - target-price, profit-target, reward/risk, `R:R`, Trade Plan-first, buy/sell, guarantee, or financial-advice wording
- Required validation:

```powershell
cd backend
npm.cmd test -- backtesting-strategy-lab.service.test.ts --runInBand
npm.cmd run build
```

- Required language guard:

```powershell
rg -n "target price|price target|profit target|reward/risk|R:R|buy now|sell now|must buy|must sell|guaranteed|financial advice|automated trade instruction|target evidence" backend/src/modules/backtesting-strategy-lab backend/tests/modules/backtesting-strategy-lab
```

- Stop if implementation requires repository, route/controller, validation/module/index, frontend, Today Review, Strategy Framework, Signal Quality, Strategy Decision, Trade Plan, Market Data, Prisma/schema, shared, package, generated, provider/live, startup/backfill, or target/R:R/profit-target/advice scope.

2026-05-24 Team 00 Ready promotion - `CF-W2-SIG-01A`:

- `CF-W2-SIG-01A` is promoted and assigned to Team 06 as a bounded Signal Generation run-path Data Quality fail-closed implementation/validation slice.
- Purpose: ensure Signal Generation run requests default to DQ filtering and fail closed when DQ evidence is missing or DQ filtering is unavailable.
- Routing note: current `dev` already appears to contain prior run-path DQ enforcement behavior. Team 06 must inspect current source first, implement only proved gaps inside the exact reservation, and otherwise produce a no-app-change developer handoff with focused validation evidence.
- Parallel-safety decision: safe to run after `CF-W1-MD-05` and `CF-W1-TSC-02A` branch commits because the Signal Generation writer set is disjoint from Market Data and Today Review.
- Branch recommendation: `codex/team06-strategy-signal/CF-W2-SIG-01A`.
- Worktree recommendation: `C:\work\repo\investment-scanner-worktrees\team06-CF-W2-SIG-01A`.
- Base recommendation: current `dev` at Team 00 docs checkpoint.
- Gate evidence:
  - Requirement: `10-requirements/CF-W2-SIG-01A-signal-generation-run-path-dq-fail-closed-requirement.md`
  - Architecture review: `03-architecture/CF-W2-SIG-01A-architecture-review.md`
  - Contract: `06-contracts/CF-W2-SIG-01A-signal-generation-run-path-dq-fail-closed-contract.md`
  - Work packet: `08-work-packets/CF-W2-SIG-01A-work-packet.md`
  - QA plan: `04-qa/CF-W2-SIG-01A-qa-plan.md`
  - Open decisions: none.
- Allowed implementation files:
  - `backend/src/modules/signal-generation-engine/signal-generation-engine.service.ts`
  - `backend/src/modules/signal-generation-engine/signal-generation-engine.validation.ts`
  - `backend/tests/modules/signal-generation-engine/signal-generation-engine.service.test.ts`
  - `backend/tests/modules/signal-generation-engine/signal-generation-engine.validation.test.ts`
  - `backend/tests/modules/signal-generation-engine/signal-generation-dq-enforcement.invariants.test.ts`
- Allowed reporting docs:
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-06-CF-W2-SIG-01A-outbox.md`
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W2-SIG-01A-developer-handoff.md`
- Forbidden scope:
  - Data Quality Engine source/tests
  - Market Data source/tests
  - Signal Generation types/repository/controller/router/module/index files unless Team 00 reopens the reservation
  - Prisma schema or migrations
  - backend or frontend route registries
  - shared backend utilities or shared frontend components
  - package manifests
  - generated/common fixtures
  - all frontend files
  - provider/live-data, Angel One, broker, paid service, startup/backfill, telemetry, credential, or UI files
  - target price, synthetic target, R:R, Trade Plan-first, buy/sell, guarantee, or financial-advice wording
- Required validation:

```powershell
cd backend
npm.cmd test -- signal-generation-engine.service.test.ts signal-generation-engine.validation.test.ts signal-generation-dq-enforcement.invariants.test.ts --runInBand
npm.cmd run build
```

- Required language guard:

```powershell
rg -n "targetPrice|profitTarget|priceTarget|rewardRiskRatio|R:R|buy now|sell now|guaranteed|financial advice" backend/src/modules/signal-generation-engine backend/tests/modules/signal-generation-engine
```

- Stop if implementation requires any forbidden file, a new Data Quality Engine public contract, response type changes, route/schema/shared/package/frontend/provider/live/startup/backfill changes, or if another active writer owns a reserved Signal Generation file.

2026-05-24 Team 00 Ready promotion - `CF-W1-TSC-03A-TREV-SUPPORTING-EVIDENCE`:

- `CF-W1-TSC-03A-TREV-SUPPORTING-EVIDENCE` is promoted and assigned to Team 07 as a bounded Today Review supporting-trust evidence implementation slice.
- Purpose: add a compact supporting evidence chain for Data Quality, calibration readiness, and backtesting proof-currentness on existing Today Review candidate list/detail surfaces without a new score, ranking formula, target, R:R, or advice framing.
- Sequencing decision: the prior Today Review writer set is cleared by accepted Team 07 branch commit `34c9993 feat: add today review active signal health`.
- Required base: accepted `CF-W1-TSC-02A-TREV-HEALTH` commit `34c9993`, not plain `dev`.
- Base decision: implement with explicit unavailable/missing states for absent `DQ-03`, `CAL-01A`, or `BT-04` fields. Do not recreate Data Quality residual logic, calibration trust logic, or backtesting proof-currentness logic inside Today Review.
- Branch recommendation: `codex/team07-portfolio-alerts/CF-W1-TSC-03A-TREV-SUPPORTING-EVIDENCE`.
- Worktree: `C:\work\repo\investment-scanner-worktrees\t7-tsc03a` (shortened from the recommended name because Windows path length blocked checkout of long requirement filenames).
- Gate evidence:
  - Requirement: `10-requirements/CF-W1-TSC-03-today-review-supporting-trust-evidence-requirement.md`
  - Architecture review: `03-architecture/CF-W1-TSC-03-architecture-review.md`
  - Contract: `06-contracts/CF-W1-TSC-03-supporting-trust-evidence-contract.md`
  - Work packet: `08-work-packets/CF-W1-TSC-03-work-packet.md`
  - QA plan: `04-qa/CF-W1-TSC-03A-TREV-SUPPORTING-EVIDENCE-qa-plan.md`
  - Open decisions: none.
- Allowed implementation files:
  - `backend/src/modules/today-trade-review/today-trade-review.types.ts`
  - `backend/src/modules/today-trade-review/today-trade-review.service.ts`
  - `backend/src/modules/today-trade-review/today-trade-review.md`
  - `backend/tests/modules/today-trade-review/today-trade-review.service.test.ts`
  - `frontend/src/features/today-trade-review/types.ts`
  - `frontend/src/features/today-trade-review/components/TodayReviewPage.tsx`
  - `frontend/src/features/today-trade-review/components/TodayReviewCandidateDetailPage.tsx`
  - `frontend/tests/ui/today-trade-review.spec.ts`
- Allowed reporting docs:
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-07-CF-W1-TSC-03A-TREV-SUPPORTING-EVIDENCE-outbox.md`
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-TSC-03A-TREV-SUPPORTING-EVIDENCE-developer-handoff.md`
- Forbidden scope:
  - Today Review repository/controller/router/validation/module/index files
  - `frontend/src/features/today-trade-review/api/**`
  - `frontend/src/features/today-trade-review/hooks/**`
  - `frontend/src/features/today-trade-review/routes.tsx`
  - backend/frontend route registries
  - Prisma schema or migrations
  - generated files
  - package manifests
  - shared backend utilities or shared frontend components
  - Data Quality, Signal Calibration, Backtesting, Signal Generation, Strategy Decision, Trade Plan, or other upstream/downstream source/tests
  - provider/live-data, startup/backfill, paid/cloud, broker, telemetry, or credential files
  - new composite score, ranking engine, health-state rewrite, target/R:R, Trade Plan-first, buy/sell, guarantee, or financial-advice language
- Required validation:

```powershell
git merge-base --is-ancestor 34c9993 HEAD
cd backend
npm.cmd test -- today-trade-review.service.test.ts --runInBand
npm.cmd run build
```

```powershell
cd frontend
npm.cmd run build
npm.cmd run test:ui -- today-trade-review.spec.ts --workers=1
```

- Required language guard:

```powershell
rg -n "R:R|reward/risk|profit target|price target|target price|target / reward|buy now|sell now|must buy|must sell|guaranteed|financial advice|Trade Plan|trade-plan" backend/src/modules/today-trade-review backend/tests/modules/today-trade-review frontend/src/features/today-trade-review frontend/tests/ui/today-trade-review.spec.ts
```

- Stop if implementation requires upstream module edits, recreated DQ/calibration/backtesting trust logic, broad UI or route changes, unavailable evidence silently upgrading a candidate, or any forbidden file.

2026-05-24 Team 00 status update:

- `CF-W1-TSC-01A-TREV` completed QA, Team 10 review, Architect Signoff, delegated PO acceptance, staged-scope verification, and scoped local branch commit `9fbc989 feat: add trusted signal candidates to today review`.
- `CF-W1-BT-04` completed Team 06 implementation, Team 04 QA, Team 10 review, Architect Signoff, delegated PO acceptance, staged-scope verification, and scoped local Team 06 branch commit `2bd794f feat: add backtesting proof freshness labels`.
- `CF-W1-MD-05` completed all gates and is committed on Team 05 branch as `93c29e2 feat: add catalog sync freshness explainability`.
- `CF-W1-TSC-02A-TREV-HEALTH` completed all gates and is committed on Team 07 branch as `34c9993 feat: add today review active signal health`.
- `CF-W2-SIG-01A` completed all gates and is committed on Team 06 branch as `24f938b docs: accept signal dq fail-closed validation`.
- `CF-W1-TSC-03A-TREV-SUPPORTING-EVIDENCE` is promoted and assigned to Team 07, stacked on accepted `34c9993`.
- `CF-W1-DQ-02B` is blocked from implementation pending explicit DQE read-side/public-contract reopening; no source reservation is active.

2026-05-24 Team 00 queue correction:

- `CF-W1-SIG-LATEST-01` is already accepted from 2026-05-17 and must not be treated as a current Ready candidate.
- No unassigned application-code item is waiting in Ready.
- `CF-W2-TSC-04` is planning-only and must not start until active Today Review writer `CF-W1-TSC-03A-TREV-SUPPORTING-EVIDENCE` releases the shared file set.
- `CF-W2-BT-05` is eligible for Team 03 architecture prep, not implementation.

2026-05-24 Team 00 Ready promotion - `CF-W1-MD-05`:

- `CF-W1-MD-05` is promoted and assigned to Team 05 as a bounded Market Data Foundation implementation slice.
- Purpose: fix catalog sync freshness explainability so stale latest-session or stale-instrument catch-up states do not read as terminal "no new data".
- Parallel-safety decision: safe to run in parallel with `CF-W1-TSC-02A-TREV-HEALTH` because file reservations are disjoint (`market-data-foundation` vs `today-trade-review`).
- Branch recommendation: `codex/team05-market-data/CF-W1-MD-05`.
- Worktree recommendation: `C:\work\repo\investment-scanner-worktrees\team05-CF-W1-MD-05`.
- Base recommendation: current local `dev` after Team 00 promotion docs.
- Gate evidence:
  - Requirement: `10-requirements/CF-W1-MD-05-catalog-sync-latest-session-freshness-requirement.md`
  - Architecture review: `03-architecture/CF-W1-MD-05-architecture-review.md`
  - Contract: `06-contracts/CF-W1-MD-05-catalog-sync-freshness-contract.md`
  - Work packet: `08-work-packets/CF-W1-MD-05-work-packet.md`
  - QA plan: `04-qa/CF-W1-MD-05-qa-plan.md`
  - Open decisions: none.
- Allowed implementation files:
  - `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
  - `backend/src/modules/market-data-foundation/market-data-foundation.types.ts`
  - `backend/src/modules/market-data-foundation/market-data-foundation.md`
  - `backend/tests/modules/market-data-foundation/market-data.service.test.ts`
  - `frontend/src/features/market-data-foundation/types.ts`
  - `frontend/src/features/market-data-foundation/components/MarketDataFoundationPage.tsx`
  - `frontend/tests/ui/market-data-foundation.spec.ts`
- Allowed reporting docs:
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-05-CF-W1-MD-05-outbox.md`
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-MD-05-developer-handoff.md`
- Forbidden scope:
  - Prisma schema or migrations
  - generated files
  - `backend/src/modules/market-data-foundation/market-data-foundation.repository.ts`
  - `backend/src/modules/market-data-foundation/market-data-foundation.controller.ts`
  - `backend/src/modules/market-data-foundation/market-data-foundation.router.ts`
  - `backend/src/modules/market-data-foundation/market-data-foundation.validation.ts`
  - `backend/src/modules/market-data-foundation/market-data-foundation.provider.ts`
  - `backend/src/modules/market-data-foundation/market-data-foundation.scheduler.ts`
  - `backend/src/modules/market-data-foundation/market-data-foundation.worker.ts`
  - `backend/src/modules/market-data-foundation/market-data-foundation.queue.ts`
  - `backend/src/modules/market-data-foundation/market-data-foundation.market-session.ts`
  - `backend/src/modules/market-data-foundation/market-data-foundation.universe.ts`
  - `backend/src/modules/market-data-foundation/index.ts`
  - `frontend/src/features/market-data-foundation/api/marketDataFoundationService.ts`
  - `frontend/src/features/market-data-foundation/components/InstrumentDetailPage.tsx`
  - `frontend/src/features/market-data-foundation/components/MarketDataStatusPanel.tsx`
  - `frontend/src/features/market-data-foundation/routes.tsx`
  - `frontend/tests/ui/market-data-foundation-instrument.spec.ts`
  - backend and frontend route registries
  - shared backend utilities or shared frontend components
  - package manifests
  - provider/live-data, startup/backfill, paid/cloud, broker, telemetry, or credential files
- Required validation:

```powershell
cd backend
npm.cmd test -- market-data.service.test.ts --runInBand
npm.cmd run build
```

```powershell
cd frontend
npm.cmd run build
npm.cmd run test:ui -- market-data-foundation.spec.ts --workers=1
```

- Stop if implementation requires repository edits for unsupported exclusion counts, controller/router/route-registry changes, schema/migration/generated changes, shared UI/backend utility changes, provider/startup/backfill changes, Instrument Detail page scope expansion, or broad live-provider behavior.

2026-05-24 Team 00 Ready promotion - `CF-W1-TSC-02A-TREV-HEALTH`:

- `CF-W1-TSC-02A-TREV-HEALTH` is promoted and assigned to Team 07 as an independent Today Review active-signal-health implementation slice.
- Purpose: add active signal health states backed by documented rule evidence without Trade Plan, target, R:R, or advice framing.
- Parallel-safety decision: safe to run in parallel with `CF-W1-MD-05` because file reservations are disjoint.
- Required base: accepted Team 07 branch commit `9fbc989 feat: add trusted signal candidates to today review`.
- Branch recommendation: `codex/team07-portfolio-alerts/CF-W1-TSC-02A-TREV-HEALTH`.
- Worktree recommendation: `C:\work\repo\investment-scanner-worktrees\team07-CF-W1-TSC-02A-TREV-HEALTH`.
- Gate evidence:
  - Requirement: `10-requirements/CF-W1-TSC-02-active-signal-health-rule-evidence-requirement.md`
  - Architecture review: `03-architecture/CF-W1-TSC-02-architecture-review.md`
  - Contract: `06-contracts/CF-W1-TSC-02-active-signal-health-rule-evidence-contract.md`
  - Work packet: `08-work-packets/CF-W1-TSC-02-work-packet.md`
  - QA plan: `04-qa/CF-W1-TSC-02A-TREV-HEALTH-qa-plan.md`
  - Open decisions: none.
- Allowed implementation files:
  - `backend/src/modules/today-trade-review/today-trade-review.types.ts`
  - `backend/src/modules/today-trade-review/today-trade-review.service.ts`
  - `backend/src/modules/today-trade-review/today-trade-review.md`
  - `backend/tests/modules/today-trade-review/today-trade-review.service.test.ts`
  - `frontend/src/features/today-trade-review/types.ts`
  - `frontend/src/features/today-trade-review/components/TodayReviewPage.tsx`
  - `frontend/src/features/today-trade-review/components/TodayReviewCandidateDetailPage.tsx`
  - `frontend/tests/ui/today-trade-review.spec.ts`
- Allowed reporting docs:
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-07-CF-W1-TSC-02A-TREV-HEALTH-outbox.md`
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-TSC-02A-TREV-HEALTH-developer-handoff.md`
- Forbidden scope:
  - Today Review repository, controller, router, validation, module, or index files
  - `frontend/src/features/today-trade-review/api/**`
  - `frontend/src/features/today-trade-review/hooks/**`
  - `frontend/src/features/today-trade-review/routes.tsx`
  - backend/frontend route registries
  - shared backend utilities or shared frontend components
  - Prisma schema or migrations
  - generated files
  - package manifests
  - upstream/downstream source/tests outside the reserved Today Review set
  - provider/live-data, startup/backfill, paid/cloud, broker, telemetry, or credential files
- Required validation:

```powershell
git merge-base --is-ancestor 9fbc989 HEAD
cd backend
npm.cmd test -- today-trade-review.service.test.ts --runInBand
npm.cmd run build
```

```powershell
cd frontend
npm.cmd run build
npm.cmd run test:ui -- today-trade-review.spec.ts --workers=1
```

- Stop if implementation is attempted from plain `dev`, touches files outside the reserved Today Review set, overclaims `HEALTHY` without documented rule evidence, weakens DQ hard-blocking, regresses legacy snapshots, creates list/detail inconsistency, or introduces target/R:R/Trade Plan/advice language.

2026-05-24 Team 00 Ready promotion - `CF-W1-BT-04`:

- `CF-W1-BT-04` is promoted and assigned to Team 06 as an independent Backtesting Strategy Lab implementation slice.
- Purpose: add additive saved-run freshness/current-proof labels so users can distinguish current proof, stale proof, repaired historical evidence, limited historical proof, and unavailable proof basis without overclaiming forward reliability.
- Parallel-safety decision: safe to run in parallel with Team 07 `CF-W1-TSC-01A-TREV` rework because file reservations are disjoint (`backtesting-strategy-lab` vs `today-trade-review`).
- Required base: accepted `CF-W1-BT-03` branch commit `8f984b1 feat: add backtesting proof basis guardrail`.
- Branch recommendation: `codex/team06-strategy-signal/CF-W1-BT-04`.
- Worktree recommendation: `C:\work\repo\investment-scanner-worktrees\team06-CF-W1-BT-04`.
- Gate evidence:
  - Requirement: `10-requirements/CF-W1-BT-04-backtesting-run-freshness-and-current-proof-labels-requirement.md`
  - Architecture review: `03-architecture/CF-W1-BT-04-architecture-review.md`
  - Contract: `06-contracts/CF-W1-BT-04-backtesting-run-current-proof-freshness-contract.md`
  - Work packet: `08-work-packets/CF-W1-BT-04-work-packet.md`
  - QA plan: `04-qa/CF-W1-BT-04-qa-plan.md`
  - Open decisions: none.
- Allowed implementation files:
  - `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.ts`
  - `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.types.ts`
  - `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.md`
  - `backend/tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.test.ts`
  - `frontend/src/features/backtesting-strategy-lab/types.ts`
  - `frontend/src/features/backtesting-strategy-lab/components/BacktestingStrategyLabPage.tsx`
  - `frontend/tests/ui/backtesting-strategy-lab.spec.ts`
- Allowed reporting docs:
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-06-CF-W1-BT-04-outbox.md`
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-BT-04-developer-handoff.md`
- Forbidden scope:
  - Prisma schema or migrations
  - generated files
  - Backtesting repository, controller, router, validation, module, or index files
  - route registries
  - `frontend/src/features/backtesting-strategy-lab/api/**`
  - `frontend/src/features/backtesting-strategy-lab/hooks/**`
  - `frontend/src/features/backtesting-strategy-lab/routes.tsx`
  - Strategy Framework, Trade Plan, Market Data, Data Quality, Signal Generation, Today Review, or other upstream/downstream module source/tests
  - shared backend utilities or shared frontend components
  - package manifests
  - provider/live-data, startup/backfill, paid/cloud, broker, telemetry, or credential files
  - simulation-math, benchmark-math, proof-basis, ranking, persistence, route-contract, or saved-run storage rewrites
- Required validation:

```powershell
cd backend
npm.cmd test -- backtesting-strategy-lab.service.test.ts --runInBand
npm.cmd run build
```

```powershell
cd frontend
npm.cmd run build
npm.cmd run test:ui -- backtesting-strategy-lab.spec.ts --workers=1
```

- Stop if implementation needs any forbidden file, fabricates current proof from stale/repaired/limited evidence, introduces target/R:R/advice wording, or cannot preserve list/detail consistency for the same saved run.

2026-05-24 Team 00 Ready promotion - `CF-W1-TSC-01A-TREV`:

- `CF-W1-TSC-01A-TREV` is promoted and assigned to Team 07 as the Today Review adoption child for Trusted Signal Candidate evidence.
- Dependency satisfied: Team 06 `CF-W1-TSC-01A-SIG` passed QA, Code Review, Architect Signoff, delegated PO acceptance, and scoped branch commit `40c00f1 feat: add signal latest strategy context bridge`.
- Sequencing decision: Team 07 must stack on the accepted Signal Generation bridge commit so the optional strategy-aware `latestForInstrument` contract is available.
- Branch recommendation: `codex/team07-portfolio-alerts/CF-W1-TSC-01A-today-review-trigger-evidence`
- Worktree recommendation: `C:\work\repo\investment-scanner-worktrees\team07-CF-W1-TSC-01A-TREV`
- Base recommendation: latest `dev` plus accepted Team 06 bridge commit `40c00f1`.
- Gate evidence:
  - Requirement: `10-requirements/CF-W1-TSC-01A-today-review-trusted-signal-candidate-adoption-requirement.md`
  - Architecture review: `03-architecture/CF-W1-TSC-01A-architecture-review.md`
  - Contract: `06-contracts/CF-W1-TSC-01A-trigger-evidence-adoption-contract.md`
  - Work packet: `08-work-packets/CF-W1-TSC-01A-work-packet.md`
  - QA plan: `04-qa/CF-W1-TSC-01A-qa-plan.md`
  - Signal bridge acceptance: `codex/team06-strategy-signal/CF-W1-TSC-01A-signal-latest-strategy-context` commit `40c00f1`
  - Open decisions: none.
- Allowed implementation files:
  - `backend/src/modules/today-trade-review/today-trade-review.types.ts`
  - `backend/src/modules/today-trade-review/today-trade-review.service.ts`
  - `backend/src/modules/today-trade-review/today-trade-review.md`
  - `backend/tests/modules/today-trade-review/today-trade-review.service.test.ts`
  - `frontend/src/features/today-trade-review/types.ts`
  - `frontend/src/features/today-trade-review/components/TodayReviewPage.tsx`
  - `frontend/src/features/today-trade-review/components/TodayReviewCandidateDetailPage.tsx`
  - `frontend/tests/ui/today-trade-review.spec.ts`
- Allowed reporting docs:
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-07-CF-W1-TSC-01A-TREV-outbox.md`
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-TSC-01A-TREV-developer-handoff.md`
- Forbidden scope:
  - Prisma schema or migrations
  - generated files
  - Today Review repository, controller, router, validation, module, or index files
  - backend/frontend route registries
  - shared backend utilities or shared frontend components
  - package manifests
  - Signal Generation source/tests beyond the accepted Team 06 bridge
  - Strategy Decision, Strategy Framework, Data Quality, Market Data, Trade Plan, Portfolio, Watchlist, Alerts, Copilot, or Research Hub source/tests
  - provider/live-data, startup/backfill, paid/cloud, broker, telemetry, or credential files
- Required validation:

```powershell
cd backend
npm.cmd test -- today-trade-review.service.test.ts --runInBand
npm.cmd run build
```

```powershell
cd frontend
npm.cmd run build
npm.cmd run test:ui -- today-trade-review.spec.ts --workers=1
```

- Stop if implementation requires schema, route, repository, shared UI, shared utility, package, generated, provider/live, startup/backfill, Trade Plan source, or downstream/upstream module source changes beyond the accepted Signal Generation bridge.

2026-05-24 Team 00 Ready promotion - `CF-W1-DQ-03`:

- `CF-W1-DQ-03` is promoted and assigned to Team 05 as an independent backend-only Data Quality Engine residual-summary implementation.
- Parallel-safety decision: safe to run in parallel with Team 06 `CF-W1-TSC-01A-SIG` because file reservations are disjoint (`data-quality-engine` vs `signal-generation-engine`).
- Branch recommendation: `codex/team05-market-data/CF-W1-DQ-03`
- Worktree recommendation: `C:\work\repo\investment-scanner-worktrees\team05-CF-W1-DQ-03`
- Gate evidence:
  - Requirement: `10-requirements/CF-W1-DQ-03-data-quality-residual-reason-summary-for-downstream-trust-consumers-requirement.md`
  - Architecture review: `03-architecture/CF-W1-DQ-03-architecture-review.md`
  - Contract: `06-contracts/CF-W1-DQ-03-data-quality-residual-reason-summary-contract.md`
  - Work packet: `08-work-packets/CF-W1-DQ-03-work-packet.md`
  - QA plan: `04-qa/CF-W1-DQ-03-qa-plan.md`
  - Open decisions: none.
- Allowed implementation files:
  - `backend/src/modules/data-quality-engine/data-quality-engine.service.ts`
  - `backend/src/modules/data-quality-engine/data-quality-engine.types.ts`
  - `backend/src/modules/data-quality-engine/data-quality-engine.md`
  - `backend/tests/modules/data-quality-engine/data-quality-engine.service.test.ts`
  - `backend/tests/modules/data-quality-engine/data-quality-engine.invariants.test.ts`
- Allowed reporting docs:
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-05-CF-W1-DQ-03-outbox.md`
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-DQ-03-developer-handoff.md`
- Forbidden scope:
  - DQE repository, controller, router, validation, module, or index files
  - repository/routes/validation tests
  - Market Data source/tests
  - downstream consumer module edits
  - all frontend files
  - Prisma schema or migrations
  - backend/frontend route registries
  - shared backend utilities or shared frontend components
  - package manifests, generated files, provider/live-data, startup/backfill, paid/cloud, broker, telemetry, or credential files
- Required validation:

```powershell
cd backend
npm.cmd test -- data-quality-engine.service.test.ts data-quality-engine.invariants.test.ts --runInBand
npm.cmd run build
```

- Stop if implementation requires repository persistence, schema/migration, route/controller/validation, frontend/UI, Market Data source, or downstream consumer edits.

2026-05-24 Team 00 Ready promotion - `CF-W1-TSC-01A-SIG`:

- `CF-W1-TSC-01A-SIG` is promoted and assigned to Team 06 as the first executable child of the Trusted Signal Candidate adoption path.
- Purpose: add optional strategy-aware read options to `SignalGenerationEngineService.latestForInstrument` so downstream Today Review can request source-proven trigger evidence for the Strategy Decision strategy.
- Sequencing: Team 06 bridge must complete QA, review, Architect Signoff, delegated PO acceptance, and scoped commit before Team 07 Today Review adoption (`CF-W1-TSC-01A-TREV`) starts.
- Branch recommendation: `codex/team06-strategy-signal/CF-W1-TSC-01A-signal-latest-strategy-context`
- Worktree recommendation: `C:\work\repo\investment-scanner-worktrees\team06-CF-W1-TSC-01A-SIG`
- Gate evidence:
  - Requirement: `10-requirements/CF-W1-TSC-01A-today-review-trusted-signal-candidate-adoption-requirement.md`
  - Architecture review: `03-architecture/CF-W1-TSC-01A-architecture-review.md`
  - Contract: `06-contracts/CF-W1-TSC-01A-trigger-evidence-adoption-contract.md`
  - Work packet: `08-work-packets/CF-W1-TSC-01A-work-packet.md`
  - QA plan: `04-qa/CF-W1-TSC-01A-qa-plan.md`
  - Open decisions: none.
- Allowed implementation files:
  - `backend/src/modules/signal-generation-engine/signal-generation-engine.service.ts`
  - `backend/src/modules/signal-generation-engine/signal-generation-engine.types.ts`
  - `backend/src/modules/signal-generation-engine/signal-generation-engine.md`
  - `backend/tests/modules/signal-generation-engine/signal-generation-engine.service.test.ts`
  - `backend/tests/modules/signal-generation-engine/signal-generation-engine.trigger-contract.test.ts`
- Allowed reporting docs:
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-06-CF-W1-TSC-01A-SIG-outbox.md`
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-TSC-01A-SIG-developer-handoff.md`
- Forbidden scope:
  - Prisma schema or migrations
  - generated files
  - Signal Generation repository, controller, router, validation, module, or index files
  - Today Review source/tests
  - route registries
  - shared backend utilities
  - shared frontend components
  - package manifests
  - frontend files
  - Strategy Framework, Strategy Decision, Data Quality, Market Data, Trade Plan, Portfolio, Watchlist, Alerts, Copilot, or Research Hub source/tests
  - provider/live-data, startup/backfill, paid/cloud, broker, telemetry, or credential files
- Required validation:

```powershell
cd backend
npm.cmd test -- signal-generation-engine.service.test.ts signal-generation-engine.trigger-contract.test.ts --runInBand
npm.cmd run build
```

- Stop if implementation needs route/controller/repository/schema/shared/package/generated/frontend/provider scope, creates durable trigger persistence, changes existing default route behavior, or emits `SOURCE_PROVEN` trigger evidence without exact strategy/rule/source proof.

`CF-W1-TSC-01A-TREV` remains blocked until this bridge is accepted.

2026-05-24 Team 00 Trusted Signal Candidate dependency update:

- `CF-W1-SIG-TRIGGER-ENTRY-01` was implemented as a bounded Signal Generation compatibility-evidence child after Product Owner, Architect, and QA agent review confirmed the module-local path.
- Current state: accepted through QA, Code Review, Architect Signoff, delegated PO acceptance, and scoped local commit `649e645 feat: add signal trigger entry price evidence`.
- Validation passed: `cd backend && npm.cmd test -- signal-generation-engine.trigger-contract.test.ts signal-generation-engine.service.test.ts signal-generation-dq-enforcement.invariants.test.ts --runInBand`; `cd backend && npm.cmd run build`.
- This does not move `CF-W1-TSC-01` into Ready yet. A downstream Today Review/TSC adoption child still needs accepted trigger-evidence dependency, architecture contract, QA plan, exact file reservations, and Team 00 promotion.

2026-05-24 Team 00 gate-closure update:

- `CF-W1-STRAT-04` completed QA, review, Architect Signoff, delegated PO acceptance, and scoped local implementation-branch commit `8b3498e feat: add strategy evidence freshness labels`.
- `CF-W1-SQLAB-03` completed QA, review, Architect Signoff, delegated PO acceptance, and scoped local implementation-branch commit `5db98f2 feat: add signal quality review actions`.
- Neither branch has been pushed or integrated into `dev`.
- `CF-W1-TSC-01` remains out of Ready because source-proven rule-triggered entry price, trigger timestamp, and rule provenance are missing.
- Next Ready-prep dependency is a Signal Trigger entry-price evidence child (`CF-W1-SIG-TRIGGER-ENTRY-01`) before any Trusted Signal Candidate implementation can be promoted.

2026-05-20 Team 00 Ready promotion:

- `CF-W1-STRAT-04` is promoted and assigned to Team 06 as a bounded no-schema/no-route/no-shared-file Strategy Framework evidence-freshness and stale-summary implementation.
- Team 00 sequencing decision: implement `STRAT-04` on accepted Strategy Framework baseline `359d0a3 feat: add strategy trust metadata`.
- Parallel-safety decision: `STRAT-04` can run in parallel with `SQLAB-03`, `TREV-02`, and `HCTX-03` because file scopes are disjoint.
- Branch: `codex/team06-strategy-signal/CF-W1-STRAT-04`
- Worktree: `../investment-scanner-worktrees/team06-CF-W1-STRAT-04`
- Base: `359d0a3 feat: add strategy trust metadata`
- Allowed implementation files:
  - `backend/src/modules/strategy-framework/strategy-framework.service.ts`
  - `backend/src/modules/strategy-framework/strategy-framework.types.ts`
  - `backend/src/modules/strategy-framework/strategy-framework.md`
  - `backend/tests/modules/strategy-framework/strategy-framework.service.test.ts`
  - `frontend/src/features/strategy-framework/types.ts`
  - `frontend/src/features/strategy-framework/components/StrategyFrameworkPage.tsx`
  - `frontend/tests/ui/strategy-framework.spec.ts`
- Allowed branch-local evidence docs:
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-06-CF-W1-STRAT-04-outbox.md`
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-STRAT-04-developer-handoff.md`
- Required developer validation:
  - `cd backend && npm.cmd test -- strategy-framework.service.test.ts --runInBand`
  - `cd backend && npm.cmd run build`
  - `cd frontend && npm.cmd run build`
  - `cd frontend && npm.cmd run test:ui -- strategy-framework.spec.ts --workers=1`
- Forbidden scope:
  - `backend/src/modules/strategy-framework/strategy-framework.repository.ts`
  - `backend/src/modules/strategy-framework/strategy-framework.evaluator.ts`
  - `backend/src/modules/strategy-framework/strategy-framework.registry.ts`
  - `backend/src/modules/strategy-framework/strategy-framework.controller.ts`
  - `backend/src/modules/strategy-framework/strategy-framework.router.ts`
  - `backend/src/modules/strategy-framework/strategy-framework.validation.ts`
  - `backend/src/modules/strategy-framework/index.ts`
  - repository or evaluator tests
  - `frontend/src/features/strategy-framework/api/strategyFrameworkApi.ts`
  - `frontend/src/features/strategy-framework/routes.tsx`
  - all `backtesting-strategy-lab` source/tests
  - Prisma schema or migrations
  - backend/frontend route registries
  - shared backend utilities or shared frontend components
  - package manifests, generated files, provider/live-data, startup/backfill, paid/cloud, broker, or telemetry scope
- Stop if implementation needs any forbidden file or changes strategy math, proof derivation, rating logic, route contracts, shared UI, schema, provider/live flow, or Backtesting Strategy Lab source.

2026-05-20 Team 00 Ready promotion:

- `CF-W1-SQLAB-03` is promoted and assigned to Team 06 as a bounded no-schema/no-route/no-shared-file Signal Quality Lab review-loop actionability implementation.
- Team 00 sequencing decision: implement `SQLAB-03` on accepted `CF-W1-SQLAB-02A` baseline `abac241 feat: add signal quality journal preview evidence`, because both slices reserve the same Signal Quality Lab writer set and `SQLAB-02A` is not merged into plain `dev`.
- Parallel-safety decision: `SQLAB-03` can run in parallel with `STRAT-04`, `TREV-02`, and `HCTX-03` because file scopes are disjoint.
- Branch: `codex/team06-strategy-signal/CF-W1-SQLAB-03`
- Worktree: `../investment-scanner-worktrees/team06-CF-W1-SQLAB-03`
- Base: `abac241 feat: add signal quality journal preview evidence`
- Allowed implementation files:
  - `backend/src/modules/signal-quality-lab/signal-quality-lab.service.ts`
  - `backend/src/modules/signal-quality-lab/signal-quality-lab.types.ts`
  - `backend/src/modules/signal-quality-lab/signal-quality-lab.md`
  - `backend/tests/modules/signal-quality-lab/signal-quality-lab.service.test.ts`
  - `frontend/src/features/signal-quality-lab/types.ts`
  - `frontend/src/features/signal-quality-lab/components/SignalQualityLabPage.tsx`
  - `frontend/tests/ui/signal-quality-lab.spec.ts`
- Allowed branch-local evidence docs:
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-06-CF-W1-SQLAB-03-outbox.md`
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-SQLAB-03-developer-handoff.md`
- Required developer validation:
  - `cd backend && npm.cmd test -- signal-quality-lab.service.test.ts --runInBand`
  - `cd backend && npm.cmd run build`
  - `cd frontend && npm.cmd run build`
  - `cd frontend && npm.cmd run test:ui -- signal-quality-lab.spec.ts --workers=1`
- Forbidden scope:
  - Prisma schema or migrations
  - generated files
  - `backend/src/modules/signal-quality-lab/signal-quality-lab.repository.ts`
  - `backend/src/modules/signal-quality-lab/signal-quality-lab.controller.ts`
  - `backend/src/modules/signal-quality-lab/signal-quality-lab.router.ts`
  - `backend/src/modules/signal-quality-lab/signal-quality-lab.validation.ts`
  - `backend/tests/modules/signal-quality-lab/signal-quality-lab.routes.test.ts`
  - `backend/tests/modules/signal-quality-lab/signal-quality-lab.validation.test.ts`
  - `frontend/src/features/signal-quality-lab/api/signalQualityLabService.ts`
  - Signal Generation, Signal Calibration, Trade Plan, or Today Review source/tests
  - backend/frontend route registries
  - shared backend utilities or shared frontend components
  - package manifests, provider/live-data, startup/backfill, paid/cloud, broker, or telemetry scope
- Stop if implementation needs journal persistence, repository/schema/route/API/shared-file changes, downstream module rewrites, provider/live flow, or advice/target/automation wording.

2026-05-20 Team 00 Ready promotion:

- `CF-W1-HCTX-03` is promoted and assigned to Team 05 as a bounded backend-only Historical Context nearest-snapshot age/provenance implementation.
- Team 00 sequencing decision: implement `HCTX-03` on accepted `CF-W1-HCTX-02` commit `f52c024`, because both slices reserve overlapping `historical-context-snapshots` service/types/doc/test files and `HCTX-02` is not merged into plain `dev`.
- Parallel-safety decision: `HCTX-03` can run in parallel with active `TREV-02`, `SQLAB-02A`, and `MCTX-02` gates because file scopes are disjoint.
- Branch: `codex/team05-market-data/CF-W1-HCTX-03`
- Worktree: `../investment-scanner-worktrees/team05-CF-W1-HCTX-03`
- Base: `f52c024 feat: add historical context dq coverage evidence`
- Allowed implementation files:
  - `backend/src/modules/historical-context-snapshots/historical-context-snapshots.types.ts`
  - `backend/src/modules/historical-context-snapshots/historical-context-snapshots.service.ts`
  - `backend/src/modules/historical-context-snapshots/historical-context-snapshots.md`
  - `backend/tests/modules/historical-context-snapshots/historical-context-snapshots.service.test.ts`
- Allowed branch-local evidence docs:
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-05-CF-W1-HCTX-03-outbox.md`
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-HCTX-03-developer-handoff.md`
- Required developer validation:
  - `cd backend && npm.cmd test -- historical-context-snapshots.service.test.ts --runInBand`
  - `cd backend && npm.cmd run build`
  - optional copy drift scan: `rg -n "same-day|near|fallback|lag|lookback|metadata gap|provenance" backend/src/modules/historical-context-snapshots backend/tests/modules/historical-context-snapshots`
- Forbidden scope:
  - `backend/src/modules/historical-context-snapshots/historical-context-snapshots.repository.ts`
  - `backend/src/modules/historical-context-snapshots/historical-context-snapshots.controller.ts`
  - `backend/src/modules/historical-context-snapshots/historical-context-snapshots.router.ts`
  - `backend/src/modules/historical-context-snapshots/historical-context-snapshots.validation.ts`
  - `backend/src/modules/historical-context-snapshots/index.ts`
  - `backend/src/modules/historical-context-snapshots/historical-context-snapshots.module.ts`
  - `backend/tests/modules/historical-context-snapshots/historical-context-snapshots.repository.test.ts`
  - `backend/tests/modules/historical-context-snapshots/historical-context-snapshots.routes.test.ts`
  - `backend/tests/modules/historical-context-snapshots/historical-context-snapshots.validation.test.ts`
  - all frontend `historical-context-snapshots` files/tests
  - all `market-context-intelligence` source/tests
  - all `signal-quality-lab` source/tests
  - Prisma schema or migrations
  - generated files
  - backend/frontend route registries
  - shared backend utilities or shared frontend components
  - package manifests
  - provider/live-data, startup/backfill, paid/cloud, broker, telemetry, or credential files
- Next gate after implementation: Team 04 QA verification.

2026-05-20 Team 00 Ready promotion:

- `CF-W1-MCTX-02` is promoted and assigned to Team 05 as a bounded backend-only Market Context freshness-basis implementation.
- Team 00 sequencing decision: implement `MCTX-02` on accepted `CF-W1-MCTX-01` commit `e695f0c`, because both slices reserve overlapping `market-context-intelligence` service/types/doc/test files and `MCTX-01` is not merged into plain `dev`.
- Parallel-safety decision: `MCTX-02` can run in parallel with active Team 07 `TREV-02` rework and active Team 10 reviews for `INTEL-03` / `SQLAB-02A` because the write scopes are disjoint.
- Branch: `codex/team05-market-data/CF-W1-MCTX-02`
- Worktree: `../investment-scanner-worktrees/team05-CF-W1-MCTX-02`
- Base: `e695f0c feat: add market context evidence framing`
- Allowed implementation files:
  - `backend/src/modules/market-context-intelligence/market-context-intelligence.service.ts`
  - `backend/src/modules/market-context-intelligence/market-context-intelligence.types.ts`
  - `backend/src/modules/market-context-intelligence/market-context-intelligence.md`
  - `backend/tests/modules/market-context-intelligence/market-context-intelligence.service.test.ts`
- Allowed branch-local evidence docs:
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-05-CF-W1-MCTX-02-outbox.md`
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-MCTX-02-developer-handoff.md`
- Required developer validation:
  - `cd backend && npm.cmd test -- market-context-intelligence.service.test.ts --runInBand`
  - `cd backend && npm.cmd run build`
  - optional copy drift scan: `rg -n "persisted|generated|fallback|derived|fresh|partial|missing|macro|basis" backend/src/modules/market-context-intelligence backend/tests/modules/market-context-intelligence`
- Forbidden scope:
  - `backend/src/modules/market-context-intelligence/market-context-intelligence.repository.ts`
  - `backend/src/modules/market-context-intelligence/market-context-intelligence.controller.ts`
  - `backend/src/modules/market-context-intelligence/market-context-intelligence.router.ts`
  - `backend/src/modules/market-context-intelligence/market-context-intelligence.validation.ts`
  - `backend/src/modules/market-context-intelligence/index.ts`
  - `backend/tests/modules/market-context-intelligence/market-context-intelligence.repository.test.ts`
  - `backend/tests/modules/market-context-intelligence/market-context-intelligence.routes.test.ts`
  - all frontend `market-context-intelligence` files/tests
  - all downstream consumer module source/tests
  - Prisma schema or migrations
  - generated files
  - backend/frontend route registries
  - shared backend utilities or shared frontend components
  - package manifests
  - provider/live-data, startup/backfill, paid/cloud, broker, telemetry, or credential files
- Next gate after implementation: Team 04 QA verification.

2026-05-20 Team 00 Ready promotion:

- `CF-W1-SQLAB-02A` is promoted and assigned to Team 06 as a bounded no-schema Signal Quality Lab derived journal-preview implementation.
- Team 00 sequencing decision: implement `SQLAB-02A` on accepted `CF-W1-SQLAB-01` commit `1a41d95`, because both slices reserve overlapping Signal Quality Lab service/types/doc/test files and `SQLAB-01` is not merged into plain `dev`.
- Parallel-safety decision: `SQLAB-02A` can run in parallel with active Team 07 `TREV-02` and `INTEL-03` rework because the write scopes are disjoint.
- Branch: `codex/team06-strategy-signal/CF-W1-SQLAB-02A`
- Worktree: `../investment-scanner-worktrees/team06-CF-W1-SQLAB-02A`
- Base: `1a41d95 feat: add signal quality outcome confidence`
- Allowed implementation files:
  - `backend/src/modules/signal-quality-lab/signal-quality-lab.service.ts`
  - `backend/src/modules/signal-quality-lab/signal-quality-lab.types.ts`
  - `backend/src/modules/signal-quality-lab/signal-quality-lab.md`
  - `backend/tests/modules/signal-quality-lab/signal-quality-lab.service.test.ts`
  - `frontend/src/features/signal-quality-lab/types.ts`
  - `frontend/src/features/signal-quality-lab/components/SignalQualityLabPage.tsx`
  - `frontend/tests/ui/signal-quality-lab.spec.ts`
- Allowed branch-local evidence docs:
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-06-CF-W1-SQLAB-02A-outbox.md`
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-SQLAB-02A-developer-handoff.md`
- Required developer validation:
  - `cd backend && npm.cmd test -- signal-quality-lab.service.test.ts --runInBand`
  - `cd frontend && npm.cmd run test:ui -- signal-quality-lab.spec.ts --workers=1`
  - copy scan proving visible copy keeps derived-not-persisted and research-support framing without advice, target, guaranteed-outcome, broker, automation, save/edit, or durable-journal claims.
- Forbidden scope:
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
  - backend/frontend route registries
  - shared backend utilities, shared frontend components, package manifests, generated files
  - provider/live-market/startup/backfill/paid-cloud/broker/telemetry files
  - durable journal storage, save/edit actions, schema, persistence, or separate journal routes
- Next gate after implementation: Team 04 QA verification.

2026-05-20 Team 00 Ready promotion:

- `CF-W1-L3-INTEL-03` is promoted and assigned to Team 07 as a bounded Portfolio Intelligence concentration-review implementation.
- Team 00 sequencing decision: implement `INTEL-03` on accepted `CF-W1-L3-INTEL-02` commit `d0305c8`, which already includes `DQ-01B` commit `56b286f` and the accepted portfolio readiness baseline.
- Parallel-safety decision: `INTEL-03` can run in parallel with active `TREV-02` because it reserves `portfolio-intelligence` files while `TREV-02` reserves `today-trade-review` files.
- Branch: `codex/team07-portfolio-alerts/CF-W1-L3-INTEL-03`
- Worktree: `../investment-scanner-worktrees/team07-CF-W1-L3-INTEL-03`
- Base: `d0305c8 feat: add portfolio intelligence review traceability`
- Allowed implementation files:
  - `backend/src/modules/portfolio-intelligence/portfolio-intelligence.service.ts`
  - `backend/src/modules/portfolio-intelligence/portfolio-intelligence.types.ts`
  - `backend/src/modules/portfolio-intelligence/portfolio-intelligence.md`
  - `backend/tests/modules/portfolio-intelligence/portfolio-intelligence.service.test.ts`
  - `frontend/src/features/portfolio-intelligence/types.ts`
  - `frontend/src/features/portfolio-intelligence/components/PortfolioIntelligencePanel.tsx`
  - optional new focused UI smoke: `frontend/tests/ui/portfolio-intelligence.spec.ts`
- Allowed branch-local evidence docs:
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-07-CF-W1-L3-INTEL-03-outbox.md`
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-L3-INTEL-03-developer-handoff.md`
- Required developer validation:
  - `cd backend && npm.cmd test -- portfolio-intelligence.service.test.ts --runInBand`
  - `cd frontend && npm.cmd run test:ui -- portfolio-intelligence.spec.ts --workers=1` if the UI smoke is added or already exists
  - copy scan proving concentration-review copy stays research-support only and avoids optimizer/rebalance/advice wording.
- Forbidden scope:
  - `backend/src/modules/portfolio-intelligence/portfolio-intelligence.router.ts`
  - `backend/src/modules/portfolio-intelligence/portfolio-intelligence.controller.ts`
  - `backend/src/modules/portfolio-intelligence/portfolio-intelligence.repository.ts`
  - `backend/src/modules/portfolio-intelligence/portfolio-intelligence.validation.ts`
  - `backend/tests/modules/portfolio-intelligence/portfolio-intelligence.routes.test.ts`
  - all `backend/src/modules/portfolio-management/**`
  - all `backend/src/modules/data-quality-engine/**`
  - all `backend/src/modules/strategy-decision-engine/**`
  - backend/frontend route registries
  - `frontend/src/features/portfolio-intelligence/api/portfolioIntelligenceService.ts`
  - `frontend/src/features/portfolio-intelligence/hooks/usePortfolioIntelligence.ts`
  - `frontend/src/features/portfolio-intelligence/routes.tsx`
  - shared backend utilities, shared frontend components, package manifests, generated files
  - Prisma/schema/migrations
  - optimizer, rebalance, tax, broker, provider/startup, paid/cloud, telemetry, or live-flow work
- Next gate after implementation: Team 04 QA verification.

2026-05-20 Team 00 Ready promotion:

- `CF-W1-L3-TREV-02` is promoted and assigned to Team 07 as a bounded Today Review candidate-detail provenance implementation.
- Team 00 sequencing decision: implement `TREV-02` on accepted `CF-W1-L3-TREV-01` commit `e0673c3`, because both slices reserve overlapping Today Review writer files and `TREV-01` is not merged into plain `dev`.
- Branch: `codex/team07-portfolio-alerts/CF-W1-L3-TREV-02`
- Worktree: `../investment-scanner-worktrees/team07-CF-W1-L3-TREV-02`
- Base: `e0673c3 feat: add today review publication evidence`
- Allowed implementation files:
  - `backend/src/modules/today-trade-review/today-trade-review.types.ts`
  - `backend/src/modules/today-trade-review/today-trade-review.repository.ts`
  - `backend/src/modules/today-trade-review/today-trade-review.service.ts`
  - `backend/src/modules/today-trade-review/today-trade-review.md`
  - `backend/tests/modules/today-trade-review/today-trade-review.service.test.ts`
  - exact new focused compatibility-read test only if needed: `backend/tests/modules/today-trade-review/today-trade-review.repository.test.ts`
  - `frontend/src/features/today-trade-review/types.ts`
  - `frontend/src/features/today-trade-review/components/TodayReviewCandidateDetailPage.tsx`
  - `frontend/tests/ui/today-trade-review.spec.ts`
- Allowed branch-local evidence docs:
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-07-CF-W1-L3-TREV-02-outbox.md`
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-L3-TREV-02-developer-handoff.md`
- Required developer validation:
  - `cd backend && npm.cmd test -- today-trade-review.service.test.ts today-trade-review.repository.test.ts --runInBand` if the repository test exists; otherwise run the focused Today Review service suite and document why the repository test was unnecessary.
  - `cd frontend && npm.cmd run test:ui -- today-trade-review.spec.ts --workers=1`
  - copy scan proving changed provenance copy stays research-support only and does not introduce target/advice/broker/execution wording.
- Forbidden scope:
  - `backend/prisma/schema.prisma`
  - `backend/prisma/migrations/**`
  - `backend/src/api/routes.ts`
  - `frontend/src/app/routes.tsx`
  - `backend/src/modules/today-trade-review/index.ts`
  - `backend/src/modules/today-trade-review/today-trade-review.controller.ts`
  - `backend/src/modules/today-trade-review/today-trade-review.router.ts`
  - `backend/src/modules/today-trade-review/today-trade-review.validation.ts`
  - `backend/tests/modules/today-trade-review/today-trade-review.controller.test.ts`
  - `frontend/src/features/today-trade-review/components/TodayReviewPage.tsx`
  - `frontend/src/features/today-trade-review/api/todayTradeReviewApi.ts`
  - `frontend/src/features/today-trade-review/hooks/useTodayReview.ts`
  - `frontend/src/features/today-trade-review/routes.tsx`
  - `frontend/src/features/today-trade-review/index.ts`
  - upstream Market Data, Data Quality, Market Context, Strategy Decision, Trade Plan, Signal Generation, Calibration, and Smart Money source/test files
  - shared backend utilities, shared frontend components, package manifests, generated files
  - provider/live-data/startup/backfill/paid-cloud/broker/telemetry files
  - broad Today Review UI redesign
  - Trade Plan target/geometry wording cleanup or Strategy Decision semantics rewrite
- Next gate after implementation: Team 04 QA verification.

2026-05-20 Team 00 Ready promotion:

- `CF-W1-RH-03` is promoted and assigned to Team 08 as a bounded Research Hub explainability/trust-label implementation.
- Team 00 sequencing decision: implement `RH-03` on accepted `CF-W1-RH-02A` commit `f391a6d`, which already includes accepted `CF-W1-RH-01` commit `fd88c62`.
- Branch: `codex/team08-ux-research/CF-W1-RH-03`
- Worktree: `../investment-scanner-worktrees/team08-CF-W1-RH-03`
- Base: `f391a6d feat: fail closed research hub comparison basis`
- Allowed implementation files:
  - `backend/src/modules/research-hub/research-hub.service.ts`
  - `backend/src/modules/research-hub/research-hub.types.ts`
  - `backend/src/modules/research-hub/research-hub.md`
  - `backend/tests/modules/research-hub/research-hub.service.test.ts`
  - `frontend/src/features/research-hub/api/researchHubApi.ts`
  - `frontend/src/features/research-hub/components/ResearchOverviewPage.tsx`
  - `frontend/tests/ui/research-hub.spec.ts`
- Allowed branch-local evidence docs:
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-08-CF-W1-RH-03-outbox.md`
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-RH-03-developer-handoff.md`
- Required developer validation:
  - `cd backend && npm.cmd test -- --runInBand --runTestsByPath tests/modules/research-hub/research-hub.service.test.ts`
  - `cd frontend && npm.cmd run test:ui -- research-hub.spec.ts --workers=1`
  - `rg` scan proving stale copy such as `since the last evaluation` and forbidden advice/target language is not introduced.
- Forbidden scope:
  - `backend/src/modules/research-hub/index.ts`
  - `backend/src/modules/research-hub/research-hub.controller.ts`
  - `backend/src/modules/research-hub/research-hub.router.ts`
  - `frontend/src/features/research-hub/index.ts`
  - `frontend/src/features/research-hub/hooks/**`
  - all upstream module source/tests outside Research Hub
  - Prisma/schema/migrations/generated files
  - backend/frontend route registries
  - shared backend utilities
  - shared frontend components
  - package manifests
  - durable snapshot/history storage
  - provider/live-data/startup/backfill/paid-cloud/broker/telemetry files
  - broad UX redesign or unrelated Research Hub feature work
- Next gate after implementation: Team 04 QA verification.
- Acceptance update:
  - `CF-W1-RH-03` completed Team 08 implementation, Team 04 QA verification, Team 10 review/review rework cycle, Team 03 Architect Signoff, delegated PO acceptance, and scoped local branch commit `5bd176b`.
  - Branch remains parked for later clean integration.
  - Push performed: no.

2026-05-20 Team 00 Ready promotion:

- `CF-W1-L3-DQ-01B` is promoted and assigned to Team 07 as a bounded backend-only Portfolio Intelligence reliability-gate implementation.
- Team 00 sequencing decision: current plain `dev` still lacks accepted `PORT-01A`, but the dedicated implementation branch is based on accepted commit `f1432e6`; this satisfies the implementation-base prerequisite without waiting for `dev` integration.
- Branch: `codex/team07-portfolio-alerts/CF-W1-L3-DQ-01B`
- Worktree: `../investment-scanner-worktrees/team07-CF-W1-L3-DQ-01B`
- Base: `f1432e6 feat: add portfolio readiness dto evidence`
- Allowed implementation files:
  - `backend/src/modules/portfolio-intelligence/portfolio-intelligence.service.ts`
  - `backend/src/modules/portfolio-intelligence/portfolio-intelligence.types.ts`
  - `backend/src/modules/portfolio-intelligence/portfolio-intelligence.md`
  - `backend/tests/modules/portfolio-intelligence/portfolio-intelligence.service.test.ts`
- Allowed branch-local evidence docs:
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-07-CF-W1-L3-DQ-01B-outbox.md`
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-L3-DQ-01B-developer-handoff.md`
- Forbidden scope:
  - all other `backend/src/modules/portfolio-intelligence/**`
  - all `backend/src/modules/portfolio-management/**`
  - all `backend/src/modules/watchlist-management/**`
  - all `backend/src/modules/data-quality-engine/**`
  - Prisma/schema/migrations/generated files
  - route registries
  - shared backend utilities or DTOs
  - frontend files/tests
  - package manifests
  - provider/live-data/startup/backfill/paid-cloud/broker/telemetry files
  - `CF-W1-L3-INTEL-02` traceability scope
- Next gate after implementation: Team 04 QA verification.

2026-05-20 Team 00 Ready promotion:

- `CF-W1-L3-INTEL-02` is promoted and assigned to Team 07 as the next stacked `portfolio-intelligence` writer after accepted `CF-W1-L3-DQ-01B`.
- Team 00 one-writer decision: do not run `CF-W1-L3-INTEL-01` as a separate competing writer. `INTEL-02` is the active downstream traceability child and must stack on `DQ-01B`.
- Branch: `codex/team07-portfolio-alerts/CF-W1-L3-INTEL-02`
- Worktree: `../investment-scanner-worktrees/team07-CF-W1-L3-INTEL-02`
- Base: `56b286f feat: add portfolio intelligence reliability gate`
- Allowed implementation files:
  - `backend/src/modules/portfolio-intelligence/portfolio-intelligence.service.ts`
  - `backend/src/modules/portfolio-intelligence/portfolio-intelligence.types.ts`
  - `backend/src/modules/portfolio-intelligence/portfolio-intelligence.md`
  - `backend/tests/modules/portfolio-intelligence/portfolio-intelligence.service.test.ts`
- Allowed branch-local evidence docs:
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-07-CF-W1-L3-INTEL-02-outbox.md`
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-L3-INTEL-02-developer-handoff.md`
- Forbidden scope:
  - all other `backend/src/modules/portfolio-intelligence/**`
  - all `backend/src/modules/portfolio-management/**`
  - all `backend/src/modules/watchlist-management/**`
  - all `backend/src/modules/data-quality-engine/**`
  - Prisma/schema/migrations/generated files
  - route registries
  - shared backend utilities or DTOs
  - frontend files/tests
  - package manifests
  - provider/live-data/startup/backfill/paid-cloud/broker/telemetry files
  - separate `INTEL-01` writer work
- Next gate after implementation: Team 04 QA verification.

2026-05-19 Team 00 post-restart update:

- `CF-W1-SIG-02` returned to Rejected / Rework after Team 10 review. It is not accepted for Architect Signoff or commit until Team 06 fixes current-row contract status and supported-field provenance metadata, then Team 04 QA and Team 10 re-review accept.
- `CF-W1-MD-04` is the top fresh Market Data requirement from Team 02, but it is not Ready. It needs Team 03 architecture/contract/work-packet prep, Team 04 QA planning, exact file reservations, and Team 00 Ready promotion.
- `CF-W1-SQLAB-02B` is proposal-QA accepted only and remains blocked from implementation until explicit schema/migration/generated/repository consent is recorded.

2026-05-19 Team 00 Ready promotion:

- `CF-W1-MD-04` is promoted and assigned to Team 05 after requirement, architecture, contract, work packet, QA plan, exact file reservations, and open-decision checks passed.
- Branch: `codex/team05-market-data/CF-W1-MD-04`
- Worktree: `../investment-scanner-worktrees/team05-CF-W1-MD-04`
- Allowed implementation files:
  - `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
  - `backend/src/modules/market-data-foundation/market-data-foundation.types.ts`
  - `backend/src/modules/market-data-foundation/market-data-foundation.md`
  - `backend/tests/modules/market-data-foundation/market-data.service.test.ts`
- Next gate after implementation: Team 04 QA verification.

2026-05-19 acceptance update:

- `CF-W1-MD-04` completed Team 05 implementation, Team 04 QA, Team 10 review, Team 03 Architect Signoff, delegated PO acceptance, and scoped local branch commit `5e973e0`.
- `CF-W1-HCTX-02` completed Team 05 implementation, Team 04 QA, Team 10 review, Team 03 Architect Signoff, delegated PO acceptance, and scoped local branch commit `f52c024`.
- Both branches are parked for later clean integration and have not been pushed or merged to `dev`.

2026-05-19 Team 00 Ready promotion:

- `CF-W1-RH-01` is promoted and assigned to Team 08 after requirement, architecture review, contract, work packet, QA plan, exact file reservations, no-open-decision check, and shared-file conflict check passed.
- Branch: `codex/team08-ux-research/CF-W1-RH-01`
- Worktree: `../investment-scanner-worktrees/team08-CF-W1-RH-01`
- Allowed implementation files:
  - `backend/src/modules/research-hub/research-hub.service.ts`
  - `backend/src/modules/research-hub/research-hub.md`
  - `backend/tests/modules/research-hub/research-hub.service.test.ts`
  - optional only if module-local helper aliases are needed without expanding the response shape: `backend/src/modules/research-hub/research-hub.types.ts`
- Forbidden files:
  - `backend/src/modules/research-hub/index.ts`
  - `backend/src/modules/research-hub/research-hub.controller.ts`
  - `backend/src/modules/research-hub/research-hub.router.ts`
  - all `frontend/src/features/research-hub/**`
  - all `frontend/tests/ui/**`
  - backend/frontend route registries
  - Today Review, Trade Plan, Signal Quality Lab, or Signal Calibration Engine source/test edits
  - upstream repositories or private helpers
  - shared backend utilities, shared frontend components, Prisma schema/migrations, generated files, package manifests, providers/live data, startup/backfill, paid/cloud, broker, telemetry, and `CF-W1-RH-02` scope
- Next gate after implementation: Team 04 QA verification.

2026-05-19 Team 00 Ready promotion:

- `CF-W1-HCTX-02` is promoted and assigned to Team 05 after requirement, architecture, contract, work packet, QA plan, exact file reservations, and open-decision checks passed.
- Branch: `codex/team05-market-data/CF-W1-HCTX-02`
- Worktree: `../investment-scanner-worktrees/team05-CF-W1-HCTX-02`
- Allowed implementation files:
  - `backend/src/modules/historical-context-snapshots/historical-context-snapshots.types.ts`
  - `backend/src/modules/historical-context-snapshots/historical-context-snapshots.repository.ts`
  - `backend/src/modules/historical-context-snapshots/historical-context-snapshots.service.ts`
  - `backend/src/modules/historical-context-snapshots/historical-context-snapshots.md`
  - `backend/tests/modules/historical-context-snapshots/historical-context-snapshots.repository.test.ts`
  - `backend/tests/modules/historical-context-snapshots/historical-context-snapshots.service.test.ts`
- Next gate after implementation: Team 04 QA verification.

`CF-W1-SIG-02` is promoted and assigned to Team 06 as a stacked Signal Generation implementation on accepted parked `CF-W1-SIG-TRIGGER-02A` commit `788c237`.

`CF-W1-STRAT-03` is promoted and assigned to Team 06 for a bounded backend-only Strategy Decision provenance implementation in a dedicated worktree. It can run in parallel with `CF-W1-BT-01A` rework because the file reservations are disjoint.

`CF-W1-SMI-01` is promoted and assigned to Team 06 for bounded backend-only Smart Money evidence freshness and partial-trust framing in a dedicated worktree. It can run in parallel with `CF-W1-TP-02` rework because the file reservations are disjoint.

`CF-W1-TP-02` is promoted and assigned to Team 06 for bounded backend-only Trade Plan exit/invalidation semantics implementation. It must be based on accepted branch `codex/team06-strategy-signal/CF-W1-TP-01B` because upstream commit `8ff22fd` is not yet in `dev`.

`CF-W1-BT-02` is promoted and assigned to Team 06 for a bounded `backtesting-strategy-lab` implementation in a dedicated worktree.

`CF-W1-HCTX-01` is promoted and assigned to Team 05 for a bounded backend-only `historical-context-snapshots` implementation in a dedicated worktree.

`CF-W1-CAL-01` is promoted and assigned to Team 06 for a bounded backend-only `signal-calibration-engine` implementation in a dedicated worktree.

2026-05-18 Team 00 promotion update:

- `CF-W1-BT-02` is promoted after Team 03 refreshed the narrowed architecture/contract/work packet and Team 04 accepted the narrowed QA plan. Implementation is limited to canonical run-level review disposition plus shared saved-list/detail reason summary.
- `CF-W1-STRAT-02A` was promoted, implemented, accepted through QA/review/Architect/delegated PO gates, and locally committed on its Team 06 branch as `359d0a3`.
- `CF-W1-DQ-02A` was promoted, implemented, accepted through QA/review/Architect/delegated PO gates, and locally committed on its Team 05 branch as `c2d6753`.
- `CF-W1-UX-01A` was promoted, implemented, accepted through QA/review/Architect/delegated PO gates, and locally committed on its Team 08 branch as `246d5a3`.

`CF-W1-SQLAB-01` was promoted by Team 00 on 2026-05-18 and assigned to Team 06 in a dedicated worktree for bounded backend-only Signal Quality Lab implementation.

`CF-W1-SQLAB-02A` is active in Team 04 QA planning for the no-schema Signal Quality Lab preview child. It is not a Ready item yet.

`CF-W1-L3-TREV-01` was promoted by Team 00 on 2026-05-18 and assigned to Team 07 in a dedicated worktree for bounded Today Review implementation.

`CF-W1-L3-PORT-01A` was pulled by Team 07, implemented in its dedicated worktree, and moved through first-pass QA / Code Review. Team 10 rejected release acceptance and routed bounded rework back to Team 07. It remains uncommitted and unaccepted.

`CF-W1-TP-01B` already has an implementation handoff in the Team 06 worktree and is routed to Team 10 review.

`CF-W1-NOTIF-02` is promoted and pulled by Team 09 for bounded implementation in a dedicated worktree.

`CF-W1-L3-ALERT-01` is promoted and pulled by Team 07 for bounded implementation in a dedicated worktree. It must not run in parallel with `CF-W1-L3-AUTH-03` because both reserve alerts-monitoring files.

`CF-W1-MD-01` was promoted and pulled by Team 05 for a narrowed backend-only reject-only Market Data validator child. QA, Team 10 review, Architect Signoff, delegated PO acceptance, and scoped local commit are complete on the Team 05 branch.

`CF-W1-AUTH-SUB-01` was promoted, implemented, accepted through QA/review/Architect/delegated PO gates, and locally committed on its Team 09 branch as `354499d`.

`CF-W1-SIG-TRIGGER-02A` is promoted and assigned to Team 06 for bounded backend-only Signal Generation trigger-audit surfacing in a dedicated worktree.

`CF-W1-SIG-TRIGGER-02A` completed QA, Team 10 review, Architect Signoff, delegated PO acceptance, and scoped local branch commit `788c237`; it is parked for later clean integration.

`CF-W1-SMI-01` completed QA reruns, Team 10 rereviews, Architect Re-Signoff, delegated PO acceptance, and scoped local branch commit `aee7c49`; it is parked for later clean integration.

`CF-W1-MD-03` completed QA, Team 10 review, Architect Signoff, delegated PO acceptance, and scoped local branch commit `58c5404`; it is parked for later clean integration.

`CF-W1-MCTX-01` completed QA rerun, Team 10 review, Architect Signoff, delegated PO acceptance, and scoped local branch commit `e695f0c`; it is parked for later clean integration.

## Pulled / In Review

| ID | Owner | Branch | Worktree | Scope | Status |
| --- | --- | --- | --- | --- | --- |
| `CF-W1-STRAT-02A` | Team 06 - Strategy / Signal / Risk | `codex/team06-strategy-signal/CF-W1-STRAT-02A` | `../investment-scanner-worktrees/team06-CF-W1-STRAT-02A` | No-schema Strategy Framework rule metadata and DQ gate trust exposure | Accepted and locally committed as `359d0a3`; awaiting later clean `dev` integration |
| `CF-W1-UX-01A` | Team 08 - UX / Research / Copilot | `codex/team08-ux-research/CF-W1-UX-01A` | `../investment-scanner-worktrees/team08-CF-W1-UX-01A` | Frontend-only Stock Research Workbench trust framing from current page evidence | Accepted and locally committed as `246d5a3`; awaiting later clean `dev` integration |
| `CF-W1-DQ-02A` | Team 05 - Market Data / Data Quality | `codex/team05-market-data/CF-W1-DQ-02A` | `../investment-scanner-worktrees/team05-CF-W1-DQ-02A` | Backend-only DQE currentness evidence and fail-closed propagation | Accepted and locally committed as `c2d6753`; awaiting later clean `dev` integration |
| `CF-W1-BT-02` | Team 06 - Strategy / Signal / Risk | `codex/team06-strategy-signal/CF-W1-BT-02` | `../investment-scanner-worktrees/team06-CF-W1-BT-02` | Backtesting canonical review disposition and saved-list/detail reason-summary normalization | Accepted and locally committed as `bb49ce2`; awaiting later clean `dev` integration |
| `CF-W1-HCTX-01` | Team 05 - Market Data / Data Quality | `codex/team05-market-data/CF-W1-HCTX-01` | `../investment-scanner-worktrees/team05-CF-W1-HCTX-01` | Backend-only Historical Context lookup explainability and provenance labeling | Promoted and assigned to Team 05 |
| `CF-W1-CAL-01` | Team 06 - Strategy / Signal / Risk | `codex/team06-strategy-signal/CF-W1-CAL-01` | `../investment-scanner-worktrees/team06-CF-W1-CAL-01` | Backend-only Signal Calibration readiness trust-state and DQ hard-block framing | Accepted and locally committed as `fd3d464`; awaiting later clean `dev` integration |
| `CF-W1-L3-PORT-01A` | Team 07 - Portfolio / Watchlist / Alerts | `codex/team07-portfolio-alerts/CF-W1-L3-PORT-01A` | `../investment-scanner-worktrees/team07-CF-W1-L3-PORT-01A` | Backend-only portfolio-management readiness DTOs | Rejected / Rework after Team 10 review; Team 07 revision pending |
| `CF-W1-TP-01B` | Team 06 - Strategy / Signal / Risk | `codex/team06-strategy-signal/CF-W1-TP-01B` | `../investment-scanner-worktrees/team06-CF-W1-TP-01B` | Backend-only Trade Plan DQ hard-block and target compatibility | Implemented in worktree; Team 10 review pending |
| `CF-W1-NOTIF-02` | Team 09 - Platform / Auth / Subscription / Notifications | `codex/team09-platform/CF-W1-NOTIF-02` | `../investment-scanner-worktrees/team09-CF-W1-NOTIF-02` | Backend-only local notification log redaction | Ready and pulled by Team 09 for implementation |
| `CF-W1-L3-ALERT-01` | Team 07 - Portfolio / Watchlist / Alerts | `codex/team07-portfolio-alerts/CF-W1-L3-ALERT-01` | `../investment-scanner-worktrees/team07-CF-W1-L3-ALERT-01` | Backend-only alert readiness suppression | Ready and pulled by Team 07 for implementation |
| `CF-W1-MD-01` | Team 05 - Market Data / Data Quality | `codex/team05-market-data/CF-W1-MD-01` | `../investment-scanner-worktrees/team05-CF-W1-MD-01` | Backend-only reject-only historical-price validator hardening | Accepted and locally committed as `913b56b`; awaiting later clean `dev` integration |
| `CF-W1-L3-TREV-01` | Team 07 - Portfolio / Watchlist / Alerts | `codex/team07-portfolio-alerts/CF-W1-L3-TREV-01` | `../investment-scanner-worktrees/team07-CF-W1-L3-TREV-01` | Today Review run/list publication evidence and readiness-coherence normalization | Ready and assigned to Team 07 |
| `CF-W1-SQLAB-01` | Team 06 - Strategy / Signal / Risk | `codex/team06-strategy-signal/CF-W1-SQLAB-01` | `../investment-scanner-worktrees/team06-CF-W1-SQLAB-01` | Backend-only Signal Quality Lab outcome-confidence metadata | Ready and assigned to Team 06 |
| `CF-W1-AUTH-SUB-01` | Team 09 - Platform / Auth / Subscription / Notifications | `codex/team09-platform/CF-W1-AUTH-SUB-01` | `../investment-scanner-worktrees/team09-CF-W1-AUTH-SUB-01` | Combined backend-only auth fail-closed and admin/manual subscription controller-policy slice | Accepted and locally committed as `354499d`; awaiting later clean `dev` integration |
| `CF-W1-SIG-TRIGGER-02A` | Team 06 - Strategy / Signal / Risk | `codex/team06-strategy-signal/CF-W1-SIG-TRIGGER-02A` | `../investment-scanner-worktrees/team06-CF-W1-SIG-TRIGGER-02A` | Backend-only Signal Generation trigger-audit surfacing and provenance labeling | Ready and assigned to Team 06 |
| `CF-W1-TP-02` | Team 06 - Strategy / Signal / Risk | `codex/team06-strategy-signal/CF-W1-TP-02` | `../investment-scanner-worktrees/team06-CF-W1-TP-02` | Backend-only Trade Plan structured exit/invalidation semantics | Ready and assigned to Team 06; branch must be based on accepted `CF-W1-TP-01B` commit `8ff22fd` |
| `CF-W1-SMI-01` | Team 06 - Strategy / Signal / Risk | `codex/team06-strategy-signal/CF-W1-SMI-01` | `../investment-scanner-worktrees/team06-CF-W1-SMI-01` | Backend-only Smart Money evidence freshness and partial-trust framing | Ready and assigned to Team 06; can run in parallel with TP-02 rework because files are disjoint |

## Active Ready Handoff - `CF-W1-BT-02`

Date promoted: 2026-05-18

Team 00 evaluated `CF-W1-BT-02` against Ready gates and promoted it as an independent Team 06 implementation slice.

Gate evidence:

- Requirement: `10-requirements/CF-W1-BT-02-backtesting-outcome-review-traceability-requirement.md`
- Architecture review: `03-architecture/CF-W1-BT-02-architecture-review.md`
- Contract: `06-contracts/CF-W1-BT-02-backtesting-outcome-review-traceability-contract.md`
- Work packet: `08-work-packets/CF-W1-BT-02-work-packet.md`
- QA plan: `04-qa/CF-W1-BT-02-qa-plan.md`
- Team 03 architecture outbox: `17-team-outboxes/TEAM-03-architecture-factory.md`
- Team 04 QA outbox: `17-team-outboxes/TEAM-04-qa-factory.md`
- Open decisions: none.
- Developer validation replay evidence: focused backend Today Review test passed, backend build passed, frontend build passed, and Today Review Playwright smoke passed against the worktree-built frontend server.
- Shared/high-risk blocker: none if implementation stays inside the reserved backend module and feature-local frontend files.

Branch/worktree:

- Branch: `codex/team06-strategy-signal/CF-W1-BT-02`
- Worktree: `../investment-scanner-worktrees/team06-CF-W1-BT-02`

Allowed files:

- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.types.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.md`
- `backend/tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.test.ts`
- `frontend/src/features/backtesting-strategy-lab/types.ts`
- `frontend/src/features/backtesting-strategy-lab/components/BacktestingStrategyLabPage.tsx`
- `frontend/tests/ui/backtesting-strategy-lab.spec.ts`

Allowed branch-local evidence docs:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-06-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-BT-02-developer-handoff.md`

Forbidden files:

- Prisma schema or migrations
- generated files
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.repository.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.controller.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.router.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.validation.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.module.ts`
- `backend/src/modules/backtesting-strategy-lab/index.ts`
- backend or frontend route registries
- `backend/src/modules/strategy-framework/**`
- `backend/src/modules/trade-plan-risk-engine/**`
- `frontend/src/features/backtesting-strategy-lab/api/**`
- `frontend/src/features/backtesting-strategy-lab/hooks/**`
- `frontend/src/features/backtesting-strategy-lab/routes.tsx`
- shared backend utilities
- shared frontend components
- package manifests
- providers, startup/backfill, live-provider, paid/cloud, telemetry, broker, or historical docs

Required behavior:

- add additive run-level review-disposition fields equivalent to `TRUSTED_REVIEW`, `PARTIAL_REVIEW`, `DIAGNOSTIC_ONLY`, `LEGACY_REPAIRED`, and `WITHHELD`;
- add one concise reason summary and specific reason list derived from current module evidence;
- derive review disposition only from existing availability, calculation-audit, coverage, benchmark, exit-diagnostic, and trade-count evidence;
- make the saved-run list and selected-run detail show the same disposition label and reason summary for the same run;
- preserve existing benchmark, availability, data-coverage, exit-diagnostic, realism-warning, and calculation-audit evidence;
- preserve registered and custom-run execution behavior, routes, query params, and current payload fields;
- keep research-support language and avoid direct advice, target-price, guarantee, broker, or automation wording.

Focused validation guidance:

```powershell
cd backend
npm.cmd test -- backtesting-strategy-lab.service.test.ts --runInBand
npm.cmd run build
```

If frontend files are changed:

```powershell
cd frontend
npm.cmd run test:ui -- backtesting-strategy-lab.spec.ts --workers=1
npm.cmd run build
```

Stop and return to Team 00 if implementation requires any forbidden file, schema/generated/route/shared changes, `strategy-framework` or `trade-plan-risk-engine` source edits, frontend API/hook/route changes, simulation math changes, benchmark math changes, route-contract changes, shared UI, cross-module source changes, or trade-level structured rule-ID expansion.

## Active Ready Handoff - `CF-W1-HCTX-01`

Date promoted: 2026-05-18

Team 00 evaluated `CF-W1-HCTX-01` against Ready gates and promoted it as an independent Team 05 backend-only implementation slice.

Gate evidence:

- Requirement: `10-requirements/CF-W1-HCTX-01-historical-context-explainability-requirement.md`
- Architecture review: `03-architecture/CF-W1-HCTX-01-architecture-review.md`
- Contract: `06-contracts/CF-W1-HCTX-01-historical-context-explainability-contract.md`
- Work packet: `08-work-packets/CF-W1-HCTX-01-work-packet.md`
- QA plan: `04-qa/CF-W1-HCTX-01-qa-plan.md`
- Team 03 architecture outbox: `17-team-outboxes/TEAM-03-architecture-factory.md`
- Open decisions: none.
- Shared/high-risk blocker: none if implementation stays inside the reserved backend module files.

Branch/worktree:

- Branch: `codex/team05-market-data/CF-W1-HCTX-01`
- Worktree: `../investment-scanner-worktrees/team05-CF-W1-HCTX-01`

Allowed files:

- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.service.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.types.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.md`
- `backend/tests/modules/historical-context-snapshots/historical-context-snapshots.service.test.ts`

Allowed branch-local evidence docs:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-05-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-HCTX-01-developer-handoff.md`

Forbidden files:

- Prisma schema or migrations
- generated files
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.repository.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.controller.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.router.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.validation.ts`
- `backend/src/modules/historical-context-snapshots/index.ts`
- backend or frontend route registries
- `backend/src/modules/market-context-intelligence/**`
- `backend/src/modules/smart-money-intelligence/**`
- `backend/src/modules/market-data-foundation/**`
- `backend/src/modules/signal-calibration-engine/**`
- shared backend utilities or shared DTOs
- shared frontend components
- frontend source or tests
- package manifests
- providers, startup/backfill, live-provider, Angel One, broker, paid/cloud, telemetry, or automation flows

Required behavior:

- add additive lookup explainability metadata for market, sector, country, smart-money, and data-quality selection evidence;
- distinguish exact-date, nearest-prior, missing-within-lookback, metadata-gap, and not-requested states;
- expose requested date, lookback days, region, asset type, selected snapshot date, lag days, per-slice source, top-level selected nearest snapshot date, max lag, partial flag, and concise research-support summary;
- preserve current lookup fields, route behavior, query behavior, `dataStatus`, and `gaps[]`;
- do not add a second repository search to distinguish never-generated from older-than-lookback evidence;
- do not edit upstream producers or downstream consumers in this slice.

Focused validation guidance:

```powershell
cd backend
npm.cmd test -- historical-context-snapshots.service.test.ts --runInBand
npm.cmd run build
```

Stop and return to Team 00 if implementation requires repository/controller/router/validation/index edits, schema/generated/route/shared/package/frontend/provider/startup/live changes, upstream Market Context, Smart Money, Market Data, Signal Calibration, or Signal Quality source changes, or a semantic rewrite of nearest-snapshot lookup.

## Active Ready Handoff - `CF-W1-CAL-01`

Date promoted: 2026-05-18

Team 00 evaluated `CF-W1-CAL-01` against Ready gates and promoted it as an independent Team 06 backend-only implementation slice.

Gate evidence:

- Requirement: `10-requirements/CF-W1-CAL-01-signal-calibration-reliability-drift-requirement.md`
- Architecture review: `03-architecture/CF-W1-CAL-01-architecture-review.md`
- Contract: `06-contracts/CF-W1-CAL-01-signal-calibration-reliability-drift-contract.md`
- Work packet: `08-work-packets/CF-W1-CAL-01-work-packet.md`
- QA plan: `04-qa/CF-W1-CAL-01-qa-plan.md`
- Team 03 architecture outbox: `17-team-outboxes/TEAM-03-architecture-factory.md`
- Team 04 QA outbox: `17-team-outboxes/TEAM-04-qa-factory.md`
- Open decisions: none.
- Shared/high-risk blocker: none if implementation stays inside the reserved `signal-calibration-engine` files.

Branch/worktree:

- Branch: `codex/team06-strategy-signal/CF-W1-CAL-01`
- Worktree: `../investment-scanner-worktrees/team06-CF-W1-CAL-01`

Allowed files:

- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.service.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.types.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.md`
- `backend/tests/modules/signal-calibration-engine/signal-calibration-engine.service.test.ts`

Optional only if endpoint-level additive payload assertions are needed:

- `backend/tests/modules/signal-calibration-engine/signal-calibration-engine.routes.test.ts`

Allowed branch-local evidence docs:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-06-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-CAL-01-developer-handoff.md`

Forbidden files:

- `backend/src/modules/signal-calibration-engine/index.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.repository.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.controller.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.router.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.validation.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.module.ts`
- `backend/src/modules/signal-quality-lab/**`
- `backend/src/modules/data-quality-engine/**`
- `backend/src/modules/historical-context-snapshots/**`
- Prisma schema or migrations
- backend or frontend route registries
- shared backend utilities or shared DTOs
- shared frontend components
- package manifests
- generated files
- frontend source/tests
- providers, startup/backfill, live-provider, Angel One, broker, paid/cloud, telemetry, or automation flows

Required behavior:

- add additive calibration trust-state metadata inside existing `calibrationReadiness`;
- represent trusted, limited, diagnostic-only, unavailable-no-evidence, and unavailable-blocking-DQ states;
- fail closed for `eligibleForCalibration=false`, `eligibleForSignals=false`, `NOT_READY`, `UNUSABLE`, and `ILLIQUID`;
- preserve existing score math, readiness/evidence fields, route behavior, response compatibility, and research-support language;
- do not change Signal Quality Lab, Data Quality Engine, Historical Context, route contracts, schema, frontend, shared files, packages, or generated files.

Focused validation command:

```powershell
cd backend
npm.cmd test -- signal-calibration-engine.service.test.ts --runInBand
npm.cmd run build
```

If route-level payload assertions are added:

```powershell
cd backend
npm.cmd test -- signal-calibration-engine.service.test.ts signal-calibration-engine.routes.test.ts --runInBand
```

Stop and return to Team 00 if implementation requires any forbidden file, DQE/HCTX/SQLAB source changes, schema/generated/route/shared/package/frontend/provider/startup/live-provider scope, score-math rewrites, or vague missing-DQ/blocking-DQ messaging that does not preserve the QA-plan distinctions.

## Active Ready Handoff - `CF-W1-AUTH-SUB-01`

Date promoted: 2026-05-18

Team 00 evaluated `CF-W1-AUTH-01` and `CF-W1-SUB-01` against Ready gates and promoted one combined Team 09 backend-only controller-policy slice to avoid overlapping subscription controller/test/doc writers.

Gate evidence:

- Auth requirement: `10-requirements/CF-W1-AUTH-01-platform-auth-default-user-fallback-requirement.md`
- Subscription requirement: `10-requirements/CF-W1-SUB-01-local-manual-subscription-plan-policy-requirement.md`
- Auth contract: `06-contracts/CF-W1-AUTH-01-platform-auth-fail-closed-contract.md`
- Subscription contract: `06-contracts/CF-W1-SUB-01-manual-subscription-plan-policy-contract.md`
- Auth work packet: `08-work-packets/CF-W1-AUTH-01-work-packet.md`
- Subscription work packet: `08-work-packets/CF-W1-SUB-01-work-packet.md`
- Combined work packet: `08-work-packets/CF-W1-AUTH-SUB-01-combined-controller-policy-work-packet.md`
- Combined QA plan: `04-qa/CF-W1-AUTH-SUB-01-controller-policy-qa-plan.md`
- Team 09 readiness evidence: `17-team-outboxes/TEAM-09-outbox.md`
- Open decisions: none.
- Shared-file conflict: resolved by one combined Team 09 writer.

Branch/worktree:

- Branch: `codex/team09-platform/CF-W1-AUTH-SUB-01`
- Worktree: `../investment-scanner-worktrees/team09-CF-W1-AUTH-SUB-01`

Allowed files:

- `backend/src/modules/subscription-billing/subscription-billing.controller.ts`
- `backend/src/modules/notifications-delivery/notifications-delivery.controller.ts`
- `backend/tests/modules/subscription-billing/subscription-billing.controller.test.ts`
- `backend/tests/modules/notifications-delivery/notifications-delivery.controller.test.ts`
- `backend/src/modules/subscription-billing/subscription-billing.md`
- `backend/src/modules/notifications-delivery/notifications-delivery.md`

Allowed branch-local evidence docs:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-09-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-AUTH-SUB-01-developer-handoff.md`

Forbidden files:

- `backend/src/modules/auth-identity/**`
- shared auth middleware
- backend route registries
- subscription or notification routers
- subscription or notification services, repositories, providers, or validation files
- Prisma schema or migrations
- shared backend utilities or shared DTOs
- frontend files, routes, or shared UI
- package manifests
- generated files
- backend server or env-example files
- provider startup/backfill, live-provider, paid/cloud, broker, telemetry, or credential flows

Required behavior:

- protected subscription controller actions fail closed when `req.user.id` is missing;
- protected notification controller actions fail closed when `req.user.id` is missing;
- protected controllers must not call services with `default-user`;
- authenticated controller actions pass the actual `req.user.id`;
- ordinary users cannot self-change plans or self-select `ADMIN`;
- admin/manual plan update remains guarded by `ADMIN_API_KEY`;
- subscription/notification docs describe the controller policy and frontend subscription UI limitation.

Focused validation command:

```powershell
cd backend
npm.cmd test -- subscription-billing.controller.test.ts notifications-delivery.controller.test.ts --runInBand
npm.cmd run build
```

Stop and return to Team 00 if implementation requires auth middleware, route registries, routers, services, repositories, providers, validation files, Prisma/schema/migrations, shared utilities/UI, frontend, package/generated/server/env files, paid/cloud/live-provider/startup/backfill/broker/telemetry/credential scope, or changing public route paths.

## Active Ready Handoff - `CF-W1-SQLAB-01`

Date promoted: 2026-05-18

Team 00 evaluated `CF-W1-SQLAB-01` against Ready gates and promoted it as an independent Team 06 backend-only Signal Quality Lab implementation slice.

Gate evidence:

- Requirement: `10-requirements/CF-W1-SQLAB-01-signal-quality-outcome-confidence-requirement.md`
- Architecture review: `03-architecture/CF-W1-SQLAB-01-architecture-review.md`
- Contract: `06-contracts/CF-W1-SQLAB-01-signal-quality-outcome-confidence-contract.md`
- Work packet: `08-work-packets/CF-W1-SQLAB-01-work-packet.md`
- QA plan: `04-qa/CF-W1-SQLAB-01-qa-plan.md`
- Open decisions: none.
- Shared/high-risk blocker: none if implementation stays inside reserved `signal-quality-lab` service/types/doc/test files.

Branch/worktree:

- Branch: `codex/team06-strategy-signal/CF-W1-SQLAB-01`
- Worktree: `../investment-scanner-worktrees/team06-CF-W1-SQLAB-01`

Allowed files:

- `backend/src/modules/signal-quality-lab/signal-quality-lab.service.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.types.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.md`
- `backend/tests/modules/signal-quality-lab/signal-quality-lab.service.test.ts`

Optional only if endpoint-level additive response assertions are added:

- `backend/tests/modules/signal-quality-lab/signal-quality-lab.routes.test.ts`

Forbidden files:

- Prisma schema or migrations
- `backend/src/modules/signal-quality-lab/signal-quality-lab.repository.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.controller.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.router.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.validation.ts`
- Data Quality Engine source or exports
- Signal Generation, Signal Calibration, Strategy Decision, or Trade Plan source/tests
- backend and frontend route registries
- shared backend utilities or shared DTOs
- shared frontend components
- package manifests
- generated files
- frontend source/tests
- providers, startup/backfill, live-provider, Angel One, broker, paid/cloud, telemetry, or automation flows

Required behavior:

- add additive outcome-confidence metadata that distinguishes `TRUSTED`, `LIMITED`, `DIAGNOSTIC`, and `UNTRUSTED`;
- derive those states from existing selected-horizon evidence and Data Quality evaluation presence/blockers;
- preserve existing evidence diagnostics, grouped metric statuses, `recommendedAction`, warnings, and summary/group payload compatibility;
- do not make DQ required by default or change query/filter behavior in this slice;
- preserve research-support wording and avoid direct advice, target-price framing, broker, or automation wording.

Focused validation guidance:

```powershell
cd backend
npm.cmd test -- signal-quality-lab.service.test.ts --runInBand
npm.cmd run build
```

If route-level additive assertions are added:

```powershell
cd backend
npm.cmd test -- signal-quality-lab.service.test.ts signal-quality-lab.routes.test.ts --runInBand
```

## Active Ready Handoff - `CF-W1-UX-01A`

Date promoted: 2026-05-18

Team 00 evaluated the narrowed `CF-W1-UX-01A` child against Ready gates and promoted it as an independent Team 08 frontend-only implementation slice.

Gate evidence:

- Requirement: `10-requirements/CF-W1-UX-01-stock-research-workbench-trust-surfaces-requirement.md`
- Architecture review: `03-architecture/CF-W1-UX-01-architecture-review.md`
- Contract: `06-contracts/CF-W1-UX-01-stock-research-workbench-trust-surfaces-contract.md`
- Work packet: `08-work-packets/CF-W1-UX-01-work-packet.md`
- QA plan: `04-qa/CF-W1-UX-01-qa-plan.md`
- UX source mapping: `09-summaries/CF-W1-UX-01-ux-source-mapping.md`
- Team 08 reservation acceptance: `17-team-outboxes/TEAM-08-outbox.md`
- Open decisions: none.
- Shared/high-risk blocker: none if implementation stays inside the reserved Stock Research Workbench frontend files and does not edit downstream widget internals.

Branch/worktree:

- Branch: `codex/team08-ux-research/CF-W1-UX-01A`
- Worktree: `../investment-scanner-worktrees/team08-CF-W1-UX-01A`

Allowed files:

- `frontend/src/features/stock-research-workbench/components/StockResearchWorkbenchPage.tsx`
- `frontend/src/features/stock-research-workbench/types.ts`
- `frontend/tests/ui/stock-research-workbench.spec.ts`

Forbidden files:

- `backend/src/modules/stock-research-workbench/**`
- backend tests
- `frontend/src/features/stock-research-workbench/api/stockResearchWorkbenchService.ts`
- `frontend/src/features/signal-generation-engine/**`
- `frontend/src/features/strategy-decision-engine/**`
- shared frontend components
- frontend route registries or navigation metadata
- backend route registries
- Prisma schema or migrations
- package manifests
- generated files
- providers, startup/backfill, live-provider, Angel One, broker, paid/cloud, telemetry, or automation flows

Required behavior:

- derive page trust framing only from existing Workbench response fields plus currently requested `region` / `assetType` from market scope;
- show requested scope only as requested/unverified scope, not as verified scope;
- map `COMPLETE` to limited research context, not trusted or ready context;
- map `PARTIAL` and `DELAYED` to limited context with visible warning reasons;
- map `MISSING` and `ERROR` to blocked context with visible blocker reasons and page-owned downstream widget suppression;
- keep Signal and Strategy widgets unmodified;
- do not claim DQ readiness, latest trusted data date, downstream eligibility, reliability, or action readiness;
- preserve existing loading, error, chart, fundamentals, valuation, peers, and corporate-action empty states;
- use research-support language only.

Focused validation guidance:

```powershell
cd frontend
npm.cmd run build
npm.cmd run test:ui -- stock-research-workbench.spec.ts --workers=1
```

Stop and return to Team 00 if implementation requires backend DTO or endpoint changes, API service changes, SignalWidget or StrategyDecisionWidget edits, shared UI, routes/navigation, package changes, generated files, or new trust fields that current source cannot prove.

## Active Ready Handoff - `CF-W1-L3-TREV-01`

Date promoted: 2026-05-18

Team 00 evaluated `CF-W1-L3-TREV-01` against Ready gates and promoted it as an independent Team 07 Today Review implementation slice.

Gate evidence:

- Requirement: `10-requirements/CF-W1-L3-TREV-01-today-review-publication-evidence-requirement.md`
- Architecture review: `03-architecture/CF-W1-L3-TREV-01-architecture-review.md`
- Contract: `06-contracts/CF-W1-L3-TREV-01-today-review-publication-evidence-contract.md`
- Work packet: `08-work-packets/CF-W1-L3-TREV-01-work-packet.md`
- QA plan: `04-qa/CF-W1-L3-TREV-01-qa-plan.md`
- Open decisions: none.
- Shared/high-risk blocker: none if implementation stays inside the reserved Today Review backend/feature/test files.

Branch/worktree:

- Branch: `codex/team07-portfolio-alerts/CF-W1-L3-TREV-01`
- Worktree: `../investment-scanner-worktrees/team07-CF-W1-L3-TREV-01`

Allowed files:

- `backend/src/modules/today-trade-review/today-trade-review.service.ts`
- `backend/src/modules/today-trade-review/today-trade-review.repository.ts`
- `backend/src/modules/today-trade-review/today-trade-review.types.ts`
- `backend/src/modules/today-trade-review/today-trade-review.md`
- `backend/tests/modules/today-trade-review/today-trade-review.service.test.ts`
- `frontend/src/features/today-trade-review/types.ts`
- `frontend/src/features/today-trade-review/components/TodayReviewPage.tsx`
- `frontend/tests/ui/today-trade-review.spec.ts`

Optional only if repository legacy-read-path synthesis is added:

- `backend/tests/modules/today-trade-review/today-trade-review.repository.test.ts`

Forbidden files:

- Prisma schema or migrations
- backend or frontend route registries
- Market Data Foundation, Data Quality Engine, Strategy Decision Engine, or Trade Plan source/tests
- Today Review controller, router, validation, controller tests, API hooks, and candidate-detail page
- shared backend utilities or shared DTOs
- shared frontend components
- package manifests
- generated files
- providers, startup/backfill, live-provider, Angel One, broker, paid/cloud, telemetry, or automation flows

Required behavior:

- add stable additive `publicationEvidence` metadata to the Today Review run `sourceSnapshot`;
- persist it for new runs without schema or route changes;
- synthesize equivalent evidence on read for legacy runs that lack it;
- expose run/list publication outcome, mode source, readiness state, trusted-universe availability, scan completion, membership-load status, failure reason, and outside-trusted-universe exclusion count;
- keep candidate detail read-only research support and do not widen candidate-detail run evidence in this slice;
- preserve outside-trusted-universe Strategy Decision exclusion from all Today Review candidate sections.

Focused validation guidance:

```powershell
cd backend
npm.cmd test -- today-trade-review.service.test.ts --runInBand
```

If repository synthesis is added:

```powershell
cd backend
npm.cmd test -- today-trade-review.service.test.ts today-trade-review.repository.test.ts --runInBand
```

If frontend files are edited:

```powershell
cd frontend
npm.cmd run test:ui -- today-trade-review.spec.ts --workers=1
npm.cmd run build
```

Backend build after backend changes:

```powershell
cd backend
npm.cmd run build
```

## Active Ready Handoff - `CF-W1-MD-01`

Date promoted: 2026-05-18

Team 00 evaluated the narrowed `CF-W1-MD-01` child against Ready gates and promoted it as an independent Team 05 backend-only implementation slice.

Gate evidence:

- Requirement: `10-requirements/CF-W1-MD-01-market-data-validation-hardening-policy-requirement.md`
- Architecture contract: `06-contracts/CF-W1-MD-01-market-data-validation-hardening-contract.md`
- Work packet: `08-work-packets/CF-W1-MD-01-work-packet.md`
- QA plan: `04-qa/CF-W1-MD-01-qa-plan.md`
- Team 05 readiness inspection: `17-team-outboxes/TEAM-05-outbox.md`
- Open decisions: none.
- Shared/high-risk blocker: none if implementation stays inside the three reserved Market Data validator/test/doc files.

Allowed files:

- `backend/src/modules/market-data-foundation/market-data-foundation.validation.ts`
- `backend/tests/modules/market-data-foundation/market-data.validation.test.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.md`

Forbidden files:

- Market Data repository, provider, adapter, Angel One provider, service, scheduler, worker, queue, router, controller, and types files
- Market Data readiness/storage invariant tests
- Data Quality Engine source/tests
- Prisma schema or migrations
- generated files
- route registries
- shared backend utilities
- package manifests
- providers, schedulers, startup/backfill, repair, sync, import, Angel One, broker, live-provider, paid/cloud, or telemetry flows
- frontend source, shared UI, or Playwright tests
- durable readiness storage or natural-key implementation under `CF-W1-MD-02`

Required behavior:

- reject future-dated candles using validator-local, backward-compatible boundary behavior;
- reject invalid present `adjustedClose` values;
- keep negative volume invalid;
- preserve duplicate-row determinism;
- keep spike rejection opt-in and off by default.

Explicitly deferred:

- missing `adjustedClose` fallback/incomplete evidence;
- zero/suspicious-volume warning/readiness evidence;
- repository/provider/startup plumbing for a formal latest-session boundary.

Focused validation command:

```powershell
cd backend
npm.cmd test -- market-data.validation.test.ts --runInBand
npm.cmd run build
```

## Active Ready Handoff - `CF-W1-L3-ALERT-01`

Date promoted: 2026-05-18

Team 00 evaluated `CF-W1-L3-ALERT-01` against Ready gates and promoted it as an independent Team 07 backend-only implementation slice.

Gate evidence:

- Requirement: `10-requirements/CF-W1-L3-ALERT-01-alert-readiness-suppression-requirement.md`
- Architecture review: `03-architecture/CF-W1-L3-ALERT-01-architecture-review.md`
- Contract: `06-contracts/CF-W1-L3-ALERT-01-alert-readiness-suppression-contract.md`
- Work packet: `08-work-packets/CF-W1-L3-ALERT-01-work-packet.md`
- QA plan: `04-qa/CF-W1-L3-ALERT-01-qa-plan.md`
- Team 03 reservation matrix: `03-architecture/team03-near-ready-file-reservation-matrix-2026-05-18.md`
- Open decisions: none.
- Shared/high-risk blocker: none if implementation stays inside reserved alerts-monitoring files and does not run in parallel with `CF-W1-L3-AUTH-03`.

Allowed files:

- `backend/src/modules/alerts-monitoring/alerts-monitoring.service.ts`
- `backend/src/modules/alerts-monitoring/alerts-monitoring.types.ts`
- `backend/src/modules/alerts-monitoring/alerts-monitoring.md`
- `backend/tests/modules/alerts-monitoring/alerts-monitoring.service.test.ts`

Optional only if ownership-sensitive behavior is touched:

- `backend/tests/modules/alerts-monitoring/alerts-monitoring.ownership.test.ts`

Forbidden files:

- Prisma schema or migrations
- backend or frontend route registries
- shared backend utilities or shared DTOs
- shared frontend components
- package manifests
- generated files
- Data Quality Engine source or public exports
- Portfolio Management source/tests
- Watchlist Management source/tests
- Portfolio Intelligence source/tests
- notification or copilot digest consumers
- frontend files
- providers, startup/backfill, Angel One, broker, live-provider, paid/cloud, or telemetry flows

Focused validation command:

```powershell
cd backend
npm.cmd test -- alerts-monitoring.service.test.ts alerts-monitoring.validation.test.ts --runInBand
```

## Active Ready Handoff - `CF-W1-NOTIF-02`

Date promoted: 2026-05-18

Team 00 evaluated `CF-W1-NOTIF-02` against Ready gates and promoted it as an independent Team 09 backend-only implementation slice.

Gate evidence:

- Requirement: `10-requirements/CF-W1-NOTIF-02-notification-log-redaction-requirement.md`
- Architecture review: `03-architecture/CF-W1-NOTIF-02-architecture-review.md`
- Contract: `06-contracts/CF-W1-NOTIF-02-notification-log-redaction-contract.md`
- Work packet: `08-work-packets/CF-W1-NOTIF-02-work-packet.md`
- QA plan: `04-qa/CF-W1-NOTIF-02-qa-plan.md`
- Team 09 readiness evidence: `17-team-outboxes/TEAM-09-outbox.md`
- Open decisions: none.
- Shared/high-risk blocker: none if implementation stays inside the reserved provider/test/doc files.

Allowed files:

- `backend/src/modules/notifications-delivery/notifications-delivery.provider.ts`
- `backend/tests/modules/notifications-delivery/notifications-delivery.service.test.ts`
- `backend/src/modules/notifications-delivery/notifications-delivery.md`

Forbidden files:

- notification controller, service, repository, router, validation, or unrelated tests
- auth-identity source/tests
- subscription-billing source/tests
- Prisma schema or migrations
- backend or frontend route registries
- shared backend utilities or shared DTOs
- shared frontend components
- package manifests
- generated files
- frontend files
- backend/src/server.ts
- backend/.env.example
- external provider, SMTP implementation, provider startup, live provider, paid/cloud, broker, or telemetry flows

Focused validation command:

```powershell
cd backend
npm.cmd test -- notifications-delivery.service.test.ts --runInBand
```

## Active Ready Handoff - `CF-W1-L3-PORT-01A`

Date promoted: 2026-05-18

Current status: Pulled by Team 07; first developer handoff routed to Team 04 and Team 10 on 2026-05-18; Team 10 rejected for bounded rework on 2026-05-18.

Team 00 evaluated `CF-W1-L3-PORT-01A` against the Ready gates and promoted it as the first Lane 3 readiness implementation slice.

Gate evidence:

- Requirement: `10-requirements/CF-W1-L3-PORT-01A-portfolio-readiness-dto-requirement.md`
- Architecture review: `03-architecture/CF-W1-L3-PORT-01-architecture-review.md`
- Contract: `06-contracts/CF-W1-L3-PORT-01-portfolio-watchlist-readiness-dto-contract.md`
- Work packet: `08-work-packets/CF-W1-L3-PORT-01-work-packet.md`
- QA plan: `04-qa/CF-W1-L3-PORT-01-qa-plan.md`
- Team 03 reservation matrix: `03-architecture/team03-near-ready-file-reservation-matrix-2026-05-18.md`
- Team 07 readiness evidence: `17-team-outboxes/TEAM-07-outbox.md`
- Open decisions: none.
- Shared/high-risk blocker: none if the implementation stays within the reserved portfolio-management files and consumes Data Quality through public service outputs only.

Allowed files:

- `backend/src/modules/portfolio-management/portfolio-management.service.ts`
- `backend/src/modules/portfolio-management/portfolio-management.types.ts`
- `backend/src/modules/portfolio-management/portfolio-management.md`
- `backend/tests/modules/portfolio-management/portfolio-management.service.test.ts`

Forbidden files:

- Prisma schema or migrations
- backend or frontend route registries
- shared backend utilities or shared DTOs
- shared frontend components
- package manifests
- generated files
- Data Quality Engine source or public exports
- watchlist-management source/tests
- alerts-monitoring source/tests
- portfolio-intelligence source/tests
- frontend files
- providers, startup/backfill, Angel One, broker, live-provider, paid/cloud, or telemetry flows

Required behavior:

- Add module-local readiness DTO fields to portfolio holding valuation output.
- Add portfolio-level readiness summary to portfolio summary output.
- Preserve existing portfolio response fields, route paths, `dataStatus`, price, valuation, and signal fields.
- Consume `DataQualityEngineService` and `DataQualityEvaluationDto` only through Data Quality public exports.
- Do not duplicate Data Quality scoring, stale thresholds, liquidity scoring, or coverage scoring.
- Treat `READY` as trusted display/action eligibility only as defined by the accepted contract.
- Treat `LIMITED` as passive display only with visible reasons and blocked action eligibility.
- Treat missing, `NOT_READY`, `UNUSABLE`, stale hard blocker, unsupported, scope mismatch, or blocked tier evidence as blocked/untrusted.
- Ensure `dataStatus = COMPLETE` does not imply Data Quality trust.

Focused validation command:

```powershell
cd backend
npm.cmd test -- portfolio-management.service.test.ts --runInBand
```

Stop and return to Team 00 if implementation requires any forbidden file, Data Quality export/source changes, shared DTO/helper changes, watchlist scope, frontend/UI work, route/schema/package/generated changes, provider/startup/live-data behavior, or treating `LIMITED` as action-ready.

## Current Queue Notes

Team 00 consumed Team 01's 2026-05-18 readiness drift audit. That initial routing kept the ready queue closed, then this Team 00 Ready evaluation promoted `CF-W1-L3-PORT-01A` as the first active application-code item.

`CF-W1-L3-AUTH-01` was pulled by Team 07, implemented, validated, reviewed, accepted under standing delegation, committed locally as `74ba6dd`, and moved out of the live ready queue.

`CF-W1-L3-AUTH-02` was unblocked by Product Owner Option B, implemented, validated, reviewed, accepted under standing delegation, committed locally as `503bcd9`, and moved out of the live ready queue.

`CF-W1-SIG-TRIGGER-01` was unblocked by Product Owner Option A, implemented as an additive DTO projection, validated, reviewed, accepted under standing delegation, committed locally as `6ab3999`, and moved out of the live ready queue.

Product Owner resolved the three current Decision Inbox items on 2026-05-17:

- `CF-W1-L3-DQ-01`: Option B, passive `LIMITED` display with action-like blocking.
- `CF-W1-TP-01A`: Option B, backend-only compatibility direction.
- `CF-W1-MD-02`: Option B as ADR direction only, companion durable readiness/evidence storage.

Those decisions remove the Decision Inbox blockers, but they are not app-code implementation handoffs. The affected items still need post-decision child contracts, refreshed QA scenarios, exact file reservations, and Team 00 Ready promotion before any app-code team can pull them.

Post-decision child prep has advanced. Team 00 promoted one child item to Ready; the rest remain out of Ready:

- `CF-W1-L3-PORT-01A`: promoted to Ready as the portfolio-only readiness DTO child. Team 07 owns the bounded implementation in the dedicated branch/worktree recorded above.
- `CF-W1-L3-ALERT-01`: alert readiness suppression child architecture contract, Team 03 near-ready file-reservation matrix, exact backend reservations, and child QA plan are prepared; still needs Team 00 Ready promotion.
- `CF-W1-L3-AUTH-03`: alert rule target ownership requirement, architecture review, contract, work packet, and QA plan are prepared; still needs Team 00 Ready promotion.
- `CF-W1-L3-INTEL-01`: portfolio-intelligence reliability requirement, architecture review, contract, work packet, QA plan, and Team 03 signoff are prepared; still blocked until `CF-W1-L3-PORT-01A` is accepted and Team 00 promotes the child.
- `CF-W1-TP-01B`: Trade Plan backend-only compatibility/DQ hard-block child architecture contract, Team 03 near-ready file-reservation matrix, exact backend reservations, child QA plan, and Team 06 readiness inspection are prepared; still needs Team 00 Ready promotion.
- `CF-W1-NOTIF-02`: notification log redaction requirement, architecture review, contract, work packet, platform QA plan, and Team 03 near-ready file-reservation matrix are prepared; still needs Team 00/Team 09 Ready promotion.

Product Owner resolved the five current Decision Inbox items on 2026-05-18:

- `CF-W1-AUTH-01`: Option A, protected Team 09 controllers fail closed when `req.user.id` is missing.
- `CF-W1-SUB-01`: Option A, ordinary users may not self-change plan or self-select `ADMIN`; plan changes are admin/manual only.
- `CF-W1-UX-02`: Option B, first slice is Copilot-only with research-support naming and blocked narrative hidden.
- `CF-W1-UX-05`: Option A, first product-language cleanup is Copilot-only after or with the Copilot trust slice; shared `StatusBadge` remains future.
- `CF-W1-MD-01`: Option A, future-dated candles and invalid adjusted close are rejected; missing adjusted close is fallback/incomplete evidence; suspicious volume is warning evidence; spike rejection remains opt-in.

Those decisions remove the Decision Inbox blockers, but they are not app-code implementation handoffs. Team 03/04 have since prepared module-specific contract/work-packet and QA refreshes for the affected items; each still needs its remaining upstream owner check, exact Team 00 implementation handoff, and Ready promotion before any app-code team can pull it.

Newly resolved but still not Ready:

- `CF-W1-AUTH-01`: Team 03 contract/work packet and Team 04 QA refresh are prepared; needs Team 00 Ready promotion, Team 09 handoff, and sequencing/combining with `CF-W1-SUB-01` because subscription files overlap.
- `CF-W1-SUB-01`: Team 03 contract/work packet and Team 04 QA refresh are prepared; needs Team 00 Ready promotion, Team 09 handoff, and sequencing/combining with `CF-W1-AUTH-01` because subscription files overlap.
- `CF-W1-UX-02`: Team 03 Copilot-only contract/work packet and Team 04 QA refresh are prepared; needs Team 08 source-supported trust-field mapping, exact handoff, and Team 00 Ready promotion.
- `CF-W1-UX-05`: Team 03 Copilot-only contract/work packet and Team 04 QA refresh are prepared; needs folding into or sequencing after `CF-W1-UX-02`; shared UI remains forbidden.
- `CF-W1-MD-01`: Team 03 validation-only work packet and Team 04 QA refresh are prepared; needs Team 05 readiness acceptance, Team 00 Ready promotion, and no storage/provider/schema scope.

## Completed Slices Not Active For Pull

The following are completed, superseded, or split and must not be treated as active implementation work:

- `CF-W2-DQ-01`
- `CF-W2-SIG-01A`
- `CF-W1-SIG-01B`
- `CF-W1-SIG-LATEST-01`
- `CF-W1-STRAT-01`
- `CF-W1-QA-01`
- `CF-W1-L3-AUTH-01`
- `CF-W1-L3-AUTH-02`
- `CF-W1-SIG-TRIGGER-01`
- legacy parent `CF-W1-SIG-01`
- legacy parent/superseded `CF-W1-DQ-01`
- legacy parent `CF-W1-TP-01`

## Why Other Code Items Were Not Pulled

The remaining top findings still require at least one of:

- refreshed Architect child contract or ADR record,
- exact module-level file reservation,
- refreshed QA scenario matrix,
- source-changing implementation packet,
- schema/migration approval for future Market Data storage work,
- shared-file reservation,
- upstream dependency completion,
- focused QA plan.

Forcing implementation now would either preserve unsafe behavior with misleading tests or skip the required child-slice gates after Product Owner policy resolution.

## Next Safe Work

Docs-only contract and QA preparation should now follow the Product Owner corrected investor/trader-value order:

1. `CF-W1-BT-02`
2. `CF-W1-HCTX-01`
3. `CF-W1-MCTX-01`
4. `CF-W1-CAL-01`
5. `CF-W1-SQLAB-02`
6. `CF-W1-STRAT-02`
7. `CF-W1-DQ-02`
8. `CF-W1-TP-01B`
9. `CF-W1-MD-02`
10. `CF-W1-UX-01`

Platform, notification, auth/subscription, settings, and alert convenience items should not preempt this stack unless they block correctness, privacy, user-data safety, or an already accepted branch gate.

Next Team 00/owner work:

- `CF-W1-BT-02`: route Team 03 architecture/contract refresh, then Team 04 QA refresh.
- `CF-W1-HCTX-01`: prepare historical lookup provenance packet after `BT-02`.
- `CF-W1-MCTX-01`: prepare market context regime-evidence packet after `HCTX-01`.
- `CF-W1-CAL-01`: prepare calibration trust-drift packet after context evidence prep.
- `CF-W1-TP-01B`: reconcile branch/review state before any further Ready work.
- `CF-W1-MD-02`: continue ADR and split-packet prep only; no schema/source promotion.

No app-code item became Ready during decision resolution itself. `CF-W1-L3-PORT-01A` was later promoted by Team 00 after requirement, architecture, QA, reservation, and Team 07 readiness gates passed.

---

## Active Ready Handoff - `CF-W1-SIG-TRIGGER-02A`

Date promoted: 2026-05-18

Team 00 evaluated `CF-W1-SIG-TRIGGER-02A` against Ready gates and promoted it as an independent Team 06 backend-only implementation slice.

Gate evidence:

- Requirement: `10-requirements/CF-W1-SIG-TRIGGER-02-persisted-trigger-auditability-requirement.md`
- Architecture review: `03-architecture/CF-W1-SIG-TRIGGER-02-architecture-review.md`
- Contract: `06-contracts/CF-W1-SIG-TRIGGER-02-persisted-trigger-auditability-contract.md`
- Work packet: `08-work-packets/CF-W1-SIG-TRIGGER-02-work-packet.md`
- QA plan: `04-qa/CF-W1-SIG-TRIGGER-02A-qa-plan.md`
- Team 03 architecture outbox: `17-team-outboxes/TEAM-03-architecture-factory.md`
- Team 04 QA outbox: `17-team-outboxes/TEAM-04-qa-factory.md`
- Open decisions: none.
- Prior dependency: `CF-W1-SIG-TRIGGER-01` commit `6ab3999` is an ancestor of current `dev`; current source includes `triggerContract` projection.
- Shared/high-risk blocker: none if implementation stays inside the reserved `signal-generation-engine` files and backend tests.

Branch/worktree:

- Branch: `codex/team06-strategy-signal/CF-W1-SIG-TRIGGER-02A`
- Worktree: `../investment-scanner-worktrees/team06-CF-W1-SIG-TRIGGER-02A`

Allowed files:

- `backend/src/modules/signal-generation-engine/signal-generation-engine.types.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.repository.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.service.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.md`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.repository.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.service.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.trigger-contract.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-dq-enforcement.invariants.test.ts`

Allowed reporting docs:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-06-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-SIG-TRIGGER-02A-developer-handoff.md`

Forbidden files:

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- generated files
- backend/frontend route registries
- `backend/src/modules/signal-generation-engine/index.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.controller.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.router.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.validation.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.module.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.config.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.routes.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.validation.test.ts`
- all downstream module source, frontend source, shared utilities/UI, package manifests, provider/live-data, paid/cloud, broker, and telemetry files.

Required behavior:

- surface persisted `created_at` and `updated_at` for current `SignalResult` rows;
- expose additive run audit metadata when `generationRunId` resolves to a run row;
- label `trigger_timestamp` semantics as source-price-date, source-data-date, or unavailable;
- label transient `strategyMatches[]` provenance as compatibility-only;
- keep `trigger_price`, rule ids, timeframe, and unproven lifecycle state unavailable;
- preserve legacy incomplete handling and strict DQ trusted read/run/latest behavior.

Required validation after implementation:

```powershell
cd backend
npm.cmd test -- signal-generation-engine.repository.test.ts signal-generation-engine.service.test.ts signal-generation-engine.trigger-contract.test.ts signal-generation-dq-enforcement.invariants.test.ts --runInBand
npm.cmd run build
```

2026-05-18 acceptance update:

- `CF-W1-HCTX-01` completed Team 05 implementation, Team 04 QA, Team 10 review, Team 03 Architect Signoff, delegated PO acceptance, and scoped local branch commit `23b6c92`.
- The branch commit is parked for later clean integration and has not been pushed or merged to `dev`.

2026-05-18 Ready promotion result:

- `CF-W1-L3-PORT-01A` was promoted for Team 07 implementation in `codex/team07-portfolio-alerts/CF-W1-L3-PORT-01A`.
- Team 07 used `../investment-scanner-worktrees/team07-CF-W1-L3-PORT-01A`.
- The shared `dev` workspace contains unrelated active-doc changes from other teams; Team 07 implementation remains isolated in the dedicated worktree.

2026-05-18 Developer handoff routing result:

- `CF-W1-L3-PORT-01A` developer handoff was submitted from the Team 07 worktree.
- Team 04 owns QA Verification.
- Team 10 owns Code Review / Release Readiness precheck.
- No commit is authorized until QA, review, Architect Signoff, delegated PO acceptance, and Team 00 staged-scope verification pass.

2026-05-18 review result:

- Team 04 first-pass focused QA passed.
- Team 10 rejected release acceptance because automation-only Data Quality blockers can be treated as portfolio display hard blockers.
- Team 07 must revise within the existing file reservation and add the focused automation-blocked DQE case.
- Team 04 must rerun QA, then Team 10 must re-review.
- No Product Owner action is required unless the rework needs forbidden scope.

2026-05-18 routing result:

- `CF-W1-L3-PORT-01A`, `CF-W1-TP-01B`, `CF-W1-NOTIF-02`, and `CF-W1-L3-ALERT-01` are assigned back to Teams 02/03/04 and their lane teams for readiness inspection.
- `CF-W1-L3-INTEL-01` remains blocked behind accepted `CF-W1-L3-PORT-01A`.
- The stale completed-work inbox `16-team-inboxes/TEAM-07-CF-W1-L3-AUTH-01.md` must not be used as current Ready evidence.
- No application source/test implementation is authorized by this routing update.

2026-05-18 decision resolution result:

- Open decisions are zero.
- Product Owner action is not required.
- Daemon should continue autonomous work.
- No application-code item became Ready from the five policy resolutions.

## Ready Criteria Reminder

Move an app-code item here only when all of the following are proven:

- accepted requirement,
- accepted architecture contract or architecture review,
- accepted QA plan,
- exact allowed and forbidden file reservations,
- no unresolved Product Owner, Architect, QA, shared-file, schema, route, package, provider, or upstream blocker,
- local-first and zero-incremental-cost constraints preserved.

---

## Active Ready Handoff - `CF-W1-MCTX-01`

Date promoted: 2026-05-18

Team 00 evaluated `CF-W1-MCTX-01` against Ready gates and promoted it as an independent Team 05 implementation slice.

Gate evidence:

- Requirement: `10-requirements/CF-W1-MCTX-01-market-context-regime-evidence-requirement.md`
- Architecture review: `03-architecture/CF-W1-MCTX-01-architecture-review.md`
- Contract: `06-contracts/CF-W1-MCTX-01-market-context-regime-evidence-contract.md`
- Work packet: `08-work-packets/CF-W1-MCTX-01-work-packet.md`
- QA plan: `04-qa/CF-W1-MCTX-01-qa-plan.md`
- Open decisions: none.
- Shared/high-risk blocker: none if implementation stays inside the reserved `market-context-intelligence` backend and feature-local frontend files.

Branch/worktree:

- Branch: `codex/team05-market-data/CF-W1-MCTX-01`
- Worktree: `../investment-scanner-worktrees/team05-CF-W1-MCTX-01`

Allowed files:

- `backend/src/modules/market-context-intelligence/market-context-intelligence.service.ts`
- `backend/src/modules/market-context-intelligence/market-context-intelligence.types.ts`
- `backend/src/modules/market-context-intelligence/market-context-intelligence.md`
- `backend/tests/modules/market-context-intelligence/market-context-intelligence.service.test.ts`
- `frontend/src/features/market-context-intelligence/types.ts`
- `frontend/src/features/market-context-intelligence/components/MarketContextPage.tsx`
- `frontend/src/features/market-context-intelligence/components/MarketRegimeWidget.tsx`
- `frontend/tests/ui/market-context-intelligence.spec.ts`

Allowed reporting docs:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-05-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-MCTX-01-developer-handoff.md`

Forbidden files:

- Prisma schema or migrations
- generated files
- `backend/src/modules/market-context-intelligence/market-context-intelligence.repository.ts`
- `backend/src/modules/market-context-intelligence/market-context-intelligence.controller.ts`
- `backend/src/modules/market-context-intelligence/market-context-intelligence.router.ts`
- `backend/src/modules/market-context-intelligence/market-context-intelligence.validation.ts`
- `backend/src/modules/market-context-intelligence/index.ts`
- backend or frontend route registries
- `frontend/src/features/market-context-intelligence/routes.tsx`
- `frontend/src/features/market-context-intelligence/api/**`
- `frontend/src/features/market-context-intelligence/hooks/**`
- upstream/downstream module source, shared utilities/UI, package manifests, provider/live-data, startup/backfill, paid/cloud, broker, telemetry, and broad UX/navigation work.

Required behavior:

- add additive market-context evidence metadata for trustworthy, partial, low-evidence, and missing-evidence regime states;
- expose persisted-versus-fresh provenance explicitly;
- preserve exact fresh breadth denominators on the auto-generation path;
- mark persisted denominator reconstruction as derived and partial when exact SMA denominators are unavailable;
- keep macro explicitly missing with stable reason framing;
- render the evidence on existing Market Context page and Market Regime widget surfaces only;
- preserve current routes, query params, existing fields, and research-support language.

Required validation after implementation:

```powershell
cd backend
npm.cmd test -- market-context-intelligence.service.test.ts --runInBand
npm.cmd run build
```

```powershell
cd frontend
npm.cmd run test:ui -- market-context-intelligence.spec.ts --workers=1
npm.cmd run build
```

---

## Active Ready Handoff - `CF-W1-MD-03`

Date promoted: 2026-05-18

Team 00 evaluated `CF-W1-MD-03` against Ready gates and promoted it as an independent Team 05 backend-only Market Data implementation slice.

Gate evidence:

- Requirement: `10-requirements/CF-W1-MD-03-market-data-signoff-threshold-contract-requirement.md`
- Architecture review: `03-architecture/CF-W1-MD-03-architecture-review.md`
- Contract: `06-contracts/CF-W1-MD-03-market-data-signoff-threshold-contract.md`
- Work packet: `08-work-packets/CF-W1-MD-03-work-packet.md`
- QA plan: `04-qa/CF-W1-MD-03-qa-plan.md`
- Open decisions: none.
- Shared/high-risk blocker: none if implementation stays inside reserved Market Data service/doc/focused tests.

Branch/worktree:

- Branch: `codex/team05-market-data/CF-W1-MD-03`
- Worktree: `../investment-scanner-worktrees/team05-CF-W1-MD-03`

Allowed files:

- `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.md`
- `backend/tests/modules/market-data-foundation/market-data.service.test.ts`
- `backend/tests/modules/market-data-foundation/market-data.universe.test.ts`

Allowed reporting docs:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-05-CF-W1-MD-03-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-MD-03-developer-handoff.md`

Forbidden files:

- Prisma schema or migrations
- generated files
- Market Data repository, provider, validation, types, controller, router, scheduler, worker, and queue files
- Data Quality Engine source/tests
- route registries
- shared backend utilities
- package manifests
- frontend or shared UI files
- provider/live-data/startup/backfill redesign
- `CF-W1-MD-02A` and future `CF-W1-MD-02B` durable evidence/schema work
- paid/cloud, broker, telemetry, or credentials

Required behavior:

- add explicit universe signoff blockers for price coverage below `95%` and metadata coverage below `90%`;
- keep `downstreamAllowed=false` whenever either threshold misses;
- preserve existing review-ready minimum-count and `10%` review-ready-share gates;
- keep threshold blocker reasoning separate and specific;
- preserve current coverage fields, response shape, route behavior, and universe-state classification;
- update module docs for the enforced Universe Signoff threshold policy.

Required validation after implementation:

```powershell
cd backend
npm.cmd test -- market-data.service.test.ts market-data.universe.test.ts --runInBand
npm.cmd run build
```

---

## Active Ready Handoff - `CF-W1-BT-01A`

Date promoted: 2026-05-18

Team 00 evaluated `CF-W1-BT-01A` after Team 03 architecture reconciliation. The slice is promoted only as a characterization-only stacked implementation on accepted parked `CF-W1-BT-02`.

Sequencing decision:

- Base branch: `codex/team06-strategy-signal/CF-W1-BT-02`
- Base commit: `bb49ce2 feat: add backtesting review disposition`
- New branch: `codex/team06-strategy-signal/CF-W1-BT-01A`
- New worktree: `../investment-scanner-worktrees/team06-CF-W1-BT-01A`
- Rationale: `CF-W1-BT-01A` and accepted parked `CF-W1-BT-02` reserve overlapping backtesting test/doc files, so `BT-01A` must stack on the accepted `BT-02` baseline rather than run from `dev`.

Gate evidence:

- Requirement: `10-requirements/CF-W1-BT-01A-backtesting-dq-fail-closed-characterization-requirement.md`
- Architecture review: `03-architecture/CF-W1-BT-01A-architecture-review.md`
- Contract: `06-contracts/CF-W1-BT-01A-backtesting-dq-fail-closed-characterization-contract.md`
- Work packet: `08-work-packets/CF-W1-BT-01A-work-packet.md`
- QA plan: `04-qa/CF-W1-BT-01A-qa-plan.md`
- Open decisions: none.
- Shared/high-risk blocker: none if implementation stays characterization-only and inside reserved files.

Allowed files:

- `backend/tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.test.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.md`

Allowed branch-local evidence docs:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-06-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-BT-01A-developer-handoff.md`

Forbidden files:

- backtesting source files, including `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.ts`
- Prisma schema or migrations
- generated files
- backend or frontend route registries
- frontend source or UI tests
- shared backend utilities
- shared frontend UI
- package manifests
- provider, live-data, startup/backfill, paid/cloud, broker, telemetry, or credentials
- any unrelated accepted branch work

Required behavior:

- add focused characterization tests for current Backtesting Strategy Lab DQ fail-closed behavior;
- document the observed DQ behavior and limitations in the module docs;
- do not rewrite simulation math, scoring, routes, DTO contracts, persistence, or frontend behavior;
- preserve accepted `CF-W1-BT-02` review-disposition behavior in the stacked branch.

Focused validation:

```powershell
cd backend
npm.cmd test -- backtesting-strategy-lab.service.test.ts --runInBand
npm.cmd run build
```

Stop and return to Team 00 if characterization requires source changes, schema/generated/route/shared/package/frontend changes, simulation semantics changes, or changes outside the allowed file reservation.

---

## Active Ready Handoff - `CF-W1-STRAT-03`

Date promoted: 2026-05-18

Team 00 evaluated `CF-W1-STRAT-03` after Team 03 architecture prep and Team 04 QA planning. The slice is promoted only as one bounded backend-only `strategy-decision-engine` child.

Gate evidence:

- Requirement: `10-requirements/CF-W1-STRAT-03-strategy-decision-review-provenance-requirement.md`
- Architecture review: `03-architecture/CF-W1-STRAT-03-architecture-review.md`
- Contract: `06-contracts/CF-W1-STRAT-03-strategy-decision-review-provenance-contract.md`
- Work packet: `08-work-packets/CF-W1-STRAT-03-work-packet.md`
- QA plan: `04-qa/CF-W1-STRAT-03-qa-plan.md`
- Open decisions: none.
- Shared/high-risk blocker: none if implementation stays inside reserved Strategy Decision service/types/doc/service-test files.

Branch/worktree:

- Branch: `codex/team06-strategy-signal/CF-W1-STRAT-03`
- Worktree: `../investment-scanner-worktrees/team06-CF-W1-STRAT-03`

Allowed files:

- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.service.ts`
- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.types.ts`
- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.md`
- `backend/tests/modules/strategy-decision-engine/strategy-decision-engine.service.test.ts`

Allowed branch-local evidence docs:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-06-CF-W1-STRAT-03-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-STRAT-03-developer-handoff.md`

Forbidden files:

- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.repository.ts`
- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.controller.ts`
- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.router.ts`
- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.validation.ts`
- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.module.ts`
- `backend/src/modules/strategy-decision-engine/index.ts`
- `backend/tests/modules/strategy-decision-engine/strategy-decision-engine.repository.test.ts`
- Prisma schema or migrations
- generated files
- backend or frontend route registries
- frontend `strategy-decision-engine` files
- shared backend utilities or shared DTOs
- shared frontend components
- package manifests
- upstream/downstream source in Strategy Framework, Signal Generation, Calibration, DQE, Smart Money, Market Context, Research Hub, or Trade Plan
- provider, live-data, startup/backfill, paid/cloud, broker, telemetry, or credentials

Required behavior:

- add additive provenance metadata for `FRAMEWORK_BACKED`, `LEGACY_FALLBACK`, and request-local `READ_PATH_CREATED`;
- keep `READ_PATH_CREATED` honest as request-local provenance on the response that creates a row, not durable replayable stored origin;
- set `legacyIncludedByRequest=true` only when the caller explicitly used `includeLegacy=true` and the returned row is non-framework-backed;
- preserve proof-safe default legacy exclusion;
- add top-level `reasonSummary` using the approved precedence: first blocker, first warning, first data gap, first reason, existing `riskPlan.reasonSummary`, then neutral research-support fallback;
- preserve current decision math, query behavior, route behavior, persistence keys, candidate-date defaults, and existing DTO fields.

Required validation after implementation:

```powershell
cd backend
npm.cmd test -- strategy-decision-engine.service.test.ts --runInBand
npm.cmd run build
```

Stop and return to Team 00 if implementation requires repository/controller/router/validation/module/index edits, schema/generated/route/shared/package/frontend/provider/startup/live changes, durable stored read-path provenance, decision math changes, query/route changes, persistence-key changes, or downstream consumer adoption.

---

## Active Ready Handoff - `CF-W1-SIG-02`

Date promoted: 2026-05-18

Team 00 evaluated `CF-W1-SIG-02` after Team 03 architecture and Team 04 QA planning. The slice is promoted only as a stacked backend-only `signal-generation-engine` child on accepted parked `CF-W1-SIG-TRIGGER-02A`.

Sequencing decision:

- Base branch: `codex/team06-strategy-signal/CF-W1-SIG-TRIGGER-02A`
- Base commit: `788c237`
- New branch: `codex/team06-strategy-signal/CF-W1-SIG-02`
- New worktree: `../investment-scanner-worktrees/team06-CF-W1-SIG-02`
- Rationale: `CF-W1-SIG-02` consumes the same Signal Generation writer set as the accepted parked trigger-audit child, so it must stack on that accepted branch rather than start from current `dev`.

Gate evidence:

- Requirement: `10-requirements/CF-W1-SIG-02-canonical-trigger-evidence-compatibility-requirement.md`
- Architecture review: `03-architecture/CF-W1-SIG-02-architecture-review.md`
- Contract: `06-contracts/CF-W1-SIG-02-canonical-trigger-evidence-compatibility-contract.md`
- Work packet: `08-work-packets/CF-W1-SIG-02-work-packet.md`
- QA plan: `04-qa/CF-W1-SIG-02-qa-plan.md`
- Open decisions: none.
- Shared/high-risk blocker: none if implementation stays in the stacked Signal Generation reservation and avoids schema/routes/shared/frontend/package/provider scope.

Allowed files:

- `backend/src/modules/signal-generation-engine/signal-generation-engine.types.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.repository.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.service.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.md`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.repository.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.service.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.trigger-contract.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-dq-enforcement.invariants.test.ts`

Allowed branch-local evidence docs:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-06-CF-W1-SIG-02-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-SIG-02-developer-handoff.md`

Forbidden files:

- Prisma schema or migrations
- generated files
- backend/frontend route registries
- `backend/src/modules/signal-generation-engine/index.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.controller.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.router.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.validation.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.module.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.config.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.routes.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.validation.test.ts`
- all frontend, downstream, shared utility/UI, package, provider/live/startup/backfill, paid/cloud, broker, telemetry, and credential files

Required behavior:

- keep `SignalResultDto.triggerContract` as the one canonical trigger-evidence packet;
- avoid adding a second sibling trigger packet;
- add explicit field provenance and packet-origin semantics;
- surface persisted `created_at` / `updated_at` and linked run timing/status when repository-backed evidence exists;
- label source-price-date vs source-data-date timestamp semantics;
- label request-local `latestForInstrument()` generation honestly;
- keep compatibility-only and unavailable fields explicit;
- preserve strict DQ fail-closed behavior and research-support language.

Focused validation:

```powershell
cd backend
npm.cmd test -- signal-generation-engine.repository.test.ts signal-generation-engine.service.test.ts signal-generation-engine.trigger-contract.test.ts signal-generation-dq-enforcement.invariants.test.ts --runInBand
npm.cmd run build
```
