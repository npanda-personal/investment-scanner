# CF-W1-TSC-01 - Trusted Signal Candidate Contract

Date: 2026-05-24

Owner: Team 03 - Architecture Factory

Status: Draft Contract - Blocked From Implementation By Missing Trigger Price Evidence

## Purpose

Define the user-facing trusted candidate vocabulary for the future `/today-review` workflow.

The contract is intentionally display/read-path oriented for the first slice.

## Candidate Groups

Allowed display groups:

- `HIGHLY_TRUSTED`
- `TRUSTED_NEEDS_REVIEW`
- `WATCH_ONLY`
- `BLOCKED`

Rules:

- `HIGHLY_TRUSTED` requires Data Quality readiness and proven trigger evidence.
- `TRUSTED_NEEDS_REVIEW` may include incomplete, stale, or weaker evidence with visible reason text.
- `WATCH_ONLY` is passive and must not imply readiness to act.
- `BLOCKED` must show blocker reasons and must not show reliability/action labels.

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

Health state must be source-proven. If the current source cannot prove health, show missing evidence or `WATCH_ONLY` rather than inventing a state.

## Required Trusted Candidate Evidence

For `HIGHLY_TRUSTED`, the display model must include:

- symbol or instrument identifier;
- entry trigger price;
- trigger timestamp;
- strategy/rule/version;
- reason summary;
- Data Quality readiness;
- current evidence timestamp or freshness label;
- no target-price/R:R/profit-target fields.

If any required field is missing, the candidate must be downgraded or blocked with a visible reason.

Current source note: as of 2026-05-24, rule-triggered entry price is not source-proven in Today Review, and the current Signal Trigger contract marks `trigger_price` unavailable. Therefore no candidate may be classified as `HIGHLY_TRUSTED` until that evidence exists.

## Exit / Invalidation Contract

Exit and invalidation must be rule-based only.

Allowed statuses:

- `NOT_TRIGGERED`
- `TRIGGERED`
- `MISSING_RULE_EVIDENCE`
- `UNSUPPORTED`

No implementation may infer exit/invalidation from:

- arbitrary target prices;
- R:R ratios;
- synthetic profit targets;
- direct advice wording.

## Product Language

Preferred terms:

- trusted candidate
- entry trigger
- trigger price
- reason summary
- evidence
- trust state
- health state
- blocked
- needs review
- watch only
- exit rule
- invalidation rule

Avoid:

- buy now
- sell now
- must act
- guaranteed
- profit target
- price target
- R:R
- recommendation quality
- advice-like wording
- Trade Plan as the primary user-facing label.

## Compatibility Rule

Existing Trade Plan or target-shaped fields may remain in backend compatibility paths, but they must not be promoted as trusted candidate evidence.

If current UI contains unavoidable Trade Plan wording in the first implementation slice, record it as a known limitation and create a follow-up UX cleanup item.
