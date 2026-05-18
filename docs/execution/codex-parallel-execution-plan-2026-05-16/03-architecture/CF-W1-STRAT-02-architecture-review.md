# CF-W1-STRAT-02 Architecture Review

Date: 2026-05-18

Owner: Team 03 Architecture Factory

## Status

Split required. Not Ready for durable implementation.

`CF-W1-STRAT-02` has a bounded no-schema first child, but it does not satisfy the full durable rule-revision requirement yet. The current codebase can expose explicit source-declared rule revisions and explicit Data Quality gate policy inside `strategy-framework` without changing strategy math. Durable historical rule revisioning remains blocked because persisted `StrategyDefinition` rows are still keyed by `code` and overwritten in place.

## Evidence Inspected

- `AGENTS.md`
- `16-team-inboxes/TEAM-03-current-assignment.md`
- `10-requirements/CF-W1-STRAT-02-strategy-framework-rule-versioning-dq-gate-policy-requirement.md`
- `99-decision-inbox/open-decisions.md`
- `11-module-audits/audit-strategy-signal-rules.md`
- `12-ready-queue/blocked-by-shared-file.md`
- `backend/prisma/schema.prisma`
- `backend/src/modules/strategy-framework/strategy-framework.md`
- `backend/src/modules/strategy-framework/strategy-framework.registry.ts`
- `backend/src/modules/strategy-framework/strategy-framework.types.ts`
- `backend/src/modules/strategy-framework/strategy-framework.service.ts`
- `backend/src/modules/strategy-framework/strategy-framework.repository.ts`
- `backend/src/modules/strategy-framework/strategy-framework.evaluator.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.types.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.service.ts`
- `backend/tests/modules/strategy-framework/strategy-framework.service.test.ts`
- `backend/tests/modules/strategy-framework/strategy-framework.evaluator.test.ts`
- `backend/tests/modules/strategy-framework/strategy-framework.repository.test.ts`
- `frontend/src/features/strategy-framework/types.ts`
- `frontend/src/features/strategy-framework/api/strategyFrameworkApi.ts`
- `frontend/src/features/strategy-framework/components/StrategyFrameworkPage.tsx`
- `frontend/tests/ui/strategy-framework.spec.ts`

## Current Source Findings

- The registry-level rule factory still creates rule objects with only `code`, `label`, `input`, `kind`, `threshold`, and `weight`. Strategy definitions carry `version`, but individual `entryRules`, `exitRules`, `noiseFilters`, `riskRules`, and `marketGateRules` do not carry a rule revision marker.
- `StrategyRuleDeclaration` and `StrategyDefinition` expose strategy version and rule arrays, but there is no explicit rule-versioning status field, no DQ gate policy field, and no separate trust metadata for proof/catalog/detail surfaces.
- Proof surfaces currently expose `strategyVersion` and performance-proof status only. There is no additive field that explains whether trust is limited because rule revisions are only source-declared or because DQ policy requires stronger DQE evidence.
- Prisma `StrategyDefinition` is currently `code`-unique, and `StrategyFrameworkRepository.upsertDefinitions()` upserts by `code`. That means a future registry seed overwrites the same persisted definition row instead of preserving version-keyed rule history.
- Strategy Framework evaluation currently hard-blocks `NOT_READY`, `UNUSABLE`, and `ILLIQUID`, but it does not expose the richer DQE policy distinctions already available in `data-quality-engine`, where `LIMITED`, thin liquidity, missing trust context, stale data, and backtest-specific blockers are modeled through use-case tiers.
- The frontend Strategy Framework page already shows strategy version, proof status, warnings/caps, and research-support disclaimers, so it is a suitable trust surface for additive metadata. No route or shared UI changes are needed for a first slice.

## Module Boundary Review

`strategy-framework` should own:

- source-declared rule revision metadata for registered strategies;
- declarative DQ gate policy metadata attached to strategy definitions;
- additive catalog/detail/proof trust fields that explain how to read a strategy safely.

`data-quality-engine` should remain the owner of actual readiness evaluation and tier computation. The first child should consume DQE semantics declaratively and must not duplicate scoring logic or widen into DQE source changes.

Durable historical rule revisioning belongs with `StrategyDefinition` persistence and its repository/schema contract. It should not be hidden inside performance summary rows, ad hoc frontend copy, or unrelated modules.

## Architecture Decision

Prepare `CF-W1-STRAT-02` as two children:

1. `CF-W1-STRAT-02A` no-schema first child:
   - add source-declared `ruleRevision` metadata to registry rule declarations;
   - add explicit `dataQualityGatePolicy` metadata to strategy definitions;
   - add additive trust/versioning fields to list/detail/proof DTOs and the existing Strategy Framework UI;
   - preserve current evaluator math, backtest config behavior, and proof-performance status semantics.
