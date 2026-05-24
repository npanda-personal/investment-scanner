# CF-W1-TSC-01A - Trigger Evidence Adoption Contract

Date: 2026-05-24

Owner: Team 03 - Architecture Factory / Team 00 Integration

Status: Draft Contract - Split Child Ready For QA Planning

## Purpose

Define the bounded contract for adopting source-proven Signal Generation trigger-price evidence into the Today Review Trusted Signal Candidate workflow.

This contract does not approve schema, route, shared utility, shared UI, package, generated file, provider/live, startup/backfill, broker, paid, cloud, or Trade Plan source changes.

## Split Children

### Child 1 - `CF-W1-TSC-01A-SIG`

Owner: Team 06 - Strategy / Signal / Risk

Goal: add an optional strategy-aware read path to `SignalGenerationEngineService.latestForInstrument`.

Contract rules:

- Existing `latestForInstrument(instrumentId)` behavior must remain backward-compatible.
- Optional read options may include strategy context such as `strategyCode`, `includeStrategyMatches`, `region`, and `assetType`.
- Strategy-aware calls must reuse existing `enrichSignals(..., options)` behavior.
- Source-proven trigger evidence remains valid only when `trigger_price_evidence.status === SOURCE_PROVEN`.
- Do not add route query parameters, persistence, repository behavior, generated types, or provider/live calls.

### Child 2 - `CF-W1-TSC-01A-TREV`

Owner: Team 07 - Portfolio / Watchlist / Alerts / Today Review

Goal: consume the accepted Team 06 bridge from Today Review and project Trusted Signal Candidate evidence.

Contract rules:

- Today Review must pass the Strategy Decision strategy code and current review scope when requesting Signal Generation support evidence.
- Trigger evidence must be stored or projected through existing JSON-backed candidate snapshots.
- `HIGHLY_TRUSTED` requires trusted Data Quality plus source-proven trigger price, trigger timestamp, strategy/rule/version, reason summary, and no active blocker.
- Missing trigger evidence, missing or blocked Data Quality, strategy mismatch, unsupported scope, stale hard blockers, or unavailable rule evidence must downgrade or block the candidate with visible reasons.
- Exit and invalidation labels must remain missing or unsupported unless documented rule evidence proves them.
- Trade Plan, target, stop geometry, R:R, synthetic target, and target-shaped compatibility fields must not be treated as trusted candidate evidence.

## Display Groups

Allowed Trusted Signal Candidate groups:

- `HIGHLY_TRUSTED`
- `TRUSTED_NEEDS_REVIEW`
- `WATCH_ONLY`
- `BLOCKED`

Group assignment must be conservative and evidence-backed. Data Quality blockers or missing source-proven trigger evidence must prevent `HIGHLY_TRUSTED`.

## Health States

Allowed health states:

- `ACTIVE`
- `HEALTHY`
- `WEAKENING`
- `RISK_WARNING`
- `EXIT_TRIGGERED`
- `INVALIDATED`
- `EXPIRED`
- `BLOCKED`

The first implementation child may expose only the subset that current source can prove. Missing health evidence must be visible instead of inferred from targets, R:R, stop geometry, or Trade Plan compatibility fields.

## Compatibility

Existing Signal Generation and Today Review response shapes may remain additive and backward-compatible.

Existing Trade Plan compatibility fields may remain in payloads, but touched Today Review trusted-candidate surfaces must not present them as trusted signal evidence.

## Required Readiness Before Implementation

- Requirement accepted for `CF-W1-TSC-01A`.
- Architecture review accepted.
- QA plan accepted.
- Exact allowed and forbidden file reservations recorded.
- No open Product Owner, Architect, QA, shared-file, schema, route, package, provider/live, or upstream blocker.
- Team 06 bridge must be accepted before Team 07 Today Review adoption starts.

