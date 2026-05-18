# CF-W1-SQLAB-02A - Signal Outcome Journal Derived Preview Requirement

Date: 2026-05-18

## Status

Requirement refined by Team 02. Team 04 QA planning is active. Not Ready for Implementation.

This is the first no-schema child under `CF-W1-SQLAB-02`. It narrows the broader durable journal requirement to an additive derived preview that can be computed from existing `SignalOutcomeSet` data before any storage decision is approved.

## Product Value

Signal Quality Lab already measures forward outcomes, but the product still lacks a journal-like review surface that helps users inspect what happened after a signal fired and what the lesson should be. A no-schema preview is useful because it validates the learning shape, outcome labels, and review-note UX without creating a persistence table or changing measurement math.

## Evidence

- Parent requirement `CF-W1-SQLAB-02` states that the learning loop still lacks a durable journal.
- `03-architecture/CF-W1-SQLAB-02-architecture-review.md` splits `CF-W1-SQLAB-02A` as a no-schema first slice: additive derived journal preview only, computed from existing `SignalOutcomeSet` data.
- Team 00 coordination notes say `CF-W1-SQLAB-02A` is eligible for Team 04 QA planning and must be sequenced after `CF-W1-SQLAB-01`.
- `backend/src/modules/signal-quality-lab/signal-quality-lab.md` already exposes outcomes, horizon availability, data-quality filters, and no persisted outcome table, so the preview can stay additive.
- `frontend/src/features/signal-quality-lab/components/SignalQualityLabPage.tsx` already renders instrument history and forward outcomes, which gives this slice a bounded user-facing preview target.

## Acceptance Criteria

- The preview shows one journal-like row per evaluated signal result and selected horizon.
- The preview exposes signal identity, horizon, outcome status, and a concise reason summary or lesson note.
- Evaluated, insufficient future data, and missing history states remain distinct.
- The slice remains additive: no schema, no persistence table, and no change to signal scoring or outcome math.
- Focused tests cover derived preview population, no-evaluable states, and no-schema behavior.

## Non-Goals

- No persistence table or schema migration.
- No changes to Signal Generation scoring, calibration math, or strategy rules.
- No alert inbox, backtest, or broker/execution behavior.
- No target-price language or direct advice language.
- No broad redesign of Today Review or the rest of Signal Quality Lab.

## Future Candidate Files After Ready Promotion

- `backend/src/modules/signal-quality-lab/signal-quality-lab.service.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.types.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.md`
- `frontend/src/features/signal-quality-lab/components/SignalQualityLabPage.tsx`
- `frontend/src/features/signal-quality-lab/types.ts`
- `backend/tests/modules/signal-quality-lab/signal-quality-lab.service.test.ts`

## Next Gate

Team 04 QA planning completes first. After that, Team 00 can evaluate whether this no-schema preview should be routed for implementation as a bounded child slice or held until the downstream storage split is ready.
