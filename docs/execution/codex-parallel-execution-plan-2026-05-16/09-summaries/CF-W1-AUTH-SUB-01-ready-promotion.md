# CF-W1-AUTH-SUB-01 Ready Promotion

Date: 2026-05-18

Owner: Team 00 - Master Orchestrator / Integration

## Decision

Promote a combined Team 09 implementation slice:

- `CF-W1-AUTH-01`
- `CF-W1-SUB-01`

Combined work item id: `CF-W1-AUTH-SUB-01`

## Why Combined

Standalone AUTH and SUB packets both reserve:

- `backend/src/modules/subscription-billing/subscription-billing.controller.ts`
- `backend/tests/modules/subscription-billing/subscription-billing.controller.test.ts`
- `backend/src/modules/subscription-billing/subscription-billing.md`

Running them separately would either create a shared-file conflict or force two sequential edits over the same controller boundary. Team 00 is assigning a single Team 09 writer instead.

## Ready Gates

- Product Owner decisions: resolved.
- Requirement: present for both `CF-W1-AUTH-01` and `CF-W1-SUB-01`.
- Acceptance criteria: present in both requirements.
- Architecture contracts: prepared by Team 03.
- Work packets: prepared by Team 03 and combined by Team 00.
- QA plan: combined controller-policy QA plan created.
- File reservations: exact and single-writer.
- Source inspection: current controllers still use `req.user?.id || 'default-user'`; existing controller tests are missing and will be added in the reserved test files.
- Shared-file risk: resolved by combined handoff.
- Forbidden scope: no auth middleware, router, route registry, service, repository, provider, validation, schema, frontend, shared utility/UI, package, generated, startup/backfill, live-provider, paid/cloud, broker, telemetry, or credential scope approved.

## Branch / Worktree

- Branch: `codex/team09-platform/CF-W1-AUTH-SUB-01`
- Worktree: `../investment-scanner-worktrees/team09-CF-W1-AUTH-SUB-01`

## Next Gate

Team 09 implementation handoff to Team 04 QA.

Human Product Owner action required: no.
