# CF-W1-RH-01A Architecture Review

Date: 2026-05-26

Owner: Team 03 Architecture Factory

## Status

READY-CANDIDATE architecture packet prepared for Team 04 QA planning and Team 00 sequencing.

`CF-W1-RH-01A` is mature enough for a bounded implementation packet. The requirement exists, the contract field already exists on both backend and frontend, the live `research-hub` source still leaves every actionability `evidenceDate` unwired, and the truthful first slice can stay inside Research Hub-owned files plus feature-local UI smoke.

This child does not overlap the active `CF-W2-DOV-01` or `CF-W2-SPL-01B` writer families. It does overlap other Research Hub packets that touch the same service/page/test files, so Team 00 must keep a single-writer rule across `RH-01`, `RH-02A`, `RH-03`, and this child.

## Evidence Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/next-top-10-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/top-10-ready-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/requirements-backlog.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-RH-01A-research-hub-actionability-evidence-date-wiring-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-RH-01-research-hub-actionability-evidence-wiring-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-RH-01-research-hub-actionability-evidence-wiring-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/audit-research-hub-explainability-2026-05-20.md`
- `backend/src/modules/research-hub/research-hub.service.ts`
- `backend/src/modules/research-hub/research-hub.types.ts`
- `backend/src/modules/research-hub/research-hub.controller.ts`
- `backend/src/modules/research-hub/research-hub.router.ts`
- `backend/src/modules/research-hub/research-hub.md`
- `backend/src/modules/research-hub/index.ts`
- `frontend/src/features/research-hub/api/researchHubApi.ts`
- `frontend/src/features/research-hub/components/ResearchOverviewPage.tsx`
- `frontend/src/features/research-hub/hooks/useResearchOverview.ts`
- `frontend/src/features/research-hub/index.tsx`
- `backend/tests/modules/research-hub/research-hub.service.test.ts`
- `frontend/tests/ui/research-hub.spec.ts`
- public type/service surfaces in:
  - `backend/src/modules/strategy-decision-engine/**`
  - `backend/src/modules/today-trade-review/**`
  - `backend/src/modules/trade-plan-risk-engine/**`
  - `backend/src/modules/signal-quality-lab/**`
  - `backend/src/modules/signal-calibration-engine/**`

## Current Source Findings

- `research-hub.types.ts` and `researchHubApi.ts` already expose `evidenceDate?: string | null` on every `ActionabilityDimension`.
- `research-hub.service.ts` never sets `evidenceDate` on `marketEnvironment`, `dataReadiness`, `strategyProof`, or any `unstableDimension(...)` output.
- `ResearchOverviewPage.tsx` renders actionability status, source module, and message, but it does not render `evidenceDate` anywhere on the tile surface.
- The live service still hard-codes placeholder semantics for:
  - `signalEvidence`
  - `calibrationReadiness`
  - `todayReviewReadiness`
  - `tradePlanReadiness`
- Current public date bases are already available for some dimensions:
  - `StrategyDecisionEngineService.marketGate(region)` returns `updatedAt`
  - `TodayTradeReviewService.latest(...)` returns `run.finishedAt` and `run.sourceSnapshot.generatedAt`
  - `TradePlanRiskEngineService.funnelDiagnostics(...)` returns `generatedAt`
  - `SignalQualityLabService.summary(...)` returns `generatedAt`
- Current public date bases are not honest enough for every dimension:
  - `dataReadiness` blends hub-owned `dataGaps` plus upstream availability and has no single source-owned timestamp
  - `strategyProof` is derived from mixed strategy-decision and backtest-summary evidence with no single shared proof timestamp on the current aggregate
  - `calibrationReadiness` still depends on the calibration-owned evidence-through/basis work tracked under `CF-W2-CAL-02A`

## Architecture Decision

Prepare `CF-W1-RH-01A` as a bounded Research Hub backend + feature-local frontend slice.

The child should:

1. keep the existing `ResearchActionability` shape unchanged;
2. wire `evidenceDate` only for dimensions with a truthful current public basis;
3. keep `evidenceDate: null` for dimensions that still lack a trustworthy dimension-specific basis;
4. keep status semantics conservative and research-support only;
5. update the Research Hub actionability tiles so a present date is visible to the user instead of remaining a silent API-only field.

This is not a shared UI or route change. It is a feature-local rendering adjustment on an already existing tile.

## Source Map

