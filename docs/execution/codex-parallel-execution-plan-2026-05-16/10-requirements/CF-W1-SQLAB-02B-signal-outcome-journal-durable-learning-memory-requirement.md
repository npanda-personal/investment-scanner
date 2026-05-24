# CF-W1-SQLAB-02B - Signal Outcome Journal Durable Learning Memory Requirement

Date: 2026-05-24

Owner: Team 02 - Product / Requirement Factory

## Status

Refined bounded child requirement. Proposal-blocked until Team 00 and Team 03 intentionally open Prisma/schema, repository, and generated-artifact consent for a `signal-quality-lab` owned persistence slice. Not Ready for Implementation.

## Product Goal

After Data Quality filters, calibration readiness, and backtesting trust labels help the user decide what deserves review now, the product still has a post-event memory gap: it cannot durably preserve what a signal actually did later.

`CF-W1-SQLAB-02A` can preview derived learning from current measured outcomes, but it is transient. The next direct-value gap is durable local research memory so the user can return later and answer:

- what happened after this signal fired;
- which measured horizon was reviewed;
- whether the outcome was fully evaluated, still pending future data, or blocked by missing history; and
- what concise lesson state was recorded from that measured outcome.

This is not a notes app and not a recommendation engine. It is a rule-based, auditable research-memory slice that keeps later calibration review and signal-quality review grounded in preserved local evidence.

## Why This Is Separate From `CF-W1-TSC-03`

`CF-W1-TSC-03` is about where the user should look now in `/today-review` after DQ, calibration, and backtesting trust slices exist.

`CF-W1-SQLAB-02B` is later in the review loop. It answers:

- what actually happened after a reviewed signal aged forward; and
- what durable learning memory remains available for later signal-quality, calibration, and strategy review.

This child must not be widened into Today Review routing, active-signal health, target framing, or Trade Plan behavior.

## Product Value

Without a durable journal child, post-event learning stays transient:

- signal-quality review can show only what is measurable right now;
- calibration continuity cannot safely rely on a preserved local learning record;
- later strategy review loses a compact audit trail of measured outcome lessons; and
- the user cannot trust that yesterday's reviewed evidence will still be available when they come back later.

That makes this a higher direct-value requirement than residual contract cleanup that still lacks an honest bounded child.

## Evidence

- `backend/src/modules/signal-quality-lab/signal-quality-lab.md` explicitly says outcomes are calculated on demand and that no outcome persistence table exists in the MVP.
- `03-architecture/CF-W1-SQLAB-02-architecture-review.md` already split the parent into `CF-W1-SQLAB-02A` derived preview and future durable child `CF-W1-SQLAB-02B`.
- `06-contracts/CF-W1-SQLAB-02-signal-outcome-journal-post-event-learning-contract.md` says the no-schema child must not claim persistence and that durable storage remains blocked until a separate approved packet exists.
- `08-work-packets/CF-W1-SQLAB-02-work-packet.md` says Team 00 must either sequence `CF-W1-SQLAB-02A` as the preview child or keep `CF-W1-SQLAB-02B` as a separate storage approval packet.
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.md` depends on historical signal outcomes and sample evidence, so durable local learning memory remains meaningful even after no-schema trust slices land.
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-TSC-03-today-review-supporting-trust-evidence-requirement.md` now makes the front-of-loop review path clearer, which increases the value of closing the back-of-loop memory gap separately instead of widening Today Review.

## Dependencies

- Keep `CF-W1-SQLAB-02A` as the no-schema preview child and do not reopen or widen it here.
- Preserve accepted `CF-W1-SQLAB-01` trust-state semantics; durable storage must not bypass trusted-versus-limited outcome framing.
- Keep this child separate from `signal-generation-engine`, `signal-calibration-engine`, `today-trade-review`, and `research-hub` persistence. `signal-quality-lab` must own its own durable learning row if approved.
- Keep compatible with `CF-W1-TSC-03`, which should consume only current evidence-routing signals and must not become the owner of post-event journal storage.
- Do not route implementation until Team 00 records explicit consent for Prisma/schema, repository, and generated artifacts.

