# CF-W1-L3-INTEL-02 Architecture Review

Date: 2026-05-20

Owner: Team 03 Architecture Factory

## Status

Architecture-readiness refreshed. Not Ready for Implementation.

Do not promote this child to Ready from Team 03. It sits behind active `CF-W1-L3-WATCH-01` in Lane 3 sequencing, it still depends on accepted `CF-W1-L3-PORT-01A` readiness semantics that are not present on current `dev`, it shares the exact same writer set as `CF-W1-L3-INTEL-01`, and there is still no dedicated `CF-W1-L3-INTEL-02` QA plan in `04-qa/`.

## Evidence Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-L3-INTEL-02-portfolio-intelligence-review-traceability-requirement.md`
- existing `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-L3-INTEL-02-architecture-review.md`
- existing `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-L3-INTEL-02-portfolio-intelligence-review-traceability-contract.md`
- existing `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-L3-INTEL-02-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-L3-INTEL-01-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-L3-INTEL-01-portfolio-intelligence-reliability-gate-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-L3-WATCH-01-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-L3-PORT-01B-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-L3-INTEL-01-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/00-control/active-work-board.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/12-ready-queue/ready-for-implementation.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-02-requirement-factory.md`
- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.service.ts`
- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.types.ts`
- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.md`
- `backend/tests/modules/portfolio-intelligence/portfolio-intelligence.service.test.ts`
- `backend/src/modules/portfolio-management/portfolio-management.types.ts`

## Current Source Findings

- Current `portfolio-intelligence` on `dev` is still heuristic-only. It calculates `healthScore`, `status`, `reviewRanking`, `redFlags`, and `actionSuggestion` from portfolio summary fields, signal direction, signal staleness, P&L, allocation, and `summary.dataStatus`.
- Current `portfolio-intelligence` exposes no review-traceability packet. `ReviewItem` contains only ranking fields plus top reasons; there is no explicit reliable/limited/diagnostic/blocked review state, blocker provenance, or latest trusted data date.
- Current `portfolio-management.types.ts` on `dev` still exposes `PortfolioSummaryDto` and `HoldingValuationDto` without the readiness DTO fields that `CF-W1-L3-PORT-01A` is supposed to add. That means the accepted upstream baseline is not yet present on plain current `dev`.
- `CF-W1-L3-WATCH-01` is a different watchlist-owned writer set. It is the next direct-value Lane 3 item by queue order, but it does not share application files with `portfolio-intelligence`.
- `CF-W1-L3-INTEL-01` and `CF-W1-L3-INTEL-02` still reserve the same four `portfolio-intelligence` files. They cannot be implemented by separate concurrent writers.

## Module Boundary Review

`portfolio-intelligence` should own this child.

Reason:

- the required behavior is review-surface trust framing for portfolio intelligence, not watchlist actionability, alert suppression, or portfolio-management readiness mapping;
- the current review ranking and action-like labels are already calculated inside `portfolio-intelligence.service.ts`;
- the first honest slice can stay additive and backend-only by consuming accepted readiness metadata through the existing `PortfolioManagementService.summary()` boundary;
- direct DQE imports would duplicate the Lane 3 readiness-consumer contract and widen ownership unnecessarily.

## Architecture Decision

Prepare `CF-W1-L3-INTEL-02` as a backend-only, module-local `portfolio-intelligence` child that consumes accepted `CF-W1-L3-PORT-01A` readiness DTOs from `PortfolioManagementService` and adds explicit review traceability metadata without changing routes, Prisma, shared utilities, shared UI, or frontend files.

The first child should:

- stay inside `portfolio-intelligence.service.ts`, `portfolio-intelligence.types.ts`, module docs, and focused service tests;
- treat accepted `portfolio-management` readiness metadata as the only upstream trust input;
- add additive review-traceability metadata for overall review output and ranked review items;
- distinguish `RELIABLE`, `LIMITED`, `DIAGNOSTIC`, and `BLOCKED` review states;
- preserve current public Portfolio Intelligence fields for compatibility;
- avoid any direct import of DQE repositories, scoring helpers, or watchlist readiness DTOs.

Recommended additive shape:

```ts
type PortfolioReviewTraceabilityStatus =
  | 'RELIABLE'
  | 'LIMITED'
  | 'DIAGNOSTIC'
  | 'BLOCKED';

