# CF-W3-MDPIPE-01B4 - Command API / Manual-Trigger Safety QA Plan

Date: 2026-05-25

Owner: Team 04 / Team 00

Status: QA plan prepared. Readiness is a candidate only, pending the Team 03 architecture packet and the corresponding work packet.

## Scope

QA planning for the pipeline command API and manual-trigger safety matrix that will eventually back the `/pipeline-ops` trigger controls.

This plan covers:

- approved command matrix by pipeline operation, scope, and stage;
- idempotent command submission behavior;
- lease acquisition, renewal, and expiry handling;
- disabled or unavailable command behavior when the command matrix does not permit the action;
- progress rehydration after navigation so the dashboard does not lose active run/stage evidence;
- no-provider/live-call assertions during render, validation, and command submission paths;
- forbidden-scope checks so the slice stays inside the reserved pipeline-orchestration boundary.

This plan does not approve implementation. It is a QA plan only and remains blocked until the command API architecture and work packet exist.

## Contract Inputs

- `10-requirements/CF-W3-MDPIPE-01B4-command-api-manual-trigger-safety-requirement.md` or the equivalent Team 03 child packet that defines the command matrix
- `03-architecture/CF-W3-MDPIPE-01B4-command-api-architecture.md` or the equivalent Team 03 child packet
- `08-work-packets/CF-W3-MDPIPE-01B4-work-packet.md` or the equivalent Team 00 / Team 03 implementation packet
- `03-architecture/CF-W3-MDPIPE-01B3-S1-pipeline-ops-dashboard-architecture.md`
- `04-qa/CF-W3-MDPIPE-01B3-S1-pipeline-ops-dashboard-qa-plan.md`

## Required QA Assertions

- The command surface only exposes approved operations for the allowed pipeline scope and stage matrix.
- Repeated submissions with the same idempotency key do not create duplicate active commands or duplicate downstream work.
- Lease acquisition is required where the contract demands it, and invalid or expired leases are rejected without side effects.
- A second trigger attempt while a compatible lease is already active is either rejected or treated as the same logical command, per the approved contract, but never creates a second independent run.
- Manual trigger controls render disabled or unavailable when the operation is not approved, the lease is missing, the scope is forbidden, or the command API is unavailable.
- The dashboard and command path do not call provider/live endpoints, downstream execution endpoints, scheduler fanout, or any data mutation path outside the approved command contract.
- Returning to `/pipeline-ops` after navigation rehydrates active progress, latest terminal evidence, and lease state from the read-only status API without issuing extra command POSTs.
- Unsupported scope combinations are rejected or hidden in the UI, and the rejection explains why the command is not allowed.
- The implementation stays inside the reserved command API boundary only.

## Scenario Matrix

| Scenario | Input condition | Expected QA result |
| --- | --- | --- |
| Approved command | Operation, scope, and stage match the approved matrix | Command is allowed, the request payload is correct, and one active command is created. |
| Duplicate submit | Same idempotency key is submitted twice | Second submission is deduplicated or rejected safely; no duplicate downstream work is created. |
| Active lease | A compatible lease is already active | The next trigger is blocked, reuses the same logical command, or renews only if the contract explicitly allows it; it never creates a second active lease chain. |
| Expired lease | Lease token is stale or expired | Command is rejected with no side effects. |
| Disabled control | Command is unavailable for the current scope or stage | The button remains disabled or is explicitly unavailable and cannot emit a POST. |
| Forbidden scope | Region, asset type, timeframe, pipeline key, or stage key is outside the approved matrix | Command is blocked and the explanation is visible. |
| Navigation rehydrate | User leaves `/pipeline-ops` and returns after activity begins | Active and terminal progress rehydrate from the status API without a duplicate command POST. |
| Provider/live guard | Render or submit command while provider endpoints are stubbed | No provider/live endpoint is called; only the read-only status path and approved command path are used. |
| Scope drift | Implementation widens into schema, migrations, package manifests, generated files, shared UI, or cross-module plumbing not reserved for the command API | QA reject and return to Team 00 / Architect. |

## Focused Command Guidance

Run after implementation handoff only, with laptop-memory checks respected before builds and Playwright:

```powershell
cd backend
npm.cmd test -- pipeline-orchestration --runInBand
```

```powershell
cd backend
npm.cmd run build
```

```powershell
cd frontend
npm.cmd run build
```

```powershell
cd frontend
npm.cmd run test:ui -- pipeline-ops.spec.ts --workers=1
```

## UI Smoke Expectations

- `/pipeline-ops` loads in the protected shell and shows the approved command state for the current scope.
- Manual-trigger controls are disabled or unavailable when the command matrix does not permit the action.
- Stubbed command submissions assert the request payload, idempotency key, and lease fields.
- Repeated clicks do not create duplicate requests or duplicate active commands.
- Navigation away from the dashboard and back rehydrates the active run/stage state and does not reset progress.
- The dashboard render path does not call provider/live endpoints or downstream execution endpoints.

## Forbidden Scope

- Prisma schema, migrations, or data-model changes.
- Provider/live calls, broker calls, or any external service dependency.
- Scheduler fanout, startup/backfill changes, or downstream execution work.
- Shared UI component changes, package manifest changes, generated files, or broad route-registry widening.
- Any scope drift outside the reserved command API boundary.

## Readiness Verdict

- `CF-W3-MDPIPE-01B4`: `READY-CANDIDATE / PENDING-ARCHITECTURE-AND-WORK-PACKET`

