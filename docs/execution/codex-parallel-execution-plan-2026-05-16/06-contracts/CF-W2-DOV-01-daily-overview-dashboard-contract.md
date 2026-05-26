# CF-W2-DOV-01 Daily Overview Dashboard Contract

Date: 2026-05-26

Owner: Team 03 - Solution Architecture Factory

Status: `READY-CANDIDATE AFTER QA`

This is a docs-only contract refresh. It supersedes older admin-style Daily Overview contract language.

## Contract Intent

Turn `/` into an investor/trader-first Daily Overview workspace using truthful existing read sources and explicit `Coming soon` placeholders for unavailable market-wide or institutional-flow evidence.

The first slice is frontend-only. The dashboard consumes source-owner truth; it must not redefine source truth, create a synthetic confidence score, or infer unavailable data.

## Ownership

Frontend ownership:

- new feature: `frontend/src/features/daily-overview-dashboard`
- shell integration: `frontend/src/app/HomePage.tsx`

Source ownership remains unchanged:

- Today Review owns daily review runs, candidate groups, watch/blocked reasons, scan funnel, and explainability.
- Research Hub owns research priorities, market-readiness text, strategy-proof summary, light confirmation summaries, next actions, and data gaps.
- Market Data Foundation owns review-readiness summary.
- Market Context owns region-level regime, breadth, and sector context.
- Data Quality owns readiness and data-quality summary.
- Signal Generation owns latest raw-signal run audit.
- Pipeline Ops owns pipeline run and stage status.

Daily Overview is a read-only presentation composition layer.

## Allowed Read Surfaces

Slice 1 may use only:

- `GET /api/v1/today-review/latest`
- `GET /api/v1/research/overview`
- `GET /api/v1/market-data/review-readiness-summary`
- `GET /api/v1/market-context/summary`
- `GET /api/v1/data-quality/summary`
- `GET /api/v1/signals/runs/latest`
- `GET /api/v1/pipeline/status`
- `useMarketScope()`

Allowed feature-local wrappers:

- `frontend/src/features/daily-overview-dashboard/api/dailyOverviewDashboardApi.ts`
- `frontend/src/features/daily-overview-dashboard/hooks/useDailyOverviewDashboard.ts`

Forbidden read/command surfaces in slice 1:

- new backend `daily-overview-dashboard` API
- POST run/refresh endpoints
- pipeline command endpoints
- provider/live calls
- direct Smart Money fanout for FII/DII
- direct Backtesting fanout for proof rollups
- direct Signal Quality fanout for measured outcome rollups
- direct calibration aggregate inference from `signals/calibration/health`, `signals/calibration/top`, or first rows
- watchlist daily-change sorting relabeled as market-wide movers

## Required Load Contract

Critical first-viewport load:

1. Today Review latest
2. Research Overview
3. Market Data review-readiness summary

Deferred/supporting load:

1. Market Context summary
2. Data Quality summary
3. Signal latest run
4. Pipeline status

Rules:

- Use section-local errors and `Promise.allSettled`-style behavior.
- Do not block placeholder-only sections on API calls.
- Do not blank the full page when one source fails.
- Refresh refetches reads only.
- Do not fake a single atomic dashboard snapshot.

## Section Contract

### Header Rail

Must show:

- `Daily Overview`
- active `region / assetType`
- latest successfully loaded/source timestamp when available
- compact research-support disclaimer
- refresh action
- reviewability chip such as `Review supported`, `Review limited`, or `Review blocked`

Must not show:

- launch-card grid
- marketing hero copy
- portfolio performance framing
- canonical backend dashboard timestamp

### Market Pulse

Classification: implementable now from current truth, with limitations.

Required source basis:

- Today Review run status, trust status, review mode, warnings, source snapshot, scan funnel where available
- review-readiness review mode, trust status, user decision, trusted/catalog counts, data-through dates, blockers, and next bounded action
- Research Overview market readiness and next actions as supporting context
- Market Context regime, breadth, top/weak sectors as region-level supporting context

Required behavior:

- First-viewport investor/trader briefing.
- Explicitly label mixed, limited, stale, or blocked evidence.
- Label Market Context as region-level if asset-type-specific truth is not proven.

Forbidden:

- treating Research Hub placeholder-like actionability dimensions for Today Review, Calibration, or Trade Plan readiness as the pulse authority
- dashboard-wide confidence score
- direct advice wording

### High-Priority Review Candidates

Classification: implementable now from current truth.

Required source basis:

- bullish review: `TodayReviewResponse.groups.longReview`
- bearish review: `TodayReviewResponse.groups.shortReview`
- exit-risk review: `TodayReviewResponse.groups.exitRiskReview`
- row reason summaries, blockers, watch reasons, strategy code/version, timestamps, and Today Review candidate detail links where available

Allowed supporting context:

- `ResearchOverview.researchPriorities.tradeCandidates`
- `ResearchOverview.researchPriorities.exitCandidates`
- `ResearchOverview.strategyProofSummary`

Rules:

- Today Review owns counts and source ordering.
- Research Hub context must be visibly supporting, not overriding.
- Use `high-priority review candidate`, `bullish review`, `bearish / exit-risk review`, and `reason summary`.

Forbidden:

- `buy`, `sell`, `best trade`, target, target price, profit target, reward/risk, `R:R`, direct execution copy, or synthetic ranking.

### Watch And Blocked

Classification: implementable now from current truth.

Required source basis:

