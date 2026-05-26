# CF-W2-DOV-01 Architecture Review

Date: 2026-05-26

Owner: Team 03 - Solution Architecture Factory

Mode: Docs-only architecture refresh. No application source, tests, package manifests, route registries, Prisma/schema/migrations/generated files, shared UI, provider/live calls, startup/backfill, or backend/frontend source were modified.

## Status

`READY-CANDIDATE AFTER QA`

This architecture refresh supersedes the earlier admin/developer-style Daily Overview packet. It aligns the first implementation slice to the latest Product Owner direction and Team 08 UX plan: Daily Overview must read as an investor/trader daily dashboard focused on market backdrop, review candidates, watch/blocked setups, and honest placeholders for unavailable market-wide slices.

This file does not self-promote implementation. Team 00 still owns Ready promotion, file reservation, worktree/branch routing, and single-writer sequencing.

## Verdict

Slice 1 can remain frontend-only from existing public read APIs.

Do not create a backend `daily-overview-dashboard` adapter in slice 1.

Reasons:

- Existing public read paths already expose the truthful first-slice summary sources: Today Review latest, Research Overview, review-readiness summary, Market Context summary, Data Quality summary, Signal latest run, and Pipeline status.
- The first viewport can be composed from a bounded staged fanout without route, schema, package, generated, shared UI, provider, or backend source changes.
- A backend adapter would require new backend module ownership plus `backend/src/api/routes.ts` reservation and would duplicate cross-system aggregation responsibilities already partly held by Research Hub before performance evidence proves the need.
- Unsupported investor/trader sections, specifically market-wide gainers/losers and FII/DII Activity, have no truthful current source and must be placeholders rather than a reason to open provider/live or storage scope.

Open a backend adapter only if QA or measured implementation evidence proves the frontend fanout is too slow, too inconsistent, or too broad for first-viewport use. That would require a separate Team 00 Decision Packet.

## Evidence Inspected

