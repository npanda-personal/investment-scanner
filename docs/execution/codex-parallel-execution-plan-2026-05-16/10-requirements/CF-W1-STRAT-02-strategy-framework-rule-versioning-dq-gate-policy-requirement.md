# CF-W1-STRAT-02 - Strategy Framework Rule Versioning and DQ Gate Policy Requirement

Date: 2026-05-18

## Status

Audit-derived requirement draft. Not Ready for Implementation.

## Product Value

Strategy Framework is the source of truth for reusable strategy definitions, versions, ratings, readiness labels, and registered backtest metadata. Investors and traders need to know not only which strategy produced a candidate, but also which rule revision and data-quality gate policy were in force when that strategy was evaluated. Without durable rule versioning, strategy behavior can drift silently across signals, backtests, and review surfaces, and the product can look more authoritative than its evidence supports.

## Evidence

- `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/audit-strategy-signal-rules.md` explicitly lists `CF-W1-STRAT-02` as the candidate for adding Strategy Framework rule versioning and DQ gate policy before changing rule behavior.
- The same audit states that strategy versioning is present but not durable enough, and that rule declarations have no rule version.
- `backend/src/modules/strategy-framework/strategy-framework.md` says Strategy Framework owns strategy definitions, versions, ratings, readiness labels, and performance summaries, so it is the right source of truth for versioned rule metadata.
- `backend/src/modules/strategy-framework/strategy-framework.registry.ts` already stores a strategy `version`, but individual rule declarations are still unversioned `code`/`label`/`kind`/`input` objects.
- `frontend/src/features/strategy-framework/components/StrategyFrameworkPage.tsx` already exposes proof evidence, rating warnings, caps, missing evidence reasons, and next actions, so a bounded versioning and DQ-gate trust slice can build on an existing trust surface instead of inventing a new workflow.
- `docs/execution/codex-parallel-execution-plan-2026-05-16/12-ready-queue/blocked-by-shared-file.md` already records the likely Prisma uniqueness/storage decision for `CF-W1-STRAT-02`, which confirms the gap is recognized but not implementation-ready.

## Bounded Requirement

Define a compact Strategy Framework trust slice that makes rule versions and DQ gate policy explicit before any rule behavior changes.

First child slice should focus on:

- durable rule-version or rule-revision metadata for Strategy Framework rule declarations;
- explicit DQ gate policy on strategy definitions so downstream consumers can tell whether a strategy is allowed, limited, or blocked when data quality is not sufficient;
- proof-registry and catalog/detail surfaces that can explain version, status, readiness, missing evidence, and next action without changing strategy math;
- no change to the meaning of existing strategy behavior in this slice;
- no direct advice language, target-price language, broker behavior, or paid-provider dependency.

## Acceptance Criteria

- Each active Strategy Framework definition exposes a stable strategy version and a durable rule-version or revision marker for its rule declarations.
- The catalog, proof registry, and detail surfaces can explain whether a strategy is trusted, limited, blocked, or draft because of rule versioning or DQ gate policy.
- Downstream consumers can tell whether a strategy requires trusted DQ evidence before it should be treated as eligible for stronger review.
- Existing strategy evaluation and backtest behavior remain backward-compatible unless a later accepted contract explicitly changes them.
- Focused tests cover versioned and unversioned rule metadata, DQ-gate exposure, and blocked-vs-limited proof states.

## Non-Goals

- No rewrite of Strategy Framework scoring math, signal math, or backtest simulation math.
- No direct change to Strategy Decision target semantics or backtesting realism rules in this draft.
- No paid providers, telemetry, broker execution, or external services.
- No broad UI redesign beyond the trust fields needed for the bounded slice.

## Future Candidate Files After Ready Promotion

- `backend/src/modules/strategy-framework/strategy-framework.registry.ts`
- `backend/src/modules/strategy-framework/strategy-framework.types.ts`
- `backend/src/modules/strategy-framework/strategy-framework.service.ts`
- `backend/src/modules/strategy-framework/strategy-framework.md`
- `frontend/src/features/strategy-framework/components/StrategyFrameworkPage.tsx`
- `frontend/src/features/strategy-framework/types.ts`
- `backend/tests/modules/strategy-framework/strategy-framework.service.test.ts`

## Priority Position

This requirement sits ahead of `CF-W1-SQLAB-02`, `CF-W1-BT-02`, and the Lane 3 trust-surface items because it preserves the versioned strategy source of truth before downstream review and simulation narratives rely on it.

## Next Gate

Product refinement and an architecture contract for a bounded Strategy Framework rule-versioning and DQ-gate policy slice. If a schema or uniqueness decision is needed, that should be captured explicitly in the architecture contract rather than smuggled into this requirement draft.
