# CF-W1-STRAT-02B - Strategy Definition Durable Revision History Requirement

Date: 2026-05-18

## Status

New bounded child requirement derived from the blocked `CF-W1-STRAT-02` parent. Not Ready for Implementation.

## Product Value

Strategy Framework already has accepted no-schema trust surfacing in `CF-W1-STRAT-02A`, but it still cannot preserve durable strategy-definition history across rule revisions. Investors and traders need strategy provenance that survives reseeds and later rule updates so signals, backtests, and research reviews can be traced to the exact persisted definition that was in force. Without durable version-keyed history, the product can show current rule metadata while silently losing historical rule context that older runs depended on.

## Evidence

- `03-architecture/CF-W1-STRAT-02-architecture-review.md` states `CF-W1-STRAT-02A` is complete and the remaining gap is a future `CF-W1-STRAT-02B` durable revision persistence child.
- `06-contracts/CF-W1-STRAT-02-strategy-framework-rule-versioning-dq-gate-policy-contract.md` says the next child must preserve version-keyed persisted definition history instead of overwriting by `code`.
- `08-work-packets/CF-W1-STRAT-02-work-packet.md` shows no application writer is authorized from the parent packet until Team 00 opens `CF-W1-STRAT-02B`.
- `backend/src/modules/strategy-framework/strategy-framework.repository.ts` currently seeds/upserts persisted definitions by `code`, which means newer registry seeds can overwrite older persisted rows rather than preserving version-keyed history.
- `backend/src/modules/strategy-framework/strategy-framework.registry.ts` already declares per-strategy `version`, so the durable gap is persisted identity/history, not missing source-declared version metadata.
- `12-ready-queue/ready-for-implementation.md` records `CF-W1-STRAT-02A` as accepted and parked on branch commit `359d0a3`, so reopening the no-schema child would duplicate accepted work instead of closing the remaining historical provenance gap.

## Bounded Requirement

Define one approval-gated durable-history child for Strategy Framework persisted definitions.

This child should focus on:

- version-keyed persisted `StrategyDefinition` identity so older strategy versions are preserved instead of overwritten by `code`;
- additive persisted rule-revision snapshots aligned to the source-declared current registry metadata from `CF-W1-STRAT-02A`;
- additive service metadata that distinguishes current source-declared trust metadata from durable persisted history availability;
- idempotent reseed/update behavior for unchanged versions and additive insert behavior for new versions;
- no change to evaluator math, proof grading, DQ scoring ownership, route paths, or frontend navigation.

## Acceptance Criteria

- Persisted strategy definitions no longer overwrite prior versions when a new version of the same strategy code is seeded or synced.
- Persisted definition history can preserve per-rule revision metadata for the stored version without fabricating history for legacy rows.
- Strategy Framework service payloads can distinguish `SOURCE_DECLARED_ONLY`, `LEGACY_UNDECLARED`, and durable persisted-history availability using additive metadata.
- Existing catalog/detail/proof consumers remain backward-compatible while gaining additive durable-history visibility.
- Focused tests cover version-keyed persistence, unchanged-version idempotency, new-version additive inserts, legacy undeclared fallback, and service payload compatibility.

## Non-Goals

- No reopen of `CF-W1-STRAT-02A`.
- No strategy evaluator or score changes.
- No backtest config, proof-status, or DQ-tier logic rewrite.
- No controller, router, validation, route-registry, shared UI, package, provider, paid/cloud, broker, or telemetry changes.

## Likely Owner Team

- Team 03 for schema/repository/generated-impact architecture prep and exact file reservations.
- Team 04 for a new durable-history QA plan once Team 03 confirms the child boundary.
- Later implementation only after Team 00 explicitly authorizes the approval-gated child.

## Expected Architecture / QA Gate

- Team 03 should treat this as schema/generated/repository work from the start, not as another no-schema trust pass.
- If the durable identity cannot stay additive to existing reads, split again before any Ready discussion.
- Team 04 should prepare focused repository/service compatibility coverage only after the child packet exists.

## Likely File Ownership Risk

Risk: High.

This child likely touches Prisma/schema, generated artifacts, repository mapping, service mapping, docs, and focused tests in one writer set.

## Future Candidate Files After Approval-Gated Packet

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- generated Prisma client or generated types
- `backend/src/modules/strategy-framework/strategy-framework.repository.ts`
- `backend/src/modules/strategy-framework/strategy-framework.types.ts`
- `backend/src/modules/strategy-framework/strategy-framework.service.ts`
- `backend/src/modules/strategy-framework/strategy-framework.md`
- `backend/tests/modules/strategy-framework/strategy-framework.repository.test.ts`
- `backend/tests/modules/strategy-framework/strategy-framework.service.test.ts`

## Next Gate

Team 00 should treat `CF-W1-STRAT-02B` as the next bounded Team 03 architecture-prep candidate for Strategy Framework, not as a Ready implementation handoff.
