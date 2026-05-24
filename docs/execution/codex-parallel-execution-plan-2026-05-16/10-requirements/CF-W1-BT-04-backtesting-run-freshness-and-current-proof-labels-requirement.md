# CF-W1-BT-04 - Backtesting Run Freshness And Current-Proof Labels Requirement

Date: 2026-05-24

Owner: Team 02 - Product / Requirement Factory

## Status

Requirement-ready for Team 03 architecture prep and Team 04 QA planning. Not Ready for Implementation.

## Product Value

Backtesting already warns about weak samples and invalid calculations, but a saved run can still read like current proof when it is only an older historical simulation. Users need an explicit freshness/current-proof label so they can tell whether a run reflects the latest available proof window, an older saved result, or a structurally stale record that should be reviewed cautiously.

## Evidence

- `11-module-audits/audit-fresh-direct-value-gaps-2026-05-20.md` identifies a saved-run currentness gap distinct from the existing overfit/proof-basis guardrail work.
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.ts` normalizes run outputs and repairs stale PnL math, but the audit found no concise freshness/current-proof label on the saved-run surface.
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.types.ts` already exposes `availabilityStatus`, `calculationAudit`, and `generatedAt`, but not a stable current/stale proof marker.
- `CF-W1-BT-03` already covers proof-basis and overfit guardrails. This requirement should stay separate and additive to avoid reopening advanced validation scope.

## Dependencies

- Keep the first child backend-local and additive inside `backtesting-strategy-lab`.
- Reuse existing generated timestamps, availability status, calculation audit, and saved-run normalization outputs.
- Do not mix this slice with walk-forward, holdout, parameter-sensitivity, or simulation-math expansion.
- Do not introduce schema, migration, route-registry, shared UI, package, generated-file, provider/live-data, startup/backfill, broker, paid/cloud, or telemetry changes in the first child.
- Do not create a second run-trust model outside the existing backtesting module.

## Bounded Requirement

Define an additive current-proof contract that labels saved backtesting runs as current, stale, repaired-historical, or limited historical proof.

The first child should focus on:

- stable freshness/current-proof labels for saved-run rows and selected-run detail outputs;
- clear wording when a run is older than the latest available proof basis or only represents historical saved evidence;
- compact explanation text derived from existing generated timestamps, availability status, and calculation-audit state;
- additive DTO/read-surface enrichment that downstream consumers can reuse without recomputing freshness;
- no change to the existing backtest simulation, scoring, or proof-basis math.

## Required Proof States

The first child must let the user distinguish at least these cases:

- `Current Proof` - the saved run still reflects the latest available proof window for the selected scope;
- `Stale Proof` - a newer proof window exists or the saved run is no longer the latest trustworthy basis;
- `Repaired Historical` - the run is still reviewable, but repaired or corrected historical math means it should not read like untouched current proof;
- `Limited Historical Proof` - the run is historical-only, incomplete, or otherwise useful for review but not current proof.

If a run is unavailable, quarantined, or otherwise not trustworthy enough to map into one of the four user-facing states, the output must show a visible reason instead of implying freshness.

## Acceptance Criteria

- Saved-run list rows and selected-run detail outputs expose the same compact freshness/current-proof story for the same run.
- The user can distinguish `Current Proof`, `Stale Proof`, `Repaired Historical`, and `Limited Historical Proof` without relying on raw timestamps alone.
- The label and concise reason summary are derived from existing backtesting evidence such as generated timestamp, availability state, and calculation-audit state rather than from newly invented persistence or validation engines.
- Repaired, quarantined, or otherwise caution-worthy historical runs explain why they should be reviewed cautiously.
- Existing simulation outputs, proof-basis warnings, review-traceability behavior, and saved-run compatibility remain unchanged.
- Historical saved runs stay backward-compatible even when the new label is derived at read time from existing fields.
- No surface claims walk-forward, holdout, forward-validation, or parameter-sensitivity proof that the module does not currently own.
- Focused tests later cover current, stale, repaired-historical, limited-historical, and unavailable/quarantined cases.

## Consent Gates

- Product Owner approval is required if follow-on scope expands into schema/migration, route registry, shared UI, package manifests, generated files, provider/live-data behavior, startup/backfill workflows, paid/cloud dependencies, broker integration, or product-policy reinterpretation.
- Team 03 should stop and split the slice if the first child cannot stay additive and module-local.

## Non-Goals

- No walk-forward, holdout, or optimization engine work.
- No forward-validation engine or reliability-score rewrite.
- No simulation-math rewrite.
- No new persistence model for saved runs.
- No backtesting run deletion, reseeding, or repair workflow redesign.
- No Trade Plan, target-price, or advice-like framing.
- No schema, route registry, shared UI, package, provider/live, broker, paid/cloud, or telemetry work.
- No duplicate proof-currentness logic in downstream consumers.

## Next Gate

Team 03 should prepare a bounded architecture/contract packet for a no-schema, additive `backtesting-strategy-lab` child that enriches saved-run read outputs only.

Team 04 should later prepare a QA plan covering list/detail consistency, derived-state precedence, stale-vs-current proof labeling, repaired-history caution text, and no false forward-proof claims.

Team 00 must keep this item out of Ready until architecture, QA, exact file reservations, and no-conflict checks are complete.
