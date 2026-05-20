# TEAM-03 Assignment - CF-W1-HCTX-02 Architecture Prep

Date: 2026-05-19

Team: Team 03 - Architecture Factory

Work item: `CF-W1-HCTX-02` Historical Context data-quality coverage scope

Mode: docs-only architecture/contract/work-packet prep

## Priority

This is the next direct investor/trader-value requirement behind `CF-W1-MD-04`. Team 01 confirmed the same gap from source audit: Historical Context exposes raw global `dataQualitySnapshots` counts without proving whether coverage is global-only or scope-proven for downstream calibration and review workflows.

## Read First

- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-HCTX-02-historical-context-data-quality-coverage-scope-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/audit-direct-value-gap-2026-05-19.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-01-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-02-requirement-factory.md`
- relevant `historical-context-snapshots` and `signal-calibration-engine` source/docs/tests, read-only

## Allowed Writes

- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-HCTX-02-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-HCTX-02-historical-context-data-quality-coverage-scope-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-HCTX-02-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-CF-W1-HCTX-02-architecture.md`
- optional append/update: `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-architecture-factory.md`

## Required Architecture Questions

- Can the first child stay backend-only and module-local in `historical-context-snapshots` without Prisma/schema, route registry, generated, package, shared utility, provider, frontend, or DQE source changes?
- Which exact files should be reserved for a first implementation child?
- How should the module distinguish `global-only`, `scope-proven`, missing, stale, and unknown DQ coverage evidence without duplicating DQE scoring?
- Which downstream calibration/review consumers must wait until the Historical Context slice is accepted?
- Is a UI coverage card out of scope for the first backend child, or does it require a separate UX/frontend child?

## Stop / Block Conditions

Mark implementation blocked or split if the architecture needs:

- Prisma schema or migrations
- generated type/client changes
- route registry changes
- shared backend utility changes
- DQE source edits
- provider/live-provider calls
- scheduler/startup/backfill behavior changes
- frontend/shared UI changes
- package manifest changes
- duplicate DQE scoring logic

## Output

Return whether `CF-W1-HCTX-02` is architecture-ready as a bounded first child, still blocked, or requires a split. Include exact allowed/forbidden files and QA handoff needs.
