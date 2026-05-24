# CF-W1-TSC-02 - Active Signal Health Rule Evidence Requirement

Date: 2026-05-24

Owner: Team 02 - Product / Requirement Factory

Status: Rolling Product Owner requirement draft. Not Ready for Implementation.

Parent: `CF-W1-TSC-01 - Trusted Signal Candidate Workflow`

## Product Goal

After a Trusted Signal Candidate enters the daily review flow, the product should keep tracking whether the signal remains valid, is weakening, has triggered a documented exit, or has been invalidated.

The user should be able to answer:

- which active candidates are still healthy;
- which candidates are weakening or carry a risk warning;
- which candidates have a documented exit trigger;
- which candidates are invalidated or expired;
- which rule, rule version, evidence date, and reason summary support that health state.

This is a research-support workflow. It must not become a Trade Plan, target-price, R:R, or direct-action workflow.

## Why This Is Separate From `CF-W1-TSC-01A`

`CF-W1-TSC-01A` is the first adoption slice for `/today-review`: source-proven entry trigger evidence, trusted grouping, and conservative visible reasons.

This requirement captures the next product gap after entry adoption: ongoing rule-based health tracking until exit, invalidation, expiry, or blockage. It should not be merged into the first adoption slice unless Team 03 proves the implementation remains bounded and Team 00 explicitly sequences it that way.

## Required Health States

The health projection should support:

- `Active`
- `Healthy`
- `Weakening`
- `Risk Warning`
- `Exit Triggered`
- `Invalidated`
- `Expired`
- `Blocked`

Every non-basic state must be tied to documented strategy/rule evidence. If the current source cannot prove the health state, show missing or unsupported evidence instead of inferring from targets, R:R, stop geometry, Trade Plan compatibility fields, or price movement alone.

## Bounded Requirement

Define an additive active-signal health projection for Trusted Signal Candidates using existing rule, strategy, signal, Data Quality, and review evidence where available.

The first health child should focus on:

- candidate identity, strategy, rule/version, and original source-proven entry trigger evidence;
- latest available Data Quality readiness and evidence date;
- documented exit or invalidation rule status when available;
- documented weakening or risk-warning reason when available;
- compact health reason summary and missing-evidence reasons;
- backwards-compatible read-path outputs for Today Review or a later active-candidate monitor;
- no target price, arbitrary profit target, R:R, synthetic reward range, or direct buy/sell wording.

## Acceptance Criteria

- Active signal health is rule-based and evidence-backed.
- `Exit Triggered` and `Invalidated` appear only when documented exit or invalidation criteria prove them.
- `Healthy`, `Weakening`, and `Risk Warning` include a rule/version or evidence basis; otherwise the candidate remains `Active`, `Needs Review`, or `Blocked`.
- Blocked or missing Data Quality cannot produce a trusted health state.
- Health output includes evidence date or an explicit missing-evidence reason.
- Existing Today Review candidate grouping remains compatible with the health projection.
- No surface displays R:R, arbitrary targets, synthetic profit targets, or direct financial-advice language.
- Focused tests later cover active, healthy, weakening, risk-warning, exit-triggered, invalidated, expired, blocked, and missing-rule-evidence cases.

## Non-Goals

- No Prisma schema or migration change in this draft.
- No route registry change.
- No shared backend utility or shared UI change.
- No package manifest or generated-file change.
- No provider/live-data, startup/backfill, broker, paid/cloud, telemetry, or credential work.
- No durable trigger or health persistence unless a later Product Owner and Architect packet explicitly approves it.
- No Trade Plan source rewrite and no use of target-shaped compatibility fields as trusted health evidence.

## Dependencies

- `CF-W1-TSC-01A-SIG` should land first so Today Review can receive source-proven entry trigger evidence.
- `CF-W1-TSC-01A-TREV` should establish conservative Today Review grouping before broader health projection is promoted.
- `CF-W1-DQ-03` can improve health reason summaries by making DQ residual reasons compact and reusable.
- Team 03 must map whether the first health child can stay read-path/additive or whether it needs a separate architecture packet.

## Next Gate

Team 03 should prepare architecture/refinement only after the active `CF-W1-TSC-01A-SIG`, `CF-W1-TSC-01A-TREV`, and `CF-W1-DQ-03` gates are clear enough to avoid rework.

Team 04 should later prepare a QA plan focused on rule-backed health states, missing-evidence downgrades, DQ hard blocks, and no target/R:R leakage.

Team 00 must not move this item to Ready from the requirement lane.
