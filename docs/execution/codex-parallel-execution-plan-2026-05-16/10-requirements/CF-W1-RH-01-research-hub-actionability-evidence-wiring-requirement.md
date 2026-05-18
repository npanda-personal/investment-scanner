# CF-W1-RH-01 - Research Hub Actionability Evidence Wiring Requirement

Date: 2026-05-18

## Status

Audit-derived requirement draft. Not Ready for Implementation.

## Product Value

Research Hub is supposed to be the daily research command center, but its actionability panel currently marks major trust dimensions as not wired even when upstream modules already expose bounded public evidence. Traders need the overview to explain whether setup review is blocked by missing proof, limited by stale or partial evidence, or supported by a stable Today Review / Trade Plan / Signal Quality / Calibration chain.

## Evidence

- `backend/src/modules/research-hub/research-hub.md` defines `actionability` as a conservative adapter over stable public outputs.
- The same module doc still says Signal Quality evidence maturity, Calibration readiness, Today Review readiness, and Trade Plan readiness are "not yet wired" into Research Hub actionability.
- `backend/src/modules/research-hub/research-hub.service.ts` hard-codes `signalEvidence`, `calibrationReadiness`, `todayReviewReadiness`, and `tradePlanReadiness` as unstable placeholders instead of consuming module-owned public outputs.
- `backend/src/modules/research-hub/research-hub.types.ts` already supports per-dimension status, count, evidence date, and message, which means the contract surface can absorb bounded actionability proof without a route redesign.
- `frontend/src/features/research-hub/components/ResearchOverviewPage.tsx` renders the actionability summary and next-best action, so a bounded child could improve direct research trust without a broad UI rewrite.

## Bounded Requirement

Define the first bounded Research Hub actionability follow-on so the overview consumes stable public evidence from owned upstream read paths instead of emitting placeholder insufficiency for every non-market dimension.

The first child should focus on:

- Today Review readiness as a stable read-only dimension when public publication evidence is available;
- Trade Plan review readiness as a stable read-only dimension when public paper-review outputs are available;
- Signal Quality and Calibration trust-state wiring only through stable public outputs already approved for downstream consumption;
- additive evidence dates, counts, and blocker messages on the existing `actionability` contract;
- no new scoring engine and no recomputation of upstream logic inside Research Hub.

## Acceptance Criteria

- Research Hub actionability no longer uses placeholder insufficiency for dimensions whose stable public evidence is already available.
- Each actionability dimension explains trusted, limited, blocked, unproven, or insufficient-data status using upstream-owned semantics only.
- Evidence dates and counts are exposed when the upstream module already owns them.
- `canReviewActionableSetups` remains conservative and research-support only; it must not imply broker authorization or direct advice.
- Missing or unavailable upstream evidence is surfaced explicitly rather than inferred as healthy.
- Focused tests later prove at least one trusted/limited/blocked/unavailable path for each newly wired dimension.

## Non-Goals

- No new strategy math, signal math, calibration math, or trade-plan geometry logic.
- No shared UI, route registry, Prisma, package, provider, external AI, paid/cloud, broker, or telemetry work.
- No attempt to make Research Hub a full orchestration runner, journal, or execution cockpit.

## Likely Owner Team

- Team 03 for the first bounded Research Hub contract split and exact reservation plan.
- Team 04 for QA planning around actionability dimension semantics and conservative fallbacks.
- Team 08 later for bounded Research Hub implementation if the child includes feature UI updates.

## Expected Architecture / QA Gate

- Keep the child additive to the current `research-hub` overview contract.
- Consume only stable public outputs from Today Review, Trade Plan, Signal Quality, and Calibration; stop if private internals are required.
- QA should prepare dimension-by-dimension scenarios for trusted, limited, blocked, unproven, and unavailable outcomes.

## Likely File Ownership Risk

Risk: Medium.

The clean child can stay inside `research-hub` backend/frontend files plus focused tests, but risk rises if it requires upstream source edits, shared DTOs, route changes, or fabricated evidence.

## Dependencies

- `CF-W1-L3-TREV-01` for stable Today Review publication/readiness evidence.
- `CF-W1-TP-02` for longer-horizon Trade Plan semantics, while any first child must stay compatible with the current public Trade Plan read surface.
- `CF-W1-SQLAB-01` and `CF-W1-CAL-01` for vocabulary alignment if their trust-state packets land first.

## Parallel With Active Team 06 And Team 03 Work

Yes for requirement, architecture, and QA prep.

This is a `10-requirements/**` discovery item now, with later work centered in `research-hub`, not in Team 06's active `signal-generation-engine` slice or Team 03's current architecture files.

## Next Gate

Product refinement is sufficient for Team 03 and Team 04 to prepare a bounded Research Hub actionability contract and QA plan. Team 00 should keep it below the current top 5 stack and route it only after the nearer upstream trust packets advance.
