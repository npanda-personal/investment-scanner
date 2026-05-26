# CF-W1-MD-02A - Additive Companion Evidence Schema Packet Requirement

Date: 2026-05-26

## Status

Refined bounded child requirement. Proposal-only architecture and QA-prep candidate. This is the next direct-value post-`CF-W2-DOV-01` / `CF-W2-SPL-01B` / `CF-W1-RH-01A` packet only if Team 00 deliberately opens a consent-gated schema/storage lane. Not Ready for Implementation.

This child converts the accepted `CF-W1-MD-02` ADR direction into the next approval-gated packet: an additive Prisma/schema proposal for companion durable market-data readiness evidence. No Prisma edits, migrations, generated types, repository/service changes, Data Quality handoff changes, or tests are approved in this requirement.

## Product Value

Market-data trust remains the highest upstream investor/trader-value dependency. Until the storage model is narrowed into an explicit additive schema packet, downstream claims about durable freshness, missing-candle basis, duplicate/invalid-row evidence, and source provenance stay limited to derived/read-path behavior.

That gap still sits above later signal-quality, calibration, and review-surface follow-through work. Team 00 already routed the three bounded non-consent lanes now in motion:

- `CF-W2-DOV-01` Daily Overview
- `CF-W2-SPL-01B` Signal Position Ledger active-row foundation
- `CF-W1-RH-01A` Research Hub evidence-date wiring

After those lanes, the strongest unassigned direct-value gap is still upstream durable market-data evidence. Without it, Daily Overview trust framing, Signal Position Ledger current-price provenance, Research Hub evidence-date trust, and later Today Review / Calibration / Signal Quality follow-through must keep leaning on read-path or request-local evidence instead of durable stored proof.

`CF-W1-MD-02A` is the smallest next slice that can move the market-data evidence program forward without opening application-code work.

## Current Evidence

Latest inputs:

- `10-requirements/CF-W1-MD-02-durable-market-data-readiness-evidence-requirement.md`
- `03-architecture/CF-W1-MD-02-durable-readiness-evidence-adr.md`
- `06-contracts/CF-W1-MD-02-durable-readiness-evidence-contract.md`
- `04-qa/CF-W1-MD-02-qa-plan.md`
- `08-work-packets/CF-W1-MD-02-work-packet.md`
- `11-module-audits/TEAM-05-market-data-data-quality-domain-audit-2026-05-17.md`
- `backend/src/modules/market-data-foundation/market-data-foundation.md`

Observed bounded gap:

- The ADR draft already selects companion durable evidence storage, but the active requirement queue still treats `CF-W1-MD-02` mostly as a broad parent.
- Team 03's ADR draft already names `CF-W1-MD-02A` as the first future split packet: additive Prisma/schema proposal for companion evidence storage.
- The source baseline is still narrower than the target natural key because `PriceTick` remains keyed by `symbol + timestamp` and `LatestPrice` by `symbol`.
- The queue still needs a single bounded next pull that defines the additive schema proposal before any repository/service/DQE/downstream follow-ons can be sequenced safely.

## In Scope

Docs-only packet preparation for the first child after the ADR draft:

- define the exact additive companion evidence schema proposal boundary;
- document the minimum evidence fields that the schema packet must model;
- document migration posture as additive-first and no destructive `PriceTick` / `LatestPrice` rewrite in the first packet;
- document which later packets remain blocked behind this child;
- prepare the item for Team 03 architecture packet tightening and Team 04 ADR QA review.

## Why Now After DOV / SPL / RH

This child is still proposal-only, but it is now the cleanest next requirement-factory recommendation because:

- `CF-W2-DOV-01`, `CF-W2-SPL-01B`, and `CF-W1-RH-01A` already occupy the active non-consent implementation lanes;
- previously queued Today Review parent items are no longer honest fresh queue heads because their executable children were already prepared or consumed in earlier stacked work;
- the next remaining direct-value move that does not duplicate those active lanes is to decide whether Team 00 wants to open the upstream storage consent gate at all.

## Non-Goals

- No direct edit to `backend/prisma/schema.prisma`.
- No migration generation or Prisma commands.
- No repository/service/controller/provider/source implementation.
- No Data Quality Engine handoff implementation.
- No downstream signal/portfolio/watchlist/alert/backtest/trade-plan/copilot adoption.
- No startup, scheduler, repair, backfill, live-provider, or UI work.

## Exact Dependencies

