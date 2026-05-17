# CF-W1-L3-INTEL-01 Portfolio Intelligence Reliability Gate Contract

Date: 2026-05-17

Owner: Team 07 Portfolio / Watchlist / Alerts

## Status

Contract draft prepared. Not Ready for Implementation.

## Intent

Portfolio Intelligence must expose whether its health score, review ranking, red flags, grouped summaries, and action-like labels are reliable, limited, or blocked based on portfolio readiness evidence.

## Required Upstream Contract

This child depends on `CF-W1-L3-PORT-01A`.

Portfolio Intelligence should consume:

- `PortfolioSummaryDto.readinessSummary`
- `HoldingValuationDto.readiness`

from Portfolio Management after that child is implemented and accepted.

## Required Behavior

- Missing readiness metadata is blocked, not trusted.
- `READY` portfolio readiness can support reliable health/review output.
- `LIMITED` portfolio readiness can support diagnostic context only, with reliability marked limited and action-like labels blocked or downgraded.
- Blocked, not-ready, unusable, stale hard blocker, unsupported, scope mismatch, or missing DQ states must mark Portfolio Intelligence reliability as blocked.
- Existing response fields remain present for backward compatibility.
- New reliability metadata must make downstream trust decisions explicit.

## Forbidden Behavior

- Do not import `DataQualityEngineRepository`.
- Do not duplicate Data Quality scoring, freshness thresholds, liquidity scoring, coverage scoring, or readiness tier mapping.
- Do not modify Portfolio Management in this child.
- Do not modify route registries, Prisma schema, migrations, shared utilities, shared UI, frontend files, packages, generated files, providers, startup/backfill, or live-provider flows.
- Do not introduce direct financial advice language or arbitrary target prices.

## Focused Test Contract

Focused service tests must prove:

- READY readiness produces reliable metadata.
- LIMITED readiness produces limited metadata and blocks action-like reliability claims.
- Missing readiness DTO produces blocked metadata.
- Blocked readiness produces blocked metadata with blocker reasons.
- Existing health score, status, red flag, review ranking, and grouped summary fields remain present.
- Portfolio Intelligence does not import Data Quality repositories or scoring helpers.
