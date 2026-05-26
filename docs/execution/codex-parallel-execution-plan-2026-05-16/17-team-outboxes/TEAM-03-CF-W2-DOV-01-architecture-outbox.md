# TEAM-03 CF-W2-DOV-01 Architecture Outbox

Date: 2026-05-26

Team: Team 03 Architecture Factory

Mode: docs-only architecture audit in main workspace

## Assignment

Read the new Team 02 requirement for `CF-W2-DOV-01`, map each Daily Overview section to current truth sources, and decide whether the first honest slice should be frontend composition or a bounded backend summary adapter.

## Files Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W2-DOV-01-daily-overview-interactive-market-dashboard-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-02-requirement-factory.md`
- `frontend/src/app/HomePage.tsx`
- `frontend/src/app/routes.tsx`
- `frontend/src/app/navigationMetadata.tsx`
- `frontend/src/features/today-trade-review/**`
- `frontend/src/features/research-hub/**`
- `frontend/src/features/market-context-intelligence/**`
- `frontend/src/features/data-quality-engine/**`
- `frontend/src/features/signal-generation-engine/**`
- `frontend/src/features/signal-calibration-engine/**`
- `frontend/src/features/smart-money-intelligence/**`
- `frontend/src/features/backtesting-strategy-lab/**`
- `frontend/src/features/pipeline-ops/**`
- `backend/src/modules/today-trade-review/**`
- `backend/src/modules/research-hub/**`
- `backend/src/modules/market-context-intelligence/**`
- `backend/src/modules/data-quality-engine/**`
- `backend/src/modules/signal-generation-engine/**`
- `backend/src/modules/signal-calibration-engine/**`
- `backend/src/modules/smart-money-intelligence/**`
- `backend/src/modules/backtesting-strategy-lab/**`
- `backend/src/modules/pipeline-orchestration/**`
- relevant execution-folder architecture, contract, QA, and accepted-slice docs for Research Hub, Market Context, Smart Money, Signal Generation, Calibration, Backtesting, and Pipeline Ops

## Files Changed

- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W2-DOV-01-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W2-DOV-01-daily-overview-dashboard-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W2-DOV-01-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-CF-W2-DOV-01-architecture-outbox.md`

## Result

Team 03 recommends a frontend-only first slice.

Do now:

- keep `/` on the existing `HomePage.tsx` route shell
- replace the launch-card body with a new `daily-overview-dashboard` feature
- compose the dashboard from existing public read APIs
- keep unresolved calibration and follow-through summaries as explicit `Coming soon`

Do not do in slice 1:

- add a backend `daily-overview-dashboard` module
- add a backend route
- widen route registries or shared UI
- invent a synthetic market or confidence score

## Architecture Finding

### Truthful now

- Daily Pulse from Today Review latest plus review-readiness summary
- candidate counts from Today Review groups
- research priorities and strategy-proof counts from Research Hub
- market regime/breadth/sectors from Market Context
- Smart Money confirmation counts from Research Hub confirmation summary
- raw-signal counts from Research Hub confirmation summary
- latest raw-signal run freshness from Signal Generation latest-run audit
- DQ counts and readiness blockers from Data Quality summary plus review-readiness summary
- pipeline health from Pipeline Ops status

### Not truthful now

- scope-wide calibration usable/limited/unavailable summary
- calibration evidence-through summary
- signal-position follow-through summary
- measured-outcome follow-through summary
- backtesting current-proof labels on the current repo base

## Frontend vs Backend Decision

Chosen:

- frontend composition with staged loading

Why:

- no backend gate needed
- one shared app-shell file plus a new feature is the smallest safe write surface
- existing sources already provide bounded summary reads

Deferred:

- backend adapter only if measured performance later proves the staged frontend composition is too expensive

## Ready Direction

This item can become a `Ready candidate` after:

1. Team 04 QA planning
2. Team 00 single-writer reservation for `frontend/src/app/HomePage.tsx`
3. Team 00 confirmation that the first slice keeps calibration and follow-through areas as placeholders

## Validation

No tests, builds, servers, Prisma commands, or app-code edits were run.

Validation was source and docs inspection only.

## Risks

- Research Hub actionability still contains placeholder Today Review / Calibration / Trade Plan dimensions on the current base; implementers must not wire Daily Pulse to those fields.
- Market Context public route is region-scoped, so non-stock scopes need explicit limited framing.
- Current dashboard truth will be section-live rather than one atomic snapshot.

## Next Gate

- Team 04: QA plan for the frontend-only slice
- Team 00: Ready evaluation and shared-file reservation