Docs:

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W2-DOV-01-daily-overview-interactive-market-dashboard-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/05-ux/CF-W2-DOV-01-daily-overview-dashboard-ux-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W2-DOV-01-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W2-DOV-01-daily-overview-dashboard-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W2-DOV-01-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/12-ready-queue/ready-for-implementation.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-08-CF-W2-DOV-01-ux-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-CF-W2-DOV-01-architecture-outbox.md`

Read-only source:

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
- Search evidence for `dailyChangeDesc`, `dailyChangeAsc`, `Market Movers`, `FII`, and `DII` across `frontend/src`, `backend/src`, and the active execution docs.

## Current Source Reality

- `/` currently renders `frontend/src/app/HomePage.tsx`.
- `HomePage.tsx` is still a static launcher with cards for Today Review, Research Command Center, Market Data Foundation, Trade Plans, and Portfolios.
- `frontend/src/app/routes.tsx` already wires `{ index: true, element: <HomePage /> }`; no route registry edit is needed if `HomePage.tsx` becomes a thin shell for a new feature page.
- Market scope exists through `useMarketScope()` from `frontend/src/contexts/MarketScopeContext.tsx`.
- Today Review exposes `GET /api/v1/today-review/latest` with `groups.longReview`, `groups.shortReview`, `groups.exitRiskReview`, `groups.watchOnly`, `groups.blocked`, `groups.insufficientData`, `groups.unproven`, run status, trust status, source snapshot, scan funnel, and explainability.
- Research Hub exposes `GET /api/v1/research/overview` with market readiness, research priorities, strategy proof summary, confirmation summary, next actions, generated timestamp, and data gaps.
- Review readiness exposes `GET /api/v1/market-data/review-readiness-summary` with review mode, trust status, user decision, trusted/catalog counts, data-through dates, blocker categories, and bounded next action.
- Market Context exposes `GET /api/v1/market-context/summary`, but the frontend API accepts `region` only; it must be labeled as region-level context where asset-type precision is not proven.
- Data Quality exposes `GET /api/v1/data-quality/summary`.
- Signal Generation exposes `GET /api/v1/signals/runs/latest`.
- Pipeline Ops exposes `GET /api/v1/pipeline/status`.
- Search found no truthful public market-wide gainers/losers API or frontend hook. Current daily-change sorting exists for user-owned watchlists and signal rows and must not be labeled market-wide movers.
- Search found no truthful local FII/DII route, DTO, hook, or provider. Smart Money is a price/volume proxy and must not be relabeled as FII/DII Activity.

## Stale Or Conflicting Docs

- Older DOV architecture/contract/work-packet wording centered sections named `Daily Pulse`, `Review Candidate Summary`, `Signal and Evidence Health`, `Data Trust and Pipeline Health`, and `Drilldown Strip`. Those names and hierarchy are stale because the Product Owner rejected the admin/developer monitoring feel.
- `docs/execution/codex-parallel-execution-plan-2026-05-16/12-ready-queue/ready-for-implementation.md` contains a prior `CF-W2-DOV-01` Ready promotion. Treat that promotion as stale until Team 04 QA is refreshed against this investor/trader-first architecture and Team 00 re-confirms Ready.
- Existing QA references may still validate the bounded frontend-only slice, but QA must check the new section hierarchy and placeholder truthfulness, not the old admin-style first viewport.

## Section Classification

| Section | Slice 1 classification | Current truth basis | Architecture rule |
| --- | --- | --- | --- |
| Header Rail | Implementable now from current truth | `useMarketScope()`, latest successful timestamps from loaded section payloads | Show `Daily Overview`, `region / assetType`, research-support disclaimer, refresh action, and a reviewability chip. Do not claim a single backend-generated snapshot timestamp. |
| Market Pulse | Implementable now from current truth, with limitation label | Today Review run/source snapshot, review-readiness summary, Research Overview market readiness/next actions, lower-weight Market Context region summary | First-viewport anchor. Summarize reviewability plus market backdrop. Label Market Context as region-level when asset-type specificity is not proven. |
| High-Priority Review Candidates | Implementable now from current truth | Today Review `groups.longReview`, `groups.shortReview`, `groups.exitRiskReview`; Research Hub priorities only as supporting context | First-viewport anchor. Use source-owned ordering and reason summaries. No buy/sell, target, reward/risk, fake confidence, or synthetic ranking. |
| Watch And Blocked | Implementable now from current truth | Today Review `watchOnly`, `blocked`, `insufficientData`, `unproven`, scan funnel, explainability, blockers/watch reasons | Main overview section. Show reasons before encouraging review. Can use tabs/segments inside feature-local UI. |
| Market Movers | Placeholder-only now | No truthful public scoped market-wide movers API/hook found. User-owned watchlist daily-change sorting is not market-wide truth. | Render `Coming soon - Market Movers`; state missing source basis: stored scoped market-wide movers read model/API/hook. Do not substitute watchlist or signal row sorting. |
| Institutional Flow / FII/DII Activity | Placeholder-only now | No truthful FII/DII route, DTO, hook, provider, or local source found. Smart Money is not FII/DII. | Render `Coming soon - FII/DII Activity`; state missing source basis: dedicated local institutional-flow contract/source. Do not infer from Smart Money. |
| Evidence Caveats | Implementable now as compact support | Data Quality summary, review-readiness blockers, Pipeline status, Signal latest run warnings, Research Overview data gaps/proof notes | Keep compact and visually secondary. It must not become `Data Trust and Pipeline Health` as a first-viewport identity section. |
| Supporting Navigation | Implementable now as secondary navigation | Existing routes and already loaded section context | Keep below or quiet. Do not rebuild the old drilldown strip as a first-viewport launcher grid. |
| Signal Position Follow-Through | Placeholder-only now | Depends on accepted/future Signal Position Ledger UI/route/lifecycle surfaces, not current DOV truth | May appear only as explicit `Coming soon` below primary sections if included. |
| Calibration Evidence-Through Summary | Placeholder-only now | Current calibration read paths do not provide a truthful DOV-level scoped aggregate on this base | May appear only as explicit `Coming soon`; do not infer from `signals/calibration/health` or first rows. |
| Measured Outcome Follow-Through | Placeholder-only now | No stable Daily Overview outcome memory summary contract | May appear only as explicit `Coming soon`; do not fake measured follow-through. |
| Backend Dashboard Adapter | Deferred | Not required by current truth. Would need new backend module and route registry. | Deferred unless measured performance or consistency evidence justifies a Decision Packet. |
| Market-wide movers storage/API | Deferred | Missing current source | Needs new storage/read model/API/provider policy in a later requirement. Not slice 1. |
| FII/DII provider/source/API | Deferred | Missing current source | Needs dedicated local/free institutional-flow source contract. Not slice 1. |

## Investor/Trader-First Source Map

### 1. Header Rail

Use:

- static page title `Daily Overview`
- active `region / assetType` from `useMarketScope()`
- latest successful loaded timestamp from section payloads, labeled as loaded/source timestamp rather than a canonical dashboard snapshot
- visible research-support disclaimer
- one refresh action that refetches read APIs only
- one compact reviewability chip from Today Review or review-readiness summary

Do not use:

- launch-card grid
- marketing hero layout
- backend-generated dashboard timestamp claim
- operational status as the page identity

### 2. Market Pulse

Primary truth:

- `TodayReviewResponse.run.status`
- `TodayReviewResponse.run.trustStatus`
- `TodayReviewResponse.run.reviewUniverseMode`
- `TodayReviewResponse.run.sourceSnapshot.reviewReadiness`
- `DataQualityReviewReadinessSummary.reviewMode`
- `DataQualityReviewReadinessSummary.trustStatus`
- `DataQualityReviewReadinessSummary.userDecision`
- `DataQualityReviewReadinessSummary.blockers`
- `DataQualityReviewReadinessSummary.nextAction`

Supporting truth:

- `ResearchOverview.marketReadiness.headline`
- `ResearchOverview.marketReadiness.reasons`
- `ResearchOverview.nextActions`
- `MarketContextSummary.regime`
- `MarketContextSummary.breadth`
- `MarketContextSummary.topSectors`
- `MarketContextSummary.weakSectors`

Rules:

- Use Market Pulse as a first-viewport investor/trader briefing, not a module health summary.
- Show `limited`, `blocked`, or `mixed evidence` when source evidence is partial or contradictory.
- Treat Market Context as region-level if asset-type-specific proof is unavailable.
- Do not wire the pulse to unstable Research Hub actionability dimensions for Today Review, Calibration, or Trade Plan readiness.

### 3. High-Priority Review Candidates

Primary truth:

- bullish review: `TodayReviewResponse.groups.longReview`
- bearish review: `TodayReviewResponse.groups.shortReview`
- exit-risk review: `TodayReviewResponse.groups.exitRiskReview`
- per-row `symbol`, `companyName`, `state`, `direction`, `setupType`, `strategyCode`, `strategyVersion`, `reasonSummary`, `blockers`, `watchReasons`, `createdAt`, `updatedAt`, and candidate detail route

Supporting truth:

- `ResearchOverview.researchPriorities.tradeCandidates`
- `ResearchOverview.researchPriorities.exitCandidates`
- `ResearchOverview.strategyProofSummary`

Rules:

- Today Review owns counts and source ordering.
- Research Hub may add source-labeled context but must not override Today Review ordering.
- Do not surface Trade Plan target geometry, target price, reward/risk, or execution-style language.
- Avoid `high conviction trade`; use `high-priority review candidate`.

### 4. Watch And Blocked

Primary truth:

- `TodayReviewResponse.groups.watchOnly`
- `TodayReviewResponse.groups.blocked`
- `TodayReviewResponse.groups.insufficientData`
- `TodayReviewResponse.groups.unproven`
- `TodayReviewResponse.run.scanFunnel`
- `TodayReviewResponse.run.explainability.exclusionSummaries`
- row-level `blockers`, `watchReasons`, and `explainability`

Rules:

- This is a protective investor/trader section, not an error console.
- Show top blocker/caution reasons before any review CTA.
- Use row-level drill links to Today Review candidate details where IDs exist.

### 5. Coming Soon - Market Movers

Status: placeholder-only.

Required copy basis:

- market-wide gainers/losers are not yet available from a truthful scoped stored-data summary
- missing source basis: scoped market-wide movers API/hook backed by stored market data
- watchlist daily-change sorting and signal row sorting are not market-wide movers and must not be relabeled

Forbidden:

- fake mover rows
- fake counts
- live provider calls
- watchlist or portfolio rows labeled as market movers

### 6. Coming Soon - FII/DII Activity

Status: placeholder-only.

Required copy basis:

- no current route, DTO, hook, provider, or local source exposes truthful FII/DII activity
- missing source basis: dedicated local institutional-flow source and contract
- Smart Money price/volume proxy summaries are not FII/DII Activity

Forbidden:

- guessed inflow/outflow values
- Smart Money relabeling
- provider/live scraping or external data calls

### 7. Evidence Caveats

Truthful now:

- Data Quality summary counts and `dataStatus`
- review-readiness trust status, blockers, and next bounded action
- pipeline active/latest run and stage warning/failure/blocker counts
- latest signal run status/warnings
- Research Overview data gaps and strategy-proof notes

Rules:

- Keep this compact and visually secondary.
- It may link to Data Quality, Pipeline Ops, Signals, and Calibration.
- It must not reintroduce `Data Trust and Pipeline Health` or `Signal and Evidence Health` as first-viewport product identity sections.
- No pipeline command execution from Daily Overview in slice 1.

### 8. Supporting Navigation

Allowed route targets:

- `/today-review`
- `/research`
- `/market-context`
- `/signals`
- `/signals/calibration`
- `/data-quality`
- `/smart-money`
- `/pipeline-ops`
- `/backtests`

Rules:

- Context chips must come only from already loaded payloads.
- Omit chips where truthful context is unavailable.
- Keep navigation supporting, not a launch grid.

## Load Strategy

Use staged frontend composition with section-local errors.

Critical first-viewport load:

1. `GET /api/v1/today-review/latest`
2. `GET /api/v1/research/overview`
3. `GET /api/v1/market-data/review-readiness-summary`

Deferred/supporting load:

1. `GET /api/v1/market-context/summary`
2. `GET /api/v1/data-quality/summary`
3. `GET /api/v1/signals/runs/latest`
4. `GET /api/v1/pipeline/status`

Implementation guidance:

- Use `Promise.allSettled`-style behavior in the feature-local hook so one failed source does not blank the page.
- Render placeholders for Market Movers and FII/DII immediately; they do not need API calls.
- Refresh refetches read APIs only.
- Do not call POST run, refresh, pipeline command, provider, or backfill endpoints.
- Do not load direct Smart Money, Backtesting, Signal Quality, or Calibration fanout in slice 1 for home-level rollups.

## Frontend-Only Decision

Chosen: frontend-only feature composition.

Recommended shape:

- Keep `/` on existing route shell.
- Replace `frontend/src/app/HomePage.tsx` launch-card body with `<DailyOverviewDashboardPage />`.
- Create feature-local implementation under `frontend/src/features/daily-overview-dashboard`.
- Add a feature-local UI smoke test under `frontend/tests/ui/daily-overview-dashboard.spec.ts`.

Backend adapter deferred because it would require:

- new backend module
- new controller/router/types/validation surface
- route registry reservation
- cross-module service aggregation rules
- new QA and review gates

No such scope is justified for slice 1.

## Exact File Reservations For Next Implementation Pass

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
- `frontend/src/features/daily-overview-dashboard/components/**` only for additional feature-local components needed by the above
- `frontend/tests/ui/daily-overview-dashboard.spec.ts`

Allowed reporting docs after Team 00 Ready promotion:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-08-CF-W2-DOV-01-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W2-DOV-01-developer-handoff.md`

Forbidden writer scope:

- `backend/src/**`
- `backend/tests/**`
- `frontend/src/app/routes.tsx`
- `frontend/src/app/navigationMetadata.tsx`
- `frontend/src/shared/components/**`
- `frontend/src/shared/**`
- `frontend/src/contexts/**`
- existing feature pages outside read-only imports
- existing feature API/hook/type files outside read-only imports
- Prisma schema, migrations, and generated files
- `package.json`, `package-lock.json`, and package manifests
- provider/live-data files
- startup, scheduler, backfill, worker, queue, and pipeline command files
- route registries
- root `AGENTS.md`
- `docs/AGENTS.md`
- `docs/codex-agent-team-plan/**`

Stop and return to Team 00 if any forbidden file becomes necessary.

## QA Handoff Notes

Team 04 should refresh QA against this investor/trader-first map.

Minimum QA expectations:

- `/` no longer presents the static launch-card grid.
- First viewport shows, in investor/trader-first order: Header Rail, Market Pulse, High-Priority Review Candidates, Market Movers placeholder, FII/DII placeholder, Watch And Blocked, and compact Evidence Caveats.
- Market Pulse uses reviewability plus limited market context and explicitly labels region-level context when needed.
- High-Priority Review Candidates uses Today Review groups for bullish, bearish, and exit-risk lanes.
- Watch And Blocked uses Today Review watch-only, blocked, insufficient-data, and unproven groups with reasons.
- `Coming soon - Market Movers` renders without fake rows and states that watchlist sorting is not market-wide movers.
- `Coming soon - FII/DII Activity` renders without Smart Money relabeling or guessed values.
- Evidence Caveats stays compact and secondary.
- A failed supporting source renders section-local `Unavailable` or `Limited` state and does not blank the full dashboard.
- Forbidden language scan covers: `buy now`, `sell now`, `must buy`, `must sell`, `target price`, `price target`, `profit target`, `reward/risk`, `R:R`, `guaranteed`, `financial advice`.
- UI smoke must prove scoped data or domain-specific empty/limited states, not just page headings.

Suggested validation after implementation:

```text
cd frontend
npm.cmd run build
npm.cmd run test:ui -- daily-overview-dashboard.spec.ts --workers=1
```

No backend validation is required unless implementation violates this architecture and opens backend scope, in which case the slice must stop.

## Risks And Limitations

- Section payloads are live reads from multiple owners, not one atomic persisted dashboard snapshot. UI must avoid fake snapshot consistency.
- Market Context is currently region-scoped from the frontend API; asset-type-specific market context must be caveated.
- Research Hub actionability dimensions for Today Review, Calibration, and Trade Plan readiness should not be treated as the Daily Overview pulse authority.
- Market Movers and FII/DII are user-expected slices but placeholder-only until new truthful sources exist.
- Calibration evidence-through, signal-position follow-through, and measured outcome follow-through remain placeholder-only.
- `ready-for-implementation.md` contains prior Ready promotion text; Team 00 should reconcile it after refreshed QA.

## Next Gate

1. Team 04 refreshes QA plan/evidence against this investor/trader-first architecture.
2. Team 00 re-confirms exact file reservations and Ready promotion.
3. Implementation proceeds only inside the frontend-only file set.
