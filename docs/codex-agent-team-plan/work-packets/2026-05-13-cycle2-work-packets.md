# Cycle 2 Work Packets - 2026-05-13

## Orchestrator Gate

Mode: Lead Work Packet.

Source artifacts:
- [PO Current-State Review - Cycle 2](../po-current-state-review-2026-05-13-cycle2.md)
- [PO Roadmap Backlog - Cycle 2](../po-roadmap-backlog-2026-05-13-cycle2.md)
- [Orchestrator Intake - Cycle 2](2026-05-13-cycle2-orchestrator-intake.md)
- [Architecture Contracts - Cycle 2](../architecture-contracts/2026-05-13-cycle2-architecture-contracts.md)
- [QA Plan - Cycle 2](../qa-plans/2026-05-13-cycle2-qa-plan.md)

No implementation may start outside the reserved write scope for the assigned work packet. Developers must test their own changes before handoff to QA and must record skipped checks with concrete blocker reasons.

## Shared Developer Rules

- You are not alone in the codebase. Do not revert or overwrite work from another lane.
- Own one implementation or revision task at a time.
- Ask the Lead/Orchestrator when a requirement or file ownership rule is unclear. The Lead escalates to Architect, and Architect escalates to PO when needed.
- Do not use paid libraries, paid providers, paid AI services, hosted tooling, broker APIs, order placement, live-trading workflows, or advice/execution wording.
- Keep all mutating jobs explicit, local, bounded, scoped to `IN / STOCK`, and user-triggered.
- Use public module services/APIs for cross-module reads. Do not import another module repository directly.
- Do not edit shared files unless the reserved write scope explicitly assigns them.
- Each developer may also write exactly one handoff file for their assigned item under `docs/codex-agent-team-plan/developer-handoffs/`.

## First Implementation Wave

| Work Packet | State | Assigned Lane | Reserved Scope | Schema Slot | Notes |
|---|---|---|---|---|---|
| C2-WP-01 | `Ready for Implementation` | Lane 1 | Market Data Foundation only | Not needed | Data Quality display is optional only if required and coordinated. |
| C2-WP-02 | `Ready for Implementation` | Lane 2A | Signal Generation Engine plus Prisma schema for this WP only | Reserved by C2-WP-02 | Do not start C2-WP-05 schema at the same time. |
| C2-WP-03 | `Ready for Implementation` | Lane 2B | Strategy Framework only | Not needed | Backtesting Lab is read-only unless a missing link field blocks the proof registry. |
| C2-WP-04 | `Ready for Implementation` | Lane 3A | Today Review only | Not needed | Source modules are read-only public contracts. |
| C2-WP-05 | `Blocked` | Lane 3B later | Stock Research Workbench plus Prisma schema | Waiting for schema slot | Do not implement until C2-WP-02 schema work is complete or Orchestrator explicitly batches schema. |

## C2-WP-01 - Trusted Universe Repair Workbench

State: `Ready for Implementation`.

Lane: Lane 1 - Market Data / Data Quality.

Primary goal: Turn Market Data readiness blockers into a bounded repair workbench with lane status, next action, latest run evidence, and readiness reconciliation.

Reserved write scope:
- `backend/src/modules/market-data-foundation/*`
- `backend/tests/modules/market-data-foundation/*`
- `frontend/src/features/market-data-foundation/*`
- `frontend/tests/ui/market-data-foundation.spec.ts`
- `docs/codex-agent-team-plan/developer-handoffs/2026-05-13-c2-wp01-developer-handoff.md`

Forbidden scope:
- `today-trade-review`, `research-hub`, `trade-plan-risk-engine`
- `backend/prisma/schema.prisma`
- global app routes/navigation and shared UI components
- full-universe/provider-heavy actions outside bounded local controls

Implementation requirements:
- Add or normalize a Market Data repair workbench DTO matching the architecture contract.
- Show repair lanes for provider validation, price backfill, stale EOD, catalog identity, provider/manual metadata if already supported, and insufficient trusted universe.
- Show affected count, eligible count, retryable/manual/skipped counts, bounded batch size, expected effect, latest run status, success/failure/skipped counts, warnings, and recommended next lane.
- Keep every repair action explicit, bounded, scoped to `IN / STOCK`, and disabled while a run is active.
- Refresh readiness summary after completed repair action and keep Today Review blocked until Market Data readiness passes.

