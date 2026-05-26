# TEAM-04 CF-W2-DOV-01 Pre-Architecture QA Scaffold Outbox

Date: 2026-05-26

Team: Team 04 QA Factory

Mode: docs-only QA planning in main workspace

## Assignment

Draft a docs-only pre-architecture QA scaffold for `CF-W2-DOV-01` Daily Overview redesign.

Per instruction, no application code, frontend tests, backend modules, route registries, shared UI, package manifests, Prisma files, or non-Team-04 execution docs were edited.

## Files Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W2-DOV-01-daily-overview-interactive-market-dashboard-requirement.md`
- `frontend/src/app/HomePage.tsx`
- `frontend/src/features/today-trade-review/components/TodayReviewPage.tsx`
- `frontend/src/features/research-hub/components/ResearchOverviewPage.tsx`
- `frontend/tests/ui/README.md`
- `frontend/tests/ui/today-trade-review.spec.ts`
- `frontend/tests/ui/research-hub.spec.ts`
- `frontend/package.json`
- `backend/package.json`

## Files Changed

- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W2-DOV-01-pre-architecture-qa-scaffold.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-CF-W2-DOV-01-pre-architecture-qa-scaffold-outbox.md`

## Result

Pre-architecture QA scaffold prepared for `CF-W2-DOV-01`.

This is not an executable QA plan and does not promote the requirement to Ready.

## Coverage Added

The scaffold now records:

- acceptance-test coverage mapped to each requirement acceptance criterion;
- section-level UI smoke expectations for header rail, daily pulse, candidate groups, market environment, signal/evidence health, data trust/pipeline health, drilldowns, and `Coming soon` placeholders;
- data correctness checks to prove the dashboard is not fake or hardcoded;
- wording guardrails for research-support language and no target or reward/risk phrasing;
- likely frontend, backend, Playwright, build, and language-scan commands after architecture lands;
- explicit readiness blockers until Team 03 architecture and Team 00 file reservations exist;
- QA rejection conditions for fake summaries, invented scores, stale scope behavior, and advice-like copy.

## Validation

No builds, Playwright runs, backend tests, frontend tests, servers, live-data checks, or Prisma commands were run.

Validation in this handoff was limited to repository inspection and documentation drafting.

## Blockers

- Requirement status remains `Not Ready for Implementation`.
- Team 03 has not approved the first-slice architecture or section-to-source mapping.
- Team 00 has not issued file reservations for `/`, a possible `daily-overview-dashboard` feature, or any shared test/spec ownership.
- No approved contract yet exists for dashboard aggregation, freshness fields, or placeholder ownership.
- Cross-surface regressions cannot be finalized until architecture confirms which current modules are directly reused in the first slice.

## Next Gate

- Next owner: Team 03 Architecture Factory for bounded dashboard architecture
- Coordination owner: Team 00 Orchestrator for file reservations and sequencing
- Team 04 follow-up: convert scaffold into an exact QA plan after architecture signoff

## Team 04 Status

Ready for the next docs-only QA planning refresh after architecture signoff, or for later executable verification once the requirement is promoted beyond the architecture gate.
