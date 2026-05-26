# CF-W2-DOV-02 - Daily Overview Calibration Evidence-Through Summary Requirement

Date: 2026-05-26

Owner: Team 02 - Product / Requirement Factory

Status: New bounded follow-up draft. Requirement-ready for Team 03 architecture prep. Not Ready for Implementation.

Parent: `CF-W2-DOV-01 - Daily Overview Interactive Market Dashboard`

Depends on accepted child:

- `CF-W2-CAL-02A - Signal Calibration scoped evidence-basis projection`
- local commit verified in execution docs: `1be7d1a feat: add calibration evidence basis`

## Product Goal

Daily Overview currently keeps `Calibration Evidence-Through Summary` as an explicit `Coming soon` placeholder. After the accepted calibration evidence-basis child is available on the implementation base, the investor/trader should see one truthful compact calibration follow-through summary on `/` without leaving the daily workflow or reading row-level calibration tables first.

This child should let the user answer:

- whether calibration evidence is usable, limited, or unavailable for the selected market scope;
- which horizon basis the summary refers to;
- what latest measurable evidence date the current calibration summary reaches; and
- whether missing maturity or missing evidence is the reason the summary is limited.

This remains research-support language only. It must not become a global confidence score, a ranking engine, a target surface, or action-authorizing wording.

## Why This Is Separate From `CF-W2-CAL-02A`

`CF-W2-CAL-02A` fixes the calibration module's own scope-and-evidence-basis truth.

`CF-W2-DOV-02` is the cross-surface consumer child for Daily Overview. It should reuse accepted calibration-owned truth and expose one compact dashboard summary. It must not recompute calibration evidence or invent page-level proxy logic inside Daily Overview.

## Bounded Requirement

Define one compact Daily Overview summary block for calibration evidence-through truth using accepted calibration-owned public outputs.

The first child should focus on:

- one compact `Calibration Evidence-Through Summary` section below the primary DOV review sections;
- selected scope and selected horizon labeling;
- latest measurable evidence date or explicit waiting-for-maturity wording;
- calibration evidence status such as usable, limited, unavailable, or waiting, using calibration-owned semantics only;
- concise reason text when evidence is limited or unavailable;
- drillthrough to the calibration page for detail;
- no new cross-module score, no new calibration math, and no first-row or module-health fallback.

## Acceptance Criteria

- Daily Overview can replace the current calibration placeholder with a truthful compact summary only when the accepted calibration evidence-basis child is on the implementation base.
- The summary shows selected scope, selected horizon, and latest measurable evidence date or an explicit unavailable/waiting basis.
- The summary reuses calibration-owned evidence-basis semantics and does not invent a Daily Overview-specific confidence formula.
- The summary does not infer truth from a first row, a global module-health endpoint, or unsupported placeholder values.
- If calibration evidence is not available on the chosen base, Daily Overview stays explicit about the missing dependency instead of faking a status.
- The section stays below primary candidate-review sections and does not turn Daily Overview back into an operations console.
- No target, reward/risk, Trade Plan-first, broker, or direct buy/sell language appears.

## Non-Goals

- No new calibration model or evidence computation.
- No schema, Prisma, migration, route-registry, package, or generated-file work in this draft.
- No shared UI rewrite.
- No Signal Position Ledger, measured-outcome, or Today Review ranking changes.
- No global dashboard confidence score.

## Dependency Notes

- `CF-W2-DOV-01` owns the Daily Overview surface and currently keeps calibration follow-through placeholder-only.
- `CF-W2-CAL-02A` owns the calibration evidence-basis truth this child must consume.
- This child should stay behind active `CF-W1-UX-01B` and `CF-W2-SPL-02` implementation/review gates; it is a next-packet candidate, not a competing active lane.

## Next Gate

Team 03 should prepare the bounded architecture packet next if Team 00 wants the next non-consent investor/trader-value follow-on after the current active lanes.

Team 04 should plan QA only after Team 03 confirms the summary can be composed from accepted calibration-owned public outputs without shared-file or contract widening beyond the bounded DOV surface.
