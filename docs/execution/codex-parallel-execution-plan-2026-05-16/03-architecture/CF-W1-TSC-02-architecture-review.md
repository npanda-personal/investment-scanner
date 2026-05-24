# CF-W1-TSC-02 Architecture Review

Date: 2026-05-24

Owner: Team 03 - Solution Architect Factory

## Status

ARCHITECTURE REFINEMENT PREPARED / BLOCKED FROM READY.

`CF-W1-TSC-02` should not move to Ready while `CF-W1-TSC-01A-TREV` is active. The first health slice can be bounded, but its implementation must stack on accepted Today Review adoption evidence so it does not duplicate or contradict the Trusted Signal Candidate grouping, trigger evidence, and product-language cleanup currently owned by Team 07 and Team 04.

## Evidence Inspected

- `AGENTS.md`
- `10-requirements/next-top-10-candidates.md`
- `10-requirements/CF-W1-TSC-02-active-signal-health-rule-evidence-requirement.md`
- `10-requirements/CF-W1-TSC-01A-today-review-trusted-signal-candidate-adoption-requirement.md`
- `12-ready-queue/ready-for-implementation.md`
- `99-decision-inbox/open-decisions.md`
- `03-architecture/CF-W1-TSC-01-architecture-review.md`
- `03-architecture/CF-W1-TSC-01A-architecture-review.md`
- `06-contracts/CF-W1-TSC-01-trusted-signal-candidate-contract.md`
- `06-contracts/CF-W1-TSC-01A-trigger-evidence-adoption-contract.md`
- `06-contracts/CF-W1-DQ-03-data-quality-residual-reason-summary-contract.md`
- `06-contracts/CF-W1-SIG-TRIGGER-ENTRY-01-rule-trigger-entry-price-evidence-contract.md`
- `04-qa/CF-W1-TSC-01A-qa-plan.md`
- current `today-trade-review` backend and frontend file inventory
- current `signal-generation-engine` trigger evidence file inventory
- current `backtesting-strategy-lab` docs for independent sequencing comparison
- `git branch --contains 40c00f1`

## Source Findings

- The accepted Signal Generation bridge commit `40c00f1` exists on parked branch `codex/team06-strategy-signal/CF-W1-TSC-01A-signal-latest-strategy-context`; it is not present on current `dev`.
- `CF-W1-TSC-01A-TREV` is already promoted and assigned to Team 07. That child owns Today Review adoption of source-proven trigger evidence, conservative candidate grouping, and touched-surface removal of target/R:R/Trade Plan framing.
- Current `dev` Today Review still contains target/R:R/Trade Plan wording and scoring paths. `TSC-02` must not begin from this source state as a separate writer because it would collide with or bypass the active adoption work.
- Existing Today Review candidate snapshots can carry additive health evidence through `sourceSignalSnapshot`, `dataQualitySnapshot`, `strategyProofSnapshot`, and `explainability` without new persisted columns, after `TSC-01A-TREV` establishes the trusted candidate shape.
- Active signal health can be a read-path projection first. Durable health history, a new monitor route, or a new persistence model would be separate Product Owner and Architect scope.

## Architecture Decision

Prepare `CF-W1-TSC-02` as a follow-on Today Review-owned active-health projection after `CF-W1-TSC-01A-TREV` is accepted.

Recommended first executable child:

- `CF-W1-TSC-02A-TREV-HEALTH`

The child should:

- consume accepted Trusted Signal Candidate evidence from Today Review snapshots;
- project an additive active health object for candidate rows and detail surfaces;
- use source-proven strategy/rule/trigger evidence where available;
- require Data Quality readiness before showing trusted health;
- show missing or unsupported health evidence explicitly;
- avoid Trade Plan, target-price, arbitrary target, stop-geometry, R:R, or advice framing.

Do not create a new page or active monitor in the first child. A later active-candidate monitor can consume the same health projection after the projection is accepted.

## Proposed Contract Shape

The first child should add semantics equivalent to:

```ts
type TrustedSignalHealthState =
  | 'ACTIVE'
  | 'HEALTHY'
  | 'WEAKENING'
  | 'RISK_WARNING'
  | 'EXIT_TRIGGERED'
  | 'INVALIDATED'
  | 'EXPIRED'
  | 'BLOCKED';

type TrustedSignalHealthEvidenceStatus =
  | 'SOURCE_PROVEN'
  | 'PARTIAL'
  | 'MISSING_RULE_EVIDENCE'
  | 'UNSUPPORTED'
  | 'DATA_QUALITY_BLOCKED';

interface TrustedSignalHealthProjection {
  state: TrustedSignalHealthState;
  evidenceStatus: TrustedSignalHealthEvidenceStatus;
  summary: string;
  reasonCodes: string[];
  evidenceDate: string | null;
  sourceModule: string;
  strategyCode: string | null;
  strategyVersion: string | null;
  ruleId: string | null;
  ruleVersion: string | null;
  missingEvidenceReasons: string[];
}
```

Exact names may differ. The semantics must remain stable.

## Required Mapping Rules

- `BLOCKED`
  - Data Quality is blocked, missing, unsupported, stale-hard-blocked, or scope-mismatched; or
  - the candidate lacks the accepted source-proven entry trigger evidence required by `TSC-01A`.
- `ACTIVE`
  - the candidate has accepted entry evidence, but no documented health upgrade, weakening, risk, exit, invalidation, expiry, or hard block is currently proven.
