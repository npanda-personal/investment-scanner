# CF-W1-STRAT-03 - Strategy Decision Review Provenance Requirement

Date: 2026-05-18

Status: New bounded discovery requirement. Not Ready for Implementation.

## Why This Exists

Strategy Decision Engine is a direct review and risk surface. Its current outputs already expose reasons, blockers, warnings, data gaps, framework-backed metadata, readiness labels, and proof-safe default filtering, but the remaining gap is provenance: the user can still see the result without a clear additive explanation of whether the decision came from the framework-backed path, a legacy fallback, or a row created on the read path.

Without explicit provenance, review candidates, watch states, avoid states, and exit-risk decisions can look more authoritative than the evidence really is. That creates avoidable trust drift in Strategy Decision, Research Hub, Today Review, and downstream trade-plan review workflows.

## Evidence

- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.md` says the module converts research data into strategy-backed review candidates, watch states, avoid states, and exit-risk decisions, and that Research Hub consumes its additive fields for strategy-proof-driven priority buckets.
- The same module doc says candidate reads default to the latest generated decision date and exclude legacy non-framework-backed rows unless `includeLegacy=true` is explicitly supplied.
- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.types.ts` already exposes `reasons`, `blockers`, `warnings`, `dataGaps`, `strategyVersion`, `frameworkBacked`, `frameworkDecision`, `frameworkAction`, `entryRulesPassed`, `exitRulesTriggered`, `noiseFiltersTriggered`, and readiness labels, which means the first child can stay additive.
- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.service.ts` still creates a persisted decision on a read-path miss in `latestForInstrument()`, so a provenance label is needed to distinguish explicit evaluation from fallback creation.
- `frontend/src/features/strategy-decision-engine/components/StrategyDecisionDashboard.tsx` and `StrategyDecisionWidget.tsx` already render framework, reasons, blockers, warnings, and risk-plan context, which makes a concise provenance field directly useful without a new navigation surface.

## Requirement

Define a bounded Strategy Decision provenance child that keeps the current review-candidate and risk-language behavior, while making the origin and trust level of each decision explicit.

The first child should add additive metadata for:

- whether the row is `FRAMEWORK_BACKED`, `LEGACY_FALLBACK`, or `READ_PATH_CREATED`;
- a concise `reasonSummary` derived from the same evidence already used to build `reasons`, `blockers`, `warnings`, and `dataGaps`;
- a clear flag when a row is included only because `includeLegacy=true` was requested;
- additive proof-safe context for Research Hub and downstream review surfaces.

## Acceptance Criteria

- Strategy Decision responses distinguish framework-backed, legacy fallback, and read-path-created provenance using additive metadata only.
- Current candidate/query behavior remains proof-safe by default and still excludes legacy non-framework-backed rows unless `includeLegacy=true` is explicitly supplied.
- The new provenance does not change decision math, thresholds, batch behavior, or route/query parameters.
- `reasons`, `blockers`, `warnings`, and `dataGaps` remain intact and continue to describe the decision evidence.
- Research-support language stays in place; no buy/sell, target-price, guarantee, or automated-action wording is introduced.
- Downstream surfaces can display the provenance without a shared UI or route-registry rewrite in the first child.

## Non-Goals

- No strategy scoring rewrite.
- No Strategy Framework rule-math rewrite.
- No route registry changes.
- No Prisma/schema changes.
- No shared UI or shared utility changes.
- No provider, live-data, startup, or backfill work.
- No trade-plan geometry rewrite.
- No new recommendation engine or advisory language.

## Likely Owner Team

- Team 00 for routing.
- Team 03 for architecture / contract prep.
- Team 04 for QA planning.

## Expected Architecture / QA Gate

- Keep the first child backend-local and additive to `strategy-decision-engine` service/types/doc/test files.
- If a later child needs frontend dashboard or widget updates, split it explicitly instead of widening the first packet.

## Likely File Ownership Risk

Risk: Medium.

The first child is still module-local, but it touches the service and DTO contract that power both the dashboard and widget surfaces.

## Future Candidate Files After Approval-Gated Packet

- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.service.ts`
- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.types.ts`
- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.md`
- `backend/tests/modules/strategy-decision-engine/strategy-decision-engine.service.test.ts`
- optional only if response-shape assertions widen: `backend/tests/modules/strategy-decision-engine/strategy-decision-engine.routes.test.ts`

## Next Gate

Team 00 should treat `CF-W1-STRAT-03` as a later direct-value docs-only discovery candidate behind the current Strategy Framework, backtesting, and signal-outcome learning tranche. It is not Ready for Implementation.
