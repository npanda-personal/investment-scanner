# CF-W1-SMI-01 - Smart Money Evidence Freshness And Partial-Trust Requirement

Date: 2026-05-18

## Status

Audit-derived requirement draft. Not Ready for Implementation.

## Product Value

Smart Money Intelligence is used as confirmation context across research flows, but its current outputs can look stronger than the underlying evidence supports. Traders need to know whether an accumulation/distribution label came from persisted bounded snapshots, how current the snapshot is, which range it covers, and whether missing ownership data keeps the result partial rather than fully trusted.

## Evidence

- `backend/src/modules/smart-money-intelligence/smart-money-intelligence.md` says downstream batch triage modules should use `latestPersistedStock()` so missing smart-money context becomes a data gap instead of triggering price-volume calculation during their request.
- `backend/src/modules/smart-money-intelligence/smart-money-intelligence.service.ts` uses persisted snapshots first but falls back to on-the-fly calculation and persistence in `stock()`, which means provenance and freshness matter to downstream trust.
- The same service health output labels insider and institutional ownership as explicit missing placeholders until a free provider is configured.
- `backend/src/modules/smart-money-intelligence/smart-money-intelligence.types.ts` exposes `updatedAt`, `range`, `dataStatus`, and ownership status, but not a bounded trust framing for persisted-vs-derived freshness or partial ownership evidence.
- `frontend/src/features/smart-money-intelligence/components/SmartMoneyIntelligencePage.tsx` shows score, status, and explanation, but not an explicit currentness/trust summary for persisted snapshot age or placeholder ownership constraints.

## Bounded Requirement

Define the first Smart Money trust follow-on so confirmation outputs explain freshness, partial-evidence limits, and provenance without widening into a new provider or cross-module scoring rewrite.

The first child should focus on:

- persisted snapshot date/data-through visibility;
- explicit partial-trust language when ownership evidence is missing;
- range-specific explanation of what the snapshot covers;
- safe downstream semantics that treat missing persisted snapshots as data gaps unless an on-demand calculation path is intentionally being inspected in the Smart Money module itself.

## Acceptance Criteria

- Smart Money list/detail outputs expose enough evidence to distinguish current persisted snapshots from missing or stale confirmation context.
- Missing insider/institutional ownership evidence is framed as partial trust, not silently folded into the same confidence semantics as complete evidence.
- Range coverage and last snapshot/update timing are visible in a stable additive contract.
- Downstream confirmation consumers have a bounded public way to tell whether Smart Money evidence is usable, limited, or unavailable.
- Focused tests later cover persisted-current, persisted-stale, missing-snapshot, and ownership-placeholder scenarios.

## Non-Goals

- No new paid/free ownership provider integration in the first child.
- No market-data ingestion redesign, DQ scoring duplication, route registry change, Prisma/schema change, or shared UI work.
- No attempt to turn Smart Money into a standalone recommendation engine.

## Likely Owner Team

- Team 03 for contract and reservation prep.
- Team 04 for QA planning around freshness and partial-trust semantics.
- Team 06 later for bounded `smart-money-intelligence` implementation; Team 08 only if a later child needs feature UI polish beyond module-owned surfaces.

## Expected Architecture / QA Gate

- Keep the first child module-local inside `smart-money-intelligence`.
- Consume existing persisted snapshot metadata and ownership placeholder state; stop if the child needs provider expansion or schema work.
- QA should prepare persisted-current, persisted-stale, no-snapshot, and partial-ownership scenarios.

## Likely File Ownership Risk

Risk: Medium.

The first child can likely stay module-local, but risk rises if downstream consumer contracts, provider behavior, or storage shape changes are pulled in.

## Dependencies

- `CF-W1-MD-02` remains the upstream ADR for broader durable market-data evidence and should not be reopened here.
- `CF-W1-HCTX-01` and `CF-W1-MCTX-01` should stay semantically aligned if Smart Money freshness fields are later reused in historical or market-context explainability surfaces.

## Parallel With Active Team 06 And Team 03 Work

Yes for requirement, architecture, and QA prep.

There is no current Team 06 writer reservation in `smart-money-intelligence`, and this discovery pass stays inside `10-requirements/**`.

## Next Gate

Product refinement is sufficient for Team 03 and Team 04 to prepare a bounded Smart Money contract and QA plan. Team 00 should treat it as a next-wave research-evidence candidate behind the current top 5 and the already-tracked `CF-W1-MCTX-01` / `CF-W1-HCTX-01` context packets.
