# Work Packet: CF-W1-SIG-01B Signal Generation Read-Path Trust Filtering

Date: 2026-05-17

## Status

Approved for bounded module-local implementation under standing Product Owner delegation if all gates pass.

## Allowed Files

- `backend/src/modules/signal-generation-engine/signal-generation-engine.service.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.repository.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.service.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.repository.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-dq-enforcement.invariants.test.ts`
- Active execution docs for `CF-W1-SIG-01B`.

## Forbidden Files

- Prisma schema or migrations
- Route registries
- Shared backend utilities
- Shared UI
- Package manifests
- Generated/common fixtures
- `backend/src/server.ts`
- `backend/.env.example`
- `.gitignore`
- root `AGENTS.md`
- `docs/AGENTS.md`
- `docs/codex-agent-team-plan/**`
- Angel One/live provider/broker/paid-service/startup/backfill/UI files

## Implementation Notes

- Use existing `dataQualityEligibilitySnapshot` persisted on signal rows.
- Use existing `auditStatus` to distinguish current audited rows from legacy rows.
- Filter trusted read lists only.
- Keep `latestForInstrument()` as a separate future requirement.

## Validation

```text
cd backend
npm.cmd test -- signal-generation-engine.service.test.ts signal-generation-engine.repository.test.ts signal-generation-dq-enforcement.invariants.test.ts --runInBand
```

