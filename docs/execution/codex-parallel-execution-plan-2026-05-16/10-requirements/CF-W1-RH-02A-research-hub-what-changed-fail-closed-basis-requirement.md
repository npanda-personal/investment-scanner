# CF-W1-RH-02A - Research Hub What-Changed Fail-Closed Basis Requirement

Date: 2026-05-18

## Status

Bounded child requirement draft. Not Ready for Implementation.

## Product Value

Research Hub should stop presenting simulated delta claims as if they were review-history evidence. A bounded first child can still improve direct investor/trader trust now by failing closed, exposing whether a prior comparison basis exists, and only showing new or downgraded candidate labels when that basis is auditable.

## Evidence

- `backend/src/modules/research-hub/research-hub.service.ts` labels `whatChanged` as simulated and currently derives `newTradeCandidates` from the current `tradeCandidates` list.
- `frontend/src/features/research-hub/components/ResearchOverviewPage.tsx` renders `NEW REVIEW CANDIDATES` or the fallback sentence `No new review candidates since the last evaluation.`
- `backend/src/modules/research-hub/research-hub.types.ts` already contains a bounded `ResearchWhatChanged` object, so the immediate trust gap is comparison-basis semantics rather than a missing overview container.
- `backend/src/modules/research-hub/research-hub.md` still documents `whatChanged` as a core mandate, which raises the cost of leaving simulated temporal language in place.

## Bounded Requirement

Define the first `CF-W1-RH-02` child as a fail-closed comparison-basis slice inside Research Hub.

The child should focus on:

- exposing whether Research Hub has an auditable prior comparison basis from existing persisted data;
- exposing the compared-against timestamp when that basis exists;
- suppressing `newTradeCandidates`, `downgradedCandidates`, and `marketGateChange` claims when no prior basis exists;
- replacing fake temporal fallback text with an explicit unavailable-basis state;
- keeping any later durable snapshot/storage path out of this child.

## Acceptance Criteria

- Research Hub returns an explicit comparison-basis status for `whatChanged`.
- Research Hub returns a compared-against date/time only when the prior basis is auditable from existing persisted state.
- `newTradeCandidates`, `downgradedCandidates`, and `marketGateChange` are empty or unavailable unless they come from a defined prior basis.
- The UI no longer says `since the last evaluation` when no prior basis exists.
- Focused tests later cover first-run/no-prior-basis, prior-basis-available/no-change, prior-basis-available/new-candidate, and unavailable-basis fallback scenarios.

## Non-Goals

- No new scheduler, journal, or durable overview snapshot system.
- No broad Research Hub redesign, route change, or shared UI change.
- No upstream Today Review, Strategy Decision, Market Context, or Trade Plan rewrite.
- No storage/schema work in this child.

## Likely Owner Team

- Team 03 for child contract shaping and exact file reservations.
- Team 04 for QA planning around no-basis, compared-against, and false-delta suppression behavior.
- Team 08 later for bounded Research Hub implementation if Team 00 promotes the child.

## Expected Architecture / QA Gate

- Architecture should confirm whether any existing persisted read path can safely supply a prior comparison basis without new storage.
- If no safe basis exists, the first child should still fail closed and expose unavailable-basis status rather than inventing deltas.
- If architecture determines even unavailable-basis handling requires a broader response-contract rewrite, stop and split again before implementation routing.

## Likely File Ownership Risk

Risk: Medium.

The bounded child should stay inside `research-hub` backend/frontend/test files. Risk rises only if the work widens into cross-module snapshot ownership or new persistence.

## Dependencies

- Keep semantic alignment with `CF-W1-RH-01`, but do not wait for `CF-W1-RH-01` to finish if the first child only removes false-delta claims and exposes basis status.
- If a later true-delta implementation needs durable snapshots, keep that as a separate post-child requirement under parent `CF-W1-RH-02`.

## Parallel With Active Team 06 And Team 03 Work

Yes for requirement, architecture, and QA prep.

This child is docs-only now and stays outside Team 06's active module work.

## Next Gate

Team 00 can route this bounded child to Team 03 for architecture/contract prep and Team 04 for QA-plan prep as the next unassigned Research Hub item after excluding current active, queued, accepted, parked, and blocked work.
