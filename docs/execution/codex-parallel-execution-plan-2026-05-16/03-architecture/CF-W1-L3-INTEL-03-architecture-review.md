# CF-W1-L3-INTEL-03 Architecture Review

Date: 2026-05-18

Owner: Team 03 Architecture Factory

## Status

Ready candidate architecture packet prepared. Team 04 QA planning and Team 00 sequencing are still required before any implementation handoff.

The bounded first slice is source-supported as a module-local `portfolio-intelligence` vertical slice. It can derive deterministic concentration review from existing portfolio summary, allocation, holding review, and red-flag data without Prisma/schema changes, route-registry edits, shared UI work, portfolio-management source changes, optimizer/rebalance logic, or broad frontend navigation changes.

## Evidence Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/16-team-inboxes/TEAM-03-current-assignment.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-L3-INTEL-03-portfolio-intelligence-concentration-review-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/audit-portfolio-watchlist-alerts.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/99-decision-inbox/open-decisions.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-L3-INTEL-01-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-L3-INTEL-02-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-L3-INTEL-01-portfolio-intelligence-reliability-gate-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-L3-INTEL-02-portfolio-intelligence-review-traceability-contract.md`
- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.md`
- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.service.ts`
- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.types.ts`
- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.validation.ts`
- `backend/src/modules/portfolio-management/portfolio-management.md`
- `backend/src/modules/portfolio-management/portfolio-management.types.ts`
- `backend/tests/modules/portfolio-intelligence/portfolio-intelligence.service.test.ts`
- `backend/tests/modules/portfolio-intelligence/portfolio-intelligence.routes.test.ts`
- `frontend/src/features/portfolio-intelligence/types.ts`
- `frontend/src/features/portfolio-intelligence/api/portfolioIntelligenceService.ts`
- `frontend/src/features/portfolio-intelligence/hooks/usePortfolioIntelligence.ts`
- `frontend/src/features/portfolio-intelligence/components/PortfolioIntelligencePanel.tsx`

## Current Source Findings

- `portfolio-intelligence.service.ts` already consumes `PortfolioManagementService.summary()` and `allocation()` through the module public boundary and receives all required first-slice evidence: holding allocation percent, sector, country, unrealized P&L, latest signal, holding review labels, and allocation buckets by holding/sector/country.
- The backend already detects holding, sector, and country concentration inside `detectRedFlags()`, but it does not project an explicit concentration-review object or deterministic cross-exposure review order.
- `reviewRanking()` is currently holding-only. It does not rank sector or country exposure alongside top holding exposure, and it does not distinguish diagnostic concentration from action-like advice.
- `PortfolioIntelligencePanel.tsx` already renders health, red flags, review ranking, grouped summaries, and signal overlay inside the existing portfolio detail panel. A concentration-review section can be added inside that existing feature surface without route changes or shared UI extraction.
- The current feature has no dedicated `portfolio-intelligence` UI smoke spec. A focused feature-owned UI smoke is reasonable for this slice because the requirement is user-facing and changes list/detail behavior.

## Module Boundary Review

`portfolio-intelligence` owns the bounded first slice.

Reasons:

- the required evidence is already available inside the module's current `summary + allocation -> intelligence` flow;
- the requirement is about review ordering and explainability, not portfolio mutation, holdings CRUD, optimizer logic, or rebalance workflows;
- the visible user value depends on the existing `portfolio-intelligence` panel, not on shared navigation or shared UI components.

No `portfolio-management` source edit is required for the first slice. `portfolio-intelligence` can continue consuming allocation and summary data through the current public service dependency.

## Architecture Decision

Prepare `CF-W1-L3-INTEL-03` as a bounded `portfolio-intelligence` vertical slice with additive concentration-review DTO fields plus module-owned UI rendering inside `PortfolioIntelligencePanel`.

The first slice should:

- stay on the existing `/portfolios/:id/intelligence` route and existing feature surface;
- add explicit concentration-review taxonomy for holding, sector, and country exposures;
- rank exposures deterministically using existing allocation, review, red-flag, and signal-overlay evidence only;
- preserve research-support language such as `review`, `concentration`, `risk`, and `reason summary`;
- avoid optimizer, rebalance, target-price, tax, and advice semantics.

## Recommended Additive Shape

Recommended additive response fields:

```ts
type ConcentrationReviewDimension = 'HOLDING' | 'SECTOR' | 'COUNTRY';

type ConcentrationReviewPriority =
  | 'HIGH_REVIEW_PRIORITY'
  | 'ELEVATED_REVIEW_PRIORITY'
  | 'MONITOR'
  | 'DIVERSIFICATION_WATCH';

type ConcentrationReviewReasonCode =
  | 'TOP_HOLDING_THRESHOLD'
  | 'SECTOR_THRESHOLD'
  | 'COUNTRY_THRESHOLD'
  | 'HIGH_RISK_HOLDING'
  | 'REVIEW_HOLDING'
  | 'BEARISH_SIGNAL_EXPOSURE'
  | 'UNREALIZED_LOSS_EXPOSURE'
  | 'TOO_FEW_HOLDINGS';

interface ConcentrationReviewItem {
  dimension: ConcentrationReviewDimension;
  key: string;
  allocationPercent: number;
  priority: ConcentrationReviewPriority;
  reasonSummary: string;
  reasonCodes: ConcentrationReviewReasonCode[];
  affectedHoldingCount: number;
  highRiskHoldingCount: number;
  reviewHoldingCount: number;
  bearishHoldingCount: number;
  affectedSymbols: string[];
}

interface PortfolioConcentrationReviewSummary {
  highestPriority: ConcentrationReviewPriority | null;
  topExposureDimension: ConcentrationReviewDimension | null;
  topExposureKey: string | null;
  topExposureAllocationPercent: number | null;
  reasonSummary: string;
}
```

