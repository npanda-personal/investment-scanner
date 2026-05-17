# CF-W1-SIG-TRIGGER-01 Architecture Readiness

Date: 2026-05-17

Prepared by Team 03 Architecture Factory in daemon scheduler mode.

## Status

Contract draft prepared. Implementation is blocked.

This is documentation-only architecture preparation. No app source, tests, package files, Prisma schema, route registries, shared files, root `AGENTS.md`, `docs/AGENTS.md`, or `docs/codex-agent-team-plan/**` were changed.

## Work Item

Complete the full root signal/trigger object contract so Signal Generation Engine outputs and downstream consumers can rely on a consistent, auditable research-support trigger shape.

## Current Evidence

- Root `AGENTS.md` requires every generated signal/trigger to include identity, scope, strategy/rule provenance, trigger price/time, reason summary, pass/fail evidence, data quality status, lifecycle status, and timestamps.
- `requirements-backlog.md` lists `CF-W1-SIG-TRIGGER-01` as P1 and "Needs Architecture Contract".
- Team 06 outbox reports missing or incomplete trigger fields: `asset_class`, `region`, canonical strategy id/version, `trigger_type`, `trigger_price`, `trigger_timestamp`, `timeframe`, rule ids/versions, pass/fail conditions, lifecycle `status`, `created_at`, and `updated_at`.
- Current `SignalResult` persistence stores `instrumentId`, `symbol`, score/direction/confidence, `triggeredSignals`, `negativeSignals`, explanation, generation/run metadata, source dates, scoring input summary, data quality eligibility snapshot, data status, and timestamps.
- Current `SignalResultDto` exposes a signal-score result, not a formal trigger object. It has no canonical trigger price, trigger type, lifecycle state, rule id/version fields, or root `asset_class`/`region` fields.

## Architecture Finding

The project has useful signal generation and DQ-gated read/run slices, but the persisted and API shapes are still score-result oriented. A formal trigger contract can be drafted now, but implementation must be split after Product Owner and Architect acceptance because completion may affect:

- Prisma schema or persisted JSON snapshots.
- signal result DTOs and API response compatibility.
- strategy/rule provenance semantics.
- lifecycle state ownership.
- downstream consumers in alerts, strategy decisions, trade plans, research, quality, calibration, and UI.

## Design Options

### Option A - DTO projection only

Expose a `TriggerObjectV1` projection derived from existing `SignalResult` records without a schema change.

Pros:

- Lowest persistence risk.
- Can be backward-compatible if added as an optional nested field.
- Avoids Prisma work.

Cons:

- Some required fields would be inferred or unavailable.
- `trigger_price`, `timeframe`, rule ids, lifecycle status, and strategy id may be weak or synthetic.
- Auditability remains limited for historical records.

Architecture status: acceptable only as a temporary compatibility adapter if every inferred or unavailable field is explicitly marked.

### Option B - Add a persisted trigger contract snapshot

Add a canonical trigger snapshot on signal results, likely as JSON first, then normalize later only if necessary.

Pros:

- Provides an auditable contract per generated record.
- Can preserve current signal result behavior while adding a contract-complete artifact.
- Avoids immediate table explosion.

Cons:

- May require Prisma schema and migration approval.
- Requires backfill policy for legacy records.
- Requires DTO/API compatibility decisions.

Architecture status: likely best long-term incremental path, but blocked until schema and API decision.

### Option C - New normalized trigger table

Create a first-class trigger persistence model separate from `SignalResult`.

Pros:

- Clean ownership for lifecycle state, trigger detail, and downstream joins.
- Better future fit for entry, exit, invalidation, warning, journal, and forward-validation workflows.

Cons:

- Highest schema and migration cost.
- Requires new repository/service behavior and downstream API decisions.
- Too large for a single parallel implementation slice.

Architecture status: possible future ADR, not recommended as the first implementation step without Product Owner approval.

## Recommended Direction

Use a contract-first phased approach:

1. Accept `TriggerObjectV1` as the public contract shape.
2. Decide whether the first implementation is DTO-only projection or persisted snapshot.
3. Split implementation into bounded slices:
   - signal result contract projection,
   - persisted contract snapshot if approved,
   - downstream consumer adoption,
   - UI/detail surfaces.

Do not implement all downstream consumers in one pass.

## Required Decisions Before Implementation

- Product Owner and Architect must decide whether trigger contract completion is DTO-only first, persisted JSON snapshot, or normalized trigger table.
- Product Owner must accept the canonical product language for `trigger_type` values and lifecycle statuses.
- Architect must decide how `strategy_id`, `strategy_version`, rule ids, and rule versions are sourced when current raw signal items only expose code/label/category.
- Architect must decide whether `trigger_price` uses latest adjusted close, latest close, a rule-specific price, or remains unavailable for legacy records.
- Architect must decide API compatibility: optional nested `trigger` object versus route/DTO replacement.
- QA must prepare field-level contract tests before code changes.

## Implementation Readiness

Not ready for implementation.

Architecture can proceed to Product Owner and Architect review of the contract draft. Source work remains blocked if it needs Prisma, shared type/API, route, frontend, or downstream consumer changes.

