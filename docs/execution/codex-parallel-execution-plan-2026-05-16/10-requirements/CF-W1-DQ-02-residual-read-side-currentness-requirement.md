# CF-W1-DQ-02 - Residual Read-Side Currentness Requirement

Date: 2026-05-25

Owner: Team 02 - Product / Requirement Factory

## Status

Requirement-ready for Team 03 architecture prep after Team 00 opens an explicit DQE read-side/public-contract packet. Consent-gated. Not Ready for Implementation.

## Product Decision

Choose read-time reconstruction for the residual `CF-W1-DQ-02` trust gap.

Do not require durable persisted currentness dates/reason codes in this requirement.

Reason:

- investor/trader trust needs currentness to be truthful and consistent now across DQ summary, list, diagnostics, and latest-read surfaces;
- Team 03 confirmed there is no honest service-only or no-repository follow-up left after accepted `CF-W1-DQ-02A` commit `c2d6753`;
- durable storage adds schema, migration, and future maintenance cost that is not yet justified if the product need is present-time truth on latest read paths rather than replayable historical currentness history.

If later product direction requires replayable "what did DQ currentness say at that past time?" evidence, that is a separate consent-gated durable-storage packet, not an implicit expansion of this requirement.

## Product Value

Data Quality is an upstream trust gate. If one DQ surface says an instrument is current while another surface says stale, the user cannot trust either one.

The residual user value is not another evaluator-only freshness rule. It is one truthful currentness story across the persisted DQ read surfaces that users and downstream modules actually consume:

- `summary()`
- `list()`
- `diagnostics()` when a persisted row already exists
- latest-evaluation helper reads used by downstream eligibility and trust consumers

Read-time reconstruction is the smallest honest product slice because it can unify those surfaces without claiming durable history that the product does not yet need.

## Evidence

- `17-team-outboxes/TEAM-03-architecture-factory.md` on 2026-05-25 states there is no honest bounded no-schema residual child after accepted `CF-W1-DQ-02A` commit `c2d6753`.
- The same Team 03 note states the remaining value is persisted read-side/public-contract consistency, not more evaluator-local classification.
- `backend/src/modules/data-quality-engine/data-quality-engine.service.ts` still returns repository-shaped `summary()`, `list()`, `diagnostics()`, and latest-read helper outputs on current `dev`.
- `backend/src/modules/data-quality-engine/data-quality-engine.repository.ts` still reconstructs DTOs and summary counts from persisted arrays and stale text, not from a stable session-aware currentness contract.
- `CF-W1-DQ-02A` already solved the bounded service-local classifier. Reopening that same boundary would duplicate accepted work instead of improving user trust.

## Dependencies

- Team 00 must explicitly open a DQE read-side/public-contract packet before any source work starts.
- The first real implementation packet will need DQE repository/service/types/doc ownership and focused DQE tests.
- If additive HTTP response semantics change on `summary`, `list`, or `diagnostics`, controller/route response coverage may also be required.
- Market Data Foundation remains the owner of session timing and upstream evidence inputs.
- Downstream modules must continue consuming DQE output rather than rebuilding their own freshness/session logic.

## Bounded Requirement

Define an additive DQE read-side/public contract that reconstructs currentness at read time from authoritative current inputs rather than from persisted blocker strings alone.

The requirement should cover:

- one stable currentness status/reason/date story for DQ read surfaces;
- reconstruction from current authoritative evidence such as latest observed trading date, instrument scope, existing Market Data session helpers, and upstream provider-gap or latest-session evidence where available;
- consistent behavior across `summary`, `list`, `diagnostics`, and latest-evaluation helper reads;
- fail-closed behavior when current authoritative evidence is missing, unsupported, blocked, or contradictory;
- no claim that persisted `DataQualityEvaluation` rows already durably store currentness dates or reason codes.

## Acceptance Criteria

- `summary`, `list`, `diagnostics`, and latest-evaluation helper reads expose the same currentness semantics for the same underlying instrument/session evidence.
- Summary counts or breakdowns are derived from the same reconstruction basis used by row/detail/latest-read surfaces; no separate stale heuristic is allowed on summary-only paths.
- The reconstructed contract distinguishes, at minimum, current completed-session, current finalization-pending, stale completed-session missed, missing latest price, session evidence unavailable, and provider-gap blocked states, using stable explainable reason codes or equivalent semantics.
- Currentness must not be inferred from persisted stale text alone when authoritative read-time evidence is available.
- If authoritative read-time evidence is unavailable or insufficient, the output shows an explicit unavailable or blocked state instead of implying freshness.
- Existing DQ readiness and downstream fail-closed behavior remain backward-compatible.
- Focused tests later cover cross-surface consistency for current, stale, missing, blocked, and session-unavailable cases.

## Non-Goals

- No durable persisted currentness fields, dates, or reason codes in this requirement.
- No Prisma schema or migration work.
- No silent conversion of this packet into a durable-storage program.
- No duplicate Market Data session logic inside downstream modules.
- No downstream module-specific freshness reconstruction.
- No frontend, shared UI, package, provider/live-data, broker, paid/cloud, or telemetry work in the first packet.

## Consent Gate

This requirement does not authorize implementation from current `dev`.

If Team 03 or Team 00 concludes that truthful cross-surface currentness cannot be delivered through bounded read-time reconstruction, or that acceptable behavior requires durable replayable stored currentness fields, stop and open a separate schema/storage packet with explicit approval. Do not imply Ready from this requirement.

## Next Gate

- Team 00: keep `CF-W2-TSC-05A` ahead of this work and do not let this residual packet block that Today Review follow-on.
- Team 00: after `TSC-05A` sequencing is underway, open an explicit DQE read-side/public-contract packet for Team 03.
- Team 03: tighten architecture/contract/work-packet scope for bounded read-time reconstruction on DQE read paths.
- Team 04: prepare QA only after Team 03 confirms the exact reopened writer set and public-contract boundary.
