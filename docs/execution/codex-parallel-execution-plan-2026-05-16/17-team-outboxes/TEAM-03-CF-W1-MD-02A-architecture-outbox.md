# TEAM-03 CF-W1-MD-02A Architecture Outbox

Date: 2026-05-26

Team: Team 03 - Architecture Factory

Work item: `CF-W1-MD-02A` - Additive companion evidence schema packet

Status: Proposal-only refreshed. Not Ready for Implementation.

## Files Changed

- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-MD-02A-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-MD-02A-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/99-decision-inbox/DECISION-20260526-md-02b-schema-generated-consent.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/99-decision-inbox/open-decisions.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-CF-W1-MD-02A-architecture-outbox.md`

## Files Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-MD-02A-additive-companion-evidence-schema-packet-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/next-top-10-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/99-decision-inbox/open-decisions.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-MD-02-durable-readiness-evidence-adr.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-MD-02-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-MD-02-durable-readiness-evidence-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-MD-02A-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/99-decision-inbox/DECISION-20260517-market-data-durable-readiness-storage-adr.md`
- `backend/prisma/schema.prisma`
- `backend/src/modules/market-data-foundation/market-data-foundation.md`
- `backend/src/modules/market-data-foundation/market-data-foundation.types.ts`

## Exact Evidence

- The 2026-05-17 decision resolved storage direction only; it did not open Prisma, migration, generated, or Market Data writer files.
- `PriceTick` is still keyed by `symbol + timestamp`.
- `LatestPrice` is still keyed by `symbol`.
- Market Data already exposes derived/read-path trust fields such as `latest_completed_eod_date`, `stored_data_through_date`, `readiness_blockers`, and `uses_adjusted_close_fallback`.
- Market Data also already emits run-level evidence such as `sourceFingerprint`, `changedInstrumentIds`, and `dqStageEligible`.
- Those existing run-level fields do not replace the companion durable evidence row required by `CF-W1-MD-02`.

## Verdict

`CF-W1-MD-02A` remains a docs-only proposal packet.

Team 04 QA proposal review can start now.

Implementation remains blocked by a new explicit Product Owner decision:

- `DECISION-20260526-md-02b-schema-generated-consent`

## Exact Future Split

1. `CF-W1-MD-02A`
   - docs-only proposal packet only
2. `CF-W1-MD-02B`
   - additive schema, migration, generated client/types, and Market Data repository/service/types/doc/test implementation
3. `CF-W1-MD-02C`
   - DQE handoff only
4. `CF-W1-MD-02D`
   - downstream DQE-consumer adoption only

## Exact Blocker Before Implementation

Product Owner consent to open `CF-W1-MD-02B` with these high-risk files:

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- generated Prisma client or generated types
- `backend/src/modules/market-data-foundation/market-data-foundation.repository.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.types.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.md`
- `backend/tests/modules/market-data-foundation/market-data.repository.test.ts`
- `backend/tests/modules/market-data-foundation/market-data.service.test.ts`

## Teams Ready To Pick This Up

- Team 04: ready for docs-only proposal review
- Team 00: ready to route the open decision
- Team 05: not ready until the decision is approved and exact file reservations are recorded

## Next Gate

1. Team 04 proposal review on `CF-W1-MD-02A`
2. Product Owner resolution of `DECISION-20260526-md-02b-schema-generated-consent`
3. Team 00 decision on whether to open `CF-W1-MD-02B`

No tests, builds, Prisma commands, services, providers, UI checks, live-data checks, commits, or pushes were run.
