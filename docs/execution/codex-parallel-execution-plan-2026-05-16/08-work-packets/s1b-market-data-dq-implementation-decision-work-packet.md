# Work Packet: S1B Market Data / DQ Implementation Decision

Date: 2026-05-17

Status: Final go/no-go decision work packet. Option A is selected, but implementation execution still requires the next explicit Product Owner approval.

## 1. Requirement Name

S1B Market Data / Data Quality Implementation Decision

## 2. Owner / Team

Primary owner:
- Delivery Governance / Orchestrator

Decision owners:
- Product Owner Agent
- Solution Architect Agent
- QA Automation Team

Future implementation owner:
- Not assigned.

## 3. Lane / Module

Lane 1: Market Data / Data Quality

Modules:
- Market Data Foundation
- Data Quality Engine

## 4. Proposed First Implementation Requirement

Implement or harden Market Data / Data Quality readiness enforcement for `IN/STOCK` using the active readiness contract.

Default exclusions:
- Angel One implementation.
- Live provider validation.
- Provider-heavy startup behavior.
- Prisma schema or migration changes.
- Backend or frontend route registry changes.
- Shared utilities or shared UI.
- Package manifest changes.
- UI changes unless separately approved.

## 5. File Reservation Proposal

| Path | Reservation class | Future Sprint 1B policy |
| --- | --- | --- |
| `backend/src/modules/market-data-foundation/**` | Allowed for implementation | Allowed after Sprint 1B approval, one writer per file |
| `backend/src/modules/data-quality-engine/**` | Allowed for implementation | Allowed after Sprint 1B approval, one writer per file |
| `backend/tests/modules/market-data-foundation/**` | Allowed for tests | Allowed after QA approves test scope |
| `frontend/src/features/market-data-foundation/**` | Read-only by default | Allowed only if UI scope is explicitly approved |
| `backend/src/server.ts` | Shared/high-risk | Read-only unless Architect reserves startup behavior |
| `backend/.env.example` | Shared/high-risk | Read-only unless Product Owner and Architect approve config changes |
| `.gitignore` | Out of scope | Read-only |
| `prisma/schema.prisma` | Forbidden | Separate Product Owner and Architect approval required |
| `prisma/migrations/**` | Forbidden | Separate Product Owner and Architect approval required |
| Backend route registry | Forbidden | Separate Orchestrator and Architect approval required |
| Frontend route registry | Forbidden | Separate Orchestrator, Architect, and UX approval required |
| Shared backend utilities | Forbidden | Separate Architect approval required |
| Shared UI components | Forbidden | Separate UX and Architect approval required |
| Package manifests | Forbidden | Separate Product Owner and Architect approval required |
| `docs/codex-agent-team-plan/**` | Historical only | Do not modify |

## 6. Acceptance Criteria For Approving Implementation

Sprint 1B implementation may start only when:
- Product Owner approves the requirement.
- Product Owner approves or revises threshold policy.
- Architect approves file reservations.
- Architect confirms no schema, route-registry, shared utility, shared UI, or package-manifest changes are required.
- QA approves test and evidence scope.
- Angel One remains excluded or is explicitly handled by a separate approval.
- Active work board is updated before implementation.

## 7. Future Implementation Acceptance Criteria

Future implementation must prove:
- `IN/STOCK` readiness thresholds are enforced.
- DQ status blocks downstream automated use.
- Retry-cooldown, manual-required, unsupported, stale, missing, duplicate, invalid OHLC, and zero/suspicious volume states are visible and block correctly.
- No live provider call occurred unless separately approved.
- No paid provider, cloud service, broker execution, or secret exposure exists.
- Tests approved by QA pass or blockers are recorded.
- Product Owner acceptance happens after QA and review.

## 8. Stop Conditions

Stop implementation if:
- A live provider call is discovered.
- A paid API dependency is discovered.
- A broker-order route or method is discovered.
- Secret exposure risk appears.
- Schema changes are needed.
- Route registry changes are needed.
- Shared utility/component changes are needed.
- Data Quality thresholds are unclear.
- UI scope is unclear.
- Tests fail.
- Memory/resource gate fails.
- Product Owner decision is missing.
- Architect decision is missing.
- QA decision is missing.

## 9. Downstream Modules Still Blocked

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

## 10. Recommended Next Prompt

Approve a smaller Sprint 1B implementation task only after reviewing this work packet, the readiness contract, the Angel One decision, the Architect checklist, and the QA validation plan.

## 11. Final Selected Implementation Slice

Selected option:

```text
Option A: Backend-only Data Quality invariant tests
```

Requirement name:
- S1B-01 Backend-only Data Quality invariant tests

Exact purpose:
- Add focused backend tests that protect Data Quality gating invariants before any source behavior changes.
- Confirm downstream eligibility remains blocked unless Data Quality status and use-case tiers are explicitly ready.
- Confirm missing, stale, limited, blocked, unusable, and not-ready states do not become action-ready.

Owner/team:
- Data Quality Engine Team
- QA Automation Team

Allowed write files:
- `backend/tests/modules/data-quality-engine/data-quality-engine.invariants.test.ts`

Read-only files:
- `backend/src/modules/data-quality-engine/**`
- `backend/tests/modules/data-quality-engine/**`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/**`

Forbidden files:
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
- `docs/AGENTS.md`
- `docs/codex-agent-team-plan/**`

Shared/high-risk files excluded:
- Prisma schema and migrations
- Route registries
- Startup server file
- Env/config examples
- Shared backend utilities
- Shared UI
- Package manifests
- Generated types
- Common fixtures

Tests to run:

```text
cd backend
npm test -- data-quality-engine.invariants.test.ts
```

Tests not allowed:
- Angel One tests.
- Live provider tests.
- Provider-heavy tests.
- Frontend build/typecheck.
- Playwright smoke tests.
- Service startup checks.
- Prisma commands.

Stop conditions:
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

QA evidence required:
- Focused test output.
- Changed-file list proving only the allowed test file changed.
- Confirmation no source files changed.
- Confirmation no live providers, provider-heavy tests, services, Prisma, frontend, route registry, shared file, package, or old-plan docs were touched.

Architect review required:
- Confirm tests align to active readiness contract.
- Confirm no source behavior, shared file, schema, route, UI, startup, or provider scope was introduced.

Product Owner acceptance criteria:
- The tests clearly protect downstream blocking behavior.
- The work remains backend-only and test-only.
- Angel One remains excluded.
- No financial-advice language or downstream approval is introduced.
- Product Owner acceptance happens only after QA and review.

Downstream modules still blocked:
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

Exact implementation prompt to use next:

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
