# Work Packet: CF-W2-SIG-01A Signal Generation Run-Path DQ Fail-Closed Behavior

Date: 2026-05-17

## Status

Approved for bounded evidence flow and commit under standing Product Owner delegation if QA, code review, Architect signoff, and scoped staging all pass.

## Requirement

Default Signal Generation run requests to DQ-filtered behavior and fail closed when DQ filtering is unavailable.

## Allowed Files

- `backend/src/modules/signal-generation-engine/signal-generation-engine.service.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.validation.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.service.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.validation.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-dq-enforcement.invariants.test.ts`
- Active execution docs for `CF-W2-SIG-01A`.

## Forbidden Files

- `backend/src/modules/data-quality-engine/**`
- `backend/tests/modules/data-quality-engine/**`
- `backend/src/modules/market-data-foundation/**`
- `backend/tests/modules/market-data-foundation/**`
- `frontend/src/**`
- Prisma schema or migrations
- Route registries
- Shared backend utilities
- Shared UI
- Package manifests
- Generated/common fixtures
- `backend/src/server.ts`
- `backend/.env.example`
- `.gitignore`
- Root `AGENTS.md`
- `docs/AGENTS.md`
- `docs/codex-agent-team-plan/**`
- Angel One, live provider, broker, paid-service, startup/backfill, or UI files.

## Validation

Run only:

```text
cd backend
npm.cmd test -- signal-generation-engine.service.test.ts signal-generation-engine.validation.test.ts signal-generation-dq-enforcement.invariants.test.ts --runInBand
```

## Limitations To Preserve

- Full `CF-W1-SIG-01` remains incomplete.
- Read-path filtering and persisted trust classification are separate future requirements.
- Downstream modules remain blocked.

