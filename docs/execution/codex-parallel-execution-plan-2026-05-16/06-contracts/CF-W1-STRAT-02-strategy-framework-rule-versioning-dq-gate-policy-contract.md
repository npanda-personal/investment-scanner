# CF-W1-STRAT-02 Strategy Framework Rule Versioning and DQ Gate Policy Contract

Date: 2026-05-18

Owner: Team 03 Architecture Factory

## Status

Split contract prepared. Not Ready for durable implementation.

This contract intentionally covers the no-schema first child only. It does not authorize durable version-keyed persistence.

## Contract Intent

Strategy Framework should make its current rule revisions and Data Quality gate policy explicit before any later team changes rule behavior, strategy math, or downstream trust narratives.

The first child is a trust-surfacing slice only. It must remain research support, preserve backward compatibility, and avoid pretending that source-declared rule revisions are already durable persisted history.

## Required Source Boundary

Implementation must stay inside `strategy-framework` registry/types/service/doc/test plus the module-owned frontend types/page/UI smoke test.

Allowed direction:

- add additive rule-revision metadata to registered strategy rule declarations;
- add additive DQ gate policy metadata to strategy definitions;
- add additive trust/versioning fields to Strategy Framework list/detail/proof responses and page rendering;
- document that trusted stronger review requires DQE evidence, while limited or missing evidence remains review-visible only.

Forbidden:

- Prisma/schema, migrations, generated files, repository persistence changes, or durable storage semantics;
- evaluator math changes, score changes, proof-grade changes, or backtest-config behavior changes;
- controller, router, validation, route-registry, or API-client path changes;
- Data Quality Engine source/export changes or duplicated DQ scoring logic;
- shared utility/UI, package, provider, startup, paid/cloud, telemetry, broker, or historical-doc edits.

## Required Metadata Semantics

Every registry-backed rule declaration returned by Strategy Framework list/detail surfaces must carry additive rule-revision semantics equivalent to:

```ts
interface StrategyRuleDeclaration {
  code: string;
  label: string;
  kind: StrategyRuleKind;
  input: string;
  ruleRevision?: string;
}
```

Every strategy definition returned by Strategy Framework list/detail surfaces must carry additive DQ gate policy semantics equivalent to:

```ts
interface StrategyDataQualityGatePolicy {
  policyVersion: string;
  evidenceSource: 'data-quality-engine';
  strongerReviewRequires: {
    useCase: 'signal';
    minimumTier: 'READY';
  };
  standaloneBacktestRequires: {
    useCase: 'backtest';
    minimumTier: 'READY';
  };
  limitedTierBehavior: 'REVIEW_VISIBLE_NOT_TRUSTED';
  blockedTierBehavior: 'NOT_ELIGIBLE';
  missingEvaluationBehavior: 'REVIEW_VISIBLE_NOT_TRUSTED';
}
```

Every Strategy Framework trust surface that needs to explain safety should carry additive metadata equivalent to:

```ts
interface StrategyTrustMetadata {
  ruleVersioningStatus: 'SOURCE_DECLARED_ONLY' | 'LEGACY_UNDECLARED';
  dqGateTrustStatus: 'TRUSTED' | 'LIMITED' | 'BLOCKED';
  reasons: string[];
}
```

Exact names may differ, but the behavior must remain stable.

## Required Mapping Rules

- If all configured rules for a strategy carry declared rule revisions:
  - mark rule-versioning state as source-declared current metadata;
  - do not describe it as durable historical persistence.
- If any rule declaration lacks a revision marker:
  - mark the strategy trust metadata as a limited legacy-undeclared case;
  - surface a reason instead of fabricating a revision.
- DQ gate policy must state that:
  - stronger review should require DQE `signal` tier `READY`;
  - standalone registered backtest trust should require DQE `backtest` tier `READY`;
  - limited or missing DQ evidence is review-visible only;
  - blocked DQ evidence is not eligible for trusted promotion.

The first child may derive trust metadata from declarative policy. It must not recompute DQE tier logic locally.

## Proof Surface Rule

- Existing `StrategyProofStatus` remains a performance-proof field.
- New trust/versioning metadata must be additive.
- Proof registry and proof detail may show both:
  - current proof-performance state; and
  - current rule-versioning / DQ gate trust explanation.

Do not collapse those concepts into one status field.

## Additive Compatibility Rule

- Existing strategy list/detail/proof payload fields remain backward-compatible.
- Existing strategy evaluation and standalone backtest gating remain backward-compatible in this slice.
- Existing Strategy Framework routes and query params remain unchanged.
- Existing frontend Strategy Framework tabs remain unchanged.

## Required UI Contract

- Catalog, proof registry, and detail surfaces may show additive trust/versioning rows, chips, or inline text.
- The UI must clearly distinguish:
  - strategy version;
  - per-rule revision markers;
  - proof-performance state;
  - DQ gate policy for stronger review;
  - legacy undeclared rule metadata when present.
- The first slice must stay inside the current Strategy Framework page. No route, nav, or shared component changes are allowed.

## Forbidden Behavior

- Do not present the no-schema child as durable historical rule revisioning.
- Do not silently change strategy scoring, evaluator thresholds, or rule meaning.
- Do not let the DQ gate policy slice rewrite existing proof grades.
- Do not add persistence writes, seed-schema changes, or repository identity changes.
- Do not duplicate Data Quality Engine tier computation in Strategy Framework.

## Durable Blocker

The full parent requirement still needs a future approval-gated child because:

- Prisma `StrategyDefinition` is `code`-unique today;
- seeding/upsert currently overwrites a definition row by `code`;
- no version-keyed persisted identity exists for stable historical rule revision lookup;
- generated artifacts and repository contracts would need to change together.

## Test Contract

Focused tests must prove:

- versioned rule metadata is exposed on active definitions;
- missing rule-revision metadata surfaces a legacy limited state;
- DQ gate policy is exposed on list/detail/proof payloads;
- proof/detail UI explains stronger-review `READY` requirements without changing proof-performance state;
- standalone backtest availability remains bounded to current category/status rules;
- current Strategy Framework payloads remain additive/backward-compatible.