Attach points:

- top-level `concentrationReviewSummary` on `PortfolioIntelligenceResponse`
- top-level `concentrationReview` array on `PortfolioIntelligenceResponse`
- optional additive `concentrationContext` on `ReviewItem` only if implementation needs a per-holding explanation tie-back

## Deterministic Ranking Rules

The first slice should use a fixed backend sort equivalent to:

1. concentration review priority
2. allocation percent descending
3. high-risk holding count descending
4. review holding count descending
5. bearish holding count descending
6. exposure key ascending as the stable final tie-break

Recommended first-pass priority mapping:

- `HIGH_REVIEW_PRIORITY`: top holding, sector, or country above module thresholds with additional review evidence such as `HIGH_RISK`, `REVIEW`, bearish, or loss-heavy affected holdings
- `ELEVATED_REVIEW_PRIORITY`: above-threshold exposure without the strongest review evidence
- `MONITOR`: below-threshold but still meaningful exposure concentration
- `DIVERSIFICATION_WATCH`: empty or low-count diversification warning states

The first slice should reuse existing module thresholds from `portfolio-intelligence.validation.ts` rather than inventing optimizer-style target bands.

## Exact Future File Reservations

Allowed files after Team 00 promotion:

- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.service.ts`
- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.types.ts`
- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.md`
- `backend/tests/modules/portfolio-intelligence/portfolio-intelligence.service.test.ts`
- `frontend/src/features/portfolio-intelligence/types.ts`
- `frontend/src/features/portfolio-intelligence/components/PortfolioIntelligencePanel.tsx`
- optional new focused UI smoke: `frontend/tests/ui/portfolio-intelligence.spec.ts`

## Forbidden Files

- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.router.ts`
- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.controller.ts`
- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.repository.ts`
- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.validation.ts`
- `backend/tests/modules/portfolio-intelligence/portfolio-intelligence.routes.test.ts`
- `backend/src/modules/portfolio-management/**`
- `backend/src/modules/strategy-decision-engine/**`
- `backend/src/api/routes.ts`
- `frontend/src/app/routes.tsx`
- `frontend/src/features/portfolio-intelligence/api/portfolioIntelligenceService.ts`
- `frontend/src/features/portfolio-intelligence/hooks/usePortfolioIntelligence.ts`
- `frontend/src/features/portfolio-intelligence/routes.tsx`
- `frontend/src/shared/components/**`
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- shared backend utilities
- package manifests
- generated files
- optimizer, rebalance, tax, broker, provider/startup, paid/cloud, or telemetry flows

## Dependency And Conflict Notes

- No schema, route, shared UI, optimizer/rebalance, or `portfolio-management` source blocker was found for the bounded first slice.
- This packet is a direct one-writer conflict with `CF-W1-L3-INTEL-01` and `CF-W1-L3-INTEL-02`. All three reserve `portfolio-intelligence.service.ts`, `portfolio-intelligence.types.ts`, `portfolio-intelligence.md`, and the focused service test.
- Team 00 must either:
  - combine `INTEL-01`, `INTEL-02`, and `INTEL-03` intentionally into one `portfolio-intelligence` writer pass, or
  - sequence them strictly with one writer at a time.
- Trust-first sequencing behind accepted `CF-W1-L3-PORT-01A` remains the preferred order because Portfolio Intelligence is a downstream review surface, but that is a sequencing recommendation rather than a structural blocker for the bounded concentration-review slice.

## QA Planning Handoff For Team 04

Team 04 can start QA planning now for the bounded first slice.

Minimum backend scenarios:

- top-holding concentration ranks ahead of lower-priority exposure when threshold and review evidence are both present;
- sector concentration rises ahead of low-risk holdings when multiple affected holdings are `REVIEW` or `HIGH_RISK`;
- country concentration appears only when existing threshold/evidence rules justify review;
- too-few-holdings state maps to diversification watch without optimizer or rebalance language;
- reason summaries are derived from existing allocation, loss, signal, and red-flag evidence only;
- existing `healthScore`, `status`, `redFlags`, `reviewRanking`, `groupedSummary`, and `signalOverlay` fields remain backward-compatible.

Minimum frontend scenarios:

- the existing Portfolio Intelligence panel renders a dedicated concentration-review section on the current detail surface;
- exposures are shown in deterministic order with readable reason summaries;
- empty holdings still show the existing domain-specific empty state;
- no new route, shared component, or navigation behavior is introduced;
- no direct financial-advice wording appears in headings, badges, or helper text.

Suggested focused commands after implementation exists:

```powershell
cd backend
npm.cmd test -- portfolio-intelligence.service.test.ts --runInBand
npm.cmd run build
```

```powershell
cd frontend
npm.cmd run test:ui -- portfolio-intelligence.spec.ts --workers=1
npm.cmd run build
```

If no focused `portfolio-intelligence` UI smoke is added, Team 04 should record that exact gap and keep user-visible regression risk explicit.

## Readiness Result

Ready candidate.

- Smallest module-local first slice is feasible.
- No split is required for the bounded concentration-review packet itself.
- No schema, route, shared UI, optimizer/rebalance, `portfolio-management` source, or broad frontend blocker is required.
- Team 04 QA planning is the next gate.
- Team 00 must enforce one-writer sequencing against `CF-W1-L3-INTEL-01` and `CF-W1-L3-INTEL-02`.
