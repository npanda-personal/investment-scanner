# Work Packet: CF-W2-DOV-01 Daily Overview Dashboard

Date: 2026-05-26

Owner: Team 03 - Solution Architecture Factory

Status: `READY-CANDIDATE AFTER QA`

Do not start or resume implementation from stale Ready text. Team 04 must refresh QA against the investor/trader-first architecture and Team 00 must re-confirm Ready promotion and file reservations.

## Requirement

Replace the static launch-card `/` page with an investor/trader-first Daily Overview dashboard using existing public read APIs and explicit `Coming soon` placeholders for unsupported market-wide or institutional-flow evidence.

The page must prioritize:

1. Header Rail
2. Market Pulse
3. High-Priority Review Candidates
4. Coming Soon - Market Movers
5. Coming Soon - FII/DII Activity
6. Watch And Blocked
7. compact Evidence Caveats
8. secondary Supporting Navigation

It must not read like a data pipeline, signal-health, or module-monitoring console.

## Recommended Owner

Team 08 or Team 00-designated frontend owner with Lane 3 UX-shell responsibility.

Recommended branch:

- `codex/team08-ux-research/CF-W2-DOV-01`

Recommended worktree:

- `C:\work\repo\investment-scanner-worktrees\team08-CF-W2-DOV-01`

## Allowed Files

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

