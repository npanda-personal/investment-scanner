# CF-W1-L3-INTEL-01 Architect Signoff

Date: 2026-05-17

Owner: Team 03 Architecture Factory

Status: Conditional architecture signoff for planning evidence. Not Ready for Implementation.

## Scope

Portfolio Intelligence reliability gate under accepted Lane 3 readiness policy `CF-W1-L3-DQ-01`.

This signoff reviews existing draft artifacts and source evidence. It does not modify the Team 07 draft requirement, architecture review, contract, QA plan, or work packet.

## Evidence Inspected

- `AGENTS.md`
- `16-team-inboxes/TEAM-03-post-decision-child-contracts.md`
- `12-ready-queue/ready-for-implementation.md`
- `12-ready-queue/blocked-by-decision.md`
- `12-ready-queue/blocked-by-upstream-dependency.md`
- `99-decision-inbox/open-decisions.md`
- `10-requirements/CF-W1-L3-INTEL-01-portfolio-intelligence-reliability-gate-requirement.md`
- `03-architecture/CF-W1-L3-INTEL-01-architecture-review.md`
- `06-contracts/CF-W1-L3-INTEL-01-portfolio-intelligence-reliability-gate-contract.md`
- `08-work-packets/CF-W1-L3-INTEL-01-work-packet.md`
- `04-qa/CF-W1-L3-INTEL-01-qa-plan.md`
- `06-contracts/CF-W1-L3-DQ-01-lane3-readiness-consumer-policy-contract.md`
- `06-contracts/CF-W1-L3-PORT-01-portfolio-watchlist-readiness-dto-contract.md`
- `04-qa/post-decision-child-scenario-matrix-2026-05-17.md`
- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.service.ts`
- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.types.ts`
- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.md`
- `backend/tests/modules/portfolio-intelligence/portfolio-intelligence.service.test.ts`
- `backend/src/modules/portfolio-management/portfolio-management.types.ts`
- `backend/src/modules/portfolio-management/portfolio-management.service.ts`
- `backend/src/modules/data-quality-engine/index.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.types.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.service.ts`

## Source Finding

Portfolio Intelligence currently consumes `PortfolioManagementService.summary()` and `allocation()` through public module boundaries. It computes `healthScore`, `status`, `scoreBreakdown`, red flags, review ranking, grouped summaries, and holding `actionSuggestion` from portfolio valuation, latest signal, P&L, allocation, and missing-price/signal checks.

The only current trust-like field is `dataStatus`, copied from Portfolio Management. Current Portfolio Management `dataStatus` is based on missing current prices, not Data Quality readiness, use-case tiers, stale market-data blockers, unsupported scope, or DQ evidence.

Current Portfolio Intelligence tests cover scoring, missing price, bearish/loss flags, ranking, signal overlay, and empty portfolios. They do not prove `READY`, `LIMITED`, missing readiness, or blocked DQ behavior.

## Architecture Decision

The existing `CF-W1-L3-INTEL-01` draft architecture is directionally accepted as planning evidence:

- backend-only;
- additive reliability metadata;
- no route, Prisma, shared utility, shared UI, frontend, package, provider, startup/backfill, Angel One, broker, paid/cloud, or generated-file scope;
- preserve existing response fields for compatibility;
- fail closed when readiness metadata is missing;
- treat `LIMITED` as diagnostic only, not reliable/action-like;
- consume portfolio readiness DTOs from Portfolio Management after `CF-W1-L3-PORT-01A`;
- do not duplicate Data Quality scoring or import Data Quality repositories.

Preferred dependency path:

```text
portfolio-intelligence -> portfolio-management public service -> portfolio readiness DTOs
```

Do not bypass Portfolio Management and call Data Quality Engine directly unless a later Architect/Team 00 decision explicitly changes this dependency model.

## Exact Future File Reservations

Allowed only after `CF-W1-L3-PORT-01A` is implemented and accepted, Team 04 accepts the INTEL QA handoff, and Team 00 promotes this item:

- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.service.ts`
- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.types.ts`
- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.md`
- `backend/tests/modules/portfolio-intelligence/portfolio-intelligence.service.test.ts`

`backend/src/modules/portfolio-intelligence/index.ts` should remain forbidden unless implementation proves a new reliability DTO type must be exported through the public barrel. If that becomes necessary, Team 00 should explicitly reserve the file before source work.

## Forbidden Files

- `backend/src/modules/portfolio-management/**`
- `backend/src/modules/data-quality-engine/**`
- `backend/src/modules/watchlist-management/**`
- `backend/src/modules/alerts-monitoring/**`
- `backend/src/api/routes.ts`
- `frontend/src/app/routes.tsx`
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- shared backend utilities
- shared frontend components
- frontend feature files
- package manifests
- generated/common fixtures
- providers, schedulers, startup/backfill, Angel One, broker, live-provider, paid/cloud, or telemetry paths

## Readiness Result

Architecture signoff is conditional for planning only.

`CF-W1-L3-INTEL-01` is not Ready for Implementation because `CF-W1-L3-PORT-01A` has not been implemented and accepted. The needed `PortfolioSummaryDto.readinessSummary` and `HoldingValuationDto.readiness` fields do not exist in current source.

## Next Gate

Wait for `CF-W1-L3-PORT-01A` implementation acceptance, then Team 00 may evaluate `CF-W1-L3-INTEL-01` for Ready promotion using the existing requirement, contract, QA plan, work packet, and this Team 03 signoff.

## Decision Packet

No new Decision Packet is needed now.

Create one only if a future implementation tries to:

- bypass Portfolio Management and consume DQE directly;
- treat `LIMITED` as reliable or action-like;
- edit Portfolio Management, Data Quality Engine, Prisma, routes, shared utilities, frontend, or shared UI;
- change product language semantics around existing `HOLD`, `REDUCE_RISK`, health score, ranking, or action suggestion fields beyond backend reliability downgrading.
