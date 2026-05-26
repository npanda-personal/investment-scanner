# CF-W1-MD-02A Work Packet

Date: 2026-05-26

## Work Item

`CF-W1-MD-02A` proposal-only additive companion durable evidence schema packet.

## State

Proposal-only packet refreshed. Not Ready for Implementation.

This packet exists only to tighten the future schema boundary, implementation split, and consent boundary. It does not authorize any application writer, Prisma change, migration, generated artifact change, repository/service change, DQE handoff implementation, test run, or UI work.

## Owner / Lane / Module

- Architecture owner: Team 03 Architecture Factory
- QA review owner: Team 04 QA Factory
- Future implementation owner: Team 05 Market Data / Data Quality
- Lane: Lane 1
- Governing backend modules: `market-data-foundation`, later `data-quality-engine`

## Exact Allowed Files After Team 00 Promotion

None in application code.

`CF-W1-MD-02A` is not an application-code promotion candidate. The only safe outputs are the docs artifacts already prepared in execution docs.

## Current Forbidden Files

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- generated Prisma client/types
- all `backend/src/modules/market-data-foundation/**`
- all `backend/src/modules/data-quality-engine/**`
- all `backend/tests/modules/market-data-foundation/**`
- all `backend/tests/modules/data-quality-engine/**`
- backend and frontend route registries
- shared backend utilities
- shared UI
- package manifests
- provider, live-provider, startup, scheduler, repair, or backfill files
- frontend source and UI tests
- paid/cloud, broker, or telemetry scope

## Required Output Of This Packet

The packet must leave behind:

- the minimum natural key for future companion evidence storage;
- the minimum durable evidence field set;
- additive migration posture with no destructive `PriceTick` / `LatestPrice` rewrite;
- explicit confirmation that existing run-level `sourceFingerprint` and changed-instrument evidence are optional linkage only, not a substitute for the companion evidence row;
- exact blockers for schema, migrations, generated artifacts, Market Data implementation, DQE handoff, and downstream adoption;
- the exact split between `MD-02A`, `MD-02B`, `MD-02C`, and `MD-02D`;
- the separate Product Owner consent requirement tracked in `99-decision-inbox/DECISION-20260526-md-02b-schema-generated-consent.md`.

## Exact Split

1. `MD-02A`
   - proposal-only docs packet;
   - no application writer.
2. `MD-02B`
   - schema, migration, generated Prisma, and Market Data repository/service/types/doc/test implementation.
3. `MD-02C`
   - DQE handoff implementation over Market Data public evidence outputs.
4. `MD-02D`
   - downstream DQE-consumer adoption only.

## QA Planning Handoff For Team 04

Team 04 should review `MD-02A` as a schema-proposal completeness gate, not as executable QA.

Review focus:

- additive-only posture;
- natural-key completeness;
- durable evidence completeness;
- durable-versus-derived claim boundary;
- run-level evidence is not mistaken for per-candle durable evidence;
- clear rejection of implementation work in this pass;
- exact `02B/C/D` separation.

No command execution is authorized by this work packet.

## Stop Conditions

Stop and return to Team 00 / Architect if any request asks `MD-02A` to do one of the following:

- edit Prisma/schema or migrations;
- generate Prisma client/types;
- change Market Data repository/service/provider logic;
- change DQE source;
- add downstream adoption;
- touch shared utilities or shared UI;
- add startup/backfill or live-provider behavior;
- widen into UI, package, paid/cloud, broker, or telemetry scope.

## Next Gate

1. Team 04 ADR/schema-proposal QA review for `CF-W1-MD-02A`.
2. Product Owner decision on `DECISION-20260526-md-02b-schema-generated-consent`.
3. If that decision is approved, Team 00 may open `CF-W1-MD-02B` as the explicit first implementation packet with schema, migration, and generated approval.
4. Keep `CF-W1-MD-02A` out of any Ready-for-implementation routing.
