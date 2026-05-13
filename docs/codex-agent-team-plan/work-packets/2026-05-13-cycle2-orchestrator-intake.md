# Cycle 2 Orchestrator Intake - 2026-05-13

## Intake Summary

Mode: Orchestrator Intake.

Product Owner review source:
- [PO Current-State Review - Cycle 2](../po-current-state-review-2026-05-13-cycle2.md)
- [PO Roadmap Backlog - Cycle 2](../po-roadmap-backlog-2026-05-13-cycle2.md)

Runtime evidence:
- Local frontend shell returned `200` at `http://127.0.0.1:5173/`.
- Backend strategy health returned `configuredStrategiesCount=10`, `activeStrategiesCount=8`, `strategiesWithBacktestResults=10`, and `missingPerformanceCount=0`.
- Product Owner persona `codex.po@example.com` authenticated successfully.
- Bounded authenticated API checks passed for auth, Market Data readiness, raw signals, Signal Quality, Calibration health, Today Review latest, Research overview, Trade Plan funnel, portfolio list, watchlist list, and alert rules.
- Focused UI smoke command for the main intelligence workflows was attempted with one worker but timed out before a clean result. Treat UI smoke as pending QA evidence, not as a blocker to architecture planning.

## Intake Gate Result

The Product Owner Top 5 briefs are complete enough for architecture planning. No implementation may start until architecture contracts, QA plan, Orchestrator work packets, WIP clearance, and reserved write scopes are complete.

State transition:
- From: `Product Brief Ready`
- To: `Ready for Architecture`

## Cycle 2 Top 5 Intake

### C2-WP-01 - Trusted Universe Repair Workbench

- Product brief: [Trusted Universe Repair Workbench](../po-roadmap-backlog-2026-05-13-cycle2.md#1-trusted-universe-repair-workbench)
- Target lane: Lane 1, Market Data / Data Quality.
- Proposed module scope: `market-data-foundation`, `data-quality-engine`.
- Conflict rule: reserve only Market Data/Data Quality implementation files. Today Review may be used for read-only verification until architecture explicitly approves otherwise.
- Architecture ask: define repair-run state model, bounded repair actions, readiness reconciliation, API contract, and any database changes.
- QA early-planning ask: verify bounded action behavior, status reconciliation, non-expansion of scope, and Today Review remaining `NO_REVIEW` until thresholds pass.
- Current state: `Ready for Architecture`.

### C2-WP-02 - Raw Signal Generation Scope And Model-Version Audit

- Product brief: [Raw Signal Generation Scope And Model-Version Audit](../po-roadmap-backlog-2026-05-13-cycle2.md#2-raw-signal-generation-scope-and-model-version-audit)
- Target lane: Lane 2, Strategy / Signals / Risk.
- Proposed module scope: `signal-generation-engine`; downstream `signal-quality-lab` is read-only unless architecture approves a separate consumer slice.
- Conflict rule: do not overlap with Strategy Proof Registry files.
- Architecture ask: decide persisted versus response-derived audit fields, idempotency key, model/ruleset version contract, and Signal Quality filter contract.
- QA early-planning ask: verify repeated bounded runs do not duplicate signals and that model-version grouping is visible without mixing generations.
- Current state: `Ready for Architecture`.

### C2-WP-03 - Strategy Proof Registry And Evidence Index

- Product brief: [Strategy Proof Registry And Evidence Index](../po-roadmap-backlog-2026-05-13-cycle2.md#3-strategy-proof-registry-and-evidence-index)
- Target lane: Lane 2, Strategy / Signals / Risk.
- Proposed module scope: `strategy-framework`, `backtesting-strategy-lab`.
- Conflict rule: reserve Strategy Framework/Backtesting first. Trade Plan and Strategy Decision consumption are downstream read-only or later slices unless architecture splits work safely.
- Architecture ask: define proof status taxonomy, proof source of truth, registry API, sample sufficiency semantics, and downstream consumer contract.
- QA early-planning ask: verify proof status, sample counts, timeframe/scope evidence, missing-evidence next actions, and no advice/live-readiness wording.
- Current state: `Ready for Architecture`.

### C2-WP-04 - Today Review Explainability And Exclusion Reasons

- Product brief: [Today Review Explainability And Exclusion Reasons](../po-roadmap-backlog-2026-05-13-cycle2.md#4-today-review-explainability-and-exclusion-reasons)
- Target lane: Lane 3, Portfolio / Watchlists / Alerts / UX.
- Proposed module scope: `today-trade-review`.
- Conflict rule: Today Review may consume public outputs from other modules but should not edit Market Data, Calibration, Strategy Proof, or Trade Plan source modules in the same slice.
- Architecture ask: define candidate and exclusion reason contract, source module dependency boundaries, stale/missing-data semantics, and UI detail shape.
- QA early-planning ask: verify promoted, watched, blocked, unproven, insufficient-data, and excluded rows expose reasons without optimistic fallback.
- Current state: `Ready for Architecture`.

### C2-WP-05 - Research Thesis And Evidence Checklist

- Product brief: [Research Thesis And Evidence Checklist](../po-roadmap-backlog-2026-05-13-cycle2.md#5-research-thesis-and-evidence-checklist)
- Target lane: Lane 3, Portfolio / Watchlists / Alerts / UX.
- Proposed module scope: `stock-research-workbench` or a narrow new local `research-thesis` module. Research Hub links are optional later.
- Conflict rule: avoid `research-hub` implementation files if Today Review or Research Hub readiness work starts in parallel.
- Architecture ask: choose module boundary, persistence shape, authenticated-user ownership, evidence checklist references, and no-advice wording rules.
- QA early-planning ask: verify private/local notes, checklist references, allowed statuses, and no execution/advice workflow.
- Current state: `Ready for Architecture`.

## Parallelization Plan

- Architect owns the architecture contract file for all five items before implementation work packets are created.
- QA may draft a cycle-2 QA plan from the PO briefs in parallel, then reconcile it after architecture contracts are complete.
- No module developer is assigned yet.
- The first implementation wave should target non-overlapping write scopes:
  - Lane 1: C2-WP-01.
  - Lane 2A: C2-WP-02.
  - Lane 2B: C2-WP-03 only if architecture keeps it away from Signal Generation files.
  - Lane 3A: C2-WP-04.
  - Lane 3B: C2-WP-05 only if architecture keeps it away from Today Review and Research Hub files.

## Blockers And Follow-Ups

- Browser automation was not callable in this session; QA should use Playwright or manual browser evidence once work packets are ready.
- Focused UI smoke timed out during PO evidence collection; QA should rerun smaller per-item specs during verification.
- Database and Vite/Node servers were started locally for PO review; do not assume these remain active in later sessions.
