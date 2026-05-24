# CF-W1-TSC-01A - Today Review Trusted Signal Candidate Adoption Requirement

Date: 2026-05-24

Owner: Team 02 - Product / Requirement Factory

Status: Requirement Draft - Ready For Team 03 Architecture Prep And Team 04 QA Planning; Not Ready For Implementation

Parent: `CF-W1-TSC-01 - Trusted Signal Candidate Workflow`

Upstream dependency status: `CF-W1-SIG-TRIGGER-ENTRY-01` is accepted and locally committed as `649e645 feat: add signal trigger entry price evidence`.

## Product Goal

Make `/today-review` the primary daily workflow for reviewing Trusted Signal Candidates now that Signal Generation can expose source-proven entry trigger price evidence.

The first child should help the user answer:

- how many candidates are highly trusted today;
- which candidates need review or should only be watched;
- which candidates are blocked;
- which symbol triggered entry, at what source-proven trigger price, and under which strategy/rule/version;
- why the signal triggered;
- whether the evidence is trustworthy enough to show as a trusted candidate.

This is a research-support workflow. It must not become a Trade Plan, R:R, target-price, or advice-like workflow.

## First Bounded Slice

`CF-W1-TSC-01A` should adopt existing evidence into Today Review with the smallest safe read-path/additive change.

The preferred first slice is:

- consume source-proven trigger evidence from Signal Generation only where available;
- classify Today Review rows into `Highly Trusted`, `Trusted but Needs Review`, `Watch Only`, or `Blocked`;
- show compact group counts in Today Review;
- show entry trigger price only when the upstream trigger evidence is source-proven;
- show rule/version and reason summary when source-proven;
- show visible blocked or missing-evidence reasons when a candidate cannot be trusted;
- keep Today Review usable as the daily cockpit without introducing a new page.

## Candidate Group Rules

`Highly Trusted` requires all of:

- Data Quality readiness is READY or equivalent trusted pass state;
- Signal Generation trigger evidence has `trigger_price_evidence.status === SOURCE_PROVEN`;
- trigger price is finite and source-proven;
- trigger timestamp is source-proven;
- strategy/rule/version evidence is present;
- reason summary is present;
- no current blocker is present.

`Trusted but Needs Review` may include candidates with useful evidence but a visible review reason, such as limited confidence, stale contextual evidence, partial optional context, or non-blocking warnings.

`Watch Only` is passive. It may include candidates that are interesting for research but lack source-proven entry trigger evidence or have insufficient confidence for trusted review.

`Blocked` includes missing Data Quality, blocked Data Quality, unsupported scope, unavailable trigger evidence, invalid source evidence, or any state that would overclaim reliability.

## Health-State Rules For First Slice

The first child may show conservative health states only when source-supported:

- `Active` when the candidate is current and has no known blocker;
- `Blocked` when DQ, trigger evidence, unsupported scope, or source validation blocks trusted review;
- `Risk Warning`, `Exit Triggered`, `Invalidated`, `Expired`, `Weakening`, or `Healthy` only when current documented strategy/rule evidence supports the label.

If exit, invalidation, or weakening evidence is not source-proven, the UI must show missing/unsupported evidence rather than infer a state from target prices, R:R, stop geometry, or Trade Plan compatibility fields.

## Acceptance Criteria

- `/today-review` remains the primary workflow surface for Trusted Signal Candidates.
- Today Review exposes candidate group counts for `Highly Trusted`, `Trusted but Needs Review`, `Watch Only`, and `Blocked`.
- A `Highly Trusted` candidate never appears unless Data Quality is trusted and trigger price evidence is source-proven.
- The entry price shown for a trusted candidate is the source-proven rule trigger price, not an entry zone, reference price, target price, R:R-derived value, or Trade Plan field.
- Candidate rows or details show strategy/rule/version, trigger timestamp, and reason summary where source-proven.
- Missing trigger evidence, blocked Data Quality, unsupported scope, or stale hard blockers visibly downgrade or block the candidate with reasons.
- Exit and invalidation statuses come only from documented rule evidence; missing rule evidence is displayed as missing or unsupported.
- Today Review table filtering, sorting, pagination, and non-wrapping row behavior are preserved.
- No trusted candidate surface shows `R:R`, arbitrary target price, synthetic profit target, direct buy/sell advice, or Trade Plan-first wording.
- Existing Today Review data loading remains backward-compatible where practical.

## Product Language Constraints

Preferred:

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
- data quality missing
- manual review required
- exit rule
- invalidation rule

Avoid:

- buy
- sell
- must act
- guaranteed
- profit target
- price target
- R:R
- recommendation quality
- advice-like wording
- Trade Plan as the primary user-facing label.

## Non-Goals

- No Prisma schema or migration change.
- No route registry change.
- No shared backend utility or shared UI change.
- No package manifest or generated-file change.
- No provider/live-data, startup/backfill, broker, paid/cloud, telemetry, or credential work.
- No new page unless Team 03 proves Today Review cannot safely host the first slice.
- No durable trigger persistence.
- No arbitrary target, R:R, synthetic target, or direct-advice behavior.
- No broad Trade Plan source rewrite in this child.

## Next Gate

Team 03 should prepare architecture and exact file reservations for a bounded Today Review adoption slice. If the slice needs a cross-module Signal Generation public-service contract change, Team 03 should explicitly reserve and approve that as part of the architecture packet or split it into a smaller child.

Team 04 should prepare a QA plan covering trigger-evidence adoption, downgrade/block rules, product-language safety, Today Review table regressions, and UI smoke behavior.

Team 00 must keep this item out of Ready until architecture, QA, exact file reservations, source inspection, no-conflict checks, and sequencing against accepted Today Review work pass.
