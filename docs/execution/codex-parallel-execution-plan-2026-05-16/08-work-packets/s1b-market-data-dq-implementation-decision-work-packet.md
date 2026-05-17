# Work Packet: S1B Market Data / DQ Implementation Decision

Date: 2026-05-17

Status: Decision work packet only. Implementation is not approved.

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
