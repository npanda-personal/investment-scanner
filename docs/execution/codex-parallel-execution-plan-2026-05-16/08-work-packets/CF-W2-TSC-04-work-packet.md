# CF-W2-TSC-04 Work Packet

Date: 2026-05-25

## Work Item

Parent requirement:

- `CF-W2-TSC-04 - Today Review no-target candidate-language cleanup`

Bounded first child:

- `CF-W2-TSC-04A-TREV-CANDIDATE-LANGUAGE`

## State

Docs-only architecture prep completed.

Current verdict: `Ready candidate after Team 04 QA planning`.

The parent stays out of Ready. The child is the smallest honest implementation slice because current source inspection proved that frontend copy changes alone would leave backend-emitted target/reward and Trade Plan-first language visible on Today Review trusted-candidate surfaces.

## Owner / Lane / Module

- Architecture owner: Team 03 - Architecture Factory
- Future implementation owner: Team 07 - Portfolio / Watchlist / Alerts / Today Review
- Lane: Lane 3 with accepted Lane 2 evidence inputs only
- Backend module: `today-trade-review`
- Frontend feature: `today-trade-review`

## Required Base

### Hard sequencing dependency

- accepted `CF-W1-TSC-03A-TREV-SUPPORTING-EVIDENCE` commit `09bbf9b feat: add today review supporting trust evidence`

Do not start from:

- plain `dev`
- accepted `34c9993` alone
- any older Today Review baseline that predates supporting-trust evidence

## Smallest Honest First Child

Add one Today Review-owned presentation cleanup packet that:

- preserves accepted Today Review grouping, health, and supporting-trust behavior from base `09bbf9b`;
- normalizes trusted candidate wording away from target/reward, reward/risk, paper-review, and Trade Plan-first phrasing;
- uses source-proven trigger evidence as the trusted entry evidence when available on the accepted base;
- shows explicit unavailable or missing wording when source-proven entry evidence is absent;
- hides or compatibility-labels target-shaped Trade Plan fields rather than treating them as trusted evidence;
- keeps ranking, promotion, confidence, and Lite target-generation semantics unchanged in this child;
- updates Today Review module docs and focused tests to the same language boundary.

## Exact File Reservations

### Allowed implementation files

- `backend/src/modules/today-trade-review/today-trade-review.types.ts`
- `backend/src/modules/today-trade-review/today-trade-review.service.ts`
- `backend/src/modules/today-trade-review/today-trade-review.md`
- `backend/tests/modules/today-trade-review/today-trade-review.service.test.ts`
- `frontend/src/features/today-trade-review/types.ts`
- `frontend/src/features/today-trade-review/components/TodayReviewPage.tsx`
- `frontend/src/features/today-trade-review/components/TodayReviewCandidateDetailPage.tsx`
- `frontend/tests/ui/today-trade-review.spec.ts`

### Forbidden files

- Prisma schema or migrations
- generated files
- `backend/src/modules/today-trade-review/today-trade-review.repository.ts`
- `backend/src/modules/today-trade-review/today-trade-review.controller.ts`
- `backend/src/modules/today-trade-review/today-trade-review.router.ts`
- `backend/src/modules/today-trade-review/today-trade-review.validation.ts`
- `backend/src/modules/today-trade-review/index.ts`
- `backend/tests/modules/today-trade-review/today-trade-review.controller.test.ts`
- `frontend/src/features/today-trade-review/api/**`
- `frontend/src/features/today-trade-review/hooks/**`
- `frontend/src/features/today-trade-review/routes.tsx`
- backend and frontend route registries
- shared backend utilities
- shared frontend components
- package manifests
- `backend/src/modules/trade-plan-risk-engine/**`
- `backend/src/modules/strategy-decision-engine/**`
- `backend/src/modules/signal-generation-engine/**`
- `backend/src/modules/data-quality-engine/**`
- `backend/src/modules/signal-calibration-engine/**`
- `backend/src/modules/backtesting-strategy-lab/**`
- `frontend/src/features/data-quality-engine/**`
- `frontend/src/features/pipeline-ops/**`
- all other source/tests outside the reserved Today Review file set
- provider/live-data, startup/backfill, paid/cloud, broker, telemetry, or credential files

## Required Behavior

The first child must:

- keep the child fully inside the reserved Today Review files;
- introduce a Today Review-owned presentation mapping or equivalent field family if needed for no-target trusted-candidate wording;
- keep trusted entry wording tied to source-proven trigger evidence or explicit unavailable evidence;
- remove visible target/reward, reward/risk, modeled reward, paper-review, and Trade Plan-first wording from touched list/detail/doc/spec surfaces;
- keep supporting evidence, blockers, DQ readiness, and accepted health semantics visible;
- leave ranking, promotion, grouping, and confidence unchanged;
- avoid direct buy/sell or advice-like wording.

## Branch / Worktree Recommendation

After Team 00 promotes the child:

- Branch: `codex/team07-portfolio-alerts/CF-W2-TSC-04A-TREV-CANDIDATE-LANGUAGE`
- Worktree: `../investment-scanner-worktrees/team07-CF-W2-TSC-04A`
- Base: accepted `09bbf9b`

Reason:

- this is a Today Review-only writer set;
- it must preserve accepted `TSC-03A` behavior;
- the child must stay independent from Team 08 Data Quality / Pipeline Ops work.

## QA Handoff Notes

Future Team 04 planning should verify:

- list and detail do not show `R:R`, `reward/risk`, `target/reward`, `modeled reward`, `paper review`, `trade-plan geometry`, or `Trade-plan proof-chain` on touched trusted-candidate surfaces;
- trusted entry evidence uses source-proven trigger evidence when present;
- missing source-proven entry evidence is disclosed as unavailable or missing, not backfilled from compatibility geometry;
- supporting evidence and active-health surfaces from accepted `09bbf9b` remain intact;
- any remaining compatibility-only Trade Plan context is explicitly labeled and not treated as trusted evidence;
- module doc wording and UI smoke assertions match the same language policy;
- no ranking, grouping, promotion, or confidence behavior changed while the language cleanup landed.

Suggested validation after future implementation:

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

Suggested focused language scan after future implementation:

```powershell
rg -n "R:R|reward/risk|target / reward|modeled reward|paper review|trade-plan geometry|Trade-plan proof-chain|buy now|sell now|must buy|must sell|guaranteed|financial advice" backend/src/modules/today-trade-review backend/tests/modules/today-trade-review frontend/src/features/today-trade-review frontend/tests/ui/today-trade-review.spec.ts
```

## Stop Conditions

Stop and return to Team 00 / Architect if implementation requires:

- ranking or eligibility logic changes;
- confidence-score or grouping changes;
- Lite target-generation removal;
- schema, migration, or generated-file changes;
- repository/controller/router/validation/index edits;
- route or route-registry changes;
- shared UI or shared backend utility changes;
- package changes;
- upstream source edits to Signal Generation, Strategy Decision, Trade Plan, DQ, Calibration, or Backtesting.

## Ready Recommendation

Current result: `Ready candidate after Team 04 QA planning`.

After Team 04 adds the QA plan, `CF-W2-TSC-04A-TREV-CANDIDATE-LANGUAGE` can move to Team 00 Ready evaluation as a bounded Today Review-only child on base `09bbf9b`.
