# CF-W2-DQ-01 Architect Signoff

Date: 2026-05-17

Architect decision: Accept.

## Signoff Scope

Reviewed:
- `backend/src/modules/data-quality-engine/data-quality-engine.service.ts`
- `backend/tests/modules/data-quality-engine/data-quality-engine.service.test.ts`
- `13-implementation-evidence/CF-W2-DQ-01-readiness-check.md`
- `04-qa/CF-W2-DQ-01-qa-evidence.md`
- `09-summaries/CF-W2-DQ-01-code-review.md`

## Architecture Boundary Verification

The change is confined to Data Quality Engine behavior:
- one service default
- one module-local test addition

It does not change cross-module contracts, persisted schema, routes, providers, startup behavior, frontend behavior, package dependencies, generated types, or shared utilities.

## Contract Alignment

The active Market Data / Data Quality readiness contract requires downstream trusted workflows to fail closed when Data Quality evidence is missing, blocked, unusable, not ready, or not trustworthy.

Changing the Data Quality filter default to skip missing evaluations aligns the module default with that contract.

## Shared / High-Risk File Verification

No shared/high-risk files are touched:
- no Prisma/schema/migration changes
- no backend route registry changes
- no frontend route registry changes
- no shared backend utility changes
- no shared UI changes
- no package changes
- no generated/common fixture changes
- no `backend/src/server.ts`
- no `.env.example`
- no `.gitignore`

## Provider / Startup / UI Verification

No Angel One, live provider, broker credential, paid provider, startup/backfill, or UI behavior is introduced or required.

## Signal Generation Separation

Signal Generation remains a separate unresolved track:
- `CF-W2-SIG-01` is not accepted by this signoff.
- Signal Generation dirty files remain uncommitted and pending Product Owner/Architect decision.
- Downstream modules remain blocked.

## Risks

- Existing callers that relied on warning-and-process behavior must now opt in explicitly.
- Full downstream fail-closed behavior is not complete until Signal Generation and other consumers are separately accepted.

## Architect Decision

Accept `CF-W2-DQ-01` as a bounded, module-local Data Quality fail-closed defaults slice.
