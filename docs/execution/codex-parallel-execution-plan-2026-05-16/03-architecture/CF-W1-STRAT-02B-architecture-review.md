# CF-W1-STRAT-02B Architecture Review

Date: 2026-05-18

Owner: Team 03 Architecture Factory

## Status

Proposal packet ready.

`CF-W1-STRAT-02B` remains approval-gated. No honest no-schema or no-generated first child exists on current `dev` once accepted `CF-W1-STRAT-02A` is kept closed. Durable revision history needs a schema/generated/repository foundation child first, then a separate service compatibility child.

## Evidence Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-STRAT-02B-strategy-definition-durable-revision-history-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-STRAT-02-strategy-framework-rule-versioning-dq-gate-policy-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-STRAT-02-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-STRAT-02-strategy-framework-rule-versioning-dq-gate-policy-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-STRAT-02-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/09-summaries/CF-W1-STRAT-02A-po-acceptance-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-STRAT-02A-qa-plan.md`
- `backend/src/modules/strategy-framework/strategy-framework.md`
- `backend/src/modules/strategy-framework/strategy-framework.registry.ts`
- `backend/src/modules/strategy-framework/strategy-framework.repository.ts`
- `backend/src/modules/strategy-framework/strategy-framework.service.ts`
- `backend/src/modules/strategy-framework/strategy-framework.types.ts`
- `backend/tests/modules/strategy-framework/strategy-framework.repository.test.ts`
- `backend/tests/modules/strategy-framework/strategy-framework.service.test.ts`
- `backend/prisma/schema.prisma`

## Current Source Findings

- Accepted `CF-W1-STRAT-02A` already owns the bounded no-schema trust slice:
  - source-declared rule revision surfacing;
  - additive DQ gate policy exposure;
  - undeclared legacy fallback semantics;
  - existing Strategy Framework UI trust framing.
- Current `dev` still stores `StrategyDefinition` with `code` as the only unique persisted identity.
- `StrategyFrameworkRepository.upsertDefinitions()` uses `upsert({ where: { code } })`, so reseeding a new `version` of an existing strategy code overwrites the same row instead of preserving a prior version row.
- `StrategyFrameworkRepository.getDefinition()` also resolves by `code`, so the repository read model has no version-keyed lookup path today.
- `StrategyFrameworkService.seedDefinitions()` writes persisted definitions, but `list()`, `detail()`, `proofRegistry()`, and `proofDetail()` still build their definition view from the in-memory registry or performance summaries rather than from persisted definition history.
- Existing focused tests cover performance-summary persistence, proof-row classification, and registered-backtest eligibility. They do not cover durable strategy-definition version history, legacy persisted-row classification, or additive durable-history compatibility payloads.

## No-Schema First Child Determination

No.

Reason:

- the accepted no-schema child already exists as `CF-W1-STRAT-02A` and must stay closed;
- durable history requires version-keyed persisted identity, which current Prisma and repository mappings do not provide;
- current service read paths do not consume persisted definitions for list/detail/proof surfaces, so a service-only child would still have no durable persisted history to expose honestly.

## Architecture Decision

Treat `CF-W1-STRAT-02B` as a proposal-only durable-history packet with an explicit implementation split:

1. keep `CF-W1-STRAT-02A` closed;
2. require an approval-gated schema/generated/repository foundation child before any outward compatibility work;
3. sequence a later additive service compatibility child only after the foundation lands.

Do not reopen evaluator math, proof-status semantics, route changes, shared UI, or duplicated Data Quality logic under this packet.

## Exact Future Consent Gate

Before any application writer opens `CF-W1-STRAT-02B1`, Team 00 and Architect must explicitly approve all of the following together:

1. `backend/prisma/schema.prisma`
2. `backend/prisma/migrations/**`
3. generated Prisma client or generated types
4. `backend/src/modules/strategy-framework/strategy-framework.repository.ts`

Required gate conditions:

- Team 04 completes proposal review on this packet as a split/completeness gate, not as executable QA.
- No other `strategy-framework` source packet is active.
- One writer owns the full `02B1` schema/generated/repository file set.

## Future Implementation Children

### `CF-W1-STRAT-02B1` - Durable Definition Identity Foundation

Purpose:

- preserve version-keyed persisted `StrategyDefinition` identity;
- make unchanged-version reseeds idempotent;
- make new-version reseeds additive;
- preserve rule snapshot JSON for the persisted version without fabricating older missing history.

Proposed future file reservations only, not approved:

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- generated Prisma client or generated types
- `backend/src/modules/strategy-framework/strategy-framework.repository.ts`
- `backend/src/modules/strategy-framework/strategy-framework.types.ts`
- `backend/src/modules/strategy-framework/strategy-framework.md`
- `backend/tests/modules/strategy-framework/strategy-framework.repository.test.ts`

Explicitly out of scope for `02B1`:

- `strategy-framework.evaluator.ts`
- `strategy-framework.controller.ts`
- `strategy-framework.router.ts`
- `strategy-framework.validation.ts`
- frontend Strategy Framework files
- route registries
- shared UI/utilities
- Data Quality Engine source

### `CF-W1-STRAT-02B2` - Durable History Compatibility Surface

Purpose:

- expose additive durable-history metadata on Strategy Framework list/detail/proof service payloads;
- distinguish current source-declared trust metadata from durable persisted-history availability;
- keep existing payloads backward-compatible.

Dependency:

- `CF-W1-STRAT-02B1` accepted and integrated first.

Proposed future file reservations only, not approved:

- `backend/src/modules/strategy-framework/strategy-framework.service.ts`
- `backend/src/modules/strategy-framework/strategy-framework.types.ts`
- `backend/src/modules/strategy-framework/strategy-framework.md`
- `backend/tests/modules/strategy-framework/strategy-framework.service.test.ts`

Explicitly out of scope for `02B2`:

- Prisma/schema or migrations
- generated files
- evaluator math
- proof-status redefinition
- controller/router/validation changes
- frontend/shared UI changes
- Data Quality Engine source changes or local DQ score duplication

## Required Durable Semantics

Minimum required behavior for the split:

- persisted identity must become version-keyed rather than `code`-only;
- reseeding the same `code + version` must update the same persisted row idempotently;
- reseeding a new `version` for the same `code` must insert a new persisted row instead of overwriting the prior row;
- legacy rows created before the durable identity change must remain visible as legacy current-state rows only and must not imply fabricated older-version history;
- additive service metadata must be able to distinguish:
  - `SOURCE_DECLARED_ONLY`
  - `LEGACY_UNDECLARED`
  - `DURABLE_PERSISTED_HISTORY`

## Team 04 QA Handoff Notes

Team 04 should review this packet as proposal completeness and split sharpness only.

Review focus:

- confirm there is no remaining safe no-schema/no-generated first child;
- confirm `CF-W1-STRAT-02A` stays closed and is not redefined as durable history;
- confirm `02B1` and `02B2` are separate enough that schema/generated work cannot be smuggled into the later service child;
- confirm legacy rows remain legacy and do not fabricate missing version history;
- reject any widening into evaluator math, proof-status semantics, route changes, shared UI, or duplicated DQ logic.

No executable QA command is in scope for this packet.

## Ready Recommendation

- `CF-W1-STRAT-02B` is `proposal packet ready`.
- It is not Ready for Implementation.
- Implementation split is required:
  - `CF-W1-STRAT-02B1` approval-gated schema/generated/repository foundation;
  - `CF-W1-STRAT-02B2` additive service compatibility follow-up.
