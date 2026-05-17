# CF-W1-SIG-01 Architecture Review

Date: 2026-05-17

Status: Draft architecture review. Blocked pending Product Owner and Architect decision.

## Boundary

Module-local candidate:
- `signal-generation-engine`

The change can likely remain module-local if it only adjusts:
- request parsing defaults,
- trusted-run DQ filter behavior,
- error handling around DQ filter failures,
- focused tests.

## Architectural Risk

Changing defaults can alter current behavior for batch signal generation. Because this is product behavior, it requires Product Owner approval even if the edit is module-local.

## File Reservation Proposal

Allowed after approval:
- `backend/src/modules/signal-generation-engine/signal-generation-engine.service.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.validation.ts`
- new or existing module-local signal-generation tests

Read-only:
- Data Quality Engine source, unless a separate DQ work packet is approved.
- Market Data Foundation source.

Forbidden:
- Prisma schema/migrations
- route registries
- shared utilities
- shared UI
- package manifests
- provider/startup files
- frontend
- old historical docs

## Architect Decision Needed

Choose one:
- A. Strict trusted runs only; add explicit research-only mode for non-filtered runs.
- B. Default all run requests to strict DQ filtering.
- C. Keep default compatible but mark non-DQ runs as untrusted and block downstream use.
- D. Defer source changes and prepare more contract tests.

Recommended architecture direction:
- C first, then B after downstream contracts are ready.

