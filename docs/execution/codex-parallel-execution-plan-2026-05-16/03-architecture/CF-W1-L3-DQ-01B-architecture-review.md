# CF-W1-L3-DQ-01B Architecture Review

Date: 2026-05-20

Owner: Team 03 Architecture Factory

## Status

Architecture-readiness prepared. Not Ready for Implementation.

Do not promote `CF-W1-L3-DQ-01B` from Team 03. This child is a bounded backend-only `portfolio-intelligence` packet, but it still depends on the accepted passive readiness baseline from `DQ-01A` and accepted `PORT-01A` source semantics that are not present on plain current `dev`.

## Evidence Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-L3-DQ-01B-portfolio-intelligence-reliability-gate-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-L3-DQ-01A-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-L3-DQ-01A-lane-3-passive-readiness-dto-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-L3-DQ-01A-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-L3-INTEL-01-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-L3-INTEL-01-portfolio-intelligence-reliability-gate-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-L3-INTEL-02-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-L3-INTEL-02-portfolio-intelligence-review-traceability-contract.md`
- current `dev` source:
  - `backend/src/modules/portfolio-intelligence/portfolio-intelligence.service.ts`
  - `backend/src/modules/portfolio-intelligence/portfolio-intelligence.types.ts`
  - `backend/src/modules/portfolio-intelligence/portfolio-intelligence.md`
  - `backend/tests/modules/portfolio-intelligence/portfolio-intelligence.service.test.ts`
  - `backend/src/modules/portfolio-management/portfolio-management.types.ts`
- accepted upstream baseline:
  - `git show f1432e6:backend/src/modules/portfolio-management/portfolio-management.types.ts`
- base evidence:
  - `git merge-base --is-ancestor f1432e6 HEAD`
  - `git merge-base --is-ancestor a2edfb6 HEAD`
  - `git branch --contains f1432e6`
  - `git branch --contains a2edfb6`

## Current Source Findings

- Current `portfolio-intelligence` on `dev` is still heuristic-only. It computes `healthScore`, `status`, `reviewRanking`, `redFlags`, `decisionLabel`, and `actionSuggestion` from P&L, allocation, signal direction, signal staleness, and `summary.dataStatus`.
- Current `PortfolioIntelligenceResponse` exposes no explicit reliability gate. It returns only `dataStatus`, which reflects market-data completeness rather than accepted Lane 3 readiness.
- Current `ReviewItem`, `HoldingIntelligence`, and `RedFlag` shapes expose no reliability state. Existing response fields can therefore overstate trust unless a new gate is added.
- Current `backend/src/modules/portfolio-management/portfolio-management.types.ts` on plain `dev` still lacks:
  - `PortfolioSummaryDto.readinessSummary`
  - `HoldingValuationDto.readiness`
- Accepted `CF-W1-L3-PORT-01A` commit `f1432e6` defines the required upstream readiness DTOs and makes `portfolio-management` the approved trust boundary for downstream consumers.
- Accepted `CF-W1-L3-PORT-01A` commit `f1432e6` and accepted `CF-W1-L3-PORT-01B` commit `a2edfb6` are not ancestors of the current `dev` checkout.
- `WATCH-01` lives on the Team 07 branch containing `a2edfb6`, but it does not share `portfolio-intelligence` source files. It is a sequencing dependency, not a file-writer dependency.
- `INTEL-02` targets the exact same `portfolio-intelligence` writer set. It is downstream scope and must not be opened in parallel with `DQ-01B`.

## Architecture Decision

Prepare `CF-W1-L3-DQ-01B` as a backend-only, module-local `portfolio-intelligence` child that consumes accepted passive readiness metadata through the existing `PortfolioManagementService.summary()` boundary and adds an explicit reliability gate ahead of later traceability work.

The first honest slice should:

- stay inside `portfolio-intelligence.service.ts`, `portfolio-intelligence.types.ts`, module docs, and focused service tests;
- consume only `PortfolioSummaryDto.readinessSummary` and `HoldingValuationDto.readiness` from the accepted `PORT-01A` contract;
- add top-level reliability metadata that distinguishes `RELIABLE`, `LIMITED`, `DIAGNOSTIC`, and `BLOCKED`;
- downgrade or suppress action-like trust claims whenever readiness is not trusted;
- preserve existing response fields and ranking shape for backward compatibility;
- stop short of the richer source-provenance and latest-trusted-date traceability reserved for `INTEL-02`.

Recommended additive top-level shape:

