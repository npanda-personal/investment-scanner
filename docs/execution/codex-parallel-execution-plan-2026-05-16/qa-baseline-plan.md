# QA Baseline Plan

## Objective

Define local verification expectations before parallel implementation starts.

## Existing Verification Surfaces

- Backend Jest tests under `backend/tests`.
- Frontend Playwright specs under `frontend/tests/ui`.
- Frontend shared UI support under `frontend/tests/ui/support`.
- Backend build command: `npm run build` in `backend`.
- Backend test command: `npm test` in `backend`.
- Frontend build command: `npm run build` in `frontend`.
- Frontend UI command: `npm run test:ui` in `frontend`.

## Baseline Findings

- Backend tests exist for most modules.
- Frontend UI tests exist for many data-bearing workflows.
- CI exists but should be reviewed because frontend package scripts expose `test:ui`, not `test`.
- Playwright is configured with one worker, which aligns with laptop safety and deterministic UI testing.

## Sprint 0 QA Rules

- Do not run provider-heavy or long-running workflows during planning.
- Do not run destructive DB operations.
- Do not run migrations.
- If any future heavy test/build is needed, check memory utilization first.

## Required QA Evidence For Future Implementation

Each implementation handoff must record:

- Commands run.
- Commands skipped.
- Skip reason.
- Data correctness checks where applicable.
- Scope correctness checks where applicable.
- UI smoke checks for user-visible changes.
- Live local data validation for data-bearing workflows when practical.
- Known risks and blockers.

## First QA Priority For Sprint 1

Revalidate Market Data Foundation and Data Quality readiness before downstream signal, strategy, backtest, trade-plan, or copilot implementation resumes.
