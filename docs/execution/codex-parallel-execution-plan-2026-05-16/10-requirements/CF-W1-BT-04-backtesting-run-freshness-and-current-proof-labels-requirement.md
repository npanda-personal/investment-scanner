# CF-W1-BT-04 - Backtesting Run Freshness And Current-Proof Labels Requirement

Date: 2026-05-20

## Status

Audit-derived requirement draft. Refinement-only. Not Ready for Implementation.

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

## Acceptance Criteria

- Backtesting saved-run outputs expose a compact freshness/current-proof label.
- The user can distinguish current, stale, repaired-historical, and limited historical proof states without relying on raw timestamps alone.
- Repaired or quarantined historical runs explain why they should be reviewed cautiously.
- Existing simulation outputs, proof-basis warnings, and review-traceability behavior remain unchanged.
- Historical saved runs remain backward-compatible even if the current-proof label is derived from existing fields.
- Focused tests later cover current, stale, repaired-historical, and invalid/quarantined states.

## Consent Gates

- Product Owner approval is required if follow-on scope expands into schema/migration, route registry, shared UI, package manifests, generated files, provider/live-data behavior, startup/backfill workflows, paid/cloud dependencies, broker integration, or product-policy reinterpretation.
- Team 03 should stop and split the slice if the first child cannot stay additive and module-local.

## Non-Goals

- No walk-forward, holdout, or optimization engine work.
- No simulation-math rewrite.
- No schema, route registry, shared UI, package, provider/live, broker, paid/cloud, or telemetry work.
- No duplicate proof-currentness logic in downstream consumers.

## Next Gate

Architecture contract and QA plan for a bounded Backtesting current-proof labeling slice, with later implementation reserved to `backtesting-strategy-lab` only if Team 03 confirms the child stays no-schema and additive.
