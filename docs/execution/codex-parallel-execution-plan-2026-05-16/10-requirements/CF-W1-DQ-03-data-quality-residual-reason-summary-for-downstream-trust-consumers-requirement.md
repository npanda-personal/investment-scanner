# CF-W1-DQ-03 - Data Quality Residual Reason Summary for Downstream Trust Consumers Requirement

Date: 2026-05-20

## Status

Audit-derived requirement draft. Not Ready for Implementation.

## Product Value

Data Quality already returns the raw ingredients for trust decisions, but downstream consumers still have to interpret gaps, blockers, warnings, liquidity, and fixes on their own. A compact residual reason summary would give strategy, backtest, review, and research surfaces a stable explanation without requiring each caller to rebuild the same interpretation logic.

## Evidence

- `backend/src/modules/data-quality-engine/data-quality-engine.md` shows Data Quality exposes readiness, gaps, blockers, warnings, and recommended fixes.
- The module docs also show downstream consumers are expected to use the public outputs instead of duplicating readiness rules.
- The Team 01 audit found the service currently returns `dataGaps`, `readinessBlockers`, `coverageStatus`, `liquidityStatus`, and `recommendedFixes`, but no contract-level residual taxonomy for downstream consumers.
- `backend/src/modules/strategy-framework/strategy-framework.md` and `backend/src/modules/signal-quality-lab/signal-quality-lab.md` both depend on DQ output as a trust gate, so repeated ad hoc interpretation leaks into multiple review surfaces.

## Dependencies

- Keep the first child backend-local and additive.
- Summarize existing DQ residuals instead of inventing a second readiness model.
- Do not add schema, route-registry, shared UI, package, provider/live, backfill, broker, or telemetry scope in the first child.
- Do not duplicate DQ scoring or eligibility logic in downstream modules.

## Bounded Requirement

Define an additive residual-summary contract that turns the current raw DQ outputs into a compact trust-facing explanation.

The first child should focus on:

- a stable residual reason summary or equivalent compact field derived from the current readiness outputs;
- reason labels that distinguish clean, limited, warning, blocked, liquidity-constrained, missing-data, and unsupported cases;
- downstream-facing wording that explains why the data is not fully clean without restating the full scorecard;
- compatibility with current `dataGaps`, `readinessBlockers`, `coverageStatus`, `liquidityStatus`, and `recommendedFixes` fields;
- backend-first reuse so Strategy Framework, Backtesting, Signal Quality, and review surfaces can share the same interpretation.

## Acceptance Criteria

- The output exposes a compact residual reason summary derived from existing DQ fields.
- Downstream consumers can tell why data is not clean without rebuilding DQ logic themselves.
- Stable labels distinguish clean, limited, blocked, coverage-gap, liquidity-gap, and unsupported states.
- Existing DQ fields and readiness behavior remain backward-compatible.
- Focused tests cover clean, limited, blocked, mixed-gap, liquidity-constrained, and unsupported cases.

## Non-Goals

- No duplicate scoring model.
- No schema, route registry, shared UI, provider/live, broker, or telemetry work.
- No downstream consumer rewrite.

## Next Gate

Architecture contract and QA plan for a bounded DQ residual-summary slice, with later implementation reserved to the data-quality-engine module only.