| Dimension | Current truthful basis | `evidenceDate` rule for this child | Notes |
| --- | --- | --- | --- |
| `marketEnvironment` | `StrategyDecisionEngineService.marketGate(region).updatedAt` | Populate when `updatedAt` exists; else `null` | Safe now. |
| `dataReadiness` | None on current aggregate | Keep `null` | Do not reuse market-gate `updatedAt` or overview `generatedAt` as a proxy. |
| `signalEvidence` | `SignalQualityLabService.summary({ horizon: '20D', limit: 1, minSampleSize: 0, region, assetType }).generatedAt` | Populate when the summary read succeeds; else `null` | Date presence must not upgrade status to `READY`. |
| `calibrationReadiness` | Not yet truthful on current base | Keep `null` | `CF-W2-CAL-02A` remains the prerequisite for calibration evidence-date truth. |
| `strategyProof` | Mixed strategy decision + backtest proof inputs | Keep `null` | No single dimension-owned timestamp on the current aggregate. |
| `todayReviewReadiness` | `TodayTradeReviewService.latest({ region, assetType }).run.finishedAt ?? run.sourceSnapshot.generatedAt` | Populate when a latest run exists; else `null` | Safe now if read through the public service only. |
| `tradePlanReadiness` | `TradePlanRiskEngineService.funnelDiagnostics({ region, assetType }).generatedAt` | Populate when diagnostics response exists; else `null` | Safe now if read through the public service only. |

## Smallest Feasible First Child

The smallest honest child is not backend-only.

Backend-only work would still leave the user unable to see the newly wired evidence dates because the current tile renderer never displays them. The safe first slice is:

- `research-hub.service.ts`
- `research-hub.md`
- `research-hub.service.test.ts`
- `ResearchOverviewPage.tsx`
- `frontend/tests/ui/research-hub.spec.ts`

No contract/type expansion is required, so the existing backend/frontend type files should stay untouched.

## Exact Future File Reservations

Allowed files after Team 00 promotion:

- `backend/src/modules/research-hub/research-hub.service.ts`
- `backend/src/modules/research-hub/research-hub.md`
- `backend/tests/modules/research-hub/research-hub.service.test.ts`
- `frontend/src/features/research-hub/components/ResearchOverviewPage.tsx`
- `frontend/tests/ui/research-hub.spec.ts`

## Forbidden Files

- application source or tests before Team 00 Ready promotion
- `backend/src/modules/research-hub/research-hub.types.ts`
- `backend/src/modules/research-hub/research-hub.controller.ts`
- `backend/src/modules/research-hub/research-hub.router.ts`
- `backend/src/modules/research-hub/index.ts`
- `frontend/src/features/research-hub/api/researchHubApi.ts`
- `frontend/src/features/research-hub/hooks/useResearchOverview.ts`
- `frontend/src/features/research-hub/index.tsx`
- `backend/src/api/routes.ts`
- `frontend/src/app/routes.tsx`
- `frontend/src/app/HomePage.tsx`
- `frontend/src/features/daily-overview-dashboard/**`
- `backend/src/modules/today-trade-review/**`
- `backend/src/modules/trade-plan-risk-engine/**`
- `backend/src/modules/signal-quality-lab/**`
- `backend/src/modules/signal-calibration-engine/**`
- `backend/src/modules/strategy-decision-engine/**`
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- generated files
- shared backend utilities
- shared frontend components
- package manifests
- provider/live-data files
- paid/cloud, broker, telemetry, or storage scope

## Sequencing And Dependency Notes

- `CF-W1-RH-01A` is implementable as a standalone child. It does not require the larger `CF-W1-RH-01` status-wiring packet to land first.
- `CF-W1-RH-01`, `CF-W1-RH-02A`, and `CF-W1-RH-03` remain file-overlap blockers if Team 00 tries to run them in parallel against the same Research Hub service/page/test files.
- `CF-W2-CAL-02A` is only a blocker for the calibration date. It is not a blocker for market, signal-quality, today-review, or trade-plan evidence dates.
- Do not treat accepted docs as proof that any earlier Research Hub branch commit is already merged into the current base.

## True Consent-Blocker Assessment

No true consent blocker was found for this bounded first child.

This child requires:

- no schema work
- no route work
- no package work
- no shared UI work
- no upstream source edits
- no storage consent

The real risks are file overlap and date fabrication, not architecture scope.

## Team 04 QA Handoff

Team 04 can start QA planning now.

Minimum QA scenarios:

- visible evidence date on a dimension with a truthful basis
- no evidence date rendered when the basis is intentionally unknown
- signal, today-review, and trade-plan dates present without upgrading the conservative status model
- calibration date remains absent on the current base
- no shared overview timestamp is copied into multiple dimensions
- research-support wording remains intact

## Ready Recommendation

Ready recommendation: `Ready candidate` for Team 04 QA planning and Team 00 sequencing.

## Stop Conditions

Stop and return to Team 00 if implementation requires:

- changing backend or frontend route registries
- touching shared UI components
- expanding the public Research Hub type shape
- editing upstream module source to obtain dates
- using calibration `generatedAt` as a substitute for `CF-W2-CAL-02A` evidence-through semantics
- routing another Research Hub packet into the same file set in parallel
