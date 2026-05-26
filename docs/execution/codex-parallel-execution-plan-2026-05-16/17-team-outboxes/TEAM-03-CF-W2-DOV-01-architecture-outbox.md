# TEAM-03 CF-W2-DOV-01 Architecture Outbox

Date: 2026-05-26

Team: Team 03 - Solution Architecture Factory

Mode: docs-only architecture refresh in main workspace

## Verdict

`READY-CANDIDATE AFTER QA`

Reasons:

- The investor/trader-first first slice can be built from existing public read APIs with frontend-only staged composition.
- No backend adapter, route registry, schema, package, generated-file, shared UI, provider/live, startup/backfill, or pipeline command scope is needed for slice 1.
- Market Movers and FII/DII Activity have no truthful current source and are explicitly placeholder-only.
- The old admin-style first-viewport sections have been demoted to compact caveats/supporting navigation.
- Team 04 must refresh QA against the new hierarchy before Team 00 re-confirms Ready.

## Assignment

Refresh the `CF-W2-DOV-01` Daily Overview architecture review/source map so it matches the latest Product Owner direction and Team 08 investor/trader-first UX plan.

## Files Changed

- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W2-DOV-01-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W2-DOV-01-daily-overview-dashboard-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W2-DOV-01-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-CF-W2-DOV-01-architecture-outbox.md`

## Files Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W2-DOV-01-daily-overview-interactive-market-dashboard-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/05-ux/CF-W2-DOV-01-daily-overview-dashboard-ux-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W2-DOV-01-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W2-DOV-01-daily-overview-dashboard-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W2-DOV-01-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/12-ready-queue/ready-for-implementation.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-08-CF-W2-DOV-01-ux-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-CF-W2-DOV-01-architecture-outbox.md`
- `frontend/src/app/HomePage.tsx`
- `frontend/src/app/routes.tsx`
- `frontend/src/contexts/MarketScopeContext.tsx`
- `frontend/src/features/today-trade-review/types.ts`
- `frontend/src/features/today-trade-review/hooks/useTodayReview.ts`
- `frontend/src/features/research-hub/api/researchHubApi.ts`
- `frontend/src/features/research-hub/hooks/useResearchOverview.ts`
- `frontend/src/features/market-context-intelligence/api/marketContextIntelligenceService.ts`
- `frontend/src/features/market-context-intelligence/types.ts`
- `frontend/src/features/data-quality-engine/api/dataQualityEngineService.ts`
- `frontend/src/features/data-quality-engine/types.ts`
- `frontend/src/features/signal-generation-engine/api/signalGenerationEngineService.ts`
- `frontend/src/features/signal-generation-engine/types.ts`
- `frontend/src/features/pipeline-ops/api/pipelineOpsService.ts`
- `frontend/src/features/pipeline-ops/types.ts`
- `frontend/src` and `backend/src` search results for `dailyChangeDesc`, `dailyChangeAsc`, `Market Movers`, `FII`, and `DII`

## Architecture Decision

Chosen:

- frontend-only first slice
- staged loading from existing read APIs
- feature-local dashboard under `frontend/src/features/daily-overview-dashboard`
- `frontend/src/app/HomePage.tsx` as the only existing app-shell writer file

Deferred:

- backend `daily-overview-dashboard` adapter
- route registry edits
- market-wide movers API/storage
- FII/DII source/API/storage
- calibration/outcome/signal-position dashboard aggregates

## Exact First-Slice Sections

Implementable now from current truth:

- Header Rail
- Market Pulse
- High-Priority Review Candidates
- Watch And Blocked
- compact Evidence Caveats
- secondary Supporting Navigation

Placeholder-only now:

- `Coming soon - Market Movers`
- `Coming soon - FII/DII Activity`
- `Coming soon - Signal Position Follow-Through`, only if included below primary sections
- `Coming soon - Calibration Evidence-Through Summary`, only if included below primary sections
- `Coming soon - Measured Outcome Follow-Through`, only if included below primary sections

Deferred because it needs new storage/API/provider/route/shared scope:

