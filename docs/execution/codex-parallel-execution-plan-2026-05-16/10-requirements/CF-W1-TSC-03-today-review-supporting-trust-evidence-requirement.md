# CF-W1-TSC-03 - Today Review Supporting Trust Evidence Requirement

Date: 2026-05-24

Owner: Team 02 - Product / Requirement Factory

Status: Split child `CF-W1-TSC-03A-TREV-SUPPORTING-EVIDENCE` promoted by Team 00 after `CF-W1-TSC-02A-TREV-HEALTH` accepted and committed as `34c9993`.

Parent: `CF-W1-TSC-01 - Trusted Signal Candidate Workflow`

## Product Goal

After Data Quality filtering, calibration readiness, and backtesting trust slices exist, the investor still needs one clear place to review what deserves attention now.

That place should remain `/today-review`.

This requirement adds one bounded gap that the current queue does not yet cover cleanly: each Trusted Signal Candidate should expose a compact supporting evidence chain from:

- Data Quality;
- calibration readiness; and
- backtesting proof currentness.

The goal is not to invent a new score or recommendation. The goal is to let the user answer, in the daily review flow:

- is this candidate blocked by data quality;
- is calibration usable, limited, or unavailable;
- is the related backtesting proof current, stale, or only historical;
- which evidence is missing and therefore still needs manual review.

This remains a research-support workflow. It must not become a Trade Plan, target-price, R:R, ranking-engine, or direct-action workflow.

## Why This Is Separate From `CF-W1-TSC-02`

`CF-W1-TSC-02` is about ongoing active-signal health after entry: healthy, weakening, risk warning, exit triggered, invalidated, expired, or blocked.

This requirement is earlier and narrower. It answers the review-routing question before or alongside active monitoring:

- where should the user look after quality filters, calibration, and backtests are computed; and
- what supporting trust evidence is available on the candidate right now.

`CF-W1-TSC-03` should not redefine health states or replace `TSC-02`. It should add supporting trust evidence to the Today Review candidate and detail surfaces.

## Required Supporting Evidence

The first child should expose, where current accepted source supports it:

- candidate identity;
- original source-proven entry trigger evidence from the Trusted Signal Candidate path;
- latest Data Quality status plus compact residual summary when available;
- latest calibration readiness status, downstream influence, and compact reasons when available;
- latest backtesting proof-currentness label and concise explanation when available;
- evidence date or generated timestamp for each supporting evidence block when available;
- explicit unavailable, unsupported, or missing-evidence language when a supporting module cannot prove its state.

The user should not need to open separate module pages just to learn that the candidate is blocked by DQ, calibration is limited, or the backtest is stale historical proof.

## Bounded Requirement

Define an additive Today Review supporting-trust projection that reuses accepted module-owned outputs rather than recomputing them.

The first child should focus on:

- one compact supporting-evidence section on candidate detail;
- lightweight list-level indicators only where the same meaning can be preserved without crowding or advice-like ranking;
- reuse of accepted `CF-W1-DQ-03` residual summaries where available;
- reuse of accepted `CF-W1-CAL-01A` calibration-readiness semantics where available;
- reuse of accepted `CF-W1-BT-04` backtesting proof-currentness labels where available;
- explicit missing or unavailable states instead of fallback heuristics;
- no new cross-module scoring, ranking, or confidence formula.

## Guardrails

- Data Quality remains the hard gate for trusted candidate admission and trusted health. This requirement must not weaken that boundary.
- Calibration readiness must be shown as module-owned evidence only. Do not reinterpret `LIMITED`, `NONE`, `UNAVAILABLE`, or similar semantics into a new composite trust score.
- Backtesting proof labels must remain module-owned. Do not restate stale historical proof as current validation.
- Missing calibration or backtesting evidence must not silently promote a candidate.
- Do not use target price, profit target, reward/risk, stop geometry, Trade Plan compatibility fields, or advice-like wording as supporting evidence.
- Do not create a new "best candidate" score in the first child.

## Acceptance Criteria

- `/today-review` remains the primary daily review destination after DQ, calibration, and backtesting trust slices.
- Candidate detail exposes a compact, source-attributed supporting evidence chain for Data Quality, calibration readiness, and backtesting proof currentness when those sources are available on the implementation base.
- The same candidate does not tell a different trust story between list and detail surfaces.
- Data Quality residual summaries use accepted DQ outputs when available and show unavailable status otherwise.
- Calibration readiness shows module-owned status, downstream influence, and reasons without being converted into a new aggregate score.
- Backtesting proof currentness shows module-owned current/stale/historical proof labeling without implying walk-forward, holdout, or forward-validation proof the product does not own.
- Missing or unsupported supporting evidence is shown explicitly and does not silently upgrade the candidate.
- Existing Trusted Signal Candidate grouping and future `TSC-02` active-health semantics remain compatible.
- No surface introduces R:R, arbitrary targets, synthetic profit targets, or direct buy/sell language.
- Focused tests later cover: full evidence present; DQ blocked; calibration limited; calibration unavailable; stale backtesting proof; historical-only backtesting proof; and missing mixed-source evidence.

## Non-Goals

- No Prisma schema or migration change.
- No route registry change.
- No shared backend utility or shared UI change.
- No package manifest or generated-file change.
- No provider/live-data, startup/backfill, broker, paid/cloud, telemetry, or credential work.
- No new page, new monitor route, or Research Hub rewrite in the first child.
- No cross-module ranking engine, no composite trust score, and no advice-like prioritization language.
- No new backtesting or calibration math.
- No Trade Plan source-of-truth rewrite.

## Dependencies

- `CF-W1-TSC-01A-TREV` must be accepted first so Today Review has the Trusted Signal Candidate base shape.
- `CF-W1-DQ-03` should be present on the implementation base so DQ residual summaries stay compact and module-owned.
- Accepted `CF-W1-CAL-01A` semantics should be reused rather than reinterpreted.
- `CF-W1-BT-04` should be accepted before this requirement is promoted if Today Review is expected to show stable backtesting proof-currentness labels. If `BT-04` is not present on the base, Team 03 should either split the child or require explicit unavailable labeling for backtesting proof currentness.
- `CF-W1-TSC-02` remains a sibling follow-on for active health and should stay separate from this supporting-evidence slice.

## Likely Team 03 Architecture Path

Team 03 should prefer a Today Review-owned additive read-path child that:

- stays inside `today-trade-review` backend/frontend files only;
- consumes accepted snapshot or public-output fields already carried into Today Review;
- adds one stable supporting-evidence object or equivalent fields for DQ, calibration, and backtesting proof;
- keeps list/detail semantics aligned;
- defers any broader Research Hub or multi-page review-routing work to a later requirement.

Recommended future child direction:

- `CF-W1-TSC-03A-TREV-SUPPORTING-EVIDENCE`

Recommended future implementation owner after Team 00 promotion:

- Team 07 - Portfolio / Watchlist / Alerts / Today Review

## Next Gate

Team 00 promoted only the split child `CF-W1-TSC-03A-TREV-SUPPORTING-EVIDENCE`.

The child must stack on accepted `CF-W1-TSC-02A-TREV-HEALTH` commit `34c9993` and must use explicit unavailable/missing states for absent DQ, calibration, or backtesting richer fields.
