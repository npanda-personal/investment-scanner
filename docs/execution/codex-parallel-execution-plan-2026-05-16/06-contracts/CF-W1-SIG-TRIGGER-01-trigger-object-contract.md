# CF-W1-SIG-TRIGGER-01 Trigger Object Contract Draft

Date: 2026-05-17

## Status

Draft contract prepared. Not accepted. Implementation blocked.

This document defines the intended trigger object contract but does not authorize source, Prisma, API, shared type, route, frontend, or downstream consumer changes.

## Contract Intent

Signal Generation Engine must expose a contract-complete, auditable trigger object for generated research-support events. The object must support bullish, bearish, entry, exit, invalidation, and risk-review workflows without using advisory language, arbitrary target prices, or black-box recommendations.

## Canonical Object

Future implementations should use a versioned object named `TriggerObjectV1` or an equivalent module-local type with the same fields.

Required fields:

| Field | Requirement |
| --- | --- |
| `trigger_id` or `signal_id` | Stable persisted identity. Use existing signal result id only if no first-class trigger id exists. |
| `instrument_id` or `symbol` | Instrument identity. Prefer `instrument_id` plus `symbol`. |
| `asset_class` | Scope asset class such as `STOCK`, `ETF`, `INDEX`, or `CRYPTO`. Must not be inferred silently if unavailable. |
| `region` | Market region such as `IN`, `US`, `EU`, or `GLOBAL`. Must match global market-scope semantics. |
| `strategy_id` | Canonical strategy or rule-group id. Raw signal factor code alone is insufficient unless accepted as the strategy id for that slice. |
| `strategy_version` | Version of the strategy/ruleset used. |
| `trigger_type` | Research-support type such as `bullish_entry_trigger`, `bearish_trigger`, `exit_trigger`, `invalidation_trigger`, or `risk_warning`. |
| `trigger_price` | Rule-defined trigger price. Must not be an arbitrary target price. |
| `trigger_timestamp` | Timestamp or market-data timestamp at which the trigger was evaluated. |
| `timeframe` | Rule timeframe such as `1d`; must be explicit. |
| `entry_rule_id` | Required for entry triggers. Null only when not applicable. |
| `exit_rule_id` | Required for exit triggers. Null only when not applicable. |
| `invalidation_rule_id` | Required for invalidation triggers. Null only when not applicable. |
| `reason_summary` | Human-readable, research-support explanation. |
| `passed_conditions` | Structured list of passed rule conditions. |
| `failed_conditions` | Structured list of failed or blocking rule conditions. |
| `data_quality_status` | DQE-derived readiness status or an explicit warning/unavailable status. |
| `status` | Lifecycle state from the root allowed states. |
| `created_at` | Persistence creation timestamp. |
| `updated_at` | Persistence update timestamp. |

Preferred fields:

- `indicator_values_used`
- `source_data_timestamp`
- `scan_run_id`
- `signal_quality_score`
- `calibration_version`
- `risk_level`
- `journal_status`
- `portfolio_context_status`
- `watchlist_context_status`

## Allowed Lifecycle States

Use only the root `AGENTS.md` lifecycle states unless Product Owner and Architect approve additions:

- `detected`
- `validated`
- `published`
- `active`
- `watching`
- `warning`
- `exit_triggered`
- `closed`
- `invalidated`
- `expired`
- `archived`

Initial signal-generation output should normally use `detected` or `validated`, depending on DQ and rule readiness. Do not use `published`, `active`, or `watching` unless downstream workflow ownership is defined.

## Trigger Type Rules

- Bullish entry candidates must use `bullish_entry_trigger` or an accepted equivalent.
- Bearish candidates must use `bearish_trigger` unless they are explicitly exit or invalidation rules.
- Exit and invalidation triggers must point to documented exit or invalidation rule ids.
- Risk warnings must not be treated as standalone entry triggers.
- Do not expose `buy now`, `sell now`, target-price, guaranteed-return, or automated trade instruction language.

## Data Quality Rule

Every trigger object must either:

- include a passing DQE-derived `data_quality_status`, or
- clearly mark the trigger as warning/blocked/untrusted with the reason.

Signal generation and downstream consumers must not duplicate DQE scoring logic.

## Auditability Rule

Every trigger object must preserve enough evidence to answer:

- which instrument triggered,
- when and at what rule-defined price,
- which strategy and rule version was used,
- which conditions passed and failed,
- what market-data timestamp and DQ status supported it,
- which scan/run produced it,
- when the record was created and updated.

Legacy records that cannot satisfy the contract must be marked as contract-incomplete. Do not silently invent values.

## API Compatibility

No route path changes are authorized by this draft.

Preferred compatibility path, if accepted later:

- keep existing `SignalResultDto` fields,
- add an optional nested `trigger` object or `triggerContract` object,
- mark legacy rows with `auditStatus = LEGACY_MISSING` or an equivalent contract status,
- avoid breaking current signal list, latest signal, run, and screener consumers.

API replacement, new routes, or shared frontend type changes require separate Orchestrator and Architect reservation.

## Persistence Impact

Persistence strategy is undecided.

Implementation must stop if it requires:

- `backend/prisma/schema.prisma`,
- Prisma migrations,
- generated type changes,
- broad response shape replacement,
- new route registration,
- shared backend/frontend type changes,
- downstream consumer changes outside an approved bounded slice.

## Acceptance Criteria

- Product Owner accepts product-language values for trigger types and lifecycle states.
- Architect accepts the source of each required field.
- QA plan covers contract-complete current records and contract-incomplete legacy records.
- No arbitrary target prices are introduced.
- Data quality status is present and DQE-aligned.
- Rule and strategy provenance are versioned and auditable.
- API compatibility is documented before implementation.