- truthful scoped market-wide movers read model/API/hook
- truthful local FII/DII institutional-flow source and contract
- backend Daily Overview adapter
- canonical persisted dashboard snapshot
- calibration evidence-through dashboard rollup
- measured outcome follow-through dashboard rollup
- signal-position follow-through dashboard integration

## Frontend vs Backend Decision

Frontend-only remains the correct first slice.

The bounded read set is:

- `GET /api/v1/today-review/latest`
- `GET /api/v1/research/overview`
- `GET /api/v1/market-data/review-readiness-summary`
- `GET /api/v1/market-context/summary`
- `GET /api/v1/data-quality/summary`
- `GET /api/v1/signals/runs/latest`
- `GET /api/v1/pipeline/status`
- `useMarketScope()`

Backend adapter is blocked unless a later Decision Packet proves measured performance, fanout, consistency, or snapshot needs that cannot be solved inside the frontend-only contract.

## File Reservations For Next Implementation Pass

Allowed writer set:

- `frontend/src/app/HomePage.tsx`
- `frontend/src/features/daily-overview-dashboard/index.ts`
- `frontend/src/features/daily-overview-dashboard/types.ts`
- `frontend/src/features/daily-overview-dashboard/api/dailyOverviewDashboardApi.ts`
- `frontend/src/features/daily-overview-dashboard/hooks/useDailyOverviewDashboard.ts`
- `frontend/src/features/daily-overview-dashboard/components/DailyOverviewDashboardPage.tsx`
- `frontend/src/features/daily-overview-dashboard/components/MarketPulsePanel.tsx`
- `frontend/src/features/daily-overview-dashboard/components/ReviewCandidatesPanel.tsx`
- `frontend/src/features/daily-overview-dashboard/components/WatchBlockedPanel.tsx`
- `frontend/src/features/daily-overview-dashboard/components/ComingSoonPanel.tsx`
- `frontend/src/features/daily-overview-dashboard/components/EvidenceCaveatsPanel.tsx`
- `frontend/src/features/daily-overview-dashboard/components/SupportingNavigationPanel.tsx`
- `frontend/src/features/daily-overview-dashboard/components/**` for additional feature-local components only
- `frontend/tests/ui/daily-overview-dashboard.spec.ts`

Forbidden writer scope:

- `backend/src/**`
- `backend/tests/**`
- `frontend/src/app/routes.tsx`
- `frontend/src/app/navigationMetadata.tsx`
- `frontend/src/shared/**`
- `frontend/src/contexts/**`
- existing feature source outside read-only imports
- package manifests and lockfiles
- Prisma schema/migrations/generated files
- provider/live/startup/backfill/scheduler/worker/queue files
- route registries
- root `AGENTS.md`
- `docs/AGENTS.md`
- `docs/codex-agent-team-plan/**`

## QA Handoff Notes

Team 04 should verify:

- first viewport is investor/trader-first and not admin/developer monitoring
- Market Pulse and High-Priority Review Candidates anchor the first viewport
- Market Movers is a `Coming soon` placeholder with no fake rows or watchlist relabeling
- FII/DII Activity is a `Coming soon` placeholder with no Smart Money relabeling
- Watch And Blocked uses Today Review reasons
- Evidence Caveats remains compact and secondary
- source failures are local to sections
- forbidden advice/target/reward-risk/fake-confidence language is absent
- UI smoke proves visible scoped data or domain-specific empty/limited states

Required implementation validation after Ready:

```text
cd frontend
npm.cmd run build
npm.cmd run test:ui -- daily-overview-dashboard.spec.ts --workers=1
```

No tests, builds, servers, Prisma commands, or app-code edits were run by Team 03 in this docs-only pass.

## Risks

- `ready-for-implementation.md` still contains prior DOV Ready promotion text; Team 00 should reconcile it after Team 04 QA refresh.
- Market Context is region-level from the current frontend public API, so asset-type-specific wording must be caveated.
- Multi-source reads are not atomic; the UI must not imply a single generated dashboard snapshot.
- Placeholder-only sections must stay placeholders even if the UI would look more complete with invented values.

## Next Gate

Team 04 QA refresh, then Team 00 Ready evaluation and file-reservation confirmation.
