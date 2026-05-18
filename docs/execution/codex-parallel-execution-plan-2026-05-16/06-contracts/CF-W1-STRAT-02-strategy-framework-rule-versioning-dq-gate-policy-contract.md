# CF-W1-STRAT-02 Strategy Framework Rule Versioning and DQ Gate Policy Contract

Date: 2026-05-18

Owner: Team 03 Architecture Factory

## Status

Parent contract refreshed after accepted `CF-W1-STRAT-02A`. Blocked for durable implementation.

This contract no longer authorizes another no-schema `02A` pass. `CF-W1-STRAT-02A` is already accepted branch-locally as commit `359d0a3`. The remaining parent scope is durable version-keyed persistence only, and that stays blocked until Team 00 opens a separate approval-gated `CF-W1-STRAT-02B` packet.

## Contract Intent

Strategy Framework already has an accepted trust-surfacing child for current rule revisions and DQ gate policy. The remaining contract intent is to preserve durable, version-keyed rule history without rewriting strategy behavior, proof semantics, or DQ ownership.

The next child must remain research support, preserve backward compatibility, and distinguish durable persisted revision history from the already accepted current-state trust metadata.

## Required Source Boundary

Current allowed application files: none.

Before any future durable-child implementation, Team 00 must open a separate `CF-W1-STRAT-02B` packet with exact file reservations and approval for schema/generated impact.

Future allowed direction for `CF-W1-STRAT-02B` only:

- preserve version-keyed persisted `StrategyDefinition` history instead of overwriting by `code`;
- keep source-declared rule revisions aligned with persisted definition history;
- expose durable/history-aware metadata additively in Strategy Framework service responses;
- document the difference between accepted current-state trust surfacing and durable persisted history.

Forbidden:

- reopening `CF-W1-STRAT-02A` as another no-schema trust-metadata pass;
- evaluator math changes, score changes, proof-grade changes, or backtest-config behavior changes;
- controller, router, validation, route-registry, or API-client path changes;
- Data Quality Engine source/export changes or duplicated DQ scoring logic;
- shared utility/UI, package, provider, startup, paid/cloud, telemetry, broker, or historical-doc edits.

## Required Durable Semantics

Any future durable child must preserve a stable persisted identity equivalent to:

```ts
interface PersistedStrategyDefinitionIdentity {
  strategyCode: string;
  strategyVersion: string;
  revisionStorageMode: 'VERSION_KEYED_IMMUTABLE';
}
```

Every persisted definition snapshot used for Strategy Framework detail or proof should be able to preserve additive rule metadata equivalent to:

```ts
interface PersistedStrategyRuleRevisionSnapshot {
  code: string;
  ruleRevision: string | null;
}
```

Every service payload that exposes durable rule history should remain additive and be able to distinguish:

```ts
interface StrategyTrustMetadata {
  ruleVersioningStatus:
    | 'SOURCE_DECLARED_ONLY'
    | 'LEGACY_UNDECLARED'
    | 'DURABLE_PERSISTED_HISTORY';
  historyStatus:
    | 'CURRENT_ONLY'
    | 'PERSISTED_VERSION_HISTORY_AVAILABLE';
  reasons: string[];
}
```

Exact names may differ, but the behavior must remain stable.

## Required Mapping Rules

- `CF-W1-STRAT-02A` remains the owner of source-declared current trust metadata.
- `CF-W1-STRAT-02B` must not remove or reinterpret accepted `02A` semantics.
- Durable persistence must:
  - preserve older strategy-version rows instead of overwriting them by `code`;
  - expose when a consumer is reading current registry metadata versus durable persisted history;
  - surface legacy undeclared rule revisions as legacy data, not fabricated durable history.
- The durable child must not recompute DQE tier logic locally.

## Proof Surface Rule

- Existing `StrategyProofStatus` remains a performance-proof field.
- Accepted `02A` trust/versioning metadata remains additive.
- Any new durable-history metadata must be additive on top of both proof status and accepted `02A` trust metadata.
- Do not collapse proof status, current trust status, and durable-history state into one field.

## Additive Compatibility Rule

- Existing strategy list/detail/proof payload fields remain backward-compatible.
- Existing strategy evaluation and standalone backtest gating remain backward-compatible.
- Existing Strategy Framework routes and query params remain unchanged.
- Existing frontend Strategy Framework tabs remain unchanged unless Team 00 later authorizes a separate UI compatibility follow-up.

## UI Contract

- No new UI work is authorized from this parent refresh.
- `CF-W1-STRAT-02A` already owns current Strategy Framework trust surfacing.
- If a later durable child needs UI disclosure, it must stay inside the current Strategy Framework page and remain additive, but that should be reserved under a separate Team 00 handoff.

## Forbidden Behavior

- Do not present the already accepted no-schema child as durable historical rule revisioning.
- Do not silently change strategy scoring, evaluator thresholds, or rule meaning.
- Do not let durable-history work rewrite accepted DQ gate trust semantics or existing proof grades.
- Do not duplicate Data Quality Engine tier computation in Strategy Framework.

## Durable Blocker

The full parent requirement still needs a future approval-gated child because:

- Prisma `StrategyDefinition` is `code`-unique today;
- seeding/upsert currently overwrites a definition row by `code`;
- no version-keyed persisted identity exists for stable historical rule revision lookup;
- generated artifacts and repository contracts would need to change together.

## One-Writer Constraint

- No application writer is authorized now from the parent packet.
- If Team 00 later opens `CF-W1-STRAT-02B`, reserve the schema/migration/generated/repository/service/types/doc/test set to one writer only.
- Do not run a durable Strategy Framework child in parallel with any other `strategy-framework` source packet.
- Docs-only Team 03 refresh can run in parallel with active Team 06 `CF-W1-SIG-TRIGGER-02A` because there is no write overlap with the active `signal-generation-engine` worktree.

## Test Contract

No new executable QA handoff is needed for `02A`; that child is already accepted.

If Team 00 later opens `02B`, focused tests must prove:

- version-keyed persisted definition rows no longer overwrite older rows by `code`;
- repository upsert behavior is additive for new versions and idempotent for unchanged versions;
- service payloads can distinguish current registry trust metadata from durable persisted history;
- existing Strategy Framework payloads remain additive/backward-compatible.
