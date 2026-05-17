# CF-W1-SIG-01 Signal Generation DQ Fail-Closed Contract

Date: 2026-05-17

Status: Draft contract. Not implementation approval.

## Requirement

Trusted signal-generation runs must not generate or expose trusted signal outputs from instruments without passing Data Quality readiness evidence.

## Contract Decision Needed

Product Owner and Architect must decide whether trusted signal-generation runs should:
- default `useDataQualityFilter` to true,
- force `missingQualityBehavior` to `SKIP`,
- fail closed when the DQ filter is unavailable,
- reject or mark outputs untrusted when DQ evidence is missing,
- preserve compatibility for explicit research-only runs.

## Proposed Trusted Run Policy

For trusted signal-generation runs:
- `READY` is the only state eligible for trusted signal outputs.
- `LIMITED`, `NOT_READY`, `UNUSABLE`, stale, manual-required, unsupported, missing-evaluation, and unavailable-DQ states block trusted generation.
- Any generated output must include DQ eligibility evidence.
- DQ filter failure must not silently continue as trusted.
- Research-only runs may be allowed only if outputs are visibly untrusted and cannot feed downstream action-like workflows.

## Allowed Future Files If Approved

- `backend/src/modules/signal-generation-engine/signal-generation-engine.service.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.validation.ts`
- `backend/tests/modules/signal-generation-engine/**`

## Forbidden Without Separate Approval

- Prisma schema/migrations
- backend route registry
- frontend route registry
- shared backend utilities
- shared UI
- package manifests
- generated types/common fixtures
- provider files
- startup/backfill behavior
- UI files
- Angel One/live providers

## Acceptance Criteria

- Missing DQ evaluation fails closed for trusted runs.
- DQ filter errors fail closed for trusted runs.
- `LIMITED`, `NOT_READY`, `UNUSABLE`, stale, manual-required, and unsupported states do not produce trusted signals.
- Existing strict DQ characterization tests remain passing.
- New focused tests prove default trusted behavior.
- No downstream modules are unblocked by this contract alone.

