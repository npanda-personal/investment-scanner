# CF-W1-RH-02 - Research Hub What-Changed Traceability Requirement

Date: 2026-05-18

## Status

Parent split candidate. First bounded child is `CF-W1-RH-02A`. Parent is not Ready for Implementation.

## Product Value

Research Hub's "What Changed" panel should help a trader understand what actually changed since the previous review cycle. Right now it can imply new candidates even though the backend marks the section as simulated. A research command center should not present delta language unless the compared-against basis, prior timestamp, and downgrade/new-candidate logic are auditable.

## Evidence

- `backend/src/modules/research-hub/research-hub.service.ts` explicitly comments that `whatChanged` is "Simulated for MVP until snapshots are tracked for deltas."
- The same code derives `newTradeCandidates` from the current `tradeCandidates` array rather than from a persisted previous-overview comparison.
- `frontend/src/features/research-hub/components/ResearchOverviewPage.tsx` renders a `NEW REVIEW CANDIDATES` panel and a fallback line saying "since the last evaluation," which can overclaim temporal evidence.
- `backend/src/modules/research-hub/research-hub.types.ts` already has a bounded `ResearchWhatChanged` object, so the gap is about evidence quality and comparison basis, not a missing UI container.

## Parent Split Direction

Split the first follow-on into a bounded fail-closed child before any broader true-delta history work.

- `CF-W1-RH-02A`: fail-closed comparison-basis child that exposes compared-against status/date when possible and suppresses fake delta claims when no prior basis exists.
- Future `CF-W1-RH-02B` only if needed later: true-delta history beyond the fail-closed child, potentially including durable overview snapshot/storage design.

## Acceptance Criteria

- Parent/child split is explicit and keeps fail-closed basis handling separate from any later storage/history path.
- `CF-W1-RH-02A` can proceed without inventing durable overview storage.
- Any future true-delta child must stop for a storage split instead of expanding silently.

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

Team 00 should treat `CF-W1-RH-02A` as the next bounded Research Hub candidate. Keep the parent behind the child and stop for a separate storage/history split if Team 03 cannot prove a safe comparison-basis path from existing persisted data.
