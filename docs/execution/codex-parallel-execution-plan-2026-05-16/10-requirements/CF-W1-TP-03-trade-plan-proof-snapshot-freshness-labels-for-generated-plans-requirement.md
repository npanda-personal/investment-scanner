# CF-W1-TP-03 - Trade Plan Proof Snapshot Freshness Labels For Generated Plans Requirement

Date: 2026-05-20

Update: 2026-05-24

## Status

Paused / stale as framed. Not Ready for Implementation.

Product Owner redirected the workflow away from Trade Plan, R:R, arbitrary targets, synthetic targets, and target-price framing. Do not execute this requirement as a Trade Plan proof-snapshot freshness implementation.

This requirement may be revisited only if it is reframed as Trusted Signal Candidate health/evidence support with no Trade Plan-first UX, no R:R, and no arbitrary target semantics.

## Product Value

Trade Plan already preserves proof snapshots, but the review surface still makes an old plan look too similar to a current one. A user can see timestamps and blocker counts without a clear answer to the practical question: is this plan current, partially refreshed, or only a historical proof snapshot? That is a direct trust gap on a core research-support surface.

## Evidence

- `11-module-audits/audit-fresh-direct-value-gaps-2026-05-20.md` identifies a missing proof-currentness label on generated plans even though proof timestamps and snapshot versions already exist.
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.service.ts` persists `proofGeneratedAt`, `snapshotVersion`, and `paperReadinessProofChain`, but the audit notes no compact freshness/currentness label is emitted.
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.types.ts` defines proof snapshot structures without a stable freshness/currentness field.
- The existing active Trade Plan items already cover no-target compatibility, DQ hard-blocking, and exit/invalidation semantics. This is a separate read-side truthfulness slice and should not reopen those workstreams.

## Dependencies

- Keep the first child backend-local and additive inside `trade-plan-risk-engine`.
- Reuse existing proof timestamps, snapshot versions, blocker counts, and plan-stage outputs.
- Do not mix this slice with `CF-W1-TP-01A`, `CF-W1-TP-01B`, or `CF-W1-TP-02`.
- Do not introduce schema, migration, route-registry, shared UI, package, generated-file, provider/live-data, startup/backfill, broker, paid/cloud, or telemetry changes in the first child.
- Do not create a second proof-status model outside the existing Trade Plan proof chain.

## Bounded Requirement

Define an additive Trade Plan proof-freshness contract that tells the user whether a generated plan is current, partially refreshed, stale, or historical-only.

The first child should focus on:

- stable freshness/currentness labels derived from existing proof snapshot timestamps and versions;
- clear wording for current, partially refreshed, stale, and historical snapshot cases;
- compact reason text when one proof component is newer or older than the rest;
- additive DTO/read-surface enrichment that downstream consumers can reuse without recomputing proof status;
- no change to entry, exit, invalidation, DQ-hard-block, or reward/risk calculation behavior.

## Acceptance Criteria

- Trade Plan output exposes a compact proof freshness/currentness label for generated plans.
- The user can distinguish current, partially refreshed, stale, and historical-only proof states without inspecting raw timestamps alone.
- Mixed-proof states explain which proof component is lagging or older.
- Existing plan generation, DQ gating, and exit/invalidation semantics remain unchanged.
- Historical persisted plans remain backward-compatible even if the freshness label is derived from existing fields.
- Focused tests later cover current, mixed-age, stale, and historical-only proof states.

## Consent Gates

- Product Owner approval is required if follow-on scope expands into schema/migration, route registry, shared UI, package manifests, generated files, provider/live-data behavior, startup/backfill workflows, paid/cloud dependencies, broker integration, or product-policy reinterpretation.
- Team 03 should stop and split the slice if the first child cannot stay additive and module-local.

## Non-Goals

- No plan-generation math rewrite.
- No target/exit/invalidation semantics rewrite.
- No schema, route registry, shared UI, package, provider/live, broker, paid/cloud, or telemetry work.
- No duplicate proof-currentness logic in downstream consumers.

## Next Gate

Architecture contract and QA plan for a bounded Trade Plan proof-freshness slice, with later implementation reserved to `trade-plan-risk-engine` only if Team 03 confirms the child stays no-schema and additive.
