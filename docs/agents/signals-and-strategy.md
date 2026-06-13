# Signal/Trigger Contracts & Strategy Requirements

> Extracted verbatim from the original AGENTS.md constitution. Index of all topic files: [AGENTS.md](../../AGENTS.md)

# 17. Signal / Trigger Object Contract

Every generated signal/trigger must include at minimum:

```text
signal_id or trigger_id
symbol or instrument_id
asset_class
region
strategy_id
strategy_version
signal_type or trigger_type
trigger_price
trigger_timestamp
timeframe
entry_rule_id where applicable
exit_rule_id where applicable
invalidation_rule_id where applicable
reason_summary
passed_conditions
failed_conditions
data_quality_status
status
created_at
updated_at
```

Preferred additional fields:

```text
indicator_values_used
source_data_timestamp
scan_run_id
signal_quality_score
calibration_version
risk_level
journal_status
portfolio_context_status
watchlist_context_status
```

Allowed lifecycle states:

```text
detected
validated
published
active
watching
warning
exit_triggered
closed
invalidated
expired
archived
```

Do not create a trigger without:

- rule name
- rule version
- trigger price
- reason summary
- data quality status
- auditability path

No arbitrary target prices.

---

# 18. Strategy / Rule Requirements

Every strategy must document:

- strategy name
- strategy version
- category
- supported asset classes
- supported regions if limited
- timeframe
- entry rules
- exit rules
- invalidation rules
- required indicators
- required market data
- required data quality status
- known weaknesses
- test coverage
- validation notes
- whether it is experimental, active, deprecated, or draft

Strategy categories:

```text
ENTRY
EXIT
GATE
FILTER
RISK
CALIBRATION
DIAGNOSTIC
```

Rules:

- `ENTRY` strategies may produce entry candidates.
- `EXIT` rules manage exits/invalidation.
- `GATE` and `FILTER` rules support strategy eligibility.
- Support rules must not be treated as standalone entry signals.
- Strategy changes must be versioned.
- Do not silently change the meaning of an existing strategy version.

---