## Bounded Requirement

Define the durable post-event learning child for `signal-quality-lab` so the module can persist one compact local learning record for a measured signal outcome without widening into a general journal or notes system.

The first durable child should focus on:

- one module-owned durable journal record per measured signal-result and selected horizon scope;
- persisted outcome-learning state derived from the measured result, such as evaluated, pending future data, or missing price history;
- persisted lesson classification and concise research-support summary grounded in module-owned measured outcomes;
- persisted provenance that makes clear which signal result, selected horizon, market scope, derivation timestamp, and rule/strategy evidence basis produced the record;
- idempotent update behavior for the same signal-result and selected horizon rather than duplicate learning rows;
- additive read-surface metadata that lets later consumers know whether a durable learning record exists without recomputing ownership;
- no signal-score rewrite, no calibration-model rewrite, no strategy-rule rewrite, and no cross-module storage reuse.

## Acceptance Criteria

- Signal Quality Lab owns one durable local learning-memory path for measured signal outcomes instead of relying only on transient on-demand preview data.
- Durable journal state distinguishes at least evaluated, pending-future-data, and missing-price-history cases.
- The durable child preserves signal identity, selected horizon, market scope, derivation timestamp, lesson classification, concise reason summary, and durable-record presence.
- The measured outcome remains the source of truth for the learning record; persistence stores the learning memory, not a second competing outcome engine.
- Repeated processing of the same signal-result and selected horizon is idempotent and updates the owned journal record rather than creating uncontrolled duplicates.
- Later consumers can tell whether a durable learning record exists without inventing a second learning-state interpretation outside `signal-quality-lab`.
- Research-support wording is preserved; the durable child must not introduce target-price, synthetic targets, R:R, advice, execution, or guarantee language.
- Focused tests later cover durable create, durable update, idempotency, evaluated-versus-pending state, missing-history handling, and read-surface compatibility.

## Non-Goals

- No generic notes app, free-form thesis editor, or cross-module research notebook in this child.
- No reuse of `SignalResult`, `SignalCalibrationResult`, `TodayReviewRun`, or other foreign persistence surfaces for durable journal state.
- No route-registry, shared UI, provider, paid/cloud, broker, telemetry, or broad frontend redesign in the first storage packet.
- No attempt to merge `CF-W1-SQLAB-02A` preview rendering and `CF-W1-SQLAB-02B` durable storage into one unbounded implementation pass.
- No Today Review ownership shift, no active-signal monitor rewrite, and no Trade Plan expansion.

## Recommended Team 03 Path

Team 03 should treat this as an approval-gated storage packet from the start:

- confirm module-owned persistence identity and natural-key/idempotency rules for one durable journal row per signal-result plus horizon;
- reserve only `signal-quality-lab`, Prisma/schema, generated-artifact, and focused-test files needed for the packet;
- keep route expansion out of the first child unless architecture proves an existing read path cannot surface durable-record presence safely;
- stop and split again if the first child drifts into editable notes, cross-module journal ownership, or shared research-memory abstractions.

Recommended future child label:

- `CF-W1-SQLAB-02B-DURABLE-LEARNING-MEMORY`

## Likely Owner Team

- Team 03 for the approval-gated storage architecture packet and exact file-reservation proposal.
- Team 04 for QA planning around durable-create, idempotent-update, missing-data semantics, and later consumer read compatibility.
- Team 06 later for bounded implementation only if Team 00 opens the storage consent gate.

## Likely File Ownership Risk

Risk: High.

This child is direct-value, but it is not implementation-safe without explicit schema and storage approval. The value of this requirement pass is to make the remaining durable learning gap concrete so Team 00 can either open the gate deliberately or keep the proposal parked without ambiguity.

## Next Gate

Do not move this item to Ready from the requirement lane.

Team 03 should prepare an approval-gated architecture packet only after Team 00 confirms that this post-event research-memory gap should be preferred ahead of residual blocked parents that still lack a bounded child.
