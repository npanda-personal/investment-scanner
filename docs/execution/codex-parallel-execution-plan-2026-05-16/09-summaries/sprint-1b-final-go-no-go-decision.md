# Sprint 1B Final Go/No-Go Decision

Date: 2026-05-17

Status: Final decision only. No implementation approved by this document.

## 1. Decision

Sprint 1B implementation ready: yes, for one narrow slice only.

Chosen implementation slice:

```text
Option A: Backend-only Data Quality invariant tests
```

This is a GO only for the next Product Owner-approved implementation prompt. It is not permission to implement during this decision step.

## 2. Requirement

Requirement name:
- S1B-01 Backend-only Data Quality invariant tests

Exact purpose:
- Protect the active Market Data / Data Quality readiness contract with focused backend tests.
- Verify Data Quality states do not accidentally permit downstream automated use.
- Confirm `READY`, `LIMITED`, `BLOCKED`, `NOT_READY`, `UNUSABLE`, stale, missing-evaluation, and downstream eligibility behavior are explicit.

Owner/team:
- Data Quality Engine Team
- QA Automation Team

## 3. Allowed Write Files

Exact allowed write file:
- `backend/tests/modules/data-quality-engine/data-quality-engine.invariants.test.ts`

No other file is approved for writing.

## 4. Read-Only Files

Read-only during implementation:
- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/**`
- `backend/src/modules/data-quality-engine/**`
- `backend/tests/modules/data-quality-engine/**`

## 5. Forbidden Files

Forbidden:
- `backend/src/modules/**`
- `backend/tests/modules/market-data-foundation/**`
- `frontend/src/**`
- `backend/src/server.ts`
- `backend/.env.example`
- `.gitignore`
- `prisma/schema.prisma`
- `prisma/migrations/**`
- Backend route registry
- Frontend route registry
- Shared backend utilities
- Shared UI components
- Package manifests
- Generated types
- Common fixtures
- Root `AGENTS.md`
- `docs/AGENTS.md`
- `docs/codex-agent-team-plan/**`

## 6. Shared / High-Risk Files Excluded

Excluded:
- Prisma schema and migrations
- Route registries
- Startup/server behavior
- Environment/config examples
- Shared backend utilities
- Shared UI
- Package manifests
- Generated types
- Common fixtures

## 7. Tests To Run

Run only this focused backend test command after implementation:

```text
cd backend
npm test -- data-quality-engine.invariants.test.ts
```

## 8. Tests Not Allowed

Not allowed:
- Angel One tests.
- Live provider tests.
- Provider-heavy tests.
- Frontend build/typecheck.
- Playwright smoke tests.
- Service startup checks.
- Prisma commands.
- Full test suite unless separately approved.

## 9. Stop Conditions

Stop if:
- Angel One is needed.
- Live provider call is needed.
- Broker credentials are needed.
- Paid service appears.
- Order/trading method appears.
- Prisma change is needed.
- Route registry change is needed.
- Shared utility change is needed.
- Shared UI change is needed.
- Package change is needed.
- Startup behavior change is needed.
- UI scope becomes necessary.
- QA cannot run focused tests safely.
- Data Quality thresholds are ambiguous.
- Product Owner decision is missing.
- Architect decision is missing.
- QA decision is missing.

## 10. QA Evidence Required

Required:
- `git status --short` before and after.
- Changed-file list showing only the allowed test file.
- Focused test output.
- Confirmation no source files changed.
- Confirmation no live providers, Angel One, provider-heavy tests, services, Prisma, route registry, frontend, shared files, package files, or old-plan docs were touched.

## 11. Architect Review Required

Architect must confirm:
- Tests align with the active readiness contract.
- No source behavior is changed.
- No shared/high-risk file is touched.
- No downstream module is unblocked by tests alone.

## 12. Product Owner Acceptance Criteria

Product Owner acceptance requires:
- QA evidence exists.
- Review confirms scope stayed backend-only and test-only.
- Data Quality invariant coverage is understandable.
- Angel One remains excluded.
- No downstream module is treated as accepted or unblocked.

## 13. Downstream Modules Still Blocked

Still blocked:
- `signal-generation-engine`
- `signal-quality-lab`
- `signal-calibration-engine`
- `strategy-decision-engine`
- `backtesting-strategy-lab`
- `trade-plan-risk-engine`
- `portfolio-intelligence`
- `watchlist-management`
- `alerts-monitoring`
- `ai-investment-copilot`

## 14. Exclusion Confirmation

- Angel One remains excluded: yes.
- Live providers remain excluded: yes.
- Startup scheduler/backfill remains excluded: yes.
- UI remains excluded: yes.
- Shared files remain excluded: yes.

## 15. Exact Next Implementation Prompt

```text
I approve Sprint 1B-01 implementation only: backend-only Data Quality invariant tests.

Create or update only backend/tests/modules/data-quality-engine/data-quality-engine.invariants.test.ts.
Do not modify application source.
Do not modify existing tests unless the new test file cannot be added and you stop for approval.
Do not modify Prisma schema or migrations.
Do not modify backend or frontend route registries.
Do not modify shared utilities, shared UI, package manifests, generated types, common fixtures, backend/src/server.ts, backend/.env.example, .gitignore, frontend files, docs/AGENTS.md, root AGENTS.md, or docs/codex-agent-team-plan/.
Keep Angel One excluded.
Do not run live providers.
Do not run provider-heavy tests.
Do not start services.

Implement focused Data Quality invariant tests for READY/LIMITED/BLOCKED/NOT_READY/UNUSABLE/stale/missing-evaluation/downstream eligibility behavior using the active readiness contract.
Run only:
cd backend
npm test -- data-quality-engine.invariants.test.ts

Stop on any listed stop condition.
```
