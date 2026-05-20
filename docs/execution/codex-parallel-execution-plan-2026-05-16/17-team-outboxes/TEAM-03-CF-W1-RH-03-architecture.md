# Team 03 - CF-W1-RH-03 Architecture Handoff

Date: 2026-05-20

## Assignment

Prepare architecture/file-reservation readiness for `CF-W1-RH-03` Research Hub explainability/trust labels as a docs-only packet in the active execution folder, without touching application code, tests, QA docs, requirements/audit docs, shared files, or historical plan folders.

## Docs Prepared

- `03-architecture/CF-W1-RH-03-architecture-review.md`
- `06-contracts/CF-W1-RH-03-research-hub-explainability-trust-labels-contract.md`
- `08-work-packets/CF-W1-RH-03-work-packet.md`
- `17-team-outboxes/TEAM-03-CF-W1-RH-03-architecture.md`

## Read-Only Evidence Inspected

- root `AGENTS.md`
- `CF-W1-RH-03` requirement and explainability audit
- existing `RH-01` and `RH-02A` architecture, contract, QA, and work-packet docs
- current Research Hub backend service/types/tests
- current Research Hub frontend API/page/UI smoke
- current branch state showing `dev`
- current base check showing accepted `RH-01` commit `fd88c62` is not present on `dev` as of 2026-05-20

## Readiness Result

- `CF-W1-RH-03` is `READY-CANDIDATE`.
- The child remains no-schema.
- The child is not backend-only; bounded feature-local frontend copy is included.
- Exact future writer set:
  - `backend/src/modules/research-hub/research-hub.service.ts`
  - `backend/src/modules/research-hub/research-hub.types.ts`
  - `backend/src/modules/research-hub/research-hub.md`
  - `backend/tests/modules/research-hub/research-hub.service.test.ts`
  - `frontend/src/features/research-hub/api/researchHubApi.ts`
  - `frontend/src/features/research-hub/components/ResearchOverviewPage.tsx`
  - `frontend/tests/ui/research-hub.spec.ts`

## Exact Blocked Scope

- implementation from current unstacked `dev` while it lacks accepted `RH-01` base `fd88c62`
- parallel Research Hub writers
- Research Hub controller/router/index files and feature hook/index files
- backend/frontend route registries
- all upstream module source/tests
- Prisma/schema/migrations, generated files, package manifests
- shared backend utilities, shared frontend components
- durable Research Hub snapshot/history storage
- provider/live-data, startup/backfill, paid/cloud, broker, telemetry, or broad redesign scope

## Dependency Notes

- `RH-01` is a hard base dependency because current `dev` does not contain accepted `fd88c62` and `RH-03` shares the same backend writer set.
- `RH-02A` is a functional dependency for truthful What Changed unavailable-basis semantics. Team 00 should either sequence `RH-02A` first or combine `RH-02A + RH-03` into one writer pass.
- No durable storage is required for `RH-03`; if later needed, split it as a separate consent-gated child.

## QA Recommendation

Team 04 can prepare QA now.

Minimum QA should cover:

- explicit next-action source ownership;
- honest signal-evidence wording with raw signal counts no longer acting as a reliability proxy;
- honest local-availability data-readiness wording;
- unavailable-basis What Changed copy with no stale `since the last evaluation` sentence;
- feature-local UI smoke updates;
- research-support language preservation.

## Tests / Builds / Runtime

- Tests run: none
- Builds run: none
- UI checks run: none
- Live local data checks run: none
- Reason: docs-only architecture prep

## Team 03 Conclusion

No true consent blocker exists for the bounded `RH-03` child itself.

The real blockers are sequencing and file overlap:

- accepted `RH-01` base missing from current `dev`;
- `RH-02A` and `RH-03` overlap on the same Research Hub What Changed files.

Team 00 can route Team 04 QA planning now and then choose between strict sequencing or an explicit one-writer `RH-02A + RH-03` combined pass.
