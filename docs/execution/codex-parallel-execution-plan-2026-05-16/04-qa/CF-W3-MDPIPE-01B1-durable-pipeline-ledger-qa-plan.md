# CF-W3-MDPIPE-01B1 - Durable Pipeline Ledger QA Plan

Date: 2026-05-25

Owner: Team 04 / Team 00

Status: Executed by Team 00 for the bounded ledger foundation.

## Acceptance Checks

- Prisma schema includes durable run and stage models.
- Migration creates run/stage tables, unique idempotency keys, relation, and lookup indexes.
- Service creates stable idempotency keys from scope/date/fingerprint.
- Repository upserts runs and stages with status, counts, warnings/errors, cache metadata, and timestamps.
- Stage lease acquisition blocks terminal-stage claims unless explicitly retried.
- Stage progress updates persist counts, `nextOffset`, `hasMore`, and lease renewal data for UI rehydration.
- Focused tests prove no route, scheduler, frontend, or downstream module wiring is required.

## Commands

```powershell
cd backend
npx.cmd prisma generate
npm.cmd test -- pipeline-orchestration --runInBand
npm.cmd run build
```

## Evidence

- `npx.cmd prisma generate`: passed after stale local Node processes were stopped because they locked the generated Prisma query-engine DLL.
- `npm.cmd test -- pipeline-orchestration --runInBand`: passed, 2 suites / 9 tests.
- `npm.cmd run build`: passed.

## Remaining QA Work

- `CF-W3-MDPIPE-01B2` must validate read-only status API behavior.
- `CF-W3-MDPIPE-01B3` must validate UI progress survives navigation and scope changes.
- `CF-W3-MDPIPE-01C` must validate Data Quality stage batching, cache/fingerprint use, and failure isolation.
