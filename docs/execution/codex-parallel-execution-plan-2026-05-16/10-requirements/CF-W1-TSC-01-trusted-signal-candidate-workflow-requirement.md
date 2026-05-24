# CF-W1-TSC-01 - Trusted Signal Candidate Workflow Requirement

Date: 2026-05-24

Owner: Team 02 - Product / Requirement Factory

Status: Requirement Draft - Architecture Path Needed

## Product Goal

Evolve `/today-review` into the primary Trusted Signal Candidate workflow.

The workflow must help the Product Owner answer:

- how many high-trust signal candidates exist today;
- which symbols triggered entry;
- at what rule-triggered entry price;
- why the signal triggered;
- how trustworthy the evidence is;
- whether the signal is still healthy;
- whether a documented exit or invalidation rule has triggered.

This is a research-support signal review workflow, not a Trade Plan workflow.

## Product Rules

- No `R:R 1:2` display.
- No arbitrary target prices.
- No synthetic profit targets.
- No direct buy/sell advice.
- Entry price means the actual rule trigger price.
- Exit and invalidation must come only from documented strategy/rule criteria.
- Confidence means evidence-backed trust tier, not guaranteed outcome probability.
- Trade Plan wording must not be the primary user-facing frame for trusted candidates.
- Existing target-shaped or Trade Plan compatibility fields must not be shown as trusted signal evidence.

## Candidate Groups

The workflow should group candidates into:

- `Highly Trusted`
- `Trusted but Needs Review`
- `Watch Only`
- `Blocked`

Group assignment must be evidence-backed. A candidate with missing or blocked Data Quality must not appear as `Highly Trusted`.

## Signal Health States

The workflow should track active signal health using:

- `Active`
- `Healthy`
- `Weakening`
- `Risk Warning`
- `Exit Triggered`
- `Invalidated`
- `Expired`
- `Blocked`

Health must be based on current evidence, documented strategy/rule criteria, Data Quality readiness, and explicit exit/invalidation/risk conditions where available. Do not invent exit, invalidation, target, or R:R semantics.

## Candidate Evidence

Each trusted candidate should expose, where current source supports it:

- symbol or instrument;
- trigger type;
- rule-triggered entry price;
- trigger timestamp;
- strategy/rule/version;
- reason summary;
- Data Quality readiness;
- trust tier or confidence label;
- strategy evidence freshness;
- signal quality review-loop evidence;
- market or historical context fit where available;
- current health state;
- exit rule status;
- invalidation rule status;
- blocked or missing-evidence reasons.

If an evidence field cannot be proven from current source, show a missing/unsupported reason rather than inventing it.

## First Slice Preference

Prefer a bounded read-path/additive first slice:

- use `/today-review` as the entry point;
- add trusted candidate grouping and health language from existing Today Review, Signal Generation, Strategy Framework, Signal Quality, Data Quality, and context evidence where currently available;
- avoid schema, route-registry, shared UI, package, generated type, provider/live, startup/backfill, broad UI, or Trade Plan implementation scope.

If the first implementation requires persistence, route registry changes, shared UI, generated types, Trade Plan source changes, or broader API changes, stop and create a separate decision/architecture packet.

## Acceptance Criteria

- `/today-review` remains the primary daily workflow surface.
- The workflow shows candidate counts for trusted, needs-review, watch-only, and blocked groups.
- A trusted candidate shows entry trigger price, strategy/rule/version, trigger timestamp, and reason summary.
- Blocked or missing Data Quality cannot appear as `Highly Trusted`.
- Exit/invalidation status is rule-based only.
- No trusted candidate surface shows R:R, arbitrary targets, synthetic profit targets, or direct financial-advice wording.
- Missing evidence is visible as missing evidence, not hidden behind confidence language.
- Existing Today Review behavior remains backward-compatible where practical.

## Non-Goals

- Do not implement real-money execution.
- Do not add broker integration.
- Do not add paid services or external LLMs.
- Do not introduce arbitrary target prices.
- Do not make Trade Plans the primary surface.
- Do not implement schema or route-registry changes in the first slice.

## Next Gate

Team 03 should prepare the bounded architecture/contract/work-packet path.

Team 04 should prepare a QA plan after Team 03 defines exact file reservations.

Team 00 must not promote implementation until requirement, architecture, QA, file reservations, current source inspection, and no-conflict checks pass.
