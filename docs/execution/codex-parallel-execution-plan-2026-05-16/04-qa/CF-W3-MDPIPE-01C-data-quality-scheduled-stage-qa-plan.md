# CF-W3-MDPIPE-01C - Data Quality Scheduled Stage QA Plan

Date: 2026-05-25

Owner: Team 04 / Team 00

Status: QA plan prepared. Readiness is a candidate only, pending Team 00 promotion and implementation handoff.

## Scope

QA planning for the first ledgered scheduled Data Quality stage after Market Data.

This plan covers the backend-only scheduled path that:

- consumes changed-set evidence from the Market Data scheduler;
- creates exactly one ledgered `DATA_QUALITY` stage for a normalized scheduled input;
- skips full-scope Data Quality when the changed set is empty;
- avoids startup fanout into Data Quality in this child;
- stays DB-only and provider-free;
- preserves the existing B4 manual command behavior;
- lets the status API rehydrate the latest scheduled Data Quality evidence.

This plan does not approve implementation. It is a QA plan only and remains blocked until Team 00 promotes the exact bounded implementation handoff.

## Contract Inputs

- `03-architecture/CF-W3-MDPIPE-01C-data-quality-scheduled-stage-architecture.md`
- `06-contracts/CF-W3-MDPIPE-01C-data-quality-scheduled-stage-contract.md`
- `08-work-packets/CF-W3-MDPIPE-01C-work-packet.md`
- `04-qa/CF-W3-MDPIPE-01B4-command-api-qa-plan.md` for ledger, idempotency, and lease style

## Required QA Assertions

- A scheduled Market Data pass with inserted or updated rows triggers exactly one ledgered `DATA_QUALITY` stage.
- A scheduled Market Data pass with `rowsInserted = 0` and `rowsUpdated = 0` does not fall back to full-scope Data Quality.
- The startup Market Data path does not fan out into scheduled Data Quality in this child.
- Scheduled Data Quality consumes only the changed instrument set from the current Market Data batch.
- A duplicate scheduled fingerprint returns the existing terminal result and does not recompute Data Quality.
- A held lease blocks double execution safely and does not create a second independent stage run.
- The scheduled stage remains DB-only and does not call provider, live, HTTP, or external services.
- The pipeline status API can rehydrate the latest scheduled Data Quality evidence after completion.
- The existing B4 manual `DATA_QUALITY_EVALUATE_SCOPE` command behavior remains unchanged.

## Scenario Matrix

| Scenario | Input condition | Expected QA result |
| --- | --- | --- |
| Scheduled changed set | Market Data summary reports inserted or updated rows and a non-empty changed instrument list | Exactly one ledgered `DATA_QUALITY` stage is created for the normalized scheduled input, and the stage consumes only the changed set. |
| Scheduled no-op | Market Data summary reports `rowsInserted = 0`, `rowsUpdated = 0`, and an empty changed instrument list | No full-scope Data Quality run is started, and the stage skips or short-circuits without recomputing the universe. |
| Startup path | Market Data startup path runs instead of the normal scheduled path | Scheduled Data Quality does not fan out from startup in this child. |
| Duplicate fingerprint | The same scheduled input fingerprint is delivered again after a terminal result exists | The existing terminal ledger row is reused and Data Quality is not recomputed. |
| Held lease | A compatible stage lease is already active | The new request returns a safely blocked result such as `LEASE_HELD` and does not execute a second stage. |
| DB-only guard | Scheduled Data Quality execution is instrumented with provider/live stubs | No provider, live, HTTP, or external calls occur during the stage. |
| Status rehydrate | The status API is queried after scheduled Data Quality completion | The latest scheduled Data Quality stage, counts, and terminal evidence are rehydrated correctly. |
| B4 regression | Existing manual `DATA_QUALITY_EVALUATE_SCOPE` command paths are exercised | Command behavior remains unchanged, including its current idempotency and lease semantics. |

## Focused Command Guidance

Run after the implementation handoff only, with laptop-memory checks respected before builds or any browser work.

### Team 05 developer validation

```powershell
cd backend
npm.cmd test -- market-data.scheduler.test.ts market-data.service.test.ts pipeline-orchestration.service.test.ts data-quality-engine.service.test.ts --runInBand
```

```powershell
cd backend
npm.cmd run build
```

### Team 00 promotion check

```powershell
cd backend
npm.cmd test -- pipeline-orchestration.validation.test.ts pipeline-orchestration.controller.test.ts pipeline-orchestration.routes.test.ts pipeline-orchestration.service.test.ts --runInBand
```

```powershell
cd backend
npm.cmd run build
```

## Manual Verification - Later

After implementation is merged into the active runtime and Team 00 explicitly allows local execution:

- Confirm a scheduled Market Data pass with changed rows creates exactly one terminal `DATA_QUALITY` stage.
- Confirm an empty changed set skips scheduled Data Quality and does not widen into a full-scope scan.
- Confirm startup Market Data does not spawn scheduled Data Quality evidence.
- Confirm the status API shows the latest scheduled Data Quality run, counts, and evidence after completion.
- Confirm the B4 manual command flow still behaves the same as before this child.

## Forbidden Scope

- Prisma schema, migrations, or data-model changes.
- Route registry changes or new API endpoints.
- Frontend files or UI smoke tests.
- Provider, live, broker, paid, or external service calls.
- Startup fanout into Data Quality.
- Full-universe Data Quality rescans on every scheduler tick.
- Downstream signal, calibration, context, backtesting, alert, or portfolio fanout.
- Shared utility, package manifest, generated file, or Team 08 B6 scope drift.

## Readiness Verdict

- `CF-W3-MDPIPE-01C`: `READY-CANDIDATE / PENDING-IMPLEMENTATION-HANDOFF`
