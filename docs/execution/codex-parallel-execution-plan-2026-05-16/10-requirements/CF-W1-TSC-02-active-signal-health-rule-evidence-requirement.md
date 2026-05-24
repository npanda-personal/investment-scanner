# CF-W1-TSC-02 - Active Signal Health Rule Evidence Requirement

Date: 2026-05-24

Owner: Team 02 - Product / Requirement Factory

Status: Requirement-ready for Team 03 architecture prep and later Team 04 QA planning. Not Ready for Implementation.

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

## Required Health Evidence

The health projection should expose, where current source supports it:

- candidate or trigger identity;
- symbol or instrument identity;
- original source-proven entry trigger evidence;
- strategy, rule, and version basis for the current health state;
- latest Data Quality status and evidence date;
- latest health evidence date or explicit missing-evidence reason;
- compact health reason summary;
- missing or unsupported exit/invalidation evidence when those states cannot be proven.

If one of these fields is unavailable, the output must remain explicit about the missing basis rather than silently promoting the candidate into a trusted health state.

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

## Health-State Guardrails

- `Exit Triggered` and `Invalidated` require documented exit or invalidation rule proof.
- `Healthy`, `Weakening`, and `Risk Warning` require a visible rule/version or evidence basis.
- Missing, blocked, stale-hard-blocked, or unsupported Data Quality cannot produce `Healthy`.
- If evidence is partial or unsupported, the candidate should remain `Active` with a review reason or fall to `Blocked`; do not fabricate certainty.
- The first child must not derive health only from price movement, Trade Plan compatibility fields, stop geometry, or target-shaped calculations.

## Acceptance Criteria

- Active signal health is rule-based and evidence-backed.
- `Exit Triggered` and `Invalidated` appear only when documented exit or invalidation criteria prove them.
- `Healthy`, `Weakening`, and `Risk Warning` include a rule/version or evidence basis; otherwise the candidate remains `Active`, `Needs Review`, or `Blocked`.
- Blocked or missing Data Quality cannot produce a trusted health state.
- Health output includes evidence date or an explicit missing-evidence reason.
- Original source-proven entry trigger evidence remains attached or traceable so the user can see what active health is referring back to.
- Health summaries stay compatible with Today Review candidate grouping and do not overwrite the first-slice trust-group semantics.
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
- No new standalone active-signal page in the first child unless Team 03 proves Today Review cannot safely host the initial read-path output.
- No Trade Plan source rewrite and no use of target-shaped compatibility fields as trusted health evidence.

## Dependencies

- `CF-W1-TSC-01A-SIG` should land first so Today Review can receive source-proven entry trigger evidence.
- `CF-W1-TSC-01A-TREV` should establish conservative Today Review grouping before broader health projection is promoted.
- `CF-W1-DQ-03` can improve health reason summaries by making DQ residual reasons compact and reusable.
- Team 03 must map whether the first health child can stay read-path/additive or whether it needs a separate architecture packet.

## Next Gate

Team 03 should prepare the bounded architecture packet next, using the accepted `CF-W1-TSC-01A-SIG` baseline and the active `CF-W1-TSC-01A-TREV` direction without reopening either requirement. The packet should explicitly test whether the first child can stay additive on Today Review read paths.

Team 04 should later prepare a QA plan focused on rule-backed health states, missing-evidence downgrades, DQ hard blocks, exit/invalidation proof safety, and no target/R:R leakage.

Team 00 must not move this item to Ready from the requirement lane.