- `TodayReviewResponse.groups.watchOnly`
- `TodayReviewResponse.groups.blocked`
- `TodayReviewResponse.groups.insufficientData`
- `TodayReviewResponse.groups.unproven`
- Today Review scan funnel
- Today Review explainability exclusion summaries
- row-level blockers and watch reasons

Required behavior:

- Show why setups are watch-only, blocked, insufficient-data, or unproven.
- Keep reasons visible before any drill action.
- Allow feature-local tabs/segments if useful.

### Coming Soon - Market Movers

Classification: placeholder-only now.

Required placeholder text must state:

- market-wide gainers/losers are not yet backed by a truthful scoped stored-data source
- missing source basis is a scoped market-wide movers API/hook backed by stored market data
- watchlist daily-change sorting and signal row sorting are not market-wide movers

Forbidden:

- fake rows, fake counts, fake freshness, provider/live calls, or relabeled watchlist/signal sorting.

### Coming Soon - FII/DII Activity

Classification: placeholder-only now.

Required placeholder text must state:

- no current route, DTO, hook, provider, or local source exposes truthful FII/DII activity
- missing source basis is a dedicated local institutional-flow source and contract
- Smart Money price/volume proxy summaries are not an acceptable FII/DII substitute

Forbidden:

- guessed inflow/outflow values, Smart Money relabeling, provider/live calls, or invented freshness.

### Evidence Caveats

Classification: implementable now as compact secondary support.

Allowed source basis:

- Data Quality summary
- review-readiness blockers and next action
- Pipeline status active/latest run and stage warnings/failures/blockers
- Signal latest run status and warnings
- Research Overview data gaps and strategy-proof notes

Required behavior:

- Stay compact and secondary to Market Pulse and candidate sections.
- Link outward to owner pages for detail.
- Use `Limited`, `Unavailable`, `Mixed evidence`, or `Blocked` language when appropriate.

Forbidden:

- first-viewport `Data Trust and Pipeline Health` identity section
- first-viewport `Signal and Evidence Health` identity section
- pipeline command controls
- hiding trust caveats behind positive candidate counts

### Supporting Navigation

Classification: implementable now as secondary support.

Allowed routes:

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

- Context chips may use only already loaded payloads.
- Omit chips when truthful context is unavailable.
- Do not recreate a first-viewport launcher strip.

## Placeholder And Deferred Contract

Placeholder-only in slice 1:

- `Coming soon - Market Movers`
- `Coming soon - FII/DII Activity`
- `Coming soon - Signal Position Follow-Through`, only if included below primary sections
- `Coming soon - Calibration Evidence-Through Summary`, only if included below primary sections
- `Coming soon - Measured Outcome Follow-Through`, only if included below primary sections

Deferred because it needs new storage/API/provider/route/shared scope:

- scoped market-wide movers read model/API/hook
- dedicated local FII/DII institutional-flow source/contract
- backend `daily-overview-dashboard` adapter
- persisted/canonical dashboard snapshot
- dashboard-level calibration evidence-through aggregate
- dashboard-level measured outcome follow-through aggregate
- signal-position follow-through UI/API integration beyond already accepted backend foundations

## File Boundary

Allowed implementation writer set:

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

Forbidden:

- `backend/src/**`
- `backend/tests/**`
- `frontend/src/app/routes.tsx`
- `frontend/src/app/navigationMetadata.tsx`
- `frontend/src/shared/**`
- `frontend/src/contexts/**`
- existing feature source outside read-only imports
- package manifests and lockfiles
- Prisma schema/migrations/generated files
- provider/live-data files
- startup/backfill/scheduler/worker/queue files
- pipeline command execution files
- route registries
- root `AGENTS.md`
- `docs/AGENTS.md`
- `docs/codex-agent-team-plan/**`

## Escalation Rule

Stop and return to Team 00 if implementation requires:

- backend adapter or backend route work
- route registry edits
- shared UI or shared hook changes
- package changes
- Prisma/schema/migration/generated changes
- provider/live calls
- startup/backfill/scheduler work
- direct Smart Money or Backtesting fanout beyond the approved read set
- calibration aggregation from current calibration responses
- replacing required placeholders with inferred or fake summaries

## Product Language Contract

Prefer:

- `Market Pulse`
- `High-Priority Review Candidates`
- `bullish review`
- `bearish / exit-risk review`
- `watch only`
- `blocked`
- `limited evidence`
- `mixed evidence`
- `reason summary`
- `consider review`
- `Coming soon`

Avoid:

- `buy`
- `sell`
- `target`
- `target price`
- `price target`
- `profit target`
- `reward/risk`
- `R:R`
- `best trade`
- `must buy`
- `must sell`
- `guaranteed`
- `financial advice`
- fake confidence or fake freshness

## QA Contract

QA must verify:

- first viewport reflects the investor/trader-first section order
- Market Movers and FII/DII placeholders are explicit and have no fake rows
- candidate lanes use Today Review groups and source-owned ordering
- Watch And Blocked shows truthful reasons
- Evidence Caveats remains compact and secondary
- source failures are section-local
- no forbidden language appears
- UI smoke proves either scoped data is visible or domain-specific empty/limited states explain why data is absent

## Ready Note

This contract is bounded enough for Team 04 QA refresh. Ready promotion should require:

1. refreshed Team 04 QA acceptance against this contract
2. Team 00 single-writer reservation for `frontend/src/app/HomePage.tsx`
3. Team 00 confirmation of the frontend-only writer set
4. explicit preservation of placeholder-only sections for unsupported truth surfaces