- `HEALTHY`
  - allowed only when a documented rule/version or accepted evidence source proves the candidate remains valid.
- `WEAKENING`
  - allowed only when a documented rule/version or accepted evidence source proves weakening. Price movement alone is insufficient.
- `RISK_WARNING`
  - allowed only when a documented risk rule, DQ residual, or accepted module-owned risk evidence proves a warning.
- `EXIT_TRIGGERED`
  - allowed only when documented exit rule evidence proves the exit trigger.
- `INVALIDATED`
  - allowed only when documented invalidation rule evidence proves invalidation.
- `EXPIRED`
  - allowed only when a documented strategy/rule expiry condition proves expiry. Age alone is not enough unless the strategy defines that age rule.

If source evidence cannot prove a non-basic state, keep the state conservative as `ACTIVE` or `BLOCKED` and populate missing-evidence reasons.

## Module Boundary

Primary owner:

- `today-trade-review`

Allowed read-only evidence sources through accepted/public snapshots or service outputs:

- `signal-generation-engine`
- `data-quality-engine`
- `strategy-framework`
- `strategy-decision-engine`
- `signal-quality-lab`
- `historical-context-snapshots`
- `market-context-intelligence`

Do not make `trade-plan-risk-engine` the source of truth for health. Existing compatibility payloads may remain in snapshots, but target-shaped fields, R:R, and stop geometry must not support health state assignment.

## Conditional Future File Reservations

Allowed implementation files after `TSC-01A-TREV` acceptance and Team 00 promotion:

- `backend/src/modules/today-trade-review/today-trade-review.types.ts`
- `backend/src/modules/today-trade-review/today-trade-review.service.ts`
- `backend/src/modules/today-trade-review/today-trade-review.md`
- `backend/tests/modules/today-trade-review/today-trade-review.service.test.ts`
- `frontend/src/features/today-trade-review/types.ts`
- `frontend/src/features/today-trade-review/components/TodayReviewPage.tsx`
- `frontend/src/features/today-trade-review/components/TodayReviewCandidateDetailPage.tsx`
- `frontend/tests/ui/today-trade-review.spec.ts`

## Exact Forbidden Files

- application source or tests before Team 00 promotion
- Prisma schema or migrations
- generated files
- `backend/src/modules/today-trade-review/today-trade-review.repository.ts`
- `backend/src/modules/today-trade-review/today-trade-review.controller.ts`
- `backend/src/modules/today-trade-review/today-trade-review.router.ts`
- `backend/src/modules/today-trade-review/today-trade-review.validation.ts`
- `backend/src/modules/today-trade-review/today-trade-review.module.ts`
- `backend/src/modules/today-trade-review/index.ts`
- `frontend/src/features/today-trade-review/api/**`
- `frontend/src/features/today-trade-review/hooks/**`
- `frontend/src/features/today-trade-review/routes.tsx`
- backend or frontend route registries
- shared backend utilities
- shared frontend components
- package manifests
- Signal Generation, Data Quality, Strategy Framework, Strategy Decision, Signal Quality, Market Data, Backtesting, Trade Plan, Portfolio, Watchlist, Alerts, Copilot, Research Hub, Market Context, or Historical Context source/tests
- provider/live-data, startup/backfill, paid/cloud, broker, telemetry, or credential files

## Dependencies And Sequencing

Hard blockers before Ready:

- `CF-W1-TSC-01A-TREV` accepted through QA, review, Architect Signoff, delegated PO acceptance, and scoped branch commit.
- Team 00 records the accepted `TSC-01A-TREV` base for the health child.
- Team 04 prepares a `CF-W1-TSC-02` QA plan.

Soft alignment dependency:

- Accepted `CF-W1-DQ-03` residual summaries should be consumed if available. If not available on the implementation base, `TSC-02` may use existing Data Quality snapshot fields but must label compact DQ reason summaries as unavailable rather than reimplementing DQ interpretation.

## Shared-File Risk Assessment

- The file set overlaps exactly with active `CF-W1-TSC-01A-TREV`; do not run both in parallel.
- No schema, route, shared UI, shared utility, package, generated, provider/live, or startup/backfill scope is needed for the first health child.
- The implementation must remain one writer across the Today Review backend/frontend file set.

## QA Implications

Team 04 should later require focused coverage for:

- active with complete entry evidence but no health upgrade;
- healthy from documented rule evidence;
- weakening from documented rule evidence;
- risk warning from documented risk/DQ evidence;
- exit triggered from documented exit rule evidence;
- invalidated from documented invalidation rule evidence;
- expired from documented expiry rule evidence;
- blocked by missing or failed Data Quality;
- missing-rule-evidence downgrade;
- no target, R:R, Trade Plan, advice, or arbitrary target leakage on touched Today Review surfaces.

## Architecture Verdict

- Item: `CF-W1-TSC-02`
- Result: `BOUNDED FOLLOW-ON / NOT READY`
- Recommended implementation owner after blockers clear: Team 07 - Portfolio / Watchlist / Alerts / Today Review
- Ready for Team 00 promotion now: no
- Exact blocker: accepted `CF-W1-TSC-01A-TREV` implementation and `CF-W1-TSC-02` QA plan are missing
- Next gate: wait for `CF-W1-TSC-01A-TREV` acceptance, then Team 04 QA planning and Team 00 stacked Ready evaluation