Developer validation before QA:
- Run focused backend tests for Market Data repair/readiness behavior where available.
- Run `npm.cmd run build` in `backend` if backend TypeScript changed.
- Run `npm.cmd run build` in `frontend` if frontend TypeScript changed.
- Run focused UI check: `npm.cmd run test:ui -- market-data-foundation.spec.ts --workers=1` if Playwright is available.
- Record any skipped check and exact reason in the handoff.

QA handoff must include:
- Changed files.
- API examples for workbench/readiness/repair-run responses.
- UI evidence for lane table/cards and disabled/bounded controls.
- Confirmation no Today Review files were edited.

## C2-WP-02 - Raw Signal Generation Scope And Model-Version Audit

State: `Ready for Implementation`.

Lane: Lane 2A - Strategy / Signals / Risk.

Primary goal: Make raw signal generation auditable, scoped, idempotent, and traceable to model/ruleset version, source data date, scoring inputs, and data-quality eligibility.

Reserved write scope:
- `backend/src/modules/signal-generation-engine/*`
- `backend/tests/modules/signal-generation-engine/*`
- `frontend/src/features/signal-generation-engine/*`
- `frontend/tests/ui/signal-generation-engine.spec.ts`
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/*`
- Prisma generation evidence for this WP
- `docs/codex-agent-team-plan/developer-handoffs/2026-05-13-c2-wp02-developer-handoff.md`

Forbidden scope:
- `strategy-framework`, `backtesting-strategy-lab`, `today-trade-review`, `trade-plan-risk-engine`
- Signal Quality implementation unless Orchestrator approves a separate read-only consumer slice
- unbounded scheduled generation, scoring rewrite, ML/paid service work

Implementation requirements:
- Add additive persisted audit support per the architecture contract: run audit plus nullable per-signal audit fields.
- Preserve idempotency for `instrumentId + modelVersion + generatedDate`.
- Expose latest run audit through Signal Generation public API.
- Expose model/ruleset version, source data date, scoring input summary, data-quality eligibility, and write status for generated signals.
- UI shows latest run scope, versions, source data date, generated/updated/no-op/skipped/failed counts, eligibility exclusions, duration, and row-level audit diagnostics.

Developer validation before QA:
- Run Prisma generate and schema status/push validation against local dev DB as appropriate.
- Run focused backend tests for Signal Generation audit/idempotency.
- Run `npm.cmd run build` in `backend`.
- Run `npm.cmd run build` in `frontend` if frontend changed.
- Run focused UI check: `npm.cmd run test:ui -- signal-generation-engine.spec.ts --workers=1` if Playwright is available.
- Record any skipped check and exact reason in the handoff.

QA handoff must include:
- Changed files and Prisma/schema evidence.
- API examples for latest run audit and representative signal audit fields.
- Repeat-run evidence showing duplicate/no-op behavior rather than duplicate active signals.
- Confirmation no Strategy/Today Review/Trade Plan files were edited.

## C2-WP-03 - Strategy Proof Registry And Evidence Index

State: `Ready for Implementation`.

Lane: Lane 2B - Strategy / Signals / Risk.

Primary goal: Add a Strategy Framework-owned proof registry derived from existing strategy definitions and compact backtest summaries.

Reserved write scope:
- `backend/src/modules/strategy-framework/*`
- `backend/tests/modules/strategy-framework/*`
- `frontend/src/features/strategy-framework/*`
- `frontend/tests/ui/strategy-framework.spec.ts`
- `docs/codex-agent-team-plan/developer-handoffs/2026-05-13-c2-wp03-developer-handoff.md`

Optional read-only references:
- `backtesting-strategy-lab` services/docs/tests may be read. Do not edit unless Orchestrator approves a narrow support change.

Forbidden scope:
- `backend/prisma/schema.prisma`
- `signal-generation-engine`, `trade-plan-risk-engine`, `strategy-decision-engine`, `today-trade-review`
- strategy rule rewrites, optimization, backtest engine rewrite, or paper/live trading

Implementation requirements:
- Add proof registry/list/detail API under Strategy Framework.
- Derive proof status from existing strategy definitions and `StrategyPerformanceSummary`.
- Support statuses `PROVEN`, `LIMITED`, `UNPROVEN`, `BLOCKED`, and `MISSING`, or document Architect-approved equivalents.
- Include strategy code/version, category, scope, selected timeframe, latest evaluation date, sample sufficiency, compact performance, rating/readiness, warnings/caps, missing evidence reason, and next bounded action.
- Add Strategy Framework UI view for proof registry and proof details with Backtesting Lab links where relevant.

Developer validation before QA:
- Run focused backend tests for proof status reducer and registry APIs.
- Run `npm.cmd run build` in `backend` if backend changed.
- Run `npm.cmd run build` in `frontend` if frontend changed.
- Run focused UI check: `npm.cmd run test:ui -- strategy-framework.spec.ts --workers=1` if Playwright is available.
- Record any skipped check and exact reason in the handoff.

QA handoff must include:
- Changed files.
- API examples for proof registry rows and status counts.
- UI evidence for registry statuses, missing evidence, warnings, and next actions.
- Confirmation no schema or downstream consumer files were edited.

## C2-WP-04 - Today Review Explainability And Exclusion Reasons

State: `Ready for Implementation`.

Lane: Lane 3A - Portfolio / Watchlists / Alerts / UX.

Primary goal: Make Today Review explain candidate promotion, watch, blocked, unproven, insufficient-data, and excluded states through a Today Review-owned snapshot over public upstream outputs.

Reserved write scope:
- `backend/src/modules/today-trade-review/*`
- `backend/tests/modules/today-trade-review/*`
- `frontend/src/features/today-trade-review/*`
- `frontend/tests/ui/today-trade-review.spec.ts`
- `docs/codex-agent-team-plan/developer-handoffs/2026-05-13-c2-wp04-developer-handoff.md`

Forbidden scope:
- Market Data, Signal Quality, Calibration, Strategy Framework, Trade Plan, Research Hub, Stock Research Workbench
- `backend/prisma/schema.prisma`
- source-module private repository imports
- portfolio/watchlist overlay and run-history diff

Implementation requirements:
- Extend Today Review DTOs additively with run-level exclusion summaries and candidate-level reason details.
- Use the architecture reason categories and source module labels.
- Hard blockers override positive reasons.
- Missing upstream evidence maps to `INSUFFICIENT_DATA`, `UNPROVEN`, or conservative blockers, never optimistic readiness.
- Existing runs without explainability return a legacy warning or empty summary instead of failing.
- UI shows exclusion counts, inspectable excluded examples, candidate reason panels, ranking components, blockers, and upstream evidence snippets.

Developer validation before QA:
- Run focused backend tests for Today Review reason taxonomy and snapshots.
- Run `npm.cmd run build` in `backend` if backend changed.
- Run `npm.cmd run build` in `frontend` if frontend changed.
- Run focused UI check: `npm.cmd run test:ui -- today-trade-review.spec.ts --workers=1` if Playwright is available.
- Record any skipped check and exact reason in the handoff.

QA handoff must include:
- Changed files.
- API examples for latest/run/candidate detail explainability fields.
- UI evidence for summaries, excluded examples, and candidate detail.
- Confirmation no upstream source modules were edited.

## C2-WP-05 - Research Thesis And Evidence Checklist

State: `Blocked` until schema slot clears.

Lane: Lane 3B - Portfolio / Watchlists / Alerts / UX.

Primary goal: Add private/local stock-centered research thesis notes with evidence checklist and authenticated ownership.

Reserved future write scope:
- `backend/src/modules/stock-research-workbench/*`
- `backend/tests/modules/stock-research-workbench/*`
- `frontend/src/features/stock-research-workbench/*`
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/*`
- `docs/codex-agent-team-plan/developer-handoffs/2026-05-13-c2-wp05-developer-handoff.md`

Blocker:
- Prisma schema is reserved for C2-WP-02 in Wave 1A. This WP waits unless Orchestrator intentionally batches schema changes under one owner.

Do not assign implementation until:
- C2-WP-02 schema changes are completed or explicitly batched.
- The board row moves out of `Blocked`.
- A developer receives a fresh work packet with schema ownership confirmed.