```ts
type PortfolioIntelligenceReliabilityStatus =
  | 'RELIABLE'
  | 'LIMITED'
  | 'DIAGNOSTIC'
  | 'BLOCKED';

interface PortfolioIntelligenceReliabilityDto {
  status: PortfolioIntelligenceReliabilityStatus;
  source: 'portfolio-management-readiness';
  readyCount: number;
  limitedCount: number;
  blockedCount: number;
  missingEvaluationCount: number;
  canTrustHealthScore: boolean;
  canTrustReviewRanking: boolean;
  canTrustRedFlags: boolean;
  canTrustActionSuggestions: boolean;
  reasons: string[];
  blockers: string[];
}
```

Attachment point:

- additive `reliability` on `PortfolioIntelligenceResponse`

This child should not add:

- `latestTrustedDataDate`
- source-module provenance packets
- per-review-item traceability DTOs

Those remain ordered behind `DQ-01B` in `INTEL-02`.

## Reliability Mapping Rule

- `READY` passive readiness with trusted display and action workflow eligibility can support `RELIABLE`.
- `LIMITED` passive readiness may support `LIMITED` or `DIAGNOSTIC` output, but not trusted action-like claims.
- Missing readiness metadata, blocked readiness summary, blocked holding readiness, `NOT_READY`, `UNUSABLE`, stale hard-blocks, unsupported scope, or scope mismatch must fail closed to `BLOCKED` or `DIAGNOSTIC`.
- `dataStatus = COMPLETE` alone must never produce `RELIABLE`.

## Module Locality Result

Yes. `CF-W1-L3-DQ-01B` can stay module-local and backend-only.

Reason:

- the trust gap lives in `portfolio-intelligence`;
- the accepted upstream trust input already belongs to `portfolio-management`;
- no Prisma/schema, route, shared utility, shared UI, package, or frontend change is required for the first bounded slice.

## Exact File Reservations

Current Team 03 doc reservation for this pass only:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-L3-DQ-01B-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-L3-DQ-01B-portfolio-intelligence-reliability-gate-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-L3-DQ-01B-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-CF-W1-L3-DQ-01B-architecture.md`

Recommended future application-file reservation after Team 00 sequencing and Ready promotion:

- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.service.ts`
- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.types.ts`
- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.md`
- `backend/tests/modules/portfolio-intelligence/portfolio-intelligence.service.test.ts`

## Exact Forbidden Files

Current docs pass:

- all application source and tests
- all `WATCH-01` worktree/docs
- all `DQ-01A` docs already owned by the completed gate
- all `INTEL-02` docs owned by the separate Team 03 pass
- Team 02 requirement docs
- Team 04 QA docs
- Team 00 Ready-promotion docs

Future implementation under `DQ-01B`:

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
- backend/frontend route registries
- shared backend utilities or shared DTO files
- shared frontend components
- package manifests
- generated files
- all `frontend/src/features/portfolio-intelligence/**`
- all `frontend/tests/ui/**`
- alerts-monitoring and notifications-delivery source/tests
- provider/live-data/startup/backfill scope
- paid/cloud, broker, or telemetry scope

## Dependency And Sequencing Notes

- `DQ-01A`: hard contract dependency. `DQ-01B` must consume the frozen passive semantics and must not re-decide passive mapping rules.
- `PORT-01A`: hard implementation dependency. Future implementation must stack on accepted `f1432e6` or a later clean `dev` that already contains it.
- `PORT-01B`: no code dependency. It matters only as overall Lane 3 baseline evidence; `DQ-01B` must not consume watchlist readiness DTOs.
- `WATCH-01`: sequencing dependency only. It is ahead in current Lane 3 value ordering, but there is no `portfolio-intelligence` file overlap.
- `INTEL-01`: same problem space and same writer set. Team 00 should avoid opening `INTEL-01` separately if `DQ-01B` is the governing reliability child.
- `INTEL-02`: downstream same-writer-set dependency. `DQ-01B` should land first, or Team 00 must intentionally combine the two scopes into one `portfolio-intelligence` writer pass.

## QA Planning Result

Team 04 QA planning can start now.

Recommended Team 04 scope:

- backend-only `portfolio-intelligence` QA plan
- scenarios for `RELIABLE`, `LIMITED`, `DIAGNOSTIC`, and `BLOCKED`
- proof that missing readiness fails closed
- proof that `LIMITED` and blocked readiness suppress trusted action-like claims
- ancestry/base confirmation for accepted `f1432e6` before executable validation
- explicit separation between this reliability gate and the later `INTEL-02` traceability expansion

## Readiness Result

`CF-W1-L3-DQ-01B` is architecture-ready as a bounded backend-only child, but not Ready for Implementation.

Team 03 recommendation to Team 00:

1. keep `DQ-01B` module-local inside `portfolio-intelligence`;
2. require the accepted `PORT-01A` baseline before implementation starts;
3. let Team 04 start QA planning now;
4. keep `INTEL-02` behind `DQ-01B` unless Team 00 explicitly combines the shared writer set into one packet.
