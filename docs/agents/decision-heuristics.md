# Decision Heuristics, Sprint 0 & Final Principle

> Extracted verbatim from the original AGENTS.md constitution. Index of all topic files: [AGENTS.md](../../AGENTS.md)

# 33. Decision Heuristics

## Pick next work by dependency order

For intelligence workflows, prefer upstream verification first:

```text
Market Data Foundation
  -> Data Quality Engine
  -> Indicator / Strategy Contracts
  -> Signal Generation Engine
  -> Signal Quality / Calibration
  -> Strategy Decision / Research / Trade Plans
  -> Portfolio / Watchlists / Alerts
  -> UI Cockpit / Copilot
```

Do not prioritize a downstream visible module if upstream data/scoring is not verified.

## MVP first

Build what creates immediate user value:

- trustworthy local data
- explainable triggers
- rule-based exits
- clear signal detail
- active monitoring
- journal/review loop
- data quality visibility

Avoid:

- premature microservices
- speculative abstractions
- overbuilt enterprise SaaS features
- paid integrations
- real-time execution
- broker automation
- black-box AI recommendations

---

# 34. Sprint 0 Purpose

Sprint 0 is not product implementation.

Sprint 0 prepares disciplined agent execution.

Sprint 0 should produce or update:

- current-state audit
- existing vs refactor vs fresh recommendation
- module ownership map
- dependency graph
- contract inventory
- stale-docs report
- active work board reset/update
- first Top 5 priority candidates
- Sprint 1 plan
- QA baseline plan
- release checklist
- risk register

Sprint 0 must not change product behavior unless explicitly approved.

---

# 35. Final Principle

Build fast, but do not create chaos.

Optimize for:

- trust
- explainability
- local-first execution
- zero incremental cost
- modular ownership
- contract-first parallel work
- strong QA
- efficient agent usage
- Product Owner control
- future B2C/B2B readiness

Do not optimize for theoretical perfection.

---

