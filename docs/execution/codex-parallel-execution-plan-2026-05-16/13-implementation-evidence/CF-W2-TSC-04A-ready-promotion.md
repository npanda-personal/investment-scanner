# CF-W2-TSC-04A Ready Promotion

Date: 2026-05-25

Owner: Team 00 - Master Orchestrator / Integration

## Work Item

- Parent: `CF-W2-TSC-04` Today Review no-target candidate-language cleanup
- Promoted child: `CF-W2-TSC-04A-TREV-CANDIDATE-LANGUAGE`

## Ready Verdict

Ready for bounded Team 07 implementation.

The parent is not Ready as a whole. Team 03 split the first safe implementation child to Today Review-owned presentation/read-path cleanup, and Team 04 accepted the child as plannable.

## Gate Evidence

- Requirement: `10-requirements/CF-W2-TSC-04-today-review-no-target-candidate-language-cleanup-requirement.md`
- Architecture review: `03-architecture/CF-W2-TSC-04-architecture-review.md`
- Contract: `06-contracts/CF-W2-TSC-04-today-review-no-target-candidate-language-cleanup-contract.md`
- Work packet: `08-work-packets/CF-W2-TSC-04-work-packet.md`
- QA plan: `04-qa/CF-W2-TSC-04A-today-review-no-target-candidate-language-qa-plan.md`
- Open decisions: `99-decision-inbox/open-decisions.md` states no open decisions.
- Required base: accepted `CF-W1-TSC-03A-TREV-SUPPORTING-EVIDENCE` commit `09bbf9b`.

## Branch And Worktree

- Branch: `codex/team07-portfolio-alerts/CF-W2-TSC-04A-TREV-CANDIDATE-LANGUAGE`
- Worktree: `C:\work\repo\investment-scanner-worktrees\team07-CF-W2-TSC-04A`
- Base: `09bbf9b feat: add today review supporting trust evidence`

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

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-07-CF-W2-TSC-04A-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W2-TSC-04A-developer-handoff.md`

## Forbidden Scope

- Today Review repository/controller/router/validation/module/index files
- backend or frontend route registries
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

## Required Behavior

- Preserve accepted Today Review grouping, health, and supporting-trust behavior from base `09bbf9b`.
- Normalize trusted candidate wording away from target/reward, reward/risk, paper-review, and Trade Plan-first phrasing.
- Use source-proven trigger evidence as trusted entry evidence when available.
- Show explicit unavailable or missing wording when source-proven entry evidence is absent.
- Hide or compatibility-label target-shaped Trade Plan fields; do not treat them as trusted evidence.
- Keep supporting evidence, blockers, DQ readiness, accepted health semantics, and reason summaries visible.
- Leave ranking, grouping, promotion, confidence, reward/risk thresholds, and Lite target-generation semantics unchanged.
- Avoid direct buy/sell, guarantee, target-price, or advice-like wording.

## Required Validation

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

## Stop Conditions

Stop and return to Team 00 if implementation requires ranking, grouping, promotion, confidence, eligibility, reward/risk threshold, or Lite target-generation changes, or any forbidden file/scope above.
