# CF-W1-SQLAB-02 - Signal Outcome Journal and Post-Event Learning Requirement

Date: 2026-05-18

## Status

Audit-derived parent requirement. First child `CF-W1-SQLAB-02A` is the active no-schema preview slice and is in Team 04 QA planning. Not Ready for Implementation.

## Product Value

Signal Quality Lab can calculate forward outcomes, but the product still has no durable signal outcome journal for post-event learning. Investors and traders need a place to review what a signal did after it fired, whether the measured outcome confirmed or contradicted the signal, and what short note explains the lesson. Without that journal, learning stays ephemeral and calibration / strategy review rely on transient calculations rather than a durable review memory.

## Evidence

- `backend/src/modules/signal-quality-lab/signal-quality-lab.md` says outcomes are calculated on demand and explicitly notes there is no outcome persistence table yet.
- The same module already exposes outcomes, horizon availability, noise diagnostics, and data-quality-filtered outcome views, so the missing gap is durable learning memory rather than more outcome math.
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.md` depends on historical signal outcomes and context snapshots, which makes a durable outcome journal valuable for validation and future learning.
- `backend/src/modules/today-trade-review/today-trade-review.md` persists daily shortlist snapshots, but it does not provide a reusable post-event learning journal for signal outcomes.
- `frontend/src/features/signal-quality-lab/components/SignalQualityLabPage.tsx` already presents instrument history and forward outcomes, so a bounded journal surface can build on an existing review workflow rather than inventing a new research area.
- `03-architecture/CF-W1-SQLAB-02-architecture-review.md` splits the work into no-schema `CF-W1-SQLAB-02A` preview planning and a later storage slice.
- Team 00 coordination notes say `CF-W1-SQLAB-02A` is active in Team 04 QA planning and must stay sequenced after `CF-W1-SQLAB-01`.

## Bounded Requirement

Define a compact signal outcome journal slice in `signal-quality-lab` that records the post-event learning outcome for evaluated signals using existing forward-return calculations and existing data-quality context.

First child slice should focus on:

- a single journal entry per evaluated signal result and horizon scope;
- the evaluated outcome label and a concise lesson / review note;
- enough state to distinguish evaluated, insufficient-future-data, and missing-history outcomes;
- no change to signal scoring, calibration math, or strategy rules;
- no attempt to turn the journal into a backtest, alert inbox, or trade executor;
- no direct financial advice language or target-price language.

## Acceptance Criteria

- The user can inspect a durable journal entry that captures what happened after a signal and why it matters for learning.
- The journal preserves signal identity, scope, outcome status, and a short reason summary or lesson note.
- On-demand outcome calculation remains the source of truth for the measurement itself; the journal only persists the learning record.
- The journal clearly separates confirmed outcomes, unevaluable outcomes, and missing history.
- Focused tests cover journal creation, deduplication/update behavior, and missing-data handling.

## Non-Goals

- No changes to Signal Generation scoring or alert delivery.
- No backtesting simulation rewrite.
- No new strategy evaluation logic.
- No paid providers, telemetry, broker execution, or external storage.
- No broad redesign of Today Review or Signal Calibration.

## Likely Owner Team

- Team 03 for the next architecture split and file-reservation packet.
- Team 04 for the next QA plan covering journal-state semantics and missing-data handling.
- Team 06 later for bounded implementation if the child remains module-local and additive.

## Expected Architecture / QA Gate

- Keep `CF-W1-SQLAB-02A` as the active no-schema preview child and do not merge its scope into this parent.
- Prepare the next bounded child as a docs-only contract first: either a no-schema additive journal-state child or a later durable-storage child that is explicitly separated.
- QA should prepare focused scenarios for evaluated, insufficient-future-data, missing-history, and duplicate-update cases before any implementation handoff.

## Likely File Ownership Risk

Risk: Medium.

The first safe child can stay mostly inside `signal-quality-lab` backend/frontend/test files, but storage pressure can escalate quickly into broader repository/type/test changes if the child is not split tightly.

## Dependencies

- `CF-W1-SQLAB-02A` remains the active preview child and must not be reopened or widened during this pass.
- `CF-W1-SQLAB-01` outcome-confidence trust state should remain the accepted upstream framing for trusted versus limited outcome interpretation.
- Any durable storage path must remain separate from calibration or Today Review persistence until Architecture records exact ownership.

## Parallel With `CF-W1-SIG-TRIGGER-02A`

Yes for docs-only architecture and QA prep.

This work is in `signal-quality-lab`, while the active Team 06 implementation is in `signal-generation-engine`. Team 00 can route Team 03 and Team 04 prep without waiting for Team 06 implementation files.

## Future Candidate Files After Ready Promotion

- `backend/src/modules/signal-quality-lab/signal-quality-lab.service.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.types.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.md`
- `frontend/src/features/signal-quality-lab/components/SignalQualityLabPage.tsx`
- `frontend/src/features/signal-quality-lab/types.ts`
- `backend/tests/modules/signal-quality-lab/signal-quality-lab.service.test.ts`

## Priority Position

This requirement sits behind `CF-W1-L3-TREV-01` and ahead of `CF-W1-BT-02` because it closes a durable post-event learning loop for actual measured signals, not only for simulated backtests.

## Next Gate

Product refinement and an architecture contract for the later durable-storage child, after the active no-schema preview child finishes QA planning and the exact file reservations remain valid.
