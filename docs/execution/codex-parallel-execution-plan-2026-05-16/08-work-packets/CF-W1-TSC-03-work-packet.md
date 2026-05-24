# CF-W1-TSC-03 Work Packet

Date: 2026-05-24

## Work Item

Parent requirement:

- `CF-W1-TSC-03 - Today Review supporting trust evidence`

Bounded first child:

- `CF-W1-TSC-03A-TREV-SUPPORTING-EVIDENCE`

## State

Docs-only architecture prep completed.

Current verdict: `blocked by active writer sequencing`.

The parent stays out of Ready. One bounded first child is feasible, but it cannot be promoted or implemented while Team 07 actively owns the same Today Review writer set for `CF-W1-TSC-02A-TREV-HEALTH`.

## Owner / Lane / Module

- Architecture owner: Team 03 - Architecture Factory
- Future implementation owner: Team 07 - Portfolio / Watchlist / Alerts / Today Review
- Lane: Lane 3 with Lane 1 / Lane 2 evidence inputs
- Backend module: `today-trade-review`
- Frontend feature: `today-trade-review`

## Required Base

### Hard sequencing dependency

- accepted outcome of `CF-W1-TSC-02A-TREV-HEALTH`

Do not start from:

- plain `dev`
- accepted `9fbc989` alone
- the currently active Team 07 `TSC-02A` worktree before Team 00 clears the writer set

### Optional richer evidence bases

If Team 00 wants richer support evidence on the first implementation pass, choose a post-`TSC-02A` integration base that also contains:

- `CF-W1-DQ-03` for DQ residual summary
- `CF-W1-CAL-01A` for calibration `trustState` and `dqGateState`
- accepted `CF-W1-BT-04` for backtesting proof-currentness labels

If those fields are not present on the chosen base, the child must render explicit unavailable states instead of recreating those upstream semantics.

## Smallest Honest First Child

Add one Today Review-owned supporting-trust projection that:

- keeps the accepted Trusted Signal Candidate and active-health workflow intact;
- adds compact list-level evidence indicators only where the meaning can remain stable;
- adds one detail-level supporting evidence section for:
  - Data Quality
  - calibration readiness
  - backtesting proof currentness
- reuses accepted module-owned outputs when they exist on the chosen base;
- shows explicit unavailable or missing states when those outputs are absent;
- does not add a new score, ranking formula, or advice-like prioritization;
- does not merge supporting evidence into `TSC-02A` health-state semantics.

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
- `backend/src/modules/data-quality-engine/**`
- `backend/src/modules/signal-calibration-engine/**`
- `backend/src/modules/backtesting-strategy-lab/**`
- `backend/src/modules/signal-generation-engine/**`
- `backend/src/modules/strategy-decision-engine/**`
- `backend/src/modules/trade-plan-risk-engine/**`
- all other source/tests outside the reserved Today Review file set
- provider/live-data, startup/backfill, paid/cloud, broker, telemetry, or credential files

## Required Behavior

The first child must:

- keep the child fully inside the reserved Today Review files;
- add one additive supporting-trust projection or equivalent fields;
- preserve accepted `TSC-02A` health-state behavior and wording;
- show list/detail evidence consistently for the same candidate;
- reuse DQ residual, calibration trust, and BT current-proof semantics only when those module-owned outputs already exist on the chosen base;
- fail closed with explicit unavailable or missing states when those outputs do not exist on the chosen base;
- avoid target price, synthetic target, reward/risk, Trade Plan-first, direct buy/sell, and advice-like wording.

## Branch / Worktree Recommendation

After Team 00 clears the active Team 07 writer set:

- Branch: `codex/team07-portfolio-alerts/CF-W1-TSC-03A-supporting-trust-evidence`
- Worktree: `../investment-scanner-worktrees/team07-CF-W1-TSC-03A`
- Base: accepted post-`CF-W1-TSC-02A-TREV-HEALTH` commit

Reason:

- same writer set as the active Team 07 Today Review child;
- current `dev` is still not the correct Today Review trust-language and active-health base;
- one-writer discipline is required across the full Today Review reservation.

## QA Handoff Notes

Future Team 04 planning should verify:

- full evidence present on a base containing reusable DQ / Calibration / BT trust fields;
- DQ blocked with explicit hard-gate visibility;
- DQ residual summary unavailable when the chosen base lacks `DQ-03`;
- calibration `USABLE`, `LIMITED`, and `UNAVAILABLE` display from module-owned fields;
- calibration richer trust-state fields only when the chosen base includes `CAL-01A`;
- backtesting `CURRENT_PROOF`, `STALE_PROOF`, `REPAIRED_HISTORICAL`, and `LIMITED_HISTORICAL_PROOF` only when the chosen base includes accepted `BT-04`;
- explicit unavailable backtesting proof when `BT-04` is absent from the chosen base;
- mixed-source missing evidence without invented heuristics;
- same supporting-trust meaning in list and detail;
- no new ranking, no health-state drift, and no target/R:R/advice leakage.

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

## Stop Conditions

Stop and return to Team 00 / Architect if implementation requires:

- schema, migration, or generated-file changes;
- repository/controller/router/validation/index edits;
- route or route-registry changes;
- shared UI or shared backend utility changes;
- package changes;
- upstream source edits to DQ, Calibration, Backtesting, Signal Generation, Strategy Decision, or Trade Plan;
- a new score, ranking formula, or advice-like prioritization layer;
- health-state changes that belong to `CF-W1-TSC-02A-TREV-HEALTH`.

## Ready Recommendation

Current result: `blocked by active writer sequencing`.

After Team 07 clears the active Today Review writer set, `CF-W1-TSC-03A-TREV-SUPPORTING-EVIDENCE` can move to Team 00 Ready evaluation if Team 00 records the selected post-`TSC-02A` base and whether absent `DQ-03` / `CAL-01A` / `BT-04` fields should render as unavailable on the first implementation pass.
