# CF-W1-SQLAB-02B - Signal Outcome Journal Durable Learning Memory Requirement

Date: 2026-05-19

## Status

New bounded child requirement draft. Proposal-blocked until Team 00 and the Architect intentionally open Prisma/schema, repository, and generated-artifact consent for a `signal-quality-lab` owned persistence slice. Not Ready for Implementation.

## Product Value

`CF-W1-SQLAB-02A` can show a derived post-event learning preview, but it cannot create durable research memory. Investors and traders still need a local, auditable way to come back later and see what a signal actually did after it fired, how the measured outcome was classified, and what learning state was recorded at that time. Without a durable journal child, post-event learning stays transient, calibration and later review workflows cannot reliably reference a stored learning record, and the product remains weak on research evidence continuity.

## Evidence

- `backend/src/modules/signal-quality-lab/signal-quality-lab.md` explicitly says outcomes are calculated on demand and that no outcome persistence table exists in the MVP.
- `03-architecture/CF-W1-SQLAB-02-architecture-review.md` already split the parent into `CF-W1-SQLAB-02A` derived preview and future durable child `CF-W1-SQLAB-02B`, but there is still no Team 02 requirement artifact that defines the durable child itself.
- `06-contracts/CF-W1-SQLAB-02-signal-outcome-journal-post-event-learning-contract.md` says the no-schema child must not claim persistence and that durable storage remains blocked until a separate approved packet exists.
- `08-work-packets/CF-W1-SQLAB-02-work-packet.md` says Team 00 must either sequence `CF-W1-SQLAB-02A` as the preview child or keep `CF-W1-SQLAB-02B` as a separate storage approval packet.
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.md` depends on historical signal outcomes and sample evidence, so a durable local learning memory is still meaningful even after the no-schema preview child exists.
- `docs/codex-agent-team-plan/po-current-state-review-2026-05-13-cycle2.md` says the product still lacks disciplined research workflow memory, which keeps research evidence and reviewability weaker than they need to be.

## Dependencies

- Keep `CF-W1-SQLAB-02A` as the active no-schema preview child and do not reopen or widen it in this packet.
- Preserve the accepted `CF-W1-SQLAB-01` trust-state semantics; durable journal storage must not bypass trusted-versus-limited outcome framing.
- Keep this child separate from `signal-generation-engine`, `signal-calibration-engine`, `today-trade-review`, and `research-hub` persistence. `signal-quality-lab` must own its own durable learning row if the child is approved.
- Do not route implementation until Team 00 records explicit consent for Prisma/schema, repository, and generated artifacts.

## Bounded Requirement

Define the durable post-event learning child for `signal-quality-lab` so the module can persist one compact local learning record for a measured signal outcome without widening into a general notes system.

The first durable child should focus on:

- one module-owned durable journal record per measured signal-result and selected horizon scope;
- persisted outcome-learning state derived from the measured result, such as evaluated, pending future data, or missing price history;
- persisted lesson classification and concise research-support summary grounded in module-owned measured outcomes;
- persisted provenance that makes clear which signal result, horizon, selected scope, and derivation timestamp produced the record;
- idempotent update behavior for the same signal-result and horizon rather than duplicate learning rows;
- no signal-score rewrite, no calibration-model rewrite, no strategy-rule rewrite, and no cross-module storage reuse.

## Acceptance Criteria

- Signal Quality Lab owns one durable local learning memory path for measured signal outcomes instead of relying only on transient on-demand preview data.
- Durable journal state distinguishes at least evaluated, pending-future-data, and missing-price-history cases.
- The durable child preserves signal identity, selected horizon, market scope, derivation timestamp, lesson classification, and concise reason summary.
- The measured outcome remains the source of truth for the learning record; persistence stores the learning memory, not a second competing outcome engine.
- Repeated processing of the same signal-result and selected horizon is idempotent and updates the owned journal record rather than creating uncontrolled duplicates.
- Research-support wording is preserved; the durable child must not introduce target-price, advice, execution, or guarantee language.
- Focused tests later cover durable create, durable update, idempotency, evaluated-versus-pending state, and missing-history handling.

## Non-Goals

- No generic notes app, free-form thesis editor, or cross-module research notebook in this child.
- No reuse of `SignalResult`, `SignalCalibrationResult`, `TodayReviewRun`, or other foreign persistence surfaces for durable journal state.
- No route-registry, shared UI, provider, paid/cloud, broker, telemetry, or broad frontend redesign in the first storage packet.
- No attempt to merge `CF-W1-SQLAB-02A` preview rendering and `CF-W1-SQLAB-02B` durable storage into one unbounded implementation pass.

## Likely Owner Team

- Team 03 for the approval-gated storage architecture packet and exact file-reservation proposal.
- Team 04 for QA planning around durable-create, idempotent-update, and missing-data state semantics.
- Team 06 later for bounded implementation only if Team 00 opens the storage consent gate.

## Expected Architecture / QA Gate

- Treat this as a separate storage packet, not as a continuation of the no-schema preview child.
- Require explicit Team 00 and Architect consent before any Prisma/schema, repository, or generated-artifact work starts.
- Stop if the child widens into shared research-note workflows, cross-module persistence, new routes, or general editable journaling.

## Likely File Ownership Risk

Risk: High.

This child is direct-value, but it is not implementation-safe without explicit schema and storage approval. The main value of this requirement pass is to make the remaining durable learning gap concrete so Team 00 can open or reject the storage gate deliberately.

## Next Gate

Team 03 approval-gated architecture packet for a module-owned `signal-quality-lab` durable journal storage slice, then Team 04 QA planning only after Team 00 records explicit schema/repository/generated consent.
