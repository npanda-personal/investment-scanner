# CF-W2-TSC-05A Ready Promotion

Date: 2026-05-25

Owner: Team 00 - Orchestrator / Integration

## Work Item

`CF-W2-TSC-05A-TREV-RANKING-ELIGIBILITY-REFRAME`

Today Review no-target ranking and eligibility semantic cleanup stacked on accepted `CF-W2-TSC-04A`.

## Promotion Verdict

Promoted to Ready for Implementation and assigned to Team 07.

This promotion is valid only in the dedicated stacked Team 07 worktree:

- Branch: `codex/team07-portfolio-alerts/CF-W2-TSC-05A-TREV-RANKING-ELIGIBILITY`
- Worktree: `C:\work\repo\investment-scanner-worktrees\team07-CF-W2-TSC-05A`
- Required base: `68f0a19 feat: clean today review candidate language`
- Base verification: `git merge-base --is-ancestor 68f0a19 HEAD` returned `BASE_OK`.

Do not implement this slice from the shared `dev` workspace.

## Gate Evidence

- Requirement: `10-requirements/CF-W2-TSC-05-today-review-no-target-ranking-and-eligibility-reframe-requirement.md`
- Architecture review: `03-architecture/CF-W2-TSC-05-architecture-review.md`
- Contract: `06-contracts/CF-W2-TSC-05-today-review-no-target-ranking-eligibility-contract.md`
- Work packet: `08-work-packets/CF-W2-TSC-05-work-packet.md`
- QA plan: `04-qa/CF-W2-TSC-05A-today-review-ranking-eligibility-qa-plan.md`
- Accepted base: `CF-W2-TSC-04A` local branch commit `68f0a19`
- Open decisions: none.

## Allowed Implementation Files

- `backend/src/modules/today-trade-review/today-trade-review.types.ts`
- `backend/src/modules/today-trade-review/today-trade-review.service.ts`
- `backend/src/modules/today-trade-review/today-trade-review.md`
- `backend/tests/modules/today-trade-review/today-trade-review.service.test.ts`
- `frontend/src/features/today-trade-review/types.ts`
- `frontend/src/features/today-trade-review/components/TodayReviewPage.tsx`
- `frontend/src/features/today-trade-review/components/TodayReviewCandidateDetailPage.tsx`
- `frontend/tests/ui/today-trade-review.spec.ts`

## Allowed Reporting Docs

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-07-CF-W2-TSC-05A-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W2-TSC-05A-developer-handoff.md`

## Forbidden Scope

- Today Review repository/controller/router/validation/module/index files
- `frontend/src/features/today-trade-review/api/**`
- `frontend/src/features/today-trade-review/hooks/**`
- `frontend/src/features/today-trade-review/routes.tsx`
- backend/frontend route registries
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

## Required Behavior

- Remove target/reward, reward/risk, target quality/method, paper-review/paper-readiness, and trade-plan geometry from trusted Today Review rank, state, promotion, eligibility, score, reason, and explainability semantics.
- Lite candidates must not rely on synthetic `2R` or `3R` target math for trusted rank or eligibility.
- Compatibility fields may remain readable only as compatibility data and must not decide trusted state, rank, score, promotion, or reason wording.
- Preserve DQ hard gating, active signal health, supporting evidence, documented invalidation/risk context, and missing-evidence honesty.
- Do not add local Today Review bulk controls. `/pipeline-ops` remains the monitoring and manual-control surface.

## Required Validation

```powershell
git merge-base --is-ancestor 68f0a19 HEAD
cd backend
npm.cmd test -- today-trade-review.service.test.ts --runInBand
npm.cmd run build
```

```powershell
cd frontend
npm.cmd run build
```

Run the Today Review Playwright smoke against a dedicated server started from the Team 07 worktree, not a stale default workspace server.

```powershell
cd frontend
$env:PLAYWRIGHT_BASE_URL = 'http://127.0.0.1:4173'
npm.cmd run test:ui -- today-trade-review.spec.ts --workers=1
```

Phrase scan on reserved Today Review surfaces:

```powershell
rg -n "R:R|reward/risk|target / reward|target/reward|modeled reward|paper review|paper-readiness|trade-plan geometry|Trade-plan proof-chain|ready for paper review|buy now|sell now|must buy|must sell|financial advice" backend/src/modules/today-trade-review backend/tests/modules/today-trade-review frontend/src/features/today-trade-review frontend/tests/ui/today-trade-review.spec.ts
```

## Stop Conditions

Stop and return to Team 00 if implementation requires upstream module edits, route/schema/shared/package/generated/provider/startup scope, or if Today Review cannot separate documented rule-backed invalidation/risk evidence from target-shaped compatibility semantics inside the reserved file set.
