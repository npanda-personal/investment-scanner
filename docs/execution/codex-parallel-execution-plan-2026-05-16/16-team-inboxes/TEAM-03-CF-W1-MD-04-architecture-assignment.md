# TEAM-03 Assignment - CF-W1-MD-04 Architecture Prep

Date: 2026-05-19

Team: Team 03 - Architecture Factory

Work item: `CF-W1-MD-04` Market Data per-instrument freshness and sync provenance

Mode: docs-only architecture/contract/work-packet prep

## Priority

This is the top fresh Team 02 direct investor/trader-value requirement after the user-reported stale-stock sync issue. It outranks research-memory and convenience follow-ons because upstream market-data currentness protects all downstream signals, backtests, research, and review workflows.

## Read First

- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-MD-04-market-data-per-instrument-freshness-sync-provenance-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-02-requirement-factory.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/next-top-10-candidates.md`
- relevant Market Data Foundation and Data Quality Engine source/docs/tests, read-only

## Allowed Writes

- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-MD-04-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-MD-04-market-data-per-instrument-freshness-sync-provenance-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-MD-04-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-CF-W1-MD-04-architecture.md`
- optional append/update: `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-architecture-factory.md`

## Required Architecture Questions

- Can the first child stay module-local in `market-data-foundation` source/tests without Prisma/schema, route registry, provider, scheduler, generated, package, shared utility, or frontend changes?
- Which existing service/worker/repository/validation/test files are the exact candidate reservations?
- What response or module-owned DTO evidence should distinguish region-level currentness from instrument-level currentness?
- How should no-new-data, no-op storage, stale, missing, catch-up, and region-current/instrument-stale mismatch be represented without duplicating DQE scoring?
- Which later downstream consumers can use the evidence only after this Market Data slice is accepted?

## Stop / Block Conditions

Mark implementation blocked or split if the architecture needs:

- Prisma schema or migrations
- generated type/client changes
- route registry changes
- shared backend utility changes
- provider/live-provider calls
- scheduler/startup/backfill behavior changes
- frontend/shared UI changes
- package manifest changes
- duplicate DQE scoring logic

## Output

Return whether `CF-W1-MD-04` is architecture-ready as a bounded first child, still blocked, or requires a split. Include exact allowed/forbidden files and QA handoff needs.
