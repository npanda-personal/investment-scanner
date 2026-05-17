# Work Packet: S1A Market Data / Data Quality Contract Audit

Date: 2026-05-17

Status: Sprint 1A documentation output. Sprint 1B implementation is not approved.

## 1. Requirement Name

S1A Market Data / Data Quality Contract Audit

## 2. Owner / Team

Primary owner:
- Delivery Governance / Orchestrator

Required reviewers:
- Product Owner Agent
- Solution Architect Agent
- QA Automation Team
- Code Review / Lead Validation Team before later implementation acceptance

Implementation owner for later Sprint 1B:
- Not assigned yet

## 3. Lane / Module

Lane 1: Market Data / Data Quality

Modules:
- Market Data Foundation
- Data Quality Engine

## 4. Allowed Future Implementation Files

Allowed only after Sprint 1B approval:
- `backend/src/modules/market-data-foundation/**`
- `backend/src/modules/data-quality-engine/**`
- `backend/tests/modules/market-data-foundation/**`
- Data Quality tests if created or updated under approved test paths
- `frontend/src/features/market-data-foundation/**` only if UI is explicitly in scope
- Active execution docs under `docs/execution/codex-parallel-execution-plan-2026-05-16/**`

## 5. Forbidden Future Implementation Files Without Separate Approval

Forbidden unless explicitly reserved by Architect:
- `prisma/schema.prisma`
- `prisma/migrations/**`
- `backend/src/api/routes.ts`
- Frontend route registry files
- Shared backend utilities
- Shared frontend UI components
- Package manifests and lockfiles
- Auth middleware
- Subscription gates
- Generated types
- CI/build configuration
- Old historical plan docs under `docs/codex-agent-team-plan/**`
- Deleted legacy `docs/AGENTS.md`

Angel One implementation or live validation is forbidden unless Product Owner and Architect approvals are recorded.

## 6. Shared Files Requiring Architect Reservation

Known shared or high-risk files:
- `backend/src/server.ts`
- `backend/.env.example`
- `.gitignore`
- Module public exports such as `backend/src/modules/market-data-foundation/index.ts`
- Any route registry file
- Any shared type or fixture consumed across modules
- Any Data Quality contract consumed by signals, strategies, backtests, alerts, portfolio, or copilot

## 7. Product Owner Decisions Required

Before Sprint 1B:
- Approve or revise readiness thresholds.
- Choose Angel One policy option.
- Confirm `IN/STOCK` remains the first implementation scope.
- Confirm whether UI changes are in scope.
- Confirm whether live provider validation remains excluded.
- Confirm whether limited-review mode can be displayed without enabling downstream signals.
- Approve the first Sprint 1B requirement.

## 8. Architect Decisions Required

Before Sprint 1B:
- Approve provider adapter boundaries.
- Approve no-orders/no-trading boundary.
- Approve scheduler and startup behavior.
- Approve backfill API scope.
- Approve throttling and concurrency defaults.
- Approve storage and batch write behavior.
- Approve retry cooldown behavior.
- Approve spike rejection policy.
- Decide whether Prisma changes are needed.
- Decide whether route registry changes are allowed.
- Reserve any shared files.

## 9. QA Decisions Required

Before Sprint 1B:
- Approve backend test subset.
- Approve mocked provider validation scope.
- Confirm no live provider calls.
- Confirm whether frontend build/typecheck is in scope.
- Confirm whether Playwright smoke is in scope.
- Define evidence required for Product Owner acceptance.
- Define stop conditions for resource usage and provider safety.

## 10. Acceptance Criteria For This S1A Packet

This documentation packet is complete when:
- Readiness contract is defined.
- Angel One policy options are documented without implementation approval.
- Architect checklist is recorded.
- QA validation plan is recorded.
- File reservation proposal is recorded.
- Downstream modules blocked by Data Quality are identified.
- Sprint 1B remains blocked until decisions are recorded.

## 11. Acceptance Criteria For Future Sprint 1B

Future Sprint 1B must prove:
- Market Data readiness gates are enforced.
- Data Quality gates block downstream use.
- Readiness evidence is auditable.
- Provider behavior is disabled, mocked, or explicitly approved.
- No paid/cloud/broker-execution violation exists.
- Tests pass for the approved scope.
- Product Owner is not the first tester.

## 12. Stop Conditions

Stop immediately if:
- Scope expands into implementation before approval.
- Angel One is used live without explicit approval.
- Provider credentials are required for tests.
- Secrets appear in tracked files or logs.
- Startup performs unapproved provider-heavy work.
- Prisma, route registries, shared utilities, package manifests, or shared UI are touched without reservation.
- Data Quality blocked instruments reach downstream signals or strategy decisions.
- Old plan docs are treated as authority.

## 13. Validation Evidence Required Later

Required evidence for future Sprint 1B:
- Git status before and after.
- File reservation confirmation.
- Backend test output for approved subset.
- Mock-provider test evidence if Angel code remains in scope.
- Data Quality invariant evidence.
- No live provider call evidence unless approved.
- No secrets evidence.
- No order route or order method evidence.
- QA signoff.
- Architect signoff.
- Product Owner acceptance after QA and review.

## 14. Downstream Modules That Remain Blocked

Blocked until Market Data and DQ readiness gates are approved and implemented:
- Indicator / Strategy Framework
- Signal Generation Engine
- Signal Quality Lab
- Signal Calibration Engine
- Strategy Decision Engine
- Backtesting Strategy Lab
- Trade Plan Risk Engine
- Stock Research Workbench
- Portfolio Intelligence
- Watchlist Management action-like alerts
- Alerts Monitoring
- Market Context Intelligence
- Historical Context Snapshots
- Smart Money Intelligence
- AI Investment Copilot reliability summaries

