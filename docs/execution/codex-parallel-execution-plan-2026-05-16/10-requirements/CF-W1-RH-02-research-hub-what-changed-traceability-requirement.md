# CF-W1-RH-02 - Research Hub What-Changed Traceability Requirement

Date: 2026-05-18

## Status

Audit-derived requirement draft. Not Ready for Implementation.

## Product Value

Research Hub's "What Changed" panel should help a trader understand what actually changed since the previous review cycle. Right now it can imply new candidates even though the backend marks the section as simulated. A research command center should not present delta language unless the compared-against basis, prior timestamp, and downgrade/new-candidate logic are auditable.

## Evidence

- `backend/src/modules/research-hub/research-hub.service.ts` explicitly comments that `whatChanged` is "Simulated for MVP until snapshots are tracked for deltas."
- The same code derives `newTradeCandidates` from the current `tradeCandidates` array rather than from a persisted previous-overview comparison.
- `frontend/src/features/research-hub/components/ResearchOverviewPage.tsx` renders a `NEW REVIEW CANDIDATES` panel and a fallback line saying "since the last evaluation," which can overclaim temporal evidence.
- `backend/src/modules/research-hub/research-hub.types.ts` already has a bounded `ResearchWhatChanged` object, so the gap is about evidence quality and comparison basis, not a missing UI container.

## Bounded Requirement

Define a bounded follow-on so Research Hub either shows auditable change evidence or explicitly says the comparison basis is unavailable.

The first child should focus on:

- identifying a safe previous comparison basis from existing persisted rows or stable upstream snapshots;
- exposing compared-against timestamp/date and comparison status;
- distinguishing true new candidates, downgraded candidates, and unknown/unavailable delta states;
- suppressing fake delta claims when no prior basis exists.

## Acceptance Criteria

- `whatChanged` is backed by a defined prior comparison basis or explicitly marked unavailable.
- "New review candidate" and "downgraded candidate" labels are not shown unless they are derived from auditable prior state.
- The response exposes the compared-against date/time or an explicit no-basis message.
- Market-gate changes are derived from prior persisted state or shown as unavailable, not inferred from the current response alone.
- Focused tests later cover first-run/no-prior-state, no-change, new-candidate, downgrade, and unavailable-basis scenarios.

## Non-Goals

- No new scheduler, journal, or full historical snapshot system in the first child.
- No broad redesign of Research Hub layout, routes, or shared components.
- No Strategy Decision, Today Review, or Market Data logic rewrite.

## Likely Owner Team

- Team 03 for contract shaping and exact reservation boundaries.
- Team 04 for QA planning around delta correctness and no-basis fallbacks.
- Team 08 later for bounded Research Hub implementation if the surface copy or UI state changes.

## Expected Architecture / QA Gate

- Architecture should decide whether the first child can derive delta safely from existing persisted data or needs a later explicit snapshot path.
- If durable overview snapshots are needed, stop and split before schema work.
- QA should reject any child that still labels current data as change evidence without a comparison basis.

## Likely File Ownership Risk

Risk: Medium.

The smallest safe child can remain inside `research-hub`, but risk rises if it widens into new persistence, cross-module snapshot ownership, or shared UI history controls.

## Dependencies

- `CF-W1-RH-01` should define the broader actionability evidence language so the delta panel stays semantically aligned.
- Existing persisted Strategy Decision / Market Context / Today Review outputs may be usable as a bounded comparison basis; if not, a later storage split is required.

## Parallel With Active Team 06 And Team 03 Work

Yes for requirement, architecture, and QA prep.

This is a requirement-only discovery item now and does not overlap Team 06's active backend slice.

## Next Gate

Product refinement is sufficient for Team 03 to decide whether a no-schema comparison child is source-supported or whether the item must split into an ADR/storage follow-on. Team 00 should keep it behind `CF-W1-RH-01` because the broader actionability contract is the higher-value Research Hub trust gap.