2. `CF-W1-STRAT-02B` durable revision persistence:
   - future approval-gated child only;
   - blocked until Prisma/schema/generated/shared-contract approval exists for version-keyed persisted definitions and migration behavior.

The first child should expose semantics equivalent to:

```ts
interface StrategyRuleDeclaration {
  code: string;
  label: string;
  kind: StrategyRuleKind;
  input: string;
  ruleRevision?: string;
}

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

interface StrategyTrustMetadata {
  ruleVersioningStatus: 'SOURCE_DECLARED_ONLY' | 'LEGACY_UNDECLARED';
  dqGateTrustStatus: 'TRUSTED' | 'LIMITED' | 'BLOCKED';
  reasons: string[];
}
```

Exact names may differ, but the semantics must stay stable.

Important boundary: the first child must not overload existing `StrategyProofStatus` (`PROVEN`, `LIMITED`, `UNPROVEN`, `BLOCKED`, `MISSING`) to mean DQ gate state. Performance proof status and trust/versioning status should remain separate additive concepts.

## Exact Future File Reservations

For the no-schema first child only:

- `backend/src/modules/strategy-framework/strategy-framework.registry.ts`
- `backend/src/modules/strategy-framework/strategy-framework.types.ts`
- `backend/src/modules/strategy-framework/strategy-framework.service.ts`
- `backend/src/modules/strategy-framework/strategy-framework.md`
- `backend/tests/modules/strategy-framework/strategy-framework.service.test.ts`
- `frontend/src/features/strategy-framework/types.ts`
- `frontend/src/features/strategy-framework/components/StrategyFrameworkPage.tsx`
- `frontend/tests/ui/strategy-framework.spec.ts`

## Explicitly Forbidden Files

- application source or tests before Team 00 promotion
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- generated Prisma client or generated types
- `backend/src/modules/strategy-framework/strategy-framework.repository.ts`
- `backend/src/modules/strategy-framework/strategy-framework.evaluator.ts`
- `backend/src/modules/strategy-framework/strategy-framework.controller.ts`
- `backend/src/modules/strategy-framework/strategy-framework.router.ts`
- `backend/src/modules/strategy-framework/strategy-framework.validation.ts`
- `backend/tests/modules/strategy-framework/strategy-framework.evaluator.test.ts`
- `backend/tests/modules/strategy-framework/strategy-framework.repository.test.ts`
- `backend/src/modules/data-quality-engine/**`
- `frontend/src/features/strategy-framework/api/strategyFrameworkApi.ts`
- `frontend/src/features/strategy-framework/routes.tsx`
- backend and frontend route registries
- shared backend utilities
- shared frontend components
- package manifests
- provider/startup, paid/cloud, telemetry, broker, or market-data ownership changes

## Dependency And Conflict Notes

- No-schema first slice is source-supported because Strategy Framework list/detail/proof surfaces are registry-backed today.
- Durable/stable rule revision history is still blocked because:
  - `StrategyDefinition` persistence is `code`-unique today; and
  - repository seeding updates the same row by `code` instead of preserving version-keyed history.
- `CF-W1-STRAT-02A` must not be presented as the durable solution. It is explicit trust surfacing only.
- Future `CF-W1-STRAT-02B` will require at minimum:
  - Prisma/schema review;
  - migration behavior review;
  - repository contract changes;
  - generated artifact approval.
- Team 00 should not promote any other Strategy Framework source packet in parallel with `CF-W1-STRAT-02A`; the registry/types/service/doc/test and Strategy Framework page/type/UI spec are a single writer set.

## Required QA Planning Handoff For Team 04

Team 04 should plan the no-schema child only.

Required scenarios:

- active strategy detail shows strategy version, per-rule revision markers, and explicit DQ gate policy;
- proof/detail/catalog surfaces show additive trust/versioning metadata without changing existing performance-proof status meaning;
- a rule with declared revision metadata surfaces as source-declared current metadata;
- a strategy or rule fixture missing `ruleRevision` surfaces a limited legacy-undeclared state instead of silently fabricating a revision;
- DQ gate policy copy clearly distinguishes stronger-review `READY` requirements from review-visible-but-not-trusted limited or missing evidence;
- standalone backtest actions remain governed by existing category/status rules and are not widened by the trust metadata slice;
- existing research-support disclaimer remains visible;
- no API shape regression for existing consumers that already read Strategy Framework list/detail/proof responses.

## Ready Recommendation

- No-schema first child: feasible.
- Full parent requirement: split required.
- Durable/stable rule revisioning: blocked pending Prisma/schema/generated/shared-contract approval.

Team 04 can prepare QA for `CF-W1-STRAT-02A` now. Team 00 should keep the parent requirement out of Ready until it is explicitly split and routed.
