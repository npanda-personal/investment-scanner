# CF-W3-MDPIPE-01B4 - Command API Manual Trigger Safety Requirement

Date: 2026-05-25

Owner: Team 00 / Team 03 / Team 04

Status: Ready for Team 00 promotion as the first bounded command slice.

## User Value

The Pipeline Ops dashboard should eventually be the single place to run approved bulk pipeline commands. The first enabled command must prove the safety model without turning the dashboard into a broad scheduler, provider launcher, or downstream fanout runner.

## Scope

Enable only one manual command in the first slice:

```text
DATA_QUALITY_EVALUATE_SCOPE
```

The command runs one bounded Data Quality batch for the active market scope and records durable pipeline run/stage evidence.

## Acceptance Criteria

- `GET /api/v1/pipeline/commands/catalog` returns the command matrix for the current scope.
- Only `DATA_QUALITY_EVALUATE_SCOPE` is enabled.
- All other commands are returned as `DEFERRED` or `FORBIDDEN` with visible reasons.
- `POST /api/v1/pipeline/commands` executes only one `DATA_QUALITY_EVALUATE_SCOPE` batch per request.
- The command requires `runMode=single_batch`, `batchSize` within `1..100`, non-negative `offset`, and a client `idempotencyKey`.
- Duplicate submit with the same idempotency key does not execute the adapter twice.
- Active lease conflicts do not create duplicate work.
- Command progress and terminal status are persisted to `PipelineRun` and `PipelineStageRun`.
- The Pipeline Ops dashboard enables only the Data Quality row trigger when catalog availability is `ENABLED`.
- Status rendering and polling never calls command, provider, scheduler, or downstream execution paths.
- Existing feature-page bulk controls remain unchanged in this slice.

## Non-Goals

- No full pipeline run.
- No drain-all batches.
- No scheduler fanout.
- No provider/live calls.
- No Market Data ingestion, catalog sync, or backfill command.
- No downstream signal, strategy, backtest, research, Today Review, or publication command.
- No removal of page-local bulk controls.
- No Prisma/schema, migration, generated-file, package, route-registry, shared UI, or shared utility change.

## Gate Evidence

- Architecture: `03-architecture/CF-W3-MDPIPE-01B4-pipeline-command-api-architecture.md`
- Contract: `06-contracts/CF-W3-MDPIPE-01B4-pipeline-command-api-contract.md`
- Work packet: `08-work-packets/CF-W3-MDPIPE-01B4-work-packet.md`
- QA plan: `04-qa/CF-W3-MDPIPE-01B4-command-api-qa-plan.md`
