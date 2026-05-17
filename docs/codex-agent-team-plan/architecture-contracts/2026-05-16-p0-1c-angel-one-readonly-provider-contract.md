# Architecture Contract - P0.1C Angel One Read-Only Historical Provider

Date: 2026-05-16
Mode: Architecture Planning Mode
Owner: Solution Architect / Orchestrator
Work item: P0.1C Angel One Provider-Path Revision

## Product Context

The Product Owner promoted Angel One as the Indian market-data provider path because Yahoo is too slow and incomplete for `IN / STOCK` trusted price-history repair. The objective is to populate trusted Indian price history so downstream signals, decisions, backtests, and trade plans remain blocked until data quality is credible.

## Scope

In scope:

- Read-only historical daily candles for `IN / STOCK`.
- Angel One scrip master usage for identity/token resolution.
- Provider selection for Indian stocks only.
- Bounded concurrency, throttling, retry, and cooldown behavior.
- Source/provenance evidence in Market Data operations docs.

Out of scope:

- Order placement.
- Broker execution.
- Portfolio automation.
- Paid data-provider subscriptions.
- US market provider replacement.
- Signal, strategy, backtest, or trade-plan logic.

## Non-Negotiables

- No paid libraries, paid tools, or paid third-party data-provider subscription.
- Angel One is allowed only through the user's existing broker account and only for read-only market-data access.
- If Angel One access requires a separate paid data subscription, this provider path must be disabled until PO and Architect explicitly approve an alternative free source.
- `ANGEL_ONE_ENABLE_MARKET_DATA` must default to `false` in example/config docs.
- Live orders must stay disabled.
- Yahoo remains available for US markets and non-IN fallback paths.
- Rate limits must be respected before bulk requests are sent.

## Required Runtime Controls

- Angel One must be opt-in through environment configuration.
- The adapter must return `canHandleHistorical=false` unless enabled and credentials are present.
- Historical drains must use bounded worker concurrency and provider throttling.
- Rate-limit responses must use bounded retry/cooldown, not retry storms.
- Bulk drains must run with `force=false` unless a specific repair packet justifies force.
- Logs must not print secrets.
- Downstream readiness must remain blocked while trust status is `NOT_TRUSTWORTHY`.

## Current Implementation Evidence

- `ANGEL_ONE_ENABLE_MARKET_DATA=false` remains the `.env.example` default.
- Orders are not implemented and remain out of scope.
- Live bounded drains are running with `batchSize=20`, `workerConcurrency=2`, `force=false`, and `providerThrottleMs=750`.
- Recent runs have inserted price rows with zero provider failures.
- Yahoo remains present as the existing provider path.

## Acceptance Criteria

1. Angel One provider is disabled by default unless explicitly configured.
2. Read-only `IN / STOCK` historical backfill works with bounded concurrency and no provider-failure storm.
3. No paid subscription, paid SDK, paid hosted service, or paid data vendor is introduced.
4. US/Yahoo paths are not removed.
5. Data-trust gates remain conservative and downstream modules remain blocked until trusted-data evidence passes.
6. Provider throttling and retry behavior are documented in QA evidence.
7. Secrets are never committed, logged, or surfaced in docs.

## QA Evidence Required

- One-symbol historical smoke after credential setup.
- Bounded multi-batch drain evidence with processed/updated/failed/inserted counts.
- Provider failure count and retry evidence.
- Memory gate evidence before long-running drains.
- `repairPlan` / `universeHealth` before-after counters.
- Regression evidence for Market Data provider and repair paths.

## Architect Review Notes

This contract separates Angel/provider behavior from the business-metadata diagnostics slice. Diagnostics can be reviewed as observability. Angel/provider behavior must be reviewed against this provider-path contract.
