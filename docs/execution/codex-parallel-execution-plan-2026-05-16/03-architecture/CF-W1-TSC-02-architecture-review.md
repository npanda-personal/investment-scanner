# CF-W1-TSC-02 Architecture Review

Date: 2026-05-24

Owner: Team 03 - Solution Architect Factory

## Status

SPLIT REQUIRED.

`CF-W1-TSC-02` should not move to Ready as one unsplit parent packet. A bounded first implementation child is feasible without schema, route, shared UI, shared backend utility, package, generated-file, provider/live, startup/backfill, or persistence-contract changes, but it must be promoted as one stacked Today Review child on the accepted `CF-W1-TSC-01A-TREV` baseline rather than against current `dev`.

Recommended child:

- `CF-W1-TSC-02A-TREV-HEALTH`

## Evidence Inspected

- `AGENTS.md`
- `10-requirements/CF-W1-TSC-02-active-signal-health-rule-evidence-requirement.md`
- `10-requirements/CF-W1-TSC-01A-today-review-trusted-signal-candidate-adoption-requirement.md`
- `10-requirements/next-top-10-candidates.md`
- `12-ready-queue/ready-for-implementation.md`
- `09-summaries/CF-W1-BT-04-po-acceptance-packet.md`
- `06-contracts/CF-W1-TSC-01A-trigger-evidence-adoption-contract.md`
- `06-contracts/CF-W1-DQ-03-data-quality-residual-reason-summary-contract.md`
- `06-contracts/CF-W1-SIG-TRIGGER-ENTRY-01-rule-trigger-entry-price-evidence-contract.md`
- `backend/src/modules/today-trade-review/today-trade-review.types.ts`
- `backend/src/modules/today-trade-review/today-trade-review.service.ts`
- `backend/src/modules/today-trade-review/today-trade-review.md`
- `frontend/src/features/today-trade-review/types.ts`
- `frontend/src/features/today-trade-review/components/TodayReviewPage.tsx`
- `frontend/src/features/today-trade-review/components/TodayReviewCandidateDetailPage.tsx`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.types.ts`
- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.types.ts`
- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.service.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.types.ts`

## Current-State Findings

### 1. Current `dev` Today Review is still Trade Plan-shaped

Current `dev` Today Review source and module docs still expose Trade Plan-first shortlist semantics, including target/reward and reward/risk framing in:

- `backend/src/modules/today-trade-review/today-trade-review.service.ts`
- `backend/src/modules/today-trade-review/today-trade-review.md`
- `frontend/src/features/today-trade-review/components/TodayReviewPage.tsx`
- `frontend/src/features/today-trade-review/components/TodayReviewCandidateDetailPage.tsx`

That means `CF-W1-TSC-02` must not be promoted directly against plain `dev`, or it will either duplicate accepted `CF-W1-TSC-01A-TREV` work or re-open removed semantics.

### 2. Accepted `CF-W1-TSC-01A-TREV` provides the correct writer base

Team 00 has already recorded accepted local commit `9fbc989` for `CF-W1-TSC-01A-TREV`, and that child itself stacks on accepted Signal Generation bridge commit `40c00f1`.

This is the correct base for TSC-02 because it already owns:

- Today Review Trusted Signal Candidate grouping;
- source-proven trigger evidence adoption;
- Today Review copy cleanup away from target/R:R/Trade Plan-first trust language;
- the exact backend/frontend writer set TSC-02 would need.

### 3. A bounded read-path child is feasible inside Today Review only

Even on current source, Today Review already carries additive JSON-backed evidence surfaces that can host health projection fields without repository, route, or schema edits:

- `dataQualitySnapshot`
- `strategyProofSnapshot`
- `sourceSignalSnapshot`
- `explainability`

Because those are persisted JSON snapshots already returned by the existing repository and routes, the first TSC-02 child can stay inside:

- Today Review service/types/module doc;
- Today Review feature types/list/detail rendering;
- Today Review focused service/UI tests.

### 4. Upstream evidence is enough for a conservative first child, but not for a broad one

Available source evidence:

- Signal Generation trigger contract exposes source-proven entry trigger price, trigger timestamp, strategy version, entry rule id, and explicit unavailable markers.
- Strategy Decision exposes framework-backed decision state, strategy version, reasons, blockers, `exitRulesTriggered`, and rule-based `riskPlan` invalidation/exit rule arrays.
- Data Quality snapshots already gate trust and can hard-block healthy states.

Unavailable or intentionally out-of-scope for first child:

- durable health persistence;
- dedicated health history;
- new page or new monitor route;
- backtesting/calibration freshness chain from `CF-W1-TSC-03`;
- route-level expansion or new shared contracts across modules.

### 5. Backtesting is future compatibility only for TSC-02

`CF-W1-BT-04` is accepted and useful later as a supporting trust input, but it is not required for the first active-health child and must not be merged into TSC-02 scope.

## Architecture Decision

Split `CF-W1-TSC-02` into one bounded first child:

- `CF-W1-TSC-02A-TREV-HEALTH`

The child should be:

- Today Review-owned;
- additive on accepted Trusted Signal Candidate snapshots;
- read-path only;
- one-writer across the existing Today Review backend/frontend reservation;
- stacked on accepted `CF-W1-TSC-01A-TREV` commit `9fbc989`.

The parent remains out of Ready. The child is the only honest Ready-candidate path.

## First-Child Contract Boundary

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
- `frontend/src/features/today-trade-review/api/**`
- `frontend/src/features/today-trade-review/hooks/**`
- `frontend/src/features/today-trade-review/routes.tsx`
- backend or frontend route registries
- shared backend utilities
- shared frontend components
- package manifests
- all upstream/downstream source/tests outside the allowed Today Review file set
- provider/live-data, startup/backfill, paid/cloud, broker, telemetry, or credential files

## Required Health-State Focus

The child must reserve these states only:

- `ACTIVE`
- `HEALTHY`
- `WEAKENING`
- `RISK_WARNING`
- `EXIT_TRIGGERED`
- `INVALIDATED`
- `EXPIRED`
- `BLOCKED`

Mapping rules:

- `BLOCKED` when trusted entry evidence is missing, Data Quality is blocked/missing/unsupported, or current proof basis is absent for a trusted state.
- `ACTIVE` when entry evidence remains valid but no stronger current state is proven.
- `HEALTHY`, `WEAKENING`, `RISK_WARNING`, `EXIT_TRIGGERED`, `INVALIDATED`, and `EXPIRED` only when current rule/version evidence proves them.
- If current source cannot prove one of those stronger states, the candidate must remain `ACTIVE` or `BLOCKED` with explicit missing-evidence reasons.

## Future-Compatible But Out Of Scope

The child may leave compatibility hooks for:

- DQ residual summaries from `CF-W1-DQ-03`;
- later supporting trust evidence from `CF-W1-TSC-03`;
- later active-monitor surfaces;
- later backtesting/current-proof display.

It must not consume or require them in first implementation.

## Dependencies And Sequencing

### Hard dependencies

- accepted `CF-W1-TSC-01A-TREV` base commit `9fbc989`
- accepted Signal Generation bridge commit `40c00f1` through that base
- Team 04 `CF-W1-TSC-02` QA plan
- Team 00 stacked Ready promotion for the split child

### Optional dependency

- accepted `CF-W1-DQ-03` residual summary fields if already present on the chosen base; otherwise show residual-summary support as unavailable and do not reimplement DQ interpretation.

### Explicit non-dependencies

- `CF-W1-TSC-03`
- `CF-W1-BT-04`
- schema changes
- route changes
- shared UI changes

## QA Handoff Notes

Team 04 should plan focused verification for:

- `ACTIVE` with trusted entry evidence and no stronger proof;
- `HEALTHY` from current rule-backed evidence;
- `WEAKENING` from current rule-backed evidence;
- `RISK_WARNING` from current warning evidence without hard-blocking DQ;
- `EXIT_TRIGGERED` only from documented exit-rule proof;
- `INVALIDATED` only from documented invalidation-rule proof;
- `EXPIRED` only from documented expiry proof;
- `BLOCKED` on missing or hard-blocked DQ or missing trusted entry basis;
- legacy candidate snapshots that lack new health evidence fields;
- list/detail consistency for the same candidate;
- no target price, synthetic target, reward/risk, Trade Plan-first, or advice-like leakage on touched surfaces.

## Ready Recommendation

Parent item `CF-W1-TSC-02`: not Ready.

Recommended child `CF-W1-TSC-02A-TREV-HEALTH`: Ready candidate after Team 04 QA planning and Team 00 stacked promotion on base commit `9fbc989`.

## Architecture Verdict

- Parent result: `SPLIT REQUIRED`
- First executable child: `CF-W1-TSC-02A-TREV-HEALTH`
- Implementation lane: Lane 3, Today Review-owned, with Lane 2 evidence inputs only
- Ready recommendation now: child only, not parent
