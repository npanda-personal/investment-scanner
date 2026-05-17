# Continuous Parallel Execution Factory

Date: 2026-05-17

Status: Active operating model for Continuous Parallel Execution Factory Wave 1.

## Authority

Authoritative:
- Root `AGENTS.md`
- Current Product Owner direction
- Active execution folder: `docs/execution/codex-parallel-execution-plan-2026-05-16/`

Historical only:
- Deleted/neutralized `docs/AGENTS.md`
- `docs/codex-agent-team-plan/**`

## Operating Principle

No team waits idle.

While one stream implements approved work, other streams continue:
- read-only module audits
- requirement refinement
- architecture contract preparation
- QA plan preparation
- ready-queue triage
- risk and board maintenance

Implementation may start only when a work packet is ready, scoped, non-conflicting, and clear of Product Owner, Architect, QA, shared-file, provider, startup, package, route, schema, and UI stop conditions.

## Factory Lanes

| Factory | Purpose | Allowed outputs |
| --- | --- | --- |
| Audit Factory | Inspect modules read-only and produce evidence | `11-module-audits/*.md` |
| Requirement Factory | Convert findings into product-shaped candidates | `10-requirements/*.md` |
| Architecture Factory | Prepare contracts, decisions, file reservations | `06-contracts/*.md`, `03-architecture/*.md` |
| QA Factory | Prepare focused validation plans | `04-qa/*.md` |
| Ready Queue | Separate ready, blocked, and deferred work | `12-ready-queue/*.md` |
| Implementation Factory | Execute only ready, scoped, non-conflicting work | module-local files plus `13-implementation-evidence/*.md` |

## Board States

Active board states:
- Backlog Candidate
- Audit In Progress
- Audit Complete
- Needs Product Refinement
- Needs Architecture Contract
- Needs QA Plan
- Ready for Implementation
- Implementation In Progress
- Developer Validation
- QA Verification
- Code Review
- Architect Signoff
- PO Acceptance Packet
- Conditionally Accepted
- Committed
- Blocked
- Rejected / Rework
- Deferred

## Implementation Gate

A candidate may move to Ready for Implementation only when:
- acceptance criteria exist
- exact file reservations exist
- QA plan exists
- architecture contract exists when needed
- shared-file risk is absent or explicitly reserved
- no Product Owner decision is missing
- no Architect decision is missing
- no QA decision is missing
- no stop condition applies

## Standing Stop Conditions

Stop and ask for Product Owner or Architect decision if work needs:
- Prisma schema or migrations
- backend route registry
- frontend route registry
- shared backend utilities
- shared UI
- package manifests
- generated types/common fixtures
- `backend/src/server.ts`
- `backend/.env.example`
- `.gitignore`
- root `AGENTS.md`
- `docs/AGENTS.md`
- `docs/codex-agent-team-plan/**`
- Angel One
- live providers
- provider-heavy tests
- broker credentials
- paid services
- cloud deployment
- GitHub push

