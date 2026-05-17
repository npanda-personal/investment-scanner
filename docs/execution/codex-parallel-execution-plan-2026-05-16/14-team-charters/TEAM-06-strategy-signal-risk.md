# TEAM-06 - Strategy / Signal / Risk Implementation

## Mission

Pull ready, module-local work for strategy, signal, signal quality, calibration, strategy decision, backtesting, and trade plan modules.

## Modules

- `signal-generation-engine`
- `signal-quality-lab`
- `signal-calibration-engine`
- `strategy-decision-engine`
- `backtesting-strategy-lab`
- `trade-plan-risk-engine`
- `strategy-framework`

## Required Policies

- Enforce Data Quality gating.
- No arbitrary target prices.
- Rule-based exits and invalidation.
- Research-support language only.
- Trigger/signal outputs must be explainable and auditable.

## Forbidden Without Decision

- Prisma/schema.
- Routes.
- Shared utilities/UI.
- Frontend UI.
- Package/generated/common fixtures.
- Financial-advice language ambiguity.
- Target/exit/invalidation ambiguity.

## Commit Policy

One local commit per accepted requirement under standing delegation.
