# CF-W1-L3-TREV-02 - Today Review Candidate Snapshot Provenance Requirement

Date: 2026-05-18

## Status

Audit-derived requirement draft. Not Ready for Implementation.

## Product Value

Today Review candidate detail should explain which persisted evidence actually justified publication of a candidate and how old that evidence was at publication time. Traders reviewing a shortlist candidate need more than a reason summary and raw snapshot blobs; they need auditable source-module provenance, publication-time timestamps, and clear unavailable or compatibility-only labels when parts of the snapshot are missing or legacy-shaped.

## Evidence

- `backend/src/modules/today-trade-review/today-trade-review.types.ts` stores `dataQualitySnapshot`, `marketContextSnapshot`, `strategyProofSnapshot`, `tradePlanSnapshot`, and `sourceSignalSnapshot` largely as `Record<string, unknown> | null`.
- The same types file already has a structured `TodayReviewCandidateExplainability` model with `promotionReasons`, `watchReasons`, `blockers`, and optional `evidenceDate` on each reason, which shows the module is already moving toward explicit provenance.
- `backend/src/modules/today-trade-review/today-trade-review.types.ts` already stores `createdAt`, `updatedAt`, and `TodayReviewSourceSnapshot.generatedAt`, so the first child can expose publication-time evidence timing without recomputing upstream modules.
- `frontend/src/features/today-trade-review/components/TodayReviewCandidateDetailPage.tsx` still renders broad "Available / Unavailable" support fields such as `Readiness evidence`, `Strategy proof evidence`, and `Trade-plan proof-chain` instead of a source-dated provenance chain.
- `backend/src/modules/today-trade-review/today-trade-review.md` says candidates snapshot publication-time state so the page does not recompute the full upstream graph on normal load, which makes stored provenance a direct trust requirement rather than a nice-to-have.

## Bounded Requirement

Define a bounded Today Review detail follow-on so candidate snapshots expose auditable source-module provenance and evidence timing without re-running upstream modules on page load.

The first child should focus on:

- stable provenance labels for each stored upstream snapshot and explainability reason source;
- evidence date, candidate publication timestamp, or stored snapshot timestamp fields where the module already owns them;
- compatibility-only labels when snapshot substructures are legacy, partial, or unavailable;
- read-only research-support framing for plan, proof, and signal support;
- no target-language cleanup in this child because that stays in the Trade Plan semantics stream.

## Acceptance Criteria

- Candidate detail can identify which source modules contributed publication evidence and when that evidence was dated or stored.
- Candidate detail shows whether displayed timing came from underlying evidence, candidate publication time, or a compatibility fallback.
- Stored snapshots that are partial, legacy-shaped, or unavailable are labeled explicitly instead of appearing silently complete.
- Reason summaries, blockers, and watch reasons stay consistent with the stored provenance chain.
- The detail view remains read-only and does not recompute or mutate upstream evidence on load.
- Focused tests later cover complete provenance, partial provenance, missing snapshot, and compatibility-only snapshot scenarios.

## Non-Goals

- No new Today Review run scheduler behavior, no Strategy Decision rewrite, and no Trade Plan geometry rewrite.
- No Prisma/schema, shared UI, route registry, provider, paid/cloud, broker, or telemetry work.
- No attempt to redesign the whole Today Review flow or merge this child with the current publication-evidence child.

## Likely Owner Team

- Team 03 for contract split and reservation planning after `CF-W1-L3-TREV-01`.
- Team 04 for QA planning around stored provenance and compatibility-only labels.
- Team 07 later for bounded Today Review implementation.

## Expected Architecture / QA Gate

- Keep `CF-W1-L3-TREV-01` as the run-level publication/readiness parent and treat this as the candidate-detail provenance follow-on.
- Stay inside Today Review stored snapshots and page/detail rendering; stop if the child requires upstream module source edits or schema changes.
- QA should prepare complete, partial, missing, and compatibility-only candidate snapshot cases.

## Likely File Ownership Risk

Risk: Medium.

The first child can likely stay inside `today-trade-review` backend/types/detail UI/test files, but risk rises if it needs schema changes, cross-module snapshot normalization, or shared UI patterns.

## Dependencies

- `CF-W1-L3-TREV-01` should advance first because run-level publication/readiness evidence is the broader parent trust layer.
- `CF-W1-TP-02` should stay separate; any future removal of target-like wording from detail surfaces belongs to that trade-plan semantics stream.

## Parallel With Active Team 06 And Team 03 Work

Yes for requirement, architecture, and QA prep.

This discovery item is requirement-only now and does not overlap Team 06's active `signal-generation-engine` work or Team 03's current architecture-file reservations.

## Next Gate

Product refinement is sufficient for Team 03 and Team 04 to prepare a bounded Today Review candidate-provenance contract. As of 2026-05-18 this item is already queued as the next architecture candidate after active `CF-W1-RH-01`, so it should stay out of the current unassigned pull while Team 00 works through the live queue.