- `CF-W1-MD-02` parent ADR direction remains the governing parent.
- `03-architecture/CF-W1-MD-02-durable-readiness-evidence-adr.md` must remain the source of truth for the additive-companion-storage direction.
- Team 03 must keep the child packet additive-first and approval-gated.
- Team 04 must review the child packet against the existing ADR QA assertions before any schema work can be proposed as implementation-ready.
- Any future source work remains blocked behind later children:
  - `CF-W1-MD-02B` Market Data repository/service read-write packet
  - `CF-W1-MD-02C` Data Quality Engine handoff packet
  - `CF-W1-MD-02D` downstream DQE-consumer adoption packet

## Candidate Acceptance Criteria

For this docs-only child requirement:

- The child explicitly states that the first packet is an additive schema proposal only.
- The child preserves the companion-evidence-storage decision from the ADR draft and does not reopen the storage direction unless Architecture rejects the ADR.
- The child documents the minimum natural-key shape: instrument or canonical symbol, region, asset type, timeframe, trading date/timestamp, source, and source symbol/provider symbol where needed.
- The child documents the minimum evidence fields expected in the additive proposal: source/provider name, source symbol, source timestamp where available, ingested timestamp, batch/run identity or source fingerprint, validation-window evidence, duplicate/invalid-row evidence, stale/missing-candle evidence, suspicious-volume evidence, adjusted-close fallback evidence, and durable-vs-derived marker.
- The child states that the first packet must be additive and must not destructively rewrite existing `PriceTick` or `LatestPrice` semantics.
- The child states that implementation remains blocked until a later explicit schema/migration approval is granted.
- The child clearly names the blocked follow-on packets so Team 00 does not route repository/service or DQE work prematurely.
- The child explicitly names the downstream trust surfaces that stay blocked behind this consent gate: Daily Overview trust framing, Signal Position Ledger durable price/readiness provenance, Research Hub durable evidence-date trust, and later Today Review / Calibration / Signal Quality consumer adoption.

## Likely Owner Team

- Team 03 for architecture packet tightening around the additive schema proposal.
- Team 04 for ADR QA review and approval checklist.
- Team 05 only after a future implementation packet is explicitly approved.

## Expected Architecture / QA Gate

- Immediate next gate: Team 03 architecture/contract prep and Team 04 ADR QA prep for `CF-W1-MD-02A`.
- This is still not an app-code Ready candidate.
- Team 00 should treat it as the highest-value docs-only upstream handoff, not as source work.

## Current Allowed Files

For this docs-only requirement pass:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/**`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-02-requirement-factory.md`

## Future Allowed Files For Child Packet Prep Only

After Team 00 routing, the next safe write scope remains execution docs only:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/**`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/**`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/**`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/**`

## Forbidden Without Separate Approval

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- `backend/src/modules/market-data-foundation/**`
- `backend/src/modules/data-quality-engine/**`
- `backend/tests/modules/market-data-foundation/**`
- `backend/tests/modules/data-quality-engine/**`
- `backend/src/api/routes.ts`
- shared utilities
- package manifests
- generated Prisma/types
- provider, scheduler, startup, repair, backfill, Angel One, broker, or live-provider files
- frontend source, UI tests, or route files

## Shared-File Risk

Risk: High later, low in this docs-only child.

The entire purpose of `CF-W1-MD-02A` is to define the additive schema boundary before any high-risk file is touched. If this child drifts into implementation semantics, Team 00 should bounce it back immediately.

## Parallel With Active Work

Yes for docs-only routing.

This child does not overlap Team 06 implementation files and does not touch Team 00 control docs. It is compatible with current parallel work as long as it stays inside docs-only architecture and QA prep.

## Stop Conditions

- Architecture rejects the companion evidence storage direction and reopens the parent ADR.
- The child packet would require direct Prisma/schema edits rather than a proposal-only boundary.
- The child widens into repository/service/DQE/downstream implementation.
- The packet attempts to treat derived/read-path evidence as already durable.
- Live-provider, startup/backfill, scheduler, or UI scope appears.

## Next Gate

If Team 00 wants the next direct-value requirement after the active DOV / SPL / RH lanes, route `CF-W1-MD-02A` to Team 03 for approval-gated architecture packet prep and Team 04 for ADR QA checklist review.

Keep `CF-W1-MD-02` as the parent only, with `CF-W1-MD-02B/C/D` blocked behind this child and behind explicit schema/migration approval.