interface PortfolioReviewTraceabilityDto {
  status: PortfolioReviewTraceabilityStatus;
  source: 'portfolio-management-readiness';
  sourceModules: Array<'portfolio-management' | 'portfolio-intelligence'>;
  latestTrustedDataDate: string | null;
  reliableHoldingCount: number;
  limitedHoldingCount: number;
  blockedHoldingCount: number;
  missingEvaluationCount: number;
  canTrustReviewRanking: boolean;
  canTrustActionSuggestions: boolean;
  reasons: string[];
  blockers: string[];
}

interface ReviewItemTraceabilityDto {
  status: PortfolioReviewTraceabilityStatus;
  latestTrustedDataDate: string | null;
  reasons: string[];
  blockers: string[];
}
```

Recommended attachment points:

- top-level `reviewTraceability` on `PortfolioIntelligenceResponse`
- additive `traceability` on `ReviewItem`
- optional additive `traceability` on `HoldingIntelligence` only if needed to keep per-holding explanation coherent

## Exact Future File Reservations

Allowed only after Team 00 sequencing and Ready promotion:

- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.service.ts`
- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.types.ts`
- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.md`
- `backend/tests/modules/portfolio-intelligence/portfolio-intelligence.service.test.ts`

## Exact Forbidden Files

- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.repository.ts`
- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.controller.ts`
- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.router.ts`
- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.validation.ts`
- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.module.ts`
- `backend/src/modules/portfolio-intelligence/index.ts`
- `backend/src/modules/portfolio-management/**`
- `backend/src/modules/watchlist-management/**`
- `backend/src/modules/data-quality-engine/**`
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- backend and frontend route registries
- shared backend utilities
- shared frontend components
- package manifests
- generated files
- all `frontend/src/features/portfolio-intelligence/**`
- all `frontend/tests/ui/**`
- alerts-monitoring source/tests
- notifications-delivery source/tests
- providers, startup/backfill, paid/cloud, broker, or telemetry flows
- `CF-W1-L3-WATCH-01` docs or Team 07 worktree

## Dependency And Sequencing Notes

- `CF-W1-L3-WATCH-01`: sequencing dependency only. Team 02 and current Product Owner direction place WATCH-01 ahead of INTEL-02 in direct-value Lane 3 order. There is no shared application-file conflict between the two packets, but INTEL-02 should not preempt the active WATCH-01 implementation lane.
- `CF-W1-L3-PORT-01A`: hard contract dependency. `INTEL-02` needs the accepted readiness DTO semantics from `PORT-01A`, and current plain `dev` does not contain them. Future implementation should therefore stack on accepted `f1432e6` or a later clean `dev` only after Team 00 confirms `f1432e6` is included.
- `CF-W1-L3-PORT-01B`: no code dependency. `INTEL-02` must not consume watchlist readiness DTOs or watchlist files. `PORT-01B` only matters indirectly because it stabilizes the overall Lane 3 readiness baseline and current queue ordering.
- `CF-W1-L3-INTEL-01`: exact same writer set. Team 00 must either combine `INTEL-01` and `INTEL-02` into one backend `portfolio-intelligence` pass or sequence them strictly with one writer at a time.

## Required QA Follow-Through

QA plan refresh is still needed.

Current state:

- `CF-W1-L3-INTEL-01` has a QA plan.
- No dedicated `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-L3-INTEL-02-qa-plan.md` exists.

Team 04 should either:

1. create a dedicated backend-only `CF-W1-L3-INTEL-02` QA plan, or
2. explicitly merge `INTEL-02` scenarios into a combined `INTEL-01 + INTEL-02` QA packet after Team 00 chooses the single-writer strategy.

Minimum INTEL-02 QA scenarios:

- reliable review traceability when upstream readiness allows trusted review output;
- limited review traceability when output is visible but not action-trusted;
- diagnostic-only review context when heuristics are shown without trusted review standing;
- blocked review traceability when readiness evidence is missing or blocked;
- propagation of source modules, blocker reasons, and latest trusted data date where available;
- backward-compatible preservation of current response fields.

## Readiness Result

Architecture-readiness refreshed, but not promoted.

Result:

- the first honest child can stay backend-only and module-local inside `portfolio-intelligence`;
- current `dev` is not a safe plain implementation base because accepted `PORT-01A` readiness semantics are still absent there;
- `WATCH-01` is ahead of this child in current Lane 3 sequencing, but not a shared-file blocker;
- `INTEL-01` remains a same-file writer conflict;
- Team 04 QA planning still needs a dedicated refresh before Team 00 can evaluate any future Ready promotion.
