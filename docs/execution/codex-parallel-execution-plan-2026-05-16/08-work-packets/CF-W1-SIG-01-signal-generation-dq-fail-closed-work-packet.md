# Work Packet: CF-W1-SIG-01 Signal Generation DQ Fail-Closed Trusted Runs

Date: 2026-05-17

Status: Blocked. Not ready for implementation.

## Requirement

Trusted signal-generation runs must fail closed on missing, unavailable, limited, stale, manual-required, unsupported, or non-ready Data Quality evidence.

## Owner / Team

- Signal Generation Engine Team
- QA Automation Team
- Solution Architect Agent
- Product Owner Agent

## Allowed Future Files After Approval

- `backend/src/modules/signal-generation-engine/signal-generation-engine.service.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.validation.ts`
- `backend/tests/modules/signal-generation-engine/**`

## Forbidden Files

- Prisma schema/migrations
- route registries
- shared backend utilities
- shared UI
- package manifests
- frontend
- provider files
- startup/backfill files
- root `AGENTS.md`
- deleted `docs/AGENTS.md`
- `docs/codex-agent-team-plan/**`

## Decisions Required Before Implementation

Product Owner:
- Approve behavior change for default/trusted signal generation.
- Decide whether non-filtered runs may exist as research-only/untrusted.

Architect:
- Approve module-local file reservation and DQ error-handling policy.
- Confirm no schema, route, shared utility, package, provider, startup, or UI changes are required.

QA:
- Approve focused test plan and exact commands.

## Acceptance Criteria

- Missing DQ does not produce trusted signals.
- DQ filter errors do not produce trusted signals.
- `LIMITED`, `NOT_READY`, `UNUSABLE`, stale, manual-required, unsupported, and missing-evaluation states block trusted outputs.
- Existing accepted strict DQ tests still pass.
- New tests pass.
- No downstream module is treated as unblocked by this item alone.