Allowed reporting docs after Team 00 Ready promotion:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-08-CF-W2-DOV-01-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W2-DOV-01-developer-handoff.md`

## Forbidden Files

- `backend/src/**`
- `backend/tests/**`
- `frontend/src/app/routes.tsx`
- `frontend/src/app/navigationMetadata.tsx`
- `frontend/src/shared/**`
- `frontend/src/contexts/**`
- existing feature pages outside read-only imports
- existing feature API/hook/type files outside read-only imports
- Prisma schema or migrations
- generated files
- package manifests and lockfiles
- provider/live-data files
- startup/backfill/scheduler/worker/queue files
- pipeline command files
- route registries
- root `AGENTS.md`
- `docs/AGENTS.md`
- `docs/codex-agent-team-plan/**`

## Required Behavior

- `/` remains the existing route and continues to resolve through `HomePage.tsx`.
- `HomePage.tsx` becomes a thin shell that renders the new dashboard feature.
- No backend adapter is added in slice 1.
- No route registry is changed.
- The dashboard is read-only.
- Refresh refetches read APIs only.
- Section failures render section-local `Limited` or `Unavailable` states.
- The page does not fake atomic snapshot consistency across independent sources.

## Required Data Sources

Critical first-viewport reads:

- `GET /api/v1/today-review/latest`
- `GET /api/v1/research/overview`
- `GET /api/v1/market-data/review-readiness-summary`

Deferred/supporting reads:

- `GET /api/v1/market-context/summary`
- `GET /api/v1/data-quality/summary`
- `GET /api/v1/signals/runs/latest`
- `GET /api/v1/pipeline/status`

Local scope:

- `useMarketScope()`

Do not call:

- POST run/refresh endpoints
- pipeline commands
- provider/live endpoints
- direct Smart Money fanout for FII/DII
- direct Backtesting fanout
- direct Signal Quality fanout
- calibration aggregate endpoints for dashboard summary inference

## Exact First-Slice Sections

### Header Rail

Implement now.

Show `Daily Overview`, active scope, loaded/source timestamp if available, refresh, research-support disclaimer, and reviewability chip.

### Market Pulse

Implement now from current truth.

Use Today Review, review-readiness, Research Overview market readiness, and limited Market Context region-level context. Explicitly label `limited`, `blocked`, or `mixed evidence` when applicable.

### High-Priority Review Candidates

Implement now from current truth.

Use:

- bullish review from Today Review `groups.longReview`
- bearish review from Today Review `groups.shortReview`
- exit-risk review from Today Review `groups.exitRiskReview`

Research Hub priorities may be supporting context only.

### Coming Soon - Market Movers

Placeholder-only now.

Required copy:

- market-wide gainers/losers are not yet backed by a truthful scoped stored-data source
- missing source basis is a scoped market-wide movers API/hook backed by stored market data
- watchlist daily-change sorting and signal row sorting are not market-wide movers

### Coming Soon - FII/DII Activity

Placeholder-only now.

Required copy:

- no current route, DTO, hook, provider, or local source exposes truthful FII/DII activity
- missing source basis is a dedicated local institutional-flow source and contract
- Smart Money is not an acceptable FII/DII substitute

### Watch And Blocked

Implement now from current truth.

Use Today Review `watchOnly`, `blocked`, `insufficientData`, `unproven`, scan funnel, explainability, blockers, and watch reasons.

### Evidence Caveats

Implement now as compact secondary support.

Use Data Quality summary, review-readiness blockers, Pipeline status, Signal latest run warnings, Research Hub data gaps, and strategy-proof notes. Keep it visually quieter than Market Pulse and candidate review sections.

### Supporting Navigation

Implement now as secondary support.

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

Context chips may use only already loaded payloads.

## Placeholder And Deferred Requirements

Must remain placeholder-only in slice 1:

- `Coming soon - Market Movers`
- `Coming soon - FII/DII Activity`
- `Coming soon - Signal Position Follow-Through`, if included
- `Coming soon - Calibration Evidence-Through Summary`, if included
- `Coming soon - Measured Outcome Follow-Through`, if included

Deferred, not authorized:

- new market-wide movers storage/API/hook
- new FII/DII institutional-flow storage/API/provider path
- backend dashboard adapter
- canonical persisted dashboard snapshot
- calibration evidence-through dashboard aggregate
- measured outcome follow-through dashboard aggregate
- Signal Position Ledger UI/API integration beyond current approved foundations

## Required UX Rules

- First viewport must be investor/trader-first, not admin/developer-first.
- `Market Pulse` and `High-Priority Review Candidates` are first-viewport anchors.
- `Market Movers` and `FII/DII Activity` must be visible as honest `Coming soon` placeholders.
- `Watch And Blocked` must be visible in the main overview.
- `Evidence Caveats` must be compact and secondary.
- No first-viewport launch-card strip.
- No `Data Trust and Pipeline Health`, `Signal and Evidence Health`, or `Drilldown Strip` as first-viewport product identity sections.
- Market Context must be described as region-level where asset-type-specific proof is unavailable.
- No target, reward/risk, target-price, broker, direct-advice, fake confidence, fake freshness, or invented value wording.

## Validation

Required after implementation:

```text
cd frontend
npm.cmd run build
npm.cmd run test:ui -- daily-overview-dashboard.spec.ts --workers=1
```

Required UI smoke expectations:

- `/` no longer renders the old launch-card grid.
- First viewport shows Header Rail, Market Pulse, High-Priority Review Candidates, Market Movers placeholder, FII/DII placeholder, Watch And Blocked, and compact Evidence Caveats.
- Bullish, bearish, and exit-risk lanes use Today Review groups.
- Watch/blocked/insufficient/unproven states show reasons or domain-specific empty states.
- Market Movers placeholder has no fake rows and rejects watchlist relabeling.
- FII/DII placeholder has no guessed values and does not relabel Smart Money.
- Evidence Caveats remains compact and links outward.
- Section-local API failure does not blank the full dashboard.
- Forbidden language scan passes.

Suggested forbidden language scan:

```text
rg -n "buy now|sell now|must buy|must sell|target price|price target|profit target|reward/risk|R:R|guaranteed|financial advice|best trade" frontend/src/app/HomePage.tsx frontend/src/features/daily-overview-dashboard frontend/tests/ui/daily-overview-dashboard.spec.ts
```

## Stop Conditions

Stop and return to Team 00 if implementation requires:

- backend changes
- route-registry changes
- shared UI or shared hook changes
- package changes
- Prisma/schema/migration/generated changes
- provider/live-data calls
- startup/backfill/scheduler/worker/queue changes
- pipeline command execution
- direct Smart Money or Backtesting fanout beyond the approved read set
- calibration aggregation from current calibration responses
- replacing placeholders with inferred summaries
- changing the app-level market scope system

## Known Limitations To Preserve

- Section data is live from independent owners, not a single atomic persisted dashboard snapshot.
- Market Context is region-level from the current frontend public API.
- Market Movers has no truthful current source.
- FII/DII Activity has no truthful current source.
- Calibration evidence-through, signal-position follow-through, and measured outcome follow-through are not currently truthful Daily Overview summaries.
- Older Ready queue text may still exist and should be reconciled by Team 00 after refreshed QA.

## Handoff Requirements

Developer handoff must include:

- exact files changed
- exact files inspected
- section-to-source mapping used
- API calls made and skipped
- placeholders preserved
- build and UI test results
- forbidden language scan result
- any skipped checks and exact reasons
- screenshots or UI smoke evidence proving the first viewport hierarchy
- risks and follow-up blockers

## Next Gate

1. Team 04 refreshes QA plan/evidence for this investor/trader-first packet.
2. Team 00 re-confirms Ready promotion and file reservations.
3. Team 08 or assigned frontend owner implements inside this file set only.
